import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import "./Payment.css";

export default function Payment() {
  const navigate = useNavigate();
  const location = useLocation();

  const bookingData = location.state || {};

  const totalAmount =
    Number(bookingData.totalAmount) ||
    Number(localStorage.getItem("eventhubTotalAmount")) ||
    0;

  const bookingId =
    bookingData.bookingId ||
    localStorage.getItem("eventhubBookingId");

  const advanceAmount = Math.ceil(totalAmount / 2);
  const remainingAmount = totalAmount - advanceAmount;

  const [paymentMethod, setPaymentMethod] = useState("PhonePe");
  const [transactionReference, setTransactionReference] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState("");
  const [error, setError] = useState("");

  const handlePayment = async () => {
    setError("");

    if (totalAmount <= 0) {
      setError("Booking amount not found. Please complete your booking first.");
      return;
    }

    if (!bookingId) {
      setError(
        "Booking ID not found. Please connect this page to your booking first."
      );
      return;
    }

    if (!transactionReference.trim()) {
      setError("Please enter your UTR / transaction reference.");
      return;
    }

    const token =
      localStorage.getItem("token") ||
      localStorage.getItem("authToken");

    if (!token) {
      setError("Please log in again before submitting your payment.");
      return;
    }

    setSubmitting(true);

    try {
      const response = await fetch(
        "http://localhost:5000/api/bookings/submit-payment",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            bookingId,
            transactionReference: transactionReference.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Payment submission failed.");
      }

      setPaymentStatus("pending_verification");
    } catch (err) {
      setError(
        err.message ||
          "Could not submit payment. Please check your server connection."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (paymentStatus === "pending_verification") {
    return (
      <div className="payment-page">
        <div className="success-card">
          <div className="pending-icon">?</div>

          <h1>Payment Submitted!</h1>

          <p>
            Your payment details have been submitted for admin verification.
          </p>

          <div className="confirmation-box">
            <p>
              <strong>Total Amount:</strong> ?{totalAmount}
            </p>
            <p>
              <strong>Advance Submitted:</strong> ?{advanceAmount}
            </p>
            <p>
              <strong>Remaining Balance:</strong> ?{remainingAmount}
            </p>
            <p>
              <strong>Transaction Reference:</strong>{" "}
              {transactionReference}
            </p>
            <p>
              <strong>Status:</strong> Pending Verification
            </p>
          </div>

          <p>
            Your booking is not confirmed until the payment is approved.
          </p>

          <button className="payment-btn" onClick={() => navigate("/")}>
            Back to Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="payment-page">
      <div className="payment-card">
        <h1>?? Payment</h1>

        <p className="payment-subtitle">
          Pay your booking advance using PhonePe
        </p>

        <div className="amount-box">
          <span>Total Booking Amount</span>
          <strong>?{totalAmount}</strong>
        </div>

        <div className="payment-summary">
          <div>
            <span>Pay Now (50%)</span>
            <strong>?{advanceAmount}</strong>
          </div>

          <div>
            <span>Remaining Balance</span>
            <strong>?{remainingAmount}</strong>
          </div>
        </div>

        <h3>Pay using PhonePe</h3>

        <div className="phonepe-qr-box">
          <img
            src="/phonepe-qr.png"
            alt="PhonePe payment QR code"
            className="phonepe-qr"
          />

          <p>
            Scan the QR code using PhonePe or another supported UPI app.
          </p>

          <p className="qr-amount">
            Please pay exactly ?{advanceAmount}
          </p>
        </div>

        <label className="transaction-label" htmlFor="transactionReference">
          UTR / Transaction Reference Number
        </label>

        <input
          id="transactionReference"
          className="transaction-input"
          type="text"
          value={transactionReference}
          onChange={(e) => setTransactionReference(e.target.value)}
          placeholder="Enter your transaction reference"
          autoComplete="off"
        />

        {error && <p className="payment-error">{error}</p>}

        <button
          className="payment-btn"
          onClick={handlePayment}
          disabled={submitting}
        >
          {submitting ? "Submitting..." : "Submit Payment for Verification"}
        </button>

        <p className="payment-note">
          Your booking will remain pending until the admin verifies your
          payment.
        </p>

        <button className="back-btn" onClick={() => navigate("/otp")}>
          ? Back to OTP
        </button>
      </div>
    </div>
  );
}
