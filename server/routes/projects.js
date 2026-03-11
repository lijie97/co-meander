import express from 'express';
import { run, get, all } from '../db.js';
import { toWSLPath, normalizePath } from '../utils/path.js';
import { spawn } from 'child_process';
import { mkdir, access } from 'fs/promises';
import { constants } from 'fs';
import { homedir } from 'os';
import { join } from 'path';

const router = express.Router();

/**
 * 获取所有项目
 */
router.get('/', async (req, res) => {
  try {
    const projects = await all('SELECT * FROM projects ORDER BY updated_at DESC');
    res.json({ success: true, data: projects });
  } catch (err) {
    console.error('获取项目列表失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取单个项目
 */
router.get('/:id', async (req, res) => {
  try {
    const project = await get('SELECT * FROM projects WHERE id = ?', [req.params.id]);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    res.json({ success: true, data: project });
  } catch (err) {
    console.error('获取项目失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 创建新项目
 */
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ success: false, error: '项目名称不能为空' });
    }

    // 自动使用用户主目录 + 项目名称
    const projectPath = join(homedir(), name);
    const normalizedPath = normalizePath(projectPath);
    const wslPath = toWSLPath(normalizedPath);

    // 检查目录是否存在，不存在则创建
    try {
      await access(normalizedPath, constants.F_OK);
    } catch {
      await mkdir(normalizedPath, { recursive: true });
    }

    // 初始化 git（Windows 走 WSL，macOS/Linux 走本地 shell）
    await new Promise((resolve, reject) => {
      const cmd = `cd "${process.platform === 'win32' ? wslPath : normalizedPath}" && git init`;
      const proc = process.platform === 'win32'
        ? spawn('wsl.exe', ['bash', '-c', cmd])
        : spawn('bash', ['-lc', cmd]);

      let output = '';
      proc.stdout.on('data', (data) => {
        output += data.toString();
      });

      proc.stderr.on('data', (data) => {
        output += data.toString();
      });

      proc.on('close', (code) => {
        if (code === 0) {
          console.log('Git 初始化成功:', output);
          resolve();
        } else {
          reject(new Error(`Git 初始化失败: ${output}`));
        }
      });
    });

    // 插入数据库
    const result = await run(
      'INSERT INTO projects (name, path, wsl_path) VALUES (?, ?, ?)',
      [name, normalizedPath, wslPath]
    );

    const project = await get('SELECT * FROM projects WHERE id = ?', [result.id]);
    
    res.json({ success: true, data: project });
  } catch (err) {
    console.error('创建项目失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 导入现有项目
 */
router.post('/import', async (req, res) => {
  try {
    const { path: projectPath } = req.body;
    
    if (!projectPath) {
      return res.status(400).json({ success: false, error: '项目路径不能为空' });
    }

    const normalizedPath = normalizePath(projectPath);
    const wslPath = toWSLPath(normalizedPath);

    // 检查目录是否存在
    try {
      await access(normalizedPath, constants.F_OK);
    } catch {
      return res.status(400).json({ success: false, error: '项目路径不存在' });
    }

    // 从路径中提取项目名称
    const name = projectPath.split(/[/\\]/).filter(Boolean).pop();

    // 检查项目是否已导入
    const existing = await get('SELECT * FROM projects WHERE path = ?', [normalizedPath]);
    if (existing) {
      return res.status(400).json({ success: false, error: '该项目已存在' });
    }

    // 插入数据库
    const result = await run(
      'INSERT INTO projects (name, path, wsl_path) VALUES (?, ?, ?)',
      [name, normalizedPath, wslPath]
    );

    const project = await get('SELECT * FROM projects WHERE id = ?', [result.id]);
    
    res.json({ success: true, data: project });
  } catch (err) {
    console.error('导入项目失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 删除项目
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM projects WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }
    
    res.json({ success: true, message: '项目已删除' });
  } catch (err) {
    console.error('删除项目失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
