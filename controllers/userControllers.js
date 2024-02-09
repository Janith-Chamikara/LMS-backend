const User = require("../models/userModel");
const jwt = require("jsonwebtoken");
const path = require("path");
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const bcrypt = require("bcryptjs");
const redis = require("../utils/connectRedis");
const Notification = require("../models/notificationModel")
const { sendEmail } = require("../utils/sendEmail");
const {
  sendToken,
  accessCookieOptions,
  refreshCookieOptions,
} = require("../utils/jwtToken");
const { getUserById } = require("../services/userServices");
const ErrorHandler = require("../utils/ErrorHandler");
const { cloudinary } = require("../utils/cloudinary");
//register an user
//POST route
const registerUser = async (req, res, next) => {
  try {
    const { name, email, password, profileImg } = req.body;
    if (!name || !email || !password) {
      throw new Error("All fields are mandatory.");
    }
    let url;
    let public_id;
    if (profileImg) {
      const cloud = await cloudinary.v2.uploader.upload(profileImg, {
        folder: "users",
      });
      public_id = cloud.public_id;
      url = cloud.secure_url;
    }
    const isExisitsUser = await User.findOne({ email });
    if (isExisitsUser) {
      throw new Error("Email already in use.");
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const { token, activationKey } = createToken(
      { name, email, hashedPassword, public_id, url }
      //id
    );

    const data = { name, activationKey };
    const templatePath = path.resolve(
      __dirname,
      "..",
      "mails",
      "verifyOTP.ejs"
    );
    console.log(templatePath);
    sendEmail(templatePath, email, "OTP Verification of LMS", data);
    res.status(200).json({
      success: true,
      message: "An Email was sent you to verify your account.",
      token,
      activationKey,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
const createToken = (user = {}) => {
  const activationKey = Math.floor(Math.random() * (99999 - 10000 + 1) + 10000);
  const token = jwt.sign(
    { user: { ...user }, activationKey },
    process.env.JWT_SECRET,
    {
      expiresIn: "5m",
    }
  );
  return { token, activationKey };
};

const activateUser = async (req, res, next) => {
  const activationKeyFromBody = req.body.activationKey;
  console.log(activationKeyFromBody);
  const authHeader = req.headers.Authorization || req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    const token = authHeader.split(" ")[1];
    //const activationKeyFromHeader = authHeader.split(" ")[2];
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      try {
        if (err) {
          res.status(404);
          throw new Error(
            "Not a verified access token.Please refresh your token"
          );
        }

        const {
          activationKey,
          user: { email, name, hashedPassword, public_id, url },
        } = decoded;
        if (activationKey.toString() !== activationKeyFromBody) {
          throw new Error("Invalid Activation Code.");
        }
        const isExisitsUser = await User.findOne({ email });

        if (isExisitsUser) {
          res.status(404);
          throw new Error("User/Email already exists.");
        }
        //try to send token from registration to activate
        const data = {
          email,
          name,
          password: hashedPassword,
          avatar: {
            public_id,
            url,
          },
        };

        const newUser = await User.create(data);
        const payLoad = {
          id: newUser._id,
          avatar: newUser.avatar,
          name: newUser.name,
          email: newUser.email,
          password: newUser.password,
          roles: newUser.roles,
          courses: newUser.courses,
          cart: newUser.cart,
        };
        const refreshToken = jwt.sign(
          payLoad,
          process.env.REFRESH_TOKEN_SECRET,
          { expiresIn: "5h" }
        );
        redis.set(newUser._id, JSON.stringify(newUser), "EX", 432000);
        res.cookie("refreshToken", refreshToken, refreshCookieOptions);
        await Notification.create({
          customer: {
            name: newUser.name,
            email: newUser.email,
            id: newUser._id,
          },
          status: "unread",
          title: `New User Signed Up`,
          message: `New user - ${newUser.name} has signed into your site . ID - ${newUser._id}`,
        });
        newUser &&
          res.status(200).json({
            user: newUser,
            success: true,
            message: `Successfully registerd. Created new user, Name - ${newUser.name} ID - ${newUser._id}`,
          });
      } catch (error) {
        return next(new ErrorHandler(error.message, 400));
      }
    });
  } else {
    return next(new ErrorHandler("Cannot find Access Token", 400));
  }
};

const signInUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(404);
      throw new Error("Both email and password are required.");
    }
    const isUserExists = await User.findOne({ email }).select(
      "password name email roles courses avatar cart"
    );

    if (!isUserExists) {
      res.status(404);
      throw new Error("Invalid email,Please Sign Up first.");
    }
    if (
      isUserExists &&
      (await bcrypt.compare(password, isUserExists.password))
    ) {
      const { accessToken, refreshToken } = await sendToken(
        {
          id: isUserExists._id,
          avatar: isUserExists.avatar,
          name: isUserExists.name,
          email: isUserExists.email,
          password: isUserExists.password,
          roles: isUserExists.roles,
          courses: isUserExists.courses,
          cart: isUserExists.cart,
        },
        res
      );
      console.log(accessToken);

      res.status(200).json({
        success: true,
        message: "Successfully logged in.Please wait...",
        accessToken,
        refreshToken,
        userInfo: {
          avatar: isUserExists.avatar,
          id: isUserExists._id,
          name: isUserExists.name,
          email: isUserExists.email,
          password: isUserExists.password,
          roles: isUserExists.roles,
          courses: isUserExists.courses,
          cart: isUserExists.cart,
        },
      });
    } else {
      throw new Error("Invalid Password.");
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const signOutUser = async (req, res, next) => {
  try {
    res.cookie("accesstoken", "", { maxAge: 1 });
    res.cookie("refreshtoken", "", { maxAge: 1 });

    const { id } = req.user;
    redis.del(id);
    res
      .status(200)
      .json({ success: true, message: "Successfully logged out." });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const updateAccessToken = async (req, res, next) => {
  try {
    console.log(req.headers);
    console.log(req.cookies.refreshToken);
    if (req.cookies.refreshToken) {
      const refreshToken = req.cookies.refreshToken;
      console.log(refreshToken);

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
          if (err) {
            throw new ErrorHandler(err.message, 404);
          }
          const { id } = decoded;
          const cachedUser = await redis.get(id);
          const user = JSON.parse(cachedUser);
          const { name, email, password, roles, courses, avatar, cart } = user;
          const newAccessToken = jwt.sign(
            { id, name, email, password, roles, courses, avatar, cart },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "60s" }
          );
          const newRefreshToken = jwt.sign(
            { id, name, email, password, roles, courses, avatar, cart },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "1d" }
          );
          res.cookie("accessToken", newAccessToken, accessCookieOptions);
          res.cookie("refreshToken", newRefreshToken, refreshCookieOptions);
          await redis.set(
            id,
            JSON.stringify({ ...decoded, newRefreshToken, newAccessToken }),
            "EX",
            432000
          );
          res.status(200).json({
            success: true,
            newAccessToken,
            newRefreshToken,
          });
        }
      );
    } else {
      throw new ErrorHandler(
        "Cannot find refresh token to update your access",
        403
      );
    }
  } catch (error) {
    console.log(error.message);
    return next(new ErrorHandler(error.message, 403));
  }
};

