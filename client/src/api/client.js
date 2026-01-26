const API_BASE = '/api';

/**
 * 通用请求函数
 */
async function request(url, options = {}) {
  const response = await fetch(`${API_BASE}${url}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  });

  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error || '请求失败');
  }

  return data.data;
}

// 项目相关 API
export const projectAPI = {
  // 获取所有项目
  getAll: () => request('/projects'),

  // 获取单个项目
  getById: (id) => request(`/projects/${id}`),

  // 创建项目
  create: (data) => request('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 导入项目
  import: (data) => request('/projects/import', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 删除项目
  delete: (id) => request(`/projects/${id}`, {
    method: 'DELETE',
  }),
};

// 会话相关 API
export const sessionAPI = {
  // 获取项目的所有会话
  getByProject: (projectId) => request(`/sessions/project/${projectId}`),

  // 获取会话详情
  getById: (id) => request(`/sessions/${id}`),

  // 创建会话
  create: (data) => request('/sessions', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  // 更新会话状态
  updateStatus: (id, status) => request(`/sessions/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  }),

  // 获取会话历史
  getHistory: (id) => request(`/sessions/${id}/history`),

  // 删除会话
  delete: (id) => request(`/sessions/${id}`, {
    method: 'DELETE',
  }),
};

// 文件相关 API
export const fileAPI = {
  // 获取文件树
  getTree: (projectPath) => request(`/files/tree?projectPath=${encodeURIComponent(projectPath)}`),

  // 获取文件内容
  getContent: (projectPath, filePath) =>
    request(`/files/content?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(filePath)}`),
};

// Git 相关 API
export const gitAPI = {
  // 检查是否是 git 仓库
  check: (projectPath) => request(`/git/check?projectPath=${encodeURIComponent(projectPath)}`),

  // 获取变更文件列表
  getStatus: (projectPath) => request(`/git/status?projectPath=${encodeURIComponent(projectPath)}`),

  // 获取文件 diff
  getDiff: (projectPath, filePath, staged = false) =>
    request(`/git/diff?projectPath=${encodeURIComponent(projectPath)}&filePath=${encodeURIComponent(filePath)}&staged=${staged}`),

  // 获取提交记录
  getLog: (projectPath, limit = 10) =>
    request(`/git/log?projectPath=${encodeURIComponent(projectPath)}&limit=${limit}`),
};

// 系统 API
export const systemAPI = {
  // 重启服务
  restart: () => request('/restart', { method: 'POST' }),
};

// WebSocket 连接
export function createTerminalWebSocket(sessionId, projectPath) {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const host = window.location.hostname;
  const port = import.meta.env.VITE_SERVER_PORT || 3000; // 后端端口
  
  const ws = new WebSocket(
    `${protocol}//${host}:${port}/terminal?sessionId=${sessionId}&projectPath=${encodeURIComponent(projectPath)}`
  );

  return ws;
}
