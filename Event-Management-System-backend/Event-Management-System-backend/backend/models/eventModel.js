import mongoose from "mongoose";

const eventTableSchema = new mongoose.Schema(
  {
    table: { type: mongoose.Schema.Types.ObjectId, ref: "Table", required: true },
    tableNumber: { type: String, required: true },
    section: { type: String, default: "Main Dining Area" },
    capacity: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const eventMenuItemSchema = new mongoose.Schema(
  {
    item: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1, max: 50 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const eventSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    date: { type: Date, required: true },
    time: { type: String, required: true },
    location: { type: String, required: true, trim: true },
    totalSeats: { type: Number, required: true, min: 1 },
    availableSeats: { type: Number, required: true, min: 0 },
    ticketPrice: { type: Number, required: true, min: 0 },
    image: { type: String, default: "" },
    rules: { type: [String], default: [] },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null
    },
    reservationTime: { type: String, default: "" },
    reservationEndTime: { type: String, default: "" },
    reservationScope: {
      type: String,
      enum: ["restaurant", "section"],
      default: null
    },
    reservationSection: { type: String, default: "" },
    restaurantTables: { type: [eventTableSchema], default: [] },
    restaurantFoodItems: { type: [eventMenuItemSchema], default: [] },
    restaurantBeverageItems: { type: [eventMenuItemSchema], default: [] },

    // The person who creates this event is the admin/owner of this event.
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    }
  },
  { timestamps: true }
);

export default mongoose.model("Event", eventSchema);
