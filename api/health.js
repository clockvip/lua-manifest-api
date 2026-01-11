export default function handler(req, res) {
  // 设置响应头
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  
  // 生成健康状态信息
  const healthStatus = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'Lua Manifest Proxy API',
    version: '1.0.0',
    uptime: process.uptime(),
    memory: {
      rss: `${(process.memoryUsage().rss / 1024 / 1024).toFixed(2)} MB`,
      heapTotal: `${(process.memoryUsage().heapTotal / 1024 / 1024).toFixed(2)} MB`,
      heapUsed: `${(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2)} MB`
    },
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      luaFile: {
        pattern: 'GET /:appId.lua',
        example: '/1172620.lua',
        description: 'Proxy a Lua file from GitHub repository'
      },
      health: {
        pattern: 'GET /health',
        description: 'Service health check endpoint'
      }
    },
    configuration: {
      githubToken: process.env.GITHUB_TOKEN ? 'Configured' : 'Not configured',
      nodeVersion: process.version,
      platform: process.platform
    },
    repository: {
      source: 'github.com/SteamAutoCracks/ManifestHub',
      pattern: 'https://raw.githubusercontent.com/SteamAutoCracks/ManifestHub/{appId}/{appId}.lua'
    },
    notes: [
      'This API proxies Lua files from the SteamAutoCracks/ManifestHub repository',
      'Each branch in the source repository corresponds to an appId',
      'Files are cached for 24 hours at CDN level'
    ]
  };

  // 返回健康状态
  res.status(200).json(healthStatus);
}

// Vercel函数配置
export const config = {
  api: {
    responseLimit: '1mb'
  }
};