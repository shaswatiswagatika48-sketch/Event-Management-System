import mongoose from "mongoose";
import Event from "../models/eventModel.js";
import Restaurant from "../models/restaurantModel.js";
import Table from "../models/tableModel.js";
import Food from "../models/foodModel.js";
import Beverage from "../models/beverageModel.js";
import Booking from "../models/bookingModel.js";
import User from "../models/userModel.js";
import {
  getRestaurantAvailability,
  releaseRestaurantSlot,
  reserveRestaurantSlot,
  validateReservationSelection
} from "../utils/restaurantAvailability.js";

const normalizeItems = (items) => Array.isArray(items) ? items : [];

const getBookingDetails = async ({
  eventId,
  restaurantId,
  tableIds,
  foodItems,
  beverageItems,
  reservationTime,
  reservationScope,
  reservationSection
}) => {
  if (
    !eventId ||
    !restaurantId ||
    !Array.isArray(tableIds) ||
    !tableIds.length ||
    !reservationTime ||
    !reservationScope
  ) {
    throw new Error(
      "Event, restaurant, tables, reservation time, and reservation scope are required."
    );
  }

  const [event, restaurant, tables] = await Promise.all([
    Event.findById(eventId),
    Restaurant.findById(restaurantId),
    Table.find({
      _id: { $in: tableIds },
      restaurant: restaurantId,
      active: true
    })
  ]);

  if (!event || !restaurant) {
    throw new Error("Event or restaurant not found.");
  }

  if (tables.length !== new Set(tableIds.map(String)).size) {
    throw new Error("Invalid table selection.");
  }

  const allTables = await Table.find({
    restaurant: restaurantId,
    active: true
  }).select("_id section");
  const selectedSections =
    reservationScope === "restaurant"
      ? allTables
      : allTables.filter(
          (table) => (table.section || "Main Dining Area") === reservationSection
        );
  if (
    selectedSections.length !== new Set(tableIds.map(String)).size ||
    selectedSections.some((table) => !tableIds.map(String).includes(String(table._id)))
  ) {
    throw new Error("Selected tables must match the restaurant or section reservation.");
  }

  const available = await getRestaurantAvailability(restaurant, event);
  validateReservationSelection({
    restaurant,
    event,
    reservationTime,
    reservationScope,
    reservationSection,
    sections: available.sections
  });
  const timeSlot = available.timeSlots.find(
    (slot) => slot.time === reservationTime
  );
  const slotAvailable =
    reservationScope === "restaurant"
      ? timeSlot?.wholeRestaurantAvailable
      : timeSlot?.availableSections.includes(reservationSection);
  if (!slotAvailable) {
    throw new Error("This restaurant section is already booked for that time.");
  }

  const food = normalizeItems(foodItems);
  const beverages = normalizeItems(beverageItems);

  const foodDocs = food.length
    ? await Food.find({
        _id: { $in: food.map(x => x.itemId) },
        restaurant: restaurantId,
        available: true
      })
    : [];

  const beverageDocs = beverages.length
    ? await Beverage.find({
        _id: { $in: beverages.map(x => x.itemId) },
        restaurant: restaurantId,
        available: true
      })
    : [];

  if (foodDocs.length !== food.length) {
    throw new Error("Invalid food item selected.");
  }

  if (beverageDocs.length !== beverages.length) {
    throw new Error("Invalid beverage selected.");
  }

  const foodNormalized = food.map(x => {
    const item = foodDocs.find(
      d => String(d._id) === String(x.itemId)
    );
    const quantity = Math.max(1, Math.floor(Number(x.quantity) || 1));

    return {
      item: item._id,
      name: item.name,
      quantity,
      unitPrice: item.price,
      total: item.price * quantity
    };
  });

  const beverageNormalized = beverages.map(x => {
    const item = beverageDocs.find(
      d => String(d._id) === String(x.itemId)
    );
    const quantity = Math.max(1, Math.floor(Number(x.quantity) || 1));

    return {
      item: item._id,
      name: item.name,
      quantity,
      unitPrice: item.price,
      total: item.price * quantity
    };
  });

  const tableSnapshots = tables.map(t => ({
    table: t._id,
    tableNumber: t.tableNumber,
    capacity: t.capacity,
    price: t.price
  }));

  const subtotal =
    tables.reduce((sum, t) => sum + t.price, 0) +
    foodNormalized.reduce((sum, x) => sum + x.total, 0) +
    beverageNormalized.reduce((sum, x) => sum + x.total, 0);

  return {
    event,
    restaurant,
    reservationTime,
    reservationScope,
    reservationSection,
    reservationDate: available.reservationDate,
    tableSnapshots,
    foodNormalized,
    beverageNormalized,
    subtotal
  };
};

