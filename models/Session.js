const mongoose = require("mongoose");

const sessionSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    unique: true, // Unique identifier for each session
  },
  creator: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User", // Reference to the user who created the session
    required: true,
  },
  participants: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // References users who join the session
    },
  ],
  files: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "File", // References files in this session
    },
  ],
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Session = mongoose.model("Session", sessionSchema);

module.exports = Session;
