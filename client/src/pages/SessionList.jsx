import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Dialog, Form, Input, Toast, SpinLoading, NavBar } from 'antd-mobile';
import { AddOutline } from 'antd-mobile-icons';
import SessionCard from '../components/SessionCard';
import { projectAPI, sessionAPI } from '../api/client';
import './SessionList.css';

function SessionList() {
  const { id: projectId } = useParams();
  const [project, setProject] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadData();
  }, [projectId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectData, sessionsData] = await Promise.all([
        projectAPI.getById(projectId),
        sessionAPI.getByProject(projectId),
      ]);
      setProject(projectData);
      setSessions(sessionsData);
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载数据失败: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = async (values) => {
    try {
      await sessionAPI.create({
        projectId: parseInt(projectId),
        name: values.name,
      });
      Toast.show({ icon: 'success', content: '会话创建成功' });
      setShowDialog(false);
      loadData();
    } catch (err) {
      Toast.show({ icon: 'fail', content: '创建会话失败: ' + err.message });
    }
  };

  const handleDeleteSession = async (id) => {
    const result = await Dialog.confirm({
      content: '确定要删除这个会话吗？',
      confirmText: '删除',
      cancelText: '取消',
    });

    if (result) {
      try {
        await sessionAPI.delete(id);
        Toast.show({ icon: 'success', content: '会话已删除' });
        loadData();
      } catch (err) {
        Toast.show({ icon: 'fail', content: '删除失败: ' + err.message });
      }
    }
  };

  return (
    <div className="page">
      <NavBar onBack={() => navigate('/')}>
        {project?.name || '项目会话'}
      </NavBar>

      <div className="page-header">
        <div className="project-details">
          <h2>{project?.name}</h2>
          <p>{project?.path}</p>
        </div>
        <Button
          color="primary"
          size="small"
          onClick={() => setShowDialog(true)}
        >
          <AddOutline /> 新建会话
        </Button>
      </div>

      <div className="page-content">
        {loading ? (
          <div className="loading-container">
            <SpinLoading style={{ '--size': '48px' }} />
          </div>
        ) : sessions.length === 0 ? (
          <div className="empty-state">
            <p>还没有会话</p>
            <Button color="primary" onClick={() => setShowDialog(true)}>
              创建第一个会话
            </Button>
          </div>
        ) : (
          sessions.map((session) => (
            <SessionCard
              key={session.id}
              session={session}
              onDelete={handleDeleteSession}
              onClick={() => navigate(`/session/${session.id}`)}
            />
          ))
        )}
      </div>

      <Dialog
        visible={showDialog}
        title="创建新会话"
        content={
          <Form
            onFinish={handleCreateSession}
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
              label="会话名称"
              rules={[{ required: true, message: '请输入会话名称' }]}
            >
              <Input placeholder="如: Feature A 或 Bug Fix B" />
            </Form.Item>
          </Form>
        }
        onClose={() => setShowDialog(false)}
      />
    </div>
  );
}

export default SessionList;
