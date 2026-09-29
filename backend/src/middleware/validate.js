const { body, query, validationResult } = require('express-validator');

const run = (req, res, next) => {
  const result = validationResult(req);
  if (result.isEmpty()) return next();
  const errors = result.array().map((e) => ({ field: e.path, message: e.msg }));
  res.status(400).json({ message: errors[0].message, errors });
};

const PASSWORD_RE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,64}$/;
const password = (field = 'password') =>
  body(field).isString().matches(PASSWORD_RE).withMessage('Password needs 8-64 characters with upper case, lower case and a number');
const email = () => body('email').isEmail().withMessage('Enter a valid email').normalizeEmail();
const username = () =>
  body('username').isString().trim().isLength({ min: 3, max: 30 }).withMessage('Username must be 3-30 characters')
    .matches(/^[\w.-]+$/).withMessage('Username can only use letters, numbers, dot, dash and underscore');
const otp = () => body('otp').isString().matches(/^\d{6}$/).withMessage('Enter the 6-digit code');

module.exports = {
  run,
  signup: [username(), email(), password(), run],
  signin: [email(), body('password').isString().notEmpty().withMessage('Password is required'), run],
  emailOtp: [email(), otp(), run],
  emailOnly: [email(), run],
  resend: [email(), body('purpose').isIn(['signup', 'signin', 'reset']).withMessage('Invalid purpose'), run],
  reset: [email(), otp(), password('newPassword'), run],
  changeRequest: [body('currentPassword').isString().notEmpty().withMessage('Current password is required'), run],
  changeConfirm: [
    body('currentPassword').isString().notEmpty().withMessage('Current password is required'),
    otp(),
    password('newPassword'),
    run,
  ],
  profile: [username(), run],
  transaction: [
    body('type').isIn(['income', 'expense']).withMessage('Type must be income or expense'),
    body('description').isString().trim().isLength({ min: 1, max: 120 }).withMessage('Description is required (max 120 characters)'),
    body('amount').isFloat({ gt: 0, max: 1e9 }).withMessage('Amount must be greater than 0').toFloat(),
    body('date').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid date'),
    run,
  ],
  transactionQuery: [
    query('type').optional({ values: 'falsy' }).isIn(['income', 'expense']).withMessage('Invalid type filter'),
    query('from').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid "from" date'),
    query('to').optional({ values: 'falsy' }).isISO8601().withMessage('Invalid "to" date'),
    query('minAmount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Invalid minimum amount'),
    query('maxAmount').optional({ values: 'falsy' }).isFloat({ min: 0 }).withMessage('Invalid maximum amount'),
    run,
  ],
};
