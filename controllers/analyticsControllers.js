const ErrorHandler = require('../utils/ErrorHandler')
const {getLast12MonthsAnalytics} = require("../utils/analyticsGenerator")
const User = require('../models/userModel')
const Course = require("../models/courseModel")
const Order = require("../models/orderModel")

const getUserAnalytics =async(req,res,next)=>{
 try {
  const analytics = await getLast12MonthsAnalytics(User)
  res.status(200).json({
   success:true,
   analytics
  })
 } catch (error) {
  return next(new ErrorHandler(error.message,400))
 }
}
const getCourseAnalytics =async(req,res,next)=>{
 try {
  const analytics = await getLast12MonthsAnalytics(Course)
  res.status(200).json({
   success:true,
   analytics
  })
 } catch (error) {
  return next(new ErrorHandler(error.message,400))
 }
}
const getOrderAnalytics =async(req,res,next)=>{
 try {
  const analytics = await getLast12MonthsAnalytics(Order)
  res.status(200).json({
   success:true,
   analytics
  })
 } catch (error) {
  return next(new ErrorHandler(error.message,400))
 }
}

module.exports  = {
 getUserAnalytics,
 getOrderAnalytics,
 getCourseAnalytics
}