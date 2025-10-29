const mongoose = require("mongoose");

const fileSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
    sessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Session",
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    lastModifiedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    lastModified: {
      type: Date,
      default: Date.now,
    },
    language: {
      type: String,
      default: "javascript",
      enum: ["javascript", "python", "cpp", "c", "java", "html", "css", "json"],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for sessionId and name to ensure unique file names per session
fileSchema.index({ sessionId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model("File", fileSchema);
