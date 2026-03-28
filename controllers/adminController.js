const Admin = require("../models/Admin");
const AdminOtp = require("../models/AdminOtp");
const sendEmail = require("../utils/sendEmail");

exports.sendAdminOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) return res.status(400).json({ message: "Email required" });

  try {
    const admin = await Admin.findOne({ email });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await AdminOtp.create({
      email,
      otp,
      expiresAt: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes expiry
    });

    await sendEmail(email, otp);

    res.json({ message: "OTP sent successfully" });
  } catch (error) {
    console.error("sendAdminOtp error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

exports.verifyAdminOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    const record = await AdminOtp.findOne({ email, otp });
    if (!record) return res.status(400).json({ message: "Invalid OTP" });

    if (record.expiresAt < new Date()) {
      await AdminOtp.deleteOne({ _id: record._id });
      return res.status(400).json({ message: "OTP expired" });
    }

    await AdminOtp.deleteOne({ _id: record._id });
    res.json({ message: "Admin login successful" });
  } catch (error) {
    console.error("verifyAdminOtp error:", error);
    res.status(500).json({ message: "Server error" });
  }
};
