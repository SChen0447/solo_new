import React, { useCallback, useRef, useState } from 'react';
import { useAppStore } from '../store/appStore';
import { connectionManager } from '../p2p/ConnectionManager';
import { formatFileSize, formatSpeed } from '../utils';
import { FileIcon } from './FileIcon';
import { ProgressBar } from './ProgressBar';
import { FileItem } from '../types';

const styles: Record<string, React.CSSProperties> = {
  panel: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column',
    padding: 24,
    gap: 20,
    minWidth: 0
  },
  headerWrap: {
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0
  },
  header: {
    position: 'relative',
    fontSize: 18,
    fontWeight: 700,
    color: '#212529',
    paddingBottom: 10,
    textAlign: 'center'
  },
  headerUnderline: {
    position: 'absolute',
    bottom: 0,
    left: '50%',
    transform: 'translateX(-50%)',
    width: 40,
    height: 3,
    background: '#0d6efd',
    borderRadius: 2
  },
  dropzone: {
    width: 450,
    maxWidth: '100%',
    height: 200,
    alignSelf: 'center',
    background: '#f8f9fa',
    border: '2px dashed #6c757d',
    borderRadius: 12,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    cursor: 'pointer',
    transition: 'all 0.35s ease',
    flexShrink: 0,
    overflow: 'hidden'
  },
  dropzoneActive: {
    border: '2px solid #0d6efd',
    background: 'rgba(13, 110, 253, 0.08)'
  },
  dropzoneIcon: {
    opacity: 0.6
  },
  dropzoneText: {
    fontSize: 15,
    color: '#495057',
    textAlign: 'center',
    padding: '0 16px'
  },
  dropzoneHint: {
    fontSize: 12,
    color: '#868e96'
  },
  fileList: {
    flex: 1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 10,
    minHeight: 0,
    paddingRight: 4
  },
  fileItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    background: '#ffffff',
    border: '1px solid #e9ecef',
    borderRadius: 10,
    transition: 'all 0.3s ease-in-out',
    animation: 'fadeIn 0.3s ease-out'
  },
  fileInfo: {
    flex: 1,
    minWidth: 0,
    display: 'flex',
    flexDirection: 'column',
    gap: 6
  },
  fileNameRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  fileName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#212529',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    flex: 1
  },
  fileMeta: {
    fontSize: 12,
    color: '#868e96',
    fontWeight: 500
  },
  removeBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    background: '#dc3545',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'transform 0.2s ease, background 0.2s ease',
    color: '#fff',
    padding: 0
  },
  speedRow: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    fontSize: 12,
    color: '#6c757d',
    marginTop: 2
  },
  statusText: {
    fontSize: 12,
    fontWeight: 600
  },
  actions: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
    flexShrink: 0
  },
  primaryBtn: {
    padding: '0 24px',
    height: 48,
    borderRadius: 24,
    border: 'none',
    background: '#0d6efd',
    color: '#fff',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: 160,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6
  },
  primaryBtnDisabled: {
    background: '#adb5bd',
    cursor: 'not-allowed'
  },
  continueBtn: {
    padding: '0 20px',
    height: 44,
    borderRadius: 22,
    border: 'none',
    background: '#6f42c1',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    width: 140
  },
  emptyHint: {
    padding: 40,
    textAlign: 'center',
    color: '#adb5bd',
    fontSize: 13
  }
};

