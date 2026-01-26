import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const router = express.Router();

// 忽略的目录和文件
const IGNORED_PATTERNS = [
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  'dist',
  'build',
  '.cache',
  '__pycache__',
  '.venv',
  'venv',
  '.DS_Store',
  'Thumbs.db',
  '*.pyc',
  '*.pyo',
  '.env',
  '.env.local',
];

/**
 * 检查是否应该忽略该路径
 */
function shouldIgnore(name) {
  return IGNORED_PATTERNS.some(pattern => {
    if (pattern.includes('*')) {
      const regex = new RegExp(pattern.replace('*', '.*'));
      return regex.test(name);
    }
    return name === pattern;
  });
}

/**
 * 递归读取目录树
 */
async function readDirTree(dirPath, basePath = '', depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return [];

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    const result = [];

    for (const entry of entries) {
      if (shouldIgnore(entry.name)) continue;

      const relativePath = path.join(basePath, entry.name);
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        const children = await readDirTree(fullPath, relativePath, depth + 1, maxDepth);
        result.push({
          name: entry.name,
          path: relativePath,
          type: 'directory',
          children,
        });
      } else {
        // 获取文件大小
        try {
          const stat = await fs.stat(fullPath);
          result.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: stat.size,
          });
        } catch {
          result.push({
            name: entry.name,
            path: relativePath,
            type: 'file',
            size: 0,
          });
        }
      }
    }

    // 排序：目录优先，然后按名称
    return result.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
  } catch (err) {
    console.error('读取目录失败:', err);
    return [];
  }
}

/**
 * 获取项目文件树
 */
router.get('/tree', async (req, res) => {
  try {
    const { projectPath } = req.query;

    if (!projectPath) {
      return res.status(400).json({ success: false, error: '项目路径不能为空' });
    }

    // 检查路径是否存在
    try {
      await fs.access(projectPath);
    } catch {
      return res.status(404).json({ success: false, error: '项目路径不存在' });
    }

    const tree = await readDirTree(projectPath);
    res.json({ success: true, data: tree });
  } catch (err) {
    console.error('获取文件树失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 读取文件内容
 */
router.get('/content', async (req, res) => {
  try {
    const { projectPath, filePath } = req.query;

    if (!projectPath || !filePath) {
      return res.status(400).json({ success: false, error: '项目路径和文件路径不能为空' });
    }

    const fullPath = path.join(projectPath, filePath);

    // 安全检查：确保文件在项目目录内
    const resolvedPath = path.resolve(fullPath);
    const resolvedProjectPath = path.resolve(projectPath);
    if (!resolvedPath.startsWith(resolvedProjectPath)) {
      return res.status(403).json({ success: false, error: '禁止访问项目目录之外的文件' });
    }

    // 检查文件是否存在
    try {
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        return res.status(400).json({ success: false, error: '路径是目录，不是文件' });
      }
      
      // 限制文件大小（1MB）
      if (stat.size > 1024 * 1024) {
        return res.status(400).json({ success: false, error: '文件太大，无法预览' });
      }
    } catch {
      return res.status(404).json({ success: false, error: '文件不存在' });
    }

    // 读取文件内容
    const content = await fs.readFile(fullPath, 'utf-8');
    
    // 获取文件扩展名用于语法高亮
    const ext = path.extname(filePath).slice(1).toLowerCase();

    res.json({
      success: true,
      data: {
        content,
        extension: ext,
        path: filePath,
      },
    });
  } catch (err) {
    // 处理二进制文件
    if (err.code === 'ERR_INVALID_ARG_VALUE' || err.message.includes('encoding')) {
      return res.status(400).json({ success: false, error: '无法预览二进制文件' });
    }
    console.error('读取文件失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
