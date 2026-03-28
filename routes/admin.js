const express = require("express");
const router = express.Router();
const { sendAdminOtp, verifyAdminOtp } = require("../controllers/adminController");
const User = require("../models/User");
const UserActivity = require("../models/UserActivity");

// -------------------- ADMIN OTP ROUTES --------------------
router.post("/send-otp", sendAdminOtp);
router.post("/verify-otp", verifyAdminOtp);

// -------------------- FETCH ALL USERS WITH STATUS --------------------
router.get("/users", async (req, res) => {
  try {
    const users = await User.find({}).lean();

    const usersWithStatus = await Promise.all(
      users.map(async (user) => {
        const latestActivity = await UserActivity.findOne({ userId: user._id })
          .sort({ loginTime: -1 })
          .lean();

        return {
          ...user,
          isOnline: latestActivity ? latestActivity.isOnline : false,
          lastLogin: latestActivity ? latestActivity.loginTime : null,
          lastLogout: latestActivity ? latestActivity.logoutTime : null,
        };
      })
    );

    res.json(usersWithStatus);
  } catch (err) {
    console.error("Error fetching users:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ -------------------- ACTIVITY HISTORY --------------------
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
    console.error("Error fetching activity:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


// ✅ -------------------- CURRENT STATUS --------------------
router.get("/activity/status", async (req, res) => {
  try {
    const users = await UserActivity.aggregate([
      { $sort: { loginTime: -1 } },
      {
        $group: {
          _id: "$userId",
          lastLogin: { $first: "$loginTime" },
          lastLogout: { $first: "$logoutTime" },
          isOnline: { $first: "$isOnline" }
        }
      }
    ]);

    const result = await User.populate(users, {
      path: "_id",
      select: "name email"
    });

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
    console.error("Error fetching status:", err.message);
    res.status(500).json({ message: "Server error" });
  }
});


module.exports = router;