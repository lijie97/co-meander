import React, { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, Toast, Tabs } from 'antd-mobile';
import { Terminal as XTerm } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { sessionAPI, projectAPI, createTerminalWebSocket } from '../api/client';
import FileExplorer from '../components/FileExplorer';
import GitChanges from '../components/GitChanges';
import ChatHistory from '../components/ChatHistory';
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

    // 检测是否为移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // 初始化 xterm.js - 移动端优化配置
    const term = new XTerm({
      cursorBlink: true,
      fontSize: isMobile ? 13 : 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
      },
      rows: 30,
      cols: 80,
      scrollback: 5000, // 移动端适当减少历史以节省内存
      // 移动端关键配置
      allowTransparency: false, // 提升渲染性能
      drawBoldTextInBrightColors: true,
      scrollOnUserInput: true,
      // 允许浏览器接管滚动事件
      windowsMode: false,
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
      
      // 移动端: 处理虚拟键盘弹出导致的 viewport 变化
      let visualViewportHandler = null;
      if (isMobile && window.visualViewport) {
        visualViewportHandler = () => {
          // 软键盘弹出/收起时重新计算尺寸
          requestAnimationFrame(() => {
            if (activeTab === 'terminal' && fitAddonRef.current) {
              fitAddonRef.current.fit();
            }
          });
        };
        window.visualViewport.addEventListener('resize', visualViewportHandler);
      }
      
      // 初始大小调整
      setTimeout(() => handleResize(), 100);

      return () => {
        window.removeEventListener('resize', handleResize);
        if (visualViewportHandler && window.visualViewport) {
          window.visualViewport.removeEventListener('resize', visualViewportHandler);
        }
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
          <Tabs.Tab title="Chat" key="chat" />
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

        {/* 聊天历史视图 */}
        <div className={`chat-container ${activeTab === 'chat' ? 'active' : ''}`}>
          {project && <ChatHistory projectPath={project.path} />}
        </div>

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
