import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";
import FoodImage from "../components/FoodImage";
import "./Food.css";

function Food() {
  const navigate = useNavigate();
  const [restaurants, setRestaurants] = useState([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState("");
  const [foodItems, setFoodItems] = useState([]);
  const [beverageItems, setBeverageItems] = useState([]);
  const [selectedFoods, setSelectedFoods] = useState([]);
  const [selectedBeverages, setSelectedBeverages] = useState([]);
  const [menuType, setMenuType] = useState("food");
  const [activeCategory, setActiveCategory] = useState("All");
  const [loadingRestaurants, setLoadingRestaurants] = useState(true);
  const [loadingFood, setLoadingFood] = useState(false);
  const [error, setError] = useState("");

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
      } finally {
        setLoadingRestaurants(false);
      }
    };

    fetchRestaurants();
  }, []);

  useEffect(() => {
    if (!selectedRestaurantId) {
      return;
    }

    const fetchFood = async () => {
      setLoadingFood(true);
      setError("");

      try {
          const [foodResponse, beverageResponse] = await Promise.all([
            api.get(`/food/restaurant/${selectedRestaurantId}`),
            api.get(`/beverages/restaurant/${selectedRestaurantId}`)
          ]);
          setFoodItems(foodResponse.data.food || []);
          setBeverageItems(beverageResponse.data.beverages || []);
        } catch (requestError) {
          setFoodItems([]);
          setBeverageItems([]);
          setError(
            requestError.response?.data?.message ||
              "Could not load this restaurant's food and beverage menus."
        );
      } finally {
        setLoadingFood(false);
      }
    };

    fetchFood();
  }, [selectedRestaurantId]);

  const currentMenu = menuType === "food" ? foodItems : beverageItems;
  const currentSelection =
    menuType === "food" ? selectedFoods : selectedBeverages;
  const categories = useMemo(
    () => ["All", ...new Set(currentMenu.map((item) => item.category || (menuType === "food" ? "Food" : "Beverages")))],
    [currentMenu, menuType]
  );
  const filteredFoods =
    activeCategory === "All"
      ? currentMenu
      : currentMenu.filter((item) => (item.category || (menuType === "food" ? "Food" : "Beverages")) === activeCategory);
  const totalFood = selectedFoods.reduce(
    (total, selected) => total + selected.price * selected.quantity, 0
  );
  const totalBeverages = selectedBeverages.reduce(
    (total, selected) => total + selected.price * selected.quantity, 0
  );
  const totalAmount = totalFood + totalBeverages;

  const updateQuantity = (item, change, menuKind = menuType) => {
    const setSelection = menuKind === "food" ? setSelectedFoods : setSelectedBeverages;
    setSelection((current) => {
      const selected = current.find((food) => food._id === item._id);
      if (!selected && change > 0) {
        return [...current, { ...item, quantity: 1 }];
      }
      return current
        .map((food) =>
          food._id === item._id
            ? { ...food, quantity: food.quantity + change }
            : food
        )
        .filter((food) => food.quantity > 0);
    });
  };

  const continueToBooking = () => {
    navigate("/booking", {
      state: {
        restaurantId: selectedRestaurantId,
        foodItems: selectedFoods.map((food) => ({
          itemId: food._id,
          quantity: food.quantity
        })),
        beverageItems: selectedBeverages.map((beverage) => ({
          itemId: beverage._id,
          quantity: beverage.quantity
        }))
      }
    });
  };

  return (
    <main className="food-page">
      <header className="food-header">
        <h1>🍽️ Explore Restaurant Menus</h1>
        <p>Choose a restaurant and add food to your event registration.</p>
      </header>

      <div className="food-restaurant-picker">
        <label htmlFor="food-restaurant">Choose a restaurant</label>
        <select
          id="food-restaurant"
          value={selectedRestaurantId}
          onChange={(event) => {
            setSelectedFoods([]);
            setSelectedBeverages([]);
            setFoodItems([]);
            setBeverageItems([]);
            setActiveCategory("All");
            setSelectedRestaurantId(event.target.value);
          }}
          disabled={loadingRestaurants}
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
      </div>

      {error && <p className="food-status food-error" role="alert">{error}</p>}

      {!loadingRestaurants && restaurants.length === 0 && !error && (
        <p className="empty-food-message">
          No restaurants are available yet. Please check back later.
        </p>
      )}

      {loadingFood && <p className="food-status">Loading menu...</p>}

      {!loadingFood && selectedRestaurantId && (
        <>
          <div className="food-menu-toggle" role="group" aria-label="Menu type">
            <button
              type="button"
              className={menuType === "food" ? "active" : ""}
              onClick={() => {
                setMenuType("food");
                setActiveCategory("All");
              }}
            >
              Food ({foodItems.length})
            </button>
            <button
              type="button"
              className={menuType === "beverages" ? "active" : ""}
              onClick={() => {
                setMenuType("beverages");
                setActiveCategory("All");
              }}
            >
              Beverages ({beverageItems.length})
            </button>
          </div>

          {currentMenu.length === 0 ? (
            <p className="empty-food-message">
              No {menuType === "food" ? "food" : "beverages"} are available at
              this restaurant yet. Try the other menu or choose another restaurant.
            </p>
          ) : (
          <>
          <div className="food-categories">
            {categories.map((category) => (
              <button
                type="button"
                key={category}
                className={`category-btn ${activeCategory === category ? "active" : ""}`}
                onClick={() => setActiveCategory(category)}
              >
                {category}
              </button>
            ))}
          </div>

          <section className="food-grid">
            {filteredFoods.map((item) => {
              const selected = currentSelection.find(
                (food) => food._id === item._id
              );
              const itemMenuType = menuType;
              return (
                <article className="food-card" key={item._id}>
                  <FoodImage item={item} className="food-image" />
                  <div className="food-content">
                    <span className="food-category">{item.category || "Food"}</span>
                    <h2>{item.name}</h2>
                    <p className="food-description">
                      {item.description ||
                        (menuType === "food"
                          ? "A delicious choice for your event."
                          : "A refreshing drink for your event.")}
                    </p>
                    <div className="food-price-row">
                      <div className="food-price">
                        <strong>₹{Number(item.price).toLocaleString("en-IN")}</strong>
                        <small>per item</small>
                      </div>
                      {selected ? (
                        <div className="quantity-control">
                          <button
                            type="button"
                            aria-label={`Remove one ${item.name}`}
                            onClick={() => updateQuantity(item, -1, itemMenuType)}
                          >
                            −
                          </button>
                          <span>{selected.quantity}</span>
                          <button
                            type="button"
                            aria-label={`Add one ${item.name}`}
                            onClick={() => updateQuantity(item, 1, itemMenuType)}
                          >
                            +
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          className="add-food-btn"
                          onClick={() => updateQuantity(item, 1, itemMenuType)}
                        >
                          + Add
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </section>
          </>
          )}

          <aside className="food-cart">
            <div className="food-cart-info">
              <span>
                {selectedFoods.reduce((sum, food) => sum + food.quantity, 0) +
                  selectedBeverages.reduce((sum, beverage) => sum + beverage.quantity, 0)} items selected
              </span>
              <strong>
                Food ₹{totalFood.toLocaleString("en-IN")} · Beverages ₹{totalBeverages.toLocaleString("en-IN")} · Total ₹{totalAmount.toLocaleString("en-IN")}
              </strong>
            </div>
            <button
              type="button"
              className="continue-food-btn"
              disabled={selectedFoods.length === 0 && selectedBeverages.length === 0}
              onClick={continueToBooking}
            >
              Continue to Event Registration →
            </button>
          </aside>
          </>
      )}
    </main>
  );
}

export default Food;
