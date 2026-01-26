import express from 'express';
import { run, get, all } from '../db.js';

const router = express.Router();

/**
 * 获取项目的所有会话
 */
router.get('/project/:projectId', async (req, res) => {
  try {
    const sessions = await all(
      'SELECT * FROM sessions WHERE project_id = ? ORDER BY last_active_at DESC',
      [req.params.projectId]
    );
    res.json({ success: true, data: sessions });
  } catch (err) {
    console.error('获取会话列表失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取会话详情
 */
router.get('/:id', async (req, res) => {
  try {
    const session = await get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    if (!session) {
      return res.status(404).json({ success: false, error: '会话不存在' });
    }
    res.json({ success: true, data: session });
  } catch (err) {
    console.error('获取会话失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 创建新会话
 */
router.post('/', async (req, res) => {
  try {
    const { projectId, name } = req.body;
    
    if (!projectId || !name) {
      return res.status(400).json({ success: false, error: '项目 ID 和会话名称不能为空' });
    }

    // 检查项目是否存在
    const project = await get('SELECT * FROM projects WHERE id = ?', [projectId]);
    if (!project) {
      return res.status(404).json({ success: false, error: '项目不存在' });
    }

    // 插入会话
    const result = await run(
      'INSERT INTO sessions (project_id, name, status) VALUES (?, ?, ?)',
      [projectId, name, 'active']
    );

    const session = await get('SELECT * FROM sessions WHERE id = ?', [result.id]);
    
    res.json({ success: true, data: session });
  } catch (err) {
    console.error('创建会话失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 更新会话状态
 */
router.patch('/:id', async (req, res) => {
  try {
    const { status } = req.body;
    
    if (!status) {
      return res.status(400).json({ success: false, error: '状态不能为空' });
    }

    const result = await run(
      'UPDATE sessions SET status = ?, last_active_at = CURRENT_TIMESTAMP WHERE id = ?',
      [status, req.params.id]
    );

    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '会话不存在' });
    }

    const session = await get('SELECT * FROM sessions WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: session });
  } catch (err) {
    console.error('更新会话失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 获取会话历史记录
 */
router.get('/:id/history', async (req, res) => {
  try {
    const history = await all(
      'SELECT * FROM history WHERE session_id = ? ORDER BY timestamp ASC',
      [req.params.id]
    );
    res.json({ success: true, data: history });
  } catch (err) {
    console.error('获取历史记录失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * 删除会话
 */
router.delete('/:id', async (req, res) => {
  try {
    const result = await run('DELETE FROM sessions WHERE id = ?', [req.params.id]);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: '会话不存在' });
    }
    
    res.json({ success: true, message: '会话已删除' });
  } catch (err) {
    console.error('删除会话失败:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
