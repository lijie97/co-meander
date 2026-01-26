# Co-Meander

手机端 Cursor CLI Web 应用，让你可以在手机浏览器上使用 Cursor CLI 进行 Vibe Coding。

## 功能特性

- 📱 移动端优化的用户界面
- 🎯 项目管理（创建、列表、删除）
- 📝 会话管理（多个 Cursor CLI 历史记录）
- 💻 实时终端交互
- 🔄 WSL 集成（Windows 环境下运行 Cursor CLI）
- 💾 SQLite 数据持久化

## 技术栈

### 后端
- Express.js - Web 服务器
- Better-SQLite3 - 高性能 SQLite 数据库
- node-pty - 伪终端
- ws - WebSocket

### 前端
- React 18 + Vite
- Ant Design Mobile
- xterm.js - 终端模拟器

## 快速开始

### 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 运行开发服务器

```bash
npm run dev
```

后端服务运行在 `http://localhost:3000`
前端服务运行在 `http://localhost:5173`

### 手机访问

在手机浏览器中访问 `http://<你的电脑IP>:5173`

## 项目结构

```
co-meander/
├── server/              # 后端代码
│   ├── index.js        # Express 入口
│   ├── db.js           # 数据库操作
│   ├── routes/         # API 路由
│   ├── terminal/       # 终端管理
│   └── utils/          # 工具函数
├── client/             # 前端代码
│   └── src/
│       ├── pages/      # 页面组件
│       ├── components/ # UI 组件
│       └── api/        # API 客户端
└── package.json
```

## 注意事项

- 需要在 Windows 系统上运行，并安装 WSL
- 需要在 WSL 中安装 Cursor CLI
- 仅适用于内网环境，无鉴权机制
