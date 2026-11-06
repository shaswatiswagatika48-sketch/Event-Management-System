import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./CreateEvent.css";

const initialForm = {
  title: "",
  description: "",
  date: "",
  time: "",
  location: "",
  totalSeats: "",
  ticketPrice: "",
};

export default function CreateEvent() {
  const navigate = useNavigate();
  const [form, setForm] = useState(initialForm);
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurantAvailability, setRestaurantAvailability] = useState(null);
  const [reservationTime, setReservationTime] = useState("");
  const [reservationEndTime, setReservationEndTime] = useState("");
  const [reservationScope, setReservationScope] = useState("restaurant");
  const [reservationSection, setReservationSection] = useState("");
  const [tables, setTables] = useState([]);
  const [selectedTableIds, setSelectedTableIds] = useState([]);
  const [foodMenu, setFoodMenu] = useState([]);
  const [beverageMenu, setBeverageMenu] = useState([]);
  const [foodQuantities, setFoodQuantities] = useState({});
  const [beverageQuantities, setBeverageQuantities] = useState({});
  const [restaurantDataLoading, setRestaurantDataLoading] = useState(false);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityError, setAvailabilityError] = useState("");
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant._id === restaurantId
  );
  const restaurantTimeSlots = restaurantAvailability?.timeSlots || [];
  const restaurantSections = [
    ...new Set(tables.map((table) => table.section || "Main Dining Area"))
  ];
  const scopeTables =
    reservationScope === "section" && reservationSection
      ? tables.filter(
          (table) =>
            (table.section || "Main Dining Area") === reservationSection
        )
      : tables;
  const getRangeSlots = (startTime, endTime) => {
    if (!startTime || !endTime) return [];
    return restaurantTimeSlots.filter(
      (slot) => slot.time >= startTime && slot.time < endTime
    );
  };
  const isSlotAvailable = (slot) =>
    reservationScope === "restaurant"
      ? slot.wholeRestaurantAvailable
      : Boolean(
          reservationSection &&
            slot.availableSections.includes(reservationSection)
        );
  const isRangeAvailable = (startTime, endTime) => {
    const startHour = Number(startTime?.slice(0, 2));
    const endHour = Number(endTime?.slice(0, 2));
    const rangeSlots = getRangeSlots(startTime, endTime);
    return (
      Number.isInteger(startHour) &&
      Number.isInteger(endHour) &&
      endHour > startHour &&
      rangeSlots.length === endHour - startHour &&
      rangeSlots.every(isSlotAvailable)
    );
  };
  const selectedTables = tables.filter((table) =>
    selectedTableIds.includes(table._id)
  );
  const restaurantSeatCapacity = selectedTables.reduce(
    (capacity, table) => capacity + Number(table.capacity || 0),
    0
  );
  const selectedTableTotal = selectedTables.reduce(
    (total, table) => total + Number(table.price || 0),
    0
  );
  const selectedFoodTotal = foodMenu.reduce(
    (total, item) => total + Number(item.price || 0) * (foodQuantities[item._id] || 0),
    0
  );
  const selectedBeverageTotal = beverageMenu.reduce(
    (total, item) =>
      total + Number(item.price || 0) * (beverageQuantities[item._id] || 0),
    0
  );
  const reservationAvailable = isRangeAvailable(
    reservationTime,
    reservationEndTime
  );
  const reservationEndOptions = [
    ...restaurantTimeSlots.map((slot) => slot.time),
    restaurantAvailability?.closingTime
  ].filter(
    (time) =>
      time &&
      reservationTime &&
      time > reservationTime &&
      (Number(time.slice(0, 2)) - Number(reservationTime.slice(0, 2)) > 0)
  );
  const reservationRequiredAndInvalid =
    Boolean(restaurantId) &&
    (!reservationTime ||
      !reservationEndTime ||
      (reservationScope === "section" && !reservationSection) ||
      !selectedTableIds.length ||
      !reservationAvailable ||
      (restaurantSeatCapacity > 0 &&
        Number(form.totalSeats) > restaurantSeatCapacity));

  useEffect(() => {
    if (!restaurantId) {
      setTables([]);
      setFoodMenu([]);
      setBeverageMenu([]);
      setSelectedTableIds([]);
      setFoodQuantities({});
      setBeverageQuantities({});
      setRestaurantDataLoading(false);
      return;
    }

    let active = true;
    const fetchRestaurantOptions = async () => {
      setRestaurantDataLoading(true);
      setAvailabilityError("");
      try {
        const [tableResponse, foodResponse, beverageResponse] = await Promise.all([
          api.get(`/tables/restaurant/${restaurantId}`),
          api.get(`/food/restaurant/${restaurantId}`),
          api.get(`/beverages/restaurant/${restaurantId}`),
        ]);
        if (!active) return;
        const availableTables = (tableResponse.data.tables || []).filter(
          (table) => table.active !== false
        );
        setTables(availableTables);
        setSelectedTableIds([]);
        setFoodMenu(foodResponse.data.food || []);
        setBeverageMenu(beverageResponse.data.beverages || []);
        setFoodQuantities({});
        setBeverageQuantities({});
      } catch (requestError) {
        if (active) {
          setAvailabilityError(
            requestError.response?.data?.message ||
              "Could not load this restaurant's tables and menu."
          );
        }
      } finally {
        if (active) setRestaurantDataLoading(false);
      }
    };

    fetchRestaurantOptions();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  useEffect(() => {
    let active = true;
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get("/restaurants");
        if (active) setRestaurants(data.restaurants || []);
      } catch (requestError) {
        if (active) {
          setAvailabilityError(
            requestError.response?.data?.message ||
              "Could not load restaurants. Please try again."
          );
        }
      }
    };

    fetchRestaurants();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId || !form.date) {
      setRestaurantAvailability(null);
      setAvailabilityError("");
      setAvailabilityLoading(false);
      return;
    }

    let active = true;
    const fetchAvailability = async () => {
      setAvailabilityLoading(true);
      setAvailabilityError("");
      setRestaurantAvailability(null);
      try {
        const { data } = await api.get(
          `/tables/restaurant/${restaurantId}/availability`,
          { params: { eventDate: form.date } }
        );
        if (active) setRestaurantAvailability(data);
      } catch (requestError) {
        if (active) {
          setAvailabilityError(
            (requestError.response?.status === 404
              ? "Restaurant availability needs the latest backend. Restart the backend server, then reload this page."
              : requestError.response?.data?.message) ||
              "Could not load restaurant time slots."
          );
        }
      } finally {
        if (active) setAvailabilityLoading(false);
      }
    };

    fetchAvailability();
    return () => {
      active = false;
    };
  }, [restaurantId, form.date]);

  const handleChange = (event) => {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    setError("");
    if (event.target.name === "date") {
      setReservationTime("");
      setReservationEndTime("");
    }
  };

  const chooseTableCount = (value, availableTables = scopeTables) => {
    const count = Math.max(
      0,
      Math.min(availableTables.length, Number(value) || 0)
    );
    const next = availableTables.slice(0, count).map((table) => table._id);
    setSelectedTableIds(next);
    setForm((current) => ({
      ...current,
      totalSeats: String(
        availableTables
          .slice(0, count)
          .reduce((capacity, table) => capacity + Number(table.capacity || 0), 0)
      ),
    }));
    setError("");
  };

  const updateQuantity = (setQuantities, itemId, change) => {
    setError("");
    setQuantities((current) => {
      const quantity = Math.min(50, Math.max(0, (current[itemId] || 0) + change));
      const next = { ...current };
      if (quantity === 0) delete next[itemId];
      else next[itemId] = quantity;
      return next;
    });
  };

  const sendOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/otp/send", { purpose: "event_creation" });
      setOtpSent(true);
      setMessage("A verification code was sent to your account email.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not send verification code."
      );
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async () => {
    setLoading(true);
    setError("");
    setMessage("");
    try {
      await api.post("/otp/verify", { otp, purpose: "event_creation" });
      setVerified(true);
      setMessage("Email verified. You can create your event.");
    } catch (requestError) {
      setError(requestError.response?.data?.message || "OTP verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (event) => {
    event.preventDefault();
    if (!event.currentTarget.checkValidity()) {
      setError("Complete all required event details before creating the event.");
      event.currentTarget.reportValidity();
      return;
    }
    if (!verified) {
      setError("Verify your email before creating an event.");
      return;
    }
    if (reservationRequiredAndInvalid) {
      const missingSelections = [];
      if (!reservationTime) missingSelections.push("an available time slot");
      if (reservationTime && !reservationEndTime) {
        missingSelections.push("an end time");
      }
      if (reservationScope === "section" && !reservationSection) {
        missingSelections.push("a restaurant section");
      }
      if (!selectedTableIds.length) missingSelections.push("at least one table");
      if (
        selectedTableIds.length &&
        Number(form.totalSeats) > restaurantSeatCapacity
      ) {
        missingSelections.push("enough tables for the event seat capacity");
      }
      if (reservationTime && reservationEndTime && !reservationAvailable) {
        missingSelections.push("a complete time range that is still available");
      }
      setError(
        `To create this restaurant event, choose ${missingSelections.join(" and ")}.`
      );
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.post("/events", {
        ...form,
        totalSeats: Number(form.totalSeats),
        ticketPrice: Number(form.ticketPrice),
        restaurantId: restaurantId || undefined,
        reservationTime: restaurantId ? reservationTime : undefined,
        reservationEndTime: restaurantId ? reservationEndTime : undefined,
        reservationScope: restaurantId ? reservationScope : undefined,
        reservationSection:
          restaurantId && reservationScope === "section"
            ? reservationSection
            : undefined,
        tableIds: restaurantId ? selectedTableIds : undefined,
        foodItems: Object.entries(foodQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({ itemId, quantity })),
        beverageItems: Object.entries(beverageQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({ itemId, quantity })),
      });
      navigate("/events", {
        replace: true,
        state: {
          message: data.message,
          emailSent: data.emailSent,
        },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not create event."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="create-event-page">
      <section className="create-event-card">
        <header>
          <span>EVENTHUB ORGANIZER</span>
          <h1>Create an Event</h1>
          <p>Share the event details and set its ticket price.</p>
        </header>

        <form onSubmit={createEvent} noValidate>
          <div className="create-event-fields">
            <label>
              Event name
              <input
                name="title"
                value={form.title}
                onChange={handleChange}
                required
              />
              {selectedTables.length > 0 && (
                <small>
                  Selected:{" "}
                  {selectedTables
                    .map((table) => table.tableNumber)
                    .join(", ")}
                </small>
              )}
            </label>

            <label>
              Description
              <textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={3}
                required
              />
            </label>

            <div className="create-event-row">
              <label>
                Date
                <input
                  type="date"
                  name="date"
                  value={form.date}
                  onChange={handleChange}
                  required
                />
              </label>
              <label>
                Time
                <input
                  name="time"
                  value={form.time}
                  onChange={handleChange}
                  placeholder="e.g. 10:00 AM"
                  required
                />
              </label>
            </div>

            <label>
              Location
              <input
                name="location"
                value={form.location}
                onChange={handleChange}
                required
              />
            </label>

            <div className="create-event-row">
              <label>
                {restaurantId
                  ? "Event attendee capacity (from selected tables)"
                  : "Event attendee capacity (seats)"}
                <input
                  type="number"
                  name="totalSeats"
                  min="1"
                  step="1"
                  value={form.totalSeats}
                  onChange={handleChange}
                  readOnly={Boolean(restaurantId)}
                  required
                />
              </label>
              <label>
                Ticket price (INR)
                <input
                  type="number"
                  name="ticketPrice"
                  min="0"
                  step="1"
                  value={form.ticketPrice}
                  onChange={handleChange}
                  required
                />
              </label>
            </div>

            <section className="create-event-payment-terms" aria-label="Payment terms">
              <h2>Payment terms</h2>
              <p>
                Per ticket: pay 50% before the event and the remaining 50% after the event.
              </p>
              <div className="create-event-payment-split">
                <p>
                  <strong>50% before the event</strong>
                  <span>
                    ₹{(Number(form.ticketPrice || 0) / 2).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
                <p>
                  <strong>50% after the event</strong>
                  <span>
                    ₹{(Number(form.ticketPrice || 0) / 2).toLocaleString("en-IN", {
                      maximumFractionDigits: 2,
                    })}
                  </span>
                </p>
              </div>
            </section>

            <section className="create-event-restaurant">
              <h2>Restaurant reservation (optional)</h2>
              <p>
                Choose the full start and end time for your event, then select
                tables and menu items. The whole restaurant will be unavailable
                to other events for the complete time range.
              </p>
              <label>
                Restaurant
                <select
                  value={restaurantId}
                  onChange={(event) => {
                    setRestaurantId(event.target.value);
                    setReservationTime("");
                    setReservationEndTime("");
                    setReservationScope("restaurant");
                    setReservationSection("");
                    setRestaurantAvailability(null);
                    setAvailabilityError("");
                  }}
                  disabled={loading}
                >
                  <option value="">No restaurant reservation</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant._id} value={restaurant._id}>
                      {restaurant.name} — {restaurant.address}
                    </option>
                  ))}
                </select>
              </label>

              {restaurantId && (
                <>
                  <label>
                    Reservation area
                    <select
                      value={reservationScope}
                      onChange={(event) => {
                        setReservationScope(event.target.value);
                        setReservationSection("");
                        setSelectedTableIds([]);
                        setForm((current) => ({ ...current, totalSeats: "" }));
                        setError("");
                      }}
                      disabled={loading}
                    >
                      <option value="restaurant">Whole restaurant</option>
                      <option value="section">One section only</option>
                    </select>
                  </label>
                  {reservationScope === "section" && (
                    <label>
                      Restaurant section
                      <select
                        value={reservationSection}
                        onChange={(event) => {
                          setReservationSection(event.target.value);
                          setSelectedTableIds([]);
                          setForm((current) => ({
                            ...current,
                            totalSeats: ""
                          }));
                          setError("");
                        }}
                        disabled={loading || restaurantDataLoading}
                      >
                        <option value="">Choose a section</option>
                        {restaurantSections.map((section) => (
                          <option key={section} value={section}>
                            {section}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {selectedRestaurant && (
                    <p className="create-event-party-description">
                      <strong>
                        {selectedRestaurant.partyAvailability === "available"
                          ? "Parties available"
                          : selectedRestaurant.partyAvailability === "unavailable"
                            ? "Parties unavailable"
                            : "Party availability"}
                        :
                      </strong>{" "}
                      {selectedRestaurant.partyDescription ||
                        "Please contact the restaurant to confirm party availability."}
                    </p>
                  )}
                  {!form.date ? (
                    <p>
                      Select the event date above to load time availability.
                      You can choose tables and menu items below meanwhile.
                    </p>
                  ) : availabilityError ? (
                    <p className="create-event-error" role="alert">
                      {availabilityError}
                    </p>
                  ) : (
                    <>
                      <p>
                        {availabilityLoading
                          ? "Checking availability..."
                          : restaurantAvailability
                            ? `Event date: ${new Date(`${form.date}T00:00:00`).toLocaleDateString("en-IN")} · Open ${restaurantAvailability.openingTime}–${restaurantAvailability.closingTime}.`
                            : ""}
                      </p>
                      <div className="create-event-slot-picker create-event-row">
                        <label>
                          Start time
                          <select
                            value={reservationTime}
                            onChange={(event) => {
                              const startTime = event.target.value;
                              const startIndex = restaurantTimeSlots.findIndex(
                                (slot) => slot.time === startTime
                              );
                              const nextEndTime =
                                restaurantTimeSlots[startIndex + 1]?.time ||
                                restaurantAvailability?.closingTime ||
                                "";
                              setReservationTime(startTime);
                              setReservationEndTime(nextEndTime);
                              setError("");
                            }}
                            disabled={
                              availabilityLoading ||
                              loading ||
                              selectedRestaurant?.partyAvailability === "unavailable"
                            }
                          >
                            <option value="">Choose start time</option>
                            {restaurantTimeSlots.map((slot) => (
                              <option
                                key={slot.time}
                                value={slot.time}
                                disabled={!isSlotAvailable(slot)}
                              >
                                {slot.time} —{" "}
                                {isSlotAvailable(slot)
                                  ? "Available"
                                  : "Unavailable"}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label>
                          End time
                          <select
                            value={reservationEndTime}
                            onChange={(event) => {
                              setReservationEndTime(event.target.value);
                              setError("");
                            }}
                            disabled={
                              !reservationTime ||
                              availabilityLoading ||
                              loading ||
                              selectedRestaurant?.partyAvailability === "unavailable"
                            }
                          >
                            <option value="">Choose end time</option>
                            {reservationEndOptions.map((time) => (
                              <option
                                key={time}
                                value={time}
                                disabled={!isRangeAvailable(reservationTime, time)}
                              >
                                {time} —{" "}
                                {isRangeAvailable(reservationTime, time)
                                  ? "Available"
                                  : "Unavailable"}
                              </option>
                            ))}
                          </select>
                        </label>
                        {reservationTime && reservationEndTime && (
                          <p
                            className={
                              reservationAvailable
                                ? "create-event-range-availability available"
                                : "create-event-range-availability unavailable"
                            }
                            role="status"
                          >
                            {reservationTime}–{reservationEndTime}:{" "}
                            {reservationAvailable
                              ? "Available for the whole event"
                              : "Unavailable for this full time range"}
                          </p>
                        )}
                      </div>
                      {(reservationScope === "restaurant" || reservationSection) && (
                        <div
                          className="create-event-slot-status"
                          aria-label={
                            reservationScope === "restaurant"
                              ? "Whole restaurant slot availability"
                              : `${reservationSection} slot availability`
                          }
                        >
                          <h3>
                            Availability —{" "}
                            {reservationScope === "restaurant"
                              ? "Whole restaurant"
                              : reservationSection}
                          </h3>
                          <div className="create-event-slot-status-grid">
                            {restaurantTimeSlots.map((slot) => {
                              const available = isSlotAvailable(slot);
                              const endHour = Number(slot.time.slice(0, 2)) + 1;
                              return (
                                <div
                                  key={slot.time}
                                  className={`create-event-slot-status-item ${available ? "available" : "unavailable"}`}
                                >
                                  <span>
                                    {slot.time}–{String(endHour).padStart(2, "0")}:00
                                  </span>
                                  <strong>{available ? "Available" : "Unavailable"}</strong>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <>
                          {reservationTime && reservationEndTime && reservationAvailable && (
                            <div className="create-event-capacity" role="status">
                            <strong>
                              Choose tables for {reservationTime}–{reservationEndTime}
                            </strong>
                            <span>
                              {selectedTableIds.length} selected · {restaurantSeatCapacity} table seats.
                              {selectedTableIds.length > 0
                                ? ` Table reservation total: ₹${selectedTableTotal.toLocaleString("en-IN")}.`
                                : ""}
                              This reservation makes{" "}
                              {reservationScope === "restaurant"
                                ? "the whole restaurant"
                                : reservationSection}
                              {" "}unavailable to other events during this time range.
                            </span>
                            {Number(form.totalSeats) > restaurantSeatCapacity && (
                              <span className="create-event-capacity-error">
                                Event attendee capacity cannot exceed selected table seats.
                              </span>
                            )}
                            </div>
                          )}
                          {restaurantDataLoading ? (
                            <p>Loading restaurant tables and menu...</p>
                          ) : scopeTables.length === 0 ? (
                            <p role="alert">
                              {reservationScope === "section" && reservationSection
                                ? "No tables are configured for this section."
                                : reservationScope === "section"
                                  ? "Choose a section to see its tables."
                                  : "No tables are configured for this restaurant yet."}
                            </p>
                          ) : (
                            <label className="create-event-table-count">
                              Number of tables to reserve (1–{scopeTables.length})
                              <input
                                type="number"
                                min="1"
                                max={scopeTables.length}
                                step="1"
                                value={selectedTableIds.length || ""}
                                onChange={(event) =>
                                  chooseTableCount(event.target.value, scopeTables)
                                }
                                disabled={loading || restaurantDataLoading}
                              />
                            </label>
                          )}

                        <div className="create-event-menu-options">
                          <div>
                            <h3>Food (optional)</h3>
                            {foodMenu.length === 0 ? (
                              <p>No food items are configured for this restaurant.</p>
                            ) : foodMenu.map((item) => (
                              <div className="create-event-menu-item" key={item._id}>
                                <span>
                                  <strong>{item.name}</strong>
                                  <small>₹{Number(item.price).toLocaleString("en-IN")}</small>
                                </span>
                                <div className="create-event-quantity">
                                  <button type="button" onClick={() => updateQuantity(setFoodQuantities, item._id, -1)} disabled={!foodQuantities[item._id] || loading}>−</button>
                                  <span>{foodQuantities[item._id] || 0}</span>
                                  <button type="button" onClick={() => updateQuantity(setFoodQuantities, item._id, 1)} disabled={loading}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                          <div>
                            <h3>Beverages (optional)</h3>
                            {beverageMenu.length === 0 ? (
                              <p>No beverages are configured for this restaurant.</p>
                            ) : beverageMenu.map((item) => (
                              <div className="create-event-menu-item" key={item._id}>
                                <span>
                                  <strong>{item.name}</strong>
                                  <small>₹{Number(item.price).toLocaleString("en-IN")}</small>
                                </span>
                                <div className="create-event-quantity">
                                  <button type="button" onClick={() => updateQuantity(setBeverageQuantities, item._id, -1)} disabled={!beverageQuantities[item._id] || loading}>−</button>
                                  <span>{beverageQuantities[item._id] || 0}</span>
                                  <button type="button" onClick={() => updateQuantity(setBeverageQuantities, item._id, 1)} disabled={loading}>+</button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <p className="create-event-menu-total">
                          Selected food and beverage total:{" "}
                          <strong>
                            ₹{(selectedFoodTotal + selectedBeverageTotal).toLocaleString("en-IN")}
                          </strong>
                        </p>
                      </>
                      {!availabilityLoading &&
                        restaurantAvailability?.sections?.length === 0 && (
                          <p role="alert">
                            This restaurant has no active sections configured
                            for reservations.
                          </p>
                        )}
                    </>
                  )}

                  {!form.date && (
                    <>
                      {restaurantDataLoading ? (
                        <p>Loading restaurant tables and menu...</p>
                      ) : scopeTables.length === 0 ? (
                        <p role="alert">
                          {reservationScope === "section" && reservationSection
                            ? "No tables are configured for this section."
                            : reservationScope === "section"
                              ? "Choose a section to see its tables."
                              : "No tables are configured for this restaurant yet."}
                        </p>
                      ) : (
                        <label className="create-event-table-count">
                          Number of tables to reserve (1–{scopeTables.length})
                          <input
                            type="number"
                            min="1"
                            max={scopeTables.length}
                            step="1"
                            value={selectedTableIds.length || ""}
                            onChange={(event) =>
                              chooseTableCount(event.target.value, scopeTables)
                            }
                            disabled={loading || restaurantDataLoading}
                          />
                          {selectedTables.length > 0 && (
                            <small>
                              Selected:{" "}
                              {selectedTables
                                .map((table) => table.tableNumber)
                                .join(", ")}{" "}
                              · {restaurantSeatCapacity} seats
                            </small>
                          )}
                        </label>
                      )}

                      <div className="create-event-menu-options">
                        <div>
                          <h3>Food (optional)</h3>
                          {foodMenu.length === 0 ? (
                            <p>
                              {restaurantDataLoading
                                ? "Loading food menu..."
                                : "No food items are configured for this restaurant."}
                            </p>
                          ) : foodMenu.map((item) => (
                            <div className="create-event-menu-item" key={item._id}>
                              <span>
                                <strong>{item.name}</strong>
                                <small>
                                  ₹{Number(item.price).toLocaleString("en-IN")}
                                </small>
                              </span>
                              <div className="create-event-quantity">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(setFoodQuantities, item._id, -1)
                                  }
                                  disabled={!foodQuantities[item._id] || loading}
                                >
                                  −
                                </button>
                                <span>{foodQuantities[item._id] || 0}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(setFoodQuantities, item._id, 1)
                                  }
                                  disabled={loading}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <div>
                          <h3>Beverages (optional)</h3>
                          {beverageMenu.length === 0 ? (
                            <p>
                              {restaurantDataLoading
                                ? "Loading beverage menu..."
                                : "No beverages are configured for this restaurant."}
                            </p>
                          ) : beverageMenu.map((item) => (
                            <div className="create-event-menu-item" key={item._id}>
                              <span>
                                <strong>{item.name}</strong>
                                <small>
                                  ₹{Number(item.price).toLocaleString("en-IN")}
                                </small>
                              </span>
                              <div className="create-event-quantity">
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      setBeverageQuantities,
                                      item._id,
                                      -1
                                    )
                                  }
                                  disabled={!beverageQuantities[item._id] || loading}
                                >
                                  −
                                </button>
                                <span>{beverageQuantities[item._id] || 0}</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuantity(
                                      setBeverageQuantities,
                                      item._id,
                                      1
                                    )
                                  }
                                  disabled={loading}
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                      <p className="create-event-menu-total">
                        Selected food and beverage total:{" "}
                        <strong>
                          ₹{(selectedFoodTotal + selectedBeverageTotal).toLocaleString("en-IN")}
                        </strong>
                      </p>
                    </>
                  )}
                </>
              )}
            </section>
          </div>

          <section className="create-event-payment-qr" aria-label="PhonePe payment">
            <h2>Payment</h2>
            <p>After choosing the restaurant and menu, scan this QR code to pay the advance.</p>
            <div className="create-event-payment-image">
              <img src="/event-payment-qr.jpg" alt="PhonePe payment QR code" />
            </div>
          </section>

          {error && <p className="create-event-error" role="alert">{error}</p>}
          {message && <p className="create-event-message" role="status">{message}</p>}

          {!otpSent && !verified && (
            <button
              type="button"
              className="create-event-button secondary"
              onClick={sendOtp}
              disabled={loading}
            >
              {loading ? "Sending code..." : "Verify Email to Continue"}
            </button>
          )}

          {otpSent && !verified && (
            <div className="create-event-verify">
              <label>
                6-digit email code
                <input
                  value={otp}
                  onChange={(event) =>
                    setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  required
                />
              </label>
              <button
                type="button"
                className="create-event-button secondary"
                onClick={verifyOtp}
                disabled={loading || otp.length !== 6}
              >
                {loading ? "Verifying..." : "Verify Code"}
              </button>
            </div>
          )}

          {verified && (
            <>
              <button
                type="submit"
                className="create-event-button"
                disabled={loading}
              >
                {loading ? "Creating event..." : "Create Event"}
              </button>
              {error && (
                <p className="create-event-error" role="alert">
                  {error}
                </p>
              )}
              {(availabilityLoading || restaurantDataLoading) && (
                <p className="create-event-message" role="status">
                  {availabilityLoading
                    ? "Checking restaurant time availability..."
                    : "Loading restaurant tables and menus..."}
                </p>
              )}
            </>
          )}
        </form>
      </section>
    </main>
  );
}
