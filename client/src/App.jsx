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
        {isAdminPage && <div className="admin">Administrator</div>}
      </header>
      <main className={isAdminPage ? "" : "publicMain"}>
        {isAdminPage && (
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
              onClick={() => setTab("reports")}
            >
              <Download />
              Reports
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
    [submitted, setSubmitted] = useState(null),
    [showPlan, setShowPlan] = useState(false),
    [busy, setBusy] = useState(false),
    [stepNotice, setStepNotice] = useState(""),
    [error, setError] = useState("");
  const travelItem = tour.travelOptions.find((x) => x.id === Number(travel)),
    roomItem = tour.roomTypes.find((x) => x.id === Number(room));
  const { units, extra } = useMemo(
    () => calculateAccommodation(roomItem, people.length),
    [roomItem, people.length],
  );
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
    const completed = ["Passenger details", "Transportation", "Accommodation"];
    setStepNotice(`${completed[step - 1]} saved. Continue to the next step.`);
    setStep(step + 1);
  };
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
        action={
          <button className="secondary" onClick={() => setShowPlan(true)}>
            <CalendarDays />
            View tour plan
          </button>
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
                  onClick={() => setRoom(x.id)}
                >
                  <span>{x.is_ac ? "AC" : "○"}</span>
                  <b>{x.name}</b>
                  <small>
                    {money(x.charge_amount)} • {x.capacity} people/unit •{" "}
                    {x.inventory?.available_units || 0} units available (
                    {x.inventory?.remaining_capacity || 0} people)
                  </small>
                  {x.charge_type === "PER_BED" && (
                    <small>Shared room • charged only for selected beds</small>
                  )}
                  {x.extra_bed_allowed === 1 && (
                    <small>
                      Up to {x.max_extra_beds} additional bed(s) per room at{" "}
                      {money(x.extra_bed_charge)} each
                    </small>
                  )}
                  {x.description && <small>{x.description}</small>}
                </button>
              ))}
            </div>
            <div className="automaticAllocation" role="status">
              <b>Automatically calculated for {people.length} passenger(s)</b>
              <span>
                {roomItem?.charge_type === "PER_BED"
                  ? `${units} bed(s)`
                  : `${units} room(s)${extra ? ` + ${extra} additional bed(s)` : ""}`}
              </span>
              <strong>{money(quote.stay)}</strong>
            </div>
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
                  </p>
                ))}
              </div>
              <div>
                <b>Travel selection</b>
                <p>
                  {travelItem?.name}
                  {travelItem?.mode === "BUS"
                    ? ` • ${people.length} seats required`
                    : ""}
                </p>
              </div>
              <div>
                <b>Accommodation selection</b>
                <p>
                  {roomItem?.name} × {units}
                  {extra ? ` • ${extra} free floor bed(s)` : ""}
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
  const childSaved = (value) => {
    setMessageType("success");
    setMessage(value);
  };
  const notify = (value, type = "success") => {
    setMessageType(type);
    setMessage(value);
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
            </div>
          ))}
          <BusInventoryManager
            travelOptions={travels}
            token={token}
            onSaved={childSaved}
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
              <button
                className="saveConfig"
                disabled={!!saving}
                onClick={() => save(`/api/admin/room-types/${x.id}`, x, x.name)}
              >
                {saving === `/api/admin/room-types/${x.id}`
                  ? "Saving…"
                  : "Save"}
              </button>
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
          <InventoryBuilder
            roomTypes={rooms}
            token={token}
            onSaved={notify}
            onAdded={refresh}
          />
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
            <button onClick={() => update(bus)}>Save bus</button>
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
function InventoryBuilder({ roomTypes, token, onSaved, onAdded }) {
  const [roomTypeId, setRoomTypeId] = useState(roomTypes[0]?.id || "");
  const [quantity, setQuantity] = useState(1);
  const [prefix, setPrefix] = useState("ROOM");
  const [floor, setFloor] = useState("");
  const [adding, setAdding] = useState(false);
  const selectedRoom = roomTypes.find((x) => x.id === Number(roomTypeId));
  const add = async () => {
    if (!selectedRoom || quantity < 1 || !prefix.trim())
      return onSaved(
        "Select a room type and enter a valid quantity and room prefix.",
        "error",
      );
    setAdding(true);
    try {
      const result = await api("/api/admin/room-inventory/bulk", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          room_type_id: Number(roomTypeId),
          quantity,
          prefix: prefix.trim(),
          floor_number: floor,
          standard_capacity: selectedRoom.capacity,
          extra_bed_capacity: selectedRoom.max_extra_beds,
        }),
      });
      onSaved(
        `${result.created} ${selectedRoom.name} room(s) added with ${selectedRoom.capacity} bed(s) each.`,
      );
      await onAdded?.();
    } catch (error) {
      onSaved(`Could not add room inventory: ${error.message}`, "error");
    } finally {
      setAdding(false);
    }
  };
  return (
    <div className="inventorySection">
      <h3>Add room inventory</h3>
      <div className="inventoryBuilder">
        <ConfigField label="Room type">
          <select
            value={roomTypeId}
            onChange={(e) => setRoomTypeId(e.target.value)}
          >
            {roomTypes.map((x) => (
              <option value={x.id} key={x.id}>
                {x.name}
              </option>
            ))}
          </select>
        </ConfigField>
        <ConfigField label="Beds per room">
          <input value={selectedRoom?.capacity || ""} disabled />
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
      {selectedRoom?.charge_type === "PER_BED" && (
        <small className="sharedHint">
          Shared allocation is enabled: beds remain available until the room's
          full capacity is allocated, including across different families.
        </small>
      )}
    </div>
  );
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
      .then(([report, stock]) => {
        setRows(report);
        setInventory(stock);
      })
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
          value={rows.reduce((s, x) => s + x.member_count, 0)}
        />
        <Stat
          label="Collection"
          value={money(rows.reduce((s, x) => s + Number(x.total_amount), 0))}
        />
      </div>
      <div className="inventoryGrid">
        <div className="card table">
          <h2>Room inventory remaining</h2>
          <table>
            <thead>
              <tr>
                <th>Type</th>
                <th>Total units</th>
                <th>Available</th>
                <th>People capacity left</th>
              </tr>
            </thead>
            <tbody>
              {inventory.rooms.map((x) => (
                <tr key={x.room_type_id}>
                  <td>{x.name}</td>
                  <td>{x.total_units}</td>
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
