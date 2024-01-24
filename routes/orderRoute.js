const express = require("express");
const {
  createOrder,
  getAllordersForAdmin,
} = require("../controllers/orderControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router.route("/courses/auth/purchase-a-course").post(isAuthenticated, createOrder);
router
  .route("/auth/admin/get-all-orders")
  .get(isAuthenticated, isAdmin, getAllordersForAdmin);
module.exports = router;
