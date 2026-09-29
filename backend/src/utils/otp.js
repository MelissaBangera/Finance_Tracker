const crypto = require('crypto');
const Otp = require('../models/Otp');
const { sendMail } = require('./mailer');

const TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;

const hash = (email, purpose, code) =>
  crypto.createHmac('sha256', process.env.JWT_SECRET).update(`${email}:${purpose}:${code}`).digest('hex');

const LABELS = {
  signup: 'verify your email',
  signin: 'sign in',
  reset: 'reset your password',
  'change-password': 'change your password',
};

async function issueOtp(email, purpose) {
  const code = String(crypto.randomInt(100000, 1000000));
  await Otp.findOneAndUpdate(
    { email, purpose },
    { codeHash: hash(email, purpose, code), attempts: 0, expiresAt: new Date(Date.now() + TTL_MS) },
    { upsert: true, new: true }
  );
  await sendMail(
    email,
    `Your Finance Tracker code: ${code}`,
    `Use this code to ${LABELS[purpose]}: ${code}\n\nIt expires in 10 minutes. If you didn't request it, you can ignore this email.`
  );
}

async function checkOtp(email, purpose, code) {
  const rec = await Otp.findOne({ email, purpose });
  if (!rec || rec.expiresAt < new Date()) return false;
  if (rec.attempts >= MAX_ATTEMPTS) {
    await rec.deleteOne();
    return false;
  }
  rec.attempts += 1;
  await rec.save();

  const a = Buffer.from(rec.codeHash);
  const b = Buffer.from(hash(email, purpose, String(code)));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return false;

  await rec.deleteOne(); // single use
  return true;
}

module.exports = { issueOtp, checkOtp };
