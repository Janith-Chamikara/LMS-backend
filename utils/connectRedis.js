const redis = require("ioredis");
require("dotenv").config();

const redisClient = () => {
  if (process.env.REDIS_URL) {
    console.log("Redis URL - " + process.env.REDIS_URL);
    return process.env.REDIS_URL;
  }
  throw new Error("Redis URL not found.");
};

module.exports = new redis(redisClient(), {
  tls: {
    rejectUnauthorized: false,
  },
});
