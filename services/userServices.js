const User = require("../models/userModel");
const ErrorHandler = require("../utils/ErrorHandler");
const redis = require("../utils/connectRedis");

const getUserById = async (ID) => {
  try {
    const JSONuser = await redis.get(ID);
    const user = JSON.parse(JSONuser);
    if (!JSONuser) {
      throw new Error("Invalid user ID.Enter a valid one.");
    }
    return user;
  } catch (error) {
    return new ErrorHandler("Cannot fetch from redis.", 400);
  }
};



module.exports = {
  getUserById,
  
};
