import mongoose from "mongoose";
import Booking from "../models/bookingModel.js";
import Event from "../models/eventModel.js";
import Registration from "../models/registrationModel.js";
import RestaurantSlotReservation from "../models/restaurantSlotReservationModel.js";
import Table from "../models/tableModel.js";

const WHOLE_RESTAURANT = "__whole_restaurant__";

const getSections = (tables) =>
  [...new Set(tables.map((table) => table.section || "Main Dining Area"))];

export const getReservationDate = (event) => {
  const date = new Date(event.date);
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
};

export const getRestaurantTimeSlots = (restaurant) => {
  const openingHour = Number(restaurant.openingTime?.slice(0, 2));
  const closingHour = Number(restaurant.closingTime?.slice(0, 2));

  if (
    !Number.isInteger(openingHour) ||
    !Number.isInteger(closingHour) ||
    openingHour < 0 ||
    closingHour > 23 ||
    openingHour >= closingHour
  ) {
    return [];
  }

  return Array.from(
    { length: closingHour - openingHour },
    (_, index) => `${String(openingHour + index).padStart(2, "0")}:00`
  );
};

const getReservationHours = (restaurant, reservationTime, reservationEndTime) => {
  const slots = getRestaurantTimeSlots(restaurant);
  const startHour = Number(reservationTime?.slice(0, 2));
  const endHour = Number(reservationEndTime?.slice(0, 2));
  const validTime = (time) => /^\d{2}:00$/.test(time || "");

  if (
    !validTime(reservationTime) ||
    !validTime(reservationEndTime) ||
    !slots.includes(reservationTime) ||
    endHour <= startHour ||
    endHour > Number(restaurant.closingTime?.slice(0, 2))
  ) {
    throw new Error("Choose a valid restaurant start and end time.");
  }

  const reservationHours = slots.filter((time) => {
    const hour = Number(time.slice(0, 2));
    return hour >= startHour && hour < endHour;
  });
  if (reservationHours.length !== endHour - startHour) {
    throw new Error("Choose a reservation range within restaurant opening hours.");
  }

  return reservationHours;
};

const getReservationEndTime = (reservationTime, reservationEndTime) => {
  if (reservationEndTime) return reservationEndTime;

  const nextHour = Number(reservationTime?.slice(0, 2)) + 1;
  return `${String(nextHour).padStart(2, "0")}:00`;
};

export const getLegacyBusySections = async (restaurantId, event) => {
  const reservationDate = getReservationDate(event);
  const followingDate = new Date(reservationDate);
  followingDate.setUTCDate(followingDate.getUTCDate() + 1);
  const events = await Event.find({
    date: { $gte: reservationDate, $lt: followingDate }
  }).select("_id");
  const eventIds = events.map(({ _id }) => _id);
  const [registrations, bookings] = await Promise.all([
    Registration.find({
      restaurant: restaurantId,
      event: { $in: eventIds },
      "tables.0": { $exists: true },
      $or: [{ reservationTime: "" }, { reservationTime: { $exists: false } }]
    })
      .select("tables")
      .populate("tables.table", "section"),
    Booking.find({
      restaurant: restaurantId,
      event: { $in: eventIds },
      "tables.0": { $exists: true },
      $or: [{ reservationTime: "" }, { reservationTime: { $exists: false } }],
      bookingStatus: { $in: ["pending", "confirmed"] }
    })
      .select("tables")
      .populate("tables.table", "section")
  ]);

  const busySections = new Set();
  for (const reservation of [...registrations, ...bookings]) {
    if (!reservation.tables?.length) {
      busySections.add(WHOLE_RESTAURANT);
      continue;
    }

    for (const table of reservation.tables) {
      if (!table.table) {
        busySections.add(WHOLE_RESTAURANT);
      } else {
        busySections.add(table.table.section || "Main Dining Area");
      }
    }
  }

  return busySections;
};

