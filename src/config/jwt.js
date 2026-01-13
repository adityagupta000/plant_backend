/**
 * JWT Configuration
 * Centralized configuration for Access and Refresh tokens
 */

module.exports = {
  // Access Token Configuration (Short-lived)
  access: {
    secret: process.env.ACCESS_TOKEN_SECRET,
    expiresIn: process.env.ACCESS_TOKEN_EXPIRE || '15m',
    algorithm: 'HS256'
  },
  
  // Refresh Token Configuration (Long-lived)
  refresh: {
    secret: process.env.REFRESH_TOKEN_SECRET,
    expiresIn: process.env.REFRESH_TOKEN_EXPIRE || '7d',
    algorithm: 'HS256'
  },
  
  // Cookie Configuration for Refresh Token
  cookie: {
    name: process.env.REFRESH_TOKEN_COOKIE_NAME || 'refreshToken',
    httpOnly: true, // Cannot be accessed by JavaScript (XSS protection)
    secure: process.env.COOKIE_SECURE === 'true', // HTTPS only in production
    sameSite: process.env.COOKIE_SAME_SITE || 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in milliseconds
  }
};