/**
 * 进程监控器 - 当子进程退出时自动重启
 */
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const RESTART_DELAY = 1000; // 重启延迟 1 秒

let serverProcess = null;
let clientProcess = null;
let isShuttingDown = false;

function startServer() {
  console.log('🚀 启动后端服务...');
  
  serverProcess = spawn('node', ['server/index.js'], {
    cwd: __dirname,
    stdio: 'inherit',
    env: { ...process.env }
  });

  serverProcess.on('exit', (code, signal) => {
    console.log(`📦 后端退出 (code: ${code}, signal: ${signal})`);
    serverProcess = null;
    
    if (!isShuttingDown) {
      console.log(`⏳ ${RESTART_DELAY}ms 后重启后端...`);
      setTimeout(startServer, RESTART_DELAY);
    }
  });

  serverProcess.on('error', (err) => {
    console.error('❌ 后端启动失败:', err);
  });
}

function startClient() {
  console.log('🎨 启动前端服务...');
  
  clientProcess = spawn('npm', ['run', 'dev'], {
    cwd: join(__dirname, 'client'),
    stdio: 'inherit',
    shell: true,
    env: { ...process.env }
  });

  clientProcess.on('exit', (code, signal) => {
    console.log(`🎨 前端退出 (code: ${code}, signal: ${signal})`);
    clientProcess = null;
    
    if (!isShuttingDown) {
      console.log(`⏳ ${RESTART_DELAY}ms 后重启前端...`);
      setTimeout(startClient, RESTART_DELAY);
    }
  });

  clientProcess.on('error', (err) => {
    console.error('❌ 前端启动失败:', err);
  });
}

function shutdown() {
  isShuttingDown = true;
  console.log('\n🛑 Monitor 关闭中...');
  
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
  }
  if (clientProcess) {
    clientProcess.kill('SIGTERM');
  }
  
  setTimeout(() => {
    process.exit(0);
  }, 2000);
}

// 启动服务
console.log('👀 Co-Meander Monitor 启动');
console.log('   按 Ctrl+C 停止所有服务\n');

startServer();
startClient();

// 处理退出信号
process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
