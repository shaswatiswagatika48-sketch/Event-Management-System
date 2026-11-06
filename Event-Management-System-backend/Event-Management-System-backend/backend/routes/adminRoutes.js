import express from "express";
import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import Booking from "../models/bookingModel.js";
import Event from "../models/eventModel.js";
import Restaurant from "../models/restaurantModel.js";
import RestaurantSlotReservation from "../models/restaurantSlotReservationModel.js";
import Registration from "../models/registrationModel.js";
import User from "../models/userModel.js";
import { protect, adminOnly } from "../middleware/authMiddleware.js";
import { deleteEvent, updateEvent } from "../controllers/eventController.js";

const router = express.Router();

const isValidAdminSetupKey = (adminKey) =>
  Boolean(process.env.ADMIN_SETUP_KEY) &&
  adminKey === process.env.ADMIN_SETUP_KEY;

const isValidRestaurantHours = (openingTime, closingTime) => {
  const timePattern = /^([01]\d|2[0-3]):00$/;
  return (
    timePattern.test(openingTime) &&
    timePattern.test(closingTime) &&
    openingTime < closingTime
  );
};

router.post("/promote", async (req, res) => {
  try {
    const { email, adminKey } = req.body;

    if (!isValidAdminSetupKey(adminKey)) {
      return res.status(403).json({ message: "Invalid admin setup key." });
    }

    if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return res.status(400).json({ message: "Email is required." });
    }

    if (await User.exists({ role: "admin" })) {
      return res.status(409).json({
        message: "An admin account already exists. Use the existing admin account to manage the site."
      });
    }

    const user = await User.findOneAndUpdate(
      { email: email.trim().toLowerCase() },
      { $set: { role: "admin" } },
      { new: true, runValidators: true }
    ).select("name email role");

    if (!user) {
      return res.status(404).json({
        message: "No account was found with that email. Register the account first."
      });
    }

    return res.json({
      message: "Account promoted to admin successfully.",
      user
    });
  } catch (error) {
    console.error("Could not promote admin account:", error);
    return res.status(500).json({ message: "Could not promote account to admin." });
  }
});

router.get("/dashboard", protect, adminOnly, async (req, res) => {
  try {
    const [events, registrations, users, restaurants, bookings] = await Promise.all([
      Event.find().sort({ date: 1 }).lean(),
      Registration.find()
        .populate("user", "name email phone")
        .populate("event", "title date time location")
        .sort({ createdAt: -1 })
        .lean(),
      User.find().select("name email phone role createdAt").sort({ createdAt: -1 }).lean(),
      Restaurant.find().sort({ name: 1 }).lean(),
      Booking.find()
        .populate("user", "name email phone")
        .populate("event", "title date time location")
        .populate("restaurant", "name address")
        .sort({ createdAt: -1 })
        .lean()
    ]);

    const statsByEvent = new Map();
    for (const registration of registrations) {
      const eventId = String(registration.event?._id || registration.event);
      const stats = statsByEvent.get(eventId) || {
        registrationCount: 0,
        paymentReportedCount: 0,
        verifiedPaymentCount: 0,
        amountReported: 0
      };
      stats.registrationCount += 1;
      if (["self_reported", "verified"].includes(registration.paymentStatus)) {
        stats.paymentReportedCount += 1;
        stats.amountReported += registration.amountPaidReported || 0;
      }
      if (registration.paymentStatus === "verified") {
        stats.verifiedPaymentCount += 1;
      }
      statsByEvent.set(eventId, stats);
    }

    const eventsWithStats = events.map((event) => {
      const eventStats = statsByEvent.get(String(event._id));
      return {
        ...event,
        registrationCount: eventStats?.registrationCount || 0,
        paymentReportedCount: eventStats?.paymentReportedCount || 0,
        verifiedPaymentCount: eventStats?.verifiedPaymentCount || 0,
        amountReported: eventStats?.amountReported || 0
      };
    });

    const payments = bookings.flatMap((booking) =>
      (booking.payments || []).map((payment) => ({
        ...payment,
        _id: payment._id,
        bookingId: booking._id,
        bookingStatus: booking.bookingStatus,
        paymentStatus: booking.paymentStatus,
        totalAmount: booking.totalAmount,
        amountPaid: booking.amountPaid,
        balanceAmount: booking.balanceAmount,
        user: booking.user,
        event: booking.event,
        restaurant: booking.restaurant,
        createdAt: booking.createdAt
      }))
    );

    const totals = payments.reduce(
      (result, payment) => {
        if (payment.status === "approved") {
          result.approvedPaymentAmount += payment.amount || 0;
        }
        if (payment.status === "pending_verification") {
          result.pendingPaymentAmount += payment.amount || 0;
          result.pendingPaymentCount += 1;
        }
        return result;
      },
      {
        approvedPaymentAmount: 0,
        pendingPaymentAmount: 0,
        pendingPaymentCount: 0
      }
    );

    return res.json({
      stats: {
        eventCount: events.length,
        userCount: users.filter((user) => user.role !== "admin").length,
        registrationCount: registrations.length,
        restaurantCount: restaurants.length,
        bookingCount: bookings.length,
        paymentCount: payments.length,
        pendingPaymentCount: totals.pendingPaymentCount,
        approvedPaymentAmount: totals.approvedPaymentAmount,
        pendingPaymentAmount: totals.pendingPaymentAmount,
        outstandingBalance: bookings.reduce(
          (sum, booking) => sum + (booking.balanceAmount || 0),
          0
        )
      },
      events: eventsWithStats,
      registrations,
      users,
      restaurants,
      bookings,
      payments
    });
  } catch (error) {
    console.error("Could not load admin dashboard:", error);
    return res.status(500).json({ message: "Could not load admin dashboard." });
  }
});

