import React, { useState } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dialog, Toast } from 'antd-mobile';
import ProjectList from './pages/ProjectList';
import SessionList from './pages/SessionList';
import Terminal from './pages/Terminal';
import { systemAPI } from './api/client';

function App() {
  const [restarting, setRestarting] = useState(false);

  const handleRestart = async () => {
    const confirmed = await Dialog.confirm({
      content: '确定要重启服务吗？所有终端连接将断开。',
      confirmText: '重启',
      cancelText: '取消',
    });

    if (confirmed) {
      try {
        setRestarting(true);
        Toast.show({ icon: 'loading', content: '正在重启...', duration: 0 });
        await systemAPI.restart();
        
        // 等待服务重启后刷新页面
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      } catch (err) {
        // 服务已退出，连接断开是正常的
        setTimeout(() => {
          window.location.reload();
        }, 3000);
      }
    }
  };

  return (
    <BrowserRouter>
      {/* 全局重启按钮 */}
      <button
        className="restart-btn"
        onClick={handleRestart}
        disabled={restarting}
        title="重启服务"
      >
        {restarting ? '...' : '⟳'}
      </button>

      <Routes>
        <Route path="/" element={<ProjectList />} />
        <Route path="/project/:id" element={<SessionList />} />
        <Route path="/session/:id" element={<Terminal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
