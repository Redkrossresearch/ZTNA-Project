const mongoose=require('mongoose');
const userSchema=new mongoose.Schema({
name:String,email:{type:String,unique:true},password:String,currentToken:String,
devices:[String],lastIP:String,otp:String,otpExpiry:Date
},{timestamps:true});
module.exports=mongoose.model('User',userSchema);