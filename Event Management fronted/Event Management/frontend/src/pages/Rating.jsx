import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import api from "../api";
import "./Rating.css";

export default function Rating() {
  const location = useLocation();
  const { registrationId } = useParams();
  const [eventTitle, setEventTitle] = useState("");
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const loadRegistration = async () => {
      try {
        const { data } = await api.get("/registrations/my");
        const registration = data.registrations.find(
          (item) => item._id === registrationId
        );

        if (!registration) {
          setError("We couldn't find this registration in your account.");
          return;
        }

        setEventTitle(registration.event?.title || "your event");
        if (registration.rating) {
          setRating(registration.rating);
          setFeedback(registration.ratingFeedback || "");
          setSubmitted(true);
        }
      } catch (requestError) {
        setError(
          requestError.response?.data?.message ||
            "Could not load your registration. Please try again."
        );
      } finally {
        setLoading(false);
      }
    };

    loadRegistration();
  }, [registrationId]);

  const submitRating = async (event) => {
    event.preventDefault();
    if (rating < 1 || rating > 5) {
      setError("Choose a star rating before submitting.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      await api.patch(`/registrations/${registrationId}/rating`, {
        rating,
        feedback,
      });
      setSubmitted(true);
    } catch (requestError) {
      setError(
        requestError.response?.data?.message ||
          "Could not save your rating. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="rating-page">
      <section className="rating-card">
        <span className="rating-eyebrow">EVENTHUB</span>
        {loading ? (
          <p role="status">Loading your registration...</p>
        ) : submitted ? (
          <>
            <h1>Thank you for your feedback!</h1>
            <p>Your rating for {eventTitle} has been saved.</p>
            <Link to="/events" className="rating-submit">
              Browse Events
            </Link>
          </>
        ) : error && !eventTitle ? (
          <>
            <h1>Rating unavailable</h1>
            <p className="rating-error" role="alert">{error}</p>
            <Link to="/events" className="rating-submit">
              Browse Events
            </Link>
          </>
        ) : (
          <>
            <h1>How was your registration?</h1>
            <p>
              Share your experience registering for <strong>{eventTitle}</strong>.
            </p>
            {(location.state?.seatNumbers?.length > 0 || location.state?.seatNumber) && (
              <p>
                Your selected seats:{" "}
                <strong>
                  {(location.state.seatNumbers || [location.state.seatNumber]).join(", ")}
                </strong>
              </p>
            )}
            {typeof location.state?.emailSent === "boolean" && (
              <p className="rating-email-status" role="status">
                {location.state.emailSent
                  ? "Your registration confirmation was sent to your email."
                  : "Your registration is complete, but the confirmation email could not be sent."}
              </p>
            )}
            <form onSubmit={submitRating}>
              <fieldset className="rating-stars">
                <legend>Your rating</legend>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    className={star <= rating ? "selected" : ""}
                    aria-label={`${star} star${star === 1 ? "" : "s"}`}
                    aria-pressed={rating === star}
                    onClick={() => setRating(star)}
                  >
                    ★
                  </button>
                ))}
              </fieldset>
              <label htmlFor="rating-feedback">
                Feedback <span>(optional)</span>
              </label>
              <textarea
                id="rating-feedback"
                value={feedback}
                onChange={(event) => setFeedback(event.target.value)}
                maxLength={1000}
                rows={4}
                placeholder="Tell us about your registration experience"
              />
              {error && <p className="rating-error" role="alert">{error}</p>}
              <button
                type="submit"
                className="rating-submit"
                disabled={saving || rating === 0}
              >
                {saving ? "Submitting..." : "Submit Rating"}
              </button>
            </form>
          </>
        )}
      </section>
    </main>
  );
}
