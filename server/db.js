import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'data.db');

// 打开数据库连接
const db = new Database(dbPath);
console.log('数据库连接成功');

// 启用外键约束
db.pragma('foreign_keys = ON');

// 初始化数据库表
export function initDB() {
  try {
    // 创建项目表
    db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        wsl_path TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // 创建会话表
    db.exec(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        project_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        status TEXT DEFAULT 'active',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        last_active_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
      )
    `);

    // 创建历史记录表
    db.exec(`
      CREATE TABLE IF NOT EXISTS history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER NOT NULL,
        input TEXT,
        output TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
      )
    `);

    console.log('数据库表初始化完成');
    return Promise.resolve();
  } catch (err) {
    console.error('数据库初始化失败:', err);
    return Promise.reject(err);
  }
}

// 执行 SQL 并返回结果（INSERT/UPDATE/DELETE）
export function run(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const info = stmt.run(params);
    return Promise.resolve({ 
      id: info.lastInsertRowid, 
      changes: info.changes 
    });
  } catch (err) {
    return Promise.reject(err);
  }
}

// 查询单条记录
export function get(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const row = stmt.get(params);
    return Promise.resolve(row);
  } catch (err) {
    return Promise.reject(err);
  }
}

// 查询多条记录
export function all(sql, params = []) {
  try {
    const stmt = db.prepare(sql);
    const rows = stmt.all(params);
    return Promise.resolve(rows);
  } catch (err) {
    return Promise.reject(err);
  }
}

export default db;
