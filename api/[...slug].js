/**
 * MAQ AutoEditor - Catch-all Vercel Serverless Function Handler
 * Matches any request to /api/* and routes to the backend request engine.
 */

// Set Vercel serverless flag before importing server
process.env.VERCEL = process.env.VERCEL || '1';

const { handleRequest } = require('../backend/server');

module.exports = async (req, res) => {
  try {
    await handleRequest(req, res);
  } catch (err) {
    console.error('Vercel API Serverless Error:', err);
    if (!res.headersSent) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
    }
  }
};
