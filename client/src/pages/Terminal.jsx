import React, { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { NavBar, Toast, Tabs } from 'antd-mobile';
import AnsiToHtml from 'ansi-to-html';
import { sessionAPI, projectAPI, createTerminalWebSocket } from '../api/client';
import FileExplorer from '../components/FileExplorer';
import GitChanges from '../components/GitChanges';
import './Terminal.css';

// ANSI 转 HTML 转换器
const ansiConverter = new AnsiToHtml({
  fg: '#d4d4d4',
  bg: '#1e1e1e',
  newline: true,
  escapeXML: true,
  colors: {
    0: '#1e1e1e',
    1: '#f44747',
    2: '#6a9955',
    3: '#dcdcaa',
    4: '#569cd6',
    5: '#c586c0',
    6: '#4ec9b0',
    7: '#d4d4d4',
    8: '#808080',
    9: '#f44747',
    10: '#6a9955',
    11: '#dcdcaa',
    12: '#569cd6',
    13: '#c586c0',
    14: '#4ec9b0',
    15: '#ffffff',
  },
});

function Terminal() {
  const { id: sessionId } = useParams();
  const [session, setSession] = useState(null);
  const [project, setProject] = useState(null);
  const [activeTab, setActiveTab] = useState('terminal');
  const [outputLines, setOutputLines] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const outputRef = useRef(null);
  const inputRef = useRef(null);
  const wsRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [sessionId]);

  useEffect(() => {
    if (!project) return;
    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [project]);

  // 自动滚动到底部
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [outputLines]);

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

  const connectWebSocket = () => {
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
            appendOutput(msg.data);
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
  };

  // 追加输出内容
  const appendOutput = useCallback((data) => {
    // 转换 ANSI 到 HTML
    const html = ansiConverter.toHtml(data);
    setOutputLines((prev) => [...prev, html]);
  }, []);

  // 发送输入
  const sendInput = (data) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'input', data }));
    }
  };

  // 处理键盘输入
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      sendInput(inputValue + '\r');
      setInputValue('');
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      sendInput('\x1b[A'); // 上箭头
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      sendInput('\x1b[B'); // 下箭头
    } else if (e.key === 'Tab') {
      e.preventDefault();
      sendInput('\t'); // Tab 补全
    } else if (e.key === 'c' && e.ctrlKey) {
      e.preventDefault();
      sendInput('\x03'); // Ctrl+C
    }
  };

  // 点击输出区域时聚焦输入框
  const handleOutputClick = () => {
    inputRef.current?.focus();
  };

  const handleBack = () => {
    if (wsRef.current) {
      wsRef.current.close();
    }
    navigate(`/project/${session?.project_id}`);
  };

  return (
    <div className="terminal-page">
      <NavBar onBack={handleBack}>{session?.name || '终端'}</NavBar>

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
        {/* 终端视图 - 自定义渲染 */}
        <div
          className={`terminal-container ${activeTab === 'terminal' ? 'active' : ''}`}
          onClick={handleOutputClick}
        >
          <div className="terminal-output" ref={outputRef}>
            {outputLines.map((line, index) => (
              <div
                key={index}
                className="terminal-line"
                dangerouslySetInnerHTML={{ __html: line }}
              />
            ))}
          </div>
          <div className="terminal-input-row">
            <input
              ref={inputRef}
              type="text"
              className="terminal-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="输入命令..."
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
            />
          </div>
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
