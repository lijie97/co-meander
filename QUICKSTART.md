# Co-Meander 快速开始指南

## 环境要求

1. **Windows 系统**（需要 WSL）
2. **Node.js** 16+ 
3. **WSL** 已安装并配置
4. **Cursor CLI** 已在 WSL 中安装

## 安装步骤

### 1. 安装依赖

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 2. 启动开发服务器

```bash
# 同时启动后端和前端
npm run dev
```

或者分别启动：

```bash
# 终端 1: 启动后端
npm run server

# 终端 2: 启动前端
cd client
npm run dev
```

## 访问应用

### 电脑浏览器
- 前端: http://localhost:5173
- 后端: http://localhost:3000

### 手机浏览器
1. 确保手机和电脑在同一局域网
2. 获取电脑 IP 地址（如: 192.168.1.100）
3. 在手机浏览器访问: http://192.168.1.100:5173

### 获取电脑 IP 地址

Windows PowerShell:
```powershell
ipconfig
```

查找 "无线局域网适配器 WLAN" 或 "以太网适配器" 下的 IPv4 地址

## 使用流程

### 1. 创建项目
- 点击 "新建项目"
- 输入项目名称（如: my-app）
- 项目会自动创建在 `~\my-app` (用户主目录下)
- 系统会自动创建目录并初始化 git

### 2. 创建会话
- 点击项目卡片进入会话列表
- 点击 "新建会话"
- 输入会话名称（如: Feature A）

### 3. 开始 Vibe Coding
- 点击会话进入终端页面
- 系统会自动启动 Cursor CLI
- 开始与 AI 交互编程！

## 注意事项

### WSL 路径
- Windows 路径: `C:\Users\lijie\projects\demo`
- 对应 WSL 路径: `/mnt/c/Users/lijie/projects/demo`
- 系统会自动转换路径

### Cursor CLI
确保在 WSL 中已安装 Cursor CLI:

```bash
# 在 WSL 中检查
wsl
cursor --version
```

如未安装，请参考 Cursor 官方文档安装 CLI。

### 端口占用
如果端口被占用，可以修改：
- 后端端口: `server/index.js` 中的 `PORT` 变量
- 前端端口: `client/vite.config.js` 中的 `server.port`

### 防火墙
如果手机无法访问，请检查 Windows 防火墙设置，允许：
- Node.js (端口 3000)
- Vite (端口 5173)

## 数据存储

所有数据存储在 `data.db` SQLite 数据库文件中，包括：
- 项目信息
- 会话记录
- 终端历史

## 故障排查

### 后端无法启动
- 检查端口 3000 是否被占用
- 确认 node_modules 已安装
- 查看错误日志

### 前端无法连接后端
- 确认后端已启动
- 检查 `client/vite.config.js` 中的 proxy 配置

### 终端无法连接
- 确认 WSL 已安装并可以运行
- 检查项目路径是否正确
- 确认 Cursor CLI 在 WSL 中可用

### WebSocket 连接失败
- 确认后端服务正常运行
- 检查浏览器控制台错误信息
- 尝试刷新页面重新连接

## 开发建议

### 修改后端代码
修改 `server/` 目录下的代码后，需要重启后端服务。

### 修改前端代码
Vite 支持热更新，修改 `client/src/` 下的代码会自动刷新。

### 数据库结构
如需修改数据库结构，编辑 `server/db.js` 中的 `initDB` 函数。

## 生产部署

### 构建前端

```bash
cd client
npm run build
cd ..
```

生成的静态文件在 `client/dist/` 目录。

### 配置 Express 提供静态文件

在 `server/index.js` 中添加：

```javascript
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
app.use(express.static(join(__dirname, '../client/dist')));
```

### 启动生产服务器

```bash
npm run server
```

访问 http://localhost:3000 即可使用应用。
