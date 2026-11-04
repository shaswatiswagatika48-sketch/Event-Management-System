import mongoose from "mongoose";

const registrationSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true
    },
    event: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true
    },
    seatNumber: { type: Number, min: 1 },
    seatNumbers: { type: [Number], default: undefined },
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      default: null
    },
    reservationDate: { type: Date, default: null },
    reservationTime: { type: String, default: "" },
    reservationScope: {
      type: String,
      enum: ["restaurant", "section"],
      default: null
    },
    reservationSection: { type: String, default: "" },
    tables: {
      type: [
        new mongoose.Schema(
          {
            table: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Table",
              required: true
            },
            tableNumber: { type: String, required: true },
            capacity: { type: Number, required: true },
            price: { type: Number, required: true, min: 0 }
          },
          { _id: false }
        )
      ],
      default: []
    },
    foodItems: {
      type: [
        new mongoose.Schema(
          {
            item: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Food",
              required: true
            },
            name: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            unitPrice: { type: Number, required: true, min: 0 },
            total: { type: Number, required: true, min: 0 }
          },
          { _id: false }
        )
      ],
      default: []
    },
    beverageItems: {
      type: [
        new mongoose.Schema(
          {
            item: {
              type: mongoose.Schema.Types.ObjectId,
              ref: "Beverage",
              required: true
            },
            name: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            unitPrice: { type: Number, required: true, min: 0 },
            total: { type: Number, required: true, min: 0 }
          },
          { _id: false }
        )
      ],
      default: []
    },
    totalAmountReported: { type: Number, required: true, min: 0, default: 0 },
    amountPaidReported: { type: Number, min: 0, default: 0 },
    paymentStatus: {
      type: String,
      enum: ["not_required", "self_reported", "verified"],
      default: "not_required"
    },
    rating: { type: Number, min: 1, max: 5, default: null },
    ratingFeedback: { type: String, trim: true, maxlength: 1000, default: "" }
  },
  { timestamps: true }
);

registrationSchema.index({ user: 1, event: 1 }, { unique: true });
registrationSchema.index({ event: 1, restaurant: 1, "tables.table": 1 });
registrationSchema.index(
  { event: 1, seatNumber: 1 },
  { unique: true, partialFilterExpression: { seatNumber: { $exists: true } } }
);
registrationSchema.index(
  { event: 1, seatNumbers: 1 },
  { unique: true, partialFilterExpression: { seatNumbers: { $exists: true } } }
);

export default mongoose.model("Registration", registrationSchema);
