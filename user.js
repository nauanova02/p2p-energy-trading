const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");
require("dotenv").config();

const app = express();
app.use(express.json());

// MongoDB connection
mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => console.log("Connected to MongoDB"))
  .catch((err) => console.error("MongoDB connection error:", err));

// User Schema
const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    ssnHash: { type: String, required: true },
    role: { type: String, enum: ["consumer", "producer"], required: true },
});

const User = mongoose.model("User", userSchema);

// Smart Contract Setup
const provider = new ethers.providers.JsonRpcProvider("http://127.0.0.1:8545"); // Replace with your provider
const privateKey = process.env.PRIVATE_KEY;
const wallet = new ethers.Wallet(privateKey, provider);
const contractAddress = process.env.CONTRACT_ADDRESS;
const contractABI = JSON.parse(process.env.CONTRACT_ABI); // Parse ABI JSON
const contract = new ethers.Contract(contractAddress, contractABI, wallet);

// Middleware to authenticate JWT
const authenticate = (req, res, next) => {
    const token = req.header("Authorization");
    if (!token) return res.status(401).send("Access Denied: No Token Provided");
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(400).send("Invalid Token");
    }
};

// Routes

// Sign-Up Route
app.post("/signup", async (req, res) => {
    const { email, password, confirmPassword, ssn, role } = req.body;

    if (password !== confirmPassword) {
        return res.status(400).json({ message: "Passwords do not match" });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ message: "User already exists" });
        }

        // Hash password and SSN
        const hashedPassword = await bcrypt.hash(password, 10);
        const ssnHash = ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ssn));

        // Create user in MongoDB
        const user = new User({ email, password: hashedPassword, ssnHash, role });
        await user.save();

        // Register user in the smart contract
        await contract.registerUser(ssnHash, role, {
            from: wallet.address,
        });

        res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Login Route
app.post("/login", async (req, res) => {
    const { email, password } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Validate password
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        // Generate JWT
        const token = jwt.sign({ id: user._id, email: user.email, role: user.role }, process.env.JWT_SECRET, {
            expiresIn: "1h",
        });

        res.status(200).json({ token, message: "Login successful" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Forgot Password Route (Optional)
app.post("/forgot-password", async (req, res) => {
    const { email } = req.body;

    try {
        // Check if user exists
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(400).json({ message: "User not found" });
        }

        // Implement email-sending logic here to reset password
        res.status(200).json({ message: "Password reset email sent" });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Example Protected Route
app.get("/profile", authenticate, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        res.status(200).json(user);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Server Error" });
    }
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));