export const SenderPanel: React.FC = () => {
  const {
    senderFiles,
    addSenderFiles,
    removeSenderFile,
    clearSenderFiles,
    connectionStatus,
    resetAll
  } = useAppStore();
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const [sendingId, setSendingId] = useState<string | null>(null);

  const handleFiles = useCallback((files: FileList | File[]) => {
    const fileArr = Array.from(files);
    if (fileArr.length > 0) {
      addSenderFiles(fileArr);
    }
  }, [addSenderFiles]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const onClickDrop = () => {
    inputRef.current?.click();
  };

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleFiles(e.target.files);
      e.target.value = '';
    }
  };

  const handleSend = async (file: FileItem) => {
    if (!connectionManager.isConnected()) {
      useAppStore.getState().setError('请先建立P2P连接再发送文件');
      return;
    }
    setSendingId(file.id);
    await connectionManager.sendFile(file);
    setTimeout(() => setSendingId(null), 500);
  };

  const handleSendAll = async () => {
    const pending = senderFiles.filter(f => f.status === 'pending');
    for (const f of pending) {
      await handleSend(f);
      await new Promise(r => setTimeout(r, 200));
    }
  };

  const handleContinue = () => {
    resetAll();
  };

  const hasCompleted = senderFiles.some(f => f.status === 'completed');
  const pendingCount = senderFiles.filter(f => f.status === 'pending').length;
  const isConnected = connectionStatus === 'connected';

  const getStatusDisplay = (status: FileItem['status']) => {
    switch (status) {
      case 'requesting': return { text: '请求中', color: '#fd7e14' };
      case 'transferring': return { text: '传输中', color: '#0d6efd' };
      case 'completed': return { text: '已送达', color: '#20c997' };
      case 'failed': return { text: '失败', color: '#dc3545' };
      case 'cancelled': return { text: '已取消', color: '#6c757d' };
      default: return null;
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.headerWrap}>
        <div style={styles.header}>
          发送端
          <div style={styles.headerUnderline} />
        </div>
      </div>

      <div
        onClick={onClickDrop}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        style={{
          ...styles.dropzone,
          ...(isDragging ? styles.dropzoneActive : {})
        }}
      >
        <svg style={styles.dropzoneIcon} width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#6c757d" strokeWidth="1.8">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
          <polyline points="17 8 12 3 7 8" strokeLinecap="round" strokeLinejoin="round"/>
          <line x1="12" y1="3" x2="12" y2="15" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div style={styles.dropzoneText}>
          <strong>点击选择文件</strong> 或将文件拖拽到此处
        </div>
        <div style={styles.dropzoneHint}>支持任意类型文件，单个最大 500MB</div>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={onFileInput}
        />
      </div>

      <div style={styles.fileList}>
        {senderFiles.length === 0 ? (
          <div style={styles.emptyHint}>暂无文件，请选择要发送的文件</div>
        ) : (
          senderFiles.map(file => {
            const status = getStatusDisplay(file.status);
            const showProgress = file.status === 'transferring' || file.status === 'requesting';
            return (
              <div key={file.id} style={styles.fileItem}>
                <FileIcon filename={file.name} type={file.type} size={42} />
                <div style={styles.fileInfo}>
                  <div style={styles.fileNameRow}>
                    <span style={styles.fileName} title={file.name}>{file.name}</span>
                    {file.status === 'pending' && (
                      <button
                        style={styles.removeBtn}
                        onClick={(e) => {
                          e.stopPropagation();
                          removeSenderFile(file.id);
                        }}
                        onMouseEnter={(e) => {
                          const el = e.currentTarget;
                          el.style.transform = 'scale(1.1)';
                          el.style.background = '#bb2d3b';
                        }}
                        onMouseLeave={(e) => {
                          const el = e.currentTarget;
                          el.style.transform = 'scale(1)';
                          el.style.background = '#dc3545';
                        }}
                        title="移除"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                          <line x1="18" y1="6" x2="6" y2="18" strokeLinecap="round"/>
                          <line x1="6" y1="6" x2="18" y2="18" strokeLinecap="round"/>
                        </svg>
                      </button>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={styles.fileMeta}>
                      {formatFileSize(file.size)}
                    </span>
                    {status && (
                      <span style={{ ...styles.statusText, color: status.color }}>
                        {status.text}
                      </span>
                    )}
                  </div>
                  {showProgress && (
                    <>
                      <ProgressBar progress={file.progress} />
                      <div style={styles.speedRow}>
                        <span>{file.progress.toFixed(1)}%</span>
                        {file.speed > 0 && <span>{formatSpeed(file.speed)}</span>}
                        {file.transferredBytes !== undefined && file.transferredBytes > 0 && (
                          <span>{formatFileSize(file.transferredBytes)}</span>
                        )}
                      </div>
                    </>
                  )}
                  {file.status === 'completed' && (
                    <ProgressBar progress={100} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <div style={styles.actions}>
        {!hasCompleted ? (
          <>
            <button
              style={{
                ...styles.primaryBtn,
                ...(!isConnected || pendingCount === 0 ? styles.primaryBtnDisabled : {})
              }}
              disabled={!isConnected || pendingCount === 0}
              onClick={handleSendAll}
              onMouseEnter={(e) => {
                if (isConnected && pendingCount > 0) {
                  e.currentTarget.style.background = '#0b5ed7';
                }
              }}
              onMouseLeave={(e) => {
                if (isConnected && pendingCount > 0) {
                  e.currentTarget.style.background = '#0d6efd';
                }
              }}
              onMouseDown={(e) => {
                if (isConnected && pendingCount > 0) {
                  e.currentTarget.style.transform = 'scale(0.95)';
                }
              }}
              onMouseUp={(e) => {
                e.currentTarget.style.transform = 'scale(1)';
              }}
            >
              {sendingId ? (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ animation: 'pulse 1s infinite' }}>
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" strokeLinecap="round"/>
                  <polyline points="22 4 12 14.01 9 11.01" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              ) : null}
              {sendingId ? '发送中...' : `发送 ${pendingCount > 0 ? `(${pendingCount})` : ''}`}
            </button>
            {senderFiles.length > 0 && (
              <button
                style={{
                  ...styles.continueBtn,
                  background: '#6c757d',
                  width: 'auto'
                }}
                onClick={clearSenderFiles}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#5c636a'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#6c757d'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                清空列表
              </button>
            )}
          </>
        ) : (
          <button
            style={styles.continueBtn}
            onClick={handleContinue}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#5a32a3'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#6f42c1'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            继续传输
          </button>
        )}
      </div>
    </div>
  );
};
