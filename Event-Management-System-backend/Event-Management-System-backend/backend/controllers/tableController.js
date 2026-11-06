import Table from "../models/tableModel.js";
import Booking from "../models/bookingModel.js";
import Registration from "../models/registrationModel.js";
import Restaurant from "../models/restaurantModel.js";
import Event from "../models/eventModel.js";
import RestaurantSlotReservation from "../models/restaurantSlotReservationModel.js";
import { getRestaurantAvailability } from "../utils/restaurantAvailability.js";

export const getTablesByRestaurant = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { eventId } = req.query;

    const tables = await Table.find({ restaurant: restaurantId, active: true }).sort({ tableNumber: 1 });
    let bookedIds = new Set();

    if (eventId) {
      const [bookings, registrations] = await Promise.all([
        Booking.find({
          event: eventId,
          restaurant: restaurantId,
          bookingStatus: { $in: ["pending", "confirmed"] }
        }).select("tables.table"),
        Registration.find({
          event: eventId,
          restaurant: restaurantId
        }).select("tables.table")
      ]);
      bookedIds = new Set([
        ...bookings.flatMap((booking) =>
          booking.tables.map((table) => String(table.table))
        ),
        ...registrations.flatMap((registration) =>
          registration.tables.map((table) => String(table.table))
        )
      ]);
    }

    const availableCount = tables.filter(
      (table) => !bookedIds.has(String(table._id))
    ).length;

    res.json({
      count: tables.length,
      availableCount,
      bookedCount: tables.length - availableCount,
      tables: tables.map((table) => ({
        ...table.toObject(),
        available: !bookedIds.has(String(table._id))
      }))
    });
  } catch (error) {
    res.status(500).json({ message: "Could not fetch tables.", error: error.message });
  }
};

export const getRestaurantTimeAvailability = async (req, res) => {
  try {
    const { restaurantId } = req.params;
    const { eventId } = req.query;
    const restaurant = await Restaurant.findOne({ _id: restaurantId, active: true });

    if (!restaurant) {
      return res.status(404).json({ message: "Restaurant not found." });
    }

    let event;
    if (eventId) {
      event = await Event.findById(eventId);
      if (!event) {
        return res.status(404).json({ message: "Event not found." });
      }
    } else {
      const { eventDate } = req.query;
      if (
        typeof eventDate !== "string" ||
        !/^\d{4}-\d{2}-\d{2}$/.test(eventDate)
      ) {
        return res.status(400).json({
          message: "Provide a valid eventId or eventDate in YYYY-MM-DD format."
        });
      }
      const date = new Date(`${eventDate}T00:00:00.000Z`);
      if (Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== eventDate) {
        return res.status(400).json({ message: "Event date is invalid." });
      }
      event = { date };
    }

    const availability = await getRestaurantAvailability(restaurant, event);
    res.json({
      restaurant: {
        id: restaurant._id,
        name: restaurant.name,
        partyAvailability: restaurant.partyAvailability,
        partyDescription: restaurant.partyDescription
      },
      event: { id: event._id || null, date: event.date },
      ...availability
    });
  } catch (error) {
    res.status(500).json({
      message: "Could not fetch restaurant time availability.",
      error: error.message
    });
  }
};

export const updateTableSection = async (req, res) => {
  try {
    const section = typeof req.body.section === "string" ? req.body.section.trim() : "";
    if (!section || section.length > 80) {
      return res.status(400).json({
        message: "Section name must contain 1 to 80 characters."
      });
    }

    const table = await Table.findById(req.params.id);
    if (!table) {
      return res.status(404).json({ message: "Table not found." });
    }

    if (table.section !== section) {
      const reservationDate = new Date();
      reservationDate.setUTCHours(0, 0, 0, 0);
      const [registered, booked, eventOrSlotReserved] = await Promise.all([
        Registration.exists({ "tables.table": table._id }),
        Booking.exists({
          "tables.table": table._id,
          bookingStatus: { $in: ["pending", "confirmed"] }
        }),
        RestaurantSlotReservation.exists({
          restaurant: table.restaurant,
          section: table.section,
          reservationDate: { $gte: reservationDate }
        })
      ]);
      if (registered || booked || eventOrSlotReserved) {
        return res.status(409).json({
          message: "Cannot change this table's section while it has active reservations or future slot reservations."
        });
      }
    }

    table.section = section;
    await table.save();
    res.json({ message: "Table section updated successfully.", table });
  } catch (error) {
    res.status(400).json({
      message: "Could not update table section.",
      error: error.message
    });
  }
};

export const createTable = async (req, res) => {
  try {
    const table = await Table.create(req.body);
    res.status(201).json({ message: "Table created successfully.", table });
  } catch (error) {
    res.status(400).json({ message: "Could not create table.", error: error.message });
  }
};

export const deleteTable = async (req, res) => {
  try {
    const table = await Table.findById(req.params.id);
    if (!table) return res.status(404).json({ message: "Table not found." });

    const [registered, booked] = await Promise.all([
      Registration.exists({ "tables.table": table._id }),
      Booking.exists({
        "tables.table": table._id,
        bookingStatus: { $in: ["pending", "confirmed"] }
      })
    ]);
    if (registered || booked) {
      return res.status(409).json({
        message: "This table is attached to an existing registration or active booking and cannot be deleted."
      });
    }

    await table.deleteOne();
    res.json({ message: "Table deleted successfully." });
  } catch (error) {
    res.status(500).json({ message: "Could not delete table.", error: error.message });
  }
};
