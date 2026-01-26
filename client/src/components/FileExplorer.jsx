import React, { useState, useEffect } from 'react';
import { List, NavBar, Toast, SpinLoading, Empty } from 'antd-mobile';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { fileAPI } from '../api/client';
import './FileExplorer.css';

// 文件扩展名到语言的映射
const extToLanguage = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  go: 'go',
  rs: 'rust',
  c: 'c',
  cpp: 'cpp',
  h: 'c',
  hpp: 'cpp',
  cs: 'csharp',
  php: 'php',
  html: 'html',
  css: 'css',
  scss: 'scss',
  less: 'less',
  json: 'json',
  xml: 'xml',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  dockerfile: 'docker',
  vue: 'vue',
  svelte: 'svelte',
};

// 文件图标
function FileIcon({ type, name }) {
  if (type === 'directory') {
    return <span className="file-icon folder">📁</span>;
  }
  
  const ext = name.split('.').pop()?.toLowerCase();
  const iconMap = {
    js: '📜', jsx: '⚛️', ts: '📘', tsx: '⚛️',
    py: '🐍', rb: '💎', java: '☕', go: '🔵',
    rs: '🦀', json: '📋', md: '📝', html: '🌐',
    css: '🎨', scss: '🎨', vue: '💚', svelte: '🧡',
  };
  
  return <span className="file-icon">{iconMap[ext] || '📄'}</span>;
}

// 文件树项组件
function FileTreeItem({ item, depth = 0, onFileSelect, expandedDirs, toggleDir }) {
  const isExpanded = expandedDirs.has(item.path);
  
  const handleClick = () => {
    if (item.type === 'directory') {
      toggleDir(item.path);
    } else {
      onFileSelect(item);
    }
  };

  return (
    <>
      <div
        className={`file-tree-item ${item.type}`}
        style={{ paddingLeft: `${12 + depth * 16}px` }}
        onClick={handleClick}
      >
        {item.type === 'directory' && (
          <span className={`expand-icon ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
        )}
        <FileIcon type={item.type} name={item.name} />
        <span className="file-name">{item.name}</span>
        {item.type === 'file' && item.size > 0 && (
          <span className="file-size">{formatSize(item.size)}</span>
        )}
      </div>
      
      {item.type === 'directory' && isExpanded && item.children && (
        <div className="file-tree-children">
          {item.children.map((child) => (
            <FileTreeItem
              key={child.path}
              item={child}
              depth={depth + 1}
              onFileSelect={onFileSelect}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
        </div>
      )}
    </>
  );
}

// 格式化文件大小
function formatSize(bytes) {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 代码查看器组件
function CodeViewer({ file, projectPath, onBack }) {
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadContent();
  }, [file.path]);

  const loadContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fileAPI.getContent(projectPath, file.path);
      setContent(data.content);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const ext = file.name.split('.').pop()?.toLowerCase();
  const language = extToLanguage[ext] || 'text';

  return (
    <div className="code-viewer">
      <NavBar onBack={onBack} className="code-viewer-nav">
        <span className="code-viewer-title">{file.name}</span>
      </NavBar>
      
      <div className="code-viewer-path">{file.path}</div>
      
      <div className="code-viewer-content">
        {loading ? (
          <div className="code-viewer-loading">
            <SpinLoading />
            <span>加载中...</span>
          </div>
        ) : error ? (
          <div className="code-viewer-error">
            <Empty description={error} />
          </div>
        ) : (
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            showLineNumbers
            wrapLines
            customStyle={{
              margin: 0,
              padding: '12px',
              fontSize: '12px',
              lineHeight: '1.5',
              background: '#1e1e1e',
              minHeight: '100%',
            }}
            lineNumberStyle={{
              minWidth: '3em',
              paddingRight: '1em',
              color: '#858585',
              userSelect: 'none',
            }}
          >
            {content}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

// 主组件
function FileExplorer({ projectPath }) {
  const [tree, setTree] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [expandedDirs, setExpandedDirs] = useState(new Set());

  useEffect(() => {
    if (projectPath) {
      loadTree();
    }
  }, [projectPath]);

  const loadTree = async () => {
    setLoading(true);
    try {
      const data = await fileAPI.getTree(projectPath);
      setTree(data);
    } catch (err) {
      Toast.show({ icon: 'fail', content: '加载文件树失败' });
    } finally {
      setLoading(false);
    }
  };

  const toggleDir = (path) => {
    setExpandedDirs((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleFileSelect = (file) => {
    setSelectedFile(file);
  };

  // 显示代码查看器
  if (selectedFile) {
    return (
      <CodeViewer
        file={selectedFile}
        projectPath={projectPath}
        onBack={() => setSelectedFile(null)}
      />
    );
  }

  // 显示文件树
  return (
    <div className="file-explorer">
      {loading ? (
        <div className="file-explorer-loading">
          <SpinLoading />
          <span>加载文件树...</span>
        </div>
      ) : tree.length === 0 ? (
        <Empty description="项目为空" />
      ) : (
        <div className="file-tree">
          {tree.map((item) => (
            <FileTreeItem
              key={item.path}
              item={item}
              onFileSelect={handleFileSelect}
              expandedDirs={expandedDirs}
              toggleDir={toggleDir}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default FileExplorer;
