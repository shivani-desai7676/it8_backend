const express = require("express");
const router = express.Router();
const multer = require("multer");
const File = require("../models/File");
const crypto = require("crypto");
const path = require("path");
const FileShare = require("../models/FileShare");
const fs = require("fs");

// 📁 storage config
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  }
});

const upload = multer({ storage });

// ✅ UPLOAD FILE
router.post("/upload", upload.single("file"), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: "UserId missing" });

    const newFile = await File.create({
      userId,
      filename: req.file.filename,
      filepath: req.file.path,
      uploadedAt: Date.now()
    });

    res.json({ message: "File uploaded successfully", file: newFile });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// ✅ GET USER FILES
router.get("/:userId", async (req, res) => {
  try {
    const files = await File.find({ userId: req.params.userId }).sort({ uploadedAt: -1 });
    res.json(files);
  } catch (err) {
    res.status(500).json({ message: "Error fetching files" });
  }
});

// ✅ GENERATE SHARE LINK
router.post("/generate-link", async (req, res) => {
  try {
    const { fileId } = req.body;
    if (!fileId) return res.status(400).json({ message: "FileId required" });

    const token = crypto.randomBytes(20).toString("hex");
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 min

    await FileShare.create({ fileId, token, expiresAt });

    // ✅ Use BASE_URL
    res.json({
      link: `${process.env.BASE_URL}/api/files/share/${token}`
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error generating link" });
  }
});

// ✅ OPEN FILE USING SHARE LINK
router.get("/share/:token", async (req, res) => {
  try {
    const { token } = req.params;
    const share = await FileShare.findOne({ token }).sort({ createdAt: -1 });

    if (!share || share.expiresAt < new Date()) {
      return res.status(400).send("Link expired or invalid");
    }

    const file = await File.findById(share.fileId);
    if (!file) return res.status(404).send("File not found");

    res.sendFile(path.resolve(file.filepath));
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
});

// ✅ DELETE FILE
router.delete("/delete/:id", async (req, res) => {
  try {
    const file = await File.findById(req.params.id);
    if (!file) return res.status(404).json({ message: "File not found" });

    if (fs.existsSync(file.filepath)) fs.unlinkSync(file.filepath);
    await File.findByIdAndDelete(req.params.id);

    res.json({ message: "File deleted successfully ✅" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Error deleting file" });
  }
});

module.exports = router;
