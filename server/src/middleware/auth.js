// ============================================================================
// server/src/middleware/auth.js  —  LOGIN TOKEN CREATION & VERIFICATION
// ----------------------------------------------------------------------------
// This app uses JWTs (JSON Web Tokens) for auth. A JWT is a signed string that
// encodes the user's id. Because it's signed with our secret, the server can trust
// it without storing sessions: if the signature verifies, the token is genuine.
//
//   - signToken(userId): create a token at login/register time.
//   - requireAuth: Express middleware that guards protected routes by checking the
//     token on each request. "Middleware" = a function that runs before the route
//     handler and can either pass control on (next()) or reject the request.
// ============================================================================

import jwt from 'jsonwebtoken';

// Guard middleware. Runs before protected route handlers.
export function requireAuth(req, res, next) {
  // The token arrives in the "Authorization: Bearer <token>" header (set by the
  // frontend's api.js request interceptor).
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null; // strip "Bearer "
  if (!token) return res.status(401).json({ message: 'Not authenticated' });
  try {
    // Verify the signature + expiry. Throws if the token is invalid/expired.
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.id; // stash the user id so route handlers know who's calling
    next();                  // all good — hand off to the actual route
  } catch {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

// Create a signed token embedding the user's id. Used right after a successful
// login/register. Expires after JWT_EXPIRES (default 7 days).
export function signToken(userId) {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES || '7d',
  });
}
