import React, { useState, useEffect } from 'react';
import { NavBar, Toast, SpinLoading, Empty, Tag } from 'antd-mobile';
import ReactDiffViewer, { DiffMethod } from 'react-diff-viewer-continued';
import { gitAPI } from '../api/client';
import './GitChanges.css';

// 状态颜色映射
const statusColors = {
  modified: '#e2c08d',
  added: '#89d185',
  deleted: '#c74e39',
  untracked: '#73c991',
  renamed: '#73c991',
  changed: '#e2c08d',
};

// 状态图标映射
const statusIcons = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  untracked: 'U',
  renamed: 'R',
  changed: 'C',
};

// Diff 查看器的自定义样式（暗色主题，移动端优化）
const diffStyles = {
  variables: {
    dark: {
      diffViewerBackground: '#1e1e1e',
      diffViewerColor: '#d4d4d4',
      addedBackground: '#2d4a3e',
      addedColor: '#98c379',
      removedBackground: '#4a2d2d',
      removedColor: '#e06c75',
      wordAddedBackground: '#3d5a4e',
      wordRemovedBackground: '#5a3d3d',
      addedGutterBackground: '#2d4a3e',
      removedGutterBackground: '#4a2d2d',
      gutterBackground: '#252526',
      gutterColor: '#858585',
      highlightBackground: '#264f78',
      highlightGutterBackground: '#264f78',
      codeFoldBackground: '#3c3c3c',
      codeFoldGutterBackground: '#3c3c3c',
      codeFoldContentColor: '#858585',
      emptyLineBackground: '#1e1e1e',
    },
  },
  line: {
    padding: '4px 8px',
    fontSize: '12px',
    lineHeight: '1.5',
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
  },
  gutter: {
    minWidth: '35px',
    padding: '0 8px',
    fontSize: '11px',
  },
  contentText: {
    fontFamily: "'SF Mono', 'Fira Code', 'Consolas', monospace",
  },
};

// 变更文件列表项
function ChangeItem({ file, onClick }) {
  const statusColor = statusColors[file.statusType] || '#858585';
  const statusIcon = statusIcons[file.statusType] || '?';

  return (
    <div className="change-item" onClick={() => onClick(file)}>
      <span
        className="change-status-badge"
        style={{ backgroundColor: statusColor }}
      >
        {statusIcon}
      </span>
      <span className="change-file-name">
        {file.path.split('/').pop()}
      </span>
      <span className="change-file-path">
        {file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : ''}
      </span>
      {file.staged && (
        <Tag color="success" className="change-staged-tag">
          暂存
        </Tag>
      )}
    </div>
  );
}

// Diff 查看器组件
function DiffViewer({ file, projectPath, onBack }) {
  const [loading, setLoading] = useState(true);
  const [diffData, setDiffData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadDiff();
  }, [file.path]);

  const loadDiff = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await gitAPI.getDiff(projectPath, file.path, file.staged);
      setDiffData(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fileName = file.path.split('/').pop();
  const statusColor = statusColors[file.statusType] || '#858585';

  return (
    <div className="diff-viewer">
      <NavBar onBack={onBack} className="diff-viewer-nav">
        <div className="diff-viewer-title">
          <span
            className="change-status-badge"
            style={{ backgroundColor: statusColor }}
          >
            {statusIcons[file.statusType] || '?'}
          </span>
          <span>{fileName}</span>
        </div>
      </NavBar>

      <div className="diff-viewer-path">{file.path}</div>

      <div className="diff-viewer-content">
        {loading ? (
          <div className="diff-viewer-loading">
            <SpinLoading />
            <span>加载差异...</span>
          </div>
        ) : error ? (
          <div className="diff-viewer-error">
            <Empty description={error} />
          </div>
        ) : diffData?.isNewFile ? (
          <div className="diff-new-file">
            <div className="diff-new-file-header">新文件</div>
            <pre className="diff-new-file-content">{diffData.newContent}</pre>
          </div>
        ) : diffData?.isDeleted ? (
          <div className="diff-deleted-file">
            <Empty description="文件已删除" />
          </div>
        ) : (
          <ReactDiffViewer
            oldValue={diffData?.oldContent || ''}
            newValue={diffData?.newContent || ''}
            splitView={false}
            useDarkTheme={true}
            styles={diffStyles}
            compareMethod={DiffMethod.WORDS}
            showDiffOnly={false}
            extraLinesSurroundingDiff={3}
            hideLineNumbers={false}
            leftTitle="旧版本"
            rightTitle="新版本"
          />
        )}
      </div>
    </div>
  );
}

// 主组件
function GitChanges({ projectPath }) {
  const [isGitRepo, setIsGitRepo] = useState(null);
  const [changes, setChanges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);

  useEffect(() => {
    if (projectPath) {
      checkAndLoad();
    }
  }, [projectPath]);

  const checkAndLoad = async () => {
    setLoading(true);
    try {
      // 检查是否是 git 仓库
      const checkResult = await gitAPI.check(projectPath);
      setIsGitRepo(checkResult.isGitRepo);

      if (checkResult.isGitRepo) {
        // 加载变更列表
        const statusData = await gitAPI.getStatus(projectPath);
        setChanges(statusData);
      }
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载失败: ' + err.message });
    } finally {
      setLoading(false);
    }
  };

  // 显示 diff 查看器
  if (selectedFile) {
    return (
      <DiffViewer
        file={selectedFile}
        projectPath={projectPath}
        onBack={() => setSelectedFile(null)}
      />
    );
  }

  // 主列表视图
  return (
    <div className="git-changes">
      {loading ? (
        <div className="git-changes-loading">
          <SpinLoading />
          <span>检查变更...</span>
        </div>
      ) : !isGitRepo ? (
        <div className="git-changes-not-repo">
          <Empty
            description="此项目不是 Git 仓库"
            imageStyle={{ width: 80 }}
          />
        </div>
      ) : changes.length === 0 ? (
        <div className="git-changes-empty">
          <Empty
            description="没有未提交的变更"
            imageStyle={{ width: 80 }}
          />
          <p className="git-changes-hint">所有更改已提交</p>
        </div>
      ) : (
        <div className="git-changes-list">
          <div className="git-changes-header">
            <span className="git-changes-count">{changes.length} 个文件变更</span>
            <button className="git-changes-refresh" onClick={checkAndLoad}>
              刷新
            </button>
          </div>
          
          {/* 暂存的变更 */}
          {changes.filter(f => f.staged).length > 0 && (
            <div className="git-changes-section">
              <div className="git-changes-section-title">暂存的更改</div>
              {changes.filter(f => f.staged).map((file) => (
                <ChangeItem
                  key={`staged-${file.path}`}
                  file={file}
                  onClick={setSelectedFile}
                />
              ))}
            </div>
          )}

          {/* 未暂存的变更 */}
          {changes.filter(f => !f.staged).length > 0 && (
            <div className="git-changes-section">
              <div className="git-changes-section-title">未暂存的更改</div>
              {changes.filter(f => !f.staged).map((file) => (
                <ChangeItem
                  key={`unstaged-${file.path}`}
                  file={file}
                  onClick={setSelectedFile}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default GitChanges;
