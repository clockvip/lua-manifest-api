import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

export default async function handler(req, res) {
  // 设置CORS头，解决浏览器跨域问题
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed',
      message: 'Only GET requests are supported'
    });
  }

  const { appId } = req.query;
  
  // 验证appId格式（必须是数字）
  if (!appId || !/^\d+$/.test(appId)) {
    return res.status(400).json({ 
      error: 'Invalid appId',
      message: 'AppId must be a numeric value'
    });
  }

  console.log(`[${new Date().toISOString()}] Requesting: ${appId}.lua`);
  
  try {
    // 构建GitHub源文件URL
    const githubUrl = `https://raw.githubusercontent.com/SteamAutoCracks/ManifestHub/${appId}/${appId}.lua`;
    
    // 准备请求头
    const headers = {
      'User-Agent': 'Lua-Manifest-Proxy/1.0',
      'Accept': 'text/plain'
    };
    
    // 如果设置了GitHub Token，添加到请求头
    if (GITHUB_TOKEN && GITHUB_TOKEN.trim() !== '') {
      headers.Authorization = `token ${GITHUB_TOKEN.trim()}`;
      console.log(`[${new Date().toISOString()}] Using GitHub token for request`);
    }
    
    // 请求GitHub
    const response = await fetch(githubUrl, { 
      headers,
      timeout: 15000 // 15秒超时
    });

    // 处理GitHub响应
    if (response.ok) {
      const luaContent = await response.text();
      const contentLength = Buffer.byteLength(luaContent, 'utf8');
      
      console.log(`[${new Date().toISOString()}] Success: ${appId}.lua (${contentLength} bytes)`);
      
      // 设置成功响应头
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400'); // 浏览器缓存24小时
      res.setHeader('Content-Length', contentLength);
      res.setHeader('X-AppId', appId);
      res.setHeader('X-Cache', 'MISS');
      res.setHeader('X-Source', 'GitHub');
      
      return res.send(luaContent);
      
    } else if (response.status === 404) {
      // 文件不存在
      console.log(`[${new Date().toISOString()}] Not found: ${appId}.lua`);
      return res.status(404).json({
        error: 'File not found',
        appId: appId,
        message: `No Lua file found for appId ${appId} in the source repository`,
        githubUrl: githubUrl
      });
      
    } else if (response.status === 403 || response.status === 429) {
      // GitHub速率限制
      console.log(`[${new Date().toISOString()}] Rate limited: ${appId}.lua`);
      return res.status(429).json({
        error: 'Rate limit exceeded',
        appId: appId,
        message: 'GitHub API rate limit reached. Please try again later.',
        retryAfter: 60
      });
      
    } else {
      // 其他GitHub错误
      console.log(`[${new Date().toISOString()}] GitHub error ${response.status}: ${appId}.lua`);
      return res.status(response.status).json({
        error: 'GitHub API error',
        appId: appId,
        status: response.status,
        statusText: response.statusText,
        githubUrl: githubUrl
      });
    }
    
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error fetching ${appId}.lua:`, error.message);
    
    // 处理不同类型的错误
    if (error.name === 'TimeoutError' || error.code === 'ETIMEDOUT') {
      return res.status(504).json({ 
        error: 'Gateway timeout',
        appId: appId,
        message: 'Request to GitHub timed out after 15 seconds'
      });
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      return res.status(502).json({
        error: 'Bad gateway',
        appId: appId,
        message: 'Cannot connect to GitHub servers'
      });
    } else {
      return res.status(500).json({
        error: 'Internal server error',
        appId: appId,
        message: error.message || 'An unexpected error occurred'
      });
    }
  }
}

// Vercel Serverless函数配置
export const config = {
  api: {
    responseLimit: '2mb',
    externalResolver: true,
    bodyParser: false
  }
};