const mongoose = require("mongoose");

const AdminSchema = new mongoose.Schema({
  admin_id: {
    type: String,
    required: true,
    unique: true
  },

  name: {
    type: String,
    required: true
  },

  email: {
    type: String,
    required: true,
    unique: true
  },

  created_at: {
    type: Date,
    default: Date.now
  }

});

module.exports = mongoose.model("Admin", AdminSchema);
