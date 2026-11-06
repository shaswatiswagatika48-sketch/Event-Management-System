import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import api from "./api";
import "./Login.css";

export default function Login({ onLogin }) {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    email: "",
    password: "",
  });

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (e) => {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  };

  const submit = async (e) => {
    e.preventDefault();

    setLoading(true);
    setMessage("");

    try {
      const { data } = await api.post("/users/login", form);

      // Save login information
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Tell App.jsx that login was successful
      if (onLogin) {
        onLogin(data.user);
      }

      // Go to Explore Events
      navigate(data.user?.role === "admin" ? "/admin" : "/events");
    } catch (error) {
      setMessage(
        error.response?.data?.message ||
        "Invalid email or password. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="auth-page">
      <section className="auth-card">

        {/* LEFT SIDE */}
        <div className="auth-side">
          <div className="calendar-icon">✦</div>

          <div className="auth-art">🎟️</div>

          <h2>Welcome to EventHub</h2>

          <p>
            Discover amazing events, delicious food and
            unforgettable experiences.
          </p>
        </div>

        {/* RIGHT SIDE */}
        <div className="auth-form">

          <h1>Welcome Back! 👋</h1>

          <p className="subtitle">
            Login to continue to EventHub
          </p>

          {message && (
            <div className="error">
              {message}
            </div>
          )}

          <form onSubmit={submit}>

            {/* EMAIL */}
            <label>
              Email

              <input
                type="email"
                name="email"
                value={form.email}
                onChange={handleChange}
                placeholder="Enter your email"
                required
              />
            </label>

            {/* PASSWORD */}
            <label>
              Password

              <div className="password-input-wrap">
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                />
                <button
                  type="button"
                  className="password-visibility-btn"
                  onClick={() => setShowPassword((visible) => !visible)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                  title={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M3 3l18 18M10.6 10.6a2 2 0 002.8 2.8" />
                      <path d="M9.9 5.2A10.8 10.8 0 0112 5c5.5 0 9 7 9 7a15.7 15.7 0 01-3.1 3.8M6.2 6.2C3.9 7.8 2.5 10 2.5 12c0 0 3.5 7 9.5 7 1.1 0 2.1-.3 3-.7" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                  )}
                </button>
              </div>
            </label>

            {/* LOGIN BUTTON */}
            <button
              type="submit"
              className="primary-btn full"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Sign In"}
            </button>

          </form>

          <p className="auth-link">
            Don't have an account?{" "}
            <Link to="/register">
              Sign Up
            </Link>
          </p>

        </div>
      </section>
    </main>
  );
}
