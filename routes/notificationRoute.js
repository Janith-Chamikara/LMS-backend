const express = require("express");
const {
  getAllNotifications,updateNotificationStatus
} = require("../controllers/notificationControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router
  .route("/auth/get-all-notifications")
  .get(isAuthenticated, isAdmin, getAllNotifications);
router.route("/auth/update-notification-status/:id").put(isAuthenticated,isAdmin,updateNotificationStatus)
module.exports = router;
