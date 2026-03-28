const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const UserActivity = require("../models/UserActivity");
const sendEmail = require("../utils/sendEmail");

// -------------------- REGISTER - SEND OTP --------------------
router.post("/send-otp", async (req, res) => {
  try {
    const { name, email } = req.body;
    if (!email || !name) return res.status(400).json({ message: "Name and Email required" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await User.findOneAndUpdate(
      { email },
      {
        name,
        email,
        otp,
        otpExpiry: Date.now() + 10 * 60 * 1000,
        isVerified: false
      },
      { upsert: true, new: true }
    );

    await sendEmail(email, otp);

    res.json({ message: "OTP sent" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- VERIFY REGISTER OTP --------------------
router.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });
    if (user.otp !== otp || user.otpExpiry < Date.now())
      return res.status(400).json({ message: "Invalid or expired OTP" });

    const hashedPassword = await bcrypt.hash(password, 10);
    user.password = hashedPassword;
    user.isVerified = true;
    user.otp = null;
    user.otpExpiry = null;

    await user.save();
    res.json({ message: "Registration successful" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- LOGIN - SEND OTP --------------------
router.post("/login", async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.otp = otp;
    user.otpExpiry = Date.now() + 10 * 60 * 1000;
    await user.save();
    await sendEmail(email, otp);

    res.json({ message: "OTP sent to email" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- VERIFY LOGIN OTP --------------------
router.post("/verify-login-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "User not found" });

    if (user.otp !== otp || user.otpExpiry < Date.now()) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    // Create JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    // Clear OTP
    user.otp = null;
    user.otpExpiry = null;
    await user.save();

    // Record login activity
    await UserActivity.create({
      userId: user._id,
      loginTime: new Date(),
      isOnline: true
    });

    res.json({
      message: "Login successful",
      token,
      email: user.email,
      name: user.name,
      userId: user._id
    });
  } catch (err) {
    console.error("Error in verify-login-otp:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- LOGOUT --------------------
router.post("/logout", async (req, res) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "userId is required" });

    // Mark all active sessions as offline
    await UserActivity.updateMany(
      { userId, isOnline: true },
      { $set: { isOnline: false, logoutTime: new Date() } }
    );

    res.json({ message: "Logout recorded" });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- GET LOGIN/LOGOUT HISTORY --------------------
router.get("/activity/history", async (req, res) => {
  try {
    const activity = await UserActivity.find()
      .populate("userId", "name email")
      .sort({ loginTime: -1 })
      .lean();

    const formatted = activity.map(a => ({
      _id: a._id,
      name: a.userId.name,
      email: a.userId.email,
      loginTime: a.loginTime,
      logoutTime: a.logoutTime,
      isOnline: a.isOnline
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// -------------------- GET CURRENT STATUS --------------------
router.get("/activity/status", async (req, res) => {
  try {
    const users = await UserActivity.aggregate([
      { $sort: { loginTime: -1 } },
      { $group: { 
          _id: "$userId", 
          lastLogin: { $first: "$loginTime" },
          lastLogout: { $first: "$logoutTime" },
          isOnline: { $first: "$isOnline" }
      }}
    ]);

    const result = await User.populate(users, { path: "_id", select: "name email" });

    const formatted = result.map(u => ({
      userId: u._id._id,
      name: u._id.name,
      email: u._id.email,
      lastLogin: u.lastLogin,
      lastLogout: u.lastLogout,
      isOnline: u.isOnline
    }));

    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

module.exports = router;
