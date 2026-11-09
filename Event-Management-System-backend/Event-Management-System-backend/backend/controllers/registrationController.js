import mongoose from "mongoose";
import Event from "../models/eventModel.js";
import Registration from "../models/registrationModel.js";
import Restaurant from "../models/restaurantModel.js";
import Table from "../models/tableModel.js";
import Food from "../models/foodModel.js";
import Beverage from "../models/beverageModel.js";
import { isOtpVerified, clearOtp } from "./otpController.js";
import { sendRegistrationEmail } from "../utils/sendEmail.js";
import {
  releaseRestaurantSlot,
  reserveRestaurantSlot
} from "../utils/restaurantAvailability.js";
import { isHiddenEventTitle } from "../utils/eventVisibility.js";

const getAvailableSeatNumbers = async (event) => {
  const registrations = await Registration.find({ event: event._id })
    .select("seatNumber seatNumbers")
    .lean();
  const occupiedSeats = new Set();
  for (const registration of registrations) {
    const assignedSeats = Array.isArray(registration.seatNumbers)
      ? registration.seatNumbers
      : [];
    for (const seatNumber of assignedSeats) {
      if (Number.isInteger(seatNumber) && seatNumber > 0) {
        occupiedSeats.add(seatNumber);
      }
    }
    if (
      assignedSeats.length === 0 &&
      Number.isInteger(registration.seatNumber) &&
      registration.seatNumber > 0
    ) {
      occupiedSeats.add(registration.seatNumber);
    }
  }
  let legacyRegistrationCount = registrations.filter(
    (registration) =>
      (!Array.isArray(registration.seatNumbers) ||
        registration.seatNumbers.length === 0) &&
      (!Number.isInteger(registration.seatNumber) || registration.seatNumber < 1)
  ).length;

  for (let seatNumber = 1; seatNumber <= event.totalSeats; seatNumber += 1) {
    if (legacyRegistrationCount <= 0) break;
    if (!occupiedSeats.has(seatNumber)) {
      occupiedSeats.add(seatNumber);
      legacyRegistrationCount -= 1;
    }
  }

  return Array.from(
    { length: event.totalSeats },
    (_, index) => index + 1
  )
    .filter((seatNumber) => !occupiedSeats.has(seatNumber))
    .slice(0, event.availableSeats);
};

export const getEventSeats = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId).select(
      "totalSeats availableSeats"
    );
    if (!event || isHiddenEventTitle(event.title)) {
      return res.status(404).json({ message: "Event not found." });
    }
    const availableSeatNumbers = await getAvailableSeatNumbers(event);
    res.json({ availableSeatNumbers });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch available seats.",
      error: error.message
    });
  }
};

