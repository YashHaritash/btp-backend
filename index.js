require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const http = require("http");
const socket = require("socket.io");
const fs = require("fs");
const path = require("path");
const { url } = require("inspector");
const exec = require("child_process").exec;
const app = express();
const server = http.createServer(app);

app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: false }));
// Configure CORS for Express
const corsOptions = {
  origin: "http://localhost:5173", // Adjust this to your frontend's URL
  methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
  allowedHeaders: ["Content-Type", "Authorization"], // Allow Authorization header
  credentials: true, // Allow credentials (cookies, authorization headers)
};

app.use(cors(corsOptions)); // Apply CORS configuration to Express
app.use(express.json());

app.post("/run-cpp", async (req, res) => {
  const { code, fileName = "main.cpp", sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "C++ code is required!" });
  }

  let tempDir;
  try {
    // Prepare temp directory
    tempDir = path.join(__dirname, "temp", `cpp_${Date.now()}`);
    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Write main file
    const mainFilePath = path.join(tempDir, fileName);
    const mainDir = path.dirname(mainFilePath);
    if (!fs.existsSync(mainDir)) fs.mkdirSync(mainDir, { recursive: true });
    fs.writeFileSync(mainFilePath, code);

    // Write additional files (preserve directory structure)
    for (const [filename, content] of Object.entries(allFiles)) {
      if (filename === fileName) continue;
      const additionalFilePath = path.join(tempDir, filename);
      const dir = path.dirname(additionalFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(additionalFilePath, content);
      console.log(`C++: Created file ${filename} at ${additionalFilePath}`);
    }

    // Debug: List all files in temp directory
    const filesInDir = fs.readdirSync(tempDir);
    console.log(`C++ temp dir contents:`, filesInDir);

    // Create Dockerfile
    const dockerfile = `FROM gcc:latest
WORKDIR /app
COPY . .
RUN g++ -std=c++17 ${fileName} -o output
CMD ["./output"]`;
    fs.writeFileSync(path.join(tempDir, "Dockerfile"), dockerfile);

    // Build & run (give Docker more time)
    const tag = `cpp-temp-${Date.now()}`;
    const dockerCommand = `cd "${tempDir}" && docker build -t ${tag} . && docker run --rm ${tag}`;
    console.log("Running C++:", {
      tempDir,
      fileName,
      dockerCommand,
      allFilesCount: Object.keys(allFiles).length,
    });

    exec(dockerCommand, { timeout: 30000 }, (err, stdout, stderr) => {
      // Attempt cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn("C++ cleanup failed:", cleanupErr);
      }

      if (err) {
        console.error("C++ exec error:", err, "stderr:", stderr);
        if (err.killed) {
          return res
            .status(400)
            .send({ error: "Execution timed out", stdout, stderr });
        }
        return res
          .status(400)
          .send({ error: stderr || err.message, stdout, stderr });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("C++ execution error:", error);
    try {
      if (tempDir && fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("C++ cleanup after exception failed:", cleanupErr);
    }
    res
      .status(500)
      .send({ error: "Internal server error", details: error.message });
  }
});
// Route to execute JavaScript (Node.js) code with multiple files support
app.post("/run-javascript", (req, res) => {
  const { code, fileName = "main.js", sessionId, allFiles = {} } = req.body;
  if (!code)
    return res.status(400).send({ error: "JavaScript code is required!" });

  let tempDir;
  try {
    tempDir = path.join(__dirname, "temp", `js_${Date.now()}`);
    if (!fs.existsSync(path.join(__dirname, "temp")))
      fs.mkdirSync(path.join(__dirname, "temp"));
    fs.mkdirSync(tempDir);

    // Write main file
    const mainFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(mainFilePath, code);

    // Write all additional files, create nested dirs as needed
    for (const [filename, content] of Object.entries(allFiles)) {
      if (filename === fileName) continue;
      const additionalFilePath = path.join(tempDir, filename);
      const dir = path.dirname(additionalFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(additionalFilePath, content);
    }

    console.log(
      `Running JS: tempDir=${tempDir}, main=${fileName}, files=${
        Object.keys(allFiles).length
      }`
    );
    const cmd = `cd "${tempDir}" && node ${fileName}`;

    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      // Always attempt cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (e) {
        console.warn("cleanup failed", e);
      }

      if (err) {
        console.error("JS exec error:", err, "stderr:", stderr);
        if (err.killed)
          return res
            .status(400)
            .send({ error: "Execution timed out", stdout, stderr });
        return res
          .status(400)
          .send({ error: stderr || err.message, stdout, stderr });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("JavaScript execution error:", error);
    try {
      if (tempDir && fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("cleanup failed after exception", e);
    }
    res
      .status(500)
      .send({ error: "Internal server error", details: error.message });
  }
});

app.post("/run-python", (req, res) => {
  const { code, fileName = "main.py", sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "Python code is required!" });
  }

  let tempDir;
  try {
    tempDir = path.join(__dirname, "temp", `python_${Date.now()}`);
    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Write all additional files first so imports in the main file resolve to local modules
    for (const [filename, content] of Object.entries(allFiles)) {
      if (filename === fileName) continue; // Skip main file, will write it last

      const additionalFilePath = path.join(tempDir, filename);
      const dir = path.dirname(additionalFilePath);

      // Create nested directories if needed
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(additionalFilePath, content);
      console.log(`Python: Created file ${filename} at ${additionalFilePath}`);
    }

    // Now write main file last (so its imports pick up the local modules)
    const mainFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(mainFilePath, code);
    console.log(`Python: Wrote main file ${fileName} at ${mainFilePath}`);

    // Debug: List all files in temp directory
    const filesInDir = fs.readdirSync(tempDir);
    console.log(`Python temp dir contents:`, filesInDir);

    const cmd = `cd "${tempDir}" && python3 ${fileName}`;
    console.log("Running Python:", {
      tempDir,
      fileName,
      cmd,
      allFilesCount: Object.keys(allFiles).length,
    });

    exec(cmd, { timeout: 10000 }, (err, stdout, stderr) => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn("Python cleanup failed:", cleanupErr);
      }

      if (err) {
        console.error("Python exec error:", err, "stderr:", stderr);
        if (err.killed) {
          return res
            .status(400)
            .send({ error: "Execution timed out", stdout, stderr });
        }
        return res
          .status(400)
          .send({ error: stderr || err.message, stdout, stderr });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("Python execution error:", error);
    try {
      if (tempDir && fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("Python cleanup after exception failed:", cleanupErr);
    }
    res
      .status(500)
      .send({ error: "Internal server error", details: error.message });
  }
});

app.post("/run-c", (req, res) => {
  const { code, fileName = "main.c", sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "C code is required!" });
  }

  let tempDir;
  try {
    // Create temporary directory for this execution
    tempDir = path.join(__dirname, "temp", `c_${Date.now()}`);

    // Create directory synchronously
    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }
    fs.mkdirSync(tempDir);

    // Write the main file
    const mainFilePath = path.join(tempDir, fileName);
    fs.writeFileSync(mainFilePath, code);

    // Write all additional files if provided
    for (const [filename, content] of Object.entries(allFiles)) {
      if (filename !== fileName) {
        // Don't overwrite the main file
        const additionalFilePath = path.join(tempDir, filename);
        const dir = path.dirname(additionalFilePath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(additionalFilePath, content);
      }
    }

    // Create Dockerfile for C execution
    const dockerfile = `FROM gcc:latest
WORKDIR /app
COPY . .
RUN gcc ${fileName} -o output
CMD ["./output"]`;
    fs.writeFileSync(path.join(tempDir, "Dockerfile"), dockerfile);

    // Debug logs for troubleshooting
    console.log(
      `Running C: tempDir=${tempDir}, main=${fileName}, files=${
        Object.keys(allFiles).length
      }`
    );

    // Build and run Docker container
    const dockerCommand = `cd "${tempDir}" && docker build -t c-temp-${Date.now()} . && docker run --rm c-temp-${Date.now()}`;

    exec(dockerCommand, { timeout: 15000 }, (err, stdout, stderr) => {
      // Cleanup
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn("Failed to cleanup temp dir", cleanupErr);
      }

      // Log outputs for debugging
      if (stderr) console.log("C stderr:", stderr);
      if (stdout) console.log("C stdout:", stdout);
      if (err) console.error("C exec error:", err);

      if (err) {
        if (err.killed) {
          return res.status(400).send({
            error: "Execution timed out",
            details: stderr || err.message,
          });
        }
        return res.status(400).send({
          error: stderr || "Compilation/Runtime error",
          details: stderr,
        });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("C execution error:", error);
    try {
      if (tempDir && fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (e) {
      console.warn("Cleanup failed after exception", e);
    }
    res
      .status(500)
      .send({ error: "Internal server error", details: error.message });
  }
});

// Route to execute Java code
app.post("/run-java", (req, res) => {
  const { code, fileName, sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "Java code is required!" });
  }

  let tempDir;
  try {
    tempDir = path.join(__dirname, "temp", `java_${Date.now()}`);
    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }
    fs.mkdirSync(tempDir, { recursive: true });

    // Determine class name and filename
    let className = "Main";
    let actualFileName = fileName || "Main.java";
    const publicClassMatch = code.match(/public\s+class\s+(\w+)/);
    if (publicClassMatch) {
      className = publicClassMatch[1];
      actualFileName = `${className}.java`;
    } else {
      const classMatch = code.match(/class\s+(\w+)/);
      if (classMatch) {
        className = classMatch[1];
        actualFileName = `${className}.java`;
      }
    }

    // Write main file
    const mainFilePath = path.join(tempDir, actualFileName);
    const mainDir = path.dirname(mainFilePath);
    if (!fs.existsSync(mainDir)) fs.mkdirSync(mainDir, { recursive: true });
    fs.writeFileSync(mainFilePath, code);

    // Write additional files
    for (const [filename, content] of Object.entries(allFiles)) {
      if (filename === actualFileName) continue;
      const additionalFilePath = path.join(tempDir, filename);
      const dir = path.dirname(additionalFilePath);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(additionalFilePath, content);
      console.log(`Java: Created file ${filename} at ${additionalFilePath}`);
    }

    // Debug: List all files in temp directory
    const filesInDir = fs.readdirSync(tempDir);
    console.log(`Java temp dir contents:`, filesInDir);

    // Dockerfile for Java
    const dockerfile = `FROM openjdk:11
WORKDIR /app
COPY . .
RUN javac ${actualFileName}
CMD ["java", "${className}"]`;
    fs.writeFileSync(path.join(tempDir, "Dockerfile"), dockerfile);

    const tag = `java-temp-${Date.now()}`;
    const dockerCommand = `cd "${tempDir}" && docker build -t ${tag} . && docker run --rm ${tag}`;
    console.log("Running Java:", {
      tempDir,
      actualFileName,
      dockerCommand,
      allFilesCount: Object.keys(allFiles).length,
    });

    exec(dockerCommand, { timeout: 30000 }, (err, stdout, stderr) => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch (cleanupErr) {
        console.warn("Java cleanup failed:", cleanupErr);
      }

      if (err) {
        console.error("Java exec error:", err, "stderr:", stderr);
        if (err.killed) {
          return res
            .status(400)
            .send({ error: "Execution timed out", stdout, stderr });
        }
        return res
          .status(400)
          .send({ error: stderr || err.message, stdout, stderr });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("Java execution error:", error);
    try {
      if (tempDir && fs.existsSync(tempDir))
        fs.rmSync(tempDir, { recursive: true, force: true });
    } catch (cleanupErr) {
      console.warn("Java cleanup after exception failed:", cleanupErr);
    }
    res
      .status(500)
      .send({ error: "Internal server error", details: error.message });
  }
});
// Configure Socket.io with CORS
const io = socket(server, {
  cors: {
    origin: process.env.CORS_ORIGIN || "http://localhost:5173", // Use env variable for allowed origin
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
    credentials: true,
  },
});

// Middleware to attach io instance to request object
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Add routes after io is available
app.use("/auth", require("./routes/Auth"));
app.use("/session", require("./routes/Session"));
app.use("/code", require("./routes/Code"));

// Object to store the current code state for each session
const sessionCodeMap = {};
const sessionFileMap = {}; // Store file-specific content for each session

io.on("connection", (socket) => {
  console.log("🟢 A user connected");

  // Handle joining a session
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
    console.log(`👥 User joined session: ${sessionId}`);

    // Send the current code state to the newly connected user
    if (sessionCodeMap[sessionId]) {
      socket.emit("code", sessionCodeMap[sessionId]);
    }

    // Send current file states to the newly connected user
    if (sessionFileMap[sessionId]) {
      socket.emit("fileStates", sessionFileMap[sessionId]);
    }
  });

  // Handle typing events for concurrent typing indicators
  socket.on("userTyping", (data) => {
    const { sessionId, userName } = data;
    if (!sessionId || !userName) return;

    console.log(`⌨️ User ${userName} is typing in session ${sessionId}`);
    socket.to(sessionId).emit("userTyping", { userName });
  });

  socket.on("userStoppedTyping", (data) => {
    const { sessionId, userName } = data;
    if (!sessionId || !userName) return;

    console.log(`⏹️ User ${userName} stopped typing in session ${sessionId}`);
    socket.to(sessionId).emit("userStoppedTyping", { userName });
  });

  // FIXED: Enhanced code updates handler for concurrent programming
  socket.on("code", (data) => {
    const { sessionId, code, name, fileName } = data;

    console.log(`📝 CODE UPDATE from ${name} in session ${sessionId}:`, {
      fileName: fileName || "legacy",
      codeLength: code?.length,
      firstLine: code?.split("\n")[0]?.substring(0, 50),
    });

    // Update the session's code state (for backward compatibility)
    sessionCodeMap[sessionId] = code;

    // If fileName is provided, update the specific file content
    if (fileName) {
      if (!sessionFileMap[sessionId]) {
        sessionFileMap[sessionId] = {};
      }
      sessionFileMap[sessionId][fileName] = code;

      // CRITICAL: Broadcast the SAME data structure to all other users
      const broadcastData = {
        code,
        fileName,
        userName: name,
        sessionId,
      };

      console.log(
        `📤 BROADCASTING CODE to session ${sessionId}:`,
        broadcastData
      );
      socket.to(sessionId).emit("code", broadcastData);

      // ALSO emit file-specific event for redundancy
      socket.to(sessionId).emit("fileContentChanged", {
        fileName,
        content: code,
        userName: name,
        sessionId,
      });
    } else {
      // Legacy: broadcast just the code string
      console.log(`📤 BROADCASTING LEGACY CODE to session ${sessionId}`);
      socket.to(sessionId).emit("code", code);
    }

    // Remove the old "name" event - it's causing confusion
    console.log(`✅ Code update processed for session ${sessionId}`);
  });

  // Handle file-specific content changes
  socket.on("fileContentChanged", (data) => {
    const { sessionId, fileName, content, userName } = data;

    console.log(
      `📁 FILE CONTENT CHANGED: ${fileName} by ${userName} in session ${sessionId}`
    );

    if (!sessionFileMap[sessionId]) {
      sessionFileMap[sessionId] = {};
    }
    sessionFileMap[sessionId][fileName] = content;

    // Broadcast to other users in the session
    socket.to(sessionId).emit("fileContentChanged", {
      fileName,
      content,
      userName,
      sessionId,
    });
  });

  // Chat functionality
  socket.on("chat", (data) => {
    const { sessionId, message, name, type } = data;
    if (!sessionId || !message || !name) return;
    const messageType = type === "audio" ? "audio" : "text";
    io.to(sessionId).emit("chat", { name, message, type: messageType });
  });

  // File management events
  socket.on("fileCreated", (data) => {
    const { sessionId, fileName, language, userName } = data;
    console.log(
      `➕ FILE CREATED: ${fileName} by ${userName} in session ${sessionId}`
    );
    socket
      .to(sessionId)
      .emit("fileCreated", { fileName, language, createdBy: userName });
  });

  socket.on("fileDeleted", (data) => {
    const { sessionId, fileName, userName } = data;
    console.log(
      `❌ FILE DELETED: ${fileName} by ${userName} in session ${sessionId}`
    );

    if (sessionFileMap[sessionId] && sessionFileMap[sessionId][fileName]) {
      delete sessionFileMap[sessionId][fileName];
    }
    socket.to(sessionId).emit("fileDeleted", { fileName, deletedBy: userName });
  });

  socket.on("fileRenamed", (data) => {
    const { sessionId, oldFileName, newFileName, userName } = data;
    console.log(
      `🔄 FILE RENAMED: ${oldFileName} -> ${newFileName} by ${userName} in session ${sessionId}`
    );

    if (sessionFileMap[sessionId] && sessionFileMap[sessionId][oldFileName]) {
      sessionFileMap[sessionId][newFileName] =
        sessionFileMap[sessionId][oldFileName];
      delete sessionFileMap[sessionId][oldFileName];
    }
    socket
      .to(sessionId)
      .emit("fileRenamed", { oldFileName, newFileName, renamedBy: userName });
  });

  // Handle disconnection
  socket.on("disconnect", () => {
    console.log("🔴 A user disconnected");
  });
});

mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/cs", {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("Connected to MongoDB");
  })
  .catch((err) => {
    console.log("MongoDB connection error:", err);
  });

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = io;
