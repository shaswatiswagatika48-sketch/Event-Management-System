import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./OTP.css";

function OTP() {
  const location = useLocation();
  const navigate = useNavigate();

  const booking = location.state;

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    paymentMode: "UPI",
  });

  const [errors, setErrors] = useState({});

  // If user directly opens /otp without booking
  if (!booking || !booking.event) {
    return (
      <div className="details-page">
        <div className="details-error-card">
          <div className="error-icon">⚠️</div>

          <h2>No Booking Found</h2>

          <p>
            Please select an event and continue your booking first.
          </p>

          <button
            onClick={() => navigate("/events")}
            className="go-events-btn"
          >
            Explore Events
          </button>
        </div>
      </div>
    );
  }

  const {
    event,
    bookingType,
    chairs,
    pricePerChair,
    totalAmount,
    advanceAmount,
    remainingAmount,
  } = booking;

  // Current booking date
  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  const handleChange = (e) => {
    const { name, value } = e.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));

    setErrors((previous) => ({
      ...previous,
      [name]: "",
    }));
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = "Please enter your name";
    }

    if (!formData.phone.trim()) {
      newErrors.phone = "Please enter your phone number";
    } else if (!/^[6-9]\d{9}$/.test(formData.phone)) {
      newErrors.phone = "Enter a valid 10-digit phone number";
    }

    if (!formData.email.trim()) {
      newErrors.email = "Please enter your email";
    } else if (
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)
    ) {
      newErrors.email = "Enter a valid email address";
    }

    if (!formData.address.trim()) {
      newErrors.address = "Please enter your address";
    }

    setErrors(newErrors);

    return Object.keys(newErrors).length === 0;
  };

  const handleConfirmBooking = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    const finalBooking = {
      ...booking,
      customer: formData,
      bookingDate: today,
    };

    console.log("FINAL BOOKING:", finalBooking);

    alert("🎉 Booking confirmed successfully!");

    // Go back to home after confirmation
    navigate("/home");
  };

  return (
    <div className="details-page">

      {/* Heading */}
      <div className="details-heading">
        <span>EVENTHUB</span>

        <h1>Complete Your Booking</h1>

        <p>
          Enter your details and choose your preferred payment method.
        </p>
      </div>

      <div className="details-container">

        {/* =========================
            LEFT SIDE - CUSTOMER FORM
        ========================= */}

        <div className="customer-card">

          <h2>👤 Personal Details</h2>

          <form onSubmit={handleConfirmBooking}>

            {/* Name */}
            <div className="form-group">
              <label htmlFor="name">
                Full Name
              </label>

              <input
                id="name"
                type="text"
                name="name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={handleChange}
              />

              {errors.name && (
                <small className="form-error">
                  {errors.name}
                </small>
              )}
            </div>

            {/* Phone */}
            <div className="form-group">
              <label htmlFor="phone">
                Phone Number
              </label>

              <input
                id="phone"
                type="tel"
                name="phone"
                placeholder="Enter 10-digit phone number"
                maxLength="10"
                value={formData.phone}
                onChange={handleChange}
              />

              {errors.phone && (
                <small className="form-error">
                  {errors.phone}
                </small>
              )}
            </div>

            {/* Email */}
            <div className="form-group">
              <label htmlFor="email">
                Email Address
              </label>

              <input
                id="email"
                type="email"
                name="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleChange}
              />

              {errors.email && (
                <small className="form-error">
                  {errors.email}
                </small>
              )}
            </div>

            {/* Address */}
            <div className="form-group">
              <label htmlFor="address">
                Address
              </label>

              <textarea
                id="address"
                name="address"
                rows="4"
                placeholder="Enter your complete address"
                value={formData.address}
                onChange={handleChange}
              />

              {errors.address && (
                <small className="form-error">
                  {errors.address}
                </small>
              )}
            </div>

            {/* Payment */}
            <h2 className="payment-title">
              💳 Payment Method
            </h2>

            <div className="payment-options">

              <label
                className={
                  formData.paymentMode === "UPI"
                    ? "payment-option active"
                    : "payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="UPI"
                  checked={formData.paymentMode === "UPI"}
                  onChange={handleChange}
                />

                <span className="payment-icon">📱</span>

                <div>
                  <strong>UPI</strong>
                  <small>Google Pay / PhonePe / Paytm</small>
                </div>
              </label>

              <label
                className={
                  formData.paymentMode === "CARD"
                    ? "payment-option active"
                    : "payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="CARD"
                  checked={formData.paymentMode === "CARD"}
                  onChange={handleChange}
                />

                <span className="payment-icon">💳</span>

                <div>
                  <strong>Card</strong>
                  <small>Credit / Debit Card</small>
                </div>
              </label>

              <label
                className={
                  formData.paymentMode === "CASH"
                    ? "payment-option active"
                    : "payment-option"
                }
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value="CASH"
                  checked={formData.paymentMode === "CASH"}
                  onChange={handleChange}
                />

                <span className="payment-icon">💵</span>

                <div>
                  <strong>Cash</strong>
                  <small>Pay at registration</small>
                </div>
              </label>

            </div>

            {/* Confirm */}
            <button
              type="submit"
              className="confirm-details-btn"
            >
              Confirm Booking 🎉
            </button>

          </form>
        </div>

        {/* =========================
            RIGHT SIDE - SUMMARY
        ========================= */}

        <div className="final-summary-card">

          <h2>📋 Booking Summary</h2>

          {/* Event */}
          <div className="summary-event">

            <div className="summary-event-emoji">
              {event.emoji}
            </div>

            <div>
              <h3>{event.title}</h3>

              <p>
                📍 {event.location}
              </p>

              <p>
                📅 {event.date}
              </p>
            </div>

          </div>

          <div className="final-summary-row">
            <span>Booking Type</span>
            <strong>{bookingType}</strong>
          </div>

          <div className="final-summary-row">
            <span>Number of Chairs</span>
            <strong>{chairs}</strong>
          </div>

          <div className="final-summary-row">
            <span>Price / Chair</span>
            <strong>₹{pricePerChair}</strong>
          </div>

          <div className="final-summary-row">
            <span>Booking Date</span>
            <strong>{today}</strong>
          </div>

          <div className="final-total">
            <span>Total Amount</span>
            <strong>₹{totalAmount}</strong>
          </div>

          <div className="payment-summary">

            <div>
              <span>Pay Now</span>
              <strong>₹{advanceAmount}</strong>
            </div>

            <div>
              <span>Remaining</span>
              <strong>₹{remainingAmount}</strong>
            </div>

          </div>

          <div className="secure-note">
            🔒 Your booking information is secure.
          </div>

        </div>

      </div>
    </div>
  );
}

export default OTP;