import React from 'react';
import { Card, Button } from 'antd-mobile';
import { RightOutline } from 'antd-mobile-icons';
import './ProjectCard.css';

function ProjectCard({ project, onDelete, onClick }) {
  const handleDelete = (e) => {
    e.stopPropagation();
    onDelete(project.id);
  };

  return (
    <Card className="project-card" onClick={onClick}>
      <div className="project-card-content">
        <div className="project-info">
          <h3 className="project-name">{project.name}</h3>
          <p className="project-path">{project.path}</p>
          <p className="project-time">
            创建于 {new Date(project.created_at).toLocaleDateString('zh-CN')}
          </p>
        </div>
        <div className="project-actions">
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

export default ProjectCard;
