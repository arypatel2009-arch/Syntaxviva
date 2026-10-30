import rateLimit from 'express-rate-limit';

/**
 * Targeted authentication rate limiters protecting against brute force and automated registration abuse.
 * Configured specifically for /api/auth/login and /api/auth/signup.
 */

// Login Rate Limiter: max 20 attempts per 15-minute window per IP
export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: 'Too many authentication attempts from this IP. Please wait a few minutes before retrying.',
    statusCode: 429,
  },
  skipSuccessfulRequests: false,
});

// Signup Rate Limiter: max 10 account creation requests per 60-minute window per IP
export const signupRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  statusCode: 429,
  message: {
    error: 'Too many registration requests from this IP. Please wait before creating additional accounts.',
    statusCode: 429,
  },
});
