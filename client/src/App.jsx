import { useEffect, useMemo, useState } from "react";
import {
  Bus,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  Hotel,
  LogIn,
  LogOut,
  MapPin,
  Plus,
  Settings2,
  Users,
  Wallet,
} from "lucide-react";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const PAYMENT_RECEIVERS = [
  "Birju Bhatt",
  "Mahesh Savani",
  "Mayur Satasiya",
  "Parin Thakkar",
];
const BOOKING_CONDITIONS = [
  "Booking will be confirmed only after payment is received.",
  "If any change is required in the plan, accommodation or other arrangements, due diligence will be followed with guidance from the leaders.",
  "Cancellation and refund are not available after booking is confirmed.",
  "For children aged 0–5, a bus seat or accommodation bed will not be provided unless it is booked exclusively for the child.",
];
const api = async (url, options = {}) => {
  try {
    const r = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });
    const result = await r.json().catch(() => ({}));
    if (!r.ok)
      throw new Error(result.message || `Request failed (${r.status})`);
    return result;
  } catch (error) {
    if (error instanceof TypeError)
      throw new Error(
        "Cannot connect to the server. Please refresh the page or try again shortly.",
      );
    throw error;
  }
};
export default function App() {
  const isAdminPage = window.location.pathname.startsWith("/admin");
  const [tour, setTour] = useState(null),
    [tab, setTab] = useState("admin"),
    [editingRegistrationId, setEditingRegistrationId] = useState(null),
    [token, setToken] = useState(localStorage.getItem("tourToken")),
    [error, setError] = useState("");
  useEffect(() => {
    api("/api/tours/active")
      .then(setTour)
      .catch((e) => setError(e.message));
  }, []);
  const logout = () => {
    localStorage.removeItem("tourToken");
    setToken(null);
    setTab("admin");
  };
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
        {isAdminPage && token && <div className="admin">Administrator</div>}
      </header>
      <main
        className={
          !isAdminPage ? "publicMain" : !token ? "loginMain" : "adminMain"
        }
      >
        {isAdminPage && token && (
          <nav>
            <button
              className={tab === "admin" ? "active" : ""}
              onClick={() => setTab("admin")}
            >
              <Settings2 />
              Trip Setup
            </button>
            <button
              className={tab === "reports" ? "active" : ""}
              onClick={() => {
                setEditingRegistrationId(null);
                setTab("reports");
              }}
            >
              <Download />
              Reports
            </button>
            <button className="logoutButton" onClick={logout}>
              <LogOut />
              Logout
            </button>
          </nav>
        )}
        <section className="content">
          {error && (
            <div className="alert appError">
              <span>{error}</span>
              <button onClick={() => window.location.reload()}>Retry</button>
            </div>
          )}
          {!tour ? (
            <div className="card">Loading tour…</div>
          ) : !isAdminPage ? (
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
          ) : tab === "registration" && editingRegistrationId ? (
            <Registration
              tour={tour}
              token={token}
              adminEditId={editingRegistrationId}
              onAdminDone={() => {
                api("/api/tours/active")
                  .then(setTour)
                  .finally(() => {
                    setEditingRegistrationId(null);
                    setTab("reports");
                  });
              }}
            />
          ) : (
            <Reports
              tour={tour}
              token={token}
              onEditRegistration={(id) => {
                setEditingRegistrationId(id);
                setTab("registration");
              }}
            />
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
function TourImageCarousel({ itinerary }) {
  const images = useMemo(
    () =>
      itinerary.flatMap((item) =>
        (item.images || []).map((image) => ({ ...image, item })),
      ),
    [itinerary],
  );
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (images.length < 2) return undefined;
    const timer = window.setInterval(
      () => setActive((current) => (current + 1) % images.length),
      4500,
    );
    return () => window.clearInterval(timer);
  }, [images.length]);
  useEffect(() => setActive(0), [images.length]);
  if (!images.length) return null;
  const image = images[active];
  return (
    <section className="heroCarousel" aria-label="Tour highlights">
      <img src={image.url} alt={image.item.title || image.file_name} />
      <div className="heroCaption">
        <b>{image.item.title}</b>
        {image.item.location && <span>{image.item.location}</span>}
      </div>
      {images.length > 1 && (
        <>
          <button
            className="heroPrevious"
            aria-label="Previous image"
            onClick={() =>
              setActive((active - 1 + images.length) % images.length)
            }
          >
            <ChevronLeft />
          </button>
          <button
            className="heroNext"
            aria-label="Next image"
            onClick={() => setActive((active + 1) % images.length)}
          >
            <ChevronRight />
          </button>
          <div className="heroDots">
            {images.map((x, index) => (
              <button
                key={x.id}
                className={index === active ? "active" : ""}
                aria-label={`Show image ${index + 1}`}
                onClick={() => setActive(index)}
              />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
function calculateAccommodation(room, passengerCount) {
  if (!room) return { units: 0, extra: 0 };
  if (passengerCount <= 0) return { units: 0, extra: 0 };
  if (room.charge_type === "PER_BED")
    return { units: passengerCount, extra: 0 };
  const capacity = Math.max(1, Number(room.capacity || 1));
  const maxExtra = room.extra_bed_allowed
    ? Math.max(0, Number(room.max_extra_beds || 0))
    : 0;
  const units = Math.max(1, Math.ceil(passengerCount / (capacity + maxExtra)));
  return {
    units,
    extra: Math.max(0, passengerCount - units * capacity),
  };
}
function foodChargeForAge(tour, age) {
  const value = Number(age);
  if (value <= 5)
    return Number(tour.food_charge_age_0_5 ?? tour.food_charge_per_person ?? 0);
  if (value <= 12)
    return Number(
      tour.food_charge_age_6_12 ?? tour.food_charge_per_person ?? 0,
    );
  return Number(
    tour.food_charge_age_13_plus ?? tour.food_charge_per_person ?? 0,
  );
}
function BookingConditions({ compact = false }) {
  return (
    <div className={`bookingConditions ${compact ? "compact" : ""}`}>
      <b>Booking conditions</b>
      <ol>
        {BOOKING_CONDITIONS.map((condition) => (
          <li key={condition}>{condition}</li>
        ))}
      </ol>
    </div>
  );
}
async function downloadRegistrationPdf({
  tour,
  family,
  people,
  travelItem,
  roomItem,
  allocationCount,
  units,
  extra,
  quote,
  paymentReceiver,
  submitted,
}) {
  const { jsPDF } = await import("jspdf");
  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  const left = 16,
    width = 178;
  let y = 18;
  const add = (text, { size = 10, bold = false, gap = 2 } = {}) => {
    pdf.setFont("helvetica", bold ? "bold" : "normal");
    pdf.setFontSize(size);
    const lines = pdf.splitTextToSize(String(text ?? ""), width);
    const height = lines.length * (size * 0.42 + 1);
    if (y + height > 282) {
      pdf.addPage();
      y = 18;
    }
    pdf.text(lines, left, y);
    y += height + gap;
  };
  const amount = (value) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;
  const assignedRooms = Array.isArray(submitted.assigned_rooms)
    ? submitted.assigned_rooms.join(", ")
    : submitted.assigned_rooms || "To be assigned";

  add("TourSetu - Registration Confirmation", { size: 18, bold: true });
  add(`Registration #${submitted.id}`, { size: 11, bold: true, gap: 5 });
  add(`Tour: ${tour.name}`, { bold: true });
  add(`Location: ${tour.location}`);
  add(`Dates: ${tour.start_date} to ${tour.end_date}`, { gap: 5 });

  add("Family and contact", { size: 13, bold: true });
  add(`Family / Group: ${family.family_name}`);
  add(`Contact person: ${family.contact_name}`);
  add(`Mobile: ${family.contact_phone}`);
  add(`Email: ${family.contact_email || "Not provided"}`, { gap: 5 });

  add("Passengers", { size: 13, bold: true });
  people.forEach((person, index) =>
    add(
      `${index + 1}. ${person.name} | ${person.gender} | Age ${person.age} | Food ${amount(foodChargeForAge(tour, person.age))}${Number(person.age) <= 5 ? (person.requires_seat_bed ? " | Exclusive seat/bed booked" : " | No seat/bed booked") : ""}`,
    ),
  );
  add(`Total passengers: ${people.length}`, { gap: 5 });

  add("Travel", { size: 13, bold: true });
  add(`Mode: ${travelItem?.name || ""}`);
  add(`Paid seats: ${allocationCount}`);
  add(`Assigned bus: ${submitted.assigned_bus || "Self travel"}`);
  add(`Travel amount: ${amount(quote.tv)}`, { gap: 5 });

  add("Accommodation", { size: 13, bold: true });
  add(`Room type: ${roomItem?.name || ""}`);
  add(
    `${roomItem?.charge_type === "PER_BED" ? "Beds" : "Rooms"}: ${units}${extra ? ` | Additional beds: ${extra}` : ""}`,
  );
  add(`Assigned room(s): ${assignedRooms}`);
  add(`Accommodation amount: ${amount(quote.stay)}`, { gap: 5 });

  add("Payment summary", { size: 13, bold: true });
  add(`Food: ${amount(quote.food)}`);
  add(`Travel: ${amount(quote.tv)}`);
  add(`Accommodation: ${amount(quote.stay)}`);
  add(`Total payable: ${amount(submitted.total_amount)}`, {
    size: 12,
    bold: true,
  });
  add(`I will pay to: ${paymentReceiver}`, { gap: 5 });

  add("Booking conditions", { size: 13, bold: true });
  BOOKING_CONDITIONS.forEach((condition, index) =>
    add(`${index + 1}. ${condition}`),
  );
  add("Booking is pending until payment is confirmed.", {
    bold: true,
    gap: 0,
  });
  pdf.save(`TourSetu-registration-${submitted.id}.pdf`);
}
function Registration({ tour, adminEditId = null, token = "", onAdminDone }) {
  const [step, setStep] = useState(1),
    [family, setFamily] = useState({
      family_name: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
    }),
    [people, setPeople] = useState([
      { name: "", gender: "MALE", age: "", requires_seat_bed: false },
    ]),
    [travel, setTravel] = useState(tour.travelOptions[0]?.id),
    [room, setRoom] = useState(tour.roomTypes[0]?.id),
    [submitted, setSubmitted] = useState(null),
    [showPlan, setShowPlan] = useState(false),
    [busy, setBusy] = useState(false),
    [loadingEdit, setLoadingEdit] = useState(!!adminEditId),
    [editRecord, setEditRecord] = useState(null),
    [paymentReceiver, setPaymentReceiver] = useState(PAYMENT_RECEIVERS[0]),
    [termsAccepted, setTermsAccepted] = useState(false),
    [stepNotice, setStepNotice] = useState(""),
    [error, setError] = useState("");
  useEffect(() => {
    if (!adminEditId) return;
    setLoadingEdit(true);
    api(`/api/admin/registrations/${adminEditId}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((record) => {
        setEditRecord(record);
        setFamily({
          family_name: record.family_name || "",
          contact_name: record.contact_name || "",
          contact_phone: record.contact_phone || "",
          contact_email: record.contact_email || "",
        });
        setPeople(
          record.passengers.map((passenger) => ({
            ...passenger,
            age: String(passenger.age),
            requires_seat_bed: !!passenger.requires_seat_bed,
          })),
        );
        setTravel(record.travel_option_id);
        setRoom(record.room_type_id);
        setPaymentReceiver(record.payment_receiver || PAYMENT_RECEIVERS[0]);
        setTermsAccepted(!!record.terms_accepted);
        setError("");
      })
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoadingEdit(false));
  }, [adminEditId, token]);
  const travelItem = tour.travelOptions.find((x) => x.id === Number(travel)),
    roomItem = tour.roomTypes.find((x) => x.id === Number(room));
  const allocationCount = useMemo(
    () =>
      people.filter(
        (passenger) =>
          Number(passenger.age) >= 6 || passenger.requires_seat_bed,
      ).length,
    [people],
  );
  const availableRoomCapacity = (item) =>
    Number(item?.inventory?.remaining_capacity || 0) +
    (editRecord && Number(editRecord.room_type_id) === Number(item?.id)
      ? Number(editRecord.allocation_count || 0)
      : 0);
  useEffect(() => {
    if (availableRoomCapacity(roomItem) >= allocationCount) return;
    const available = tour.roomTypes.find(
      (item) => availableRoomCapacity(item) >= allocationCount,
    );
    if (available) setRoom(available.id);
  }, [allocationCount, editRecord, room, roomItem, tour.roomTypes]);
  const { units, extra } = useMemo(
    () => calculateAccommodation(roomItem, allocationCount),
    [roomItem, allocationCount],
  );
  const quote = useMemo(() => {
    const food = people.reduce(
        (sum, passenger) => sum + foodChargeForAge(tour, passenger.age),
        0,
      ),
      tv =
        travelItem?.charge_type === "PER_PERSON"
          ? allocationCount * travelItem.charge_amount
          : travelItem?.charge_amount || 0,
      stay =
        units * (roomItem?.charge_amount || 0) +
        extra * (roomItem?.extra_bed_charge || 0);
    return { food, tv, stay, total: food + tv + stay };
  }, [people, allocationCount, travelItem, roomItem, units, extra, tour]);
  const update = (i, k, v) =>
    setPeople((p) => p.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const advance = () => {
    setError("");
    setStepNotice("");
    if (step === 1) {
      const phone = family.contact_phone.replace(/[^0-9+]/g, "");
      if (
        !family.family_name.trim() ||
        !family.contact_name.trim() ||
        !/^\+?[0-9]{7,15}$/.test(phone)
      )
        return setError(
          "Enter family/group name, contact name and a valid mobile number",
        );
      if (
        family.contact_email &&
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(family.contact_email)
      )
        return setError("Enter a valid email address");
      if (
        people.some(
          (x) =>
            !x.name.trim() ||
            !x.age ||
            Number(x.age) < 0 ||
            Number(x.age) > 120,
        )
      )
        return setError("Enter a valid name and age for every passenger");
    }
    if (step === 3 && availableRoomCapacity(roomItem) < allocationCount)
      return setError(
        `${roomItem?.name || "Selected accommodation"} has no capacity for ${allocationCount} booked bed(s). Please select another option or ask the administrator to add room inventory.`,
      );
    const completed = ["Passenger details", "Transportation", "Accommodation"];
    setStepNotice(`${completed[step - 1]} saved. Continue to the next step.`);
    setStep(step + 1);
  };
  const submit = async () => {
    if (!termsAccepted) {
      setError("Please accept the booking conditions before submitting");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await api(
        adminEditId
          ? `/api/admin/registrations/${adminEditId}`
          : "/api/registrations",
        {
          method: adminEditId ? "PUT" : "POST",
          headers: adminEditId
            ? { Authorization: `Bearer ${token}` }
            : undefined,
          body: JSON.stringify({
            ...family,
            tour_id: tour.id,
            passengers: people,
            travel_option_id: Number(travel),
            room_type_id: Number(room),
            room_units: units,
            extra_beds: extra,
            payment_receiver: paymentReceiver,
            terms_accepted: termsAccepted,
          }),
        },
      );
      setSubmitted(result);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  };
  if (loadingEdit)
    return <div className="card">Loading family registration…</div>;
  if (submitted)
    return (
      <div className="card success confirmation">
        <div className="confirmationHeading">
          <i>✓</i>
          <h2>
            {adminEditId ? "Registration updated" : "Registration submitted"}
          </h2>
          <p>
            <b>
              {adminEditId
                ? "All changes and inventory allocations were saved."
                : "Booking pending payment confirmation."}
            </b>
          </p>
          <small>Registration #{submitted.id}</small>
        </div>

        <div className="confirmationSummary">
          <Summary label="Tour" value={tour.name} />
          <Summary
            label="Dates"
            value={`${tour.start_date} – ${tour.end_date}`}
          />
          <Summary label="Family / Group" value={family.family_name} />
          <Summary label="Members" value={people.length} />
        </div>

        <div className="confirmationSection">
          <h3>Contact details</h3>
          <p>
            <b>{family.contact_name}</b> • {family.contact_phone}
            {family.contact_email ? ` • ${family.contact_email}` : ""}
          </p>
        </div>

        <div className="confirmationSection table confirmationPassengers">
          <h3>Passenger details</h3>
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Gender</th>
                <th>Age</th>
                <th>Food</th>
                <th>Seat / bed</th>
              </tr>
            </thead>
            <tbody>
              {people.map((person, index) => (
                <tr key={`${person.name}-${index}`}>
                  <td>{person.name}</td>
                  <td>{person.gender}</td>
                  <td>{person.age}</td>
                  <td>{money(foodChargeForAge(tour, person.age))}</td>
                  <td>
                    {Number(person.age) >= 6 || person.requires_seat_bed
                      ? "Booked"
                      : "Not booked"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="confirmationColumns">
          <div className="confirmationSection">
            <h3>Transportation</h3>
            <p>
              <b>{travelItem?.name}</b>
            </p>
            <p>{allocationCount} paid seat(s)</p>
            <p>Assigned bus: {submitted.assigned_bus || "Self travel"}</p>
          </div>
          <div className="confirmationSection">
            <h3>Accommodation</h3>
            <p>
              <b>{roomItem?.name}</b>
            </p>
            <p>
              {units}{" "}
              {roomItem?.charge_type === "PER_BED" ? "bed(s)" : "room(s)"}
              {extra ? ` + ${extra} additional bed(s)` : ""}
            </p>
            <p>Assigned: {submitted.assigned_rooms?.join(", ") || "Pending"}</p>
          </div>
        </div>

        <div className="bill confirmationBill">
          <Row label="Food" value={quote.food} />
          <Row label="Travel" value={quote.tv} />
          <Row label="Accommodation" value={quote.stay} />
          <div>
            <b>Total payable</b>
            <strong>{money(submitted.total_amount)}</strong>
          </div>
        </div>
        <div className="confirmationPayee">
          I will pay to: <b>{paymentReceiver}</b>
        </div>
        <BookingConditions />

        <div className="confirmationActions">
          <button
            className="primary"
            onClick={() =>
              downloadRegistrationPdf({
                tour,
                family,
                people,
                travelItem,
                roomItem,
                allocationCount,
                units,
                extra,
                quote,
                paymentReceiver,
                submitted,
              })
            }
          >
            <Download />
            Download PDF
          </button>
          {adminEditId && (
            <button className="secondary" onClick={onAdminDone}>
              Back to reports
            </button>
          )}
        </div>
      </div>
    );
  return (
    <>
      <Heading
        tag={adminEditId ? "Administrator edit" : "Family registration"}
        title={
          adminEditId
            ? `Edit ${family.family_name || "family registration"}`
            : "Plan your complete tour"
        }
        text={
          adminEditId
            ? "Update any registration step. Inventory and charges will be recalculated when saved."
            : "Food, travel and stay charges cover the whole tour—not individual days."
        }
        action={
          adminEditId ? (
            <button className="secondary" onClick={onAdminDone}>
              <ChevronLeft />
              Back to reports
            </button>
          ) : (
            <button className="secondary" onClick={() => setShowPlan(true)}>
              <CalendarDays />
              View tour plan
            </button>
          )
        }
      />
      {showPlan && <TourPlan tour={tour} onClose={() => setShowPlan(false)} />}
      <TourImageCarousel itinerary={tour.itinerary} />
      <AvailabilityOverview tour={tour} />
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
        {stepNotice && (
          <div className="notice formNotice" role="status" aria-live="polite">
            <b>✓</b> {stepNotice}
          </div>
        )}
        {step === 1 && (
          <>
            <Title
              icon={<Users />}
              title="Passenger details"
              sub={`Food: age 0–5 ${money(tour.food_charge_age_0_5 || 0)} • age 6–12 ${money(tour.food_charge_age_6_12 ?? 300)} • age 13+ ${money(tour.food_charge_age_13_plus ?? 1000)}`}
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
              <div className="passengerEntry" key={i}>
                <div className="passenger">
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
                    onChange={(e) => {
                      const age = e.target.value;
                      setPeople((current) =>
                        current.map((item, index) =>
                          index === i
                            ? {
                                ...item,
                                age,
                                requires_seat_bed:
                                  Number(age) >= 6
                                    ? true
                                    : Number(item.age) >= 6
                                      ? false
                                      : item.requires_seat_bed,
                              }
                            : item,
                        ),
                      );
                    }}
                  />
                </div>
                <div className="passengerPricing">
                  <span>
                    Food charge: {money(foodChargeForAge(tour, p.age))}
                  </span>
                  {p.age !== "" && Number(p.age) <= 5 && (
                    <label>
                      <input
                        type="checkbox"
                        checked={!!p.requires_seat_bed}
                        onChange={(e) =>
                          update(i, "requires_seat_bed", e.target.checked)
                        }
                      />
                      Book an exclusive bus seat and accommodation bed for this
                      child at the regular charges
                    </label>
                  )}
                  {people.length > 1 && (
                    <button
                      type="button"
                      className="removePassenger"
                      onClick={() =>
                        setPeople((current) =>
                          current.filter((_, index) => index !== i),
                        )
                      }
                    >
                      Remove passenger
                    </button>
                  )}
                </div>
              </div>
            ))}
            <button
              className="link"
              onClick={() =>
                setPeople([
                  ...people,
                  {
                    name: "",
                    gender: "MALE",
                    age: "",
                    requires_seat_bed: false,
                  },
                ])
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
              sub={`Select one mode • ${allocationCount} paid seat(s) for ${people.length} passenger(s)`}
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
                      : money(x.charge_amount * allocationCount)}
                  </strong>
                </button>
              ))}
            </div>
            <BookingConditions compact />
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
              {tour.roomTypes.map((x) => {
                const remaining = availableRoomCapacity(x);
                const available = remaining >= allocationCount;
                return (
                  <button
                    key={x.id}
                    disabled={!available}
                    className={`${Number(room) === x.id ? "selected" : ""} ${!available ? "unavailable" : ""}`}
                    onClick={() => {
                      setError("");
                      setRoom(x.id);
                    }}
                  >
                    {x.image && (
                      <img
                        className="roomOptionImage"
                        src={x.image.url}
                        alt={`${x.name} accommodation`}
                      />
                    )}
                    <span>{x.is_ac ? "AC" : "○"}</span>
                    <b>{x.name}</b>
                    <small>
                      {money(x.charge_amount)} • {x.capacity} people/unit •{" "}
                      {x.inventory?.available_units || 0} units available (
                      {remaining} people)
                    </small>
                    {x.charge_type === "PER_BED" && (
                      <small>
                        Shared room • charged only for selected beds
                      </small>
                    )}
                    {x.extra_bed_allowed === 1 && (
                      <small>
                        Up to {x.max_extra_beds} additional bed(s) per room at{" "}
                        {money(x.extra_bed_charge)} each
                      </small>
                    )}
                    {x.description && <small>{x.description}</small>}
                    {!available && (
                      <small className="soldOut">
                        Unavailable for {allocationCount} booked bed(s) — no
                        beds/rooms remain
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="automaticAllocation" role="status">
              <b>
                Automatically calculated: {allocationCount} paid bed(s) for{" "}
                {people.length} passenger(s)
              </b>
              <span>
                {roomItem?.charge_type === "PER_BED"
                  ? `${units} bed(s)`
                  : `${units} room(s)${extra ? ` + ${extra} additional bed(s)` : ""}`}
              </span>
              <strong>{money(quote.stay)}</strong>
            </div>
            <BookingConditions compact />
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
              <Summary
                label="Stay"
                value={`${roomItem?.name} × ${units} ${roomItem?.charge_type === "PER_BED" ? "bed(s)" : "room(s)"}${extra ? ` + ${extra} extra bed(s)` : ""}`}
              />
            </div>
            <div className="previewDetails">
              <div>
                <b>Contact details</b>
                <p>
                  {family.contact_name} • {family.contact_phone}
                  {family.contact_email ? ` • ${family.contact_email}` : ""}
                </p>
              </div>
              <div>
                <b>Passengers</b>
                {people.map((person, index) => (
                  <p key={index}>
                    {index + 1}. {person.name} — {person.gender} — Age{" "}
                    {person.age}
                    {Number(person.age) <= 5
                      ? person.requires_seat_bed
                        ? " — exclusive seat/bed booked"
                        : " — no seat/bed booked"
                      : ""}
                  </p>
                ))}
              </div>
              <div>
                <b>Travel selection</b>
                <p>
                  {travelItem?.name}
                  {travelItem?.mode === "BUS"
                    ? ` • ${allocationCount} seats required`
                    : ""}
                </p>
              </div>
              <div>
                <b>Accommodation selection</b>
                <p>
                  {roomItem?.name} × {units}
                  {extra
                    ? ` • ${extra} additional bed(s) at ${money(roomItem.extra_bed_charge)} each`
                    : ""}
                </p>
              </div>
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
            <div className="paymentCommitment">
              <label>
                I will pay to
                <select
                  value={paymentReceiver}
                  onChange={(e) => setPaymentReceiver(e.target.value)}
                >
                  {PAYMENT_RECEIVERS.map((person) => (
                    <option key={person}>{person}</option>
                  ))}
                </select>
              </label>
            </div>
            <BookingConditions />
            <label className="termsAcceptance">
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={(e) => setTermsAccepted(e.target.checked)}
              />
              I have read and accept all booking conditions.
            </label>
          </>
        )}
        <footer>
          {step > 1 ? (
            <button
              className="secondary"
              onClick={() => {
                setStepNotice("");
                setStep(step - 1);
              }}
            >
              <ChevronLeft />
              Back
            </button>
          ) : (
            <span />
          )}
          <button
            className="primary"
            disabled={busy}
            onClick={() => (step < 4 ? advance() : submit())}
          >
            {busy ? (
              "Submitting…"
            ) : step < 4 ? (
              <>
                Continue
                <ChevronRight />
              </>
            ) : adminEditId ? (
              "Confirm & save changes"
            ) : (
              "Confirm & submit"
            )}
          </button>
        </footer>
      </div>
    </>
  );
}
function AvailabilityOverview({ tour }) {
  const buses = tour.travelOptions.flatMap((x) => x.inventory || []);
  return (
    <div className="availability">
      <div>
        <Bus />
        <span>
          <b>Bus seat availability</b>
          {buses.length ? (
            buses.map((x) => (
              <small key={x.bus_instance_id}>
                {x.bus_name}: {x.remaining_seats} of {x.capacity} seats
                remaining
              </small>
            ))
          ) : (
            <small>A new 45-seat bus will open when required</small>
          )}
        </span>
      </div>
      {tour.roomTypes.map((x) => (
        <div key={x.id}>
          <Hotel />
          <span>
            <b>{x.name}</b>
            <small>
              Total: {x.inventory?.total_units || 0} units /{" "}
              {x.inventory?.total_capacity || 0} people
            </small>
            <small>
              Remaining: {x.inventory?.available_units || 0} units /{" "}
              {x.inventory?.remaining_capacity || 0} people
            </small>
          </span>
        </div>
      ))}
    </div>
  );
}
function TourPlan({ tour, onClose }) {
  const days = [...new Set(tour.itinerary.map((x) => x.day_number))];
  return (
    <div className="modalBackdrop" onClick={onClose}>
      <div className="tourModal" onClick={(e) => e.stopPropagation()}>
        <button className="modalClose" onClick={onClose}>
          ×
        </button>
        <span className="eyebrow">Tour details</span>
        <h2>{tour.name}</h2>
        <p className="modalMeta">
          <MapPin />
          {tour.location}
        </p>
        <p className="modalMeta">
          <CalendarDays />
          {tour.start_date} to {tour.end_date}
        </p>
        <div className="planDays">
          {days.map((day) => (
            <section key={day}>
              <h3>Day {day}</h3>
              {tour.itinerary
                .filter((x) => x.day_number === day)
                .map((x) => (
                  <div className="planItem" key={x.id}>
                    <time>{String(x.start_time || "").slice(0, 5)}</time>
                    <span>
                      <b>{x.title}</b>
                      {x.location &&
                        (x.google_maps_url ? (
                          <a
                            className="planLocation"
                            href={x.google_maps_url}
                            target="_blank"
                            rel="noreferrer"
                          >
                            <MapPin size={14} />
                            {x.location} · Directions
                          </a>
                        ) : (
                          <small>{x.location}</small>
                        ))}
                      {x.notes && <small>{x.notes}</small>}
                      {!!x.images?.length && (
                        <div className="itineraryGallery">
                          {x.images.map((image) => (
                            <img
                              key={image.id}
                              src={image.url}
                              alt={image.file_name || x.title}
                            />
                          ))}
                        </div>
                      )}
                    </span>
                  </div>
                ))}
            </section>
          ))}
        </div>
      </div>
    </div>
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
    [newRoom, setNewRoom] = useState({
      name: "AC Sharable",
      charge_type: "PER_BED",
      charge_amount: 500,
      capacity: 4,
      description: "Shared air-conditioned room; charged per occupied bed.",
      is_ac: true,
      extra_bed_allowed: false,
      max_extra_beds: 0,
      is_active: true,
    }),
    [plan, setPlan] = useState(tour.itinerary),
    [message, setMessage] = useState(""),
    [messageType, setMessageType] = useState("success"),
    [saving, setSaving] = useState("");
  useEffect(() => {
    setT({ ...tour });
    setTravels(tour.travelOptions);
    setRooms(tour.roomTypes);
    setPlan(tour.itinerary);
  }, [tour]);
  const headers = { Authorization: `Bearer ${token}` };
  const patchRow = (set, id, key, value) =>
    set((rows) => rows.map((x) => (x.id === id ? { ...x, [key]: value } : x)));
  const save = async (url, data, label) => {
    setSaving(url);
    setMessage("");
    try {
      await api(url, { method: "PUT", headers, body: JSON.stringify(data) });
      setMessageType("success");
      setMessage(`${label} saved successfully`);
      await refresh();
    } catch (error) {
      setMessageType("error");
      setMessage(
        error.message.includes("google_maps_url")
          ? "Please execute database/05_itinerary_images_maps.sql, then try again."
          : error.message.includes("description")
            ? "Please execute database/06_room_descriptions_extra_beds.sql, then try again."
            : error.message.includes("food_charge_age")
              ? "Please execute database/07_age_pricing_payment_terms.sql, then try again."
              : `Could not save ${label}: ${error.message}`,
      );
    } finally {
      setSaving("");
    }
  };
  const uploadPlanImages = async (item, files) => {
    if (!files.length) return;
    if ((item.images?.length || 0) + files.length > 10) {
      setMessage("A travel-plan item can contain a maximum of 10 images");
      return;
    }
    const body = new FormData();
    [...files].forEach((file) => body.append("images", file));
    const response = await fetch(`/api/admin/itinerary/${item.id}/images`, {
      method: "POST",
      headers,
      body,
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.message || "Image upload failed");
    patchRow(setPlan, item.id, "images", [...(item.images || []), ...result]);
    setMessageType("success");
    setMessage(`${result.length} image(s) uploaded for ${item.title}`);
  };
  const removePlanImage = async (item, imageId) => {
    await api(`/api/admin/itinerary-images/${imageId}`, {
      method: "DELETE",
      headers,
    });
    patchRow(
      setPlan,
      item.id,
      "images",
      (item.images || []).filter((image) => image.id !== imageId),
    );
    setMessageType("success");
    setMessage(`Image removed from ${item.title}`);
  };
  const uploadRoomImage = async (room, file) => {
    if (!file) return;
    const url = `/api/admin/room-types/${room.id}/image`;
    setSaving(url);
    setMessage("");
    try {
      const body = new FormData();
      body.append("image", file);
      const response = await fetch(url, {
        method: "POST",
        headers,
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok)
        throw new Error(result.message || "Room image upload failed");
      patchRow(setRooms, room.id, "image", result);
      notify(`${room.name} image saved successfully`);
    } catch (uploadError) {
      notify(
        uploadError.message.includes("room_type_images")
          ? "Please execute database/08_room_type_images.sql, then upload the image again."
          : `Could not upload ${room.name} image: ${uploadError.message}`,
        "error",
      );
    } finally {
      setSaving("");
    }
  };
  const removeRoomImage = async (room) => {
    const url = `/api/admin/room-types/${room.id}/image`;
    setSaving(url);
    setMessage("");
    try {
      await api(url, { method: "DELETE", headers });
      patchRow(setRooms, room.id, "image", null);
      notify(`${room.name} image removed`);
    } catch (removeError) {
      notify(
        `Could not remove ${room.name} image: ${removeError.message}`,
        "error",
      );
    } finally {
      setSaving("");
    }
  };
  const notify = (value, type = "success") => {
    setMessageType(type);
    setMessage(value);
  };
  const removeMaster = async (entity, item, setRows) => {
    const label = item.name || item.title;
    if (!window.confirm(`Delete "${label}"? This action cannot be undone.`))
      return;
    const url = `/api/admin/${entity}/${item.id}`;
    setSaving(url);
    setMessage("");
    try {
      await api(url, { method: "DELETE", headers });
      setRows((current) => current.filter((row) => row.id !== item.id));
      notify(`${label} deleted successfully`);
      await refresh();
    } catch (error) {
      notify(`Could not delete ${label}: ${error.message}`, "error");
    } finally {
      setSaving("");
    }
  };
  const addRoomType = async () => {
    const url = "/api/admin/room-types";
    setSaving(url);
    setMessage("");
    try {
      const created = await api(url, {
        method: "POST",
        headers,
        body: JSON.stringify({ ...newRoom, tour_id: tour.id }),
      });
      setRooms((current) => [...current, { ...newRoom, id: created.id }]);
      notify(`${newRoom.name} room type added. You can now add its inventory.`);
      await refresh();
    } catch (error) {
      notify(`Could not add room type: ${error.message}`, "error");
    } finally {
      setSaving("");
    }
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
            disabled={!!saving}
            onClick={() => save(`/api/admin/tours/${tour.id}`, t, "Tour")}
          >
            {saving === `/api/admin/tours/${tour.id}`
              ? "Saving tour…"
              : "Save tour"}
          </button>
        }
      />
      {message && (
        <div
          className={messageType === "error" ? "alert" : "notice"}
          role="status"
          aria-live="polite"
        >
          {messageType === "success" ? "✓ " : ""}
          {message}
        </div>
      )}
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
              label="Estimated misc."
              type="number"
              value={t.estimated_misc_expense}
              onChange={(v) => setT({ ...t, estimated_misc_expense: v })}
            />
          </div>
          <div className="foodConfig">
            <h3>Food configuration by age</h3>
            <div className="grid3">
              <Field
                label="Age 0–5 (₹)"
                type="number"
                value={t.food_charge_age_0_5 ?? 0}
                onChange={(v) => setT({ ...t, food_charge_age_0_5: Number(v) })}
              />
              <Field
                label="Age 6–12 (₹)"
                type="number"
                value={t.food_charge_age_6_12 ?? 300}
                onChange={(v) =>
                  setT({ ...t, food_charge_age_6_12: Number(v) })
                }
              />
              <Field
                label="Age 13+ (₹)"
                type="number"
                value={
                  t.food_charge_age_13_plus ?? t.food_charge_per_person ?? 1000
                }
                onChange={(v) =>
                  setT({
                    ...t,
                    food_charge_age_13_plus: Number(v),
                    food_charge_per_person: Number(v),
                  })
                }
              />
            </div>
          </div>
        </div>
        <div className="card editor">
          <h2>Travel options</h2>
          {travels.map((x) => (
            <div className="configCard travelConfig" key={x.id}>
              <ConfigField label="Travel name">
                <input
                  value={x.name}
                  onChange={(e) =>
                    patchRow(setTravels, x.id, "name", e.target.value)
                  }
                />
              </ConfigField>
              <ConfigField label="Mode">
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
              </ConfigField>
              <ConfigField label="Charge per person">
                <input
                  type="number"
                  value={x.charge_amount}
                  onChange={(e) =>
                    patchRow(setTravels, x.id, "charge_amount", e.target.value)
                  }
                />
              </ConfigField>
              <ConfigField label="Seat capacity">
                <input
                  type="number"
                  value={x.capacity || ""}
                  onChange={(e) =>
                    patchRow(setTravels, x.id, "capacity", e.target.value)
                  }
                />
              </ConfigField>
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
              <div className="configActions">
                <button
                  disabled={!!saving}
                  onClick={() =>
                    save(`/api/admin/travel-options/${x.id}`, x, x.name)
                  }
                >
                  {saving === `/api/admin/travel-options/${x.id}`
                    ? "Saving…"
                    : "Save"}
                </button>
                <button
                  className="danger"
                  disabled={!!saving}
                  onClick={() => removeMaster("travel", x, setTravels)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
          <BusInventoryManager
            travelOptions={travels}
            token={token}
            onSaved={notify}
          />
        </div>
        <div className="card editor">
          <h2>Room types</h2>
          {rooms.map((x) => (
            <div className="configCard roomConfig" key={x.id}>
              <ConfigField label="Room type">
                <input
                  value={x.name}
                  onChange={(e) =>
                    patchRow(setRooms, x.id, "name", e.target.value)
                  }
                />
              </ConfigField>
              <ConfigField label="Charging basis">
                <select
                  value={x.charge_type}
                  onChange={(e) =>
                    patchRow(setRooms, x.id, "charge_type", e.target.value)
                  }
                >
                  <option value="PER_BED">Per bed</option>
                  <option value="PER_ROOM">Per room</option>
                </select>
              </ConfigField>
              <ConfigField label="Charge (₹)">
                <input
                  type="number"
                  value={x.charge_amount}
                  onChange={(e) =>
                    patchRow(setRooms, x.id, "charge_amount", e.target.value)
                  }
                />
              </ConfigField>
              <ConfigField label="People capacity">
                <input
                  type="number"
                  value={x.capacity}
                  onChange={(e) =>
                    patchRow(setRooms, x.id, "capacity", e.target.value)
                  }
                />
              </ConfigField>
              <ConfigField label="Room description" className="roomDescription">
                <input
                  value={x.description || ""}
                  placeholder="Shown to users during registration"
                  onChange={(e) =>
                    patchRow(setRooms, x.id, "description", e.target.value)
                  }
                />
              </ConfigField>
              <div className="configChecks">
                <span>Facilities</span>
                <label className="check">
                  <input
                    type="checkbox"
                    checked={!!x.is_ac}
                    onChange={(e) =>
                      patchRow(setRooms, x.id, "is_ac", e.target.checked)
                    }
                  />
                  Air-conditioned
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
                  Allow additional bed
                </label>
              </div>
              {x.extra_bed_allowed ? (
                <>
                  <ConfigField label="Extra beds per room">
                    <input
                      type="number"
                      min="0"
                      value={x.max_extra_beds || 0}
                      onChange={(e) =>
                        patchRow(
                          setRooms,
                          x.id,
                          "max_extra_beds",
                          Number(e.target.value),
                        )
                      }
                    />
                  </ConfigField>
                  <ConfigField label="Charge per extra bed (₹)">
                    <input
                      type="number"
                      min="0"
                      value={x.extra_bed_charge || 0}
                      onChange={(e) =>
                        patchRow(
                          setRooms,
                          x.id,
                          "extra_bed_charge",
                          Number(e.target.value),
                        )
                      }
                    />
                  </ConfigField>
                </>
              ) : null}
              <div className="configActions">
                <button
                  disabled={!!saving}
                  onClick={() =>
                    save(`/api/admin/room-types/${x.id}`, x, x.name)
                  }
                >
                  {saving === `/api/admin/room-types/${x.id}`
                    ? "Saving…"
                    : "Save"}
                </button>
                <button
                  className="danger"
                  disabled={!!saving}
                  onClick={() => removeMaster("room", x, setRooms)}
                >
                  Delete
                </button>
              </div>
              <div className="roomImageEditor">
                <div className="roomImagePreview">
                  {x.image ? (
                    <img src={x.image.url} alt={`${x.name} room`} />
                  ) : (
                    <span>No room image uploaded</span>
                  )}
                </div>
                <label className="roomImageUpload">
                  <span>Room/bed image</span>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    disabled={!!saving}
                    onChange={(event) => {
                      uploadRoomImage(x, event.target.files?.[0]);
                      event.target.value = "";
                    }}
                  />
                  <small>
                    One image, maximum 5 MB. A new upload replaces it.
                  </small>
                </label>
                {x.image && (
                  <button
                    type="button"
                    className="danger"
                    disabled={!!saving}
                    onClick={() => removeRoomImage(x)}
                  >
                    Remove image
                  </button>
                )}
              </div>
              <RoomInventoryInline
                room={x}
                token={token}
                onSaved={notify}
                onAdded={refresh}
              />
            </div>
          ))}
          <div className="configCard roomConfig newRoomType">
            <ConfigField label="New room type">
              <input
                value={newRoom.name}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, name: e.target.value })
                }
              />
            </ConfigField>
            <ConfigField label="Charging basis">
              <select
                value={newRoom.charge_type}
                onChange={(e) =>
                  setNewRoom({ ...newRoom, charge_type: e.target.value })
                }
              >
                <option value="PER_BED">Per bed (shared room)</option>
                <option value="PER_ROOM">Per room</option>
              </select>
            </ConfigField>
            <ConfigField label="Charge (₹)">
              <input
                type="number"
                min="0"
                value={newRoom.charge_amount}
                onChange={(e) =>
                  setNewRoom({
                    ...newRoom,
                    charge_amount: Number(e.target.value),
                  })
                }
              />
            </ConfigField>
            <ConfigField label="Beds per room">
              <input
                type="number"
                min="1"
                value={newRoom.capacity}
                onChange={(e) =>
                  setNewRoom({
                    ...newRoom,
                    capacity: Number(e.target.value),
                  })
                }
              />
            </ConfigField>
            <ConfigField label="Room description" className="roomDescription">
              <input
                value={newRoom.description || ""}
                placeholder="Shown to users during registration"
                onChange={(e) =>
                  setNewRoom({ ...newRoom, description: e.target.value })
                }
              />
            </ConfigField>
            <div className="configChecks">
              <span>Facilities</span>
              <label className="check">
                <input
                  type="checkbox"
                  checked={newRoom.is_ac}
                  onChange={(e) =>
                    setNewRoom({ ...newRoom, is_ac: e.target.checked })
                  }
                />
                Air-conditioned
              </label>
              <label className="check">
                <input
                  type="checkbox"
                  checked={newRoom.extra_bed_allowed}
                  onChange={(e) =>
                    setNewRoom({
                      ...newRoom,
                      extra_bed_allowed: e.target.checked,
                    })
                  }
                />
                Allow additional bed
              </label>
            </div>
            {newRoom.extra_bed_allowed && (
              <>
                <ConfigField label="Extra beds per room">
                  <input
                    type="number"
                    min="0"
                    value={newRoom.max_extra_beds || 0}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        max_extra_beds: Number(e.target.value),
                      })
                    }
                  />
                </ConfigField>
                <ConfigField label="Charge per extra bed (₹)">
                  <input
                    type="number"
                    min="0"
                    value={newRoom.extra_bed_charge || 0}
                    onChange={(e) =>
                      setNewRoom({
                        ...newRoom,
                        extra_bed_charge: Number(e.target.value),
                      })
                    }
                  />
                </ConfigField>
              </>
            )}
            <button disabled={!!saving} onClick={addRoomType}>
              {saving === "/api/admin/room-types" ? "Adding…" : "Add room type"}
            </button>
          </div>
        </div>
        <div className="card wide editor">
          <h2>Travel plan</h2>
          {plan.map((x) => (
            <div className="itineraryConfig" key={x.id}>
              <div className="editRow planEdit">
                <Field
                  label="Day"
                  type="number"
                  value={x.day_number}
                  onChange={(v) => patchRow(setPlan, x.id, "day_number", v)}
                />
                <Field
                  label="Time"
                  type="time"
                  value={String(x.start_time || "").slice(0, 5)}
                  onChange={(v) => patchRow(setPlan, x.id, "start_time", v)}
                />
                <Field
                  label="Title"
                  value={x.title}
                  onChange={(v) => patchRow(setPlan, x.id, "title", v)}
                />
                <Field
                  label="Location"
                  value={x.location || ""}
                  onChange={(v) => patchRow(setPlan, x.id, "location", v)}
                />
                <Field
                  label="Google Maps / Directions link"
                  value={x.google_maps_url || ""}
                  onChange={(v) =>
                    patchRow(setPlan, x.id, "google_maps_url", v)
                  }
                />
                <div className="configActions">
                  <button
                    disabled={!!saving}
                    onClick={() =>
                      save(`/api/admin/itinerary/${x.id}`, x, x.title)
                    }
                  >
                    {saving === `/api/admin/itinerary/${x.id}`
                      ? "Saving…"
                      : "Save"}
                  </button>
                  <button
                    className="danger"
                    disabled={!!saving}
                    onClick={() => removeMaster("itinerary", x, setPlan)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="planImages">
                <label className="imagePicker">
                  Images ({x.images?.length || 0}/10)
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    multiple
                    onChange={(e) =>
                      uploadPlanImages(x, e.target.files).catch(
                        (error) => (
                          setMessageType("error"),
                          setMessage(error.message)
                        ),
                      )
                    }
                  />
                </label>
                <div className="imageThumbs">
                  {(x.images || []).map((image) => (
                    <span key={image.id}>
                      <img src={image.url} alt={image.file_name || x.title} />
                      <button
                        aria-label="Remove image"
                        onClick={() => removePlanImage(x, image.id)}
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
function BusInventoryManager({ travelOptions, token, onSaved }) {
  const busOptions = travelOptions.filter((x) => x.mode === "BUS");
  const [buses, setBuses] = useState(
    busOptions.flatMap((x) =>
      (x.inventory || []).map((bus) => ({ ...bus, option_name: x.name })),
    ),
  );
  const [optionId, setOptionId] = useState(busOptions[0]?.id || "");
  const [name, setName] = useState("");
  const [capacity, setCapacity] = useState(busOptions[0]?.capacity || 45);
  const headers = { Authorization: `Bearer ${token}` };
  const add = async () => {
    const created = await api("/api/admin/buses", {
      method: "POST",
      headers,
      body: JSON.stringify({
        travel_option_id: Number(optionId),
        bus_name: name,
        capacity,
      }),
    });
    const option = busOptions.find((x) => x.id === Number(optionId));
    setBuses([
      ...buses,
      {
        ...created,
        travel_option_id: Number(optionId),
        option_name: option?.name,
        used_seats: 0,
        remaining_seats: created.capacity,
        is_active: 1,
      },
    ]);
    setName("");
    onSaved(`${created.bus_name} added with ${created.capacity} seats`);
  };
  const update = async (bus) => {
    await api(`/api/admin/buses/${bus.bus_instance_id || bus.id}`, {
      method: "PUT",
      headers,
      body: JSON.stringify(bus),
    });
    onSaved(`${bus.bus_name} updated`);
  };
  const remove = async (bus) => {
    const id = bus.bus_instance_id || bus.id;
    if (!window.confirm(`Delete "${bus.bus_name}"?`)) return;
    try {
      await api(`/api/admin/buses/${id}`, {
        method: "DELETE",
        headers,
      });
      setBuses((current) =>
        current.filter((item) => (item.bus_instance_id || item.id) !== id),
      );
      onSaved(`${bus.bus_name} deleted successfully`);
    } catch (error) {
      onSaved(`Could not delete ${bus.bus_name}: ${error.message}`, "error");
    }
  };
  const patchBus = (id, key, value) =>
    setBuses((rows) =>
      rows.map((x) =>
        (x.bus_instance_id || x.id) === id ? { ...x, [key]: value } : x,
      ),
    );
  if (!busOptions.length) return null;
  return (
    <div className="inventorySection">
      <h3>Bus inventory</h3>
      {buses.map((bus) => {
        const id = bus.bus_instance_id || bus.id;
        return (
          <div className="busInventoryRow" key={id}>
            <ConfigField label="Travel option">
              <input value={bus.option_name || "Bus"} disabled />
            </ConfigField>
            <ConfigField label="Bus name">
              <input
                value={bus.bus_name}
                onChange={(e) => patchBus(id, "bus_name", e.target.value)}
              />
            </ConfigField>
            <ConfigField label="Capacity">
              <input
                type="number"
                value={bus.capacity}
                onChange={(e) =>
                  patchBus(id, "capacity", Number(e.target.value))
                }
              />
            </ConfigField>
            <ConfigField label="Allocated">
              <input value={bus.used_seats || 0} disabled />
            </ConfigField>
            <ConfigField label="Remaining">
              <input value={bus.remaining_seats ?? bus.capacity} disabled />
            </ConfigField>
            <div className="configActions">
              <button onClick={() => update(bus)}>Save bus</button>
              <button className="danger" onClick={() => remove(bus)}>
                Delete
              </button>
            </div>
          </div>
        );
      })}
      <div className="busInventoryRow addBus">
        <ConfigField label="Travel option">
          <select
            value={optionId}
            onChange={(e) => {
              setOptionId(e.target.value);
              const option = busOptions.find(
                (x) => x.id === Number(e.target.value),
              );
              setCapacity(option?.capacity || 45);
            }}
          >
            {busOptions.map((x) => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </ConfigField>
        <ConfigField label="New bus name">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Auto: Bus B"
          />
        </ConfigField>
        <ConfigField label="Seat capacity">
          <input
            type="number"
            min="1"
            value={capacity}
            onChange={(e) => setCapacity(Number(e.target.value))}
          />
        </ConfigField>
        <button onClick={add}>Add new bus</button>
      </div>
    </div>
  );
}
function RoomInventoryInline({ room, token, onSaved, onAdded }) {
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState(
    String(room.name || "ROOM")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "ROOM",
  );
  const [floor, setFloor] = useState("");
  const [adding, setAdding] = useState(false);
  const add = async () => {
    if (quantity < 1 || !prefix.trim())
      return onSaved(
        `Enter a valid quantity and room prefix for ${room.name}.`,
        "error",
      );
    setAdding(true);
    try {
      const result = await api("/api/admin/room-inventory/bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room_type_id: room.id,
          quantity,
          prefix: prefix.trim(),
          floor_number: floor,
          standard_capacity: room.capacity,
          extra_bed_capacity: room.max_extra_beds,
        }),
      });
      onSaved(
        `${result.created} ${room.name} room(s) added with ${room.capacity} bed(s) each.`,
      );
      await onAdded?.();
    } catch (error) {
      onSaved(
        `Could not add ${room.name} inventory: ${error.message}`,
        "error",
      );
    } finally {
      setAdding(false);
    }
  };
  return (
    <div className="roomInventoryInline">
      <h3>Inventory for {room.name}</h3>
      <div
        className={`inventoryStatus ${Number(room.inventory?.total_units || 0) === 0 ? "empty" : ""}`}
      >
        <span>
          Current: {room.inventory?.total_units || 0} room(s)/unit(s) •{" "}
          {room.inventory?.remaining_capacity || 0} bed(s) remaining
        </span>
        {Number(room.inventory?.total_units || 0) === 0 && (
          <small>
            Registration cannot use this room type until inventory is added.
          </small>
        )}
      </div>
      <div className="inlineInventoryBuilder">
        <ConfigField label="Beds per room">
          <input value={room.capacity || ""} disabled />
        </ConfigField>
        <ConfigField label="Units to add">
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Number(e.target.value))}
          />
        </ConfigField>
        <ConfigField label="Room prefix">
          <input
            value={prefix}
            onChange={(e) => setPrefix(e.target.value)}
            placeholder="e.g. AC"
          />
        </ConfigField>
        <ConfigField label="Floor">
          <input
            value={floor}
            onChange={(e) => setFloor(e.target.value)}
            placeholder="e.g. 2"
          />
        </ConfigField>
        <button disabled={adding} onClick={add}>
          {adding ? "Adding…" : "Add inventory"}
        </button>
      </div>
      {room.charge_type === "PER_BED" && (
        <small className="sharedHint">
          Shared allocation remains available until all beds in these rooms are
          allocated.
        </small>
      )}
    </div>
  );
}
function Reports({ tour, token, onEditRegistration }) {
  const [type, setType] = useState("overall"),
    [busFilter, setBusFilter] = useState(""),
    [roomFilter, setRoomFilter] = useState(""),
    [receiverFilter, setReceiverFilter] = useState(""),
    [rows, setRows] = useState([]),
    [inventory, setInventory] = useState({ rooms: [], buses: [] }),
    [error, setError] = useState("");
  const reportQuery = useMemo(() => {
    const params = new URLSearchParams({ type });
    if (busFilter) params.set("bus_id", busFilter);
    if (roomFilter) params.set("room_type_id", roomFilter);
    if (receiverFilter) params.set("payment_receiver", receiverFilter);
    return params.toString();
  }, [busFilter, receiverFilter, roomFilter, type]);
  const collectionByReceiver = useMemo(() => {
    const totals = new Map(
      PAYMENT_RECEIVERS.map((name) => [
        name,
        { name, families: 0, total: 0, received: 0 },
      ]),
    );
    rows.forEach((row) => {
      const name = row.payment_receiver || "Not selected";
      const current = totals.get(name) || {
        name,
        families: 0,
        total: 0,
        received: 0,
      };
      current.families += 1;
      current.total += Number(row.total_amount || 0);
      if (row.amount_received)
        current.received += Number(row.total_amount || 0);
      totals.set(name, current);
    });
    return [...totals.values()];
  }, [rows]);
  useEffect(() => {
    const headers = { Authorization: `Bearer ${token}` };
    Promise.all([
      api(`/api/admin/reports/${tour.id}?${reportQuery}`, { headers }),
      api(`/api/admin/inventory/${tour.id}`, { headers }),
    ])
      .then(([report, stock]) => {
        setRows(report);
        setInventory(stock);
      })
      .catch((e) => setError(e.message));
  }, [reportQuery, tour.id, token]);
  const download = async () => {
    const r = await fetch(
      `/api/admin/reports/${tour.id}/excel?${reportQuery}`,
      {
        headers: { Authorization: `Bearer ${token}` },
      },
    );
    const blob = await r.blob(),
      u = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = u;
    a.download = `tour-${type}-report.xlsx`;
    a.click();
    URL.revokeObjectURL(u);
  };
  const updateAdminField = (id, key, value) =>
    setRows((current) =>
      current.map((row) => (row.id === id ? { ...row, [key]: value } : row)),
    );
  const savePaymentNote = async (row) => {
    try {
      await api(`/api/admin/registrations/${row.id}/payment-note`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          amount_received: !!row.amount_received,
          admin_comments: row.admin_comments || "",
        }),
      });
      setError("");
    } catch (e) {
      setError(e.message);
    }
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
          value={rows.reduce((s, x) => s + Number(x.member_count), 0)}
        />
        <Stat
          label="Collection"
          value={money(rows.reduce((s, x) => s + Number(x.total_amount), 0))}
        />
      </div>
      <section className="receiverCollections card">
        <h2>Collection by payment receiver</h2>
        <div className="receiverCollectionGrid">
          {collectionByReceiver.map((receiver) => (
            <div className="receiverCollection" key={receiver.name}>
              <span>{receiver.name}</span>
              <b>{money(receiver.total)}</b>
              <small>
                {receiver.families} family/families • Received:{" "}
                {money(receiver.received)}
              </small>
            </div>
          ))}
        </div>
      </section>
      <div className="inventoryGrid">
        <div className="card table">
          <h2>Room inventory remaining</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Total units</th>
                <th>Total capacity</th>
                <th>Available</th>
                <th>Remaining capacity</th>
              </tr>
            </thead>
            <tbody>
              {inventory.rooms.map((x) => (
                <tr key={x.room_type_id}>
                  <td>{x.name}</td>
                  <td>{x.total_units}</td>
                  <td>{x.total_capacity}</td>
                  <td>
                    <b>{x.available_units}</b>
                  </td>
                  <td>{x.remaining_capacity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="card table">
          <h2>Bus inventory</h2>
          <table>
            <thead>
              <tr>
                <th>Bus</th>
                <th>Capacity</th>
                <th>Used</th>
                <th>Seats left</th>
              </tr>
            </thead>
            <tbody>
              {inventory.buses.map((x) => (
                <tr key={x.bus_instance_id}>
                  <td>{x.bus_name}</td>
                  <td>{x.capacity}</td>
                  <td>{x.used_seats}</td>
                  <td>
                    <b>{x.remaining_seats}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <div className="filters">
        {["overall", "bus", "self", "room"].map((x) => (
          <button
            className={type === x ? "active" : ""}
            onClick={() => {
              setType(x);
              if (x === "self") setBusFilter("");
            }}
            key={x}
          >
            {x === "self" ? "Self Travel" : x[0].toUpperCase() + x.slice(1)}
          </button>
        ))}
      </div>
      <div className="reportFilters card">
        <ConfigField label="Bus">
          <select
            value={busFilter}
            disabled={type === "self"}
            onChange={(event) => setBusFilter(event.target.value)}
          >
            <option value="">All buses</option>
            {inventory.buses.map((bus) => (
              <option key={bus.bus_instance_id} value={bus.bus_instance_id}>
                {bus.bus_name}
              </option>
            ))}
          </select>
        </ConfigField>
        <ConfigField label="Room type">
          <select
            value={roomFilter}
            onChange={(event) => setRoomFilter(event.target.value)}
          >
            <option value="">All room types</option>
            {tour.roomTypes.map((room) => (
              <option key={room.id} value={room.id}>
                {room.name}
              </option>
            ))}
          </select>
        </ConfigField>
        <ConfigField label="Payment receiver">
          <select
            value={receiverFilter}
            onChange={(event) => setReceiverFilter(event.target.value)}
          >
            <option value="">All payment receivers</option>
            {PAYMENT_RECEIVERS.map((person) => (
              <option key={person} value={person}>
                {person}
              </option>
            ))}
          </select>
        </ConfigField>
        <button
          type="button"
          onClick={() => {
            setBusFilter("");
            setRoomFilter("");
            setReceiverFilter("");
          }}
        >
          Clear filters
        </button>
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
                "I will pay to",
              ].map((x) => (
                <th key={x}>{x}</th>
              ))}
              {type === "overall" && (
                <>
                  <th>Amount received</th>
                  <th>Comments</th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td>
                  <b>{x.family_name}</b>
                  <button
                    type="button"
                    className="reportEditLink"
                    onClick={() => onEditRegistration(x.id)}
                  >
                    {x.contact_name}
                  </button>
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
                <td>{x.payment_receiver || "—"}</td>
                {type === "overall" && (
                  <>
                    <td className="receivedCell">
                      <input
                        aria-label={`Amount received for ${x.family_name}`}
                        type="checkbox"
                        checked={!!x.amount_received}
                        onChange={(e) =>
                          updateAdminField(
                            x.id,
                            "amount_received",
                            e.target.checked,
                          )
                        }
                      />
                    </td>
                    <td className="commentCell">
                      <textarea
                        aria-label={`Comments for ${x.family_name}`}
                        value={x.admin_comments || ""}
                        placeholder="Add comments; saved when you leave this field"
                        onChange={(e) =>
                          updateAdminField(
                            x.id,
                            "admin_comments",
                            e.target.value,
                          )
                        }
                        onBlur={() => savePaymentNote(x)}
                      />
                    </td>
                  </>
                )}
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
function ConfigField({ label, children, className = "" }) {
  return (
    <label className={`configField ${className}`}>
      <span>{label}</span>
      {children}
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
