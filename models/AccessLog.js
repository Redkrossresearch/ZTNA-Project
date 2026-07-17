const mongoose=require('mongoose');
const s=new mongoose.Schema({userId:String,ip:String,device:String,country:String,city:String,risk:Number,createdAt:{type:Date,default:Date.now}});
module.exports=mongoose.model('AccessLog',s);