const getUserInfo = async (req, res, next) => {
  try {
    console.log(req.params);
    const { id } = req.params;
    if (!id) {
      throw new Error("Cannot find ID in req.params");
    }
    let user;
    // if (await getUserById(id)) {
    //   console.log("by redis");
    //   user = await getUserById(id);
    // } else {
    user = await User.findById(id);

    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    next(new ErrorHandler(error, 404));
  }
};

//social auth

const updateUserInfo = async (req, res, next) => {
  try {
    const { name } = req.body;

    const { id } = req.user;
    const user = await User.findOne({ _id: id });
    //need to confirm whether the given email already in use or not
    // const emailAlreadyInUse = email && (await User.findOne({ email }));
    // if (emailAlreadyInUse) {
    //   throw new Error("Email already in DB,Use another one", 404);
    // } else {
    //   email && (user.email = email);
    // }
    name && (user.name = name);
    await user.save();
    console.log(name);
    redis.set(id, JSON.stringify({ ...req.user, name: user.name }));
    res.status(200).json({
      success: true,
      name,
      message: "Successfully updated your name",
    });
  } catch (error) {
    return next(new ErrorHandler(error, 404));
  }
};

const sendPasswordResetMail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const isUserExists = await User.findOne({ email });
    if (!isUserExists) {
      return next(
        new ErrorHandler("Invalid Email Please give your correct email.", 404)
      );
    }
    const token = jwt.sign(
      { email, id: isUserExists._id },
      process.env.ACCESS_TOKEN_SECRET,
      {
        expiresIn: "5m",
      }
    );
    const url = `http://localhost:5173/resetPassword?token=${token}&id=${isUserExists._id}`;
    const data = { url };
    console.log(url);
    const templatePath = path.resolve(
      __dirname,
      "..",
      "mails",
      "ResetPassword.ejs"
    );
    console.log(templatePath);
    sendEmail(templatePath, email, "Password Restoration", data);
    res.status(200).json({
      success: true,
      message: "An email will be sent you shortly.",
    });
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token) {
      return next(
        new ErrorHandler("Your Link for password restoration was expired.")
      );
    }

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, async (err, decoded) => {
      try {
        if (err) {
          return next(new ErrorHandler(error.message, 404));
        }
        const { id, email } = decoded;
        const user = await User.findById(id);
        if (!user) {
          return next(new ErrorHandler("Not authorized", 404));
        }
        const newHashedpassword = await bcrypt.hash(password, 10);
        user.password = newHashedpassword;
        await user.save();
        res
          .status(200)
          .json({ success: true, message: "Successfully updated password." });
      } catch (error) {
        return next(new ErrorHandler(error, 400));
      }
    });
  } catch (error) {
    return next(new ErrorHandler(error, 400));
  }
};

