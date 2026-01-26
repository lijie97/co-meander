import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, Toast, Tabs } from 'antd-mobile';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { sessionAPI, projectAPI, createTerminalWebSocket } from '../api/client';
import FileExplorer from '../components/FileExplorer';
import GitChanges from '../components/GitChanges';
import 'xterm/css/xterm.css';
import './Terminal.css';

function Terminal() {
  const { id: sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('terminal');
  const terminalRef = useRef(null);
  const xtermRef = useRef(null);
  const wsRef = useRef(null);
  const fitAddonRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (!project) return;

    // 初始化 xterm.js
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      rows: 30,
      cols: 80,
      scrollback: 10000,
    });

    const fitAddon = new FitAddon();
    term.loadAddon(fitAddon);

    if (terminalRef.current) {
      term.open(terminalRef.current);
      fitAddon.fit();
      fitAddonRef.current = fitAddon;
      xtermRef.current = term;

      // 连接 WebSocket
      connectWebSocket(term);

      // 监听窗口大小变化
      const handleResize = () => {
        if (activeTab === 'terminal') {
          fitAddon.fit();
          if (wsRef.current?.readyState === WebSocket.OPEN) {
            wsRef.current.send(JSON.stringify({
              type: 'resize',
              cols: term.cols,
              rows: term.rows,
            }));
          }
        }
      };

      window.addEventListener('resize', handleResize);
      
      // 初始大小调整
      setTimeout(() => handleResize(), 100);

      return () => {
        window.removeEventListener('resize', handleResize);
        term.dispose();
        if (wsRef.current) {
          wsRef.current.close();
        }
      };
    }
  }, [project]);

  // 当切换到终端 tab 时，重新 fit
  useEffect(() => {
    if (activeTab === 'terminal' && fitAddonRef.current) {
      setTimeout(() => {
        fitAddonRef.current.fit();
      }, 100);
    }
  }, [activeTab]);

  const loadData = async () => {
    try {
      const sessionData = await sessionAPI.getById(sessionId);
      setSession(sessionData);
      
      const projectData = await projectAPI.getById(sessionData.project_id);
      setProject(projectData);
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载会话失败: ' + err.message });
      navigate('/');
    }
  };

  const connectWebSocket = (term) => {
    const ws = createTerminalWebSocket(sessionId, project.path);
    wsRef.current = ws;

    ws.onopen = () => {
      console.log('WebSocket 已连接');
      Toast.show({ icon: 'success', content: '终端已连接' });
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        
        switch (msg.type) {
          case 'output':
            term.write(msg.data);
            break;
          case 'exit':
            Toast.show({ icon: 'fail', content: '终端已退出' });
            break;
        }
      } catch (err) {
        console.error('处理消息失败:', err);
      }
    };

    ws.onerror = (err) => {
      console.error('WebSocket 错误:', err);
      Toast.show({ icon: 'fail', content: '连接错误' });
    };

    ws.onclose = () => {
      console.log('WebSocket 已断开');
      Toast.show({ icon: 'fail', content: '连接已断开' });
    };

    // 监听终端输入
    term.onData((data) => {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });
  };

  const handleBack = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    navigate(`/project/${session?.project_id}`);
  };

  return (
    <div className="terminal-page">
      <NavBar onBack={handleBack}>
        {session?.name || '终端'}
      </NavBar>
      
      <div className="session-tabs">
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          className="session-tabs-bar"
        >
          <Tabs.Tab title="终端" key="terminal" />
          <Tabs.Tab title="代码" key="code" />
          <Tabs.Tab title="Git" key="git" />
        </Tabs>
      </div>

      <div className="session-content">
        {/* 终端视图 */}
        <div
          ref={terminalRef}
          className={`terminal-container ${activeTab === 'terminal' ? 'active' : ''}`}
        />

        {/* 代码浏览视图 */}
        <div className={`code-container ${activeTab === 'code' ? 'active' : ''}`}>
          {project && <FileExplorer projectPath={project.path} />}
        </div>

        {/* Git 变更视图 */}
        <div className={`git-container ${activeTab === 'git' ? 'active' : ''}`}>
          {project && <GitChanges projectPath={project.path} />}
        </div>
      </div>
    </div>
  );
}

export default Terminal;
