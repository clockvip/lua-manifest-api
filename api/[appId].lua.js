// api/[appId].lua.js
import fetch from 'node-fetch';

// GitHub Token - 必须设置！
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;

// 内存缓存（Vercel Serverless 环境中，使用全局变量实现简易缓存）
const cache = globalThis.luaCache || (globalThis.luaCache = new Map());

export default async function handler(req, res) {
  // 只允许 GET 请求
  if (req.method !== 'GET') {
    return res.status(405).json({ error: '只支持 GET 方法' });
  }

  const { appId } = req.query;
  const startTime = Date.now();

  // 验证 appId 格式（应为数字）
  if (!/^\d+$/.test(appId)) {
    return res.status(400).json({ 
      error: '无效的 appId 格式',
      message: 'appId 必须为数字'
    });
  }

  // 1. 检查缓存
  const cacheKey = `lua:${appId}`;
  const cached = cache.get(cacheKey);
  
  if (cached && Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
    // 缓存命中（24小时内有效）
    const duration = Date.now() - startTime;
    
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('X-Cache', 'HIT');
    res.setHeader('X-AppId', appId);
    res.setHeader('X-Response-Time', `${duration}ms`);
    res.setHeader('Cache-Control', 'public, max-age=86400'); // 客户端缓存24小时
    
    return res.send(cached.content);
  }

  // 2. 从 GitHub 获取
  try {
    console.log(`[${new Date().toISOString()}] FETCH ${appId}`);
    
    const githubUrl = `https://raw.githubusercontent.com/SteamAutoCracks/ManifestHub/${appId}/${appId}.lua`;
    
    const fetchOptions = {
      timeout: 10000,
      headers: {
        'User-Agent': 'Lua-Manifest-Vercel-Proxy/1.0',
      }
    };

    // 如果有 Token，添加到请求头
    if (GITHUB_TOKEN) {
      fetchOptions.headers.Authorization = `token ${GITHUB_TOKEN}`;
    }

    const response = await fetch(githubUrl, fetchOptions);
    const duration = Date.now() - startTime;

    if (response.status === 200) {
      const content = await response.text();
      
      // 验证内容（确保是有效的 Lua 文件）
      if (content && content.length > 0 && content.length < 50000) {
        // 存入缓存
        cache.set(cacheKey, {
          content,
          timestamp: Date.now()
        });
        
        // 设置响应头
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
        res.setHeader('X-Cache', 'MISS');
        res.setHeader('X-AppId', appId);
        res.setHeader('X-Response-Time', `${duration}ms`);
        res.setHeader('Cache-Control', 'public, max-age=86400'); // 客户端缓存24小时
        res.setHeader('Access-Control-Allow-Origin', '*'); // CORS 支持
        
        console.log(`[${new Date().toISOString()}] SUCCESS ${appId} (${duration}ms)`);
        return res.send(content);
      } else {
        throw new Error('无效的文件内容');
      }
    } else if (response.status === 404) {
      res.status(404).json({
        error: '文件未找到',
        appId,
        message: '该 appId 对应的 Lua 文件不存在',
        githubUrl
      });
    } else if (response.status === 403) {
      // GitHub 速率限制
      res.status(429).json({
        error: 'GitHub 速率限制',
        appId,
        message: 'GitHub API 限制，请稍后重试',
        retryAfter: 60
      });
    } else {
      throw new Error(`GitHub 响应: ${response.status}`);
    }
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[${new Date().toISOString()}] ERROR ${appId}:`, error.message);
    
    res.setHeader('X-Response-Time', `${duration}ms`);
    
    if (error.name === 'TimeoutError' || error.code === 'ECONNRESET') {
      res.status(504).json({ 
        error: '请求超时', 
        appId,
        message: '从 GitHub 获取文件超时'
      });
    } else {
      res.status(502).json({ 
        error: '上游服务错误', 
        appId,
        message: error.message
      });
    }
  }
}

// 配置 Vercel Serverless Function
export const config = {
  api: {
    responseLimit: '10mb', // 响应大小限制
    externalResolver: true, // 告诉 Vercel 我们手动处理响应
  },
};