export const registerForEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.eventId);

    if (!event || isHiddenEventTitle(event.title)) {
      return res.status(404).json({ message: "Event not found." });
    }

    if (typeof event.ticketPrice !== "number") {
      return res.status(400).json({
        message: "Ticket price is not configured for this event."
      });
    }

    const {
      restaurantId,
      tableIds = [],
      foodItems = [],
      beverageItems = [],
      reservationTime = "",
      reservationScope = "",
      reservationSection = "",
      seatNumbers,
      seatNumber
    } = req.body;
    if (
      !Array.isArray(tableIds) ||
      !Array.isArray(foodItems) ||
      !Array.isArray(beverageItems)
    ) {
      return res.status(400).json({
        message: "Table, food, and beverage selections must be lists."
      });
    }
    const requestedSeatNumbers = seatNumbers === undefined
      ? [seatNumber]
      : seatNumbers;
    if (
      !Array.isArray(requestedSeatNumbers) ||
      requestedSeatNumbers.length === 0 ||
      requestedSeatNumbers.length > event.availableSeats
    ) {
      return res.status(400).json({
        message: "Choose one or more available seats for this event."
      });
    }
    const selectedSeatNumbers = requestedSeatNumbers.map(Number);
    if (
      selectedSeatNumbers.some(
        (number) =>
          !Number.isInteger(number) || number < 1 || number > event.totalSeats
      ) ||
      new Set(selectedSeatNumbers).size !== selectedSeatNumbers.length
    ) {
      return res.status(400).json({
        message: "Seat selection must contain distinct valid seat numbers."
      });
    }
    const availableSeatNumbers = await getAvailableSeatNumbers(event);
    if (selectedSeatNumbers.some((number) => !availableSeatNumbers.includes(number))) {
      return res.status(409).json({
        message: "One or more selected seats have already been taken. Please choose available seats."
      });
    }

    const eventRestaurantId = event.restaurant
      ? String(event.restaurant._id || event.restaurant)
      : "";
    if (eventRestaurantId && restaurantId && String(restaurantId) !== eventRestaurantId) {
      return res.status(400).json({
        message: "Choose the restaurant already booked for this event."
      });
    }
    if (eventRestaurantId && tableIds.length > 0) {
      return res.status(400).json({
        message: "This event already has a restaurant reservation; additional table bookings are unavailable."
      });
    }

    let restaurant = null;

    if (restaurantId) {
      restaurant = await Restaurant.findOne({ _id: restaurantId, active: true });
      if (!restaurant) {
        return res.status(400).json({ message: "Selected restaurant is unavailable." });
      }
    } else if (
      tableIds.length > 0 ||
      foodItems.length > 0 ||
      beverageItems.length > 0
    ) {
      return res.status(400).json({
        message: "Choose a restaurant before selecting tables, food, or beverages."
      });
    }

    const tableSnapshots = [];
    if (tableIds.length > 0) {
      const normalizedTableIds = tableIds.map((id) => String(id));
      if (
        normalizedTableIds.some((id) => !mongoose.isValidObjectId(id)) ||
        new Set(normalizedTableIds).size !== normalizedTableIds.length ||
        normalizedTableIds.length > 1000
      ) {
        return res.status(400).json({ message: "Table selection is invalid." });
      }

      const tables = await Table.find({
        _id: { $in: normalizedTableIds },
        restaurant: restaurant._id,
        active: true
      });
      if (tables.length !== normalizedTableIds.length) {
        return res.status(400).json({
          message: "One or more selected tables are unavailable at this restaurant."
        });
      }

      if (!reservationTime || !reservationScope) {
        return res.status(409).json({
          message: "Choose an available restaurant time and section before reserving tables."
        });
      }

      const allActiveTables = await Table.find({
        restaurant: restaurant._id,
        active: true
      }).select("_id section");
      const reservationSectionTables =
        reservationScope === "restaurant"
          ? allActiveTables
          : allActiveTables.filter(
              (table) => (table.section || "Main Dining Area") === reservationSection
            );
      if (
        reservationSectionTables.length !== normalizedTableIds.length ||
        reservationSectionTables.some(
          (table) => !normalizedTableIds.includes(String(table._id))
        )
      ) {
        return res.status(400).json({
          message: "Selected tables must match the restaurant or section reservation."
        });
      }

      tableSnapshots.push(
        ...tables.map((table) => ({
          table: table._id,
          tableNumber: table.tableNumber,
          capacity: table.capacity,
          price: table.price
        }))
      );
    }

    const foodSnapshots = [];
    const beverageSnapshots = [];

    if (foodItems.length > 0) {
      const foodIds = foodItems.map((item) => String(item.itemId || ""));
      if (foodIds.some((id) => !id) || new Set(foodIds).size !== foodIds.length) {
        return res.status(400).json({ message: "Food selection is invalid." });
      }
      const foodRecords = await Food.find({
        _id: { $in: foodIds },
        restaurant: restaurant._id,
        available: true
      });
      if (foodRecords.length !== foodIds.length) {
        return res.status(400).json({
          message: "One or more selected food items are unavailable at this restaurant."
        });
      }

      const invalidQuantity = foodItems.some((selection) => {
        const quantity = Number(selection.quantity);
        return !Number.isInteger(quantity) || quantity < 1 || quantity > 50;
      });
      if (invalidQuantity) {
        return res.status(400).json({
          message: "Food quantity must be between 1 and 50."
        });
      }

      foodSnapshots.push(...foodItems.map((selection) => {
        const item = foodRecords.find(
          (food) => String(food._id) === String(selection.itemId)
        );
        const quantity = Number(selection.quantity);

        return {
          item: item._id,
          name: item.name,
          quantity,
          unitPrice: item.price,
          total: item.price * quantity
        };
      }));
    }

    if (beverageItems.length > 0) {
      const beverageIds = beverageItems.map((item) => String(item.itemId || ""));
      if (
        beverageIds.some((id) => !id) ||
        new Set(beverageIds).size !== beverageIds.length
      ) {
        return res.status(400).json({ message: "Beverage selection is invalid." });
      }

      const beverageRecords = await Beverage.find({
        _id: { $in: beverageIds },
        restaurant: restaurant._id,
        available: true
      });
      if (beverageRecords.length !== beverageIds.length) {
        return res.status(400).json({
          message: "One or more selected beverages are unavailable at this restaurant."
        });
      }

      const invalidQuantity = beverageItems.some((selection) => {
        const quantity = Number(selection.quantity);
        return !Number.isInteger(quantity) || quantity < 1 || quantity > 50;
      });
      if (invalidQuantity) {
        return res.status(400).json({
          message: "Beverage quantity must be between 1 and 50."
        });
      }

      beverageSnapshots.push(...beverageItems.map((selection) => {
        const item = beverageRecords.find(
          (beverage) => String(beverage._id) === String(selection.itemId)
        );
        const quantity = Number(selection.quantity);
        return {
          item: item._id,
          name: item.name,
          quantity,
          unitPrice: item.price,
          total: item.price * quantity
        };
      }));
    }

    const totalAmountReported =
      event.ticketPrice * selectedSeatNumbers.length +
      tableSnapshots.reduce((sum, table) => sum + table.price, 0) +
      foodSnapshots.reduce((sum, item) => sum + item.total, 0) +
      beverageSnapshots.reduce((sum, item) => sum + item.total, 0);

    if (totalAmountReported > 0 && req.body.paymentReported !== true) {
      return res.status(400).json({
        message: "Please pay using the QR code and confirm payment before registering."
      });
    }

    if (event.availableSeats < selectedSeatNumbers.length) {
      return res.status(409).json({
        message: "There are not enough seats remaining for this selection."
      });
    }

    const alreadyRegistered = await Registration.findOne({
      user: req.user._id,
      event: event._id
    });

    if (alreadyRegistered) {
      return res.status(409).json({ message: "You are already registered for this event." });
    }

    // Registration OTP is checked using the logged-in user's email.
    const otpVerified = await isOtpVerified(req.user.email, "registration");

    if (!otpVerified) {
      return res.status(400).json({ message: "Please verify the email OTP first." });
    }

    const registrationId = new mongoose.Types.ObjectId();
    let reservationDate = null;
    if (tableSnapshots.length > 0) {
      try {
        const reservation = await reserveRestaurantSlot({
          restaurant,
          event,
          bookingId: registrationId,
          bookingType: "registration",
          reservationTime,
          reservationScope,
          reservationSection
        });
        reservationDate = reservation.reservationDate;
      } catch (reservationError) {
        return res.status(409).json({ message: reservationError.message });
      }
    }

    const seatReservation = await Event.updateOne(
      { _id: event._id, availableSeats: { $gte: selectedSeatNumbers.length } },
      { $inc: { availableSeats: -selectedSeatNumbers.length } }
    );
    if (seatReservation.matchedCount === 0) {
      if (tableSnapshots.length > 0) {
        await releaseRestaurantSlot(registrationId, "registration");
      }
      return res.status(409).json({
        message: "There are not enough seats remaining for this selection."
      });
    }

    let registration;
    try {
      registration = await Registration.create({
        _id: registrationId,
        user: req.user._id,
        event: event._id,
        seatNumber: selectedSeatNumbers[0],
        seatNumbers: selectedSeatNumbers,
        restaurant: restaurant?._id || null,
        reservationDate,
        reservationTime: tableSnapshots.length > 0 ? reservationTime : "",
        reservationScope: tableSnapshots.length > 0 ? reservationScope : null,
        reservationSection:
          reservationScope === "section" ? reservationSection : "",
        tables: tableSnapshots,
        foodItems: foodSnapshots,
        beverageItems: beverageSnapshots,
        totalAmountReported,
        amountPaidReported: totalAmountReported,
        paymentStatus: totalAmountReported > 0 ? "self_reported" : "not_required"
      });
    } catch (error) {
      await Event.updateOne(
        { _id: event._id },
        { $inc: { availableSeats: selectedSeatNumbers.length } }
      );
      if (tableSnapshots.length > 0) {
        await releaseRestaurantSlot(registrationId, "registration");
      }
      if (
        error.code === 11000 &&
        (error.keyPattern?.seatNumber || error.keyPattern?.seatNumbers)
      ) {
        return res.status(409).json({
          message: "One or more selected seats were just taken. Please choose available seats."
        });
      }
      if (
        error.code === 11000 &&
        error.keyPattern?.user &&
        error.keyPattern?.event
      ) {
        return res.status(409).json({
          message: "You are already registered for this event."
        });
      }
      throw error;
    }

    await clearOtp(req.user.email, "registration");

    let emailSent = false;

    try {
      const result = await sendRegistrationEmail({
        to: req.user.email,
        name: req.user.name,
        event,
        seatNumbers: registration.seatNumbers,
        paymentReported: totalAmountReported > 0,
        restaurant,
        tables: tableSnapshots,
        foodItems: foodSnapshots,
        beverageItems: beverageSnapshots,
        totalAmountReported
      });
      emailSent = result.sent;
    } catch (emailError) {
      console.log("Confirmation email could not be sent:", emailError.message);
    }

    res.status(201).json({
      message: emailSent
        ? "Registered successfully. Confirmation email sent."
        : "Registered successfully.",
      emailSent,
      registration
    });
  } catch (error) {
    res.status(500).json({ message: "Registration failed.", error: error.message });
  }
};