export const calculateBooking = async (req, res) => {
  try {
    const details = await getBookingDetails(req.body);

    res.json({
      event: {
        id: details.event._id,
        title: details.event.title
      },
      restaurant: {
        id: details.restaurant._id,
        name: details.restaurant.name
      },
      tables: details.tableSnapshots,
      foodItems: details.foodNormalized,
      beverageItems: details.beverageNormalized,
      subtotal: details.subtotal,
      totalAmount: details.subtotal,
      advanceAmount: Math.ceil(details.subtotal * 50) / 100 * 100,
      balanceAmount: details.subtotal - Math.ceil(details.subtotal / 2),
      currency: "INR"
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not calculate booking.",
      error: error.message
    });
  }
};

export const createBookingOrder = async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ message: "Phone is required." });
    }

    const details = await getBookingDetails(req.body);
    const total = details.subtotal;
    const advance = Math.ceil(total / 2);
    const balance = total - advance;

    const qrCodeUrl = process.env.PHONEPE_QR_IMAGE_URL;

    if (!qrCodeUrl) {
      return res.status(503).json({
        message: "PhonePe QR image is not configured."
      });
    }

    const bookingId = new mongoose.Types.ObjectId();
    const reservation = await reserveRestaurantSlot({
      restaurant: details.restaurant,
      event: details.event,
      bookingId,
      bookingType: "booking",
      reservationTime: details.reservationTime,
      reservationScope: details.reservationScope,
      reservationSection: details.reservationSection
    });
    let booking;
    try {
      booking = await Booking.create({
        _id: bookingId,
        user: req.user._id,
        event: details.event._id,
        restaurant: details.restaurant._id,
        reservationDate: reservation.reservationDate,
        reservationTime: details.reservationTime,
        reservationScope: details.reservationScope,
        reservationSection:
          details.reservationScope === "section"
            ? details.reservationSection
            : "",
        tables: details.tableSnapshots,
        foodItems: details.foodNormalized,
        beverageItems: details.beverageNormalized,
        phone,
        subtotal: total,
        totalAmount: total,
        amountPaid: 0,
        balanceAmount: total,
        advanceAmount: advance,
        paymentStatus: "pending",
        bookingStatus: "pending",
        payments: []
      });
    } catch (error) {
      await releaseRestaurantSlot(bookingId, "booking");
      throw error;
    }

    res.status(201).json({
      message: "Booking created. Pay the advance using PhonePe QR.",
      bookingId: booking._id,
      totalAmount: total,
      advanceAmount: advance,
      balanceAmount: balance,
      currency: "INR",
      qrCodeUrl,
      nextStep: "Submit your transaction reference after payment."
    });
  } catch (error) {
    res.status(400).json({
      message: "Could not create booking.",
      error: error.message
    });
  }
};

