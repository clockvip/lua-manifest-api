import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';

export default async function handler(req, res) {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理预检请求
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // 只允许GET请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { appId } = req.query;
  
  // 验证appId格式
  if (!appId || !/^\d+$/.test(appId)) {
    return res.status(400).json({ 
      error: 'Invalid appId',
      message: 'AppId must contain only numbers'
    });
  }

  try {
    const githubUrl = `https://raw.githubusercontent.com/SteamAutoCracks/ManifestHub/${appId}/${appId}.lua`;
    
    const headers = {
      'User-Agent': 'Lua-Manifest-API/1.0',
      'Accept': 'text/plain'
    };
    
    if (GITHUB_TOKEN) {
      headers.Authorization = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(githubUrl, { 
      headers,
      timeout: 10000 
    });

    if (response.ok) {
      const content = await response.text();
      
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-AppId', appId);
      res.setHeader('X-Cache', 'MISS');
      
      return res.send(content);
    } else if (response.status === 404) {
      return res.status(404).json({
        error: 'File not found',
        appId: appId,
        message: `No Lua file found for appId ${appId}`
      });
    } else {
      return res.status(response.status).json({
        error: 'GitHub API error',
        status: response.status,
        statusText: response.statusText
      });
    }
  } catch (error) {
    console.error(`Error fetching ${appId}:`, error);
    
    if (error.name === 'TimeoutError' || error.code === 'ECONNRESET') {
      return res.status(504).json({ 
        error: 'Gateway timeout',
        message: 'Request to GitHub timed out'
      });
    }
    
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message || 'Unknown error'
    });
  }
}

export const config = {
  api: {
    responseLimit: '1mb',
    externalResolver: true
  }
};
