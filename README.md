# Ledgerly - MEAN Finance Tracker

MongoDB + Express + Angular + Node. JWT auth with email OTP, server-side filtering, sorting and pagination.

## Run it

Prerequisites: Node 18+ and MongoDB running locally (or an Atlas URI).

```bash
# 1. API
cd backend
cp .env.example .env        # set JWT_SECRET (and MONGO_URI if not local)
npm install
npm run dev                 # http://localhost:5000

# 2. Web app (new terminal)
cd frontend
npm install
npm start                   # http://localhost:4200 (proxies /api to :5000)
```

**OTP emails:** leave `SMTP_HOST` empty and the code is printed in the API console (`[DEV MAIL]`).
For real emails, fill the `SMTP_*` values (Gmail app password, Mailtrap, SendGrid SMTP, etc.).
Set `SIGNIN_OTP=false` in `.env` to skip the OTP step on sign in.

## Structure

```
backend/
  server.js
  src/config/db.js
  src/models/        User, Transaction, Otp (TTL index)
  src/controllers/   auth, user, transaction
  src/routes/        auth, user, transaction
  src/middleware/    auth (JWT), validate (express-validator)
  src/utils/         otp (hash, expiry, attempts), mailer
frontend/src/app/
  core/              auth + transaction services, interceptor, guards
  pages/             signup, signin, forgot-password, home, profile
```

## API

| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | /api/auth/signup | - | Create unverified account, email OTP |
| POST | /api/auth/verify-signup | - | Verify OTP, returns JWT |
| POST | /api/auth/signin | - | Check password, then OTP step (or JWT if SIGNIN_OTP=false) |
| POST | /api/auth/verify-signin | - | Verify sign in OTP, returns JWT |
| POST | /api/auth/forgot-password | - | Email OTP (same response for unknown emails) |
| POST | /api/auth/reset-password | - | OTP + new password |
| POST | /api/auth/resend-otp | - | Resend for signup / signin / reset |
| GET/PUT | /api/user/me | JWT | Read / update profile (username) |
| POST | /api/user/change-password/request | JWT | Check current password, email OTP |
| POST | /api/user/change-password/confirm | JWT | OTP + new password |
| GET | /api/transactions | JWT | `type, from, to, minAmount, maxAmount, sortBy, order, page, limit` |
| POST | /api/transactions | JWT | `{ type, description, amount }` |
| DELETE | /api/transactions/:id | JWT | Delete own transaction |

## Security notes

- Passwords hashed with bcrypt (cost 12); never returned by the API.
- OTPs are 6 digits, stored as HMAC hashes, expire in 10 minutes, single use, max 5 attempts.
- Helmet, CORS restricted to `CLIENT_URL`, rate limiting on `/api/auth`, request body size limit.
- Every transaction query is scoped to the authenticated user.
- Route guards on Home and Profile; an interceptor attaches the JWT and signs out on 401.
