const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { issueOtp, checkOtp } = require('../utils/otp');

const signToken = (user) => jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '1d' });
const publicUser = (u) => ({ id: u._id, username: u.username, email: u.email });
const session = (user) => ({ token: signToken(user), user: publicUser(user) });
const badCode = (res) => res.status(400).json({ message: 'Invalid or expired code' });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

exports.signup = wrap(async (req, res) => {
  const { username, email, password } = req.body;

  const byEmail = await User.findOne({ email });
  if (byEmail && byEmail.isVerified) return res.status(409).json({ message: 'An account with this email already exists' });

  const byName = await User.findOne({ username });
  if (byName && (!byEmail || !byName._id.equals(byEmail._id))) {
    return res.status(409).json({ message: 'That username is taken' });
  }

  if (byEmail) {
    // Unverified account from an earlier attempt: refresh its details
    byEmail.username = username;
    byEmail.password = password;
    await byEmail.save();
  } else {
    await User.create({ username, email, password });
  }
  await issueOtp(email, 'signup');
  res.status(201).json({ message: 'We sent a 6-digit code to your email', email });
});

exports.verifySignup = wrap(async (req, res) => {
  const { email, otp } = req.body;
  if (!(await checkOtp(email, 'signup', otp))) return badCode(res);
  const user = await User.findOneAndUpdate({ email }, { isVerified: true }, { new: true });
  if (!user) return badCode(res);
  res.json(session(user));
});

exports.signin = wrap(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email }).select('+password');
  if (!user || !(await user.comparePassword(password))) {
    return res.status(401).json({ message: 'Incorrect email or password' });
  }
  if (!user.isVerified) {
    await issueOtp(email, 'signup');
    return res.json({ step: 'verify-signup', message: 'Verify your email to finish creating your account' });
  }
  if (process.env.SIGNIN_OTP !== 'false') {
    await issueOtp(email, 'signin');
    return res.json({ step: 'verify-signin', message: 'We sent a 6-digit code to your email' });
  }
  res.json({ step: 'done', ...session(user) });
});

exports.verifySignin = wrap(async (req, res) => {
  const { email, otp } = req.body;
  if (!(await checkOtp(email, 'signin', otp))) return badCode(res);
  const user = await User.findOne({ email, isVerified: true });
  if (!user) return badCode(res);
  res.json(session(user));
});

// Same response whether or not the email exists, so accounts can't be enumerated
const GENERIC = { message: 'If that email is registered, a code is on its way' };

exports.forgotPassword = wrap(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email, isVerified: true });
  if (user) await issueOtp(email, 'reset');
  res.json(GENERIC);
});

exports.resetPassword = wrap(async (req, res) => {
  const { email, otp, newPassword } = req.body;
  if (!(await checkOtp(email, 'reset', otp))) return badCode(res);
  const user = await User.findOne({ email, isVerified: true }).select('+password');
  if (!user) return badCode(res);
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password updated. You can sign in now.' });
});

exports.resendOtp = wrap(async (req, res) => {
  const { email, purpose } = req.body;
  const user = await User.findOne({ email });
  const allowed = user && (purpose === 'signup' ? !user.isVerified : user.isVerified);
  if (allowed) await issueOtp(email, purpose);
  res.json(GENERIC);
});
