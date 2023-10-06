const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema(
  {
   customer:{
    name:String,
    email:String
   },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      required: true,
      default: "unread",
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Notification", notificationSchema);
