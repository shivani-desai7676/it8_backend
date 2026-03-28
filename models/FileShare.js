const mongoose = require("mongoose");

const FileShareSchema = new mongoose.Schema({
  fileId: { type: mongoose.Schema.Types.ObjectId, ref: "File" },
  token: String,
  expiresAt: Date
}, { timestamps: true });

module.exports = mongoose.model("FileShare", FileShareSchema);