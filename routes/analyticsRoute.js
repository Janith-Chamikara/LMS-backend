const express = require("express");
const { getUserAnalytics, getCourseAnalytics, getOrderAnalytics } = require("../controllers/analyticsControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router.route("/auth/admin/get-user-analytics").get(isAuthenticated,isAdmin,getUserAnalytics);
router.route("/auth/admin/get-course-analytics").get(isAuthenticated,isAdmin,getCourseAnalytics);
router.route("/auth/admin/get-order-analytics").get(isAuthenticated,isAdmin,getOrderAnalytics);

module.exports = router;
