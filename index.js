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

  try {
    // Create temporary directory for this execution
    const tempDir = path.join(__dirname, "temp", `cpp_${Date.now()}`);

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
        fs.writeFileSync(additionalFilePath, content);
      }
    }

    // Create Dockerfile for C++ execution
    const dockerfile = `FROM gcc:latest
WORKDIR /app
COPY . .
RUN g++ -std=c++17 ${fileName} -o output
CMD ["./output"]`;
    fs.writeFileSync(path.join(tempDir, "Dockerfile"), dockerfile);

    // Build and run Docker container
    const dockerCommand = `cd "${tempDir}" && docker build -t cpp-temp-${Date.now()} . && docker run --rm cpp-temp-${Date.now()}`;

    exec(dockerCommand, { timeout: 15000 }, (err, stdout, stderr) => {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });

      if (err) {
        if (err.killed) {
          return res.status(400).send({ error: "Execution timed out" });
        }
        return res
          .status(400)
          .send({ error: stderr || "Compilation/Runtime error" });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("C++ execution error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/run-python", (req, res) => {
  const { code, fileName = "main.py", sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "Python code is required!" });
  }

  try {
    // Create temporary directory for this execution
    const tempDir = path.join(__dirname, "temp", `python_${Date.now()}`);

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
        fs.writeFileSync(additionalFilePath, content);
      }
    }

    // Run Python script
    exec(
      `cd "${tempDir}" && python3 ${fileName}`,
      { timeout: 5000 },
      (err, stdout, stderr) => {
        // Cleanup
        fs.rmSync(tempDir, { recursive: true, force: true });

        if (err) {
          if (err.killed) {
            return res.status(400).send({ error: "Execution timed out" });
          }
          return res.status(400).send({ error: stderr || "Runtime error" });
        }

        res.send({ output: stdout });
      }
    );
  } catch (error) {
    console.error("Python execution error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.post("/run-c", (req, res) => {
  const { code, fileName = "main.c", sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "C code is required!" });
  }

  try {
    // Create temporary directory for this execution
    const tempDir = path.join(__dirname, "temp", `c_${Date.now()}`);

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

    // Build and run Docker container
    const dockerCommand = `cd "${tempDir}" && docker build -t c-temp-${Date.now()} . && docker run --rm c-temp-${Date.now()}`;

    exec(dockerCommand, { timeout: 15000 }, (err, stdout, stderr) => {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });

      if (err) {
        if (err.killed) {
          return res.status(400).send({ error: "Execution timed out" });
        }
        return res
          .status(400)
          .send({ error: stderr || "Compilation/Runtime error" });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("C execution error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

// Route to execute Java code
app.post("/run-java", (req, res) => {
  const { code, fileName, sessionId, allFiles = {} } = req.body;

  if (!code) {
    return res.status(400).send({ error: "Java code is required!" });
  }

  try {
    // Create temporary directory for this execution
    const tempDir = path.join(__dirname, "temp", `java_${Date.now()}`);

    // Create directory synchronously
    if (!fs.existsSync(path.join(__dirname, "temp"))) {
      fs.mkdirSync(path.join(__dirname, "temp"));
    }
    fs.mkdirSync(tempDir);

    // Extract class name from the code
    let className = "Main";
    let actualFileName = fileName || "Main.java";

    // Look for public class declaration
    const publicClassMatch = code.match(/public\s+class\s+(\w+)/);
    if (publicClassMatch) {
      className = publicClassMatch[1];
      actualFileName = `${className}.java`;
    } else {
      // Look for any class declaration
      const classMatch = code.match(/class\s+(\w+)/);
      if (classMatch) {
        className = classMatch[1];
        actualFileName = `${className}.java`;
      }
    }

    // Write the main file with correct filename
    const mainFilePath = path.join(tempDir, actualFileName);
    fs.writeFileSync(mainFilePath, code);

    // Write all additional files if provided
    for (const [filename, content] of Object.entries(allFiles)) {
      if (filename !== actualFileName) {
        // Don't overwrite the main file
        const additionalFilePath = path.join(tempDir, filename);
        fs.writeFileSync(additionalFilePath, content);
      }
    }

    // Create Dockerfile for Java execution
    const dockerfile = `FROM openjdk:11
WORKDIR /app
COPY . .
RUN javac ${actualFileName}
CMD ["java", "${className}"]`;
    fs.writeFileSync(path.join(tempDir, "Dockerfile"), dockerfile);

    // Build and run Docker container
    const dockerCommand = `cd "${tempDir}" && docker build -t java-temp-${Date.now()} . && docker run --rm java-temp-${Date.now()}`;

    exec(dockerCommand, { timeout: 15000 }, (err, stdout, stderr) => {
      // Cleanup
      fs.rmSync(tempDir, { recursive: true, force: true });

      if (err) {
        if (err.killed) {
          return res.status(400).send({ error: "Execution timed out" });
        }
        return res
          .status(400)
          .send({ error: stderr || "Compilation/Runtime error" });
      }

      res.send({ output: stdout });
    });
  } catch (error) {
    console.error("Java execution error:", error);
    res.status(500).send({ error: "Internal server error" });
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
  console.log("A user connected");

  // Chat functionality (Supports both text & audio)
  socket.on("chat", (data) => {
    const { sessionId, message, name, type } = data;

    if (!sessionId || !message || !name) return;

    // Ensure type is either "text" or "audio"
    const messageType = type === "audio" ? "audio" : "text";

    // Emit message with correct type
    io.to(sessionId).emit("chat", { name, message, type: messageType });
  });

  // Handle joining a session
  socket.on("joinSession", (sessionId) => {
    socket.join(sessionId);
    console.log(`User joined session: ${sessionId}`);

    // Send the current code state to the newly connected user
    if (sessionCodeMap[sessionId]) {
      socket.emit("code", sessionCodeMap[sessionId]);
    }

    // Send current file states to the newly connected user
    if (sessionFileMap[sessionId]) {
      socket.emit("fileStates", sessionFileMap[sessionId]);
    }
  });

  // Broadcast code updates to a specific session (room) - Legacy support
  socket.on("code", (data) => {
    const { sessionId, code, name, fileName } = data;

    // Update the session's code state (for backward compatibility)
    sessionCodeMap[sessionId] = code;

    // If fileName is provided, update the specific file content
    if (fileName) {
      if (!sessionFileMap[sessionId]) {
        sessionFileMap[sessionId] = {};
      }
      sessionFileMap[sessionId][fileName] = code;

      // Emit file-specific content change
      socket.to(sessionId).emit("fileContentChanged", {
        fileName,
        content: code,
        userName: name,
      });
    } else {
      // Emit to all clients in the session room (legacy)
      socket.to(sessionId).emit("code", code);
    }

    socket.to(sessionId).emit("name", name);
    console.log(
      `Code updated in session: ${sessionId}${
        fileName ? ` for file: ${fileName}` : ""
      }`
    );
  });

  // Handle file-specific content changes
  socket.on("fileContentChanged", (data) => {
    const { sessionId, fileName, content, userName } = data;

    if (!sessionFileMap[sessionId]) {
      sessionFileMap[sessionId] = {};
    }
    sessionFileMap[sessionId][fileName] = content;

    // Broadcast to other users in the session
    socket
      .to(sessionId)
      .emit("fileContentChanged", { fileName, content, userName });
  });

  // Handle file creation events from frontend
  socket.on("fileCreated", (data) => {
    const { sessionId, fileName, language, userName } = data;
    socket
      .to(sessionId)
      .emit("fileCreated", { fileName, language, createdBy: userName });
  });

  // Handle file deletion events from frontend
  socket.on("fileDeleted", (data) => {
    const { sessionId, fileName, userName } = data;

    // Remove from session file map
    if (sessionFileMap[sessionId] && sessionFileMap[sessionId][fileName]) {
      delete sessionFileMap[sessionId][fileName];
    }

    socket.to(sessionId).emit("fileDeleted", { fileName, deletedBy: userName });
  });

  // Handle file rename events from frontend
  socket.on("fileRenamed", (data) => {
    const { sessionId, oldFileName, newFileName, userName } = data;

    // Update session file map
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
    console.log("A user disconnected");
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
