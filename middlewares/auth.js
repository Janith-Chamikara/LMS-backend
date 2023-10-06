const jwt = require("jsonwebtoken");
const redis = require("../utils/connectRedis");
const ErrorHandler = require("../utils/ErrorHandler");
require("dotenv").config();
const isAuthenticated = async (req, res, next) => {
  //also possible with cookie
  const authHeader = req.headers.Authorization || req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer")) {
    const accessToken = authHeader.split(" ")[1];
    jwt.verify(
      accessToken,
      process.env.ACCESS_TOKEN_SECRET,
      async (err, decoded) => {
        if (err) {
          throw new Error(
            "Token isn't a valid one.Please login with correct details. "
          );
        }
        const { id } = decoded;
        const cachedUser = await redis.get(id);
        if (!cachedUser) {
          throw new Error("Didn't found user in cached database.");
        }
        req.user = JSON.parse(cachedUser);
        next();
      }
    );
  } else {
    res.status(404);
    throw new Error(
      "You are not authorized.Please login with correct details to have access."
    );
  }
};

const isAdmin = async (req, res, next) => {
  if (!req.user) {
    return next(new ErrorHandler("Please log in first.",404));
  }
  const { roles } = req.user;
  console.log(roles);
  if (roles === "admin") {
    return next();
  } else {
    res.status(200).json({
      success: true,
      message: "You are not an admin, you are not allowed to do this action.",
    });
  }
};

module.exports = { isAuthenticated, isAdmin };