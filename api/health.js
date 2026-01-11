// api/health.js
export default function handler(req, res) {
  const cache = globalThis.luaCache || new Map();
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    cache: {
      size: cache.size,
      uptime: process.uptime()
    },
    endpoints: {
      luaFile: 'GET /api/:appId.lua',
      health: 'GET /api/health'
    },
    github: {
      hasToken: !!process.env.GITHUB_TOKEN,
      rateLimit: '5000/hour (with token)'
    }
  });
}