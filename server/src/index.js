import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";
import { pool, transaction } from "./db.js";
import { requireAdmin, signAdmin } from "./auth.js";
dotenv.config();
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
const asyncRoute = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);
app.get(
  "/api/health",
  asyncRoute(async (req, res) => {
    await pool.query("SELECT 1");
    res.json({ status: "ok" });
  }),
);
app.post(
  "/api/admin/login",
  asyncRoute(async (req, res) => {
    const { email, password } = req.body;
    const [[admin]] = await pool.query(
      "SELECT id,email,password_hash,is_active FROM admins WHERE email=?",
      [email],
    );
    if (
      !admin ||
      !admin.is_active ||
      !(await bcrypt.compare(password, admin.password_hash))
    )
      return res.status(401).json({ message: "Invalid email or password" });
    res.json({
      token: signAdmin(admin),
      admin: { id: admin.id, email: admin.email },
    });
  }),
);
app.post(
  "/api/admin/bootstrap",
  asyncRoute(async (req, res) => {
    const [[{ count }]] = await pool.query("SELECT COUNT(*) count FROM admins");
    if (count) return res.status(409).json({ message: "Admin already exists" });
    if (
      req.body.email !== process.env.ADMIN_EMAIL ||
      req.body.password !== process.env.ADMIN_PASSWORD
    )
      return res
        .status(403)
        .json({ message: "Bootstrap credentials do not match environment" });
    const hash = await bcrypt.hash(req.body.password, 12);
    const [result] = await pool.query(
      "INSERT INTO admins(email,password_hash) VALUES(?,?)",
      [req.body.email, hash],
    );
    res.status(201).json({ id: result.insertId });
  }),
);
app.get(
  "/api/tours/active",
  asyncRoute(async (req, res) => {
    const [[tour]] = await pool.query(
      "SELECT * FROM tours WHERE status='ACTIVE' ORDER BY start_date LIMIT 1",
    );
    if (!tour) return res.status(404).json({ message: "No active tour" });
    const [travelOptions, roomTypes, itinerary] = await Promise.all([
      pool.query(
        "SELECT * FROM travel_options WHERE tour_id=? AND is_active=1 ORDER BY sort_order,id",
        [tour.id],
      ),
      pool.query(
        "SELECT * FROM room_types WHERE tour_id=? AND is_active=1 ORDER BY sort_order,id",
        [tour.id],
      ),
      pool.query(
        "SELECT * FROM itinerary_items WHERE tour_id=? ORDER BY day_number,start_time,id",
        [tour.id],
      ),
    ]);
    const inventory = await getInventory(tour.id);
    const travel = travelOptions[0].map((x) => ({
      ...x,
      inventory: inventory.buses.filter((b) => b.travel_option_id === x.id),
    }));
    const rooms = roomTypes[0].map((x) => ({
      ...x,
      inventory: inventory.rooms.find((r) => r.room_type_id === x.id) || {
        total_units: 0,
        available_units: 0,
        total_capacity: 0,
        remaining_capacity: 0,
      },
    }));
    res.json({
      ...tour,
      travelOptions: travel,
      roomTypes: rooms,
      itinerary: itinerary[0],
    });
  }),
);
app.get(
  "/api/admin/tours",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const [rows] = await pool.query(
      "SELECT * FROM tours ORDER BY start_date DESC",
    );
    res.json(rows);
  }),
);
app.post(
  "/api/admin/tours",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const t = req.body;
    const [result] = await pool.query(
      "INSERT INTO tours(name,location,start_date,end_date,food_charge_per_person,estimated_misc_expense,status) VALUES(?,?,?,?,?,?,?)",
      [
        t.name,
        t.location,
        t.start_date,
        t.end_date,
        t.food_charge_per_person || 0,
        t.estimated_misc_expense || 0,
        t.status || "DRAFT",
      ],
    );
    res.status(201).json({ id: result.insertId });
  }),
);
app.put(
  "/api/admin/tours/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const t = req.body;
    await pool.query(
      "UPDATE tours SET name=?,location=?,start_date=?,end_date=?,food_charge_per_person=?,estimated_misc_expense=?,status=? WHERE id=?",
      [
        t.name,
        t.location,
        t.start_date,
        t.end_date,
        t.food_charge_per_person || 0,
        t.estimated_misc_expense || 0,
        t.status,
        req.params.id,
      ],
    );
    res.json({ success: true });
  }),
);
app.get(
  "/api/admin/tours/:id/config",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const id = req.params.id;
    const [[tour]] = await pool.query("SELECT * FROM tours WHERE id=?", [id]);
    const [travelOptions, roomTypes, itinerary] = await Promise.all([
      pool.query(
        "SELECT * FROM travel_options WHERE tour_id=? ORDER BY sort_order,id",
        [id],
      ),
      pool.query(
        "SELECT * FROM room_types WHERE tour_id=? ORDER BY sort_order,id",
        [id],
      ),
      pool.query(
        "SELECT * FROM itinerary_items WHERE tour_id=? ORDER BY day_number,start_time,id",
        [id],
      ),
    ]);
    res.json({
      tour,
      travelOptions: travelOptions[0],
      roomTypes: roomTypes[0],
      itinerary: itinerary[0],
    });
  }),
);
app.post(
  "/api/admin/travel-options",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    const [r] = await pool.query(
      "INSERT INTO travel_options(tour_id,name,mode,charge_type,charge_amount,capacity,is_ac,is_active,sort_order) VALUES(?,?,?,?,?,?,?,?,?)",
      [
        x.tour_id,
        x.name,
        x.mode,
        x.charge_type,
        x.charge_amount || 0,
        x.capacity || null,
        x.is_ac ? 1 : 0,
        x.is_active !== false ? 1 : 0,
        x.sort_order || 0,
      ],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/admin/travel-options/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    await pool.query(
      "UPDATE travel_options SET name=?,mode=?,charge_type=?,charge_amount=?,capacity=?,is_ac=?,is_active=?,sort_order=? WHERE id=?",
      [
        x.name,
        x.mode,
        x.charge_type,
        x.charge_amount || 0,
        x.capacity || null,
        x.is_ac ? 1 : 0,
        x.is_active ? 1 : 0,
        x.sort_order || 0,
        req.params.id,
      ],
    );
    res.json({ success: true });
  }),
);
app.post(
  "/api/admin/room-types",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    const [r] = await pool.query(
      "INSERT INTO room_types(tour_id,name,charge_type,charge_amount,capacity,is_ac,extra_bed_allowed,extra_bed_charge,max_extra_beds,is_active,sort_order) VALUES(?,?,?,?,?,?,?,?,?,?,?)",
      [
        x.tour_id,
        x.name,
        x.charge_type,
        x.charge_amount,
        x.capacity,
        x.is_ac ? 1 : 0,
        x.extra_bed_allowed ? 1 : 0,
        x.extra_bed_charge || 0,
        x.max_extra_beds || 0,
        x.is_active !== false ? 1 : 0,
        x.sort_order || 0,
      ],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/admin/room-types/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    await pool.query(
      "UPDATE room_types SET name=?,charge_type=?,charge_amount=?,capacity=?,is_ac=?,extra_bed_allowed=?,extra_bed_charge=?,max_extra_beds=?,is_active=?,sort_order=? WHERE id=?",
      [
        x.name,
        x.charge_type,
        x.charge_amount,
        x.capacity,
        x.is_ac ? 1 : 0,
        x.extra_bed_allowed ? 1 : 0,
        x.extra_bed_charge || 0,
        x.max_extra_beds || 0,
        x.is_active ? 1 : 0,
        x.sort_order || 0,
        req.params.id,
      ],
    );
    res.json({ success: true });
  }),
);
app.post(
  "/api/admin/room-inventory/bulk",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    const quantity = Math.max(1, Math.min(200, Number(x.quantity || 1)));
    const created = await transaction(async (c) => {
      const [[type]] = await c.query(
        "SELECT * FROM room_types WHERE id=? FOR UPDATE",
        [x.room_type_id],
      );
      if (!type)
        throw Object.assign(new Error("Room type not found"), { status: 404 });
      const [[{ count }]] = await c.query(
        "SELECT COUNT(*) count FROM room_inventory WHERE room_type_id=?",
        [x.room_type_id],
      );
      const ids = [];
      for (let i = 1; i <= quantity; i++) {
        const number = Number(count) + i;
        const roomNumber = `${x.prefix || "ROOM"}-${String(number).padStart(2, "0")}`;
        const [r] = await c.query(
          "INSERT INTO room_inventory(room_type_id,room_number,floor_number,standard_capacity,extra_bed_capacity,notes) VALUES(?,?,?,?,?,?)",
          [x.room_type_id, roomNumber, x.floor_number || null, x.standard_capacity || type.capacity, x.extra_bed_capacity ?? type.max_extra_beds, x.notes || null],
        );
        ids.push(r.insertId);
      }
      return ids;
    });
    res.status(201).json({ created: created.length, ids: created });
  }),
);
app.put(
  "/api/admin/room-inventory/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    await pool.query(
      "UPDATE room_inventory SET room_number=?,floor_number=?,standard_capacity=?,extra_bed_capacity=?,is_active=?,notes=? WHERE id=?",
      [x.room_number, x.floor_number || null, x.standard_capacity, x.extra_bed_capacity || 0, x.is_active ? 1 : 0, x.notes || null, req.params.id],
    );
    res.json({ success: true });
  }),
);
app.post(
  "/api/admin/itinerary",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    const [r] = await pool.query(
      "INSERT INTO itinerary_items(tour_id,day_number,title,location,start_time,end_time,notes) VALUES(?,?,?,?,?,?,?)",
      [
        x.tour_id,
        x.day_number,
        x.title,
        x.location,
        x.start_time || null,
        x.end_time || null,
        x.notes || null,
      ],
    );
    res.status(201).json({ id: r.insertId });
  }),
);
app.put(
  "/api/admin/itinerary/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const x = req.body;
    await pool.query(
      "UPDATE itinerary_items SET day_number=?,title=?,location=?,start_time=?,end_time=?,notes=? WHERE id=?",
      [
        x.day_number,
        x.title,
        x.location || null,
        x.start_time || null,
        x.end_time || null,
        x.notes || null,
        req.params.id,
      ],
    );
    res.json({ success: true });
  }),
);
app.delete(
  "/api/admin/:entity/:id",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const tables = {
      travel: "travel_options",
      room: "room_types",
      itinerary: "itinerary_items",
    };
    const table = tables[req.params.entity];
    if (!table) return res.status(400).json({ message: "Invalid entity" });
    await pool.query(`DELETE FROM ${table} WHERE id=?`, [req.params.id]);
    res.json({ success: true });
  }),
);
app.post(
  "/api/registrations/quote",
  asyncRoute(async (req, res) => res.json(await calculateQuote(req.body))),
);
async function calculateQuote(body, connection = pool) {
  const count = body.passengers?.length || 0;
  if (!count)
    throw Object.assign(new Error("At least one passenger is required"), {
      status: 400,
    });
  const [[tour]] = await connection.query(
    "SELECT * FROM tours WHERE id=? AND status='ACTIVE'",
    [body.tour_id],
  );
  const [[travel]] = await connection.query(
    "SELECT * FROM travel_options WHERE id=? AND tour_id=? AND is_active=1",
    [body.travel_option_id, body.tour_id],
  );
  const [[room]] = await connection.query(
    "SELECT * FROM room_types WHERE id=? AND tour_id=? AND is_active=1",
    [body.room_type_id, body.tour_id],
  );
  if (!tour || !travel || !room)
    throw Object.assign(new Error("Invalid tour selection"), { status: 400 });
  const units = Math.max(1, Number(body.room_units || 1)),
    extraBeds = Math.max(0, Number(body.extra_beds || 0));
  if (
    extraBeds > units * room.max_extra_beds ||
    count > units * room.capacity + extraBeds
  )
    throw Object.assign(
      new Error(
        `Selected accommodation holds only ${units * room.capacity + extraBeds} people`,
      ),
      { status: 400 },
    );
  const food = count * Number(tour.food_charge_per_person);
  const travelAmount =
    travel.charge_type === "PER_PERSON"
      ? count * Number(travel.charge_amount)
      : Number(travel.charge_amount);
  const accommodation =
    units * Number(room.charge_amount) +
    extraBeds * Number(room.extra_bed_charge);
  return {
    passenger_count: count,
    food_amount: food,
    travel_amount: travelAmount,
    accommodation_amount: accommodation,
    total_amount: food + travelAmount + accommodation,
    room,
    travel,
    units,
    extraBeds,
  };
}
function busLetter(n) {
  let s = "";
  while (n > 0) {
    n--;
    s = String.fromCharCode(65 + (n % 26)) + s;
    n = Math.floor(n / 26);
  }
  return s;
}
async function allocateBus(c, registrationId, travel, count) {
  if (travel.mode !== "BUS") return null;
  await c.query("SELECT id FROM travel_options WHERE id=? FOR UPDATE", [
    travel.id,
  ]);
  const [buses] = await c.query(
    "SELECT bi.*,COALESCE((SELECT SUM(rba.seats_allocated) FROM registration_bus_allocations rba JOIN registrations r ON r.id=rba.registration_id WHERE rba.bus_instance_id=bi.id AND r.status<>'CANCELLED'),0) used FROM bus_instances bi WHERE bi.travel_option_id=? AND bi.is_active=1 ORDER BY bi.bus_number FOR UPDATE",
    [travel.id],
  );
  let bus = buses.find((x) => x.capacity - x.used >= count);
  if (!bus) {
    const number = (buses.at(-1)?.bus_number || 0) + 1;
    const capacity = Number(travel.capacity || 45);
    const [r] = await c.query(
      "INSERT INTO bus_instances(travel_option_id,bus_number,bus_name,capacity) VALUES(?,?,?,?)",
      [travel.id, number, `Bus ${busLetter(number)}`, capacity],
    );
    bus = {
      id: r.insertId,
      bus_name: `Bus ${busLetter(number)}`,
      capacity,
      used: 0,
    };
  }
  await c.query(
    "INSERT INTO registration_bus_allocations(registration_id,bus_instance_id,seats_allocated) VALUES(?,?,?)",
    [registrationId, bus.id, count],
  );
  return bus.bus_name;
}
async function allocateRooms(
  c,
  registrationId,
  room,
  units,
  people,
  extraBeds,
) {
  const [available] = await c.query(
    "SELECT ri.* FROM room_inventory ri WHERE ri.room_type_id=? AND ri.is_active=1 AND NOT EXISTS(SELECT 1 FROM registration_room_allocations rra JOIN registrations r ON r.id=rra.registration_id WHERE rra.room_inventory_id=ri.id AND r.status<>'CANCELLED') ORDER BY ri.id LIMIT ? FOR UPDATE",
    [room.id, units],
  );
  if (available.length < units)
    throw Object.assign(
      new Error(`Only ${available.length} ${room.name} units remain`),
      { status: 409 },
    );
  let remaining = people,
    extraRemaining = extraBeds;
  for (const unit of available) {
    const standard = Math.min(remaining, unit.standard_capacity);
    remaining -= standard;
    const extra = Math.min(remaining, extraRemaining, unit.extra_bed_capacity);
    remaining -= extra;
    extraRemaining -= extra;
    await c.query(
      "INSERT INTO registration_room_allocations(registration_id,room_inventory_id,standard_beds_allocated,extra_beds_allocated) VALUES(?,?,?,?)",
      [registrationId, unit.id, standard, extra],
    );
  }
  if (remaining > 0)
    throw Object.assign(
      new Error("Selected rooms do not have enough bed capacity"),
      { status: 409 },
    );
  return available.map((x) => x.room_number);
}
app.post(
  "/api/registrations",
  asyncRoute(async (req, res) => {
    const allocation = await transaction(async (c) => {
      const q = await calculateQuote(req.body, c),
        b = req.body;
      const [r] = await c.query(
        "INSERT INTO registrations(tour_id,family_name,contact_name,contact_phone,contact_email,travel_option_id,room_type_id,room_units,extra_beds,food_amount,travel_amount,accommodation_amount,total_amount,status) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,'SUBMITTED')",
        [
          b.tour_id,
          b.family_name,
          b.contact_name,
          b.contact_phone,
          b.contact_email || null,
          b.travel_option_id,
          b.room_type_id,
          q.units,
          q.extraBeds,
          q.food_amount,
          q.travel_amount,
          q.accommodation_amount,
          q.total_amount,
        ],
      );
      for (const p of b.passengers)
        await c.query(
          "INSERT INTO passengers(registration_id,name,gender,age) VALUES(?,?,?,?)",
          [r.insertId, p.name, p.gender, p.age],
        );
      const rooms = await allocateRooms(
        c,
        r.insertId,
        q.room,
        q.units,
        q.passenger_count,
        q.extraBeds,
      );
      const bus = await allocateBus(c, r.insertId, q.travel, q.passenger_count);
      return { id: r.insertId, rooms, bus };
    });
    const [[registration]] = await pool.query(
      "SELECT * FROM registrations WHERE id=?",
      [allocation.id],
    );
    res
      .status(201)
      .json({
        ...registration,
        assigned_rooms: allocation.rooms,
        assigned_bus: allocation.bus,
      });
  }),
);
const reportQuery = `SELECT r.id,r.family_name,r.contact_name,r.contact_phone,r.room_units,r.extra_beds,r.food_amount,r.travel_amount,r.accommodation_amount,r.total_amount,r.status,t.name tour_name,t.location,vo.name travel_mode,vo.mode travel_mode_type,rt.name room_type,COUNT(p.id) member_count,GROUP_CONCAT(CONCAT(p.name,' (',p.gender,', ',p.age,')') ORDER BY p.id SEPARATOR ', ') members,(SELECT GROUP_CONCAT(CONCAT(ri.room_number,' / Floor ',COALESCE(ri.floor_number,'')) ORDER BY ri.id SEPARATOR ', ') FROM registration_room_allocations rra JOIN room_inventory ri ON ri.id=rra.room_inventory_id WHERE rra.registration_id=r.id) assigned_rooms,(SELECT GROUP_CONCAT(CONCAT(bi.bus_name,' (',rba.seats_allocated,' seats)') SEPARATOR ', ') FROM registration_bus_allocations rba JOIN bus_instances bi ON bi.id=rba.bus_instance_id WHERE rba.registration_id=r.id) assigned_bus FROM registrations r JOIN tours t ON t.id=r.tour_id JOIN travel_options vo ON vo.id=r.travel_option_id JOIN room_types rt ON rt.id=r.room_type_id JOIN passengers p ON p.registration_id=r.id WHERE r.tour_id=? GROUP BY r.id ORDER BY vo.name,r.family_name`;
async function getReport(tourId, type) {
  const [rows] = await pool.query(reportQuery, [tourId]);
  if (type === "bus") return rows.filter((x) => x.travel_mode_type === "BUS");
  if (type === "self") return rows.filter((x) => x.travel_mode_type === "SELF");
  return rows;
}
async function getInventory(tourId) {
  const [rooms, buses] = await Promise.all([
    pool.query(
      "SELECT rt.id room_type_id,rt.name,COUNT(ri.id) total_units,SUM(ri.standard_capacity+ri.extra_bed_capacity) total_capacity,SUM(CASE WHEN active_reg.registration_id IS NULL THEN 1 ELSE 0 END) available_units,SUM(CASE WHEN active_reg.registration_id IS NULL THEN ri.standard_capacity+ri.extra_bed_capacity ELSE 0 END) remaining_capacity FROM room_types rt JOIN room_inventory ri ON ri.room_type_id=rt.id AND ri.is_active=1 LEFT JOIN (SELECT rra.room_inventory_id,MAX(rra.registration_id) registration_id FROM registration_room_allocations rra JOIN registrations r ON r.id=rra.registration_id AND r.status<>'CANCELLED' GROUP BY rra.room_inventory_id) active_reg ON active_reg.room_inventory_id=ri.id WHERE rt.tour_id=? GROUP BY rt.id,rt.name ORDER BY rt.sort_order,rt.id",
      [tourId],
    ),
    pool.query(
      "SELECT vo.id travel_option_id,vo.name option_name,bi.id bus_instance_id,bi.bus_name,bi.capacity,COALESCE(SUM(CASE WHEN r.status<>'CANCELLED' THEN rba.seats_allocated ELSE 0 END),0) used_seats,bi.capacity-COALESCE(SUM(CASE WHEN r.status<>'CANCELLED' THEN rba.seats_allocated ELSE 0 END),0) remaining_seats FROM travel_options vo JOIN bus_instances bi ON bi.travel_option_id=vo.id AND bi.is_active=1 LEFT JOIN registration_bus_allocations rba ON rba.bus_instance_id=bi.id LEFT JOIN registrations r ON r.id=rba.registration_id WHERE vo.tour_id=? GROUP BY vo.id,vo.name,bi.id,bi.bus_name,bi.capacity,bi.bus_number ORDER BY vo.sort_order,bi.bus_number",
      [tourId],
    ),
  ]);
  return { rooms: rooms[0], buses: buses[0] };
}
app.get(
  "/api/admin/inventory/:tourId",
  requireAdmin,
  asyncRoute(async (req, res) =>
    res.json(await getInventory(req.params.tourId)),
  ),
);
app.get(
  "/api/admin/reports/:tourId",
  requireAdmin,
  asyncRoute(async (req, res) =>
    res.json(await getReport(req.params.tourId, req.query.type || "overall")),
  ),
);
app.patch(
  "/api/admin/registrations/:id/room",
  requireAdmin,
  asyncRoute(async (req, res) => {
    await pool.query(
      "UPDATE registrations SET room_number=?,floor_number=? WHERE id=?",
      [
        req.body.room_number || null,
        req.body.floor_number || null,
        req.params.id,
      ],
    );
    res.json({ success: true });
  }),
);
app.get(
  "/api/admin/reports/:tourId/excel",
  requireAdmin,
  asyncRoute(async (req, res) => {
    const rows = await getReport(
      req.params.tourId,
      req.query.type || "overall",
    );
    const data = rows.map((x) => ({
      Family: x.family_name,
      Contact: x.contact_name,
      Phone: x.contact_phone,
      Members: x.member_count,
      "Member Details": x.members,
      "Travel Mode": x.travel_mode,
      "Assigned Bus": x.assigned_bus || "Self",
      "Room Type": x.room_type,
      "Rooms/Beds": x.room_units,
      "Extra Beds": x.extra_beds,
      "Assigned Room / Floor": x.assigned_rooms || "",
      "Food Amount": x.food_amount,
      "Travel Amount": x.travel_amount,
      "Accommodation Amount": x.accommodation_amount,
      "Family Total": x.total_amount,
    }));
    const ws = XLSX.utils.json_to_sheet(data),
      wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Tour Report");
    const inventory = await getInventory(req.params.tourId),
      iw = XLSX.utils.json_to_sheet([
        ...inventory.rooms.map((x) => ({
          Category: "Room",
          Name: x.name,
          Total: x.total_units,
          Used: x.total_units - x.available_units,
          Remaining: x.available_units,
          "Remaining Capacity": x.remaining_capacity,
        })),
        ...inventory.buses.map((x) => ({
          Category: "Bus",
          Name: x.bus_name,
          Total: x.capacity,
          Used: x.used_seats,
          Remaining: x.remaining_seats,
          "Remaining Capacity": x.remaining_seats,
        })),
      ]);
    XLSX.utils.book_append_sheet(wb, iw, "Inventory");
    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=tour-${req.query.type || "overall"}-report.xlsx`,
    );
    res
      .type("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
      .send(buffer);
  }),
);
const root = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../client/dist",
);
app.use(express.static(root));
app.use((req, res, next) =>
  req.path.startsWith("/api/")
    ? next()
    : res.sendFile(path.join(root, "index.html")),
);
app.use((error, req, res, next) => {
  console.error(error);
  res
    .status(error.status || 500)
    .json({ message: error.message || "Internal server error" });
});
app.listen(process.env.PORT || 5000, () =>
  console.log(`TourSetu running on port ${process.env.PORT || 5000}`),
);