export const getMyRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find({ user: req.user._id })
      .populate("event")
      .populate("restaurant", "name address")
      .populate("tables.table", "tableNumber capacity")
      .populate("beverageItems.item")
      .sort({ createdAt: -1 });

    res.json({ count: registrations.length, registrations });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch registrations.", error: error.message });
  }
};

export const rateRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      user: req.user._id
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    const rating = Number(req.body.rating);
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ message: "Rating must be a whole number from 1 to 5." });
    }

    if (
      req.body.feedback !== undefined &&
      typeof req.body.feedback !== "string"
    ) {
      return res.status(400).json({ message: "Feedback must be text." });
    }

    const feedback = (req.body.feedback || "").trim();
    if (feedback.length > 1000) {
      return res.status(400).json({ message: "Feedback must be 1000 characters or fewer." });
    }

    registration.rating = rating;
    registration.ratingFeedback = feedback;
    await registration.save();

    res.json({ message: "Thank you for rating your registration.", registration });
  } catch (error) {
    res.status(500).json({ message: "Could not save your rating.", error: error.message });
  }
};

export const cancelRegistration = async (req, res) => {
  try {
    const registration = await Registration.findOne({
      _id: req.params.registrationId,
      user: req.user._id
    });

    if (!registration) {
      return res.status(404).json({ message: "Registration not found." });
    }

    const event = await Event.findById(registration.event);

    await registration.deleteOne();
    await releaseRestaurantSlot(registration._id, "registration");

    if (event) {
      const releasedSeatCount = registration.seatNumbers?.length || 1;
      event.availableSeats = Math.min(
        event.availableSeats + releasedSeatCount,
        event.totalSeats
      );
      await event.save();
    }

    res.json({ message: "Registration cancelled successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not cancel registration.", error: error.message });
  }
};

export const getAllRegistrations = async (req, res) => {
  try {
    const registrations = await Registration.find()
      .populate("user", "name email phone")
      .populate("event", "title date time location")
      .sort({ createdAt: -1 });

    res.json({ count: registrations.length, registrations });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch registrations.", error: error.message });
  }
};
