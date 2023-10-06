const ErrorHandler = require("../utils/ErrorHandler");

const errorHandler = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || "Internal server error";

  //wrong mongodb id
  if (err.name === "CastError") {
    const message = "Resource not found.";
    err = new ErrorHandler(msg, 400);
  }
  //wrong jwt
  if (err.name === "JsonwebtokenError") {
    const message = "Token Error.";
    err = new ErrorHandler(message, 400);
  }
  res.status(err.statusCode).json({
    success: false,
    message: err.message,
  });
};

module.exports = errorHandler;
