const express = require("express");
const {
  uploadCourse,
  updateCourse,
  getSingleCourse,
  getAllCourses,
  getPaidCourse,
  getPaidCourses,
  addQuestion,
  addAnswer,
  addReview,
  addReplyToReview,
  getAllCoursesForAdmin,
  deleteCourse,
} = require("../controllers/courseControllers");
const { isAuthenticated, isAdmin } = require("../middlewares/auth");
const router = express.Router();

router.route("/courses/create").post(isAuthenticated, isAdmin, uploadCourse);
router.route("/courses/update/:id").put(isAuthenticated, isAdmin, updateCourse);
router.route("/courses/get/:id").get(getSingleCourse);
router.route("/courses/get-all").get(getAllCourses);
router
  .route("/courses/auth/get-paid-course/:id")
  .get(isAuthenticated, getPaidCourse);
router
  .route("/courses/auth/get-paid-courses")
  .get(isAuthenticated, getPaidCourses);
router.route("/courses/auth/add-question").put(isAuthenticated, addQuestion);
router.route("/courses/auth/add-answer").put(isAuthenticated, addAnswer);
router.route("/courses/auth/add-review/:id").put(isAuthenticated, addReview);
router
  .route("/courses/auth/add-reply-to-review/")
  .put(isAuthenticated, isAdmin, addReplyToReview);
router
  .route("/courses/auth/admin/get-all-courses")
  .get(isAuthenticated, isAdmin, getAllCoursesForAdmin);
router
  .route("/auth/admin/delete-a-course")
  .delete(isAuthenticated, isAdmin, deleteCourse);
module.exports = router;
