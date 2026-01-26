import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Dialog, Form, Input, Toast, SpinLoading } from 'antd-mobile';
import { AddOutline } from 'antd-mobile-icons';
import ProjectCard from '../components/ProjectCard';
import { projectAPI } from '../api/client';
import './ProjectList.css';

function ProjectList() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  const loadProjects = async () => {
    try {
      setLoading(true);
      const data = await projectAPI.getAll();
      setProjects(data);
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载项目失败: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (values) => {
    try {
      await projectAPI.create(values);
      Toast.show({ icon: 'success', content: '项目创建成功' });
      setShowDialog(false);
      loadProjects();
    } catch (err) {
      Toast.show({ icon: 'fail', content: '创建项目失败: ' + err.message });
    }
  };

  const handleImportProject = async (values) => {
    try {
      await projectAPI.import(values);
      Toast.show({ icon: 'success', content: '项目导入成功' });
      setShowImportDialog(false);
      loadProjects();
    } catch (err) {
      Toast.show({ icon: 'fail', content: '导入项目失败: ' + err.message });
    }
  };

  const handleDeleteProject = async (id) => {
    const result = await Dialog.confirm({
      content: '确定要删除这个项目吗？',
      confirmText: '删除',
      cancelText: '取消',
    });

    if (result) {
      try {
        await projectAPI.delete(id);
        Toast.show({ icon: 'success', content: '项目已删除' });
        loadProjects();
      } catch (err) {
        Toast.show({ icon: 'fail', content: '删除失败: ' + err.message });
      }
    }
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1>项目列表</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            color="primary"
            size="small"
            onClick={() => setShowDialog(true)}
          >
            <AddOutline /> 新建项目
          </Button>
          <Button
            color="default"
            size="small"
            onClick={() => setShowImportDialog(true)}
          >
            导入项目
          </Button>
        </div>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-container">
            <SpinLoading style={{ '--size': '48px' }} />
          </div>
        ) : projects.length === 0 ? (
          <div className="empty-state">
            <p>还没有项目</p>
            <Button color="primary" onClick={() => setShowDialog(true)}>
              创建第一个项目
            </Button>
          </div>
        ) : (
          projects.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              onDelete={handleDeleteProject}
              onClick={() => navigate(`/project/${project.id}`)}
            />
          ))
        )}
      </div>

      <Dialog
        visible={showDialog}
        title="创建新项目"
        content={
          <Form
            onFinish={handleCreateProject}
            footer={
              <>
                <Button block onClick={() => setShowDialog(false)}>
                  取消
                </Button>
                <Button block type="submit" color="primary">
                  创建
                </Button>
              </>
            }
          >
            <Form.Item
              name="name"
              label="项目名称"
              rules={[{ required: true, message: '请输入项目名称' }]}
              help="项目将自动创建在 ~ 目录下"
            >
              <Input placeholder="如: my-project" />
            </Form.Item>
          </Form>
        }
        onClose={() => setShowDialog(false)}
      />

      <Dialog
        visible={showImportDialog}
        title="导入现有项目"
        content={
          <Form
            onFinish={handleImportProject}
            footer={
              <>
                <Button block onClick={() => setShowImportDialog(false)}>
                  取消
                </Button>
                <Button block type="submit" color="primary">
                  导入
                </Button>
              </>
            }
          >
            <Form.Item
              name="path"
              label="项目路径"
              rules={[{ required: true, message: '请输入项目路径' }]}
              help="输入项目的完整路径，如: C:\Users\username\my-project"
            >
              <Input placeholder="如: C:\Users\username\my-project" />
            </Form.Item>
          </Form>
        }
        onClose={() => setShowImportDialog(false)}
      />
    </div>
  );
}

export default ProjectList;
