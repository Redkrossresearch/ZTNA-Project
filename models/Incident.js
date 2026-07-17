const mongoose=require('mongoose');
module.exports=mongoose.model('Incident',new mongoose.Schema({userId:String,ip:String,type:String,severity:String,createdAt:{type:Date,default:Date.now}}));