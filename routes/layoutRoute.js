const express = require("express");
const {
  createLayout,
  updateLayout,
  getLayoutByType
} = require("../controllers/layoutControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");

const router = express.Router();

router
  .route("/auth/admin/create-layout")
  .post(isAuthenticated, isAdmin, createLayout);
router
  .route("/auth/admin/update-layout")
  .put(isAuthenticated, isAdmin, updateLayout);
router.route("/auth/admin/get-layout").get(isAuthenticated,isAdmin,getLayoutByType)

module.exports = router;
