
import { useNavigate } from "react-router-dom";
import "./Home.css";

const highlights = [
  {
    icon: "🎵",
    title: "Live Music",
    description: "Enjoy concerts, music festivals and live performances.",
  },
  {
    icon: "🎉",
    title: "Amazing Events",
    description: "Discover celebrations, parties and college fests.",
  },
  {
    icon: "🍕",
    title: "Delicious Food",
    description: "Explore Indian food, desserts and refreshing drinks.",
  },
];

export default function Home() {
  const navigate = useNavigate();

  return (
    <main className="home-page">
      <section className="home-hero">
        <div className="home-copy">
          <span className="home-badge">
            ✨ YOUR NEXT EXPERIENCE STARTS HERE
          </span>

          <h1>
            Make Every
            <br />
            Moment <span>Magical.</span>
          </h1>

          <p>
            Discover exciting events, choose your favourite food
            and create unforgettable memories with EventHub.
          </p>

          <div className="home-actions">
            <button
              className="home-primary-btn"
              onClick={() => navigate("/events")}
            >
              Explore Events →
            </button>

            <button
              className="home-secondary-btn"
              onClick={() => navigate("/food")}
            >
              🍽️ Explore Food
            </button>
          </div>

          <div className="home-stats">
            <div>
              <strong>🎟️</strong>
              <span>Easy Booking</span>
            </div>
            <div>
              <strong>🍴</strong>
              <span>Food Choices</span>
            </div>
            <div>
              <strong>💜</strong>
              <span>Happy Moments</span>
            </div>
          </div>
        </div>

        <div className="home-art">
          <div className="home-orbit orbit-one"></div>
          <div className="home-orbit orbit-two"></div>

          <div className="home-ticket">
            <span className="ticket-emoji">🎪</span>
            <span className="ticket-small">YOUR INVITATION</span>
            <h2>Life is better when we're celebrating.</h2>
            <div className="ticket-divider"></div>
            <p>EVENTHUB · YOUR MOMENT · YOUR WAY</p>
          </div>

          <div className="floating-icon floating-one">🎵</div>
          <div className="floating-icon floating-two">🎂</div>
          <div className="floating-icon floating-three">🎟️</div>
        </div>
      </section>

      <section className="home-highlights">
        <div className="home-section-heading">
          <span>WHY EVENTHUB?</span>
          <h2>Everything for a perfect day.</h2>
          <p>Choose an experience that makes you smile.</p>
        </div>

        <div className="home-highlight-grid">
          {highlights.map((item) => (
            <article className="home-highlight-card" key={item.title}>
              <div className="highlight-icon">{item.icon}</div>
              <h3>{item.title}</h3>
              <p>{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="home-bottom" id="contact">
        <div className="home-contact-copy">
          <span>WE’RE HERE TO HELP</span>
          <h2>Contact &amp; Support</h2>
          <dl className="home-contact-details">
            <div>
              <dt>Email</dt>
              <dd>
                <a href="mailto:event.management.system26@gmail.com">
                  event.management.system 26@gmail.com
                </a>
              </dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>
                <a href="tel:+919438550079">9438550079</a>
              </dd>
            </div>
            <div>
              <dt>Address</dt>
              <dd>Bhubaneswar, Odisha</dd>
            </div>
            <div>
              <dt>Support hours</dt>
              <dd>Monday–Saturday, 10 AM–6 PM</dd>
            </div>
          </dl>
        </div>

        <aside className="contact-qr-card" aria-label="PhonePe payment QR code">
          <h3>Scan &amp; Pay with PhonePe</h3>
          <img
            src="/contact-qr.jpg"
            alt="PhonePe QR code for Gayatri Sahoo"
            loading="lazy"
          />
          <p>PhonePe · Gayatri Sahoo</p>
        </aside>
      </section>

      <footer className="home-footer" id="help">
        <strong>🎟️ EventHub</strong>
        <span>Made for moments worth remembering. 💜</span>
        <span>Need help? Contact our support team.</span>
      </footer>
    </main>
  );
}
