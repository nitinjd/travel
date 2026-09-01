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
  Printer,
  Settings2,
  Users,
  Wallet,
  Moon,
  Sun,
} from "lucide-react";
const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const formatDateTime = (value) => {
  if (!value) return "—";
  const normalized = String(value).includes("T")
    ? String(value)
    : `${String(value).replace(" ", "T")}Z`;
  const date = new Date(normalized);
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat("en-IN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Kolkata",
  }).format(date);
};
const PAYMENT_RECEIVERS = [
  "Birju Bhatt",
  "Mahesh Savani",
  "Mayur Satasiya",
  "Parin Thakkar",
];
const MANDALS = [
  "Ambegaon",
  "Bal Mandal",
  "Balajinagar",
  "Balewadi",
  "Balika Mandal",
  "Dattanagar",
  "Dhayari",
  "Hadapsar",
  "Hinjawadi",
  "Hinjewadi",
  "Kalyani Nagar",
  "Karvenagar",
  "Kondhwa",
  "Kothrud",
  "Lohegaon",
  "Mandai (Peth)",
  "Market Yard",
  "Nigdi",
  "Pune Hindi",
  "Pune Mandir",
  "Pune Rural",
  "Rajasthani",
  "Sangvi",
  "Shivane",
  "Sinhagad",
  "Talegaon",
  "Tathawade",
  "Thadwade",
  "Wagholi",
  "Wakad",
  "Others",
];
const BOOKING_CONDITIONS = [
  "Booking will be confirmed only after payment is received.",
  "If any change is required in the plan, accommodation or other arrangements, due diligence will be followed with guidance from the leaders.",
  "Cancellation and refund are not available after booking is confirmed.",
  "For children aged 0–5, bus seating and accommodation are optional and charged only when selected for the child.",
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
    [selectedAdminTour, setSelectedAdminTour] = useState(null),
    [tab, setTab] = useState("tours"),
    [editingRegistrationId, setEditingRegistrationId] = useState(null),
    [token, setToken] = useState(localStorage.getItem("tourToken")),
    [error, setError] = useState(""),
    [darkMode, setDarkMode] = useState(() => localStorage.getItem("tourDarkMode") === "1");
  useEffect(() => {
    document.documentElement.dataset.theme = darkMode ? "dark" : "light";
    localStorage.setItem("tourDarkMode", darkMode ? "1" : "0");
  }, [darkMode]);
  useEffect(() => {
    api("/api/tours/active")
      .then(setTour)
      .catch((e) => {
        if (!isAdminPage) setError(e.message);
      });
  }, [isAdminPage]);
  const adminTour = selectedAdminTour || tour;
  const displayTour = isAdminPage ? adminTour : tour;
  const loadAdminTour = (id) =>
    api(`/api/admin/tours/${id}/config`, {
      headers: { Authorization: `Bearer ${token}` },
    }).then((selected) => {
      setSelectedAdminTour(selected);
      return selected;
    });
  const logout = () => {
    localStorage.removeItem("tourToken");
    setToken(null);
    setSelectedAdminTour(null);
    setTab("tours");
  };
  return (
    <>
      <header>
        <button
          type="button"
          className="brandLink"
          aria-label="Go to registration page"
          onClick={() => {
            window.location.href = "/";
          }}
        >
          <span className="logo">TS</span>
          <span className="brandText">
            <b>TourSetu</b>
            <small>Trip Manager</small>
          </span>
        </button>
        {displayTour && (
          <div className="trip">
            <CalendarDays size={16} />
            {displayTour.start_date} – {displayTour.end_date}
            <MapPin size={16} />
            {displayTour.location}
          </div>
        )}
        <div className="headerActions">
          <button
            type="button"
            className="themeToggle"
            title={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
            onClick={() => setDarkMode((value) => !value)}
          >
            {darkMode ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          {isAdminPage && token && (
            <>
              <div className="admin">Administrator</div>
              <button type="button" className="headerLogout" onClick={logout}>
                <LogOut size={16} />
                Logout
              </button>
            </>
          )}
        </div>
      </header>
      <main
        className={
          !isAdminPage ? "publicMain" : !token ? "loginMain" : "adminMain"
        }
      >
        <section className="content">
          {error && (
            <ErrorToast message={error} onRetry={() => window.location.reload()} onClose={() => setError("")} />
          )}
          {!isAdminPage ? (
            !tour ? (
              <div className="card">Loading tour…</div>
            ) : (
              <Registration tour={tour} />
            )
          ) : !token ? (
            <Login
              onLogin={(x) => {
                localStorage.setItem("tourToken", x);
                setToken(x);
                setTab("tours");
              }}
            />
          ) : tab === "tours" ? (
            <TourList
              token={token}
              selectedTourId={selectedAdminTour?.id}
              onSelect={(id) => loadAdminTour(id).then(() => setTab("admin"))}
              onReports={(id) => loadAdminTour(id).then(() => setTab("reports"))}
              onNewTour={() => setTab("newTour")}
            />
          ) : tab === "admin" ? (
            adminTour ? (
              <Admin
                tour={adminTour}
                token={token}
                refresh={() => loadAdminTour(adminTour.id)}
                onBack={() => setTab("tours")}
              />
            ) : (
              <TourList token={token} onSelect={(id) => loadAdminTour(id).then(() => setTab("admin"))} onReports={(id) => loadAdminTour(id).then(() => setTab("reports"))} onNewTour={() => setTab("newTour")} />
            )
          ) : tab === "newTour" ? (
            <NewTour
              token={token}
              onCancel={() => setTab("tours")}
              onCreated={(id) => loadAdminTour(id).then(() => setTab("admin"))}
            />
          ) : tab === "registration" && editingRegistrationId ? (
            <Registration
              tour={adminTour}
              token={token}
              adminEditId={editingRegistrationId}
              onAdminDone={() => {
                loadAdminTour(adminTour.id).finally(() => {
                  setEditingRegistrationId(null);
                  setTab("reports");
                });
              }}
            />
          ) : (
            <Reports
              tour={adminTour}
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
function Registration({ tour, adminEditId = null, token = "", onAdminDone }) {
  const [step, setStep] = useState(1),
    [family, setFamily] = useState({
      family_name: "",
      mandal: "",
      contact_name: "",
      contact_phone: "",
      contact_email: "",
    }),
    [people, setPeople] = useState([
      { name: "", gender: "MALE", age: "", requires_bus_seat: false, requires_accommodation: false },
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
    [error, setError] = useState(""),
    [fieldErrors, setFieldErrors] = useState({});
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
          mandal: record.mandal || "Others",
          contact_name: record.contact_name || "",
          contact_phone: record.contact_phone || "",
          contact_email: record.contact_email || "",
        });
        setPeople(
          record.passengers.map((passenger) => ({
            ...passenger,
            age: String(passenger.age),
            requires_bus_seat: !!passenger.requires_bus_seat,
            requires_accommodation: !!passenger.requires_accommodation,
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
  const busSeatCount = useMemo(
    () =>
      people.filter(
        (passenger) => Number(passenger.age) >= 6 || passenger.requires_bus_seat,
      ).length,
    [people],
  );
  const accommodationCount = useMemo(
    () =>
      people.filter(
        (passenger) =>
          Number(passenger.age) >= 6 || passenger.requires_accommodation,
      ).length,
    [people],
  );
  const availableRoomCapacity = (item) =>
    Number(item?.inventory?.remaining_capacity || 0) +
    (editRecord && Number(editRecord.room_type_id) === Number(item?.id)
      ? Number(editRecord.accommodation_count ?? editRecord.allocation_count ?? 0)
      : 0);
  useEffect(() => {
    if (availableRoomCapacity(roomItem) >= accommodationCount) return;
    const available = tour.roomTypes.find(
      (item) => availableRoomCapacity(item) >= accommodationCount,
    );
    if (available) setRoom(available.id);
  }, [accommodationCount, editRecord, room, roomItem, tour.roomTypes]);
  const { units, extra } = useMemo(
    () => calculateAccommodation(roomItem, accommodationCount),
    [roomItem, accommodationCount],
  );
  const quote = useMemo(() => {
    const food = people.reduce(
        (sum, passenger) => sum + foodChargeForAge(tour, passenger.age),
        0,
      ),
      tv =
        travelItem?.charge_type === "PER_PERSON"
          ? busSeatCount * travelItem.charge_amount
          : travelItem?.charge_amount || 0,
      stay =
        units * (roomItem?.charge_amount || 0) +
        extra * (roomItem?.extra_bed_charge || 0);
    return { food, tv, stay, total: food + tv + stay };
  }, [people, busSeatCount, travelItem, roomItem, units, extra, tour]);
  const update = (i, k, v) =>
    setPeople((p) => p.map((x, n) => (n === i ? { ...x, [k]: v } : x)));
  const clearFieldError = (key) =>
    setFieldErrors((current) => {
      if (!current[key]) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  const validateStep1 = () => {
    const next = {};
    const phone = family.contact_phone.replace(/[^0-9+]/g, "");
    if (!family.family_name.trim()) next.family_name = "Family / Group name is required";
    if (!family.mandal) next.mandal = "Mandal is required";
    if (!family.contact_name.trim()) next.contact_name = "Contact person is required";
    if (!/^\+?[0-9]{7,15}$/.test(phone)) next.contact_phone = "Enter a valid mobile number";
    if (family.contact_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(family.contact_email))
      next.contact_email = "Enter a valid email address";
    people.forEach((person, index) => {
      if (!person.name.trim()) next[`people.${index}.name`] = `Passenger ${index + 1} name is required`;
      if (!person.gender) next[`people.${index}.gender`] = `Passenger ${index + 1} gender is required`;
      if (person.age === "" || Number(person.age) < 0 || Number(person.age) > 120)
        next[`people.${index}.age`] = `Passenger ${index + 1} age must be between 0 and 120`;
    });
    return next;
  };
  const advance = () => {
    setError("");
    setStepNotice("");
    let validation = {};
    if (step === 1) validation = validateStep1();
    if (step === 2 && !travel) validation.travel = "Select a transportation option";
    if (step === 3) {
      if (!room) validation.room = "Select an accommodation option";
      else if (availableRoomCapacity(roomItem) < accommodationCount)
        validation.room = `${roomItem?.name || "Selected accommodation"} does not have enough available capacity`;
    }
    setFieldErrors(validation);
    if (Object.keys(validation).length) {
      setError(`Please correct ${Object.keys(validation).length} field${Object.keys(validation).length === 1 ? "" : "s"} highlighted below.`);
      return;
    }
    const completed = ["Passenger details", "Transportation", "Accommodation"];
    setStepNotice(`${completed[step - 1]} saved. Continue to the next step.`);
    setStep(step + 1);
  };
  const submit = async () => {
    if (!paymentReceiver) {
      setFieldErrors({ paymentReceiver: "Select who you will pay to" });
      setError("Please correct the highlighted field below.");
      return;
    }
    if (!termsAccepted) {
      setFieldErrors({ terms: "Please accept the booking conditions before submitting" });
      setError("Please accept the booking conditions before submitting");
      return;
    }
    setFieldErrors({});
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
          <Summary label="Mandal" value={family.mandal} />
          <Summary label="Members" value={people.length} />
          <Summary
            label={adminEditId ? "Last saved" : "Submitted on"}
            value={formatDateTime(
              adminEditId
                ? submitted.updated_at || submitted.created_at
                : submitted.created_at,
            )}
            className="summarySaved"
          />
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
                <th>Child services</th>
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
                    {Number(person.age) >= 6 || person.requires_bus_seat
                      ? "Bus booked"
                      : "No bus"}
                    {Number(person.age) <= 5 && " • "}
                    {Number(person.age) >= 6 || person.requires_accommodation
                      ? "Accommodation booked"
                      : Number(person.age) <= 5
                        ? "No accommodation"
                        : "Accommodation booked"}
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
            <p>{busSeatCount} bus seat(s) booked</p>
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

        <div className="confirmationActions noPrint">
          <button className="primary" onClick={() => window.print()}>
            <Printer />
            Print / Save as PDF
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
        {error && <ErrorToast message={error} onClose={() => setError("")} />}
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
              <div className="familyMandalFields">
                <Field
                  label="Family / Group name"
                  value={family.family_name}
                  error={fieldErrors.family_name}
                  onChange={(v) => { setFamily({ ...family, family_name: v }); clearFieldError("family_name"); }}
                />
                <label>
                  Mandal
                  <select
                    value={family.mandal}
                    className={fieldErrors.mandal ? "fieldInvalid" : ""}
                    onChange={(event) => { setFamily({ ...family, mandal: event.target.value }); clearFieldError("mandal"); }}
                  >
                    <option value="">Select Mandal</option>
                    {MANDALS.map((mandal) => (
                      <option key={mandal} value={mandal}>
                        {mandal}
                      </option>
                    ))}
                  </select>
                  {fieldErrors.mandal && <small className="fieldError">{fieldErrors.mandal}</small>}
                </label>
              </div>
              <Field
                label="Contact person"
                value={family.contact_name}
                error={fieldErrors.contact_name}
                onChange={(v) => { setFamily({ ...family, contact_name: v }); clearFieldError("contact_name"); }}
              />
              <Field
                label="Mobile number"
                value={family.contact_phone}
                error={fieldErrors.contact_phone}
                onChange={(v) => { setFamily({ ...family, contact_phone: v }); clearFieldError("contact_phone"); }}
              />
              <Field
                label="Email (optional)"
                value={family.contact_email}
                error={fieldErrors.contact_email}
                onChange={(v) => { setFamily({ ...family, contact_email: v }); clearFieldError("contact_email"); }}
              />
            </div>
            {people.map((p, i) => (
              <div className="passengerEntry" key={i}>
                <div className="passenger">
                  <label className="passengerField">
                    <span>Passenger {i + 1} name</span>
                    <input
                      className={fieldErrors[`people.${i}.name`] ? "fieldInvalid" : ""}
                      placeholder={`Passenger ${i + 1} name`}
                      value={p.name}
                      onChange={(e) => { update(i, "name", e.target.value); clearFieldError(`people.${i}.name`); }}
                    />
                    {fieldErrors[`people.${i}.name`] && <small className="fieldError">{fieldErrors[`people.${i}.name`]}</small>}
                  </label>
                  <label className="passengerField">
                    <span>Gender</span>
                  <select
                    className={fieldErrors[`people.${i}.gender`] ? "fieldInvalid" : ""}
                    value={p.gender}
                    onChange={(e) => { update(i, "gender", e.target.value); clearFieldError(`people.${i}.gender`); }}
                  >
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                    <option value="OTHER">Other</option>
                  </select>
                  {fieldErrors[`people.${i}.gender`] && <small className="fieldError">{fieldErrors[`people.${i}.gender`]}</small>}
                  </label>
                  <label className="passengerField">
                    <span>Age</span>
                  <input
                    type="number"
                    className={fieldErrors[`people.${i}.age`] ? "fieldInvalid" : ""}
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
                                requires_bus_seat:
                                  Number(age) >= 6
                                    ? true
                                    : Number(item.age) >= 6
                                      ? false
                                      : item.requires_bus_seat,
                                requires_accommodation:
                                  Number(age) >= 6
                                    ? true
                                    : Number(item.age) >= 6
                                      ? false
                                      : item.requires_accommodation,
                              }
                            : item,
                        ),
                      );
                      clearFieldError(`people.${i}.age`);
                    }}
                  />
                  {fieldErrors[`people.${i}.age`] && <small className="fieldError">{fieldErrors[`people.${i}.age`]}</small>}
                  </label>
                </div>
                <div className="passengerPricing">
                  <span>
                    Food charge: {money(foodChargeForAge(tour, p.age))}
                  </span>
                  {p.age !== "" && Number(p.age) <= 5 && (
                    <div className="childServiceOptions">
                      <span>Child options (age 0–5):</span>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!p.requires_bus_seat}
                          onChange={(e) =>
                            update(i, "requires_bus_seat", e.target.checked)
                          }
                        />
                        Bus seat ({travelItem?.mode === "SELF" ? "no charge for self travel" : money(travelItem?.charge_amount || 0)})
                      </label>
                      <label>
                        <input
                          type="checkbox"
                          checked={!!p.requires_accommodation}
                          onChange={(e) =>
                            update(i, "requires_accommodation", e.target.checked)
                          }
                        />
                        Accommodation bed / room
                      </label>
                    </div>
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
                    requires_bus_seat: false,
                    requires_accommodation: false,
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
              sub={`Select one mode • ${busSeatCount} bus seat(s) for ${people.length} passenger(s)`}
              cost={money(quote.tv)}
            />
            {fieldErrors.travel && <div className="sectionFieldError">{fieldErrors.travel}</div>}
            <div className="options">
              {tour.travelOptions.map((x) => (
                <button
                  key={x.id}
                  className={Number(travel) === x.id ? "selected" : ""}
                  onClick={() => { setTravel(x.id); clearFieldError("travel"); }}
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
                      : money(x.charge_amount * busSeatCount)}
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
            {fieldErrors.room && <div className="sectionFieldError">{fieldErrors.room}</div>}
            <div className="rooms">
              {tour.roomTypes.map((x) => {
                const remaining = availableRoomCapacity(x);
                const available = remaining >= accommodationCount;
                return (
                  <button
                    key={x.id}
                    disabled={!available}
                    className={`${Number(room) === x.id ? "selected" : ""} ${!available ? "unavailable" : ""}`}
                    onClick={() => {
                      setError("");
                      clearFieldError("room");
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
                        Unavailable for {accommodationCount} booked bed(s) — no
                        beds/rooms remain
                      </small>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="automaticAllocation" role="status">
              <b>
                Automatically calculated: {accommodationCount} paid bed(s) for{" "}
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
              <Summary label="Mandal" value={family.mandal} />
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
                      ? ` — bus: ${person.requires_bus_seat ? "yes" : "no"} • accommodation: ${person.requires_accommodation ? "yes" : "no"}`
                      : " — bus: yes • accommodation: yes"}
                  </p>
                ))}
              </div>
              <div>
                <b>Travel selection</b>
                <p>
                  {travelItem?.name}
                  {travelItem?.mode === "BUS"
                    ? ` • ${busSeatCount} seats required`
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
              <label className={fieldErrors.paymentReceiver ? "hasFieldError" : ""}>
                <span>I will pay to</span>
                <select
                  className={fieldErrors.paymentReceiver ? "fieldInvalid" : ""}
                  value={paymentReceiver}
                  aria-invalid={!!fieldErrors.paymentReceiver}
                  onChange={(e) => { setPaymentReceiver(e.target.value); clearFieldError("paymentReceiver"); }}
                >
                  {PAYMENT_RECEIVERS.map((person) => (
                    <option key={person}>{person}</option>
                  ))}
                </select>
                {fieldErrors.paymentReceiver && <small className="fieldError">{fieldErrors.paymentReceiver}</small>}
              </label>
            </div>
            <BookingConditions />
            <label className={`termsAcceptance ${fieldErrors.terms ? "hasFieldError" : ""}`}>
              <input
                type="checkbox"
                className={fieldErrors.terms ? "fieldInvalid" : ""}
                checked={termsAccepted}
                onChange={(e) => {
                  setTermsAccepted(e.target.checked);
                  clearFieldError("terms");
                  if (e.target.checked) setError("");
                }}
              />
              <span>I have read and accept all booking conditions.</span>
              {fieldErrors.terms && <small className="fieldError">{fieldErrors.terms}</small>}
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
      {error && <ErrorToast message={error} onClose={() => setError("")} />}
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
function TourList({ token, selectedTourId, onSelect, onReports, onNewTour }) {
  const [tours, setTours] = useState([]),
    [loading, setLoading] = useState(true),
    [opening, setOpening] = useState(null),
    [error, setError] = useState("");
  useEffect(() => {
    setLoading(true);
    api("/api/admin/tours", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(setTours)
      .catch((requestError) => setError(requestError.message))
      .finally(() => setLoading(false));
  }, [token]);
  const open = async (id) => {
    setOpening(id);
    setError("");
    try {
      await onSelect(id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOpening(null);
    }
  };
  const openReports = async (id) => {
    setOpening(id);
    setError("");
    try {
      await onReports?.(id);
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setOpening(null);
    }
  };
  return (
    <>
      <Heading
        tag="Administrator"
        title="Tours"
        text="Select a tour to open and manage its complete setup."
        action={
          <button type="button" className="primary" onClick={onNewTour}>
            <Plus size={16} />
            Add new tour
          </button>
        }
      />
      {error && <ErrorToast message={error} onClose={() => setError("")} />}
      <div className="card table tourList">
        {loading ? (
          <p className="tourListMessage">Loading tours…</p>
        ) : !tours.length ? (
          <p className="tourListMessage">No tours are configured.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Tour</th>
                <th>Location</th>
                <th>Start date</th>
                <th>End date</th>
                <th>Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {tours.map((item) => (
                <tr
                  key={item.id}
                  className={selectedTourId === item.id ? "selectedTour" : ""}
                >
                  <td>
                    <b>{item.name}</b>
                  </td>
                  <td>{item.location}</td>
                  <td>{item.start_date}</td>
                  <td>{item.end_date}</td>
                  <td>
                    <span className={`tourStatus ${item.status.toLowerCase()}`}>
                      {item.status}
                    </span>
                  </td>
                  <td>
                    <button
                      type="button"
                      className="primary"
                      disabled={opening !== null}
                      onClick={() => open(item.id)}
                    >
                      {opening === item.id ? "Opening…" : "Open setup"}
                    </button>
                    <button
                      type="button"
                      className="secondary reportTourButton"
                      disabled={opening !== null}
                      onClick={() => openReports(item.id)}
                    >
                      <Download size={15} />
                      Reports
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
function NewTour({ token, onCancel, onCreated }) {
  const [form, setForm] = useState({
    name: "",
    location: "",
    start_date: "",
    end_date: "",
    food_charge_age_0_5: 0,
    food_charge_age_6_12: 300,
    food_charge_age_13_plus: 1000,
    estimated_misc_expense: 0,
    status: "DRAFT",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (!form.name.trim()) return setError("Tour name is required");
    if (!form.location.trim()) return setError("Location is required");
    if (!form.start_date || !form.end_date) return setError("Start and end dates are required");
    if (form.end_date < form.start_date) return setError("End date cannot be before start date");
    setSaving(true);
    try {
      const created = await api("/api/admin/tours", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      onCreated(created.id);
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };
  return (
    <>
      <Heading
        tag="Administrator"
        title="Add new tour"
        text="Create the tour first, then configure travel, rooms and the complete tour plan."
        action={<button type="button" className="secondary" onClick={onCancel}><ChevronLeft size={17} /> Tour list</button>}
      />
      {error && <ErrorToast message={error} onClose={() => setError("")} />}
      <form className="card editor newTourForm" onSubmit={submit}>
        <div className="grid2">
          <Field label="Tour name" value={form.name} onChange={(v) => update("name", v)} />
          <Field label="Location" value={form.location} onChange={(v) => update("location", v)} />
          <Field label="Start date" type="date" value={form.start_date} onChange={(v) => update("start_date", v)} />
          <Field label="End date" type="date" value={form.end_date} onChange={(v) => update("end_date", v)} />
          <Field label="Food charge — age 0–5 (₹)" type="number" value={form.food_charge_age_0_5} onChange={(v) => update("food_charge_age_0_5", Number(v || 0))} />
          <Field label="Food charge — age 6–12 (₹)" type="number" value={form.food_charge_age_6_12} onChange={(v) => update("food_charge_age_6_12", Number(v || 0))} />
          <Field label="Food charge — age 13+ (₹)" type="number" value={form.food_charge_age_13_plus} onChange={(v) => update("food_charge_age_13_plus", Number(v || 0))} />
          <Field label="Estimated misc. expense (₹)" type="number" value={form.estimated_misc_expense} onChange={(v) => update("estimated_misc_expense", Number(v || 0))} />
        </div>
        <div className="configActions newTourActions">
          <button type="button" className="secondary" onClick={onCancel}>Cancel</button>
          <button type="submit" className="primary" disabled={saving}>{saving ? "Creating…" : "Create tour & open setup"}</button>
        </div>
      </form>
    </>
  );
}
function Admin({ tour, token, refresh, onBack }) {
  const [setupSection, setSetupSection] = useState("tour"),
    [t, setT] = useState({ ...tour }),
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
          <div className="headingActions">
            <button type="button" className="secondary" onClick={onBack}>
              <ChevronLeft size={17} />
              Tour list
            </button>
            {setupSection === "tour" && (
              <button
                className="primary"
                disabled={!!saving}
                onClick={() => save(`/api/admin/tours/${tour.id}`, t, "Tour")}
              >
                {saving === `/api/admin/tours/${tour.id}`
                  ? "Saving tour…"
                  : "Save tour"}
              </button>
            )}
          </div>
        }
      />
      <div className="setupSubmenu" role="tablist" aria-label="Trip setup">
        {[
          { id: "tour", label: "Tour details", icon: <Settings2 /> },
          { id: "travel", label: "Travel options", icon: <Bus /> },
          { id: "rooms", label: "Room types", icon: <Hotel /> },
          { id: "plan", label: "Travel plan", icon: <CalendarDays /> },
        ].map((section) => (
          <button
            type="button"
            role="tab"
            aria-selected={setupSection === section.id}
            className={setupSection === section.id ? "active" : ""}
            key={section.id}
            onClick={() => {
              setSetupSection(section.id);
              setMessage("");
            }}
          >
            {section.icon}
            {section.label}
          </button>
        ))}
      </div>
      {message && (
        <div
          className={messageType === "error" ? "alert appError floatingError" : "notice"}
          role="status"
          aria-live="polite"
        >
          {messageType === "success" ? "✓ " : ""}
          {message}
        </div>
      )}
      <div className="adminGrid setupPageGrid">
        <div
          className={`card setupPage ${setupSection === "tour" ? "active" : ""}`}
        >
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
        <div
          className={`card editor setupPage ${setupSection === "travel" ? "active" : ""}`}
        >
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
        <div
          className={`card editor setupPage ${setupSection === "rooms" ? "active" : ""}`}
        >
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
        <div
          className={`card wide editor setupPage ${setupSection === "plan" ? "active" : ""}`}
        >
          <div className="sectionHeaderRow">
            <div>
              <h2>Travel plan</h2>
              <p className="sectionHint">Add and manage day-wise travel plan items for this tour.</p>
            </div>
            <button
              type="button"
              className="primary"
              disabled={!!saving}
              onClick={async () => {
                const nextDay = plan.reduce((max, item) => Math.max(max, Number(item.day_number) || 0), 0) + 1;
                const draft = {
                  tour_id: tour.id,
                  day_number: nextDay,
                  title: `Day ${nextDay}`,
                  location: "",
                  google_maps_url: "",
                  start_time: "09:00",
                  end_time: "",
                  notes: "",
                };
                setSaving("/api/admin/itinerary");
                try {
                  const created = await api("/api/admin/itinerary", {
                    method: "POST",
                    headers,
                    body: JSON.stringify(draft),
                  });
                  setPlan((current) => [...current, { ...draft, id: created.id, images: [] }]);
                  setMessageType("success");
                  setMessage(`Travel plan item for Day ${nextDay} added`);
                } catch (error) {
                  setMessageType("error");
                  setMessage(`Could not add travel plan item: ${error.message}`);
                } finally {
                  setSaving("");
                }
              }}
            >
              + Add travel plan
            </button>
          </div>
          {plan.length === 0 && (
            <div className="emptyState">No travel plan items yet. Click <b>Add travel plan</b> to create the first day.</div>
          )}
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
  const currentUnits = Number(room.inventory?.total_units || 0);
  const [targetQuantity, setTargetQuantity] = useState(currentUnits);
  const [prefix, setPrefix] = useState(
    String(room.name || "ROOM")
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(0, 8)
      .toUpperCase() || "ROOM",
  );
  const [floor, setFloor] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTargetQuantity(Number(room.inventory?.total_units || 0));
  }, [room.inventory?.total_units]);

  const save = async () => {
    const quantity = Number(targetQuantity);
    if (!Number.isInteger(quantity) || quantity < 0 || quantity > 200)
      return onSaved(
        `Enter a total inventory quantity between 0 and 200 for ${room.name}.`,
        "error",
      );

    if (quantity === 0 && currentUnits > 0) {
      const confirmed = window.confirm(
        `Remove all unused ${room.name} inventory? Allocated units will be kept and the remaining unused units will be removed.`,
      );
      if (!confirmed) return;
    }

    if (quantity > currentUnits && !prefix.trim())
      return onSaved(`Enter a room prefix for ${room.name}.`, "error");

    setSaving(true);
    try {
      const result = await api("/api/admin/room-inventory/bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room_type_id: room.id,
          target_quantity: quantity,
          prefix: prefix.trim(),
          floor_number: floor,
          standard_capacity: room.capacity,
          extra_bed_capacity: room.max_extra_beds,
        }),
      });
      onSaved(result.message);
      await onAdded?.();
    } catch (error) {
      onSaved(`Could not update ${room.name} inventory: ${error.message}`, "error");
      setTargetQuantity(currentUnits);
    } finally {
      setSaving(false);
    }
  };

  const delta = Number(targetQuantity) - currentUnits;

  return (
    <div className="roomInventoryInline">
      <h3>Inventory for {room.name}</h3>
      <div
        className={`inventoryStatus ${currentUnits === 0 ? "empty" : ""}`}
      >
        <span>
          Current: {currentUnits} room(s)/unit(s) •{" "}
          {room.inventory?.remaining_capacity || 0} bed(s) remaining
        </span>
        {currentUnits === 0 && (
          <small>
            Registration cannot use this room type until inventory is added.
          </small>
        )}
      </div>
      <div className="inlineInventoryBuilder">
        <ConfigField label="Beds per room">
          <input value={room.capacity || ""} disabled />
        </ConfigField>
        <ConfigField label="Total units">
          <input
            type="number"
            min="0"
            max="200"
            value={targetQuantity}
            onChange={(e) => setTargetQuantity(Number(e.target.value))}
          />
        </ConfigField>
        {delta > 0 && (
          <>
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
          </>
        )}
        <button disabled={saving} onClick={save}>
          {saving ? "Updating…" : delta > 0 ? "Add inventory" : delta < 0 ? "Reduce inventory" : "Save inventory"}
        </button>
      </div>
      <small className="sharedHint">
        Set the final number of units. When reducing, the system removes only
        unused units; allocated rooms/beds are never deleted.
      </small>
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
    [mandalFilter, setMandalFilter] = useState(""),
    [receiverFilter, setReceiverFilter] = useState(""),
    [rows, setRows] = useState([]),
    [inventory, setInventory] = useState({ rooms: [], buses: [] }),
    [error, setError] = useState("");
  const reportQuery = useMemo(() => {
    const params = new URLSearchParams({ type });
    if (busFilter) params.set("bus_id", busFilter);
    if (roomFilter) params.set("room_type_id", roomFilter);
    if (mandalFilter) params.set("mandal", mandalFilter);
    if (receiverFilter) params.set("payment_receiver", receiverFilter);
    return params.toString();
  }, [busFilter, mandalFilter, receiverFilter, roomFilter, type]);
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
      {error && <ErrorToast message={error} onClose={() => setError("")} />}
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
        <ConfigField label="Mandal">
          <select
            value={mandalFilter}
            onChange={(event) => setMandalFilter(event.target.value)}
          >
            <option value="">All Mandals</option>
            {MANDALS.map((mandal) => (
              <option key={mandal} value={mandal}>
                {mandal}
              </option>
            ))}
          </select>
        </ConfigField>
        <button
          type="button"
          onClick={() => {
            setBusFilter("");
            setRoomFilter("");
            setMandalFilter("");
            setReceiverFilter("");
          }}
        >
          Clear filters
        </button>
      </div>
      <div className="card table reportTableWrap">
        <table className="reportTable">
          <thead>
            <tr>
              {[
                "Family",
                "Mandal",
                "Members",
                "Bus seats",
                "Accommodation",
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
              <th>Amount received</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((x) => (
              <tr key={x.id}>
                <td data-label="Family">
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
                <td data-label="Mandal">{x.mandal}</td>
                <td data-label="Members">{x.member_count}</td>
                <td data-label="Bus seats">{x.bus_seat_count ?? "—"}</td>
                <td data-label="Accommodation">{x.accommodation_count ?? "—"}</td>
                <td data-label="Travel mode">{x.travel_mode}</td>
                <td data-label="Assigned bus">{x.assigned_bus || "Self"}</td>
                <td data-label="Room type">{x.room_type}</td>
                <td data-label="Assigned room / floor" className="blank">{x.assigned_rooms}</td>
                <td data-label="Food">{money(x.food_amount)}</td>
                <td data-label="Travel ₹">{money(x.travel_amount)}</td>
                <td data-label="Stay">{money(x.accommodation_amount)}</td>
                <td data-label="Total">
                  <b>{money(x.total_amount)}</b>
                </td>
                <td data-label="I will pay to">{x.payment_receiver || "—"}</td>
                <td data-label="Amount received" className="receivedCell">
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
                <td data-label="Comments" className="commentCell">
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
function Field({ label, value, onChange, type = "text", error }) {
  return (
    <label className={error ? "hasFieldError" : ""}>
      <span>{label}</span>
      <input
        className={error ? "fieldInvalid" : ""}
        type={type}
        value={value ?? ""}
        aria-invalid={!!error}
        onChange={(e) => onChange(e.target.value)}
      />
      {error && <small className="fieldError">{error}</small>}
    </label>
  );
}
function ErrorToast({ message, onClose, onRetry }) {
  if (!message) return null;
  return (
    <div className="alert appError floatingError" role="alert" aria-live="assertive">
      <span>{message}</span>
      <div className="errorActions">
        {onRetry && <button type="button" onClick={onRetry}>Retry</button>}
        {onClose && <button type="button" className="errorClose" onClick={onClose} aria-label="Dismiss error">×</button>}
      </div>
    </div>
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
function Summary({ label, value, className = "" }) {
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
