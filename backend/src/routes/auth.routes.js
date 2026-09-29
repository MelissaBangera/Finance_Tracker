const router = require('express').Router();
const c = require('../controllers/auth.controller');
const v = require('../middleware/validate');

router.post('/signup', v.signup, c.signup);
router.post('/verify-signup', v.emailOtp, c.verifySignup);
router.post('/signin', v.signin, c.signin);
router.post('/verify-signin', v.emailOtp, c.verifySignin);
router.post('/forgot-password', v.emailOnly, c.forgotPassword);
router.post('/reset-password', v.reset, c.resetPassword);
router.post('/resend-otp', v.resend, c.resendOtp);

module.exports = router;
