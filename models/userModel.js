const mongoose = require("mongoose");

const Regexp = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required."],
    },
    email: {
      type: String,
      required: [true, "Email is required."],
      validate: {
        validator: (value) => Regexp.test(value),
        message: "Invalid email.Please provide a valid one.",
      },
      unique: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      min: [6, "Password must have at least 6 characters"],
      select: false,
    },
    avatar: {
      public_id: String,
      url: String,
    },
    roles: {
      type: String,
      default: "user",
    },
    isverified: {
      type: Boolean,
      default: false,
    },
    courses: [
      {
        course_id: String,
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
