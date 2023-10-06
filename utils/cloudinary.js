const cloudinary = require("cloudinary");
require('dotenv').config()

cloudinary.v2.config({
  cloud_name: process.env.CLOUD_NAME,
  api_key: process.env.API_KEY,
  api_secret:process.env.API_SECRET,
});

module.exports = {cloudinary}
