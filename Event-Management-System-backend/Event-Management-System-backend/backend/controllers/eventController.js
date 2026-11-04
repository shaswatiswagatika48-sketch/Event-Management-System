import mongoose from "mongoose";
import Beverage from "../models/beverageModel.js";
import Event from "../models/eventModel.js";
import Food from "../models/foodModel.js";
import Restaurant from "../models/restaurantModel.js";
import Registration from "../models/registrationModel.js";
import Table from "../models/tableModel.js";
import {
  releaseRestaurantSlot,
  reserveRestaurantSlot
} from "../utils/restaurantAvailability.js";
import { sendEventCreatedEmail } from "../utils/sendEmail.js";
import {
  isHiddenEventTitle,
  visibleEventFilter
} from "../utils/eventVisibility.js";
import { isOtpVerified, clearOtp } from "./otpController.js";

const isEventOwner = (event, userId) =>
  String(event.createdBy) === String(userId);

export const createEvent = async (req, res) => {
  try {
    const {
      title,
      description,
      date,
      time,
      location,
      totalSeats,
      ticketPrice,
      image,
      rules,
      restaurantId,
      reservationTime = "",
      reservationEndTime = "",
      reservationScope = "restaurant",
      reservationSection = "",
      tableIds = [],
      foodItems = [],
      beverageItems = []
    } = req.body;

    if (
      !title ||
      !description ||
      !date ||
      !time ||
      !location ||
      totalSeats === undefined ||
      ticketPrice === undefined
    ) {
      return res.status(400).json({
        message: "Title, description, date, time, location, totalSeats and ticketPrice are required."
      });
    }

    const otpVerified = await isOtpVerified(req.user.email, "event_creation");
    if (!otpVerified) {
      return res.status(400).json({ message: "Please verify the email OTP before creating the event." });
    }

    const seats = Number(totalSeats);
    if (!Number.isInteger(seats) || seats < 1) {
      return res.status(400).json({ message: "totalSeats must be a positive number." });
    }

    const price = Number(ticketPrice);
    if (!Number.isFinite(price) || price < 0) {
      return res.status(400).json({ message: "ticketPrice must be a non-negative amount." });
    }
    if (
      !Array.isArray(tableIds) ||
      !Array.isArray(foodItems) ||
      !Array.isArray(beverageItems)
    ) {
      return res.status(400).json({
        message: "Table, food, and beverage selections must be lists."
      });
    }

    let restaurant = null;
    let tableSnapshots = [];
    let foodSnapshots = [];
    let beverageSnapshots = [];
    if (restaurantId) {
      if (!mongoose.isValidObjectId(restaurantId)) {
        return res.status(400).json({ message: "Selected restaurant is invalid." });
      }
      restaurant = await Restaurant.findOne({ _id: restaurantId, active: true });
      if (!restaurant) {
        return res.status(400).json({ message: "Selected restaurant is unavailable." });
      }
      if (!reservationTime || tableIds.length === 0) {
        return res.status(400).json({
          message: "Choose an available restaurant time and at least one table."
        });
      }
      const normalizedTableIds = tableIds.map(String);
      if (
        normalizedTableIds.some((id) => !mongoose.isValidObjectId(id)) ||
        new Set(normalizedTableIds).size !== normalizedTableIds.length ||
        normalizedTableIds.length > 1000
      ) {
        return res.status(400).json({
          message: "Select between 1 and 1000 valid tables."
        });
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
      tableSnapshots = tables.map((table) => ({
        table: table._id,
        tableNumber: table.tableNumber,
        section: table.section || "Main Dining Area",
        capacity: table.capacity,
        price: table.price
      }));
      if (
        reservationScope === "section" &&
        (tableSnapshots.some((table) => table.section !== reservationSection) ||
          !reservationSection)
      ) {
        return res.status(400).json({
          message: "Selected tables must belong to the chosen restaurant section."
        });
      }
      const selectedCapacity = tableSnapshots.reduce(
        (capacity, table) => capacity + table.capacity,
        0
      );
      if (seats > selectedCapacity) {
        return res.status(400).json({
          message: `Event attendee capacity cannot exceed the ${selectedCapacity} seats available from selected tables.`
        });
      }

      const normalizeMenuSelection = async (selections, Model, label) => {
        const ids = selections.map((item) => String(item.itemId || ""));
        if (
          ids.some((id) => !mongoose.isValidObjectId(id)) ||
          new Set(ids).size !== ids.length
        ) {
          throw new Error(`${label} selection is invalid.`);
        }
        const invalidQuantity = selections.some((selection) => {
          const quantity = Number(selection.quantity);
          return !Number.isInteger(quantity) || quantity < 1 || quantity > 50;
        });
        if (invalidQuantity) {
          throw new Error(`${label} quantity must be between 1 and 50.`);
        }
        const items = ids.length
          ? await Model.find({
              _id: { $in: ids },
              restaurant: restaurant._id,
              available: true
            })
          : [];
        if (items.length !== ids.length) {
          throw new Error(`One or more selected ${label.toLowerCase()} items are unavailable at this restaurant.`);
        }
        return selections.map((selection) => {
          const item = items.find(
            (record) => String(record._id) === String(selection.itemId)
          );
          const quantity = Number(selection.quantity);
          return {
            item: item._id,
            name: item.name,
            quantity,
            unitPrice: item.price,
            total: item.price * quantity
          };
        });
      };

      try {
        foodSnapshots = await normalizeMenuSelection(foodItems, Food, "Food");
        beverageSnapshots = await normalizeMenuSelection(
          beverageItems,
          Beverage,
          "Beverage"
        );
      } catch (validationError) {
        return res.status(400).json({ message: validationError.message });
      }
    } else if (
      reservationTime ||
      reservationEndTime ||
      reservationSection ||
      tableIds.length ||
      foodItems.length ||
      beverageItems.length
    ) {
      return res.status(400).json({
        message: "Select a restaurant before choosing tables, food, or beverages."
      });
    }

    const eventId = new mongoose.Types.ObjectId();
    let restaurantSlotReserved = false;
    if (restaurant) {
      try {
        await reserveRestaurantSlot({
          restaurant,
          event: { _id: eventId, date },
          bookingId: eventId,
          bookingType: "event",
          reservationTime,
          reservationEndTime,
          reservationScope,
          reservationSection
        });
        restaurantSlotReserved = true;
      } catch (reservationError) {
        return res.status(409).json({ message: reservationError.message });
      }
    }

    let event;
    try {
      event = await Event.create({
        _id: eventId,
        title,
        description,
        date,
        time,
        location,
        totalSeats: seats,
        availableSeats: seats,
        ticketPrice: price,
        image: image || "",
        rules: Array.isArray(rules) ? rules : [],
        restaurant: restaurant?._id || null,
        reservationTime: restaurant ? reservationTime : "",
        reservationEndTime: restaurant ? reservationEndTime : "",
        reservationScope: restaurant ? reservationScope : null,
        reservationSection:
          restaurant && reservationScope === "section"
            ? reservationSection
            : "",
        restaurantTables: tableSnapshots,
        restaurantFoodItems: foodSnapshots,
        restaurantBeverageItems: beverageSnapshots,
        createdBy: req.user._id
      });
    } catch (creationError) {
      if (restaurantSlotReserved) {
        await releaseRestaurantSlot(eventId, "event");
      }
      throw creationError;
    }

    await clearOtp(req.user.email, "event_creation");

    let emailSent = false;
    try {
      const emailResult = await sendEventCreatedEmail({
        to: req.user.email,
        name: req.user.name,
        event,
        restaurant
      });
      emailSent = emailResult.sent;
    } catch (emailError) {
      console.log("Event email could not be sent:", emailError.message);
    }

    res.status(201).json({
      message: emailSent
        ? "Event created successfully. Confirmation email sent."
        : "Event created successfully, but the confirmation email could not be sent. Check your email settings.",
      emailSent,
      event
    });
  } catch (error) {
    res.status(500).json({ message: "Could not create event.", error: error.message });
  }
};

export const getEvents = async (req, res) => {
  try {
    const events = await Event.find(visibleEventFilter)
      .populate("createdBy", "name email")
      .populate("restaurant", "name address partyAvailability partyDescription")
      .sort({ date: 1, createdAt: -1 });

    res.json({ count: events.length, events });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch events.", error: error.message });
  }
};

export const getEventById = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id)
      .populate("createdBy", "name email")
      .populate("restaurant", "name address partyAvailability partyDescription");

    if (!event || isHiddenEventTitle(event.title)) {
      return res.status(404).json({ message: "Event not found." });
    }

    res.json({ event });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch event.", error: error.message });
  }
};

