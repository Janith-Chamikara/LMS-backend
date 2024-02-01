const express = require("express");
const {
  getAllNotifications,updateNotificationStatus
} = require("../controllers/notificationControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router
  .route("/auth/notifications/getallnotifications")
  .get(isAuthenticated, isAdmin, getAllNotifications);
router.route("/auth/notifications/update/status/:id").put(isAuthenticated,isAdmin,updateNotificationStatus)
module.exports = router;
