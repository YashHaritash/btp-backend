const mongoose = require("mongoose");

const codeSchema = new mongoose.Schema({
  sessionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Session", // Link to the session this code belongs to
    required: true,
  },
  code: {
    type: String, // The actual code being written
    required: true,
  },
  versionHistory: [
    {
      code: String, // Past code version
      updatedAt: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

const Code = mongoose.model("Code", codeSchema);

module.exports = Code;
