import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { initDB } from './db.js';
import { setupWebSocket } from './terminal/ws-handler.js';
import projectsRouter from './routes/projects.js';
import sessionsRouter from './routes/sessions.js';
import filesRouter from './routes/files.js';
import gitRouter from './routes/git.js';
import chatRouter from './routes/chat.js';

const app = express();
const PORT = process.env.PORT || 3000;

// 中间件
app.use(cors());
app.use(express.json());

// API 路由
app.use('/api/projects', projectsRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/files', filesRouter);
app.use('/api/git', gitRouter);
app.use('/api/chat', chatRouter);

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Co-Meander Server is running' });
});

// 重启端点 - 让服务自己退出，由 monitor 重启
app.post('/api/restart', (req, res) => {
  console.log('🔄 收到重启请求，准备退出...');
  res.json({ success: true, message: '服务即将重启' });
  
  // 延迟退出，让响应先返回
  setTimeout(() => {
    console.log('👋 服务退出，等待 monitor 重启...');
    process.exit(0);
  }, 500);
});

// 创建 HTTP 服务器
const server = createServer(app);

// 设置 WebSocket
setupWebSocket(server);

// 初始化数据库并启动服务器
initDB()
  .then(() => {
    server.listen(PORT, () => {
      console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
      console.log(`📡 WebSocket 端点: ws://localhost:${PORT}/terminal`);
    });
  })
  .catch((err) => {
    console.error('数据库初始化失败:', err);
    process.exit(1);
  });

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到 SIGTERM 信号，正在关闭服务器...');
  server.close(() => {
    console.log('服务器已关闭');
    process.exit(0);
  });
});
