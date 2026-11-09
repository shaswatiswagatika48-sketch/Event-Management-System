import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import api from "../api";
import FoodImage from "../components/FoodImage";
import "./Booking.css";


const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

const getRestaurantId = (restaurant) =>
  typeof restaurant === "string" ? restaurant : restaurant?._id || "";

function Booking() {
  const navigate = useNavigate();
  const location = useLocation();
  const selectedEventFromState = location.state?.event;
  const initialFoodSelection = location.state?.foodItems || [];
  const initialBeverageSelection = location.state?.beverageItems || [];
  const [events, setEvents] = useState([]);
  const [restaurants, setRestaurants] = useState([]);
  const [menu, setMenu] = useState([]);
  const [beverageMenu, setBeverageMenu] = useState([]);
  const [restaurantTables, setRestaurantTables] = useState([]);
  const [restaurantAvailability, setRestaurantAvailability] = useState(null);
  const [reservationScope, setReservationScope] = useState("");
  const [reservationSection, setReservationSection] = useState("");
  const [reservationTime, setReservationTime] = useState("");
  const [tablesLoading, setTablesLoading] = useState(false);
  const [tableError, setTableError] = useState("");
  const [availableSeatNumbers, setAvailableSeatNumbers] = useState([]);
  const [seatLoading, setSeatLoading] = useState(false);
  const [seatError, setSeatError] = useState("");
  const [selectedSeatNumbers, setSelectedSeatNumbers] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(
    getRestaurantId(selectedEventFromState?.restaurant) ||
      location.state?.restaurantId ||
      ""
  );
  const [foodQuantities, setFoodQuantities] = useState(() =>
    Object.fromEntries(
      initialFoodSelection.map((item) => [item.itemId, item.quantity])
    )
  );
  const [beverageQuantities, setBeverageQuantities] = useState(() =>
    Object.fromEntries(
      initialBeverageSelection.map((item) => [item.itemId, item.quantity])
    )
  );
  const [selectedEventId, setSelectedEventId] = useState(
    selectedEventFromState?._id || ""
  );
  const [email] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").email || "";
    } catch {
      return "";
    }
  });

  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [verified, setVerified] = useState(false);
  const [paymentReported, setPaymentReported] = useState(false);
  const [registered, setRegistered] = useState(false);
  const [loadingEvents, setLoadingEvents] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const selectedEvent = events.find(
    (event) => event._id === selectedEventId
  );
  const selectedRestaurant = restaurants.find(
    (restaurant) => restaurant._id === selectedRestaurantId
  );
  const selectedTimeSlot = restaurantAvailability?.timeSlots?.find(
    (slot) => slot.time === reservationTime
  );
  const selectedTables =
    reservationScope === "restaurant"
      ? restaurantTables
      : reservationScope === "section"
        ? restaurantTables.filter(
            (table) => (table.section || "Main Dining Area") === reservationSection
          )
        : [];
  const availableSections = selectedTimeSlot?.availableSections || [];
  const reservationAvailable =
    reservationScope === "restaurant"
      ? Boolean(selectedTimeSlot?.wholeRestaurantAvailable)
      : availableSections.includes(reservationSection);
  const foodTotal = menu.reduce(
    (total, item) => total + item.price * (foodQuantities[item._id] || 0),
    0
  );
  const beverageTotal = beverageMenu.reduce(
    (total, item) => total + item.price * (beverageQuantities[item._id] || 0),
    0
  );
  const tableTotal = selectedTables.reduce((total, table) => total + table.price, 0);
  const totalDue =
    (selectedEvent?.ticketPrice || 0) * selectedSeatNumbers.length +
    foodTotal +
    beverageTotal +
    tableTotal;

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        const { data } = await api.get("/events");
        setEvents(data.events);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Could not load events. Please try again."
        );
      } finally {
        setLoadingEvents(false);
      }
    };

    fetchEvents();
  }, []);

  useEffect(() => {
    if (!selectedEventId) {
      setAvailableSeatNumbers([]);
      setSelectedSeatNumbers([]);
      setSeatError("");
      setSeatLoading(false);
      return;
    }

    let active = true;
    const fetchAvailableSeats = async () => {
      setSeatLoading(true);
      setSeatError("");
      setSelectedSeatNumbers([]);
      try {
        const { data } = await api.get(
          `/registrations/${selectedEventId}/seats`
        );
        if (active) setAvailableSeatNumbers(data.availableSeatNumbers || []);
      } catch (requestError) {
        if (active) {
          setAvailableSeatNumbers([]);
          setSeatError(
            requestError.response?.data?.message ||
              "Could not load available seats. Please try again."
          );
        }
      } finally {
        if (active) setSeatLoading(false);
      }
    };

    fetchAvailableSeats();
    return () => {
      active = false;
    };
  }, [selectedEventId]);


  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get("/restaurants");
        setRestaurants(data.restaurants || []);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Could not load restaurants. Please try again."
        );
      }
    };

    fetchRestaurants();
  }, []);


  useEffect(() => {
    if (!selectedRestaurantId) {
      setRestaurantTables([]);
      setRestaurantAvailability(null);
      return;
    }

    const fetchMenu = async () => {
      setLoading(true);
      setError("");
      try {
        const [foodResponse, beverageResponse] = await Promise.all([
          api.get(`/food/restaurant/${selectedRestaurantId}`),
          api.get(`/beverages/restaurant/${selectedRestaurantId}`)
        ]);
        setMenu(foodResponse.data.food || []);
        setBeverageMenu(beverageResponse.data.beverages || []);
      } catch (requestError) {
        setMenu([]);
        setBeverageMenu([]);
        setError(
          requestError.response?.data?.message ||
            "Could not load this restaurant's food and beverage menus."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchMenu();
  }, [selectedRestaurantId]);


  useEffect(() => {
    if (!selectedRestaurantId || !selectedEventId || selectedEvent?.restaurant) {
      setRestaurantTables([]);
      setRestaurantAvailability(null);
      setTableError("");
      setTablesLoading(false);
      return;
    }

    let active = true;
    const fetchTables = async () => {
      setTablesLoading(true);
      setTableError("");
      try {
        const { data } = await api.get(
          `/tables/restaurant/${selectedRestaurantId}/availability`,
          { params: { eventId: selectedEventId } }
        );
        if (active) {
          const tables = data.tables || [];
          setRestaurantTables(tables);
          setRestaurantAvailability(data);
        }
      } catch (requestError) {
        if (active) {
          setRestaurantTables([]);
          setRestaurantAvailability(null);
          setTableError(
            requestError.response?.data?.message ||
              "Could not load table availability. Please try again."
          );
        }
      } finally {
        if (active) setTablesLoading(false);
      }
    };

    fetchTables();
    return () => {
      active = false;
    };
  }, [selectedRestaurantId, selectedEventId, selectedEvent]);


  const sendOtp = async () => {
    if (!email) {
      setError("Please log in again before registering for an event.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await api.post("/otp/send", { purpose: "registration" });
      setOtpSent(true);
      setVerified(false);
      setOtp("");
      setError("");
      setSuccessMessage(`A verification code was sent to ${email}.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          (requestError.code === "ERR_NETWORK"
            ? `Cannot reach the backend at ${api.defaults.baseURL}. Check that it is running and try again.`
            : requestError.message || "Could not send OTP. Please try again.")
      );
    } finally {
      setLoading(false);
    }
  };


  const verifyOtp = async () => {
    if (!/^\d{6}$/.test(otp)) {
      setError("Enter the six-digit verification code from your email.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      await api.post("/otp/verify", { otp, purpose: "registration" });
      setVerified(true);
      setPaymentReported(false);
      setSuccessMessage("Email verified. You can now register for this event.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "OTP verification failed. Check the code and try again."
      );
    } finally {
      setLoading(false);
    }
  };


  const registerForEvent = async () => {
    if (!selectedEvent) {
      setError("Select an event before registering.");
      return;
    }

    setLoading(true);
    setError("");
    setSuccessMessage("");

    try {
      const { data } = await api.post(`/registrations/${selectedEvent._id}`, {
        paymentReported: totalDue > 0,
        seatNumbers: selectedSeatNumbers,
        restaurantId:
          getRestaurantId(selectedEvent.restaurant) || selectedRestaurantId || undefined,
        tableIds: selectedTables.map((table) => table._id),
        reservationTime: selectedTables.length > 0 ? reservationTime : undefined,
        reservationScope: selectedTables.length > 0 ? reservationScope : undefined,
        reservationSection:
          reservationScope === "section" ? reservationSection : undefined,
        foodItems: Object.entries(foodQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({ itemId, quantity })),
        beverageItems: Object.entries(beverageQuantities)
          .filter(([, quantity]) => quantity > 0)
          .map(([itemId, quantity]) => ({ itemId, quantity })),
      });
      navigate(`/rating/${data.registration._id}`, {
        state: {
          eventTitle: selectedEvent.title,
          eventId: selectedEvent._id,
          seatNumbers: data.registration.seatNumbers || [data.registration.seatNumber],
          emailSent: data.emailSent,
        },
      });
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not complete your registration. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };


  const handleEventChange = (eventId) => {
    const nextEvent = events.find((event) => event._id === eventId);
    const bookedRestaurantId = getRestaurantId(nextEvent?.restaurant);
    if (bookedRestaurantId) {
      changeRestaurant(bookedRestaurantId);
    } else {
      changeRestaurant("");
    }
    setSelectedEventId(eventId);
    setError("");
    setSuccessMessage("");
    setOtp("");
    setOtpSent(false);
    setVerified(false);
    setPaymentReported(false);
    setRegistered(false);
    setReservationScope("");
    setReservationSection("");
    setReservationTime("");
    setSelectedSeatNumbers([]);
  };


  const updateFoodQuantity = (itemId, change) => {
    setFoodQuantities((current) => {
      const quantity = Math.max(0, (current[itemId] || 0) + change);
      const updated = { ...current };
      if (quantity === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = quantity;
      }
      return updated;
    });
    setPaymentReported(false);
  };


  const changeRestaurant = (restaurantId) => {
    setSelectedRestaurantId(restaurantId);
    setMenu([]);
    setBeverageMenu([]);
    setFoodQuantities({});
    setBeverageQuantities({});
    setReservationScope("");
    setReservationSection("");
    setReservationTime("");
    setRestaurantTables([]);
    setRestaurantAvailability(null);
    setPaymentReported(false);
    setError("");
  };


  const updateBeverageQuantity = (itemId, change) => {
    setBeverageQuantities((current) => {
      const quantity = Math.max(0, (current[itemId] || 0) + change);
      const updated = { ...current };
      if (quantity === 0) {
        delete updated[itemId];
      } else {
        updated[itemId] = quantity;
      }
      return updated;
    });
    setPaymentReported(false);
  };


  return (
    <div className="booking-page">
      <header className="booking-header">
        <p className="booking-eyebrow">EVENTHUB</p>
        <h1>Register for an Event</h1>
        <p>Choose an event, verify your email, and complete registration.</p>
      </header>

      <main className="booking-container">
        <section className="booking-card">
          <h2>Event Details</h2>

          <label htmlFor="event">Select Event</label>
          <select
            id="event"
            value={selectedEventId}
            onChange={(event) => handleEventChange(event.target.value)}
            disabled={loadingEvents || loading || registered}
          >
            <option value="">
              {loadingEvents ? "Loading events..." : "Choose an event"}
            </option>
            {events.map((event) => (
              <option
                key={event._id}
                value={event._id}
                disabled={event.availableSeats <= 0}
              >
                {event.title}
                {event.restaurant
                  ? ` · ${event.restaurant.name} (${event.reservationTime})`
                  : ""}
                {event.availableSeats <= 0 ? " (Full)" : ""}
              </option>
            ))}
          </select>

          {selectedEvent && (
            <div className="booking-event-details">
              <h3>{selectedEvent.title}</h3>
              <p>{selectedEvent.description}</p>
              <p>
                <strong>Date:</strong> {formatDate(selectedEvent.date)}
              </p>
              <p>
                <strong>Time:</strong> {selectedEvent.time}
              </p>
              <p>
                <strong>Location:</strong> {selectedEvent.location}
              </p>
              {selectedEvent.restaurant && (
                <p>
                  <strong>Event restaurant reservation:</strong>{" "}
                  {selectedEvent.restaurant.name} —{" "}
                  {selectedEvent.reservationScope === "restaurant"
                    ? "entire restaurant"
                    : selectedEvent.reservationSection}
                  , {selectedEvent.reservationTime}–
                  {selectedEvent.reservationEndTime ||
                    `${String(Number(selectedEvent.reservationTime.slice(0, 2)) + 1).padStart(2, "0")}:00`}
                </p>
              )}
              <p>
                <strong>Available seats:</strong>{" "}
                {selectedEvent.availableSeats}
              </p>
              <p>
                <strong>Ticket price:</strong>{" "}
                ₹{Number(selectedEvent.ticketPrice || 0).toLocaleString("en-IN")}
              </p>
              {Array.isArray(selectedEvent.rules) && selectedEvent.rules.length > 0 && (
                <div className="booking-event-rules">
                  <h4>Event Rules</h4>
                  <ul>
                    {selectedEvent.rules.map((rule, index) => (
                      <li key={`${index}-${rule}`}>{rule}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {selectedEvent && (
            <section className="booking-seat-selection" aria-labelledby="seat-selection-title">
              <h2 id="seat-selection-title">Choose your seat</h2>
              <p>
                Select one or more seats. Seats that are already registered are unavailable.
              </p>
              {seatLoading ? (
                <p>Loading available seats...</p>
              ) : seatError ? (
                <p className="booking-seat-error" role="alert">{seatError}</p>
              ) : availableSeatNumbers.length === 0 ? (
                <p className="booking-seat-error" role="status">
                  No seats are available for this event.
                </p>
              ) : (
                <div className="booking-seat-grid" role="group" aria-label="Event seats">
                  {Array.from(
                    { length: Number(selectedEvent.totalSeats) },
                    (_, index) => index + 1
                  ).map((seatNumber) => {
                    const available = availableSeatNumbers.includes(seatNumber);
                    return (
                      <button
                        type="button"
                        key={seatNumber}
                        className={`booking-seat-option${selectedSeatNumbers.includes(seatNumber) ? " selected" : ""}${available ? "" : " unavailable"}`}
                        aria-label={`Seat ${seatNumber}, ${available ? "available" : "registered"}`}
                        aria-pressed={selectedSeatNumbers.includes(seatNumber)}
                        disabled={!available || loading || registered}
                        onClick={() => {
                          setSelectedSeatNumbers((current) =>
                            current.includes(seatNumber)
                              ? current.filter((selected) => selected !== seatNumber)
                              : [...current, seatNumber].sort((a, b) => a - b)
                          );
                          setPaymentReported(false);
                        }}
                      >
                        {seatNumber}
                      </button>
                    );
                  })}
                </div>
              )}
              {availableSeatNumbers.length > 0 && (
                <p className="booking-seat-legend">
                  Available seats can be selected; grey seats are already registered.
                </p>
              )}
              {selectedSeatNumbers.length > 0 && (
                <p className="booking-seat-chosen" role="status">
                  Selected seats: {selectedSeatNumbers.join(", ")} (
                  {selectedSeatNumbers.length})
                </p>
              )}
            </section>
          )}


          <div className="booking-menu-section">
            <h2>Restaurant &amp; Food (Optional)</h2>
            {selectedEvent?.restaurant ? (
              <div className="booking-event-restaurant">
                <h3 className="booking-submenu-title">Event's booked restaurant</h3>
                <p>
                  <strong>{selectedEvent.restaurant.name}</strong>
                  {selectedEvent.restaurant.address
                    ? ` — ${selectedEvent.restaurant.address}`
                    : ""}
                </p>
                <p>
                  <strong>Booked section:</strong>{" "}
                  {selectedEvent.reservationScope === "section"
                    ? selectedEvent.reservationSection
                    : "Entire restaurant"}
                </p>
                {selectedEvent.reservationTime && (
                  <p>
                    <strong>Booked time:</strong>{" "}
                    {selectedEvent.reservationTime}–
                    {selectedEvent.reservationEndTime ||
                      `${String(Number(selectedEvent.reservationTime.slice(0, 2)) + 1).padStart(2, "0")}:00`}
                  </p>
                )}
                {selectedEvent.restaurantTables?.length > 0 && (
                  <p>
                    <strong>Booked tables:</strong>{" "}
                    {selectedEvent.restaurantTables
                      .map((table) => table.tableNumber)
                      .join(", ")}
                  </p>
                )}
                {selectedEvent.restaurantFoodItems?.length > 0 && (
                  <div>
                    <strong>Food booked for the event:</strong>
                    <ul>
                      {selectedEvent.restaurantFoodItems.map((item, index) => (
                        <li key={`${item.name}-${index}`}>
                          {item.name} × {item.quantity}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                <p>Choose any additional food from this restaurant's menu below.</p>
              </div>
            ) : (
              <>
                <label htmlFor="booking-restaurant">Choose a restaurant</label>
                <select
                  id="booking-restaurant"
                  value={selectedRestaurantId}
                  onChange={(event) => changeRestaurant(event.target.value)}
                  disabled={loading || registered}
                >
                  <option value="">No restaurant — event only</option>
                  {restaurants.map((restaurant) => (
                    <option key={restaurant._id} value={restaurant._id}>
                      {restaurant.name} — {restaurant.address}
                    </option>
                  ))}
                </select>

                {selectedRestaurantId && (
              <div className="booking-table-selection">
                <h3 className="booking-submenu-title">Restaurant party booking</h3>
                {selectedRestaurant && (
                  <p className="restaurant-party-description">
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
                {!selectedEventId ? (
                  <p>Select an event first to check table availability.</p>
                ) : tableError ? (
                  <p role="alert">{tableError}</p>
                ) : (
                  <>
                    <p className="restaurant-hours-summary">
                      {tablesLoading
                        ? "Checking restaurant availability..."
                        : restaurantAvailability
                          ? `Event date: ${formatDate(restaurantAvailability.event.date)} · Open ${restaurantAvailability.openingTime}–${restaurantAvailability.closingTime}. Bookings are in one-hour slots.`
                          : ""}
                    </p>
                    <label htmlFor="reservation-scope">
                      Reserve restaurant space (optional)
                    </label>
                    <select
                      id="reservation-scope"
                      value={reservationScope}
                      disabled={
                        tablesLoading ||
                        loading ||
                        registered ||
                        selectedRestaurant?.partyAvailability === "unavailable"
                      }
                      onChange={(event) => {
                        setReservationScope(event.target.value);
                        setReservationSection("");
                        setReservationTime("");
                        setPaymentReported(false);
                      }}
                    >
                      <option value="">No space reservation</option>
                      <option value="restaurant">Reserve entire restaurant</option>
                      <option value="section">Reserve one section</option>
                    </select>
                    {reservationScope && (
                      <>
                        {reservationScope === "section" && (
                          <>
                            <label htmlFor="reservation-section">
                              Choose a section
                            </label>
                            <select
                              id="reservation-section"
                              value={reservationSection}
                              disabled={tablesLoading || loading || registered}
                              onChange={(event) => {
                                setReservationSection(event.target.value);
                                setReservationTime("");
                                setPaymentReported(false);
                              }}
                            >
                              <option value="">Select section</option>
                              {(restaurantAvailability?.sections || []).map(
                                (section) => (
                                  <option key={section} value={section}>
                                    {section}
                                  </option>
                                )
                              )}
                            </select>
                          </>
                        )}
                        <label htmlFor="reservation-time">
                          Choose an available one-hour slot
                        </label>
                        <select
                          id="reservation-time"
                          value={reservationTime}
                          disabled={
                            tablesLoading ||
                            loading ||
                            registered ||
                            (reservationScope === "section" && !reservationSection)
                          }
                          onChange={(event) => {
                            setReservationTime(event.target.value);
                            setPaymentReported(false);
                          }}
                        >
                          <option value="">Select a time</option>
                          {(restaurantAvailability?.timeSlots || []).map(
                            (slot) => {
                              const available =
                                reservationScope === "restaurant"
                                  ? slot.wholeRestaurantAvailable
                                  : slot.availableSections.includes(
                                      reservationSection
                                    );
                              const endHour = Number(slot.time.slice(0, 2)) + 1;
                              return (
                                <option
                                  key={slot.time}
                                  value={slot.time}
                                  disabled={!available}
                                >
                                  {slot.time}–
                                  {String(endHour).padStart(2, "0")}:00
                                  {available ? " · Available" : " · Booked"}
                                </option>
                              );
                            }
                          )}
                        </select>
                        {selectedTables.length > 0 && reservationAvailable && (
                          <p className="booking-table-summary">
                            {reservationScope === "restaurant"
                              ? "Entire restaurant reserved"
                              : `${reservationSection} reserved`}
                            {" "}for {reservationTime}–
                            {String(Number(reservationTime.slice(0, 2)) + 1).padStart(2, "0")}:00
                            {" · "}Tables:{" "}
                            {selectedTables
                              .map((table) => table.tableNumber)
                              .join(", ")}
                          </p>
                        )}
                        {restaurantAvailability?.timeSlots?.length === 0 && (
                          <p role="alert">
                            No bookable time slots are configured for this restaurant.
                          </p>
                        )}
                      </>
                    )}
                  </>
                )}
              </div>
            )}
              </>
            )}

            {selectedRestaurantId && menu.length === 0 && !loading && (
              <p className="booking-menu-empty">
                No available food items for this restaurant yet.
              </p>
            )}


            {menu.length > 0 && (
              <div className="booking-menu-list">
                {menu.map((item) => {
                  const quantity = foodQuantities[item._id] || 0;
                  return (
                    <div className="booking-menu-item" key={item._id}>
                      <div>
                        <FoodImage
                          item={item}
                          className="booking-food-thumbnail"
                          showCredit={false}
                        />
                        <strong>{item.name}</strong>
                        <span>
                          ₹{Number(item.price).toLocaleString("en-IN")}
                        </span>
                      </div>
                      <div className="booking-menu-quantity">
                        <button
                          type="button"
                          aria-label={`Remove one ${item.name}`}
                          disabled={quantity === 0 || loading || registered}
                          onClick={() => updateFoodQuantity(item._id, -1)}
                        >
                          −
                        </button>
                        <span>{quantity}</span>
                        <button
                          type="button"
                          aria-label={`Add one ${item.name}`}
                          disabled={loading || registered}
                          onClick={() => updateFoodQuantity(item._id, 1)}
                        >
                          +
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            {foodTotal > 0 && (
              <p className="booking-food-total">
                Selected food total: ₹{foodTotal.toLocaleString("en-IN")}
              </p>
            )}

            {selectedRestaurantId && (
              <>
                <h3 className="booking-submenu-title">Beverages</h3>
                {beverageMenu.length === 0 && !loading && (
                  <p className="booking-menu-empty">
                    No beverages are available for this restaurant yet.
                  </p>
                )}
                {beverageMenu.length > 0 && (
                  <div className="booking-menu-list">
                    {beverageMenu.map((item) => {
                      const quantity = beverageQuantities[item._id] || 0;
                      return (
                        <div className="booking-menu-item" key={item._id}>
                          <div>
                            <FoodImage
                              item={item}
                              className="booking-food-thumbnail"
                              kind="beverage"
                              showCredit={false}
                            />
                            <strong>{item.name}</strong>
                            <span>
                              ₹{Number(item.price).toLocaleString("en-IN")}
                            </span>
                          </div>
                          <div className="booking-menu-quantity">
                            <button
                              type="button"
                              aria-label={`Remove one ${item.name}`}
                              disabled={quantity === 0 || loading || registered}
                              onClick={() => updateBeverageQuantity(item._id, -1)}
                            >
                              −
                            </button>
                            <span>{quantity}</span>
                            <button
                              type="button"
                              aria-label={`Add one ${item.name}`}
                              disabled={loading || registered}
                              onClick={() => updateBeverageQuantity(item._id, 1)}
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {beverageTotal > 0 && (
                  <p className="booking-food-total">
                    Selected beverage total: ₹
                    {beverageTotal.toLocaleString("en-IN")}
                  </p>
                )}
              </>
            )}
            {selectedRestaurantId && foodTotal + beverageTotal > 0 && (
              <section className="booking-additional-food-payment" aria-label="Additional food payment">
                <h3>Pay for your additional food</h3>
                <p>
                  Scan this PhonePe QR to pay ₹
                  {(foodTotal + beverageTotal).toLocaleString("en-IN")} for your
                  additional food and beverages.
                </p>
                <img
                  src="/event-payment-qr.jpg"
                  alt="PhonePe QR code for additional food and beverage payment"
                />
              </section>
            )}
          </div>

          {loadingEvents && <p>Loading available events...</p>}
          {!loadingEvents && events.length === 0 && !error && (
            <p>No events are available for registration yet.</p>
          )}
        </section>

        <aside className="summary-card">
          <h2>Email Verification</h2>
          <p>
            Verify the email address on your account. Your event registration
            confirmation will be sent there.
          </p>

          <label htmlFor="booking-email">Account Email</label>
          <input
            id="booking-email"
            type="email"
            value={email}
            readOnly
            disabled
          />

          {error && (
            <p className="otp-error" role="alert">
              {error}
            </p>
          )}
          {successMessage && (
            <p className="otp-success" role="status">
              {successMessage}
            </p>
          )}

          {!otpSent && !verified && !registered && (
            <button
              type="button"
              className="booking-primary-btn"
              disabled={loading || loadingEvents || !email || !selectedEvent}
              onClick={sendOtp}
            >
              {loading ? "Sending OTP..." : "Send Email OTP"}
            </button>
          )}

          {otpSent && !verified && !registered && (
            <>
              <label htmlFor="booking-otp">6-Digit OTP</label>
              <input
                id="booking-otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder="Enter OTP"
                value={otp}
                onChange={(event) =>
                  setOtp(event.target.value.replace(/\D/g, "").slice(0, 6))
                }
                disabled={loading}
              />
              <button
                type="button"
                className="booking-primary-btn"
                disabled={loading || otp.length !== 6}
                onClick={verifyOtp}
              >
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                className="resend-btn"
                disabled={loading}
                onClick={sendOtp}
              >
                Resend OTP
              </button>
            </>
          )}

          {verified && !registered && (
            <div className="event-payment">
              {totalDue > 0 ? (
                <>
                  <h3>Pay event, restaurant and food total</h3>
                  <p>
                    Scan this PhonePe QR and pay the total of{" "}
                    <strong>
                      ₹{Number(totalDue).toLocaleString("en-IN")}
                    </strong>
                    .
                  </p>
                  <p>
                    Event tickets ({selectedSeatNumbers.length} seats): ₹
                    {(Number(selectedEvent.ticketPrice) * selectedSeatNumbers.length).toLocaleString("en-IN")}
                    {foodTotal > 0 && (
                      <> · Food: ₹{foodTotal.toLocaleString("en-IN")}</>
                    )}
                    {beverageTotal > 0 && (
                      <> · Beverages: ₹{beverageTotal.toLocaleString("en-IN")}</>
                    )}
                    {selectedTables.length > 0 && (
                      <> · Tables: {selectedTables.length} (₹{tableTotal.toLocaleString("en-IN")})</>
                    )}
                  </p>
                  <img
                    className="event-payment-qr"
                    src="/contact-qr.jpg"
                    alt="PhonePe payment QR code"
                  />
                  <p className="payment-verification-note">
                    This static QR does not notify EventHub when payment is
                    complete. Registration will proceed when you confirm
                    payment below.
                  </p>
                  <label className="payment-confirmation">
                    <input
                      type="checkbox"
                      checked={paymentReported}
                      onChange={(event) => setPaymentReported(event.target.checked)}
                    />
                    I have completed the PhonePe payment
                  </label>
                </>
              ) : (
                <p>This event is free to register.</p>
              )}
              <button
                type="button"
                className="booking-primary-btn"
                disabled={
                  loading ||
                  !selectedEvent ||
                  selectedSeatNumbers.length === 0 ||
                  seatLoading ||
                  Boolean(seatError) ||
                  selectedEvent.availableSeats <= 0 ||
                  (reservationScope &&
                    (selectedTables.length === 0 || !reservationAvailable)) ||
                  (totalDue > 0 && !paymentReported)
                }
                onClick={registerForEvent}
              >
                {loading ? "Registering..." : "Complete Registration"}
              </button>
            </div>
          )}

          {registered && (
            <Link to="/events" className="booking-primary-btn booking-link-btn">
              Browse More Events
            </Link>
          )}
        </aside>
      </main>
    </div>
  );
}


export default Booking;
