const express=require('express');const router=express.Router();
const User=require('../models/User');const AccessLog=require('../models/AccessLog');const Incident=require('../models/Incident');
const blacklist=require('../blacklist');const bcrypt=require('bcrypt');const jwt=require('jsonwebtoken');const geoip=require('geoip-lite');
router.post('/login',async(req,res)=>{try{
const {email,password,otp}=req.body; const user=await User.findOne({email}); if(!user)return res.status(404).json({message:'User not found'});
const ok=await bcrypt.compare(password,user.password); if(!ok)return res.status(401).json({message:'Invalid credentials'});
const ip=req.ip||req.connection.remoteAddress; if(blacklist.includes(ip)) return res.status(403).json({message:'Malicious IP blocked'});
const device=req.headers['user-agent']||'unknown';
if(!user.devices) user.devices=[];
if(!user.devices.includes(device)&&user.devices.length>=2) return res.status(403).json({message:'Maximum device limit reached'});
if(!otp){ user.otp=String(Math.floor(100000+Math.random()*900000)); user.otpExpiry=new Date(Date.now()+300000); await user.save(); return res.json({message:'OTP generated',otp:user.otp});}
if(user.otp!==otp||new Date()>user.otpExpiry) return res.status(400).json({message:'Invalid OTP'});
let risk=0; if(!user.devices.includes(device)){user.devices.push(device);risk++;}
if(user.lastIP && user.lastIP!==ip){risk++;}
const geo=geoip.lookup(ip)||{};
await AccessLog.create({userId:user._id,ip,device,country:geo.country||'',city:geo.city||'',risk});
if(risk>=2) await Incident.create({userId:user._id,ip,type:'Session anomaly',severity:'HIGH'});
user.lastIP=ip; await user.save();
const token=jwt.sign({id:user._id},process.env.JWT_SECRET||'secret',{expiresIn:'1d'});
res.json({token,risk});
}catch(e){res.status(500).json({error:e.message})}});
module.exports=router;