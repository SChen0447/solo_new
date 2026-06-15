import React, { useState, useMemo } from 'react';

interface CustomHeader {
  key: string;
  value: string;
}

interface EndpointConfig {
  id: string;
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  responseData: any;
  statusCode: number;
  delay: number;
  headers: CustomHeader[];
  enabled: boolean;
  createdAt: number;
}

interface ApiSimulatorProps {
  endpoints: EndpointConfig[];
  onAdd: (ep: Omit<EndpointConfig, 'id' | 'createdAt' | 'enabled'>) => void;
  onUpdate: (id: string, updates: Partial<EndpointConfig>) => void;
  onDelete: (id: string) => void;
  editorContent: string;
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#4CAF50',
  POST: '#2196F3',
  PUT: '#FF9800',
  DELETE: '#F44336',
};

const STATUS_CODES = [200, 201, 400, 404, 500];

function getNestedValue(obj: any, path: string): any {
  if (!path || path === '$') return obj;
  const keys = path.replace(/^\$\.?/, '').split('.').filter(Boolean);
  let current = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    current = current[key];
  }
  return current;
}

function getJsonPaths(obj: any, prefix: string = '$'): string[] {
  const paths: string[] = [prefix];
  if (obj !== null && typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      const childPaths = getJsonPaths(obj[key], `${prefix}.${key}`);
      paths.push(...childPaths);
    }
  }
  return paths;
}

