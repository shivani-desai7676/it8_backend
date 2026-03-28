const mongoose = require("mongoose");

const adminOtpSchema = new mongoose.Schema({
  email: String,
  otp: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  expiresAt: Date,
});

module.exports = mongoose.model("AdminOtp", adminOtpSchema);