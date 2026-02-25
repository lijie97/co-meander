import React, { useState, useEffect, useRef } from 'react';
import { SpinLoading, Toast, Selector } from 'antd-mobile';
import { chatAPI } from '../api/client';
import './ChatHistory.css';

// 简单的 Markdown 渲染（处理代码块和基本格式）
function renderContent(content) {
  // 移除 XML 标签如 <user_query>, <function_calls> 等
  let text = content.replace(/<[^>]+>/g, '');
  
  // 处理代码块
  const parts = text.split(/(```[\s\S]*?```)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('```')) {
      // 代码块
      const match = part.match(/```(\w*)\n?([\s\S]*?)```/);
      if (match) {
        const [, lang, code] = match;
        return (
          <pre key={index} className="chat-code-block">
            {lang && <div className="code-lang">{lang}</div>}
            <code>{code.trim()}</code>
          </pre>
        );
      }
    }
    // 普通文本，处理换行
    return (
      <span key={index}>
        {part.split('\n').map((line, i) => (
          <React.Fragment key={i}>
            {line}
            {i < part.split('\n').length - 1 && <br />}
          </React.Fragment>
        ))}
      </span>
    );
  });
}

// 截断长内容
function truncateContent(content, maxLength = 500) {
  if (content.length <= maxLength) return content;
  return content.slice(0, maxLength) + '...';
}

function ChatHistory({ projectPath }) {
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [selectedSession, setSelectedSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [availableHashes, setAvailableHashes] = useState([]);
  const [selectedHash, setSelectedHash] = useState(null);
  const [expandedMessages, setExpandedMessages] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    loadSessions();
  }, [projectPath]);

  useEffect(() => {
    if (selectedSession) {
      loadMessages(selectedSession);
    }
  }, [selectedSession]);

  useEffect(() => {
    // 滚动到底部
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const loadSessions = async () => {
    try {
      setLoading(true);
      const result = await chatAPI.getSessions(projectPath);
      
      if (result.length > 0) {
        setSessions(result);
        setSelectedSession(result[result.length - 1]); // 选择最新的
      } else if (result.availableHashes) {
        setAvailableHashes(result.availableHashes);
      }
    } catch (err) {
      console.error('加载会话失败:', err);
      // 尝试直接获取可用的哈希目录
      tryLoadByHash();
    } finally {
      setLoading(false);
    }
  };

  const tryLoadByHash = async () => {
    // 硬编码一个已知的哈希用于测试
    const knownHash = 'f8e7db90d8eae6b088648dffb04c16aa';
    try {
      const result = await chatAPI.getHistoryByHash(knownHash);
      if (result.length > 0) {
        setMessages(result);
        setSelectedHash(knownHash);
      }
    } catch (err) {
      console.error('通过哈希加载失败:', err);
    }
  };

  const loadMessages = async (session) => {
    try {
      setLoading(true);
      const result = await chatAPI.getHistory(session.path);
      setMessages(result);
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载消息失败' });
    } finally {
      setLoading(false);
    }
  };

  const loadByHash = async (hash) => {
    try {
      setLoading(true);
      setSelectedHash(hash);
      const result = await chatAPI.getHistoryByHash(hash);
      setMessages(result);
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载消息失败' });
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedMessages(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  if (loading && messages.length === 0) {
    return (
      <div className="chat-loading">
        <SpinLoading style={{ '--size': '32px' }} />
        <p>加载聊天记录...</p>
      </div>
    );
  }

  return (
    <div className="chat-history">
      {/* 会话选择器 */}
      {availableHashes.length > 0 && !selectedHash && (
        <div className="chat-selector">
          <p>选择项目:</p>
          <Selector
            options={availableHashes.map(h => ({ label: h.slice(0, 8) + '...', value: h }))}
            onChange={(v) => v[0] && loadByHash(v[0])}
          />
        </div>
      )}

      {/* 消息列表 */}
      <div className="chat-messages" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="chat-empty">
            <p>暂无聊天记录</p>
            {availableHashes.length > 0 && (
              <p className="chat-hint">请选择一个项目目录</p>
            )}
          </div>
        ) : (
          messages.map((msg) => {
            const isExpanded = expandedMessages[msg.id];
            const isLong = msg.content.length > 500;
            const displayContent = isExpanded ? msg.content : truncateContent(msg.content);
            
            return (
              <div
                key={msg.id}
                className={`chat-message chat-${msg.role}`}
                onClick={() => isLong && toggleExpand(msg.id)}
              >
                <div className="chat-role">
                  {msg.role === 'user' ? '👤 User' : '🤖 Assistant'}
                </div>
                <div className="chat-content">
                  {renderContent(displayContent)}
                </div>
                {isLong && (
                  <div className="chat-expand">
                    {isExpanded ? '收起' : '展开更多...'}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default ChatHistory;
