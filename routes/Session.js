const express = require("express");
const router = express.Router();
const User = require("../models/User");
const File = require("../models/File");
const jwt = require("jsonwebtoken");
const Session = require("../models/Session");
const loginRequired = require("../middleware/loginRequired");

const SECRET = process.env.JWT_SECRET || "yashisagoodboy";

//create a session
const generateSessionId = () => {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let sessionId = "";
  for (let i = 0; i < 5; i++) {
    sessionId += characters.charAt(
      Math.floor(Math.random() * characters.length)
    );
  }
  return sessionId;
};

router.post("/create", loginRequired, async (req, res) => {
  try {
    const { creator } = req.body;
    const sessionId = generateSessionId();
    const session = new Session({ sessionId, creator });
    await session.save();
    if (!session.participants.includes(req.user.userId)) {
      session.participants.push(req.user.userId);
      await session.save();
    }
    res.send(session);
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

//join a session
router.post("/join", loginRequired, async (req, res) => {
  try {
    const { sessionId } = req.body;
    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).send("Session not found");
    }

    // Add participant to the session if not already added
    if (!session.participants.includes(req.user.userId)) {
      session.participants.push(req.user.userId);
      await session.save();
    }

    // Emit event to notify others that a user joined
    // io.to(sessionId).emit("userJoined", { userId: req.user.userId });

    res.send(session);
  } catch (err) {
    console.error(err);
    return res.status(500).send("Internal server error");
  }
});

// Get all sessions by a user with userId as a URL parameter
router.get("/getSessions/:userId", loginRequired, async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ creator: userId });
    res.send(sessions);
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

//delete session
router.delete("/delete/:sessionId", loginRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;
    await Session.deleteOne({ sessionId });
    res.send("Session deleted");
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

router.get("/details/:sessionId", loginRequired, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId }).populate(
      "participants"
    );
    res.send(session);
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

router.post("/leave", loginRequired, async (req, res) => {
  try {
    const { sessionId, userId } = req.body;
    const session = await Session.findById(sessionId);
    session.participants = session.participants.filter(
      (participant) => participant.toString() !== userId
    );
    await session.save();
    res.send("Left the session");
  } catch (err) {
    return res.status(500).send("Internal server error");
  }
});

// FILE MANAGEMENT ROUTES

