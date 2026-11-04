import { useEffect, useState } from "react";
import api from "../api";
import "./RestaurantManager.css";

const initialRestaurant = {
  partyAvailability: "contact",
  partyDescription: "",
  openingTime: "10:00",
  closingTime: "22:00",
};

export default function RestaurantManager() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [restaurant, setRestaurant] = useState(initialRestaurant);
  const [tables, setTables] = useState([]);
  const [sections, setSections] = useState({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get("/restaurants");
        setRestaurants(data.restaurants || []);
        if (data.restaurants?.length) {
          setRestaurantId(data.restaurants[0]._id);
        }
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Could not load restaurants."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    let active = true;
    const loadRestaurant = async () => {
      setError("");
      setMessage("");
      try {
        const [restaurantResponse, tableResponse] = await Promise.all([
          api.get(`/restaurants/${restaurantId}`),
          api.get(`/tables/restaurant/${restaurantId}`),
        ]);
        if (!active) return;

        const details = restaurantResponse.data.restaurant;
        setRestaurant({
          partyAvailability: details.partyAvailability || "contact",
          partyDescription:
            details.partyDescription ||
            "Please contact the restaurant to confirm party availability.",
          openingTime: details.openingTime || "10:00",
          closingTime: details.closingTime || "22:00",
        });
        const venueTables = tableResponse.data.tables || [];
        setTables(venueTables);
        setSections(
          Object.fromEntries(
            venueTables.map((table) => [
              table._id,
              table.section || "Main Dining Area",
            ])
          )
        );
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Could not load restaurant settings."
          );
        }
      }
    };

    loadRestaurant();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const saveSettings = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setMessage("");

    try {
      await api.patch(`/restaurants/${restaurantId}`, restaurant);
      setMessage("Restaurant party settings and opening hours saved.");
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not save restaurant settings."
      );
    } finally {
      setSaving(false);
    }
  };

  const saveSection = async (table) => {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const { data } = await api.patch(`/tables/${table._id}/section`, {
        section: sections[table._id],
      });
      setTables((current) =>
        current.map((item) => (item._id === table._id ? data.table : item))
      );
      setSections((current) => ({
        ...current,
        [table._id]: data.table.section,
      }));
      setMessage(`Section saved for table ${table.tableNumber}.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          `Could not save the section for table ${table.tableNumber}.`
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="restaurant-manager">
      <header className="restaurant-manager-header">
        <span>EVENTHUB ADMIN</span>
        <h1>Restaurant Setup</h1>
        <p>Set party availability, one-hour booking hours, and venue sections.</p>
      </header>

      <section className="restaurant-manager-card">
        <label htmlFor="managed-restaurant">Restaurant</label>
        <select
          id="managed-restaurant"
          value={restaurantId}
          disabled={loading || restaurants.length === 0}
          onChange={(event) => setRestaurantId(event.target.value)}
        >
          <option value="">
            {loading ? "Loading restaurants..." : "Select restaurant"}
          </option>
          {restaurants.map((item) => (
            <option key={item._id} value={item._id}>
              {item.name} — {item.address}
            </option>
          ))}
        </select>

        {error && <p className="restaurant-manager-error" role="alert">{error}</p>}
        {message && <p className="restaurant-manager-message" role="status">{message}</p>}

        {restaurantId && (
          <>
            <form className="restaurant-settings-form" onSubmit={saveSettings}>
              <h2>Party availability and hours</h2>
              <label htmlFor="party-availability">Party bookings</label>
              <select
                id="party-availability"
                value={restaurant.partyAvailability}
                onChange={(event) =>
                  setRestaurant((current) => ({
                    ...current,
                    partyAvailability: event.target.value,
                  }))
                }
              >
                <option value="contact">Contact to confirm</option>
                <option value="available">Available</option>
                <option value="unavailable">Not available</option>
              </select>

              <label htmlFor="party-description">Party information</label>
              <textarea
                id="party-description"
                value={restaurant.partyDescription}
                maxLength={500}
                rows={3}
                onChange={(event) =>
                  setRestaurant((current) => ({
                    ...current,
                    partyDescription: event.target.value,
                  }))
                }
              />

              <div className="restaurant-hours-row">
                <label>
                  Opens at
                  <input
                    type="time"
                    step="3600"
                    value={restaurant.openingTime}
                    onChange={(event) =>
                      setRestaurant((current) => ({
                        ...current,
                        openingTime: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
                <label>
                  Closes at
                  <input
                    type="time"
                    step="3600"
                    value={restaurant.closingTime}
                    onChange={(event) =>
                      setRestaurant((current) => ({
                        ...current,
                        closingTime: event.target.value,
                      }))
                    }
                    required
                  />
                </label>
              </div>
              <p className="restaurant-hours-note">
                Bookings are offered in one-hour slots between these times.
                Closing must be later than opening on the same day.
              </p>
              <button type="submit" disabled={saving}>
                {saving ? "Saving..." : "Save Restaurant Settings"}
              </button>
            </form>

            <div className="restaurant-section-settings">
              <h2>Restaurant sections</h2>
              <p>
                Tables with the same section name are reserved together as one
                area. Use different names to allow separate simultaneous
                bookings.
              </p>
              {tables.length === 0 ? (
                <p>No tables have been configured for this restaurant.</p>
              ) : (
                tables.map((table) => (
                  <div className="restaurant-table-section" key={table._id}>
                    <strong>Table {table.tableNumber}</strong>
                    <input
                      aria-label={`Section for table ${table.tableNumber}`}
                      value={sections[table._id] || ""}
                      maxLength={80}
                      onChange={(event) =>
                        setSections((current) => ({
                          ...current,
                          [table._id]: event.target.value,
                        }))
                      }
                    />
                    <button
                      type="button"
                      disabled={saving}
                      onClick={() => saveSection(table)}
                    >
                      Save
                    </button>
                  </div>
                ))
              )}
            </div>
          </>
        )}
      </section>
    </main>
  );
}
