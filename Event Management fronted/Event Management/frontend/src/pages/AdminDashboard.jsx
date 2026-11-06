import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import "./AdminDashboard.css";

const sections = [
  ["overview", "Overview"],
  ["events", "Events"],
  ["registrations", "Registrations"],
  ["bookings", "Bookings"],
  ["restaurants", "Restaurants"],
  ["payments", "Payments"],
  ["users", "Users"],
];

const formatDate = (date, includeTime = false) => {
  if (!date) return "—";
  return new Date(date).toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    ...(includeTime ? { hour: "numeric", minute: "2-digit" } : {}),
  });
};

const formatAmount = (amount) =>
  new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(Number(amount) || 0);

const searchRows = (rows, query) => {
  const search = query.trim().toLowerCase();
  if (!search) return rows;
  return rows.filter((row) => JSON.stringify(row).toLowerCase().includes(search));
};

const emptyRestaurant = {
  name: "",
  address: "",
  phone: "",
  description: "",
  partyAvailability: "contact",
  partyDescription: "",
  openingTime: "10:00",
  closingTime: "22:00",
};

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [dashboard, setDashboard] = useState(null);
  const [activeSection, setActiveSection] = useState("overview");
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyAction, setBusyAction] = useState("");
  const [eventDraft, setEventDraft] = useState(null);
  const [bookingEditDraft, setBookingEditDraft] = useState(null);
  const [bookingDraft, setBookingDraft] = useState(null);
  const [bookingResources, setBookingResources] = useState(null);
  const [loadingBookingResources, setLoadingBookingResources] = useState(false);
  const [restaurantDraft, setRestaurantDraft] = useState(null);
  const [venuePanel, setVenuePanel] = useState(null);
  const [venueData, setVenueData] = useState(null);
  const [venueForm, setVenueForm] = useState({
    type: "food",
    name: "",
    description: "",
    category: "Food",
    price: "",
    tableNumber: "",
    section: "Main Dining Area",
    capacity: "",
    tablePrice: "",
  });

  const loadDashboard = useCallback(async () => {
    setError("");
    try {
      const { data } = await api.get("/admin/dashboard");
      setDashboard(data);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not load the admin dashboard. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  useEffect(() => {
    if (!bookingDraft?.eventId || !bookingDraft?.restaurantId) {
      setBookingResources(null);
      setLoadingBookingResources(false);
      return;
    }

    let active = true;
    setLoadingBookingResources(true);
    setBookingResources(null);
    setError("");

    Promise.all([
      api.get(
        `/tables/restaurant/${bookingDraft.restaurantId}/availability`,
        { params: { eventId: bookingDraft.eventId } }
      ),
      api.get(`/food/restaurant/${bookingDraft.restaurantId}`),
      api.get(`/beverages/restaurant/${bookingDraft.restaurantId}`),
    ])
      .then(([availabilityResponse, foodResponse, beverageResponse]) => {
        if (!active) return;
        const availability = availabilityResponse.data;
        setBookingResources({
          tables: availability.tables || [],
          sections: availability.sections || [],
          timeSlots: availability.timeSlots || [],
          food: foodResponse.data.food || [],
          beverages: beverageResponse.data.beverages || [],
        });
        setBookingDraft((current) => ({
          ...current,
          reservationSection:
            current.reservationSection ||
            availability.sections?.[0] ||
            "",
        }));
      })
      .catch((requestError) => {
        if (!active) return;
        setError(
          requestError.response?.data?.message ||
            "Could not load booking availability and menu options."
        );
      })
      .finally(() => {
        if (active) setLoadingBookingResources(false);
      });

    return () => {
      active = false;
    };
  }, [bookingDraft?.eventId, bookingDraft?.restaurantId]);

  const openVenuePanel = async (restaurantId, mode) => {
    setVenuePanel({ restaurantId, mode });
    setVenueData(null);
    setError("");
    try {
      const requests =
        mode === "tables"
          ? [api.get(`/tables/restaurant/${restaurantId}`)]
          : [
              api.get(`/food/manage/restaurant/${restaurantId}`),
              api.get(`/beverages/restaurant/${restaurantId}`),
            ];
      const responses = await Promise.all(requests);
      setVenueData(
        mode === "tables"
          ? { tables: responses[0].data.tables || [] }
          : {
              food: responses[0].data.food || [],
              beverages: responses[1].data.beverages || [],
            }
      );
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not load this restaurant's management data."
      );
    }
  };

  const refreshVenuePanel = () => {
    if (venuePanel) openVenuePanel(venuePanel.restaurantId, venuePanel.mode);
  };

  const saveEvent = async (event) => {
    event.preventDefault();
    setBusyAction("event");
    setError("");
    setNotice("");
    try {
      const { _id, ...fields } = eventDraft;
      await api.put(`/admin/events/${_id}`, {
        ...fields,
        totalSeats: Number(fields.totalSeats),
        ticketPrice: Number(fields.ticketPrice),
      });
      setEventDraft(null);
      setNotice("Event updated.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not update the event."
      );
    } finally {
      setBusyAction("");
    }
  };

  const removeEvent = async (event) => {
    if (
      !window.confirm(
        `Delete "${event.title}" and its event registrations? This cannot be undone.`
      )
    ) {
      return;
    }
    setBusyAction(event._id);
    setError("");
    setNotice("");
    try {
      await api.delete(`/admin/events/${event._id}`);
      setNotice("Event and its registrations deleted.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Could not delete the event."
      );
    } finally {
      setBusyAction("");
    }
  };

  const saveRestaurant = async (event) => {
    event.preventDefault();
    setBusyAction("restaurant");
    setError("");
    setNotice("");
    try {
      const { _id, ...fields } = restaurantDraft;
      if (_id) {
        await api.patch(`/admin/restaurants/${_id}`, fields);
      } else {
        await api.post("/admin/restaurants", fields);
      }
      setRestaurantDraft(null);
      setNotice(_id ? "Restaurant updated." : "Restaurant added.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not save the restaurant."
      );
    } finally {
      setBusyAction("");
    }
  };

  const setRestaurantActive = async (restaurant) => {
    const activate = !restaurant.active;
    if (
      !activate &&
      !window.confirm(
        `Deactivate "${restaurant.name}"? It will no longer be offered for new bookings; booking history is preserved.`
      )
    ) {
      return;
    }
    setBusyAction(restaurant._id);
    setError("");
    setNotice("");
    try {
      if (activate) {
        await api.patch(`/admin/restaurants/${restaurant._id}`, {
          active: true,
        });
      } else {
        await api.delete(`/admin/restaurants/${restaurant._id}`);
      }
      setNotice(activate ? "Restaurant reactivated." : "Restaurant deactivated.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update restaurant status."
      );
    } finally {
      setBusyAction("");
    }
  };

  const saveVenueItem = async (event) => {
    event.preventDefault();
    if (!venuePanel) return;
    setBusyAction("venue-item");
    setError("");
    setNotice("");
    try {
      if (venuePanel.mode === "tables") {
        await api.post("/tables", {
          restaurant: venuePanel.restaurantId,
          tableNumber: venueForm.tableNumber.trim(),
          section: venueForm.section.trim(),
          capacity: Number(venueForm.capacity),
          price: Number(venueForm.tablePrice),
        });
      } else {
        const endpoint =
          venueForm.type === "food" ? "/food" : "/beverages";
        await api.post(endpoint, {
          restaurant: venuePanel.restaurantId,
          name: venueForm.name.trim(),
          description: venueForm.description.trim(),
          category: venueForm.category.trim(),
          price: Number(venueForm.price),
        });
      }
      setVenueForm((current) => ({
        ...current,
        name: "",
        description: "",
        price: "",
        tableNumber: "",
        capacity: "",
        tablePrice: "",
      }));
      setNotice(venuePanel.mode === "tables" ? "Table added." : "Menu item added.");
      refreshVenuePanel();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not save this item."
      );
    } finally {
      setBusyAction("");
    }
  };

  const removeVenueItem = async (item, type) => {
    if (!window.confirm(`Delete "${item.tableNumber || item.name}"?`)) return;
    setBusyAction(item._id);
    setError("");
    try {
      const endpoint =
        type === "table"
          ? `/tables/${item._id}`
          : type === "food"
            ? `/food/${item._id}`
            : `/beverages/${item._id}`;
      await api.delete(endpoint);
      setNotice("Item deleted.");
      refreshVenuePanel();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message || "Could not delete this item."
      );
    } finally {
      setBusyAction("");
    }
  };

  const verifyPayment = async (payment, action) => {
    if (action === "approve") {
      const confirmed = window.confirm(
        "Approve only after confirming this transaction in your payment provider or bank records. Have you verified it?"
      );
      if (!confirmed) return;
    }
    const rejectionReason =
      action === "reject"
        ? window.prompt("Reason for rejecting this payment reference:")
        : "";
    if (action === "reject" && rejectionReason === null) return;

    setBusyAction(String(payment._id));
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/bookings/admin/verify-payment", {
        bookingId: payment.bookingId,
        paymentId: payment._id,
        action,
        ...(action === "reject" ? { rejectionReason } : {}),
      });
      setNotice(data.message || "Payment status updated.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not update the payment status."
      );
    } finally {
      setBusyAction("");
    }
  };

  const createAdminBooking = async (event) => {
    event.preventDefault();
    if (!bookingDraft || !bookingResources) return;

    const tableIds = bookingResources.tables
      .filter(
        (table) =>
          bookingDraft.reservationScope === "restaurant" ||
          (table.section || "Main Dining Area") ===
            bookingDraft.reservationSection
      )
      .map((table) => table._id);
    if (!tableIds.length) {
      setError("The selected restaurant area has no active tables.");
      return;
    }

    setBusyAction("booking");
    setError("");
    setNotice("");
    try {
      const { data } = await api.post("/bookings/admin/create", {
        userId: bookingDraft.userId,
        eventId: bookingDraft.eventId,
        restaurantId: bookingDraft.restaurantId,
        phone: bookingDraft.phone,
        tableIds,
        reservationTime: bookingDraft.reservationTime,
        reservationScope: bookingDraft.reservationScope,
        ...(bookingDraft.reservationScope === "section"
          ? { reservationSection: bookingDraft.reservationSection }
          : {}),
        foodItems: Object.entries(bookingDraft.foodQuantities || {}).map(
          ([itemId, quantity]) => ({ itemId, quantity: Number(quantity) })
        ),
        beverageItems: Object.entries(
          bookingDraft.beverageQuantities || {}
        ).map(([itemId, quantity]) => ({
          itemId,
          quantity: Number(quantity),
        })),
      });
      setBookingDraft(null);
      setBookingResources(null);
      setNotice(data.message || "Booking created with no payment recorded.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not create booking."
      );
    } finally {
      setBusyAction("");
    }
  };

  const saveBookingEdit = async (event) => {
    event.preventDefault();
    if (!bookingEditDraft) return;

    setBusyAction(bookingEditDraft._id);
    setError("");
    setNotice("");
    try {
      const { data } = await api.put(
        `/bookings/admin/${bookingEditDraft._id}`,
        {
          userId: bookingEditDraft.userId,
          phone: bookingEditDraft.phone,
        }
      );
      setBookingEditDraft(null);
      setNotice(data.message || "Booking contact details updated.");
      await loadDashboard();
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          requestError.response?.data?.error ||
          "Could not update booking."
      );
    } finally {
      setBusyAction("");
    }
  };

  const filteredEvents = searchRows(dashboard?.events || [], search);
  const filteredRegistrations = searchRows(dashboard?.registrations || [], search);
  const filteredBookings = searchRows(dashboard?.bookings || [], search);
  const filteredRestaurants = searchRows(dashboard?.restaurants || [], search);
  const filteredPayments = searchRows(dashboard?.payments || [], search);
  const filteredUsers = searchRows(dashboard?.users || [], search);

  if (loading) {
    return (
      <main className="admin-dashboard">
        <p className="admin-dashboard-message">Loading dashboard...</p>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="admin-dashboard">
        <p className="admin-dashboard-error" role="alert">{error}</p>
        <button className="admin-primary-btn" onClick={loadDashboard}>
          Try again
        </button>
      </main>
    );
  }

  const stats = dashboard.stats;
  const statCards = [
    ["Total events", stats.eventCount],
    ["Registered users", stats.userCount],
    ["Event registrations", stats.registrationCount],
    ["Restaurants", stats.restaurantCount],
    ["Restaurant bookings", stats.bookingCount],
    ["Payment records", stats.paymentCount],
    ["Pending payment reviews", stats.pendingPaymentCount],
    ["Pending amount", formatAmount(stats.pendingPaymentAmount)],
    ["Outstanding balance", formatAmount(stats.outstandingBalance)],
    ["Approved payment amount", formatAmount(stats.approvedPaymentAmount)],
  ];

  return (
    <main className="admin-dashboard">
      <aside className="admin-sidebar">
        <div className="admin-sidebar-brand">
          <span className="admin-brand-icon">E</span>
          <div><strong>EventHub</strong><small>ADMIN CONSOLE</small></div>
        </div>
        <nav className="admin-sidebar-nav" aria-label="Admin sections">
          {sections.map(([key, label]) => (
            <button
              type="button"
              key={key}
              className={activeSection === key ? "active" : ""}
              onClick={() => {
                setActiveSection(key);
                setSearch("");
                setError("");
                setNotice("");
              }}
            >
              <span aria-hidden="true">{{
                overview: "⌂",
                events: "◇",
                registrations: "▤",
                bookings: "▣",
                restaurants: "⌖",
                payments: "₹",
                users: "♙",
              }[key]}</span>
              {label}
            </button>
          ))}
        </nav>
        <div className="admin-sidebar-footer">
          <button type="button" onClick={() => navigate("/events")}>← Browse events</button>
          <small>Admin access is protected by your account role.</small>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span className="admin-eyebrow">EVENTHUB MANAGEMENT</span>
            <h1>{sections.find(([key]) => key === activeSection)?.[1]}</h1>
          </div>
          {activeSection !== "overview" && (
            <input
              className="admin-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={`Search ${activeSection}...`}
              aria-label={`Search ${activeSection}`}
            />
          )}
        </header>

        {error && <p className="admin-dashboard-error" role="alert">{error}</p>}
        {notice && <p className="admin-dashboard-notice" role="status">{notice}</p>}

        {activeSection === "overview" && (
          <>
            <section className="admin-stats" aria-label="Dashboard overview">
              {statCards.map(([label, value]) => (
                <article className="admin-stat-card" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </article>
              ))}
            </section>
            <p className="admin-dashboard-note">
              Pending payments are submitted transaction references awaiting review. Approved totals include only payment records verified by an admin. Event registration confirmations are user-reported and are not included as verified payments. Hotels are not a separate record type in the current database.
            </p>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div><h2>Recent events</h2><p>Seat availability and registration overview</p></div>
                <button type="button" className="admin-primary-btn" onClick={() => setActiveSection("events")}>
                  View all events
                </button>
              </div>
              <div className="admin-table-wrap">
                <table className="admin-table">
                  <thead><tr><th>Event</th><th>Date</th><th>Seats</th><th>Registrations</th></tr></thead>
                  <tbody>
                    {dashboard.events.slice(0, 5).map((event) => (
                      <tr key={event._id}>
                        <td><strong>{event.title}</strong><small>{event.location}</small></td>
                        <td>{formatDate(event.date)}</td>
                        <td>{event.availableSeats} / {event.totalSeats}</td>
                        <td>{event.registrationCount}</td>
                      </tr>
                    ))}
                    {dashboard.events.length === 0 && <tr><td colSpan="4">No events found.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          </>
        )}

        {activeSection === "events" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Event management</h2><p>View, edit, create, or delete events.</p></div>
              <button type="button" className="admin-primary-btn" onClick={() => navigate("/create-event")}>
                Add event
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Event</th><th>Date</th><th>Ticket</th><th>Seats available</th><th>Registrations</th><th>Actions</th></tr></thead>
                <tbody>
                  {filteredEvents.map((event) => (
                    <tr key={event._id}>
                      <td><strong>{event.title}</strong><small>{event.location}</small></td>
                      <td>{formatDate(event.date)}</td>
                      <td>{formatAmount(event.ticketPrice)}</td>
                      <td>{event.availableSeats} / {event.totalSeats}</td>
                      <td>{event.registrationCount}</td>
                      <td className="admin-actions">
                        <button className="admin-text-btn" onClick={() => setEventDraft({
                          _id: event._id,
                          title: event.title || "",
                          description: event.description || "",
                          date: event.date ? new Date(event.date).toISOString().slice(0, 10) : "",
                          time: event.time || "",
                          location: event.location || "",
                          totalSeats: event.totalSeats,
                          ticketPrice: event.ticketPrice,
                        })}>Edit</button>
                        <button className="admin-danger-btn" disabled={busyAction === event._id} onClick={() => removeEvent(event)}>
                          {busyAction === event._id ? "Deleting..." : "Delete"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && <tr><td colSpan="6">No matching events.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === "registrations" && (
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Event registrations</h2><p>User and event details with reported payment status.</p></div></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>User</th><th>Event</th><th>Seats</th><th>Registration status</th><th>Payment report</th><th>Created</th></tr></thead>
                <tbody>
                  {filteredRegistrations.map((registration) => (
                    <tr key={registration._id}>
                      <td><strong>{registration.user?.name || "User unavailable"}</strong><small>{registration.user?.email || "—"}</small></td>
                      <td><strong>{registration.event?.title || "Event unavailable"}</strong><small>{registration.event?.location || ""}</small></td>
                      <td>{(registration.seatNumbers || [registration.seatNumber]).filter(Boolean).join(", ") || "—"}</td>
                      <td><span className="admin-status status-confirmed">Registered</span></td>
                      <td><span className={`admin-status status-${registration.paymentStatus || "unknown"}`}>{registration.paymentStatus || "unknown"}</span><small>{formatAmount(registration.amountPaidReported)}</small></td>
                      <td>{formatDate(registration.createdAt, true)}</td>
                    </tr>
                  ))}
                  {filteredRegistrations.length === 0 && <tr><td colSpan="6">No matching registrations.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="admin-dashboard-note">Event registration payment statuses reflect the existing self-reported confirmation flow; they are not bank-verified payment records.</p>
          </section>
        )}

        {activeSection === "bookings" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Restaurant bookings</h2><p>Actual booking records and their payment progress.</p></div>
              <button
                type="button"
                className="admin-primary-btn"
                onClick={() => {
                  setError("");
                  setNotice("");
                  setBookingDraft({
                    userId: "",
                    eventId: "",
                    restaurantId: "",
                    phone: "",
                    reservationScope: "",
                    reservationSection: "",
                    reservationTime: "",
                    foodQuantities: {},
                    beverageQuantities: {},
                  });
                }}
              >
                Add booking
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Customer</th><th>Event / Restaurant</th><th>Total</th><th>Paid</th><th>Remaining</th><th>Booking status</th><th>Payment status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredBookings.map((booking) => (
                    <tr key={booking._id}>
                      <td><strong>{booking.user?.name || "User unavailable"}</strong><small>{booking.user?.email || "—"}</small></td>
                      <td><strong>{booking.event?.title || "Event unavailable"}</strong><small>{booking.restaurant?.name || "Restaurant unavailable"}</small></td>
                      <td>{formatAmount(booking.totalAmount)}</td>
                      <td>{formatAmount(booking.amountPaid)}</td>
                      <td>{formatAmount(booking.balanceAmount)}</td>
                      <td><span className={`admin-status status-${booking.bookingStatus}`}>{booking.bookingStatus}</span></td>
                      <td><span className={`admin-status status-${booking.paymentStatus}`}>{booking.paymentStatus}</span></td>
                      <td>
                        <button
                          type="button"
                          className="admin-text-btn"
                          onClick={() =>
                            setBookingEditDraft({
                              _id: booking._id,
                              userId: booking.user?._id || "",
                              phone: booking.phone || "",
                            })
                          }
                        >
                          Edit
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && <tr><td colSpan="8">No matching bookings.</td></tr>}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {activeSection === "restaurants" && (
          <section className="admin-panel">
            <div className="admin-panel-heading">
              <div><h2>Restaurants</h2><p>Hotels are not modeled separately in the current backend.</p></div>
              <button type="button" className="admin-primary-btn" onClick={() => setRestaurantDraft({ ...emptyRestaurant })}>
                Add restaurant
              </button>
            </div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Restaurant</th><th>Phone</th><th>Hours</th><th>Status</th><th>Management</th></tr></thead>
                <tbody>
                  {filteredRestaurants.map((restaurant) => (
                    <tr key={restaurant._id}>
                      <td><strong>{restaurant.name}</strong><small>{restaurant.address}</small></td>
                      <td>{restaurant.phone || "—"}</td>
                      <td>{restaurant.openingTime}–{restaurant.closingTime}</td>
                      <td><span className={`admin-status ${restaurant.active ? "status-confirmed" : "status-rejected"}`}>{restaurant.active ? "Active" : "Inactive"}</span></td>
                      <td className="admin-actions admin-actions-wrap">
                        <button className="admin-text-btn" onClick={() => setRestaurantDraft({
                          _id: restaurant._id,
                          name: restaurant.name || "",
                          address: restaurant.address || "",
                          phone: restaurant.phone || "",
                          description: restaurant.description || "",
                          partyAvailability: restaurant.partyAvailability || "contact",
                          partyDescription: restaurant.partyDescription || "",
                          openingTime: restaurant.openingTime || "10:00",
                          closingTime: restaurant.closingTime || "22:00",
                        })}>Edit</button>
                        <button className="admin-text-btn" onClick={() => openVenuePanel(restaurant._id, "tables")}>Tables</button>
                        <button className="admin-text-btn" onClick={() => openVenuePanel(restaurant._id, "menu")}>Menu</button>
                        <button className="admin-text-btn" onClick={() => navigate("/manage-restaurants")}>Hours setup</button>
                        <button className="admin-text-btn" onClick={() => navigate("/manage-food")}>Food images</button>
                        <button className={restaurant.active ? "admin-danger-btn" : "admin-text-btn"} disabled={busyAction === restaurant._id} onClick={() => setRestaurantActive(restaurant)}>
                          {restaurant.active ? "Deactivate" : "Reactivate"}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredRestaurants.length === 0 && <tr><td colSpan="5">No matching restaurants.</td></tr>}
                </tbody>
              </table>
            </div>

            {venuePanel && (
              <div className="admin-venue-panel">
                <div className="admin-panel-heading">
                  <div><h3>{venuePanel.mode === "tables" ? "Restaurant tables" : "Food and beverage options"}</h3><p>Existing bookings and snapshots remain unchanged.</p></div>
                  <button type="button" className="admin-text-btn" onClick={() => { setVenuePanel(null); setVenueData(null); }}>Close</button>
                </div>
                {venuePanel.mode === "tables" ? (
                  <>
                    <form className="admin-inline-form" onSubmit={saveVenueItem}>
                      <label>Table number<input required maxLength="40" value={venueForm.tableNumber} onChange={(event) => setVenueForm({ ...venueForm, tableNumber: event.target.value })} /></label>
                      <label>Section<input required maxLength="80" value={venueForm.section} onChange={(event) => setVenueForm({ ...venueForm, section: event.target.value })} /></label>
                      <label>Capacity<input required type="number" min="1" value={venueForm.capacity} onChange={(event) => setVenueForm({ ...venueForm, capacity: event.target.value })} /></label>
                      <label>Price<input required type="number" min="0" step="0.01" value={venueForm.tablePrice} onChange={(event) => setVenueForm({ ...venueForm, tablePrice: event.target.value })} /></label>
                      <button className="admin-primary-btn" disabled={busyAction === "venue-item"}>Add table</button>
                    </form>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead><tr><th>Table</th><th>Section</th><th>Capacity</th><th>Price</th><th>Action</th></tr></thead>
                        <tbody>{(venueData?.tables || []).map((table) => (
                          <tr key={table._id}><td>{table.tableNumber}</td><td>{table.section}</td><td>{table.capacity}</td><td>{formatAmount(table.price)}</td><td><button className="admin-danger-btn" disabled={busyAction === table._id} onClick={() => removeVenueItem(table, "table")}>Delete</button></td></tr>
                        ))}{venueData && venueData.tables.length === 0 && <tr><td colSpan="5">No tables found.</td></tr>}</tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <>
                    <form className="admin-inline-form" onSubmit={saveVenueItem}>
                      <label>Type<select value={venueForm.type} onChange={(event) => setVenueForm({ ...venueForm, type: event.target.value, category: event.target.value === "food" ? "Food" : "Beverages" })}><option value="food">Food</option><option value="beverage">Beverage</option></select></label>
                      <label>Name<input required maxLength="120" value={venueForm.name} onChange={(event) => setVenueForm({ ...venueForm, name: event.target.value })} /></label>
                      <label>Category<input maxLength="80" value={venueForm.category} onChange={(event) => setVenueForm({ ...venueForm, category: event.target.value })} /></label>
                      <label>Price<input required type="number" min="0" step="0.01" value={venueForm.price} onChange={(event) => setVenueForm({ ...venueForm, price: event.target.value })} /></label>
                      <label className="admin-inline-description">Description<input maxLength="500" value={venueForm.description} onChange={(event) => setVenueForm({ ...venueForm, description: event.target.value })} /></label>
                      <button className="admin-primary-btn" disabled={busyAction === "venue-item"}>Add item</button>
                    </form>
                    <div className="admin-table-wrap">
                      <table className="admin-table">
                        <thead><tr><th>Item</th><th>Category</th><th>Price</th><th>Action</th></tr></thead>
                        <tbody>
                          {[...(venueData?.food || []).map((item) => ({ ...item, itemType: "food" })), ...(venueData?.beverages || []).map((item) => ({ ...item, itemType: "beverage" }))].map((item) => (
                            <tr key={`${item.itemType}-${item._id}`}><td><strong>{item.name}</strong><small>{item.itemType}</small></td><td>{item.category}</td><td>{formatAmount(item.price)}</td><td><button className="admin-danger-btn" disabled={busyAction === item._id} onClick={() => removeVenueItem(item, item.itemType)}>Delete</button></td></tr>
                          ))}
                          {venueData && venueData.food.length + venueData.beverages.length === 0 && <tr><td colSpan="4">No menu items found.</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            )}
          </section>
        )}

        {activeSection === "payments" && (
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Payment records</h2><p>Only persisted booking payment submissions are listed here.</p></div></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Customer / Event</th><th>Stage</th><th>Reference</th><th>Amount</th><th>Paid / Due</th><th>Status</th><th>Action</th></tr></thead>
                <tbody>
                  {filteredPayments.map((payment) => (
                    <tr key={payment._id}>
                      <td><strong>{payment.user?.name || "User unavailable"}</strong><small>{payment.user?.email || "—"} · {payment.event?.title || "Event unavailable"}</small></td>
                      <td>{payment.stage}</td>
                      <td>{payment.transactionReference}</td>
                      <td>{formatAmount(payment.amount)}</td>
                      <td>{formatAmount(payment.amountPaid)} paid<small>{formatAmount(payment.balanceAmount)} remaining</small></td>
                      <td><span className={`admin-status status-${payment.status}`}>{payment.status}</span>{payment.rejectionReason && <small>{payment.rejectionReason}</small>}</td>
                      <td className="admin-actions">
                        {payment.status === "pending_verification" ? (
                          <>
                            <button className="admin-text-btn" disabled={busyAction === String(payment._id)} onClick={() => verifyPayment(payment, "approve")}>Verify</button>
                            <button className="admin-danger-btn" disabled={busyAction === String(payment._id)} onClick={() => verifyPayment(payment, "reject")}>Reject</button>
                          </>
                        ) : <span>—</span>}
                      </td>
                    </tr>
                  ))}
                  {filteredPayments.length === 0 && <tr><td colSpan="7">No actual booking payment records found.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="admin-dashboard-note">Approval updates the existing payment record only after you confirm the payment against your provider or bank records. This dashboard does not create payments or mark them successful automatically.</p>
          </section>
        )}

        {activeSection === "users" && (
          <section className="admin-panel">
            <div className="admin-panel-heading"><div><h2>Registered accounts</h2><p>User details and account roles. Role changes are not available here.</p></div></div>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Joined</th></tr></thead>
                <tbody>
                  {filteredUsers.map((user) => (
                    <tr key={user._id}>
                      <td><strong>{user.name}</strong></td><td>{user.email}</td><td>{user.phone || "—"}</td>
                      <td><span className={`admin-status ${user.role === "admin" ? "status-admin" : "status-confirmed"}`}>{user.role}</span></td>
                      <td>{formatDate(user.createdAt)}</td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && <tr><td colSpan="5">No matching users.</td></tr>}
                </tbody>
              </table>
            </div>
            <p className="admin-dashboard-note">Individual booking details are available in the Bookings section. Passwords are never returned by the admin API.</p>
          </section>
        )}
      </section>

      {eventDraft && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={saveEvent}>
            <div className="admin-modal-heading"><div><span className="admin-eyebrow">EVENT MANAGEMENT</span><h2>Edit event</h2></div><button type="button" className="admin-modal-close" onClick={() => setEventDraft(null)} aria-label="Close">×</button></div>
            <div className="admin-form-grid">
              <label>Title<input required maxLength="120" value={eventDraft.title} onChange={(event) => setEventDraft({ ...eventDraft, title: event.target.value })} /></label>
              <label>Location<input required maxLength="200" value={eventDraft.location} onChange={(event) => setEventDraft({ ...eventDraft, location: event.target.value })} /></label>
              <label>Date<input required type="date" value={eventDraft.date} onChange={(event) => setEventDraft({ ...eventDraft, date: event.target.value })} /></label>
              <label>Time<input required value={eventDraft.time} onChange={(event) => setEventDraft({ ...eventDraft, time: event.target.value })} /></label>
              <label>Total seats<input required type="number" min="1" value={eventDraft.totalSeats} onChange={(event) => setEventDraft({ ...eventDraft, totalSeats: event.target.value })} /></label>
              <label>Ticket price<input required type="number" min="0" step="0.01" value={eventDraft.ticketPrice} onChange={(event) => setEventDraft({ ...eventDraft, ticketPrice: event.target.value })} /></label>
              <label className="admin-form-full">Description<textarea required maxLength="3000" rows="4" value={eventDraft.description} onChange={(event) => setEventDraft({ ...eventDraft, description: event.target.value })} /></label>
            </div>
            <div className="admin-modal-actions"><button type="button" className="admin-secondary-btn" onClick={() => setEventDraft(null)}>Cancel</button><button className="admin-primary-btn" disabled={busyAction === "event"}>{busyAction === "event" ? "Saving..." : "Save changes"}</button></div>
          </form>
        </div>
      )}

      {restaurantDraft && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={saveRestaurant}>
            <div className="admin-modal-heading"><div><span className="admin-eyebrow">VENUE MANAGEMENT</span><h2>{restaurantDraft._id ? "Edit restaurant" : "Add restaurant"}</h2></div><button type="button" className="admin-modal-close" onClick={() => setRestaurantDraft(null)} aria-label="Close">×</button></div>
            <div className="admin-form-grid">
              <label>Name<input required maxLength="120" value={restaurantDraft.name} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, name: event.target.value })} /></label>
              <label>Phone<input maxLength="40" value={restaurantDraft.phone} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, phone: event.target.value })} /></label>
              <label className="admin-form-full">Address<input required maxLength="300" value={restaurantDraft.address} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, address: event.target.value })} /></label>
              <label>Opens<input required type="time" step="3600" value={restaurantDraft.openingTime} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, openingTime: event.target.value })} /></label>
              <label>Closes<input required type="time" step="3600" value={restaurantDraft.closingTime} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, closingTime: event.target.value })} /></label>
              <label>Party bookings<select value={restaurantDraft.partyAvailability} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, partyAvailability: event.target.value })}><option value="contact">Contact to confirm</option><option value="available">Available</option><option value="unavailable">Unavailable</option></select></label>
              <label className="admin-form-full">Description<textarea rows="3" maxLength="2000" value={restaurantDraft.description} onChange={(event) => setRestaurantDraft({ ...restaurantDraft, description: event.target.value })} /></label>
            </div>
            <div className="admin-modal-actions"><button type="button" className="admin-secondary-btn" onClick={() => setRestaurantDraft(null)}>Cancel</button><button className="admin-primary-btn" disabled={busyAction === "restaurant"}>{busyAction === "restaurant" ? "Saving..." : "Save restaurant"}</button></div>
          </form>
        </div>
      )}

      {bookingDraft && (
        <div className="admin-modal-backdrop" role="presentation">
          <form className="admin-modal" onSubmit={createAdminBooking}>
            <div className="admin-modal-heading">
              <div>
                <span className="admin-eyebrow">BOOKING MANAGEMENT</span>
                <h2>Create a real booking</h2>
              </div>
              <button
                type="button"
                className="admin-modal-close"
                onClick={() => {
                  setBookingDraft(null);
                  setBookingResources(null);
                }}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <p className="admin-dashboard-note">
              The booking will be saved as pending with no payment records.
              Payment is recorded only after the customer submits a real
              transaction reference.
            </p>
            <div className="admin-form-grid">
              <label>
                Customer
                <select
                  required
                  value={bookingDraft.userId}
                  onChange={(event) => {
                    const selectedUser = dashboard.users.find(
                      (user) => user._id === event.target.value
                    );
                    setBookingDraft((current) => ({
                      ...current,
                      userId: event.target.value,
                      phone: selectedUser?.phone || current.phone,
                    }));
                  }}
                >
                  <option value="">Select a customer</option>
                  {dashboard.users
                    .filter((user) => user.role !== "admin")
                    .map((user) => (
                      <option key={user._id} value={user._id}>
                        {user.name} — {user.email}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Event
                <select
                  required
                  value={bookingDraft.eventId}
                  onChange={(event) =>
                    setBookingDraft((current) => ({
                      ...current,
                      eventId: event.target.value,
                      reservationTime: "",
                    }))
                  }
                >
                  <option value="">Select an event</option>
                  {dashboard.events.map((event) => (
                    <option key={event._id} value={event._id}>
                      {event.title} — {formatDate(event.date)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Restaurant
                <select
                  required
                  value={bookingDraft.restaurantId}
                  onChange={(event) =>
                    setBookingDraft((current) => ({
                      ...current,
                      restaurantId: event.target.value,
                      reservationScope: "",
                      reservationSection: "",
                      reservationTime: "",
                      foodQuantities: {},
                      beverageQuantities: {},
                    }))
                  }
                >
                  <option value="">Select a restaurant</option>
                  {dashboard.restaurants
                    .filter((restaurant) => restaurant.active)
                    .map((restaurant) => (
                      <option key={restaurant._id} value={restaurant._id}>
                        {restaurant.name}
                      </option>
                    ))}
                </select>
              </label>
              <label>
                Customer phone
                <input
                  required
                  minLength="5"
                  maxLength="40"
                  value={bookingDraft.phone}
                  onChange={(event) =>
                    setBookingDraft((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                />
              </label>
              {bookingDraft.eventId && bookingDraft.restaurantId && (
                <>
                  {loadingBookingResources && (
                    <p className="admin-form-full" role="status">
                      Loading restaurant availability...
                    </p>
                  )}

                  {bookingEditDraft && (
                    <div className="admin-modal-backdrop" role="presentation">
                      <form className="admin-modal" onSubmit={saveBookingEdit}>
                        <div className="admin-modal-heading">
                          <div>
                            <span className="admin-eyebrow">BOOKING MANAGEMENT</span>
                            <h2>Edit booking contact</h2>
                          </div>
                          <button
                            type="button"
                            className="admin-modal-close"
                            onClick={() => setBookingEditDraft(null)}
                            aria-label="Close"
                          >
                            ×
                          </button>
                        </div>
                        <p className="admin-dashboard-note">
                          Customer and phone can be updated. Reservation details and all
                          payment records remain unchanged.
                        </p>
                        <div className="admin-form-grid">
                          <label>
                            Customer
                            <select
                              required
                              value={bookingEditDraft.userId}
                              onChange={(event) =>
                                setBookingEditDraft((current) => ({
                                  ...current,
                                  userId: event.target.value,
                                }))
                              }
                            >
                              <option value="">Select a customer</option>
                              {dashboard.users
                                .filter((user) => user.role === "user")
                                .map((user) => (
                                  <option key={user._id} value={user._id}>
                                    {user.name} — {user.email}
                                  </option>
                                ))}
                            </select>
                          </label>
                          <label>
                            Customer phone
                            <input
                              required
                              minLength="5"
                              maxLength="40"
                              value={bookingEditDraft.phone}
                              onChange={(event) =>
                                setBookingEditDraft((current) => ({
                                  ...current,
                                  phone: event.target.value,
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="admin-modal-actions">
                          <button
                            type="button"
                            className="admin-secondary-btn"
                            onClick={() => setBookingEditDraft(null)}
                          >
                            Cancel
                          </button>
                          <button
                            className="admin-primary-btn"
                            disabled={busyAction === bookingEditDraft._id}
                          >
                            {busyAction === bookingEditDraft._id
                              ? "Saving..."
                              : "Save changes"}
                          </button>
                        </div>
                      </form>
                    </div>
                  )}
                  {bookingResources && (
                    <>
                      <label>
                        Reservation area
                        <select
                          required
                          value={bookingDraft.reservationScope}
                          onChange={(event) =>
                            setBookingDraft((current) => ({
                              ...current,
                              reservationScope: event.target.value,
                              reservationTime: "",
                            }))
                          }
                        >
                          <option value="">Choose an area</option>
                          <option value="restaurant">Whole restaurant</option>
                          <option value="section">One section</option>
                        </select>
                      </label>
                      {bookingDraft.reservationScope === "section" && (
                        <label>
                          Section
                          <select
                            required
                            value={bookingDraft.reservationSection}
                            onChange={(event) =>
                              setBookingDraft((current) => ({
                                ...current,
                                reservationSection: event.target.value,
                                reservationTime: "",
                              }))
                            }
                          >
                            {bookingResources.sections.map((section) => (
                              <option key={section} value={section}>
                                {section}
                              </option>
                            ))}
                          </select>
                        </label>
                      )}
                      {bookingDraft.reservationScope && (
                        <label>
                          Available one-hour slot
                          <select
                            required
                            value={bookingDraft.reservationTime}
                            onChange={(event) =>
                              setBookingDraft((current) => ({
                                ...current,
                                reservationTime: event.target.value,
                              }))
                            }
                          >
                            <option value="">Choose a slot</option>
                            {bookingResources.timeSlots
                              .filter((slot) =>
                                bookingDraft.reservationScope === "restaurant"
                                  ? slot.wholeRestaurantAvailable
                                  : slot.availableSections.includes(
                                      bookingDraft.reservationSection
                                    )
                              )
                              .map((slot) => (
                                <option key={slot.time} value={slot.time}>
                                  {slot.time}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      {bookingDraft.reservationScope && (
                        <p className="admin-form-full admin-dashboard-note">
                          All active tables in the selected area are included
                          in the booking.
                        </p>
                      )}
                      <div className="admin-form-full admin-booking-menu">
                        <h3>Optional food and beverages</h3>
                        {[
                          ["Food", bookingResources.food, "foodQuantities"],
                          [
                            "Beverages",
                            bookingResources.beverages,
                            "beverageQuantities",
                          ],
                        ].map(([label, items, quantityField]) => (
                          <div key={quantityField}>
                            <h4>{label}</h4>
                            {items.length === 0 ? (
                              <p className="admin-dashboard-note">
                                No {label.toLowerCase()} available.
                              </p>
                            ) : (
                              <div className="admin-booking-menu-list">
                                {items.map((item) => {
                                  const quantity =
                                    bookingDraft[quantityField]?.[item._id] || "";
                                  return (
                                    <label
                                      className="admin-booking-menu-item"
                                      key={item._id}
                                    >
                                      <span>
                                        <input
                                          type="checkbox"
                                          checked={Boolean(quantity)}
                                          onChange={(event) =>
                                            setBookingDraft((current) => {
                                              const selections = {
                                                ...current[quantityField],
                                              };
                                              if (event.target.checked) {
                                                selections[item._id] = 1;
                                              } else {
                                                delete selections[item._id];
                                              }
                                              return {
                                                ...current,
                                                [quantityField]: selections,
                                              };
                                            })
                                          }
                                        />
                                        {item.name} — {formatAmount(item.price)}
                                      </span>
                                      {quantity && (
                                        <input
                                          aria-label={`${item.name} quantity`}
                                          type="number"
                                          min="1"
                                          max="50"
                                          value={quantity}
                                          onChange={(event) =>
                                            setBookingDraft((current) => ({
                                              ...current,
                                              [quantityField]: {
                                                ...current[quantityField],
                                                [item._id]: event.target.value,
                                              },
                                            }))
                                          }
                                        />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
            <div className="admin-modal-actions">
              <button
                type="button"
                className="admin-secondary-btn"
                onClick={() => {
                  setBookingDraft(null);
                  setBookingResources(null);
                }}
              >
                Cancel
              </button>
              <button
                className="admin-primary-btn"
                disabled={
                  busyAction === "booking" ||
                  loadingBookingResources ||
                  !bookingResources
                }
              >
                {busyAction === "booking" ? "Creating..." : "Create booking"}
              </button>
            </div>
          </form>
        </div>
      )}
    </main>
  );
}
