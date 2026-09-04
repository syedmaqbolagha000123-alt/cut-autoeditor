/**
 * MAQ AutoEditor - Vercel Serverless Function Handler
 * Automatically handles API routes under Vercel edge/serverless infrastructure.
 */

// Set Vercel serverless flag before importing server
process.env.VERCEL = process.env.VERCEL || '1';

const { handleRequest } = require('../backend/server');

module.exports = async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('Vercel API error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
  }
};
