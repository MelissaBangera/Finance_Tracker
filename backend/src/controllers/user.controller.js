const User = require('../models/User');
const { issueOtp, checkOtp } = require('../utils/otp');

const publicUser = (u) => ({ id: u._id, username: u.username, email: u.email, createdAt: u.createdAt });
const wrap = (fn) => (req, res, next) => fn(req, res, next).catch(next);

exports.getMe = (req, res) => res.json({ user: publicUser(req.user) });

exports.updateMe = wrap(async (req, res) => {
  const { username } = req.body;
  const taken = await User.findOne({ username, _id: { $ne: req.user._id } });
  if (taken) return res.status(409).json({ message: 'That username is taken' });
  req.user.username = username;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

// Step 1: confirm current password, then email an OTP
exports.requestPasswordChange = wrap(async (req, res) => {
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(req.body.currentPassword))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  await issueOtp(user.email, 'change-password');
  res.json({ message: 'We sent a 6-digit code to your email' });
});

// Step 2: verify OTP and set the new password
exports.confirmPasswordChange = wrap(async (req, res) => {
  const { currentPassword, otp, newPassword } = req.body;
  const user = await User.findById(req.user._id).select('+password');
  if (!(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  if (!(await checkOtp(user.email, 'change-password', otp))) {
    return res.status(400).json({ message: 'Invalid or expired code' });
  }
  user.password = newPassword;
  await user.save();
  res.json({ message: 'Password changed' });
});
