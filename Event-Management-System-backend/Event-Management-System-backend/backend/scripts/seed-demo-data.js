import dns from "node:dns";
import dotenv from "dotenv";
import mongoose from "mongoose";
import Beverage from "../models/beverageModel.js";
import Event from "../models/eventModel.js";
import Food from "../models/foodModel.js";
import Restaurant from "../models/restaurantModel.js";
import RestaurantSlotReservation from "../models/restaurantSlotReservationModel.js";
import Table from "../models/tableModel.js";
import User from "../models/userModel.js";
import { reserveRestaurantSlot } from "../utils/restaurantAvailability.js";

dotenv.config();

const sampleRestaurants = [
  {
    name: "Lavender Courtyard",
    legacyName: "EventHub Sample: Lavender Courtyard",
    address: "Patia, Bhubaneswar, Odisha",
    phone: "9000000001",
    rating: 4.7,
    description: "A welcoming courtyard venue with a rooftop lounge and garden hall.",
    openingTime: "10:00",
    closingTime: "22:00",
    sections: ["Rooftop Lounge", "Garden Hall"]
  },
  {
    name: "Olive Bistro",
    legacyName: "EventHub Sample: Olive Bistro",
    address: "Jaydev Vihar, Bhubaneswar, Odisha",
    phone: "9000000002",
    rating: 4.5,
    description: "A relaxed bistro with an indoor hall and terrace seating.",
    openingTime: "10:00",
    closingTime: "22:00",
    sections: ["Main Hall", "Terrace"]
  },
  {
    name: "The Garden Table",
    legacyName: "EventHub Sample: The Garden Table",
    address: "Saheed Nagar, Bhubaneswar, Odisha",
    phone: "9000000003",
    rating: 4.4,
    description: "A garden-side dining venue for private gatherings and events.",
    openingTime: "10:00",
    closingTime: "22:00",
    sections: ["Dining Hall", "Garden"]
  }
];

const sampleMenu = [
  { name: "Paneer Tikka", description: "Grilled paneer with herbs and spices.", price: 240, category: "Starters" },
  { name: "Margherita Pizza", description: "Classic pizza with tomato, basil, and cheese.", price: 280, category: "Main Course" },
  { name: "Veg Biryani", description: "Fragrant rice with seasonal vegetables and spices.", price: 220, category: "Main Course" }
];

const sampleBeverages = [
  { name: "Fresh Lime Soda", description: "Fresh lime with soda.", price: 90 },
  { name: "Mango Shake", description: "Mango blended with chilled milk.", price: 140 }
];

const sampleEvents = [
  {
    title: "Cultural Evening",
    legacyTitle: "EventHub Sample: Cultural Evening",
    description: "An evening of culture, food, and entertainment.",
    location: "Bhubaneswar",
    dateOffset: 14,
    restaurantIndex: 0,
    sectionIndex: 0,
    time: "06:00 PM",
    reservationTime: "18:00",
    reservationEndTime: "20:00",
    ticketPrice: 300
  },
  {
    title: "Food Carnival",
    legacyTitle: "EventHub Sample: Food Carnival",
    description: "Discover a variety of food and refreshments.",
    location: "Bhubaneswar",
    dateOffset: 21,
    restaurantIndex: 1,
    sectionIndex: 1,
    time: "05:00 PM",
    reservationTime: "17:00",
    reservationEndTime: "19:00",
    ticketPrice: 250
  },
  {
    title: "Music Night",
    legacyTitle: "EventHub Sample: Music Night",
    description: "An evening of live music and entertainment.",
    location: "Bhubaneswar",
    dateOffset: 28,
    restaurantIndex: 2,
    sectionIndex: 0,
    time: "07:00 PM",
    reservationTime: "19:00",
    reservationEndTime: "21:00",
    ticketPrice: 350
  }
];

const getDateFromToday = (offsetDays) => {
  const date = new Date();
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate() + offsetDays
  ));
};

const upsertBy = async (Model, filter, values) => {
  const result = await Model.findOneAndUpdate(
    filter,
    { $set: values },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );
  return result;
};

const connectToDatabase = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
  } catch (error) {
    if (
      !process.env.MONGO_URI?.startsWith("mongodb+srv://") ||
      error.code !== "ECONNREFUSED" ||
      error.syscall !== "querySrv"
    ) {
      throw error;
    }

    dns.setServers(["8.8.8.8", "8.8.4.4"]);
    await mongoose.connect(process.env.MONGO_URI);
  }
};

