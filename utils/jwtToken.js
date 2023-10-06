const jwt = require("jsonwebtoken");
require("dotenv").config();
const redis = require("./connectRedis");
const accessCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  maxAge: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) * 1000,
};
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "lax",
  secure: true,
  maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000,
};
const sendToken = async (user = {}, statusCode, response) => {
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: process.env.ACCESS_TOKEN_EXPIRES_IN + "s" || "30s",
  });
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN + "s" || "5h",
  });
  ///new Date(date.now())

  const cachedUser = await redis.set(
    user.id,
    JSON.stringify({ ...user, refreshToken, accessToken })
  );

  response.cookie("accessToken", accessToken, accessCookieOptions);
  response.cookie("refreshToken", refreshToken, refreshCookieOptions);

  //req.user = JSON.parse(cachedUser);

  response.status(statusCode).json({
    success: true,
    accessToken,
    refreshToken,
  });
};

module.exports = { sendToken, accessCookieOptions, refreshCookieOptions };
