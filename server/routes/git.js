import express from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';

const execAsync = promisify(exec);
const router = express.Router();

/**
 * 执行 git 命令
 */
async function runGitCommand(projectPath, command) {
  try {
    const { stdout, stderr } = await execAsync(`git ${command}`, {
      cwd: projectPath,
      maxBuffer: 10 * 1024 * 1024, // 10MB
    });
    return { success: true, output: stdout, error: stderr };
  } catch (err) {
    return { success: false, output: '', error: err.message };
  }
}

/**
 * 检查是否是 git 仓库
 */
router.get('/check', async (req, res) => {
  try {
    const { projectPath } = req.query;

    if (!projectPath) {
      return res.status(400).json({ success: false, error: '项目路径不能为空' });
    }

    const gitDir = path.join(projectPath, '.git');
    try {
      await fs.access(gitDir);
      res.json({ success: true, data: { isGitRepo: true } });
    } catch {
      res.json({ success: true, data: { isGitRepo: false } });
    }
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取 git status（变更文件列表）
 */
router.get('/status', async (req, res) => {
  try {
    const { projectPath } = req.query;

    if (!projectPath) {
      return res.status(400).json({ success: false, error: '项目路径不能为空' });
    }

    // 使用 porcelain 格式便于解析
    const result = await runGitCommand(projectPath, 'status --porcelain -uall');

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    const files = [];
    const lines = result.output.split('\n').filter(line => line.trim());

    for (const line of lines) {
      const status = line.substring(0, 2);
      const filePath = line.substring(3);

      // 解析状态
      let statusText = '';
      let statusType = '';

      const indexStatus = status[0];
      const workTreeStatus = status[1];

      if (indexStatus === '?' && workTreeStatus === '?') {
        statusText = '未跟踪';
        statusType = 'untracked';
      } else if (indexStatus === 'A') {
        statusText = '新增';
        statusType = 'added';
      } else if (indexStatus === 'D' || workTreeStatus === 'D') {
        statusText = '删除';
        statusType = 'deleted';
      } else if (indexStatus === 'M' || workTreeStatus === 'M') {
        statusText = '修改';
        statusType = 'modified';
      } else if (indexStatus === 'R') {
        statusText = '重命名';
        statusType = 'renamed';
      } else {
        statusText = '变更';
        statusType = 'changed';
      }

      files.push({
        path: filePath,
        status: statusText,
        statusType,
        staged: indexStatus !== ' ' && indexStatus !== '?',
      });
    }

    res.json({ success: true, data: files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取文件 diff
 */
router.get('/diff', async (req, res) => {
  try {
    const { projectPath, filePath, staged } = req.query;

    if (!projectPath || !filePath) {
      return res.status(400).json({ success: false, error: '项目路径和文件路径不能为空' });
    }

    // 根据是否暂存选择不同的 diff 命令
    const diffCommand = staged === 'true'
      ? `diff --cached -- "${filePath}"`
      : `diff -- "${filePath}"`;

    const result = await runGitCommand(projectPath, diffCommand);

    // 如果是新文件（未跟踪），读取文件内容作为 diff
    if (!result.output && !result.error) {
      const fullPath = path.join(projectPath, filePath);
      try {
        const content = await fs.readFile(fullPath, 'utf-8');
        res.json({
          success: true,
          data: {
            oldContent: '',
            newContent: content,
            isNewFile: true,
            filePath,
          },
        });
        return;
      } catch {
        // 文件可能被删除
        res.json({
          success: true,
          data: {
            oldContent: '',
            newContent: '',
            isDeleted: true,
            filePath,
          },
        });
        return;
      }
    }

    // 解析 unified diff 格式
    const diffOutput = result.output;
    
    // 获取原始文件内容和新文件内容（用于对比显示）
    let oldContent = '';
    let newContent = '';

    // 尝试获取 HEAD 版本
    const headResult = await runGitCommand(projectPath, `show HEAD:"${filePath}"`);
    if (headResult.success) {
      oldContent = headResult.output;
    }

    // 读取当前工作区文件
    const fullPath = path.join(projectPath, filePath);
    try {
      newContent = await fs.readFile(fullPath, 'utf-8');
    } catch {
      // 文件可能被删除
    }

    res.json({
      success: true,
      data: {
        diff: diffOutput,
        oldContent,
        newContent,
        filePath,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取最近的提交记录
 */
router.get('/log', async (req, res) => {
  try {
    const { projectPath, limit = 10 } = req.query;

    if (!projectPath) {
      return res.status(400).json({ success: false, error: '项目路径不能为空' });
    }

    const result = await runGitCommand(
      projectPath,
      `log -${limit} --pretty=format:"%H|%h|%s|%an|%ae|%at"`
    );

    if (!result.success) {
      return res.status(500).json({ success: false, error: result.error });
    }

    const commits = result.output
      .split('\n')
      .filter(line => line.trim())
      .map(line => {
        const [hash, shortHash, message, author, email, timestamp] = line.split('|');
        return {
          hash,
          shortHash,
          message,
          author,
          email,
          timestamp: parseInt(timestamp) * 1000,
        };
      });

    res.json({ success: true, data: commits });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
