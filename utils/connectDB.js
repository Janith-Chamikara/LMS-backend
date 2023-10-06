const mongoose = require("mongoose");
require('dotenv').config();

const connectDB = async () => {
  try {
    const connect = await mongoose.connect(process.env.CONNECTION_STRING);
    console.log(`DB started ${connect.connection.name}`)
  } catch (err) {
    console.log(err);
  }
};

module.exports = connectDB;
