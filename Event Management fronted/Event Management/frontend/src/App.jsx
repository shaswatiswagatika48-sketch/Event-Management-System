
import { useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";

import Login from "./Login";
import Register from "./Register";
import Home from "./pages/Home";
import Event from "./pages/Event";
import Food from "./pages/Food";
import Booking from "./pages/Booking";
import OTP from "./pages/OTP";
import Payment from "./pages/Payment";
import CreateEvent from "./pages/CreateEvent";
import Rating from "./pages/Rating";
import FoodImageManager from "./pages/FoodImageManager";
import RestaurantManager from "./pages/RestaurantManager";

import "./App.css";

function AppContent() {
  const location = useLocation();

  const [isLoggedIn, setIsLoggedIn] = useState(
    localStorage.getItem("eventhubLoggedIn") === "true"
  );
  const [isAdmin, setIsAdmin] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}").role === "admin";
    } catch {
      return false;
    }
  });

  const handleLogin = (user) => {
    localStorage.setItem("eventhubLoggedIn", "true");
    setIsLoggedIn(true);
    setIsAdmin(user?.role === "admin");
  };

  const handleRegister = (user) => {
    localStorage.setItem("eventhubLoggedIn", "true");
    setIsLoggedIn(true);
    setIsAdmin(user?.role === "admin");
  };

  const handleLogout = () => {
    localStorage.removeItem("eventhubLoggedIn");
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    localStorage.removeItem("selectedEvent");
    localStorage.removeItem("selectedFood");

    setIsLoggedIn(false);
    setIsAdmin(false);
  };

  const isLoginPage = location.pathname === "/login";

  return (
    <>
      {!isLoginPage && (
        <nav className="navbar">
          <Link to="/" className="logo">
            🎟️ EventHub
          </Link>

          <div className="nav-links">
            <a className="nav-info-link" href="/#contact">
              <span>Contact</span>
              <small>Get in touch</small>
            </a>
            <a className="nav-info-link" href="/#help">
              <span>Help</span>
              <small>Booking support</small>
            </a>

            {isLoggedIn ? (
              <>
                <Link to="/create-event">Create Event</Link>
                <button
                  type="button"
                  className="logout-btn"
                  onClick={handleLogout}
                >
                  Logout
                </button>
              </>
            ) : (
              <Link to="/login">Login</Link>
            )}
          </div>
        </nav>
      )}

      <Routes>
        <Route path="/" element={<Home />} />

        <Route
          path="/login"
          element={
            isLoggedIn ? (
              <Navigate to="/events" replace />
            ) : (
              <Login onLogin={handleLogin} />
            )
          }
        />

        <Route
          path="/register"
          element={
            isLoggedIn ? (
              <Navigate to="/events" replace />
            ) : (
              <Register onRegister={handleRegister} />
            )
          }
        />

        <Route
          path="/events"
          element={
            isLoggedIn ? <Event /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/create-event"
          element={
            isLoggedIn ? <CreateEvent /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/food"
          element={
            isLoggedIn ? <Food /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/manage-food"
          element={
            isAdmin ? <FoodImageManager /> : <Navigate to="/events" replace />
          }
        />

        <Route
          path="/manage-restaurants"
          element={
            isAdmin ? <RestaurantManager /> : <Navigate to="/events" replace />
          }
        />

        <Route
          path="/booking"
          element={
            isLoggedIn ? <Booking /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/rating/:registrationId"
          element={
            isLoggedIn ? <Rating /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/otp"
          element={
            isLoggedIn ? <OTP /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="/payment"
          element={
            isLoggedIn ? <Payment /> : <Navigate to="/login" replace />
          }
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
