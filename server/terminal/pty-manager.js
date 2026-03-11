import pty from 'node-pty';
import { toWSLPath } from '../utils/path.js';

// 存储活动的 PTY 实例
const activePTYs = new Map();

/**
 * 创建一个新的 PTY 实例
 */
export function createPTY(sessionId, projectPath) {
  // 如果已存在，先清理
  if (activePTYs.has(sessionId)) {
    destroyPTY(sessionId);
  }

  const normalizedProjectPath = String(projectPath || '')
    .replace('/~/', '/')
    .replace(/^~\//, `${process.env.HOME || ''}/`);

  const wslPath = toWSLPath(normalizedProjectPath);

  const shell = process.platform === 'win32' ? 'wsl.exe' : (process.env.SHELL || 'bash');
  const shellArgs = process.platform === 'win32' ? ['bash', '-l'] : ['-l'];

  // 创建 PTY 进程
  const ptyProcess = pty.spawn(shell, shellArgs, {
    name: 'xterm-color',
    cols: 80,
    rows: 30,
    cwd: normalizedProjectPath,
    env: process.env
  });

  // 存储实例
  activePTYs.set(sessionId, ptyProcess);

  // 等待 shell 初始化后，切换到项目目录并启动 agent
  setTimeout(() => {
    const targetPath = process.platform === 'win32' ? wslPath : normalizedProjectPath;
    ptyProcess.write(`cd "${targetPath}"\r`);
    setTimeout(() => {
      ptyProcess.write('agent resume\r');
    }, 500);
  }, 1000);

  return ptyProcess;
}

/**
 * 获取现有的 PTY 实例
 */
export function getPTY(sessionId) {
  return activePTYs.get(sessionId);
}

/**
 * 销毁 PTY 实例
 */
export function destroyPTY(sessionId) {
  const ptyProcess = activePTYs.get(sessionId);
  if (ptyProcess) {
    try {
      ptyProcess.kill();
    } catch (err) {
      console.error('销毁 PTY 失败:', err);
    }
    activePTYs.delete(sessionId);
  }
}

/**
 * 调整 PTY 大小
 */
export function resizePTY(sessionId, cols, rows) {
  const ptyProcess = activePTYs.get(sessionId);
  if (ptyProcess) {
    ptyProcess.resize(cols, rows);
  }
}

/**
 * 获取所有活动的 PTY 会话
 */
export function getActiveSessions() {
  return Array.from(activePTYs.keys());
}