export const getRestaurantAvailability = async (restaurant, event) => {
  const tables = await Table.find({
    restaurant: restaurant._id,
    active: true
  }).sort({ section: 1, tableNumber: 1 });
  const sections = getSections(tables);
  const reservationDate = getReservationDate(event);
  const [reservations, legacyBusySections] = await Promise.all([
    RestaurantSlotReservation.find({
      restaurant: restaurant._id,
      reservationDate
    }).select("reservationTime section"),
    getLegacyBusySections(restaurant._id, event)
  ]);

  const occupiedSlots = new Set(
    reservations.map(
      (reservation) => `${reservation.reservationTime}|${reservation.section}`
    )
  );
  const timeSlots = getRestaurantTimeSlots(restaurant).map((time) => ({
    time,
    availableSections: sections.filter(
      (section) =>
        !legacyBusySections.has(WHOLE_RESTAURANT) &&
        !legacyBusySections.has(section) &&
        !occupiedSlots.has(`${time}|${section}`)
    ),
    wholeRestaurantAvailable:
      sections.length > 0 &&
      !legacyBusySections.size &&
      sections.every((section) => !occupiedSlots.has(`${time}|${section}`))
  }));

  return {
    reservationDate,
    openingTime: restaurant.openingTime,
    closingTime: restaurant.closingTime,
    sections,
    timeSlots,
    tables
  };
};

export const validateReservationSelection = ({
  restaurant,
  event,
  reservationTime,
  reservationEndTime,
  reservationScope,
  reservationSection,
  sections
}) => {
  if (restaurant.partyAvailability === "unavailable") {
    throw new Error("This restaurant is not available for party bookings.");
  }

  getReservationHours(
    restaurant,
    reservationTime,
    getReservationEndTime(reservationTime, reservationEndTime)
  );

  if (!["restaurant", "section"].includes(reservationScope)) {
    throw new Error("Choose the whole restaurant or one section.");
  }

  if (
    reservationScope === "section" &&
    !sections.includes(reservationSection)
  ) {
    throw new Error("Choose a valid restaurant section.");
  }

  return getReservationDate(event);
};

export const reserveRestaurantSlot = async ({
  restaurant,
  event,
  bookingId,
  bookingType,
  reservationTime,
  reservationEndTime,
  reservationScope,
  reservationSection
}) => {
  if (!mongoose.isValidObjectId(bookingId)) {
    throw new Error("Booking reference is invalid.");
  }

  const tables = await Table.find({
    restaurant: restaurant._id,
    active: true
  }).select("section");
  const sections = getSections(tables);
  const reservationDate = validateReservationSelection({
    restaurant,
    event,
    reservationTime,
    reservationEndTime,
    reservationScope,
    reservationSection,
    sections
  });
  const legacyBusySections = await getLegacyBusySections(
    restaurant._id,
    event
  );
  const reservedSections =
    reservationScope === "restaurant" ? sections : [reservationSection];
  const reservationHours = getReservationHours(
    restaurant,
    reservationTime,
    getReservationEndTime(reservationTime, reservationEndTime)
  );

  if (
    !reservedSections.length ||
    reservedSections.some(
      (section) =>
        legacyBusySections.has(WHOLE_RESTAURANT) ||
        legacyBusySections.has(section)
    )
  ) {
    throw new Error("This restaurant section is already booked for this event.");
  }

  try {
    await RestaurantSlotReservation.insertMany(
      reservationHours.flatMap((time) =>
        reservedSections.map((section) => ({
          restaurant: restaurant._id,
          reservationDate,
          reservationTime: time,
          section,
          bookingId,
          bookingType
        }))
      )
    );
  } catch (error) {
    await RestaurantSlotReservation.deleteMany({ bookingId, bookingType });
    if (error.code === 11000) {
      throw new Error("This restaurant area is already booked for that date and time.");
    }
    throw error;
  }

  return { reservationDate, reservationScope, reservationSection };
};

export const releaseRestaurantSlot = (bookingId, bookingType) =>
  RestaurantSlotReservation.deleteMany({ bookingId, bookingType });
