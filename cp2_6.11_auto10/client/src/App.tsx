import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import AceEditor from 'react-ace';
import 'ace-builds/src-noconflict/mode-json';
import 'ace-builds/src-noconflict/theme-monokai';
import 'ace-builds/src-noconflict/ext-language_tools';
import { sendRequest } from './apiService';
import { historyService, collectionService } from './historyService';
import {
  HttpMethod,
  HeaderItem,
  RequestConfig,
  ResponseData,
  HistoryItem,
  Collection,
  CompareResult,
} from './types';

const HTTP_METHODS: HttpMethod[] = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

const getStatusClass = (status: number): string => {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'error';
  return 'success';
};

const formatTime = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
};

const formatJson = (body: string): string => {
  try {
    return JSON.stringify(JSON.parse(body), null, 2);
  } catch {
    return body;
  }
};

const isValidJson = (body: string): boolean => {
  try {
    JSON.parse(body);
    return true;
  } catch {
    return false;
  }
};

const App: React.FC = () => {
  const [method, setMethod] = useState<HttpMethod>('GET');
  const [url, setUrl] = useState<string>('https://jsonplaceholder.typicode.com/posts/1');
  const [headers, setHeaders] = useState<HeaderItem[]>([{ key: '', value: '' }]);
  const [body, setBody] = useState<string>('');
  const [response, setResponse] = useState<ResponseData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [activeTab, setActiveTab] = useState<'body' | 'headers'>('body');
  const [responseTab, setResponseTab] = useState<'body' | 'headers' | 'compare'>('body');
  const [sidebarTab, setSidebarTab] = useState<'history' | 'collections'>('history');
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(false);
  const [docsCollapsed, setDocsCollapsed] = useState<boolean>(false);
  const [showNewCollectionModal, setShowNewCollectionModal] = useState<boolean>(false);
  const [newCollectionName, setNewCollectionName] = useState<string>('');
  const [newCollectionDesc, setNewCollectionDesc] = useState<string>('');
  const [expandedCollections, setExpandedCollections] = useState<Set<string>>(new Set());
  const [compareResults, setCompareResults] = useState<CompareResult[]>([]);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1200);

  const sendBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    setHistory(historyService.getAll());
    setCollections(collectionService.getAll());
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
      if (window.innerWidth < 1024) {
        setSidebarCollapsed(true);
        setDocsCollapsed(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const addHeader = useCallback(() => {
    setHeaders((prev) => [...prev, { key: '', value: '' }]);
  }, []);

  const updateHeader = useCallback((index: number, field: 'key' | 'value', value: string) => {
    setHeaders((prev) => {
      const newHeaders = [...prev];
      newHeaders[index] = { ...newHeaders[index], [field]: value };
      return newHeaders;
    });
  }, []);

  const removeHeader = useCallback((index: number) => {
    setHeaders((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const createRipple = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    const rect = button.getBoundingClientRect();
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - rect.left - radius}px`;
    circle.style.top = `${e.clientY - rect.top - radius}px`;
    circle.classList.add('ripple');
    const existingRipple = button.querySelector('.ripple');
    if (existingRipple) {
      existingRipple.remove();
    }
    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  }, []);

  const handleSend = useCallback(async () => {
    if (!url.trim()) {
      toast.error('请输入请求URL');
      return;
    }

    setLoading(true);
    setResponse(null);
    setResponseTab('body');

    const config: RequestConfig = { method, url, headers, body };

    try {
      const res = await sendRequest(config);
      setResponse(res);
      const historyItem = historyService.save(config, res.status, res.responseTime);
      setHistory((prev) => [historyItem, ...prev].slice(0, 100));
      toast.success(`请求成功: ${res.status} ${res.statusText}`);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || '请求失败';
      setResponse({
        status: err.response?.status || 500,
        statusText: 'Error',
        headers: {},
        body: JSON.stringify({ error: errorMsg }, null, 2),
        responseTime: err.response?.data?.responseTime || 0,
      });
      toast.error(`请求失败: ${errorMsg}`);
    } finally {
      setLoading(false);
    }
  }, [method, url, headers, body]);

  const loadHistoryItem = useCallback((item: HistoryItem) => {
    setMethod(item.method);
    setUrl(item.url);
    setHeaders(item.headers.length > 0 ? item.headers : [{ key: '', value: '' }]);
    setBody(item.body);
    setResponse(null);
    if (windowWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, [windowWidth]);

  const deleteHistoryItem = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    historyService.delete(id);
    setHistory((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const clearAllHistory = useCallback(() => {
    historyService.clear();
    setHistory([]);
    toast.success('已清空所有历史记录');
  }, []);

  const toggleCollection = useCallback((id: string) => {
    setExpandedCollections((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  }, []);

  const loadCollectionRequest = useCallback((req: RequestConfig) => {
    setMethod(req.method);
    setUrl(req.url);
    setHeaders(req.headers.length > 0 ? req.headers : [{ key: '', value: '' }]);
    setBody(req.body);
    setResponse(null);
    if (windowWidth < 1024) {
      setSidebarCollapsed(true);
    }
  }, [windowWidth]);

  const createCollection = useCallback(() => {
    if (!newCollectionName.trim()) {
      toast.error('请输入集合名称');
      return;
    }
    const config: RequestConfig = { method, url, headers, body };
    const collection = collectionService.save(newCollectionName, newCollectionDesc, [config]);
    setCollections((prev) => [collection, ...prev]);
    setShowNewCollectionModal(false);
    setNewCollectionName('');
    setNewCollectionDesc('');
    toast.success('集合创建成功');
  }, [newCollectionName, newCollectionDesc, method, url, headers, body]);

  const deleteCollection = useCallback((id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    collectionService.delete(id);
    setCollections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const runCollection = useCallback(async (collection: Collection) => {
    setLoading(true);
    setResponseTab('compare');
    const results: CompareResult[] = [];

    for (const req of collection.requests) {
      try {
        const res = await sendRequest({
          method: req.method,
          url: req.url,
          headers: req.headers,
          body: req.body,
        });
        results.push({
          requestId: req.id || '',
          name: req.name || req.url,
          method: req.method,
          url: req.url,
          status: res.status,
          responseTime: res.responseTime,
        });
      } catch (err: any) {
        results.push({
          requestId: req.id || '',
          name: req.name || req.url,
          method: req.method,
          url: req.url,
          error: err.message || 'Request failed',
        });
      }
    }

    setCompareResults(results);
    setLoading(false);
    toast.success(`集合运行完成: ${results.length} 个请求`);
  }, []);

  const addCurrentToCollection = useCallback((collectionId: string) => {
    const config: RequestConfig = { method, url, headers, body };
    collectionService.addRequest(collectionId, config);
    setCollections(collectionService.getAll());
    toast.success('已添加到集合');
  }, [method, url, headers, body]);

  const responseTimePercent = Math.min((response?.responseTime || 0) / 1000, 1) * 100;

  return (
    <div className="app">
      <Toaster
        position="top-right"
        toastOptions={{
          style: {
            background: '#2d2d44',
            color: '#cdd6f4',
            border: '1px solid #45475a',
          },
        }}
      />

      <button
        className={`toggle-sidebar-btn ${sidebarCollapsed ? 'visible' : ''}`}
        onClick={() => setSidebarCollapsed(false)}
      >
        ☰
      </button>

      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <span className="sidebar-title">Postman Lite</span>
          <button className="icon-btn" onClick={() => setSidebarCollapsed(true)}>
            ✕
          </button>
        </div>

        <div className="sidebar-tabs">
          <button
            className={`sidebar-tab ${sidebarTab === 'history' ? 'active' : ''}`}
            onClick={() => setSidebarTab('history')}
          >
            历史记录
          </button>
          <button
            className={`sidebar-tab ${sidebarTab === 'collections' ? 'active' : ''}`}
            onClick={() => setSidebarTab('collections')}
          >
            集合
          </button>
        </div>

        <div className="sidebar-content">
          {sidebarTab === 'history' ? (
            history.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🕑</div>
                <div className="empty-state-text">暂无历史记录</div>
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="history-item"
                  onClick={() => loadHistoryItem(item)}
                >
                  <div className="history-item-header">
                    <span className={`method-badge ${item.method}`}>{item.method}</span>
                    <span className="history-url">{item.url}</span>
                  </div>
                  <div className="history-time">{formatTime(item.timestamp)}</div>
                  {item.status !== undefined && (
                    <div className="history-actions">
                      <span className={`status-badge ${getStatusClass(item.status)}`}>
                        {item.status}
                      </span>
                      <button
                        className="delete-btn"
                        onClick={(e) => deleteHistoryItem(item.id, e)}
                      >
                        删除
                      </button>
                    </div>
                  )}
                </div>
              ))
            )
          ) : (
            collections.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📁</div>
                <div className="empty-state-text">暂无集合</div>
              </div>
            ) : (
              collections.map((collection) => (
                <div key={collection.id} className="collection-item">
                  <div
                    className="collection-header"
                    onClick={() => toggleCollection(collection.id)}
                  >
                    <span className="collection-name">
                      {expandedCollections.has(collection.id) ? '▼ ' : '▶ '}
                      {collection.name}
                    </span>
                    <button
                      className="delete-btn"
                      onClick={(e) => deleteCollection(collection.id, e)}
                    >
                      ✕
                    </button>
                  </div>
                  <div className="collection-desc">{collection.description || '无描述'}</div>
                  {expandedCollections.has(collection.id) && (
                    <>
                      <div className="collection-requests">
                        {collection.requests.map((req, idx) => (
                          <div
                            key={req.id || idx}
                            className="collection-request"
                            onClick={() => loadCollectionRequest(req)}
                          >
                            <span>
                              <span className={`method-badge ${req.method}`} style={{ marginRight: 8 }}>
                                {req.method}
                              </span>
                              {req.url.length > 30 ? req.url.slice(0, 30) + '...' : req.url}
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="collection-actions">
                        <button className="btn-sm" onClick={() => addCurrentToCollection(collection.id)}>
                          添加当前
                        </button>
                        <button className="btn-sm primary" onClick={() => runCollection(collection)}>
                          批量运行
                        </button>
                      </div>
                    </>
                  )}
                </div>
              ))
            )
          )}
        </div>

        <div className="sidebar-footer">
          {sidebarTab === 'history' ? (
            <button className="clear-btn" onClick={clearAllHistory}>
              清空历史记录
            </button>
          ) : (
            <button
              className="new-collection-btn"
              onClick={() => setShowNewCollectionModal(true)}
            >
              + 新建集合
            </button>
          )}
        </div>
      </aside>

      <main className="main-content">
        <div className="request-area">
          <div className="request-row">
            <select
              className="method-select"
              value={method}
              onChange={(e) => setMethod(e.target.value as HttpMethod)}
            >
              {HTTP_METHODS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
            <input
              type="text"
              className="url-input"
              placeholder="输入请求URL, 例如 https://api.example.com/users"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            />
            <button
              ref={sendBtnRef}
              className="send-btn"
              onClick={(e) => {
                createRipple(e);
                handleSend();
              }}
              disabled={loading}
            >
              {loading ? '发送中...' : 'Send'}
            </button>
          </div>

          <div className="tabs">
            <button
              className={`tab ${activeTab === 'body' ? 'active' : ''}`}
              onClick={() => setActiveTab('body')}
            >
              Body
            </button>
            <button
              className={`tab ${activeTab === 'headers' ? 'active' : ''}`}
              onClick={() => setActiveTab('headers')}
            >
              Headers ({headers.filter((h) => h.key.trim()).length})
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'body' ? (
              <div className="editor-wrapper">
                <AceEditor
                  mode="json"
                  theme="monokai"
                  onChange={(newValue) => setBody(newValue)}
                  value={body}
                  name="body-editor"
                  editorProps={{ $blockScrolling: true }}
                  setOptions={{
                    enableBasicAutocompletion: true,
                    enableLiveAutocompletion: true,
                    enableSnippets: true,
                    tabSize: 2,
                    useSoftTabs: true,
                  }}
                  style={{ width: '100%', height: '180px' }}
                  placeholder="在此输入JSON请求体..."
                />
              </div>
            ) : (
              <>
                <table className="headers-table">
                  <tbody>
                    {headers.map((header, index) => (
                      <tr key={index}>
                        <td style={{ width: '45%' }}>
                          <input
                            type="text"
                            placeholder="Header Key"
                            value={header.key}
                            onChange={(e) => updateHeader(index, 'key', e.target.value)}
                          />
                        </td>
                        <td style={{ width: '45%' }}>
                          <input
                            type="text"
                            placeholder="Header Value"
                            value={header.value}
                            onChange={(e) => updateHeader(index, 'value', e.target.value)}
                          />
                        </td>
                        <td style={{ width: '10%', textAlign: 'center' }}>
                          <button
                            className="delete-btn"
                            onClick={() => removeHeader(index)}
                            disabled={headers.length === 1}
                          >
                            ✕
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="add-header-btn" onClick={addHeader}>
                  + 添加 Header
                </button>
              </>
            )}
          </div>
        </div>

        <div className="response-area">
          {response && (
            <div className="response-header">
              <div className="response-status">
                <span
                  className={`response-status-code ${getStatusClass(response.status)}`}
                >
                  {response.status} {response.statusText}
                </span>
              </div>
              <div className="response-time-bar">
                <div
                  className="response-time-fill"
                  style={{ width: `${responseTimePercent}%` }}
                />
              </div>
              <span className="response-time-text">{response.responseTime}ms</span>
            </div>
          )}

          {response && (
            <div className="tabs" style={{ padding: '0 16px', marginTop: 12 }}>
              <button
                className={`tab ${responseTab === 'body' ? 'active' : ''}`}
                onClick={() => setResponseTab('body')}
              >
                Response Body
              </button>
              <button
                className={`tab ${responseTab === 'headers' ? 'active' : ''}`}
                onClick={() => setResponseTab('headers')}
              >
                Response Headers
              </button>
              {compareResults.length > 0 && (
                <button
                  className={`tab ${responseTab === 'compare' ? 'active' : ''}`}
                  onClick={() => setResponseTab('compare')}
                >
                  对比结果
                </button>
              )}
            </div>
          )}

          <div className="response-body">
            {loading ? (
              <div className="loading-container">
                <div className="spinner" />
                <span className="loading-text">发送请求中...</span>
              </div>
            ) : !response ? (
              <div className="empty-state">
                <div className="empty-state-icon">📤</div>
                <div className="empty-state-text">
                  点击 Send 按钮发送请求，响应结果将显示在这里
                </div>
              </div>
            ) : responseTab === 'body' ? (
              <div className="editor-wrapper" style={{ borderRadius: 0, border: 'none' }}>
                <AceEditor
                  mode={isValidJson(response.body) ? 'json' : 'text'}
                  theme="monokai"
                  value={isValidJson(response.body) ? formatJson(response.body) : response.body}
                  name="response-editor"
                  editorProps={{ $blockScrolling: true }}
                  readOnly={true}
                  showPrintMargin={false}
                  setOptions={{
                    tabSize: 2,
                    useSoftTabs: true,
                  }}
                  style={{ width: '100%', height: '100%', minHeight: 400 }}
                />
              </div>
            ) : responseTab === 'headers' ? (
              <table className="response-headers-table">
                <thead>
                  <tr>
                    <th style={{ width: '30%' }}>Key</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(response.headers).map(([key, value]) => (
                    <tr key={key}>
                      <td>{key}</td>
                      <td>{value}</td>
                    </tr>
                  ))}
                  {Object.keys(response.headers).length === 0 && (
                    <tr>
                      <td colSpan={2} style={{ textAlign: 'center', color: 'var(--text-muted)' }}>
                        无响应头
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="compare-table">
                <thead>
                  <tr>
                    <th>方法</th>
                    <th>URL</th>
                    <th>状态码</th>
                    <th>响应时间</th>
                  </tr>
                </thead>
                <tbody>
                  {compareResults.map((result, idx) => (
                    <tr key={idx}>
                      <td>
                        <span className={`method-badge ${result.method}`}>{result.method}</span>
                      </td>
                      <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {result.url}
                      </td>
                      <td>
                        {result.status !== undefined ? (
                          <span className={`status-badge ${getStatusClass(result.status)}`}>
                            {result.status}
                          </span>
                        ) : (
                          <span className="status-badge error">{result.error}</span>
                        )}
                      </td>
                      <td>{result.responseTime !== undefined ? `${result.responseTime}ms` : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </main>

      <button
        className={`toggle-docs-btn ${docsCollapsed ? 'visible' : ''}`}
        onClick={() => setDocsCollapsed(false)}
      >
        📖
      </button>

      <aside className={`docs-panel ${docsCollapsed ? 'collapsed' : ''}`}>
        <div className="docs-header">
          <span className="sidebar-title">API 文档</span>
          <button className="icon-btn" onClick={() => setDocsCollapsed(true)}>
            ✕
          </button>
        </div>
        <div className="docs-content">
          <div className="docs-section">
            <h4>快速开始</h4>
            <p>Postman Lite 是一个轻量级的 HTTP API 调试工具。</p>
          </div>
          <div className="docs-section">
            <h4>HTTP 方法</h4>
            <ul>
              <li><code>GET</code> - 获取资源</li>
              <li><code>POST</code> - 创建资源</li>
              <li><code>PUT</code> - 更新资源</li>
              <li><code>DELETE</code> - 删除资源</li>
              <li><code>PATCH</code> - 部分更新</li>
            </ul>
          </div>
          <div className="docs-section">
            <h4>状态码说明</h4>
            <ul>
              <li><span style={{ color: 'var(--success)' }}>2xx</span> - 请求成功</li>
              <li><span style={{ color: 'var(--warning)' }}>4xx</span> - 客户端错误</li>
              <li><span style={{ color: 'var(--error)' }}>5xx</span> - 服务器错误</li>
            </ul>
          </div>
          <div className="docs-section">
            <h4>测试 API</h4>
            <p>可以使用 JSONPlaceholder 进行测试：</p>
            <p style={{ marginTop: 8, wordBreak: 'break-all' }}>
              <code>https://jsonplaceholder.typicode.com/posts</code>
            </p>
          </div>
          <div className="docs-section">
            <h4>功能特性</h4>
            <ul>
              <li>历史记录自动保存</li>
              <li>集合管理与批量运行</li>
              <li>响应对比分析</li>
              <li>JSON 语法高亮</li>
            </ul>
          </div>
        </div>
      </aside>

      {showNewCollectionModal && (
        <div className="modal-overlay" onClick={() => setShowNewCollectionModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>新建集合</h3>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>集合名称</label>
                <input
                  type="text"
                  value={newCollectionName}
                  onChange={(e) => setNewCollectionName(e.target.value)}
                  placeholder="例如：用户API测试"
                  autoFocus
                />
              </div>
              <div className="form-group">
                <label>描述（可选）</label>
                <textarea
                  value={newCollectionDesc}
                  onChange={(e) => setNewCollectionDesc(e.target.value)}
                  placeholder="集合用途说明..."
                />
              </div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                当前请求配置将自动添加到此集合
              </p>
            </div>
            <div className="modal-footer">
              <button
                className="btn btn-secondary"
                onClick={() => setShowNewCollectionModal(false)}
              >
                取消
              </button>
              <button className="btn btn-primary" onClick={createCollection}>
                创建
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
