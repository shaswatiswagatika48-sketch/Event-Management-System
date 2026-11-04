import { useEffect, useState } from "react";
import api from "../api";
import FoodImage from "../components/FoodImage";
import "./FoodImageManager.css";

export default function FoodImageManager() {
  const [restaurants, setRestaurants] = useState([]);
  const [restaurantId, setRestaurantId] = useState("");
  const [foodItems, setFoodItems] = useState([]);
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingFood, setLoadingFood] = useState(false);
  const [savingItemId, setSavingItemId] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchRestaurants = async () => {
      try {
        const { data } = await api.get("/restaurants");
        const items = data.restaurants || [];
        setRestaurants(items);
        if (items.length > 0) setRestaurantId(items[0]._id);
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Could not load restaurants. Please try again."
        );
      } finally {
        setLoadingRestaurants(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (!restaurantId) {
      setFoodItems([]);
      return;
    }

    let active = true;
    const fetchFood = async () => {
      setLoadingFood(true);
      setError("");
      setMessage("");
      try {
        const { data } = await api.get(
          `/food/manage/restaurant/${restaurantId}`
        );
        if (active) setFoodItems(data.food || []);
      } catch (requestError) {
        if (active) {
          setFoodItems([]);
          setError(
            requestError.response?.data?.message ||
              "Could not load this restaurant's food items."
          );
        }
      } finally {
        if (active) setLoadingFood(false);
      }
    };

    fetchFood();
    return () => {
      active = false;
    };
  }, [restaurantId]);

  const uploadImage = async (item, file) => {
    if (!file) return;

    setSavingItemId(item._id);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("image", file);
      const { data } = await api.patch(
        `/food/${item._id}/image`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setFoodItems((current) =>
        current.map((food) =>
          food._id === item._id ? data.food : food
        )
      );
      setMessage(`Picture updated for ${item.name}.`);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not upload this picture. Please try again."
      );
    } finally {
      setSavingItemId("");
    }
  };

  return (
    <main className="food-image-manager">
      <header className="food-image-manager-header">
        <span>EVENTHUB ADMIN</span>
        <h1>Food Pictures</h1>
        <p>Upload a picture for each food item in every restaurant menu.</p>
      </header>

      <section className="food-image-manager-content">
        <label htmlFor="food-image-restaurant">Choose a restaurant</label>
        <select
          id="food-image-restaurant"
          value={restaurantId}
          onChange={(event) => setRestaurantId(event.target.value)}
          disabled={loadingRestaurants || restaurants.length === 0}
        >
          <option value="">
            {loadingRestaurants ? "Loading restaurants..." : "Select restaurant"}
          </option>
          {restaurants.map((restaurant) => (
            <option key={restaurant._id} value={restaurant._id}>
              {restaurant.name} — {restaurant.address}
            </option>
          ))}
        </select>

        {error && <p className="food-image-manager-error" role="alert">{error}</p>}
        {message && <p className="food-image-manager-message" role="status">{message}</p>}
        {loadingFood && <p role="status">Loading food items...</p>}
        {!loadingRestaurants && restaurants.length === 0 && !error && (
          <p>No restaurants are available.</p>
        )}
        {!loadingFood && restaurantId && foodItems.length === 0 && !error && (
          <p>No food items are available for this restaurant.</p>
        )}

        <div className="food-image-manager-list">
          {foodItems.map((item) => (
            <article className="food-image-manager-item" key={item._id}>
              <div className="food-image-manager-preview">
                <FoodImage item={item} className="food-image-manager-photo" />
              </div>
              <div className="food-image-manager-details">
                <span>{item.category || "Food"}</span>
                <h2>{item.name}</h2>
                <p>₹{Number(item.price).toLocaleString("en-IN")}</p>
                <label className="food-image-upload">
                  {savingItemId === item._id
                    ? "Uploading..."
                    : item.image
                      ? "Replace picture"
                      : "Upload picture"}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={savingItemId !== ""}
                    onChange={(event) => {
                      const [file] = event.target.files || [];
                      uploadImage(item, file);
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
