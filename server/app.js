const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const http = require("http");
const socketIo = require("socket.io");

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"],
  },
});

// Middleware
app.use(cors());
app.use(bodyParser.json({ limit: "50mb" }));
app.use(bodyParser.urlencoded({ extended: true, limit: "50mb" }));

// Connect to MongoDB
mongoose
  .connect(process.env.MONGODB_URI || "mongodb://localhost:27017/rrweb-app")
  .then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("Could not connect to MongoDB", err));

// Define session model
const sessionSchema = new mongoose.Schema({
  sessionId: String,
  userId: String,
  events: Array,
  startTime: { type: Date, default: Date.now },
  endTime: Date,
  metadata: Object,
});

const Session = mongoose.model("Session", sessionSchema);

// // Thêm middleware bảo mật
// const helmet = require("helmet");
// app.use(helmet());

// // Nén dữ liệu
// const compression = require("compression");
// app.use(compression());

// // Rate limiting để tránh DOS
// const rateLimit = require("express-rate-limit");
// app.use(
//   "/api/",
//   rateLimit({
//     windowMs: 15 * 60 * 1000, // 15 phút
//     max: 100, // giới hạn mỗi IP
//   })
// );
// Routes
app.get("/", (req, res) => {
  res.send("rrweb recording API is running");
});

// API endpoint to start a new recording session
app.post("/api/sessions/start", async (req, res) => {
  try {
    console.log("body", req.body);
    const { userId, metadata } = req.body;
    const session = new Session({
      sessionId: new mongoose.Types.ObjectId().toString(),
      userId,
      events: [],
      metadata,
    });
    console.log("session", session);
    await session.save();
    res.status(201).json({ sessionId: session.sessionId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to save recording events
app.post("/api/sessions/:sessionId/events", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const { events } = req.body;

    await Session.updateOne(
      { sessionId },
      { $push: { events: { $each: events } } }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to end a recording session
app.post("/api/sessions/:sessionId/end", async (req, res) => {
  try {
    const { sessionId } = req.params;

    await Session.updateOne({ sessionId }, { endTime: new Date() });

    res.status(200).json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get a specific session
app.get("/api/sessions/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await Session.findOne({ sessionId });

    if (!session) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.status(200).json(session);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// API endpoint to get all sessions for a user
app.get("/api/users/:userId/sessions", async (req, res) => {
  try {
    const { userId } = req.params;
    const sessions = await Session.find({ userId }).select("-events");

    res.status(200).json(sessions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Socket.IO for real-time recording
io.on("connection", (socket) => {
  console.log("Client connected");

  socket.on("record-event", async (data) => {
    try {
      const { sessionId, event } = data;

      await Session.updateOne({ sessionId }, { $push: { events: event } });

      socket.emit("event-saved", { success: true });
    } catch (error) {
      socket.emit("event-error", { error: error.message });
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
