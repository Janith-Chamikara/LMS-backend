const jwt = require("jsonwebtoken");
require("dotenv").config();
const redis = require("./connectRedis");
const accessCookieOptions = {
  httpOnly: true,
  sameSite: "None",
  secure: true,
  maxAge: Number(process.env.ACCESS_TOKEN_EXPIRES_IN) * 1000,
};
const refreshCookieOptions = {
  httpOnly: true,
  sameSite: "None",
  secure: true,
  maxAge: Number(process.env.REFRESH_TOKEN_EXPIRES_IN) * 1000,
};
const sendToken = async (user = {}, response) => {
  const accessToken = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
    expiresIn: "70s",
  });
  const refreshToken = jwt.sign(user, process.env.REFRESH_TOKEN_SECRET, {
    expiresIn: "5h",
  });
  ///new Date(date.now())

  const cachedUser = await redis.set(
    user.id,
    JSON.stringify({ ...user, refreshToken, accessToken })
  );

  response.cookie("accessToken", accessToken, accessCookieOptions);
  response.cookie("refreshToken", refreshToken, refreshCookieOptions);

  //req.user = JSON.parse(cachedUser);

  return { accessToken, refreshToken };
};

module.exports = { sendToken, accessCookieOptions, refreshCookieOptions };
