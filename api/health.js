export default function handler(req, res) {
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'no-store');
  
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Lua Manifest Proxy API',
    version: '1.0.0',
    endpoints: {
      luaFile: 'GET /:appId.lua',
      health: 'GET /health'
    },
    note: 'Proxying files from github.com/SteamAutoCracks/ManifestHub'
  });
}

export const config = {
  api: {
    responseLimit: '1mb'
  }
};
