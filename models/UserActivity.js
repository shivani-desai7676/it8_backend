const mongoose = require("mongoose");

const UserActivitySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  loginTime: { type: Date, default: Date.now },
  logoutTime: { type: Date, default: null },
  isOnline: { type: Boolean, default: true }
}, { timestamps: true }); // optional, adds createdAt and updatedAt

module.exports = mongoose.model("UserActivity", UserActivitySchema);