const seed = async () => {
  await connectToDatabase();
  const creator = await User.findOne().sort({ createdAt: 1 });
  if (!creator) {
    throw new Error("Create an EventHub account first, then run this sample-data command again.");
  }

  const restaurants = [];
  for (const restaurantData of sampleRestaurants) {
    const { sections, legacyName, ...restaurantFields } = restaurantData;
    let restaurant = await Restaurant.findOne({
      name: { $in: [restaurantFields.name, legacyName] }
    });
    const restaurantValues = {
      ...restaurantFields,
      partyAvailability: "available",
      partyDescription: "Available for party bookings.",
      active: true
    };
    if (restaurant) {
      Object.assign(restaurant, restaurantValues);
      await restaurant.save();
    } else {
      restaurant = await Restaurant.create(restaurantValues);
    }
    restaurants.push({ restaurant, sections });

    const existingTables = await Table.find({ restaurant: restaurant._id })
      .select("tableNumber section active")
      .lean();
    const existingTableNumbers = new Set();
    for (const table of existingTables) {
      const legacyTableNumber = /^([12])-([1-4])$/.exec(table.tableNumber);
      if (legacyTableNumber) {
        const sectionIndex = Number(legacyTableNumber[1]) - 1;
        const indexInSection = Number(legacyTableNumber[2]);
        const tableNumber = String(sectionIndex * 500 + indexInSection).padStart(4, "0");
        await Table.updateOne(
          { _id: table._id },
          {
            $set: {
              tableNumber,
              section: sections[sectionIndex],
              active: true
            }
          }
        );
        existingTableNumbers.add(tableNumber);
      } else {
        existingTableNumbers.add(table.tableNumber);
        if (!table.active) {
          await Table.updateOne({ _id: table._id }, { $set: { active: true } });
        }
      }
    }
    const tablesToAdd = [];
    for (let tableIndex = 1; tableIndex <= 1000; tableIndex += 1) {
      const sectionIndex = Math.floor((tableIndex - 1) / 500);
      const tableNumber = String(tableIndex).padStart(4, "0");
      if (existingTableNumbers.has(tableNumber)) continue;
      tablesToAdd.push({
        restaurant: restaurant._id,
        tableNumber,
        section: sections[sectionIndex],
        capacity: 4,
        price: 0,
        active: true
      });
    }
    if (tablesToAdd.length) {
      await Table.insertMany(tablesToAdd, { ordered: false });
    }

    for (const item of sampleMenu) {
      await upsertBy(
        Food,
        { restaurant: restaurant._id, name: item.name },
        { ...item, restaurant: restaurant._id, available: true }
      );
    }
    for (const item of sampleBeverages) {
      await upsertBy(
        Beverage,
        { restaurant: restaurant._id, name: item.name },
        { ...item, restaurant: restaurant._id, category: "Beverages", available: true }
      );
    }
  }

  let createdEvents = 0;
  for (const sampleEvent of sampleEvents) {
    const restaurantData = restaurants[sampleEvent.restaurantIndex];
    let existingEvent = await Event.findOne({
      title: { $in: [sampleEvent.title, sampleEvent.legacyTitle] }
    });
    const section = restaurantData.sections[sampleEvent.sectionIndex];
    const tables = await Table.find({
      restaurant: restaurantData.restaurant._id,
      section,
      active: true
    }).sort({ tableNumber: 1 });
    const foods = await Food.find({
      restaurant: restaurantData.restaurant._id,
      available: true
    }).sort({ name: 1 }).limit(2);
    const beverages = await Beverage.find({
      restaurant: restaurantData.restaurant._id,
      available: true
    }).sort({ name: 1 }).limit(1);

    const eventValues = {
      title: sampleEvent.title,
      description: sampleEvent.description,
      date: getDateFromToday(sampleEvent.dateOffset),
      time: sampleEvent.time,
      location: sampleEvent.location,
      totalSeats: tables
        .slice(0, 4)
        .reduce((total, table) => total + table.capacity, 0),
      ticketPrice: sampleEvent.ticketPrice,
      rules: ["Select your seats before registering."],
      restaurant: restaurantData.restaurant._id,
      reservationTime: sampleEvent.reservationTime,
      reservationEndTime: sampleEvent.reservationEndTime,
      reservationScope: "section",
      reservationSection: section,
      restaurantTables: tables.slice(0, 4).map((table) => ({
        table: table._id,
        tableNumber: table.tableNumber,
        section: table.section,
        capacity: table.capacity,
        price: table.price
      })),
      restaurantFoodItems: foods.map((item) => ({
        item: item._id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        total: item.price
      })),
      restaurantBeverageItems: beverages.map((item) => ({
        item: item._id,
        name: item.name,
        quantity: 1,
        unitPrice: item.price,
        total: item.price
      }))
    };
    if (existingEvent) {
      const registeredSeats = existingEvent.totalSeats - existingEvent.availableSeats;
      Object.assign(existingEvent, eventValues, {
        availableSeats: Math.max(0, eventValues.totalSeats - registeredSeats)
      });
      await existingEvent.save();
    } else {
      existingEvent = await Event.create({
        ...eventValues,
        availableSeats: eventValues.totalSeats,
        createdBy: creator._id
      });
      createdEvents += 1;
    }
    const event = existingEvent;

    const reservationExists = await RestaurantSlotReservation.exists({
      bookingId: event._id,
      bookingType: "event"
    });
    if (!reservationExists) {
      await reserveRestaurantSlot({
        restaurant: restaurantData.restaurant,
        event,
        bookingId: event._id,
        bookingType: "event",
        reservationTime: sampleEvent.reservationTime,
        reservationEndTime: sampleEvent.reservationEndTime,
        reservationScope: "section",
        reservationSection: section
      });
    }
    console.log(`Ready: ${sampleEvent.title}`);
  }

  console.log(
    `Venue data ready: ${restaurants.length} restaurants with 1000 tables each; ${createdEvents} new events.`
  );
};

try {
  await seed();
} catch (error) {
  console.error("Could not seed sample data:", error.message);
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
