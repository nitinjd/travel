import { useEffect, useMemo, useState } from "react";
import {
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Hotel,
  LogIn,
  MapPin,
  Plus,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const api = async (url, options = {}) => {
  const r = await fetch(url, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  if (!r.ok) throw new Error((await r.json()).message || "Request failed");
  return r.json();
};
export default function App() {
  const [tour, setTour] = useState(null),
    [tab, setTab] = useState("register"),
    [token, setToken] = useState(localStorage.getItem("tourToken")),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/tours/active")
      .then(setTour)
      .catch((e) => setError(e.message));
  }, []);
  return (
    <>
      <header>
        <div className="logo">TS</div>
        <div>
          <b>TourSetu</b>
          <small>Trip Manager</small>
        </div>
        {tour && (
          <div className="trip">
            <CalendarDays size={16} />
            {tour.start_date} – {tour.end_date}
            <MapPin size={16} />
            {tour.location}
          </div>
        )}
        <button className="admin" onClick={() => setTab("admin")}>
          Admin
        </button>
      </header>
      <main>
        <nav>
          <button
            className={tab === "register" ? "active" : ""}
            onClick={() => setTab("register")}
          >
            <Users />
            Registration
          </button>
          <button
            className={tab === "admin" ? "active" : ""}
            onClick={() => setTab("admin")}
          >
            <Settings2 />
            Trip Setup
          </button>
          <button
            className={tab === "reports" ? "active" : ""}
            onClick={() => setTab("reports")}
          >
            <Download />
            Reports
          </button>
        </nav>
        <section className="content">
          {error && <div className="alert">{error}</div>}
          {!tour ? (
            <div className="card">Loading tour…</div>
          ) : tab === "register" ? (
            <Registration tour={tour} />
          ) : !token ? (
            <Login
              onLogin={(x) => {
                localStorage.setItem("tourToken", x);
                setToken(x);
              }}
            />
          ) : tab === "admin" ? (
            <Admin
              tour={tour}
              token={token}
              refresh={() => api("/api/tours/active").then(setTour)}
            />
          ) : (
            <Reports tour={tour} token={token} />
          )}
        </section>
      </main>
    </>
  );
}
function Heading({ tag, title, text, action }) {
  return (
    <div className="heading">
      <div>
        <span>{tag}</span>
        <h1>{title}</h1>
        <p>{text}</p>
      </div>
      {action}
    </div>
  );
}
function Registration({ tour }) {
  const [step, setStep] = useState(1),
    [family, setFamily] = useState({
      family_name: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
    }),
    [people, setPeople] = useState([{ name: "", gender: "MALE", age: "" }]),
    [travel, setTravel] = useState(tour.travelOptions[0]?.id),
    [room, setRoom] = useState(tour.roomTypes[0]?.id),
    [units, setUnits] = useState(1),
    [extra, setExtra] = useState(0),
    [submitted, setSubmitted] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const travelItem = tour.travelOptions.find((x) => x.id === Number(travel)),
    roomItem = tour.roomTypes.find((x) => x.id === Number(room));
  const quote = useMemo(() => {
    const food = people.length * tour.food_charge_per_person,
      tv =
        travelItem?.charge_type === "PER_PERSON"
          ? people.length * travelItem.charge_amount
          : travelItem?.charge_amount || 0,
      stay =
        units * (roomItem?.charge_amount || 0) +
        extra * (roomItem?.extra_bed_charge || 0);
    return { food, tv, stay, total: food + tv + stay };
  }, [people.length, travelItem, roomItem, units, extra, tour]);
  const update = (i, k, v) =>
    setPeople((p) => p.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const submit = async () => {
    setBusy(true);
    setError("");
    try {
      const result = await api("/api/registrations", {
        method: "POST",
        body: JSON.stringify({
          ...family,
          tour_id: tour.id,
          passengers: people,
          travel_option_id: Number(travel),
          room_type_id: Number(room),
          room_units: units,
          extra_beds: extra,
        }),
      });
      setSubmitted(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (submitted)
    return (
      <div className="card success">
        <i>✓</i>
        <h2>Registration submitted</h2>
        <p>
          Family total: <b>{money(submitted.total_amount)}</b>
        </p>
        <p>
          {submitted.assigned_bus && <b>{submitted.assigned_bus} • </b>}
          Rooms: <b>{submitted.assigned_rooms?.join(", ")}</b>
        </p>
        <small>Registration #{submitted.id}</small>
      </div>
    );
  return (
    <>
      <Heading
        tag="Family registration"
        title="Plan your complete tour"
        text="Food, travel and stay charges cover the whole tour—not individual days."
      />
      <div className="steps">
        {["Passengers", "Travel", "Stay", "Review"].map((x, i) => (
          <div className={step >= i + 1 ? "on" : ""} key={x}>
            <b>{i + 1}</b>
            {x}
          </div>
        ))}
      </div>
      <div className="card form">
        {error && <div className="alert">{error}</div>}
        {step === 1 && (
          <>
            <Title
              icon={<Users />}
              title="Passenger details"
              sub={`Overall food charge: ${money(tour.food_charge_per_person)} per person`}
              cost={money(quote.food)}
            />
            <div className="grid2">
              <Field
                label="Family / Group name"
                value={family.family_name}
                onChange={(v) => setFamily({ ...family, family_name: v })}
              />
              <Field
                label="Contact person"
                value={family.contact_name}
                onChange={(v) => setFamily({ ...family, contact_name: v })}
              />
              <Field
                label="Mobile number"
                value={family.contact_phone}
                onChange={(v) => setFamily({ ...family, contact_phone: v })}
              />
              <Field
                label="Email (optional)"
                value={family.contact_email}
                onChange={(v) => setFamily({ ...family, contact_email: v })}
              />
            </div>
            {people.map((p, i) => (
              <div className="passenger" key={i}>
                <input
                  placeholder={`Passenger ${i + 1} name`}
                  value={p.name}
                  onChange={(e) => update(i, "name", e.target.value)}
                />
                <select
                  value={p.gender}
                  onChange={(e) => update(i, "gender", e.target.value)}
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
                <input
                  type="number"
                  placeholder="Age"
                  value={p.age}
                  onChange={(e) => update(i, "age", e.target.value)}
                />
              </div>
            ))}
            <button
              className="link"
              onClick={() =>
                setPeople([...people, { name: "", gender: "MALE", age: "" }])
              }
            >
              <Plus />
              Add passenger
            </button>
          </>
        )}
        {step === 2 && (
          <>
            <Title
              icon={<Bus />}
              title="Transportation"
              sub={`Select one mode for all ${people.length} members`}
              cost={money(quote.tv)}
            />
            <div className="options">
              {tour.travelOptions.map((x) => (
                <button
                  key={x.id}
                  className={Number(travel) === x.id ? "selected" : ""}
                  onClick={() => setTravel(x.id)}
                >
                  <Bus />
                  <span>
                    <b>{x.name}</b>
                    <small>
                      {x.mode === "SELF"
                        ? "Own vehicle"
                        : `${money(x.charge_amount)} per person • ${x.inventory?.map((b) => `${b.bus_name}: ${b.remaining_seats} seats left`).join(" • ") || "New bus will be added when full"}`}
                    </small>
                  </span>
                  <strong>
                    {x.mode === "SELF"
                      ? "₹0"
                      : money(x.charge_amount * people.length)}
                  </strong>
                </button>
              ))}
            </div>
          </>
        )}
        {step === 3 && (
          <>
            <Title
              icon={<Hotel />}
              title="Accommodation"
              sub="Select rooms or beds for the complete tour"
              cost={money(quote.stay)}
            />
            <div className="rooms">
              {tour.roomTypes.map((x) => (
                <button
                  key={x.id}
                  className={Number(room) === x.id ? "selected" : ""}
                  onClick={() => {
                    setRoom(x.id);
                    setUnits(1);
                    setExtra(0);
                  }}
                >
                  <span>{x.is_ac ? "AC" : "○"}</span>
                  <b>{x.name}</b>
                  <small>
                    {money(x.charge_amount)} • {x.capacity} people/unit •{" "}
                    {x.inventory?.available_units || 0} units available ({x.inventory?.remaining_capacity || 0} people)
                  </small>
                </button>
              ))}
            </div>
            <Counter
              label={`Number of ${roomItem?.charge_type === "PER_BED" ? "beds" : "rooms"}`}
              value={units}
              set={setUnits}
            />
            {roomItem?.extra_bed_allowed === 1 && (
              <Counter
                label={`Extra beds (${money(roomItem.extra_bed_charge)} each)`}
                value={extra}
                set={(v) =>
                  setExtra(Math.min(v, units * roomItem.max_extra_beds))
                }
              />
            )}
          </>
        )}
        {step === 4 && (
          <>
            <Title
              icon={<Wallet />}
              title="Review & submit"
              sub={`${tour.name} • Complete tour total`}
            />
            <div className="summary">
              <Summary label="Family" value={family.family_name} />
              <Summary label="Members" value={people.length} />
              <Summary label="Travel" value={travelItem?.name} />
              <Summary label="Stay" value={`${roomItem?.name} × ${units}`} />
            </div>
            <div className="bill">
              <Row label="Food" value={quote.food} />
              <Row label="Travel" value={quote.tv} />
              <Row label="Accommodation" value={quote.stay} />
              <div>
                <b>Total payable</b>
                <strong>{money(quote.total)}</strong>
              </div>
            </div>
          </>
        )}
        <footer>
          {step > 1 ? (
            <button className="secondary" onClick={() => setStep(step - 1)}>
              <ChevronLeft />
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => (step < 4 ? setStep(step + 1) : submit())}
          >
            {busy ? (
              "Submitting…"
            ) : step < 4 ? (
              <>
                Continue
                <ChevronRight />
              </>
            ) : (
              "Final submit"
            )}
          </button>
        </footer>
      </div>
    </>
  );
}
function Login({ onLogin }) {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
  const go = async () => {
    try {
      const r = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      onLogin(r.token);
    } catch (e) {
      setError(e.message);
    }
  };
  return (
    <div className="card login">
      <LogIn />
      <h2>Administrator login</h2>
      {error && <div className="alert">{error}</div>}
      <Field label="Email" value={email} onChange={setEmail} />
      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </label>
      <button className="primary" onClick={go}>
        Sign in
      </button>
    </div>
  );
}
function Admin({ tour, token, refresh }) {
  const [t, setT] = useState({ ...tour }),
    [travels, setTravels] = useState(tour.travelOptions),
    [rooms, setRooms] = useState(tour.roomTypes),
    [plan, setPlan] = useState(tour.itinerary),
    [message, setMessage] = useState("");
  const headers = { Authorization: `Bearer ${token}` };
  const patchRow = (set, id, key, value) =>
    set((rows) => rows.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  const save = async (url, data, label) => {
    await api(url, { method: "PUT", headers, body: JSON.stringify(data) });
    setMessage(`${label} saved`);
    refresh();
  };
  return (
    <>
      <Heading
        tag="Administrator"
        title="Trip master setup"
        text="Configure tour, travel, accommodation and day-wise itinerary."
        action={
          <button
            className="primary"
            onClick={() => save(`/api/admin/tours/${tour.id}`, t, "Tour")}
          >
            Save tour
          </button>
        }
      />
      {message && <div className="notice">{message}</div>}
      <div className="adminGrid">
        <div className="card">
          <h2>Tour details</h2>
          <Field
            label="Tour name"
            value={t.name}
            onChange={(v) => setT({ ...t, name: v })}
          />
          <Field
            label="Location"
            value={t.location}
            onChange={(v) => setT({ ...t, location: v })}
          />
          <div className="grid2">
            <Field
              label="Start date"
              type="date"
              value={t.start_date}
              onChange={(v) => setT({ ...t, start_date: v })}
            />
            <Field
              label="End date"
              type="date"
              value={t.end_date}
              onChange={(v) => setT({ ...t, end_date: v })}
            />
            <Field
              label="Food/person"
              type="number"
              value={t.food_charge_per_person}
              onChange={(v) => setT({ ...t, food_charge_per_person: v })}
            />
            <Field
              label="Estimated misc."
              type="number"
              value={t.estimated_misc_expense}
              onChange={(v) => setT({ ...t, estimated_misc_expense: v })}
            />
          </div>
        </div>
        <div className="card editor">
          <h2>Travel options</h2>
          {travels.map((x) => (
            <div className="editRow" key={x.id}>
              <input
                value={x.name}
                onChange={(e) =>
                  patchRow(setTravels, x.id, "name", e.target.value)
                }
              />
              <select
                value={x.mode}
                onChange={(e) =>
                  patchRow(setTravels, x.id, "mode", e.target.value)
                }
              >
                <option>SELF</option>
                <option>BUS</option>
                <option>OTHER</option>
              </select>
              <input
                type="number"
                value={x.charge_amount}
                title="Charge"
                onChange={(e) =>
                  patchRow(setTravels, x.id, "charge_amount", e.target.value)
                }
              />
              <input
                type="number"
                value={x.capacity || ""}
                title="Capacity"
                onChange={(e) =>
                  patchRow(setTravels, x.id, "capacity", e.target.value)
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!x.is_ac}
                  onChange={(e) =>
                    patchRow(setTravels, x.id, "is_ac", e.target.checked)
                  }
                />
                AC
              </label>
              <button
                onClick={() =>
                  save(`/api/admin/travel-options/${x.id}`, x, x.name)
                }
              >
                Save
              </button>
            </div>
          ))}
        </div>
        <div className="card editor">
          <h2>Room types</h2>
          {rooms.map((x) => (
            <div className="editRow roomEdit" key={x.id}>
              <input
                value={x.name}
                onChange={(e) =>
                  patchRow(setRooms, x.id, "name", e.target.value)
                }
              />
              <select
                value={x.charge_type}
                onChange={(e) =>
                  patchRow(setRooms, x.id, "charge_type", e.target.value)
                }
              >
                <option>PER_BED</option>
                <option>PER_ROOM</option>
              </select>
              <input
                type="number"
                value={x.charge_amount}
                title="Charge"
                onChange={(e) =>
                  patchRow(setRooms, x.id, "charge_amount", e.target.value)
                }
              />
              <input
                type="number"
                value={x.capacity}
                title="Capacity"
                onChange={(e) =>
                  patchRow(setRooms, x.id, "capacity", e.target.value)
                }
              />
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!x.is_ac}
                  onChange={(e) =>
                    patchRow(setRooms, x.id, "is_ac", e.target.checked)
                  }
                />
                AC
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={!!x.extra_bed_allowed}
                  onChange={(e) =>
                    patchRow(
                      setRooms,
                      x.id,
                      "extra_bed_allowed",
                      e.target.checked,
                    )
                  }
                />
                Extra bed
              </label>
              <button
                onClick={() => save(`/api/admin/room-types/${x.id}`, x, x.name)}
              >
                Save
              </button>
            </div>
          ))}
          <InventoryBuilder roomTypes={rooms} token={token} onSaved={setMessage} />
        </div>
        <div className="card wide editor">
          <h2>Travel plan</h2>
          {plan.map((x) => (
            <div className="editRow planEdit" key={x.id}>
              <input
                type="number"
                value={x.day_number}
                title="Day"
                onChange={(e) =>
                  patchRow(setPlan, x.id, "day_number", e.target.value)
                }
              />
              <input
                type="time"
                value={String(x.start_time || "").slice(0, 5)}
                onChange={(e) =>
                  patchRow(setPlan, x.id, "start_time", e.target.value)
                }
              />
              <input
                value={x.title}
                onChange={(e) =>
                  patchRow(setPlan, x.id, "title", e.target.value)
                }
              />
              <input
                value={x.location || ""}
                onChange={(e) =>
                  patchRow(setPlan, x.id, "location", e.target.value)
                }
              />
              <button
                onClick={() => save(`/api/admin/itinerary/${x.id}`, x, x.title)}
              >
                Save
              </button>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function InventoryBuilder({ roomTypes, token, onSaved }) {
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState("ROOM");
  const [floor, setFloor] = useState("");
  const add = async () => {
    const room = roomTypes.find((x) => x.id === Number(roomTypeId));
    const result = await api("/api/admin/room-inventory/bulk", {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({ room_type_id: Number(roomTypeId), quantity, prefix, floor_number: floor, standard_capacity: room.capacity, extra_bed_capacity: room.max_extra_beds }),
    });
    onSaved(`${result.created} inventory unit(s) added. Reload to see the updated availability.`);
  };
  return <div className="inventoryBuilder"><b>Add room inventory</b><select value={roomTypeId} onChange={(e) => setRoomTypeId(e.target.value)}>{roomTypes.map((x) => <option value={x.id} key={x.id}>{x.name}</option>)}</select><input type="number" min="1" value={quantity} onChange={(e) => setQuantity(Number(e.target.value))} title="Quantity"/><input value={prefix} onChange={(e) => setPrefix(e.target.value)} placeholder="Room prefix"/><input value={floor} onChange={(e) => setFloor(e.target.value)} placeholder="Floor"/><button onClick={add}>Add inventory</button></div>;
}
function Reports({ tour, token }) {
  const [type, setType] = useState("overall"),
    [rows, setRows] = useState([]),
    [inventory, setInventory] = useState({ rooms: [], buses: [] }),
    [error, setError] = useState("");
  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      api(`/api/admin/reports/${tour.id}?type=${type}`, { headers }),
      api(`/api/admin/inventory/${tour.id}`, { headers }),
    ])
      .then(([report, stock]) => { setRows(report); setInventory(stock); })
      .catch((e) => setError(e.message));
  }, [type, tour.id, token]);
  const download = async () => {
    const r = await fetch(`/api/admin/reports/${tour.id}/excel?type=${type}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const blob = await r.blob(),
      u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = `tour-${type}-report.xlsx`;
    a.click();
    URL.revokeObjectURL(u);
  };
  return (
    <>
      <Heading
        tag="Live reporting"
        title="Trip reports"
        text="View on screen or download a true Excel workbook."
        action={
          <button className="primary" onClick={download}>
            <Download />
            Download Excel
          </button>
        }
      />
      {error && <div className="alert">{error}</div>}
      <div className="stats">
        <Stat label="Families" value={rows.length} />
        <Stat
          label="Members"
          value={rows.reduce((s, x) => s + x.member_count, 0)}
        />
        <Stat
          label="Collection"
          value={money(rows.reduce((s, x) => s + Number(x.total_amount), 0))}
        />
      </div>
      <div className="inventoryGrid">
        <div className="card table"><h2>Room inventory remaining</h2><table><thead><tr><th>Type</th><th>Total units</th><th>Available</th><th>People capacity left</th></tr></thead><tbody>{inventory.rooms.map((x) => <tr key={x.room_type_id}><td>{x.name}</td><td>{x.total_units}</td><td><b>{x.available_units}</b></td><td>{x.remaining_capacity}</td></tr>)}</tbody></table></div>
        <div className="card table"><h2>Bus inventory</h2><table><thead><tr><th>Bus</th><th>Capacity</th><th>Used</th><th>Seats left</th></tr></thead><tbody>{inventory.buses.map((x) => <tr key={x.bus_instance_id}><td>{x.bus_name}</td><td>{x.capacity}</td><td>{x.used_seats}</td><td><b>{x.remaining_seats}</b></td></tr>)}</tbody></table></div>
      </div>
      <div className="filters">
        {["overall", "bus", "self", "room"].map((x) => (
          <button
            className={type === x ? "active" : ""}
            onClick={() => setType(x)}
            key={x}
          >
            {x === "self" ? "Self Travel" : x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>
      <div className="card table">
        <table>
          <thead>
            <tr>
              {[
                "Family",
                "Members",
                "Travel mode",
                "Assigned bus",
                "Room type",
                "Assigned room / floor",
                "Food",
                "Travel ₹",
                "Stay",
                "Total",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.family_name}</b>
                  <small>{x.members}</small>
                </td>
                <td>{x.member_count}</td>
                <td>{x.travel_mode}</td>
                <td>{x.assigned_bus || "Self"}</td>
                <td>{x.room_type}</td>
                <td className="blank">{x.assigned_rooms}</td>
                <td>{money(x.food_amount)}</td>
                <td>{money(x.travel_amount)}</td>
                <td>{money(x.accommodation_amount)}</td>
                <td>
                  <b>{money(x.total_amount)}</b>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Field({ label, value, onChange, type = "text" }) {
  return (
    <label>
      {label}
      <input
        type={type}
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  );
}
function Title({ icon, title, sub, cost }) {
  return (
    <div className="title">
      <div>
        {icon}
        <span>
          <h2>{title}</h2>
          <p>{sub}</p>
        </span>
      </div>
      {cost && <strong>{cost}</strong>}
    </div>
  );
}
function Counter({ label, value, set }) {
  return (
    <div className="counter">
      <span>{label}</span>
      <div>
        <button onClick={() => set(Math.max(0, value - 1))}>−</button>
        <b>{value}</b>
        <button onClick={() => set(value + 1)}>+</button>
      </div>
    </div>
  );
}
function Summary({ label, value }) {
  return (
    <div>
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
function Row({ label, value }) {
  return (
    <p>
      <span>{label}</span>
      <b>{money(value)}</b>
    </p>
  );
}
function Master({ title, heads, rows }) {
  return (
    <div className="card">
      <h2>{title}</h2>
      <table>
        <thead>
          <tr>
            {heads.map((x) => (
              <th key={x}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((x, j) => (
                <td key={j}>{x}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Stat({ label, value }) {
  return (
    <div className="card">
      <small>{label}</small>
      <b>{value}</b>
    </div>
  );
}
