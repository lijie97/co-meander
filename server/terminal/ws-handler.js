import { WebSocketServer } from 'ws';
import { createPTY, getPTY, destroyPTY, resizePTY } from './pty-manager.js';
import { run } from '../db.js';

function safeSend(ws, payload) {
  if (ws.readyState === ws.OPEN) {
    try { ws.send(typeof payload === 'string' ? payload : JSON.stringify(payload)); }
    catch (err) { console.error('ws.send error:', err.message); }
  }
}

export function setupWebSocket(server) {
  const wss = new WebSocketServer({ server, path: '/terminal' });

  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const sessionId = url.searchParams.get('sessionId');
    const projectPath = url.searchParams.get('projectPath');

    if (!sessionId || !projectPath) {
      ws.close(1008, 'missing sessionId or projectPath');
      return;
    }

    console.log(`WS connected: session ${sessionId}`);

    let ptyProcess = getPTY(sessionId);
    if (!ptyProcess) {
      try {
        ptyProcess = createPTY(sessionId, decodeURIComponent(projectPath));
      } catch (err) {
        console.error('PTY creation failed:', err);
        safeSend(ws, { type: 'error', message: `terminal creation failed: ${err.message}` });
        ws.close(1011, 'PTY create failed');
        return;
      }
    }

    const disposables = [];

    const dataDisposable = ptyProcess.onData((data) => {
      safeSend(ws, { type: 'output', data });

      run('INSERT INTO history (session_id, output) VALUES (?, ?)', [sessionId, data])
        .catch(err => console.error('save history error:', err.message));
    });
    disposables.push(dataDisposable);

    const exitDisposable = ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`PTY exited: session ${sessionId}, code ${exitCode}, signal ${signal}`);
      safeSend(ws, { type: 'exit', exitCode, signal });
      if (ws.readyState === ws.OPEN || ws.readyState === ws.CONNECTING) {
        ws.close(1000, 'PTY exited');
      }
    });
    disposables.push(exitDisposable);

    ws.on('message', async (message) => {
      try {
        const msg = JSON.parse(message);

        switch (msg.type) {
          case 'input':
            ptyProcess.write(msg.data);
            await run('INSERT INTO history (session_id, input) VALUES (?, ?)', [sessionId, msg.data]);
            await run('UPDATE sessions SET last_active_at = CURRENT_TIMESTAMP WHERE id = ?', [sessionId]);
            break;

          case 'resize':
            resizePTY(sessionId, msg.cols, msg.rows);
            break;
        }
      } catch (err) {
        console.error('message handling error:', err.message);
      }
    });

    ws.on('close', () => {
      console.log(`WS disconnected: session ${sessionId}`);
      for (const d of disposables) {
        if (d && typeof d.dispose === 'function') d.dispose();
      }
    });

    ws.on('error', (err) => {
      console.error('WS error:', err.message);
    });
  });

  return wss;
}