function ApiSimulator({ endpoints, onAdd, onUpdate, onDelete, editorContent }: ApiSimulatorProps) {
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [method, setMethod] = useState<'GET' | 'POST' | 'PUT' | 'DELETE'>('GET');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [responseDataText, setResponseDataText] = useState('{}');
  const [statusCode, setStatusCode] = useState(200);
  const [delay, setDelay] = useState(0);
  const [headers, setHeaders] = useState<CustomHeader[]>([]);
  const [jsonPath, setJsonPath] = useState('$');

  const sortedEndpoints = useMemo(
    () => [...endpoints].sort((a, b) => b.createdAt - a.createdAt),
    [endpoints]
  );

  const jsonPaths = useMemo(() => {
    try {
      const parsed = JSON.parse(editorContent);
      return getJsonPaths(parsed);
    } catch {
      return ['$'];
    }
  }, [editorContent]);

  const resetForm = () => {
    setMethod('GET');
    setPath('');
    setDescription('');
    setResponseDataText('{}');
    setStatusCode(200);
    setDelay(0);
    setHeaders([]);
    setJsonPath('$');
    setEditingId(null);
  };

  const handleAdd = () => {
    let responseData: any = {};
    try {
      if (jsonPath && jsonPath !== '$') {
        const parsed = JSON.parse(editorContent);
        const nested = getNestedValue(parsed, jsonPath);
        responseData = nested !== undefined ? nested : JSON.parse(responseDataText);
      } else {
        responseData = JSON.parse(responseDataText);
      }
    } catch {
      responseData = {};
    }

    onAdd({
      method,
      path,
      description,
      responseData,
      statusCode,
      delay,
      headers,
    });
    resetForm();
    setShowForm(false);
  };

  const handleEdit = (ep: EndpointConfig) => {
    setEditingId(ep.id);
    setMethod(ep.method);
    setPath(ep.path);
    setDescription(ep.description);
    setResponseDataText(JSON.stringify(ep.responseData, null, 2));
    setStatusCode(ep.statusCode);
    setDelay(ep.delay);
    setHeaders([...ep.headers]);
    setJsonPath('$');
    setShowForm(true);
  };

  const handleUpdate = () => {
    if (!editingId) return;
    let responseData: any = {};
    try {
      responseData = JSON.parse(responseDataText);
    } catch {
      responseData = {};
    }

    onUpdate(editingId, {
      method,
      path,
      description,
      responseData,
      statusCode,
      delay,
      headers,
    });
    resetForm();
    setShowForm(false);
  };

  const handleDelete = (id: string) => {
    setDeletingId(id);
    setTimeout(() => {
      onDelete(id);
      setDeletingId(null);
    }, 300);
  };

  const addHeader = () => {
    setHeaders([...headers, { key: '', value: '' }]);
  };

  const updateHeader = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...headers];
    updated[index] = { ...updated[index], [field]: val };
    setHeaders(updated);
  };

  const removeHeader = (index: number) => {
    setHeaders(headers.filter((_, i) => i !== index));
  };

  const handleJsonPathSelect = (selectedPath: string) => {
    setJsonPath(selectedPath);
    try {
      const parsed = JSON.parse(editorContent);
      const nested = getNestedValue(parsed, selectedPath);
      if (nested !== undefined) {
        setResponseDataText(JSON.stringify(nested, null, 2));
      }
    } catch {}
  };

  return (
    <div className="api-simulator">
      <div className="simulator-header">
        <h3>API Endpoints</h3>
        <button
          className="add-endpoint-btn"
          onClick={() => {
            if (showForm && editingId) {
              resetForm();
              setShowForm(false);
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
        >
          {showForm ? 'Cancel' : '+ Add Endpoint'}
        </button>
      </div>

      {showForm && (
        <div className="endpoint-form">
          <div className="form-row">
            <label>Method</label>
            <div className="method-selector">
              {(['GET', 'POST', 'PUT', 'DELETE'] as const).map((m) => (
                <button
                  key={m}
                  className={`method-option ${method === m ? 'method-option-active' : ''}`}
                  style={{
                    backgroundColor: method === m ? METHOD_COLORS[m] : 'transparent',
                    borderColor: METHOD_COLORS[m],
                  }}
                  onClick={() => setMethod(m)}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          <div className="form-row">
            <label>Path</label>
            <input
              className="form-input"
              type="text"
              placeholder="/users/:id"
              value={path}
              onChange={(e) => setPath(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Description</label>
            <input
              className="form-input"
              type="text"
              placeholder="Endpoint description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-row">
            <label>Response Data (JSON Path from Editor)</label>
            <select
              className="form-select"
              value={jsonPath}
              onChange={(e) => handleJsonPathSelect(e.target.value)}
            >
              {jsonPaths.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Response Data</label>
            <textarea
              className="form-textarea"
              value={responseDataText}
              onChange={(e) => setResponseDataText(e.target.value)}
              rows={5}
            />
          </div>

          <div className="form-row">
            <label>Status Code</label>
            <select
              className="form-select"
              value={statusCode}
              onChange={(e) => setStatusCode(Number(e.target.value))}
            >
              {STATUS_CODES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="form-row">
            <label>Delay (ms): {delay}</label>
            <input
              className="form-range"
              type="range"
              min="0"
              max="5000"
              step="100"
              value={delay}
              onChange={(e) => setDelay(Number(e.target.value))}
            />
          </div>

          <div className="form-row">
            <label>Custom Headers</label>
            <div className="headers-list">
              {headers.map((h, i) => (
                <div key={i} className="header-row">
                  <input
                    className="form-input header-input"
                    type="text"
                    placeholder="Key"
                    value={h.key}
                    onChange={(e) => updateHeader(i, 'key', e.target.value)}
                  />
                  <input
                    className="form-input header-input"
                    type="text"
                    placeholder="Value"
                    value={h.value}
                    onChange={(e) => updateHeader(i, 'value', e.target.value)}
                  />
                  <button className="header-remove-btn" onClick={() => removeHeader(i)}>
                    ×
                  </button>
                </div>
              ))}
              <button className="add-header-btn" onClick={addHeader}>
                + Add Header
              </button>
            </div>
          </div>

          <button
            className="form-submit-btn"
            onClick={editingId ? handleUpdate : handleAdd}
          >
            {editingId ? 'Update Endpoint' : 'Create Endpoint'}
          </button>
        </div>
      )}

      <div className="endpoint-list">
        {sortedEndpoints.length === 0 && !showForm && (
          <div className="empty-state">No endpoints yet. Click "+ Add Endpoint" to create one.</div>
        )}
        {sortedEndpoints.map((ep) => (
          <div
            key={ep.id}
            className={`endpoint-card ${deletingId === ep.id ? 'endpoint-card-deleting' : ''}`}
          >
            <div className="endpoint-card-left">
              <span
                className="method-tag"
                style={{ backgroundColor: METHOD_COLORS[ep.method] }}
              >
                {ep.method}
              </span>
              <span className="endpoint-path">{ep.path}</span>
              {ep.description && (
                <span className="endpoint-desc">{ep.description}</span>
              )}
            </div>
            <div className="endpoint-card-right">
              <span
                className={`status-tag ${
                  ep.statusCode >= 400 ? 'status-error' : 'status-ok'
                }`}
              >
                {ep.statusCode}
              </span>
              <label className="toggle-switch">
                <input
                  type="checkbox"
                  checked={ep.enabled}
                  onChange={() => onUpdate(ep.id, { enabled: !ep.enabled })}
                />
                <span className="toggle-slider" />
              </label>
              <button
                className="card-action-btn"
                onClick={() => handleEdit(ep)}
                title="Edit"
              >
                ✎
              </button>
              <button
                className="card-action-btn card-action-delete"
                onClick={() => handleDelete(ep.id)}
                title="Delete"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default ApiSimulator;