const updatePassword = async (req, res, next) => {
  const { oldPassword, newPassword } = req.body;
  const { id, password } = req.user;
  const user = await User.findOne({ _id: id });

  if (newPassword && (await bcrypt.compare(oldPassword, password))) {
    const newHashedpassword = await bcrypt.hash(newPassword, 10);
    user.password = newHashedpassword;
    await user.save();
    redis.set(id, JSON.stringify({ ...req.user, password: newHashedpassword }));
    res.status(200).json({ success: true, message: "Updated password." });
  } else {
    next(new ErrorHandler("Enter your new password to update your password"));
  }
};

const updateProfileImage = async (req, res, next) => {
  try {
    const { avatar } = req.body;
    const { id } = req.user;

    const user = await User.findById(id);

    if (user?.avatar?.public_id) {
      await cloudinary.v2.uploader.destroy(user?.avatar?.public_id);
    }
    const newAvatarCloud =
      avatar &&
      (await cloudinary.uploader.upload(avatar, {
        folder: "avatars",
      }));
    const newAvatar = {
      public_id: newAvatarCloud?.public_id,
      url: newAvatarCloud?.secure_url,
    };
    newAvatar && (user.avatar = newAvatar);
    await user.save();
    res.status(200).json({
      success: true,
      message: "Successfully updated user avatar.",
      newAvatar,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 404));
  }
};
const getAllUsersForAdmin = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({ users });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const updateUserRoles = async (req, res, next) => {
  try {
    const { id } = req.params;
    console.log(id);
    const { role } = req.body;
    if (!role) {
      return next(
        new ErrorHandler("Cannot update user roles without role and id.", 404)
      );
    }
    const user = await User.findById(id);
    if (!user) {
      return next(new ErrorHandler("Invalid user id.", 404));
    }
    if (role) {
      user.roles = role;
      const updatedUser = await user.save();
      res.status(200).json({
        success: true,
        message: "Role updated",
        updatedUser,
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const createCheckoutSession = async (req, res) => {
  const { course } = req.body;
  const lineItems = [
    {
      price_data: {
        currency: "usd",
        product_data: {
          name: course.name,
          images: [course.thumbnail.url],
        },
        unit_amount: course.price * 100,
      },
      quantity: 1,
    },
  ];

  const session = await stripe.checkout.sessions.create({
    line_items: lineItems,
    mode: "payment",
    success_url:
      "http://localhost:5173/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "http://localhost:5173/failed",
    metadata: {
      courseId: course._id,
    },
  });

  res.status(200).json({ id: session.id });
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      return next(new ErrorHandler("Invalid user id.", 400));
    }
    await User.deleteOne({ _id: id });
    await redis.del(id);
    res.status(200).json({
      success: true,
      message: `Successfully deleted a User(id:${user._id})`,
    });
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};
module.exports = {
  registerUser,
  activateUser,
  signInUser,
  signOutUser,
  createCheckoutSession,
  updateAccessToken,
  getUserInfo,
  updateUserInfo,
  updatePassword,
  sendPasswordResetMail,
  updateProfileImage,
  forgotPassword,
  getAllUsersForAdmin,
  updateUserRoles,
  deleteUser,
};
