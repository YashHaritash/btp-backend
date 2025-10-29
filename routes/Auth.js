const express = require("express");
const router = express.Router();
const User = require("../models/User");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");

const SECRET = "yashisagoodboy";

//google login
const client = new OAuth2Client(
  "1032017398197-cv4oob1c460csg4mhpdkkfla4hdhskqk.apps.googleusercontent.com"
);
router.post("/google", async (req, res) => {
  const { token } = req.body;

  try {
    // Verify Google token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience:
        "1032017398197-cv4oob1c460csg4mhpdkkfla4hdhskqk.apps.googleusercontent.com",
    });

    const { name, email, sub } = ticket.getPayload(); // sub is the Google user ID

    let user = await User.findOne({ email });

    if (!user) {
      // If user doesn't exist, create a new user
      user = await User.create({ name, email, googleId: sub });
    }

    // Generate JWT token
    const authToken = jwt.sign({ userId: user._id }, SECRET, {
      expiresIn: "7d",
    });

    res.json({ token: authToken, name: user.name, id: user._id });
  } catch (error) {
    console.error(error);
    res.status(401).json({ message: "Invalid Google token" });
  }
});

// no login required
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });
    if (!user.comparePassword(password))
      return res.status(401).json({ message: "Incorrect password" });

    jwt.sign({ id: user._id }, SECRET, (err, token) => {
      if (err)
        return res.status(500).json({ message: "Internal server error" });
      res.json({ token, name: user.name, id: user._id });
    });
  } catch (err) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

// no login required
router.post("/signup", async (req, res) => {
  try {
    const { email, password, name } = req.body;
    const user = new User({ email, password, name });
    await user.save();
    jwt.sign({ id: user._id }, SECRET, (err, token) => {
      if (err)
        return res.status(500).json({ message: "Internal server error" });
      res.json({ token, name: user.name, id: user._id });
    });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
});

const nodemailer = require("nodemailer");

// Forgot Password Route
router.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    console.log(`Received forgot-password request for email: ${email}`);

    const user = await User.findOne({ email });
    if (!user) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const secret = user.password + "-" + user.createdAt;
    const token = jwt.sign({ id: user._id }, secret, { expiresIn: "1h" });
    const link = `http://localhost:3000/auth/reset-password/${user._id}/${token}`;

    // Send password reset link via email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "yashharitashdev@gmail.com",
        pass: "bdre icbj tbak jfiq",
      },
    });

    const mailOptions = {
      from: "yashharitashdev@gmail.com",
      to: user.email,
      subject: "Password Reset Request",
      text: `Click this link to reset your password: ${link}`,
    };

    await transporter.sendMail(mailOptions);

    res.status(200).json({ message: "Password reset link sent to email" });
  } catch (err) {
    console.error("Error in forgot-password route:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Reset Password Route (GET)
router.get("/reset-password/:id/:token", async (req, res) => {
  try {
    console.log("Received reset-password request");
    const { id, token } = req.params;
    console.log(`ID: ${id}, Token: ${token}`);

    const user = await User.findById(id);
    if (!user) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const secret = user.password + "-" + user.createdAt;
    try {
      jwt.verify(token, secret);
      // Render the page where the user can enter a new password
      res.render("index", { email: user.email });
    } catch (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ message: "Invalid token" });
    }
  } catch (err) {
    console.error("Error in reset-password route:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

// Reset Password Route (POST)
router.post("/reset-password/:id/:token", async (req, res) => {
  try {
    const { id, token } = req.params;
    const { password } = req.body;
    const user = await User.findById(id);
    if (!user) {
      console.error("User not found");
      return res.status(404).json({ message: "User not found" });
    }

    const secret = user.password + "-" + user.createdAt;
    try {
      jwt.verify(token, secret);
      // Update the user's password
      user.password = password;
      await user.save();

      // After password update, redirect to the login page or send success message
      // res.status(200).json({ message: "Password updated successfully" });
      // If you want to redirect to login page:
      res.redirect("http://localhost:5173/login");
    } catch (err) {
      console.error("Invalid token:", err);
      res.status(401).json({ message: "Invalid token" });
    }
  } catch (err) {
    console.error("Error in reset-password route:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
});

module.exports = router;
