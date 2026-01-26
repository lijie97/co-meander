import React from 'react';
import { Card, Button, Tag } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';
import './SessionCard.css';

function SessionCard({ session, onDelete, onClick }) {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(session.id);
  };

  const statusColor = session.status === 'active' ? 'success' : 'default';

  return (
    <Card className="session-card" onClick={onClick}>
      <div className="session-card-content">
        <div className="session-info">
          <div className="session-header">
            <h3 className="session-name">{session.name}</h3>
            <Tag color={statusColor} className="session-status">
              {session.status === 'active' ? '活跃' : '已关闭'}
            </Tag>
          </div>
          <p className="session-time">
            最后活跃: {new Date(session.last_active_at).toLocaleString('zh-CN')}
          </p>
        </div>
        <div className="session-actions">
          <Button
            color="danger"
            fill="none"
            size="small"
            onClick={handleDelete}
          >
            删除
          </Button>
          <RightOutline fontSize={20} />
        </div>
      </div>
    </Card>
  );
}

export default SessionCard;
