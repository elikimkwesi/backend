const express = require('express');
const { check } = require('express-validator');
const {
  register,
  login,
  forgotPassword,
  verifyPhone,
  resendVerificationCode,
} = require('../controllers/authControllers');
const validateRequest = require('../createMiddleware/validateRequest');

const router = express.Router();

router.post(
  '/register',
  [
    check('email', 'Email is required').isEmail(),
    check('password', 'Password is required').isLength({ min: 6 }),
    check('phone', 'Phone number is required').isMobilePhone('any'),
  ],
  validateRequest,
  register
);

router.post(
  '/login',
  [
    check('email', 'Email is required').isEmail(),
    check('password', 'Password is required').isLength({ min: 6 }),
  ],
  validateRequest,
  login
);

router.post(
  '/forgot-password',
  [
    check('email', 'Email is required').isEmail(),
  ],
  validateRequest,
  forgotPassword
);

router.post(
  '/verify-phone',
  [
    check('phone', 'Phone number is required').isMobilePhone('any'),
    check('code', 'Verification code is required').notEmpty(),
  ],
  validateRequest,
  verifyPhone
);

router.post(
  '/resend-verification-code',
  [
    check('phone', 'Phone number is required').isMobilePhone('any'),
  ],
  validateRequest,
  resendVerificationCode
);

module.exports = router;
