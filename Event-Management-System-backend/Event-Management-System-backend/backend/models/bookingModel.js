import mongoose from "mongoose";

const bookingItemSchema = new mongoose.Schema(
  {
    item: {
      type: mongoose.Schema.Types.ObjectId,
      required: true
    },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    unitPrice: { type: Number, required: true, min: 0 },
    total: { type: Number, required: true, min: 0 }
  },
  { _id: false }
);

const paymentSchema = new mongoose.Schema({
  stage: {
    type: String,
    enum: ["advance", "balance"],
    required: true
  },
  amount: { type: Number, required: true, min: 1 },
  transactionReference: { type: String, required: true, trim: true },
  status: {
    type: String,
    enum: ["pending_verification", "approved", "rejected"],
    default: "pending_verification"
  },
  submittedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User"
  },
  rejectionReason: { type: String, default: "" }
});

const bookingSchema = new mongoose.Schema(
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
    restaurant: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Restaurant",
      required: true
    },
    reservationDate: { type: Date, default: null },
    reservationTime: { type: String, default: "" },
    reservationScope: {
      type: String,
      enum: ["restaurant", "section"],
      default: null
    },
    reservationSection: { type: String, default: "" },

    tables: [
      {
        table: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Table",
          required: true
        },
        tableNumber: { type: String, required: true },
        capacity: { type: Number, required: true },
        price: { type: Number, required: true }
      }
    ],

    foodItems: { type: [bookingItemSchema], default: [] },
    beverageItems: { type: [bookingItemSchema], default: [] },

    phone: { type: String, required: true },
    subtotal: { type: Number, required: true, min: 0 },
    totalAmount: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "INR" },

    advanceAmount: { type: Number, required: true, default: 0 },
    amountPaid: { type: Number, default: 0, min: 0 },
    balanceAmount: { type: Number, required: true, default: 0, min: 0 },

    payments: { type: [paymentSchema], default: [] },

    paymentStatus: {
      type: String,
      enum: [
        "pending",
        "pending_verification",
        "partially_paid",
        "paid",
        "created",
        "failed",
        "refunded"
      ],
      default: "pending"
    },

    bookingStatus: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending"
    }
  },
  { timestamps: true }
);

bookingSchema.index({
  event: 1,
  restaurant: 1,
  "tables.table": 1,
  bookingStatus: 1
});

export default mongoose.model("Booking", bookingSchema);