// GET /session/:sessionId/files - List all files in session
router.get("/:sessionId/files", loginRequired, async (req, res) => {
  try {
    console.log("GET files request for sessionId:", req.params.sessionId);
    console.log("User from token:", req.user);

    const { sessionId } = req.params;

    // Find session and populate files
    const session = await Session.findOne({ sessionId }).populate("files");
    if (!session) {
      console.log("Session not found:", sessionId);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log("Found session with files:", session.files?.length || 0);
    res.json({ files: session.files || [] });
  } catch (error) {
    console.error("Error fetching files:", error);
    res
      .status(500)
      .json({ error: "Error fetching files", details: error.message });
  }
});

// POST /session/:sessionId/files - Create new file
router.post("/:sessionId/files", loginRequired, async (req, res) => {
  try {
    console.log(
      "POST create file request for sessionId:",
      req.params.sessionId
    );
    console.log("Request body:", req.body);
    console.log("User from token:", req.user);

    const { sessionId } = req.params;
    const { fileName, content = "", language = "javascript" } = req.body;

    if (!fileName) {
      return res.status(400).json({ error: "fileName is required" });
    }

    // Find session by sessionId
    const session = await Session.findOne({ sessionId });
    if (!session) {
      console.log("Session not found:", sessionId);
      return res.status(404).json({ error: "Session not found" });
    }

    console.log("Found session:", session._id);

    // Check if file already exists
    const existingFile = await File.findOne({
      sessionId: session._id,
      name: fileName,
    });
    if (existingFile) {
      console.log("File already exists:", fileName);
      return res.status(400).json({ error: "File already exists" });
    }

    // Create new file
    const file = new File({
      name: fileName,
      content,
      sessionId: session._id,
      createdBy: req.user.userId,
      lastModified: new Date(),
      language,
    });

    console.log("Creating file:", file);
    await file.save();
    console.log("File saved with ID:", file._id);

    // Add file to session
    await Session.findByIdAndUpdate(session._id, {
      $push: { files: file._id },
    });

    console.log("File added to session");

    // Broadcast file creation to all users in the session
    req.io.to(sessionId).emit("fileCreated", {
      fileName,
      fileId: file._id,
      language,
      createdBy: req.user.userId,
    });

    res.status(201).json({ file });
  } catch (error) {
    console.error("Error creating file:", error);
    res
      .status(500)
      .json({ error: "Error creating file", details: error.message });
  }
});

// GET /session/:sessionId/files/:fileName - Get file content
router.get("/:sessionId/files/:fileName", loginRequired, async (req, res) => {
  try {
    const { sessionId, fileName } = req.params;

    // Find session by sessionId
    const session = await Session.findOne({ sessionId });
    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    const file = await File.findOne({ sessionId: session._id, name: fileName });
    if (!file) {
      return res.status(404).json({ error: "File not found" });
    }

    res.json({
      content: file.content,
      language: file.language,
      lastModified: file.lastModified,
    });
  } catch (error) {
    console.error("Error fetching file content:", error);
    res.status(500).json({ error: "Error fetching file content" });
  }
});

// PUT /session/:sessionId/files/:fileName/content - Update file content
router.put(
  "/:sessionId/files/:fileName/content",
  loginRequired,
  async (req, res) => {
    try {
      const { sessionId, fileName } = req.params;
      const { content } = req.body;

      // Find session by sessionId
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const file = await File.findOneAndUpdate(
        { sessionId: session._id, name: fileName },
        {
          content,
          lastModified: new Date(),
          lastModifiedBy: req.user.userId,
        },
        { new: true }
      );

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Broadcast file content change to all users in the session
      req.io.to(sessionId).emit("fileContentChanged", {
        fileName,
        content,
        lastModifiedBy: req.user.userId,
      });

      res.json({ file });
    } catch (error) {
      console.error("Error updating file content:", error);
      res.status(500).json({ error: "Error updating file content" });
    }
  }
);

// DELETE /session/:sessionId/files/:fileName - Delete file
router.delete(
  "/:sessionId/files/:fileName",
  loginRequired,
  async (req, res) => {
    try {
      const { sessionId, fileName } = req.params;

      // Find session by sessionId
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      const file = await File.findOneAndDelete({
        sessionId: session._id,
        name: fileName,
      });
      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Remove file from session
      await Session.findByIdAndUpdate(session._id, {
        $pull: { files: file._id },
      });

      // Broadcast file deletion to all users in the session
      req.io.to(sessionId).emit("fileDeleted", {
        fileName,
        deletedBy: req.user.userId,
      });

      res.json({ message: "File deleted successfully" });
    } catch (error) {
      console.error("Error deleting file:", error);
      res.status(500).json({ error: "Error deleting file" });
    }
  }
);

// PUT /session/:sessionId/files/:oldFileName/rename - Rename file
router.put(
  "/:sessionId/files/:oldFileName/rename",
  loginRequired,
  async (req, res) => {
    try {
      const { sessionId, oldFileName } = req.params;
      const { newFileName } = req.body;

      // Find session by sessionId
      const session = await Session.findOne({ sessionId });
      if (!session) {
        return res.status(404).json({ error: "Session not found" });
      }

      // Check if new filename already exists
      const existingFile = await File.findOne({
        sessionId: session._id,
        name: newFileName,
      });
      if (existingFile) {
        return res
          .status(400)
          .json({ error: "File with new name already exists" });
      }

      const file = await File.findOneAndUpdate(
        { sessionId: session._id, name: oldFileName },
        {
          name: newFileName,
          lastModified: new Date(),
          lastModifiedBy: req.user.userId,
        },
        { new: true }
      );

      if (!file) {
        return res.status(404).json({ error: "File not found" });
      }

      // Broadcast file rename to all users in the session
      req.io.to(sessionId).emit("fileRenamed", {
        oldFileName,
        newFileName,
        renamedBy: req.user.userId,
      });

      res.json({ file });
    } catch (error) {
      console.error("Error renaming file:", error);
      res.status(500).json({ error: "Error renaming file" });
    }
  }
);

module.exports = router;