export const createAdminBooking = async (req, res) => {
  try {
    const { userId, phone, foodItems = [], beverageItems = [] } = req.body;

    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Choose a valid user." });
    }
    if (typeof phone !== "string" || phone.trim().length < 5 || phone.trim().length > 40) {
      return res.status(400).json({
        message: "Phone must contain between 5 and 40 characters."
      });
    }
    if (!Array.isArray(foodItems) || !Array.isArray(beverageItems)) {
      return res.status(400).json({
        message: "Food and beverage selections must be lists."
      });
    }

    for (const [label, items] of [["Food", foodItems], ["Beverage", beverageItems]]) {
      const ids = items.map((item) => String(item?.itemId || ""));
      if (
        ids.some((id) => !mongoose.isValidObjectId(id)) ||
        new Set(ids).size !== ids.length ||
        items.some(
          (item) =>
            !Number.isInteger(Number(item.quantity)) ||
            Number(item.quantity) < 1 ||
            Number(item.quantity) > 50
        )
      ) {
        return res.status(400).json({
          message: `${label} selections must have unique valid items and quantities from 1 to 50.`
        });
      }
    }

    const user = await User.findById(userId).select("_id");
    if (!user) {
      return res.status(404).json({ message: "Selected user was not found." });
    }

    const details = await getBookingDetails(req.body);
    const bookingId = new mongoose.Types.ObjectId();
    const reservation = await reserveRestaurantSlot({
      restaurant: details.restaurant,
      event: details.event,
      bookingId,
      bookingType: "booking",
      reservationTime: details.reservationTime,
      reservationScope: details.reservationScope,
      reservationSection: details.reservationSection
    });

    let booking;
    try {
      booking = await Booking.create({
        _id: bookingId,
        user: user._id,
        event: details.event._id,
        restaurant: details.restaurant._id,
        reservationDate: reservation.reservationDate,
        reservationTime: details.reservationTime,
        reservationScope: details.reservationScope,
        reservationSection:
          details.reservationScope === "section"
            ? details.reservationSection
            : "",
        tables: details.tableSnapshots,
        foodItems: details.foodNormalized,
        beverageItems: details.beverageNormalized,
        phone: phone.trim(),
        subtotal: details.subtotal,
        totalAmount: details.subtotal,
        advanceAmount: Math.ceil(details.subtotal / 2),
        amountPaid: 0,
        balanceAmount: details.subtotal,
        paymentStatus: "pending",
        bookingStatus: "pending",
        payments: []
      });
    } catch (error) {
      await releaseRestaurantSlot(bookingId, "booking");
      throw error;
    }

    await booking.populate([
      { path: "user", select: "name email phone" },
      { path: "event", select: "title date time location" },
      { path: "restaurant", select: "name address" }
    ]);

    return res.status(201).json({
      message: "Booking created. No payment has been recorded.",
      booking
    });
  } catch (error) {
    return res.status(400).json({
      message: "Could not create booking.",
      error: error.message
    });
  }
};

export const updateAdminBooking = async (req, res) => {
  try {
    const { bookingId } = req.params;
    const { userId, phone } = req.body;

    if (!mongoose.isValidObjectId(bookingId)) {
      return res.status(400).json({ message: "Booking ID is invalid." });
    }
    if (!mongoose.isValidObjectId(userId)) {
      return res.status(400).json({ message: "Choose a valid customer." });
    }
    if (
      typeof phone !== "string" ||
      phone.trim().length < 5 ||
      phone.trim().length > 40
    ) {
      return res.status(400).json({
        message: "Phone must contain between 5 and 40 characters."
      });
    }

    const [booking, user] = await Promise.all([
      Booking.findById(bookingId),
      User.findOne({ _id: userId, role: "user" }).select("_id")
    ]);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }
    if (!user) {
      return res.status(404).json({ message: "Selected customer was not found." });
    }

    booking.user = user._id;
    booking.phone = phone.trim();
    await booking.save();
    await booking.populate([
      { path: "user", select: "name email phone" },
      { path: "event", select: "title date time location" },
      { path: "restaurant", select: "name address" }
    ]);

    return res.json({
      message: "Booking customer and contact details updated. Reservation and payment details were not changed.",
      booking
    });
  } catch (error) {
    return res.status(500).json({
      message: "Could not update booking.",
      error: error.message
    });
  }
};

