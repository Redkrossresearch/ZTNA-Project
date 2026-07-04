const mongoose = require("mongoose");

const accessLogSchema = new mongoose.Schema({

    userId: String,

    ip: String,

    browser: String,

    os: String,

    device: String,

    deviceType: String

}, {

    timestamps: true

});

module.exports = mongoose.model("AccessLog", accessLogSchema);