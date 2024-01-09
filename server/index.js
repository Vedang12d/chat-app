import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";
import jwt from "jsonwebtoken";
import cors from "cors";
import User from "./models/User.js";
import Message from "./models/Message.js";
import cookieParser from "cookie-parser";
import bcrypt from "bcrypt";
import { WebSocketServer } from "ws";
import fs from "fs";
import { Buffer } from "safe-buffer";

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URL);
const jwtSecret = process.env.JWT_SECRET;
const bcryptSalt = bcrypt.genSaltSync(10);

// Initialize Express app
const app = express();

// Serve static files from the 'uploads' directory
app.use(
  "/uploads",
  express.static(new URL("uploads", import.meta.url).pathname.slice(1))
);

// Middleware setup
app.use(express.json());
app.use(cookieParser());
app.use(
  cors({
    credentials: true,
    origin: process.env.CLIENT_URL,
  })
);

// Function to extract user data from the request using JWT
const getUserDataFromRequest = async (req) => {
  return new Promise((resolve, reject) => {
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        resolve(userData);
      });
    } else {
      reject("no token");
    }
  });
};

// Middleware for handling errors
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Internal Server Error" });
});

// Error handling for asynchronous functions
const asyncErrorHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

// Define various routes and their functionalities

// Route for testing the server
app.get(
  "/test",
  asyncErrorHandler(async (req, res) => {
    res.json("test");
  })
);

// Route to fetch messages between users
app.get(
  "/messages/:userId",
  asyncErrorHandler(async (req, res) => {
    // Fetch messages between specified users
    // Requires authentication using JWT
    const { userId } = req.params;
    const userData = await getUserDataFromRequest(req);
    const ourUserId = userData.userId;
    const messages = await Message.find({
      sender: { $in: [userId, ourUserId] },
      recipient: { $in: [userId, ourUserId] },
    }).sort({ createdAt: 1 });
    res.json(messages);
  })
);

// Route to get a list of users
app.get(
  "/people",
  asyncErrorHandler(async (req, res) => {
    // Fetches a list of users' usernames
    const people = await User.find({}, { _id: 1, username: 1 });
    res.json(people);
  })
);

// Route to get user profile based on JWT
app.get(
  "/profile",
  asyncErrorHandler(async (req, res) => {
    // Retrieves user profile based on JWT
    const token = req.cookies?.token;
    if (token) {
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        res.json(userData);
      });
    } else {
      res.status(401).json({ message: "no token found" });
    }
  })
);

// Route for user registration
app.post(
  "/register",
  asyncErrorHandler(async (req, res) => {
    // Handles user registration
    const { username, password } = req.body;

    try {
      // Hash the password
      const hashedPassword = bcrypt.hashSync(password, bcryptSalt);

      const user = await User.create({
        username,
        password: hashedPassword,
      });

      jwt.sign({ userId: user._id, username }, jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(201)
          .json({
            id: user._id,
            username,
          });
      });
    } catch (error) {
      if (
        error.code === 11000 &&
        error.keyPattern &&
        error.keyPattern.username
      ) {
        // Check if the error is due to a duplicate username
        return res.status(400).json({ message: "Username already exists." });
      }
      // For other errors, return a generic error message
      return res.status(500).json({ message: "Internal Server Error" });
    }
  })
);

// Route for user login
app.post(
  "/login",
  asyncErrorHandler(async (req, res) => {
    // Handles user login
    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username });

      if (!user) {
        return res
          .status(401)
          .json({ message: "Invalid username or password." });
      }

      // Validate the password using bcrypt
      const isPasswordValid = bcrypt.compareSync(password, user.password);

      if (!isPasswordValid) {
        return res
          .status(401)
          .json({ message: "Invalid username or password." });
      }

      // If the username and password are valid, create a JWT token
      jwt.sign({ userId: user._id, username }, jwtSecret, {}, (err, token) => {
        if (err) throw err;
        res
          .cookie("token", token, { sameSite: "none", secure: true })
          .status(200)
          .json({
            id: user._id,
            username,
          });
      });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Internal Server Error" });
    }
  })
);

// Route for user logout
app.post(
  "/logout",
  asyncErrorHandler(async (req, res) => {
    // Handles user logout
    res.cookie("token", "", { sameSite: "none", secure: true }).json("ok");
  })
);

// Start the server on port 4000
const server = app.listen(4000);

// Initialize WebSocketServer
const wss = new WebSocketServer({ server });

// Map to store WebSocket connections
const clients = new Map();

// WebSocket connection handling
wss.on("connection", (connection, req) => {
  // Function to notify online users
  const notifyOnlineUsers = () => {
    // Notifies clients about online users
    [...wss.clients].forEach((client) => {
      client.send(
        JSON.stringify({
          online: [...wss.clients].map((c) => ({
            userId: c.userId,
            username: c.username,
          })),
        })
      );
    });
  };

  connection.isAlive = true;

  connection.timer = setInterval(() => {
    connection.ping();
    connection.deathTimer = setTimeout(() => {
      connection.isAlive = false;
      clearInterval(connection.timer);
      connection.terminate();
      notifyOnlineUsers();
      console.log("dead");
    }, 1000);
  }, 5000);

  connection.on("pong", () => {
    clearTimeout(connection.deathTimer);
  });

  // Handles WebSocket connections
  const cookies = req.headers?.cookie;
  if (cookies) {
    const match = cookies.match(new RegExp("(^| )" + "token" + "=([^;]+)"));
    if (match) {
      const token = match[2];
      jwt.verify(token, jwtSecret, {}, (err, userData) => {
        if (err) throw err;
        const { userId, username } = userData;
        connection.userId = userId;
        connection.username = username;
      });
    }
  }

  // Handle incoming messages
  connection.on("message", async (message) => {
    try {
      const messageData = JSON.parse(message.toString());
      const { recipient, text, file } = messageData;
      const type = file?.type || null;
      let filename = null;
      if (file) {
        const extension = file.name.split(".").pop();
        filename =
          Date.now() + "-_-" + file.name.split(".")[0] + "." + extension;
        const bufferData = Buffer.from(file.data.split(",")[1], "base64");
        const path = new URL(
          "uploads/" + filename,
          import.meta.url
        ).pathname.slice(1);
        fs.writeFile(path, bufferData, () => {});
      }

      if (recipient && (text || file)) {
        // Save message in the database
        const messageDoc = await Message.create({
          sender: connection.userId,
          recipient,
          text,
          file: filename,
          type,
        });

        // Send message to the intended recipient
        [...wss.clients]
          .filter((c) => c.userId === recipient)
          .forEach((c) =>
            c.send(
              JSON.stringify({
                text,
                sender: connection.userId,
                recipient,
                file: file ? filename : null,
                type,
                id: messageDoc._id,
              })
            )
          );
      }
    } catch {
      console.error(error);
      connection.send(
        JSON.stringify({
          error: "An error occurred while processing the message.",
        })
      );
    }
  });

  // Notify everyone about updated online users (when someone connects)
  notifyOnlineUsers();
});
