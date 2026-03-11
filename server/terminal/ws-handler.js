import { WebSocketServer } from 'ws';
import { createPTY, getPTY, destroyPTY, resizePTY } from './pty-manager.js';
import { run } from '../db.js';

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/terminal' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const projectPath = url.searchParams.get('projectPath');

    if (!sessionId || !projectPath) {
      ws.close(1008, '缺少 sessionId 或 projectPath');
      return;
    }

    console.log(`WebSocket 连接建立: session ${sessionId}`);

    // 获取或创建 PTY
    let ptyProcess = getPTY(sessionId);
    if (!ptyProcess) {
      try {
        ptyProcess = createPTY(sessionId, decodeURIComponent(projectPath));
      } catch (err) {
        console.error('创建 PTY 失败:', err);
        ws.send(JSON.stringify({ type: 'error', message: `终端创建失败: ${err.message}` }));
        ws.close(1011, 'PTY create failed');
        return;
      }
    }

    // 监听 PTY 输出
    const onData = (data) => {
      if (ws.readyState === ws.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data }));
        
        // 保存到历史记录
        run('INSERT INTO history (session_id, output) VALUES (?, ?)', [sessionId, data])
          .catch(err => console.error('保存历史失败:', err));
      }
    };

    ptyProcess.onData(onData);

    // 监听 PTY 退出
    const onExit = ({ exitCode, signal }) => {
      console.log(`PTY 退出: session ${sessionId}, code ${exitCode}, signal ${signal}`);
      ws.send(JSON.stringify({ type: 'exit', exitCode, signal }));
      ws.close();
    };

    ptyProcess.onExit(onExit);

    // 监听客户端消息
    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);
        
        switch (msg.type) {
          case 'input':
            // 写入用户输入
            ptyProcess.write(msg.data);
            
            // 保存到历史记录
            await run('INSERT INTO history (session_id, input) VALUES (?, ?)', [sessionId, msg.data]);
            
            // 更新会话活跃时间
            await run('UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
            break;
            
          case 'resize':
            // 调整终端大小
            resizePTY(sessionId, msg.cols, msg.rows);
            break;
            
          default:
            console.warn('未知消息类型:', msg.type);
        }
      } catch (err) {
        console.error('处理消息失败:', err);
      }
    });

    // 客户端断开连接
    ws.on('close', () => {
      console.log(`WebSocket 断开: session ${sessionId}`);
      if (ptyProcess) {
        ptyProcess.removeListener('data', onData);
        ptyProcess.removeListener('exit', onExit);
      }
      
      // 注意：不要销毁 PTY，以便其他客户端可以重新连接
      // 可以设置一个超时来清理长时间不活动的 PTY
    });

    ws.on('error', (err) => {
      console.error('WebSocket 错误:', err);
    });
  });

  return wss;
}
