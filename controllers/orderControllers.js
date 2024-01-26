const ErrorHandler = require("../utils/ErrorHandler");
const Order = require("../models/orderModel");
const Notification = require("../models/notificationModel");
const User = require("../models/userModel");
const Course = require("../models/courseModel");
const { sendEmail } = require("../utils/sendEmail");
const path = require("path");
const redis = require("../utils/connectRedis");
const createOrder = async (req, res, next) => {
  try {
    const { courseId, paymentInfo } = req.body;
    const user = await User.findById(req.user.id);
    console.log(user);
    const courseExists = user.courses.find(
      (item) => item.course_id === courseId
    );
    console.log(courseExists);
    if (courseExists) {
      return next(
        new ErrorHandler("You have already purchased the course.", 400)
      );
    }
    const course = await Course.findById(courseId);

    if (!course) {
      return next(new ErrorHandler("Course not found.", 404));
    }
    if (courseId && paymentInfo) {
      const data = {
        courseId,
        userId: user.id,
        paymentInfo,
      };
      const order = data && (await Order.create(data));
      order && user.courses.push({ course_id: courseId });

      const newUser = await user.save();
      console.log(newUser);
      newUser && await redis.set(user._id, JSON.stringify(newUser), "EX", 432000);

      const templatePath = path.resolve(
        __dirname,
        "..",
        "mails",
        "newOrder.ejs"
      );
      const content = {
        name: user.name,
        email: user.email,
        courseName: course.name,
        paymentInfo,
        price: course.price,
        thumbnail: course.thumbnail.url,
        courseId,
        date: new Date().toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        }),
      };
      sendEmail(
        templatePath,
        user.email,
        "Purchased order successfully.",
        content
      );
      if (course) {
        course.purchased += 1;
        await course.save();
      }

      await Notification.create({
        customer: {
          email: user.email,
          name: user.name,
        },
        title: "New Order",
        message: `${user.name} has purchased ${course.name}`,
        status: "unread",
      });
      res.status(200).json({
        message: `Successfully purchased ${course.name}`,
        success: true,
        order,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};

const getAllordersForAdmin = async (req, res, next) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.status(200).json({ orders });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

module.exports = {
  createOrder,
  getAllordersForAdmin,
};
