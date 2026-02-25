import express from 'express';
import Database from 'better-sqlite3';
import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import { createHash } from 'crypto';
import os from 'os';

const router = express.Router();

/**
 * 获取 Cursor chats 目录路径
 */
function getCursorChatsDir() {
  // WSL 环境
  if (process.platform === 'linux' && existsSync('/root/.cursor/chats')) {
    return '/root/.cursor/chats';
  }
  // Windows 环境
  const homeDir = os.homedir();
  const winPath = join(homeDir, '.cursor', 'chats');
  if (existsSync(winPath)) {
    return winPath;
  }
  return null;
}

/**
 * 计算项目路径的哈希（Cursor 用这个作为目录名）
 */
function getProjectHash(projectPath) {
  return createHash('md5').update(projectPath).digest('hex');
}

/**
 * 获取项目的聊天会话列表
 */
router.get('/sessions', async (req, res) => {
  try {
    const { projectPath } = req.query;
    if (!projectPath) {
      return res.status(400).json({ success: false, error: '需要 projectPath 参数' });
    }

    const chatsDir = getCursorChatsDir();
    if (!chatsDir) {
      return res.json({ success: true, data: [] });
    }

    // 尝试多种可能的哈希方式
    const possibleHashes = [
      getProjectHash(projectPath),
      getProjectHash(projectPath.replace(/\\/g, '/')),
      getProjectHash(projectPath.replace(/\//g, '\\')),
    ];

    let projectDir = null;
    for (const hash of possibleHashes) {
      const testPath = join(chatsDir, hash);
      if (existsSync(testPath)) {
        projectDir = testPath;
        break;
      }
    }

    // 如果找不到，列出所有目录让前端选择
    if (!projectDir) {
      const dirs = readdirSync(chatsDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      return res.json({ 
        success: true, 
        data: [],
        availableHashes: dirs,
        message: '未找到匹配的项目目录'
      });
    }

    // 获取会话列表
    const sessions = readdirSync(projectDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => ({
        id: d.name,
        path: join(projectDir, d.name),
      }));

    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('获取聊天会话失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取聊天历史
 */
router.get('/history', async (req, res) => {
  try {
    const { sessionPath } = req.query;
    if (!sessionPath) {
      return res.status(400).json({ success: false, error: '需要 sessionPath 参数' });
    }

    const dbPath = join(sessionPath, 'store.db');
    if (!existsSync(dbPath)) {
      return res.json({ success: true, data: [] });
    }

    // 打开数据库（只读）
    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    
    try {
      // 获取所有 blobs
      const blobs = db.prepare('SELECT id, data FROM blobs WHERE length(data) > 0').all();
      
      // 解析消息
      const messages = [];
      for (const blob of blobs) {
        try {
          const json = blob.data.toString('utf-8');
          const msg = JSON.parse(json);
          if (msg.role && msg.content) {
            messages.push({
              id: blob.id,
              role: msg.role,
              content: msg.content,
            });
          }
        } catch (e) {
          // 忽略非 JSON 数据
        }
      }

      // 按角色过滤（排除 system 消息）
      const chatMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

      res.json({ success: true, data: chatMessages });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error('获取聊天历史失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 直接通过哈希目录获取聊天历史
 */
router.get('/history-by-hash', async (req, res) => {
  try {
    const { hash, sessionId } = req.query;
    if (!hash) {
      return res.status(400).json({ success: false, error: '需要 hash 参数' });
    }

    const chatsDir = getCursorChatsDir();
    if (!chatsDir) {
      return res.json({ success: true, data: [] });
    }

    const projectDir = join(chatsDir, hash);
    if (!existsSync(projectDir)) {
      return res.json({ success: true, data: [], error: '目录不存在' });
    }

    // 如果没有指定 sessionId，获取最新的
    let targetSession = sessionId;
    if (!targetSession) {
      const sessions = readdirSync(projectDir, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name);
      if (sessions.length === 0) {
        return res.json({ success: true, data: [] });
      }
      targetSession = sessions[sessions.length - 1]; // 取最后一个
    }

    const dbPath = join(projectDir, targetSession, 'store.db');
    if (!existsSync(dbPath)) {
      return res.json({ success: true, data: [] });
    }

    const db = new Database(dbPath, { readonly: true, fileMustExist: true });
    
    try {
      const blobs = db.prepare('SELECT id, data FROM blobs WHERE length(data) > 0').all();
      
      const messages = [];
      for (const blob of blobs) {
        try {
          const json = blob.data.toString('utf-8');
          const msg = JSON.parse(json);
          if (msg.role && msg.content) {
            messages.push({
              id: blob.id,
              role: msg.role,
              content: msg.content,
            });
          }
        } catch (e) {
          // 忽略
        }
      }

      const chatMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');
      res.json({ success: true, data: chatMessages });
    } finally {
      db.close();
    }
  } catch (err) {
    console.error('获取聊天历史失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
