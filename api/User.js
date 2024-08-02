const express = require('express');
const router = express.Router();
const path = require('path');
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
router.post('/signup', (req, res) => {
    let { email, phone, password } = req.body;
    email = email.trim();
    phone = phone.trim();
    password = password.trim();

    if (email === "" || phone === "" || password === "") {
        res.json({
            status: "FAILED",
            message: "Empty input fields!"
        });
    } else if (!/^[\w-\.]+@([\w-]+\.)+[\w-]{2,4}$/.test(email)) {
        res.json({
            status: "FAILED",
            message: "Invalid email entered"
        });
    } else if (phone.length < 10) {
        res.json({
            status: "FAILED",
            message: "Invalid phone entered"
        });
    } else if (password.length < 8) {
        res.json({
            status: "FAILED",
            message: "Password is too short!"
        });
    } else {
        // Checking if user already exists
        User.find({ email }).then(result => {
            if (result.length) {
                res.json({
                    status: "FAILED",
                    message: "User already exists"
                });
            } else {
                const saltRounds = 10;
                bcrypt.hash(password, saltRounds).then(hashedPassword => {
                    const newUser = new User({
                        email,
                        phone,
                        password: hashedPassword,
                        verified: false,
                    });

                    newUser.save().then(result => {
                        sendOTPVerificationEmail(result, res);
                    }).catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while saving user account!"
                        });
                    });
                }).catch(err => {
                    res.json({
                        status: "FAILED",
                        message: "An error occurred while hashing password"
                    });
                });
            }
        }).catch(err => {
            console.log(err);
            res.json({
                status: "FAILED",
                message: "An error occurred while checking for existing user!"
            });
        });
    }
});

// send otp verification email
const sendOTPVerificationEmail = async ({ _id, email }, res) => {
    try {
        const otp = `${Math.floor(1000 + Math.random() * 9000)}`;

        const mailOptions = {
            from: process.env.AUTH_EMAIL,
            to: email,
            subject: "Verify Your Email",
            html: `<p>Enter <b>${otp}</b>in the app to verify your email and complete signup and login into your account.</p><p>This code <b>expires in 1 hours</b>.</p>`,
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
router.post("/verifyOTP", async (req, res) => {
    try {
        let { userId, otp } = req.body;
        if (!userId || !otp) {
            throw Error("Empty otp details are not allowed");
        } else {
            const UserVerificationRecords = await UserOTPVerification.find({
                userId,
            });
            if (UserVerificationRecords.length <= 0) {
                // throw error
                throw new Error(
                    "Account record doesn't exist or has been verified already. Please sign up or log in."
                );
            } else {
                // user otp record exits
                const { expiresAt } = UserVerificationRecords[0];
                const hashedOTP = UserVerificationRecords[0].otp;

                if (expiresAt < Date.now()) {
                    // user otp record has expired
                    await UserVerification.deleteMany({ userId });
                    throw new Error("Code has expired. Please try again.");
                } else {
                    const validOTP = await bcrypt.compare(otp, hashedOTP);

                    if (!validOTP) {
                        //supplied otp is wrong
                        throw new Error("Invalid code passed. Check your inbox.");
                    } else {
                        // success
                        await User.updateOne({ _id: userId }, { verified: true });
                        await UserOTPVerification.deleteMany({ userId });
                        res.json({
                            status: "VERIFIED",
                            message: "User email verified successfully.",
                        });
                    }
                }
            }
        }
    } catch (error) {
        res.json({
            status: "FAILED",
            message: error.message,
        });
    }
});

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
router.post('/login', (req, res) => {
    let { email, password } = req.body;
    email = email.trim();
    password = password.trim();

    if (email === "" || password === "") {
        res.json({
            status: "FAILED",
            message: "Empty credentials supplied!"
        });
    } else {
        User.find({ email }).then(data => {
            if (data.length) {
                if (!data[0].verified) {
                    res.json({
                        status: "FAILED",
                        message: "Email has not been verified yet. Check inbox."
                    });
                } else {
                    const hashedPassword = data[0].password;
                    bcrypt.compare(password, hashedPassword).then(result => {
                        if (result) {
                            res.json({
                                status: "SUCCESS",
                                message: "Login successful",
                                data: data,
                            });
                        } else {
                            res.json({
                                status: "FAILED",
                                message: "Invalid password entered!",
                            });
                        }
                    }).catch(err => {
                        res.json({
                            status: "FAILED",
                            message: "An error occurred while comparing password",
                        });
                    });
                }
            } else {
                res.json({
                    status: "FAILED",
                    message: "Invalid credentials entered!",
                });
            }
        }).catch(err => {
            res.json({
                status: "FAILED",
                message: "An error occurred while checking for existing account!",
            });
        });
    }
});


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
    const {token} = req.params;
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
