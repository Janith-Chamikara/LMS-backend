const { default: mongoose } = require("mongoose");
const Course = require("../models/courseModel.js");
const User = require("../models/userModel.js");
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
    console.log(reqData);
    let { thumbnail } = reqData;
    let { video } = reqData;
    if (thumbnail) {
      const cloud = await cloudinary.v2.uploader.upload(thumbnail, {
        folder: "courses",
      });
      reqData.thumbnail = {
        public_id: cloud.public_id,
        url: cloud.secure_url,
      };
      console.log(reqData);
    }

    await createCourse(reqData, res, next);
    await Notification.create({
      customer: {
        name: req.user.name,
        email: req.user.email,
        id: req.user.id,
      },
      status: "unread",
      title: `New Course was added`,
      message: `New course - ${reqData.name} has been uploaded by ${req.user.name}`,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message), 404);
  }
};

const updateCourse = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { thumbnail, name, level, price, estimatedPrice } = req.body;
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
    name && (course.name = name);
    level && (course.level = level);
    estimatedPrice && (course.estimatedPrice = estimatedPrice);
    price && (course.price = price);
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
      message: "Successfully updated Course.",
      updatedCourse,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const getCartItems = async (req, res, next) => {
  try {
    const { id } = req.params;
    // const { cart } = req.user;
    // if (!cart) {
    //   return next(new ErrorHandler("Cannot find user cart.", 404));
    // }
    const user = await User.findById(id);
    const cart = user.cart;
    let courses;
    if (cart.length > 0) {
      const coursePromises = cart.map(async (cartItem) => {
        const course = await Course.findById(cartItem.course_id);
        return course;
      });
      courses = await Promise.all(coursePromises);
    } else {
      courses = [];
    }
    courses.length === 0
      ? res.status(200).json({ success: true, message: "Your cart is empty" })
      : res.status(200).json({
          success: true,
          courses,
          message: "Cart items fetched successfully.",
        });
  } catch (error) {
    return next(new ErrorHandler(error.message, 403));
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
        "-courseInfo.suggestions -courseInfo.questions"
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
    // const coursesExistsInRedis = await redis.get("all-courses");
    // if (coursesExistsInRedis) {
    //   const courses = JSON.parse(coursesExistsInRedis);
    //   res.status(200).json({
    //     success: true,
    //     courses,
    //   });
    // } else {
    const courses = await Course.find().select(
      "-courseInfo.suggestions -courseInfo.questions"
    );
    // await redis.set("all-courses", JSON.stringify(courses));
    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(error.message, 404));
  }
};
const getAllCoursesAbstractive = async (req, res, next) => {
  try {
    // const coursesExistsInRedis = await redis.get("all-courses");
    // if (coursesExistsInRedis) {
    //   const courses = JSON.parse(coursesExistsInRedis);
    //   res.status(200).json({
    //     success: true,
    //     courses,
    //   });
    // } else {
    const courses = await Course.find().select(
      "-courseInfo -reviews -benifits -preRequisties -ratings -purchased -level"
    );
    // await redis.set("all-courses", JSON.stringify(courses));
    res.status(200).json({
      success: true,
      courses,
    });
  } catch (error) {
    console.log(error);
    return next(new ErrorHandler(error.message, 404));
  }
};

const getPaidCourse = async (req, res, next) => {
  try {
    const { courses } = req.user;
    const { id } = req.params;
    console.log(id);
    console.log(courses);
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
    const { id } = req.user;
    const user = await User.findById(id);
    if (!user.courses) {
      throw new Error("Courses not found.Please log in again.");
    }
    const purchasedCourses = await Promise.all(
      user.courses.map((item) => Course.findById(item.course_id))
    );

    res.status(200).json({
      success: true,
      purchasedCourses,
    });
  } catch (error) {
    next(new ErrorHandler(error.message, 404));
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
    // const { courses } = req.user;
    // console.log(courses);
    const { id } = req.params;
    const { comment, rating } = req.body;
    // const courseExists = courses?.find((item) => item.course_id === id);
    // if (!courseExists) {
    //   return next(
    //     new ErrorHandler(
    //       "You cannot add a review to unpuarchased course.Please buy it to add a review",
    //       404
    //     )
    //   );
    // }
    const course = await Course.findById(id);

    if (comment || rating) {
      const newReview = {
        name: req.user.name,
        id: req.user.id,
        avatar: req.user.avatar.url,
        email: req.user.email,
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
        message: "Thanks for your review.It will be published here soon.",
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

const addToCart = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(req.user.id);
    if (!user) {
      return next(
        new ErrorHandler("Not found req.user. Man be your token expired.", 400)
      );
    }
    if (user.cart.length > 0) {
      const courseExistsInCart = user.cart.find(
        (cartItem) => cartItem.course_id === id
      );
      if (courseExistsInCart) {
        return next(
          new ErrorHandler("This course is in your cart already.", 400)
        );
      }
    }

    const course = await Course.findById(id);
    if (!course) {
      return next(
        new ErrorHandler("Not found req.user. Man be your token expired.", 400)
      );
    }
    user.cart.push({ course_id: id });
    const newUser = await user.save();

    await redis.set(
      req.user.id,
      JSON.stringify({ ...req.user, cart: newUser.cart })
    );

    res.status(200).json({
      success: true,
      message: "Successfully added course to your cart.",
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
  getAllCoursesAbstractive,
  getPaidCourse,
  getPaidCourses,
  addToCart,
  getCartItems,
  addQuestion,
  addAnswer,
  addReview,
  addReplyToReview,
  getAllCoursesForAdmin,
  deleteCourse,
};
