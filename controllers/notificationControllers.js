const ErrorHandler = require("../utils/ErrorHandler");
const Notification = require("../models/notificationModel");
const corn = require("node-cron");

const getAllNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.find().sort({ createdAt: -1 });
    if (!notifications) {
      return next(new ErrorHandler("Cannot fetch Notifications.", 400));
    }
    res.status(200).json({
      success: true,
      notifications,
    });
  } catch (error) {
    console.log(error.message);
    return next(new ErrorHandler(error.message, 400));
  }
};

const updateNotificationStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const notification = await Notification.findById(id);
    if (!notification) {
      return next(new ErrorHandler("Cannot find notification."));
    } else {
      notification.status === "unread"
        ? (notification.status = "read")
        : notification.status;

      const updatedNotification = await notification.save();
      res.status(200).json({
        success: true,
        message: "Updated notification status.",
        updatedNotification,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
//calling every day at 12.00am and delete notifications which are older than 30 days
corn.schedule("0 0 0 * * *", async () => {
  const thirtyDays = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  await Notification.deleteMany(
    { status: "read" },
    {
      createdAt: { $lt: thirtyDays },
    }
  );
});

module.exports = {
  getAllNotifications,
  updateNotificationStatus,
};