export const updateEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found." });

    if (!isEventOwner(event, req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not the admin of this event." });
    }

    if (event.restaurant && event.reservationTime && req.body.date !== undefined) {
      const requestedDate = new Date(req.body.date);
      if (Number.isNaN(requestedDate.getTime())) {
        return res.status(400).json({ message: "Event date is invalid." });
      }
      if (
        requestedDate.toISOString().slice(0, 10) !==
        new Date(event.date).toISOString().slice(0, 10)
      ) {
        return res.status(409).json({
          message: "The event date cannot be changed while its restaurant time slot is reserved."
        });
      }
    }

    const fields = ["title", "description", "date", "time", "location", "image", "rules"];

    fields.forEach((field) => {
      if (req.body[field] !== undefined) event[field] = req.body[field];
    });

    if (req.body.totalSeats !== undefined) {
      const newTotal = Number(req.body.totalSeats);
      const registeredSeats = event.totalSeats - event.availableSeats;

      if (!Number.isInteger(newTotal) || newTotal < registeredSeats) {
        return res.status(400).json({
          message: `Total seats cannot be less than ${registeredSeats}.`
        });
      }

      event.totalSeats = newTotal;
      event.availableSeats = newTotal - registeredSeats;
    }

    if (req.body.ticketPrice !== undefined) {
      const ticketPrice = Number(req.body.ticketPrice);
      if (!Number.isFinite(ticketPrice) || ticketPrice < 0) {
        return res.status(400).json({
          message: "ticketPrice must be a non-negative amount."
        });
      }
      event.ticketPrice = ticketPrice;
    }

    await event.save();

    res.json({ message: "Event updated successfully.", event });
  } catch (error) {
    res.status(500).json({ message: "Could not update event.", error: error.message });
  }
};

export const deleteEvent = async (req, res) => {
  try {
    const event = await Event.findById(req.params.id);

    if (!event) return res.status(404).json({ message: "Event not found." });

    if (!isEventOwner(event, req.user._id) && req.user.role !== "admin") {
      return res.status(403).json({ message: "You are not the admin of this event." });
    }

    const registrations = await Registration.find({ event: event._id }).select("_id");
    await Registration.deleteMany({ event: event._id });
    await event.deleteOne();
    await Promise.all([
      releaseRestaurantSlot(event._id, "event"),
      ...registrations.map(({ _id }) =>
        releaseRestaurantSlot(_id, "registration")
      )
    ]);

    res.json({ message: "Event and its registrations deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete event.", error: error.message });
  }
};
