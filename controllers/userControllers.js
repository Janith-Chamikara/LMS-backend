const User = require("../models/userModel");
const jwt = require("jsonwebtoken");

const bcrypt = require("bcryptjs");
const redis = require("../utils/connectRedis");

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
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      throw new Error("All fields are mandatory.");
    }
    const isExisitsUser = await User.findOne({ email });
    if (isExisitsUser) {
      throw new Error("Email already in use.");
    }
    const hashedPassword = await bcrypt.hash(password, 10);

    const { token, activationKey } = createToken(
      { name, email, hashedPassword }
      //id
    );

    const data = { name, activationKey };
    const templatePath = path.resolve(
      __dirname,
      "..",
      "mails",
      "verifyOTP.ejs"
    );
    sendEmail(templatePath, email, "OTP Verification of LMS", data);
    res.status(200).json({
      success: true,
      message: "Successfully registered user.",
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
      expiresIn: "50m",
    }
  );
  return { token, activationKey };
};

const activateUser = async (req, res, next) => {
  const activationKeyFromBody = req.body.activationKey;
  const authHeader = req.headers.Authorization || req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    const token = authHeader.split(" ")[1];
    //const activationKeyFromHeader = authHeader.split(" ")[2];
    jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
      if (err) {
        res.status(404);
        throw new Error(
          "Not a verified access token.Please refresh your token"
        );
      }
      const {
        activationKey,
        user: { email, name, hashedPassword },
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

      const newUser = await User.create({
        email,
        name,
        password: hashedPassword,
      });
      newUser &&
        res.status(200).json({
          success: true,
          message: `Created new user Name - ${newUser.name} ID - ${newUser._id}`,
        });
    });
  } else {
    return next(new ErrorHandler(error.message, 400));
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
      "password name email roles courses"
    );

    if (!isUserExists) {
      res.status(404);
      throw new Error("Invalid email,Please Sign Up first.");
    }
    if (
      isUserExists &&
      (await bcrypt.compare(password, isUserExists.password))
    ) {
      sendToken(
        {
          id: isUserExists._id,
          name: isUserExists.name,
          email: isUserExists.email,
          password: isUserExists.password,
          roles: isUserExists.roles,
          courses: isUserExists.courses,
        },
        200,
        res
      );
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
    if (req.cookies.refreshtoken) {
      const refreshToken = req.cookies.refreshtoken;

      jwt.verify(
        refreshToken,
        process.env.REFRESH_TOKEN_SECRET,
        async (err, decoded) => {
          if (err) {
            throw new ErrorHandler(err.message, 404);
          }
          const { id, name, email, password, roles, courses } = decoded;
          const newAccessToken = jwt.sign(
            { id, name, email, password, roles, courses },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: "30s" }
          );
          const newRefreshToken = jwt.sign(
            { id, name, email, password, roles, courses },
            process.env.REFRESH_TOKEN_SECRET,
            { expiresIn: "3d" }
          );
          res.cookie("accesstoken", newAccessToken, accessCookieOptions);
          res.cookie("refreshtoken", newRefreshToken, refreshCookieOptions);
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
        404
      );
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
};

const getUserInfo = async (req, res, next) => {
  try {
    const { id } = req.user;
    if (!id) {
      throw new Error("Cannot find ID in req.user");
    }
    const user = await getUserById(id);
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
    const { name, email } = req.body;

    const { id } = req.user;
    const user = await User.findOne({ _id: id });
    //need to confirm whether the given email already in use or not
    const emailAlreadyInUse = email && (await User.findOne({ email }));
    if (emailAlreadyInUse) {
      throw new Error("Email already in DB,Use another one", 404);
    } else {
      email && (user.email = email);
    }
    name && (user.name = name);
    await user.save();
    redis.set(
      id,
      JSON.stringify({ ...req.user, name: user.name, email: user.email })
    );
    res.status(200).json({
      success: true,
      message: `Updated fileds ${
        emailAlreadyInUse ? "Name" : "Name and Email"
      } `,
    });
  } catch (error) {
    return next(new ErrorHandler(error, 404));
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
    const { id, role } = req.body;
    if (!role || !id) {
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
      await user.save();
      res.status(200).json({
        success: true,
        message: "Role updated",
      });
    }
  } catch (error) {
    return next(new ErrorHandler(error.message, 400));
  }
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
  updateAccessToken,
  getUserInfo,
  updateUserInfo,
  updatePassword,
  updateProfileImage,
  getAllUsersForAdmin,
  updateUserRoles,
  deleteUser,
};