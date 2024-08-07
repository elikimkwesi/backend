const express = require('express');
const router = express.Router();
const User = require('../models/user');
const UserOTPVerification = require('../models/userOTPVerification');
const nodemailer = require("nodemailer");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
require("dotenv").config();

let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
        user: process.env.AUTH_EMAIL,
        pass: process.env.AUTH_PASS,
    }
});

transporter.verify((error, success) => {
    if (error) {
        console.log(error);
    } else {
        console.log("Ready for messages");
    }
});

// Sign up
// Optimized signup route
router.post('/signup', async (req, res) => {
    let { email, phone, password } = req.body;

    if (!email || !phone || !password) {
        return res.status(400).json({ status: "FAILED", message: "Empty input fields!" });
    }

    if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        return res.status(400).json({ status: "FAILED", message: "Invalid email entered" });
    }

    if (phone.length < 10) {
        return res.status(400).json({ status: "FAILED", message: "Invalid phone entered" });
    }

    if (password.length < 8) {
        return res.status(400).json({ status: "FAILED", message: "Password is too short!" });
    }

    try {
        // Check if user already exists
        const existingUser = await User.findOne({ email }).select('_id');
        if (existingUser) {
            return res.status(409).json({ status: "FAILED", message: "User already exists" });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create and save the new user
        const newUser = new User({
            email,
            phone,
            password: hashedPassword,
            verified: false,
        });

        const savedUser = await newUser.save();

        // Send OTP for verification
        await sendOTPVerificationEmail(savedUser, res);

    } catch (err) {
        console.error('Signup error:', err);
        res.status(500).json({ status: "FAILED", message: "An error occurred during signup!" });
    }
});

module.exports = router;


// send otp verification email
const sendOTPVerificationEmail = async ({ _id, email }, res) => {
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Enter <b>${otp}</b> in the app to verify your email and complete signup and login into your account.</p><p>This code <b>expires in 1 hour</b>.</p>`,
        };

        const saltRounds = 10;
        const hashedOTP = await bcrypt.hash(otp, saltRounds);
        const newOTPVerification = await new UserOTPVerification({
            userId: _id,
            otp: hashedOTP,
            createdAt: Date.now(),
            expiresAt: Date.now() + 3600000,
        });

        await newOTPVerification.save();
        await transporter.sendMail(mailOptions);
        res.json({
            status: "PENDING",
            message: "Verification otp email sent",
            data: {
                userId: _id,
                email,
            }
        });
    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message,
        });
    }
}

// verify otp email
// Optimized verify OTP route
router.post("/verifyOTP", async (req, res) => {
    const { userId, otp } = req.body;

    if (!userId || !otp) {
        return res.status(400).json({ status: "FAILED", message: "Empty OTP details are not allowed" });
    }

    try {
        const userVerificationRecord = await UserOTPVerification.findOne({ userId });
        if (!userVerificationRecord) {
            return res.status(400).json({ status: "FAILED", message: "Account record doesn't exist or has been verified already." });
        }

        const { expiresAt, otp: hashedOTP } = userVerificationRecord;

        if (expiresAt < Date.now()) {
            await UserOTPVerification.deleteOne({ userId });
            return res.status(410).json({ status: "FAILED", message: "Code has expired. Please try again." });
        }

        const isValidOTP = await bcrypt.compare(otp, hashedOTP);
        if (!isValidOTP) {
            return res.status(400).json({ status: "FAILED", message: "Invalid code passed. Check your inbox." });
        }

        // Mark user as verified
        await User.updateOne({ _id: userId }, { verified: true });
        await UserOTPVerification.deleteMany({ userId });

        res.json({ status: "VERIFIED", message: "User email verified successfully." });

    } catch (err) {
        console.error('OTP Verification error:', err);
        res.status(500).json({ status: "FAILED", message: "An error occurred during OTP verification!" });
    }
});

module.exports = router;


// resend verification
router.post("/resendOTPVerification", async (req, res) => {
    try {
        let { userId, email } = req.body;

        if (!userId || !email) {
            throw Error("Empty user details are not allowed");
        } else {
            // delete existing records and resend
            await UserOTPVerification.deleteMany({ userId });
            sendOTPVerificationEmail({ _id: userId, email }, res);
        }
    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message,
        });
    }
});

// Login
// Optimized login route
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ status: "FAILED", message: "Empty credentials supplied!" });
    }

    try {
        // Fetch only the necessary fields for login
        const user = await User.findOne({ email }).select('password verified');
        if (!user) {
            return res.status(401).json({ status: "FAILED", message: "Invalid credentials entered!" });
        }

        if (!user.verified) {
            return res.status(403).json({ status: "FAILED", message: "Email has not been verified yet. Check inbox." });
        }

        // Compare passwords
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ status: "FAILED", message: "Invalid password entered!" });
        }

        // Generate JWT
        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        res.json({
            status: "SUCCESS",
            message: "Login successful",
            data: { token, userId: user._id, email: user.email }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ status: "FAILED", message: "An error occurred during login!" });
    }
});

module.exports = router;


//forgot password
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({
            status: "FAILED",
            message: "Email is required"
        });
    }

    User.findOne({ email }).then(user => {
        if (!user) {
            return res.status(404).json({
                status: "FAILED",
                message: "User not found"
            });
        }

        const token = jwt.sign(
            { userId: user._id, email: user.email },
            process.env.JWT_SECRET,
            { expiresIn: '1h' }
        );

        const resetLink = `${process.env.CLIENT_URL}?token=${token}`;

        console.log(resetLink);
        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: user.email,
            subject: "Password Reset",
            html: `<p>Click <a href="${resetLink}">here</a> to reset your password. This link will expire in 1 hour.</p>`
        };

        transporter.sendMail(mailOptions, (err, info) => {
            if (err) {
                return res.status(500).json({
                    status: "FAILED",
                    message: "Failed to send reset email"
                });
            }

            res.json({
                status: "SUCCESS",
                message: "Password reset email sent"
            });
        });
    }).catch(err => {
        res.status(500).json({
            status: "FAILED",
            message: "An error occurred"
        });
    });
});

//reset password route and controller 
router.post('/reset-password/:token', (req, res) => {
    const { token } = req.params;
    const { newPassword } = req.body;

    console.log(token);
    console.log(newPassword);

    if (!token || !newPassword) {
        return res.status(400).json({
            status: "FAILED",
            message: "Token and new password are required"
        });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
        if (err) {
            return res.status(400).json({
                status: "FAILED",
                message: "Invalid or expired token"
            });
        }

        const { userId } = decoded;

        bcrypt.hash(newPassword, 10).then(hashedPassword => {
            User.updateOne({ _id: userId }, { password: hashedPassword })
                .then(() => {
                    res.json({
                        status: "SUCCESS",
                        message: "Password reset successful"
                    });
                })
                .catch(err => {
                    res.status(500).json({
                        status: "FAILED",
                        message: "Failed to reset password"
                    });
                });
        }).catch(err => {
            res.status(500).json({
                status: "FAILED",
                message: "An error occurred while hashing the password"
            });
        });
    });
});

module.exports = router;
