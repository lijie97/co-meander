import pty from 'node-pty';
import { spawn } from 'child_process';
import { toWSLPath } from '../utils/path.js';
import { existsSync, chmodSync, readdirSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { createRequire } from 'module';

const activePTYs = new Map();

function ensureSpawnHelperExecutable() {
  try {
    const require_ = createRequire(import.meta.url);
    const ptyDir = dirname(require_.resolve('node-pty'));
    const prebuildsBase = join(ptyDir, '..', 'prebuilds');
    if (!existsSync(prebuildsBase)) return;

    for (const platform of readdirSync(prebuildsBase)) {
      const helper = join(prebuildsBase, platform, 'spawn-helper');
      if (existsSync(helper)) {
        chmodSync(helper, 0o755);
      }
    }
  } catch (err) {
    console.warn('ensureSpawnHelperExecutable:', err.message);
  }
}

ensureSpawnHelperExecutable();

function normalizeProjectPath(projectPath) {
  let p = String(projectPath || '').trim();

  if (p === '~' || p.startsWith('~/')) {
    p = (process.env.HOME || '/tmp') + p.slice(1);
  }

  p = resolve(p || process.env.HOME || '/tmp');

  return p;
}

function safeCwd(targetPath) {
  if (targetPath && existsSync(targetPath)) return targetPath;
  const home = process.env.HOME || '/tmp';
  if (existsSync(home)) return home;
  return '/tmp';
}

function createSpawnFallback(cwd) {
  const shell = process.env.SHELL || (process.platform === 'darwin' ? '/bin/zsh' : '/bin/sh');
  const child = spawn(shell, ['-l'], {
    cwd: safeCwd(cwd),
    env: process.env,
    stdio: 'pipe',
  });

  const dataListeners = new Set();
  const exitListeners = new Set();
  let exited = false;

  child.stdout?.on('data', (d) => {
    const text = d.toString();
    dataListeners.forEach((fn) => fn(text));
  });
  child.stderr?.on('data', (d) => {
    const text = d.toString();
    dataListeners.forEach((fn) => fn(text));
  });
  child.on('exit', (code, signal) => {
    exited = true;
    exitListeners.forEach((fn) => fn({ exitCode: code, signal }));
  });
  child.on('error', (err) => {
    console.error('spawn fallback child error:', err.message);
    if (!exited) {
      exited = true;
      exitListeners.forEach((fn) => fn({ exitCode: 1, signal: null }));
    }
  });

  return {
    write: (data) => { if (!exited) child.stdin?.write(data); },
    kill: () => { try { child.kill(); } catch {} },
    resize: () => {},
    onData: (fn) => { dataListeners.add(fn); return { dispose: () => dataListeners.delete(fn) }; },
    onExit: (fn) => { exitListeners.add(fn); return { dispose: () => exitListeners.delete(fn) }; },
  };
}

export function createPTY(sessionId, projectPath) {
  if (activePTYs.has(sessionId)) destroyPTY(sessionId);

  const normalizedProjectPath = normalizeProjectPath(projectPath);
  const cwd = safeCwd(normalizedProjectPath);
  const wslPath = toWSLPath(normalizedProjectPath);

  let ptyProcess;
  try {
    const shell = process.platform === 'win32'
      ? 'wsl.exe'
      : (process.env.SHELL || '/bin/zsh');
    const shellArgs = process.platform === 'win32' ? ['bash', '-l'] : ['-l'];

    ptyProcess = pty.spawn(shell, shellArgs, {
      name: 'xterm-color',
      cols: 80,
      rows: 30,
      cwd,
      env: process.env,
    });

    if (cwd !== normalizedProjectPath) {
      const targetPath = process.platform === 'win32' ? wslPath : normalizedProjectPath;
      setTimeout(() => ptyProcess.write(`cd "${targetPath}"\r`), 500);
    }
  } catch (err) {
    console.warn('node-pty spawn failed, falling back to child_process:', err?.message || err);
    ptyProcess = createSpawnFallback(cwd);
  }

  activePTYs.set(sessionId, ptyProcess);
  return ptyProcess;
}

export function getPTY(sessionId) {
  return activePTYs.get(sessionId);
}

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

export function resizePTY(sessionId, cols, rows) {
  const ptyProcess = activePTYs.get(sessionId);
  if (ptyProcess && typeof ptyProcess.resize === 'function') {
    ptyProcess.resize(cols, rows);
  }
}

export function getActiveSessions() {
  return Array.from(activePTYs.keys());
}
