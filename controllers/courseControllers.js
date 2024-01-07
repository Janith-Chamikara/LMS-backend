const { default: mongoose } = require("mongoose");
const Course = require("../models/courseModel.js");
const Notification = require("../models/notificationModel.js");
const { createCourse } = require("../services/courseServices.js");
const { cloudinary } = require("../utils/cloudinary");
const redis = require("../utils/connectRedis.js");
const ErrorHandler = require("../utils/ErrorHandler.js");
const { sendEmail } = require("../utils/sendEmail.js");
const path = require("path");
const uploadCourse = async (req, res, next) => {
  try {
    const reqData = req.body;
    console.log(req.body);
    // console.log(reqData);
    let { thumbnail } = reqData;
    if (thumbnail) {
      const cloud = await cloudinary.v2.uploader.upload(thumbnail.name, {
        folder: "courses",
      });
      data.thumbnail = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
      console.log(data.thumbnail.public_id);
    }

    await createCourse(data, res, next);
  } catch (error) {
    return next(new ErrorHandler(error.message), 404);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { thumbnail, newName } = req.body;
    const course = await Course.findById(id);
    if (thumbnail) {
      await cloudinary.uploader.destroy(course.thumbnail.public_id);
      const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
        folder: "courses",
      });
      const newThumbnail = {
        url: cloud.secure_url,
        public_id: cloud.public_id,
      };
      course.thumbnail = newThumbnail;
    }
    newName && (course.name = newName);
    const updatedCourse = await course.save();
    // const { id } = req.params;
    // const { data } = req.body;
    // const course = await Course.findById(id);
    // if (data?.thumbnail) {
    //   await cloudinary.uploader.destroy(course?.thumbnail?.public_id);
    // }
    // const cloud =data?.thumbnail && (await cloudinary.uploader.upload(data.thumbnail, {
    //   folder: "courses",
    // }))
    // const newThumbnail = {
    //   public_id: cloud?.public_id,
    //   url: cloud?.secure_url,
    // };
    // newThumbnail && (course.thumbnail = newThumbnail);
    // data?.newName && (course.name = newName);
    // //add more if you want
    // const updatedCourse = await course.save();
    res.status(200).json({
      success: true,
      updatedCourse,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const getSingleCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const courseExistsInRedis = await redis.get(id);
    if (courseExistsInRedis) {
      const course = JSON.parse(courseExistsInRedis);
      res.status(200).json({
        success: true,
        course,
      });
    } else {
      const course = await Course.findById(id).select(
        "-courseInfo.videoUrl -courseInfo.suggestions -courseInfo.questions -courseInfo.links"
      );
      await redis.set(id, JSON.stringify(course));
      res.status(200).json({
        success: true,
        course,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};
const getAllCourses = async (req, res, next) => {
  try {
    const coursesExistsInRedis = await redis.get("all-courses");
    if (coursesExistsInRedis) {
      const courses = JSON.parse(coursesExistsInRedis);
      res.status(200).json({
        success: true,
        courses,
      });
    } else {
      const courses = await Course.find().select(
        "-courseInfo.videoUrl -courseInfo.suggestions -courseInfo.questions -courseInfo.links"
      );
      await redis.set("all-courses", JSON.stringify(courses));
      res.status(200).json({
        success: true,
        courses,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const getPaidCourse = async (req, res, next) => {
  try {
    const { courses } = req.user;
    const { id } = req.params;
    console.log(id);

    const courseExists = courses?.find((course) => course.course_id === id);
    console.log(courseExists);
    if (!courseExists) {
      return next(
        new ErrorHandler(
          "Course not found.Please purchase to get access to a course.",
          404
        )
      );
    }
    const course = await Course.findById(id);
    res.status(200).json({
      success: true,
      course,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};
const getPaidCourses = async (req, res, next) => {
  try {
    const { courses } = req.user;

    if (!courses) {
      return next(
        new ErrorHandler("Courses not found.Please log in again.", 404)
      );
    }
    const purchasedCourses = await Promise.all(
      courses.map((item) => Course.findById(item.course_id))
    );

    res.status(200).json({
      success: true,
      purchasedCourses,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const addQuestion = async (req, res, next) => {
  try {
    const { question, courseId, contentId } = req.body;
    console.log(question, courseId, contentId);
    const course = await Course.findById(courseId);
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return next(new ErrorHandler("Invalid content Id.", 404));
    }
    const courseContent = course?.courseInfo?.find((item) =>
      item._id.equals(contentId)
    );
    if (!courseContent) {
      return next(new ErrorHandler("Invalid content Id."), 404);
    }
    const newQuestion = {
      question,
      user: { name: req.user.name, email: req.user.email, id: req.user.id },
      questionReplies: [],
    };
    courseContent.questions.push(newQuestion);
    await course.save();
    await Notification.create({
      customer: { name: req.user.name, email: req.user.email, id: req.user.id },
      status: "unread",
      title: "New question",
      message: `New Question was added by ${req.user.name} in ${courseContent.title}`,
    });
    res.status(200).json({
      success: true,
      message: "New question added.",
      course,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const addAnswer = async (req, res, next) => {
  try {
    const { contentId, questionId, answer, courseId } = req.body;
    const course = await Course.findById(courseId);
    if (!mongoose.Types.ObjectId.isValid(contentId)) {
      return next(new ErrorHandler("Invalid content Id.", 404));
    }
    const courseContent = course?.courseInfo?.find((item) =>
      item._id.equals(contentId)
    );
    if (!courseContent) {
      return next(new ErrorHandler("Invalid content Id."), 404);
    }
    const question = courseContent?.questions.find((item) =>
      item._id.equals(questionId)
    );
    if (!question) {
      return next(new ErrorHandler("Invalid question id.", 404));
    }
    const newAnswer = {
      user: { name: req.user.name, email: req.user.email },
      answer,
    };
    question && question.questionReplies.push(newAnswer);
    await course.save();
    if (question.user.id !== req.user.id) {
      const templatePath = path.resolve(
        __dirname,
        "..",
        "mails",
        "notification.ejs"
      );
      sendEmail(templatePath, question.user.email, "Notification", {
        email: req.user.email,
        name: req.user.name,
      });
    }
    newAnswer &&
      (await Notification.create({
        customer: {
          name: req.user.name,
          email: req.user.email,
          id: req.user.id,
        },
        status: "unread",
        title: "New reply",
        message: `New reply was added by ${req.user.name} in ${courseContent.title}`,
      }));

    res.status(200).json({
      success: true,
      replies: [...question.questionReplies],
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const addReview = async (req, res, next) => {
  try {
    const { courses } = req.user;
    console.log(courses);
    const { id } = req.params;
    const { comment, rating } = req.body;
    const courseExists = courses?.find((item) => item.course_id === id);
    if (!courseExists) {
      return next(
        new ErrorHandler(
          "You cannot add a review to unpuarchased course.Please buy it to add a review",
          404
        )
      );
    }
    const course = courseExists && (await Course.findById(id));

    if (comment || rating) {
      const newReview = {
        user: { name: req.user.name, email: req.user.email },
        rating,
        comment,
      };
      course.reviews.push(newReview);

      let avg = 0;
      course?.reviews?.forEach((review) => (avg += review.rating));
      course.ratings = avg / course.reviews.length;
      const updatedCourse = await course.save();
      res.status(200).json({
        success: true,
        updatedCourse,
      });
      await Notification.create({
        customer: {
          name: req.user.name,
          email: req.user.email,
          id: req.user.id,
        },
        status: "unread",
        title: `New review to course ${course.name}`,
        message: `New review was added by ${req.user.name} in ${course.name}`,
      });
    }
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(error.message, 404));
  }
};

const addReplyToReview = async (req, res, next) => {
  try {
    const { courseId, reviewId, comment } = req.body;
    const course = await Course.findById(courseId);
    if (!course) {
      return next(new ErrorHandler("Cannot find course.Try again later."));
    }
    const review = course.reviews.find((item) => item._id.equals(reviewId));
    if (comment) {
      const commentFromAdmin = {
        comment,
        user: {
          admin: req.user.roles,
          name: req.user.name,
          email: req.user.email,
        },
      };
      review.commentReplies.push(commentFromAdmin);
      const updatedCourse = await course.save();
      res.status(200).json({
        success: true,
        message: "Added reply to a review.",
        updatedCourse,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const getAllCoursesForAdmin = async (req, res, next) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const deleteCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const course = await Course.findById(id);
    if (!course) {
      return next(new ErrorHandler("Invalid course Id.", 400));
    }
    await Course.deleteOne({ _id: id });
    const JSONcourses = await redis.get("all-courses");
    const courses = JSON.parse(JSONcourses);
    const newCourses = courses.filter((item) => item._id !== course._id);
    await redis.set("all-courses", JSON.stringify(newCourses));
    res.status(200).json({
      success: true,
      message: `Successfully removed a course( id: ${course._id})`,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

module.exports = {
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
};