export const submitPayment = async (req, res) => {
  try {
    const { bookingId, transactionReference } = req.body;

    if (!bookingId || !transactionReference?.trim()) {
      return res.status(400).json({
        message: "Booking ID and transaction reference are required."
      });
    }

    const booking = await Booking.findOne({
      _id: bookingId,
      user: req.user._id
    });

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const alreadyUsed = await Booking.exists({
      _id: { $ne: booking._id },
      "payments.transactionReference": transactionReference.trim()
    });

    if (alreadyUsed) {
      return res.status(409).json({
        message: "This transaction reference has already been submitted."
      });
    }

    const stage = booking.amountPaid === 0 ? "advance" : "balance";
    const amount = stage === "advance"
      ? booking.advanceAmount
      : booking.totalAmount - booking.amountPaid;

    if (amount <= 0 || booking.bookingStatus === "rejected") {
      return res.status(400).json({
        message: "No payment is currently due for this booking."
      });
    }

    const pendingPayment = booking.payments.some(
      p => p.status === "pending_verification"
    );

    if (pendingPayment) {
      return res.status(409).json({
        message: "A payment is already awaiting admin verification."
      });
    }

    booking.payments.push({
      stage,
      amount,
      transactionReference: transactionReference.trim(),
      status: "pending_verification",
      submittedAt: new Date()
    });

    booking.paymentStatus = "pending_verification";
    await booking.save();

    res.json({
      message: "Payment reference submitted. Await admin verification.",
      bookingId: booking._id,
      stage,
      amount,
      paymentStatus: booking.paymentStatus
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not submit payment.",
      error: error.message
    });
  }
};

export const verifyPayment = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({
        message: "Admin access required."
      });
    }

    const { bookingId, paymentId, action, rejectionReason } = req.body;

    if (!bookingId || !paymentId || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        message: "Booking ID, payment ID and valid action are required."
      });
    }

    const booking = await Booking.findById(bookingId);

    if (!booking) {
      return res.status(404).json({ message: "Booking not found." });
    }

    const payment = booking.payments.id(paymentId);

    if (!payment || payment.status !== "pending_verification") {
      return res.status(400).json({
        message: "Pending payment not found."
      });
    }

    if (action === "reject") {
      payment.status = "rejected";
      payment.rejectionReason = rejectionReason || "Payment could not be verified.";
      booking.paymentStatus = booking.amountPaid > 0 ? "partially_paid" : "pending";
      await booking.save();

      return res.json({
        message: "Payment rejected.",
        booking
      });
    }

    // Admin must confirm the actual transaction in PhonePe/bank records
    // before sending action: "approve".
    payment.status = "approved";
    payment.verifiedAt = new Date();
    payment.verifiedBy = req.user._id;

    booking.amountPaid += payment.amount;
    booking.balanceAmount = Math.max(
      0,
      booking.totalAmount - booking.amountPaid
    );

    if (booking.balanceAmount === 0) {
      booking.paymentStatus = "paid";
      booking.bookingStatus = "confirmed";
    } else {
      booking.paymentStatus = "partially_paid";
      booking.bookingStatus = "pending";
    }

    await booking.save();

    res.json({
      message: "Payment approved.",
      booking
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not verify payment.",
      error: error.message
    });
  }
};

export const getMyBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ user: req.user._id })
      .populate("event", "title date time location")
      .populate("restaurant", "name address")
      .sort({ createdAt: -1 });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch bookings.",
      error: error.message
    });
  }
};

export const getPendingPayments = async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required." });
    }

    const bookings = await Booking.find({
      "payments.status": "pending_verification"
    })
      .populate("user", "name email")
      .populate("event", "title date")
      .sort({ createdAt: -1 });

    res.json({ count: bookings.length, bookings });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch pending payments.",
      error: error.message
    });
  }
};
