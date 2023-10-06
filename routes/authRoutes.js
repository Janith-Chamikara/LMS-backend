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
} = require("../controllers/userControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router.route("/auth/register").post(registerUser);
router.route("/auth/login").post(signInUser);
router.route("/auth/logout").post(isAuthenticated, signOutUser);
router.route("/auth/register/activate").post(activateUser);
router.route("/auth/updateaccess").post(updateAccessToken);
router.route("/auth/update-user-details").put(isAuthenticated, updateUserInfo);
router.route("/auth/update-user-password").put(isAuthenticated, updatePassword);
router
  .route("/auth/update-profile-image")
  .post(isAuthenticated, updateProfileImage);

router.route("/auth/me").post(isAuthenticated, getUserInfo);
router
  .route("/auth/admin/get-all-users")
  .get(isAuthenticated, isAdmin, getAllUsersForAdmin);
router
  .route("/auth/admin/update-user-role")
  .put(isAuthenticated, isAdmin, updateUserRoles);
router.route("/auth/admin/delete-a-user/:id").delete(isAuthenticated,isAdmin,deleteUser)
module.exports = router;
