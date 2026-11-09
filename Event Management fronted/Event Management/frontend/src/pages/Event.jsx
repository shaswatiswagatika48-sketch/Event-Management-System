import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import api from "../api";
import { shareEvent } from "../utils/shareEvent";
import { getEventStatus } from "../utils/eventStatus";
import "./Event.css";

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

function Event() {
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState(
    searchParams.get("eventId") || ""
  );
  const [shareMessage, setShareMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const selectedEvent = events.find((event) => event._id === selectedEventId);
  const selectedEventStatus = selectedEvent
    ? getEventStatus(selectedEvent.date)
    : null;

  useEffect(() => {
    setSelectedEventId(searchParams.get("eventId") || "");
  }, [searchParams]);

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
        setLoading(false);
      }
    };

    fetchEvents();
  }, []);

  const handleShare = async (event) => {
    setShareMessage("");
    const result = await shareEvent(event);
    if (result === "shared") setShareMessage("Event shared.");
    if (result === "copied") setShareMessage("Event link copied.");
    if (result === "prompted") setShareMessage("Copy the event link to share it.");
  };

  const showEventDetails = (eventId) => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.set("eventId", eventId);
      return next;
    });
    setShareMessage("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const clearSelectedEvent = () => {
    setSearchParams((current) => {
      const next = new URLSearchParams(current);
      next.delete("eventId");
      return next;
    });
  };

  return (
    <div className="events-page">
      <div className="events-header">
        <p>EVENTHUB</p>
        <h1>All Events</h1>
        <span>Choose an event and register your seat.</span>
      </div>

      <div className="events-container">
        {selectedEvent && (
          <section className="event-detail-panel" aria-labelledby="event-detail-title">
            <button
              type="button"
              className="event-detail-back"
              onClick={clearSelectedEvent}
            >
              ← All events
            </button>

            <div className="event-detail-overview">
              <p className="event-detail-eyebrow">EVENT DETAILS</p>
              <h2 id="event-detail-title">{selectedEvent.title}</h2>
              <span
                className={`event-completion-status ${selectedEventStatus.completed ? "completed" : ""}`}
              >
                {selectedEventStatus.label}
              </span>
              <button
                type="button"
                className="event-share-btn"
                onClick={() => handleShare(selectedEvent)}
              >
                Share event
              </button>
              <p className="event-description">{selectedEvent.description}</p>
              <div className="event-details">
                <p>📍 <strong>Location:</strong> {selectedEvent.location}</p>
                <p>📅 <strong>Date:</strong> {formatDate(selectedEvent.date)}</p>
                <p>🕒 <strong>Time:</strong> {selectedEvent.time}</p>
                <p>
                  💳 <strong>Ticket price:</strong>{" "}
                  ₹{Number(selectedEvent.ticketPrice || 0).toLocaleString("en-IN")}
                </p>
                {Array.isArray(selectedEvent.rules) && selectedEvent.rules.length > 0 && (
                  <div className="event-rules">
                    <h3>Event Rules</h3>
                    <ul>
                      {selectedEvent.rules.map((rule, index) => (
                        <li key={`${index}-${rule}`}>{rule}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>

            <div className="event-detail-booking">
              <h3>Restaurant, Food &amp; Seats</h3>
              {selectedEvent.restaurant ? (
                <>
                  <div className="event-detail-restaurant">
                    <h4>Booked restaurant</h4>
                    <p>
                      <strong>{selectedEvent.restaurant.name}</strong>
                      {selectedEvent.restaurant.address
                        ? ` — ${selectedEvent.restaurant.address}`
                        : ""}
                    </p>
                    <p>
                      {selectedEvent.reservationScope === "section"
                        ? `${selectedEvent.reservationSection} reserved`
                        : "Whole restaurant reserved"}
                      {selectedEvent.reservationTime
                        ? ` · ${selectedEvent.reservationTime}–${selectedEvent.reservationEndTime || `${String(Number(selectedEvent.reservationTime.slice(0, 2)) + 1).padStart(2, "0")}:00`}`
                        : ""}
                    </p>
                  </div>

                  {selectedEvent.restaurantTables?.length > 0 && (
                    <div className="event-detail-restaurant">
                      <h4>Booked tables</h4>
                      <p>
                        {selectedEvent.restaurantTables
                          .map((table) => table.tableNumber)
                          .join(", ")}
                        {" · "}
                        {selectedEvent.restaurantTables.reduce(
                          (capacity, table) => capacity + Number(table.capacity || 0),
                          0
                        )}{" "}
                        seats
                      </p>
                    </div>
                  )}

                  <div className="event-detail-restaurant">
                    <h4>Food menu</h4>
                    {selectedEvent.restaurantFoodItems?.length > 0 ? (
                      <ul>
                        {selectedEvent.restaurantFoodItems.map((item, index) => (
                          <li key={`${item.name}-${index}`}>
                            {item.name} × {item.quantity}
                            {item.total !== undefined
                              ? ` — ₹${Number(item.total).toLocaleString("en-IN")}`
                              : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p>No food items were booked for this event.</p>
                    )}
                    {selectedEvent.restaurantBeverageItems?.length > 0 && (
                      <>
                        <h4>Beverages</h4>
                        <ul>
                          {selectedEvent.restaurantBeverageItems.map((item, index) => (
                            <li key={`${item.name}-${index}`}>
                              {item.name} × {item.quantity}
                              {item.total !== undefined
                                ? ` — ₹${Number(item.total).toLocaleString("en-IN")}`
                                : ""}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </div>
                </>
              ) : (
                <p>No restaurant is booked for this event.</p>
              )}

              <div className="event-detail-seats">
                <div>
                  <h4>Available seats</h4>
                  <p>
                    {Number(selectedEvent.availableSeats || 0)} of{" "}
                    {Number(selectedEvent.totalSeats || 0)} seats remaining
                  </p>
                </div>
                <Link
                  to="/booking"
                  state={{ event: selectedEvent }}
                  className="book-btn"
                  aria-disabled={selectedEvent.availableSeats <= 0}
                  onClick={(clickEvent) => {
                    if (selectedEvent.availableSeats <= 0) clickEvent.preventDefault();
                  }}
                >
                  {selectedEvent.availableSeats > 0 ? "Register for one seat" : "Event Full"}
                </Link>
              </div>
            </div>
          </section>
        )}

        {location.state?.message && (
          <p
            className={`events-message ${location.state.emailSent ? "events-success" : "events-email-warning"}`}
            role="status"
          >
            {location.state.message}
          </p>
        )}
        {loading && <p className="events-message">Loading events...</p>}
        {!loading && error && <p className="events-message events-error">{error}</p>}
        {!loading && !error && events.length === 0 && (
          <p className="events-message">
            No events are available yet. Please check back later.
          </p>
        )}

        {!loading && !error && events.length > 0 && (
          <div className="events-grid">
            {events.map((event) => {
              const status = getEventStatus(event.date);
              return (
              <article className="event-card" key={event._id}>
                <div className="event-icon" aria-hidden="true">
                  🎟️
                </div>

                <h2>{event.title}</h2>
                <span
                  className={`event-completion-status ${status.completed ? "completed" : ""}`}
                >
                  {status.label}
                </span>
                <p className="event-description">{event.description}</p>

                <div className="event-details">
                  <p>
                    📍 <strong>Location:</strong> {event.location}
                  </p>
                  <p>
                    📅 <strong>Date:</strong> {formatDate(event.date)}
                  </p>
                  <p>
                    🕒 <strong>Time:</strong> {event.time}
                  </p>
                  <p>
                    🎫 <strong>Available seats:</strong> {event.availableSeats}
                  </p>
                  <p>
                    💳 <strong>Ticket price:</strong> ₹{Number(event.ticketPrice || 0).toLocaleString("en-IN")}
                  </p>
                </div>

                <div className="event-card-actions">
                  <button
                    type="button"
                    className="event-details-btn"
                    onClick={() => showEventDetails(event._id)}
                  >
                    View details
                  </button>
                  <button
                    type="button"
                    className="event-share-btn"
                    onClick={() => handleShare(event)}
                  >
                    Share event
                  </button>
                  <Link
                    to="/booking"
                    state={{ event }}
                    className="book-btn"
                    aria-disabled={event.availableSeats <= 0}
                    onClick={(clickEvent) => {
                      if (event.availableSeats <= 0) clickEvent.preventDefault();
                    }}
                  >
                    {event.availableSeats > 0 ? "Register Now" : "Event Full"}
                  </Link>
                </div>
              </article>
              );
            })}
          </div>
        )}
        {shareMessage && (
          <p className="events-message events-share-message" role="status">
            {shareMessage}
          </p>
        )}
      </div>
    </div>
  );
}

export default Event;
