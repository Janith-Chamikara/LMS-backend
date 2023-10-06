const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
 courseId:{
  type:String,
  required:[true,'Course ID is required.']
 },
 userId:{
  type:String,
  required:[true, 'User ID is required.']
 },
 paymentInfo:{
  type:Object,
  //required
 }
},{
 timestamps:true
})

module.exports = mongoose.model("Order",orderSchema)