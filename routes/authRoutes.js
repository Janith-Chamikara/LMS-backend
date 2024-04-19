const express = require("express");
const {
  registerUser,
  activateUser,
  signInUser,
  signOutUser,
  updateAccessToken,
  getUserInfo,
  updateUserInfo,
  updatePassword,
  updateProfileImage,
  getAllUsersForAdmin,
  updateUserRoles,
  deleteUser,
  createCheckoutSession,
  sendPasswordResetMail,
  forgotPassword,
} = require("../controllers/userControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router.route("/auth/register").post(registerUser);
router.route("/auth/login").post(signInUser);
router.route("/auth/resetPassword/reset").post(forgotPassword);
router.route("/auth/resetPassword").post(sendPasswordResetMail);
router.route("/auth/logout").post(isAuthenticated, signOutUser);
router.route("/auth/register/activate").post(activateUser);
router.route("/auth/updateaccess").get(updateAccessToken);
router.route("/auth/update-user-details").put(isAuthenticated, updateUserInfo);
router.route("/auth/update-user-password").put(isAuthenticated, updatePassword);
router
  .route("/auth/update-profile-image")
  .post(isAuthenticated, updateProfileImage);

router.route("/auth/:id").get(isAuthenticated, getUserInfo);
router
  .route("/auth/admin/get-all-users")
  .get(isAuthenticated, isAdmin, getAllUsersForAdmin);
router
  .route("/auth/admin/update-user-role/:id")
  .put(isAuthenticated, isAdmin, updateUserRoles);
router
  .route("/auth/admin/delete-a-user/:id")
  .delete(isAuthenticated, isAdmin, deleteUser);
router
  .route("/auth/create-checkout-session")
  .post(createCheckoutSession);
module.exports = router;
