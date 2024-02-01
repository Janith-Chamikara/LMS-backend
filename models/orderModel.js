const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema(
  {
    courseId: {
      type: String,
      required: [true, "Course ID is required."],
    },
    thumbnail: {
      type: String,
    },
    userName: {
      type: String,
    },
    date: {
      type: String,
    },
    courseName: {
      type: String,
    },
    avatar: {
      type: String,
    },
    price: {
      type: String,
    },
    userId: {
      type: String,
      required: [true, "User ID is required."],
    },
    paymentInfo: {
      type: String,
      //required
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Order", orderSchema);
