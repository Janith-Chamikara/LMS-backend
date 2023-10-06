const Course = require("../models/courseModel");
const ErrorHandler = require("../utils/ErrorHandler");

const createCourse = async (courseData, res, next) => {
  try {
    const course = await Course.create(courseData);
    course &&
      res.status(200).json({
        success: true,
        message: "Created new course",
        course,
      });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

module.exports = { createCourse };