router.post("/restaurants", protect, adminOnly, async (req, res) => {
  try {
    const { name, address, phone, description, image, partyAvailability, partyDescription, openingTime, closingTime } = req.body;
    if (
      typeof name !== "string" || !name.trim() || name.trim().length > 120 ||
      typeof address !== "string" || !address.trim() || address.trim().length > 300
    ) {
      return res.status(400).json({
        message: "Restaurant name (up to 120 characters) and address (up to 300 characters) are required."
      });
    }
    if (
      !isValidRestaurantHours(
        openingTime || "10:00",
        closingTime || "22:00"
      )
    ) {
      return res.status(400).json({
        message: "Restaurant hours must be valid whole-hour times, with closing after opening."
      });
    }

    const restaurant = await Restaurant.create({
      name: name.trim(),
      address: address.trim(),
      phone: typeof phone === "string" ? phone.trim().slice(0, 40) : "",
      description: typeof description === "string" ? description.trim().slice(0, 2000) : "",
      image: typeof image === "string" ? image.trim().slice(0, 1000) : "",
      partyAvailability,
      partyDescription,
      openingTime,
      closingTime
    });
    return res.status(201).json({ message: "Restaurant added successfully.", restaurant });
  } catch (error) {
    return res.status(400).json({ message: "Could not add restaurant.", error: error.message });
  }
});

router.patch("/restaurants/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Restaurant ID is invalid." });
    }

    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    const previousOpeningTime = restaurant.openingTime;
    const previousClosingTime = restaurant.closingTime;
    const stringFields = ["name", "address", "phone", "description", "image", "partyDescription"];
    for (const field of stringFields) {
      if (req.body[field] === undefined) continue;
      if (typeof req.body[field] !== "string") {
        return res.status(400).json({ message: `${field} must be text.` });
      }
      const value = req.body[field].trim();
      const maxLength = field === "name" ? 120 : field === "address" ? 300 : field === "description" ? 2000 : 1000;
      if (value.length > maxLength || (["name", "address"].includes(field) && !value)) {
        return res.status(400).json({ message: `${field} is empty or too long.` });
      }
      restaurant[field] = value;
    }

    if (req.body.partyAvailability !== undefined) {
      if (!["available", "unavailable", "contact"].includes(req.body.partyAvailability)) {
        return res.status(400).json({ message: "Party availability is invalid." });
      }
      restaurant.partyAvailability = req.body.partyAvailability;
    }
    if (req.body.active !== undefined) {
      if (typeof req.body.active !== "boolean") {
        return res.status(400).json({ message: "active must be true or false." });
      }
      restaurant.active = req.body.active;
    }
    for (const field of ["openingTime", "closingTime"]) {
      if (req.body[field] !== undefined) restaurant[field] = req.body[field];
    }
    if (!isValidRestaurantHours(restaurant.openingTime, restaurant.closingTime)) {
      return res.status(400).json({
        message: "Restaurant hours must be valid whole-hour times, with closing after opening."
      });
    }
    if (
      restaurant.openingTime !== previousOpeningTime ||
      restaurant.closingTime !== previousClosingTime
    ) {
      const reservationDate = new Date();
      reservationDate.setUTCHours(0, 0, 0, 0);
      const conflictingReservation = await RestaurantSlotReservation.exists({
        restaurant: restaurant._id,
        reservationDate: { $gte: reservationDate },
        $or: [
          { reservationTime: { $lt: restaurant.openingTime } },
          { reservationTime: { $gte: restaurant.closingTime } }
        ]
      });
      if (conflictingReservation) {
        return res.status(409).json({
          message: "Restaurant hours cannot exclude an active future reservation slot."
        });
      }
    }

    await restaurant.save();
    return res.json({ message: "Restaurant updated successfully.", restaurant });
  } catch (error) {
    return res.status(400).json({ message: "Could not update restaurant.", error: error.message });
  }
});

router.delete("/restaurants/:id", protect, adminOnly, async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Restaurant ID is invalid." });
    }
    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { $set: { active: false } },
      { new: true, runValidators: true }
    );
    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }
    return res.json({
      message: "Restaurant deactivated. Historical booking references are preserved.",
      restaurant
    });
  } catch (error) {
    return res.status(500).json({ message: "Could not deactivate restaurant." });
  }
});

router.put("/events/:id", protect, adminOnly, updateEvent);
router.delete("/events/:id", protect, adminOnly, deleteEvent);

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, adminKey } = req.body;

    // Admin registration key must be configured in .env
    if (!isValidAdminSetupKey(adminKey)) {
      return res.status(403).json({
        message: "Invalid admin setup key."
      });
    }

    if (
      typeof name !== "string" || !name.trim() ||
      typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim()) ||
      typeof password !== "string" || password.length < 6
    ) {
      return res.status(400).json({
        message: "Valid name and email and a password of at least 6 characters are required."
      });
    }

    if (await User.exists({ role: "admin" })) {
      return res.status(409).json({
        message: "An admin account already exists. Use the existing admin account to manage the site."
      });
    }

    const existingUser = await User.findOne({
      email: email.toLowerCase()
    });

    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered. Use your existing account."
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      phone: phone || "",
      role: "admin"
    });

    return res.status(201).json({
      message: "Admin account created successfully.",
      user: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    });
  } catch (error) {
    console.error("Admin registration failed:", error);
    return res.status(500).json({
      message: "Admin registration failed."
    });
  }
});

export default router;