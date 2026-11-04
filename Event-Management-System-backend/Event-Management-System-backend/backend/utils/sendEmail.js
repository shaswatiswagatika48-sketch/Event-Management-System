import nodemailer from "nodemailer";

const getTransporter = () => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    return null;
  }

  return nodemailer.createTransport({
    service: "gmail",
    family: 4,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });
};

const getPurposeText = (purpose) => {
  if (purpose === "event_creation") return "creating your event";
  return "registering for the event";
};

export const sendOtpEmail = async ({ to, name, otp, purpose }) => {
  const transporter = getTransporter();

  if (!transporter) {
    throw new Error("Email settings are missing in .env");
  }

  await transporter.sendMail({
    from: `"EventHub" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Your EventHub OTP",
    html: `
      <h2>EventHub OTP</h2>
      <p>Hi <b>${name}</b>,</p>
      <p>Your OTP for ${getPurposeText(purpose)} is:</p>
      <h1>${otp}</h1>
      <p>This OTP is valid for 10 minutes.</p>
      <p>Please do not share this OTP with anyone.</p>
    `
  });
};

const formatDate = (date) =>
  new Date(date).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  });

export const sendRegistrationEmail = async ({
  to,
  name,
  event,
  seatNumbers = [],
  seatNumber,
  paymentReported = false,
  restaurant,
  tables = [],
  foodItems = [],
  beverageItems = [],
  totalAmountReported = event.ticketPrice
}) => {
  const transporter = getTransporter();
  if (!transporter) return { sent: false };

  await transporter.sendMail({
    from: `"EventHub" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Event Registration Successful - ${event.title}`,
    html: `
      <h2>Event Registration Successful</h2>
      <p>Hi <b>${name}</b>,</p>
      <p>Your registration for <b>${event.title}</b> was successful.</p>
      <p><b>Date:</b> ${formatDate(event.date)}</p>
      <p><b>Time:</b> ${event.time}</p>
      <p><b>Location:</b> ${event.location}</p>
      <p><b>Your seat${seatNumbers.length === 1 ? "" : "s"}:</b> ${
        seatNumbers.length ? seatNumbers.join(", ") : seatNumber
      }</p>
      <p><b>Total Seats:</b> ${event.totalSeats}</p>
      <p><b>Ticket Price:</b> ₹${event.ticketPrice}</p>
      ${restaurant ? `<p><b>Restaurant:</b> ${restaurant.name}</p>` : ""}
      ${tables.length ? `<p><b>Tables reserved:</b> ${tables.map((table) => table.tableNumber).join(", ")} (${tables.length} table${tables.length === 1 ? "" : "s"}, ${tables.reduce((sum, table) => sum + table.capacity, 0)} seats)</p>` : ""}
      ${foodItems.length ? `<p><b>Food order:</b></p><ul>${foodItems.map((item) => `<li>${item.name} × ${item.quantity} — ₹${item.total}</li>`).join("")}</ul>` : ""}
      ${foodItems.length ? `<p><b>Food total:</b> ₹${foodItems.reduce((sum, item) => sum + item.total, 0)}</p>` : ""}
      ${beverageItems.length ? `<p><b>Beverages:</b></p><ul>${beverageItems.map((item) => `<li>${item.name} × ${item.quantity} — ₹${item.total}</li>`).join("")}</ul>` : ""}
      ${beverageItems.length ? `<p><b>Beverage total:</b> ₹${beverageItems.reduce((sum, item) => sum + item.total, 0)}</p>` : ""}
      <p><b>Total paid amount reported:</b> ₹${totalAmountReported}</p>
      ${paymentReported ? "<p><b>Payment:</b> You reported that payment was completed using the PhonePe QR. This static QR payment is not automatically verified by EventHub.</p>" : ""}
      ${foodItems.length || beverageItems.length ? "<p>Food and beverage selection and payment amounts are based on the restaurant menu at registration.</p>" : ""}
      <p>We look forward to seeing you at the event!</p>
    `
  });

  return { sent: true };
};

export const sendEventCreatedEmail = async ({ to, name, event, restaurant }) => {
  const transporter = getTransporter();
  if (!transporter) return { sent: false };

  await transporter.sendMail({
    from: `"EventHub" <${process.env.EMAIL_USER}>`,
    to,
    subject: `Event Created - ${event.title}`,
    html: `
      <h2>Event Created Successfully</h2>
      <p>Hi <b>${name}</b>,</p>
      <p>Your event <b>${event.title}</b> has been created.</p>
      <p><b>Date:</b> ${formatDate(event.date)}</p>
      <p><b>Time:</b> ${event.time}</p>
      <p><b>Location:</b> ${event.location}</p>
      <p><b>Total Seats:</b> ${event.totalSeats}</p>
      <p><b>Ticket Price:</b> ₹${event.ticketPrice}</p>
      ${restaurant ? `<p><b>Restaurant:</b> ${restaurant.name}</p>` : ""}
      ${event.reservationTime ? `<p><b>Restaurant area:</b> ${event.reservationScope === "section" ? event.reservationSection : "Whole restaurant"}</p><p><b>Restaurant time:</b> ${event.reservationTime}–${event.reservationEndTime || `${String(Number(event.reservationTime.slice(0, 2)) + 1).padStart(2, "0")}:00`}</p>` : ""}
      ${event.restaurantTables?.length ? `<p><b>Tables:</b> ${event.restaurantTables.map((table) => table.tableNumber).join(", ")} (${event.restaurantTables.reduce((sum, table) => sum + table.capacity, 0)} seats)</p>` : ""}
      ${event.restaurantFoodItems?.length ? `<p><b>Food:</b></p><ul>${event.restaurantFoodItems.map((item) => `<li>${item.name} × ${item.quantity} — ₹${item.total}</li>`).join("")}</ul>` : ""}
      ${event.restaurantBeverageItems?.length ? `<p><b>Beverages:</b></p><ul>${event.restaurantBeverageItems.map((item) => `<li>${item.name} × ${item.quantity} — ₹${item.total}</li>`).join("")}</ul>` : ""}
    `
  });

  return { sent: true };
};

export default sendRegistrationEmail;
