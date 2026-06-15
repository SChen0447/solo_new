import React from 'react';
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
    background: '#20c997',
    borderRadius: 2
  },
  connectArea: {
    alignSelf: 'center',
    width: '100%',
    maxWidth: 400,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 14,
    padding: 24,
    background: '#f8f9fa',
    borderRadius: 16,
    border: '1px solid #e9ecef',
    flexShrink: 0
  },
  connectTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: '#495057',
    marginBottom: 4
  },
  roomInput: {
    width: '100%',
    height: 48,
    borderRadius: 12,
    border: '2px solid #dee2e6',
    padding: '0 18px',
    fontSize: 18,
    fontWeight: 700,
    letterSpacing: 8,
    textAlign: 'center',
    outline: 'none',
    transition: 'all 0.2s ease',
    color: '#212529',
    background: '#fff'
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
    width: 160
  },
  primaryBtnDisabled: {
    background: '#adb5bd',
    cursor: 'not-allowed'
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
  saveBtn: {
    height: 32,
    padding: '0 14px',
    borderRadius: 16,
    border: 'none',
    background: '#20c997',
    color: '#fff',
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    flexShrink: 0,
    display: 'flex',
    alignItems: 'center',
    gap: 5
  },
  actions: {
    display: 'flex',
    justifyContent: 'center',
    flexShrink: 0
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
    fontSize: 13,
    lineHeight: 1.6
  },
  modalOverlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(0,0,0,0.4)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.25s ease-out'
  },
  modal: {
    background: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 420,
    boxShadow: '0 4px 32px rgba(0,0,0,0.15)',
    animation: 'fadeIn 0.3s ease-out'
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 700,
    color: '#212529',
    marginBottom: 20,
    textAlign: 'center'
  },
  modalFileInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '16px 18px',
    background: '#f8f9fa',
    borderRadius: 12,
    marginBottom: 24
  },
  modalFileDetails: {
    flex: 1,
    minWidth: 0
  },
  modalFileName: {
    fontSize: 14,
    fontWeight: 600,
    color: '#212529',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    marginBottom: 4
  },
  modalFileSize: {
    fontSize: 13,
    color: '#6c757d',
    fontWeight: 500
  },
  modalActions: {
    display: 'flex',
    gap: 12
  },
  rejectBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    border: '2px solid #dee2e6',
    background: '#fff',
    color: '#6c757d',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  },
  acceptBtn: {
    flex: 1,
    height: 44,
    borderRadius: 22,
    border: 'none',
    background: '#20c997',
    color: '#fff',
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    transition: 'all 0.2s ease'
  }
};

export const ReceiverPanel: React.FC = () => {
  const {
    receiverFiles,
    incomingRequest,
    connectionStatus,
    setIncomingRequest,
    clearReceiverFiles,
    resetAll,
    setError
  } = useAppStore();

  const [joinCode, setJoinCode] = React.useState('');

  const handleJoinRoom = () => {
    const code = joinCode.trim();
    if (code.length !== 6 || !/^\d{6}$/.test(code)) {
      setError('请输入正确的6位数字房间码');
      return;
    }
    connectionManager.joinRoom(code);
  };

  const handleAccept = () => {
    if (incomingRequest) {
      connectionManager.acceptFile(incomingRequest);
    }
  };

  const handleReject = () => {
    if (incomingRequest) {
      connectionManager.rejectFile(incomingRequest);
    }
  };

  const handleSave = (file: FileItem) => {
    connectionManager.saveReceivedFile(file.id);
  };

  const handleContinue = () => {
    resetAll();
  };

  const hasCompleted = receiverFiles.some(f => f.status === 'completed');
  const isConnected = connectionStatus === 'connected';

  const getStatusDisplay = (status: FileItem['status']) => {
    switch (status) {
      case 'transferring': return { text: '接收中', color: '#0d6efd' };
      case 'completed': return { text: '已完成', color: '#20c997' };
      case 'failed': return { text: '失败', color: '#dc3545' };
      default: return null;
    }
  };

  return (
    <div style={styles.panel}>
      <div style={styles.headerWrap}>
        <div style={styles.header}>
          接收端
          <div style={styles.headerUnderline} />
        </div>
      </div>

      {!isConnected ? (
        <div style={styles.connectArea}>
          <div style={styles.connectTitle}>输入房间码加入房间</div>
          <input
            type="text"
            value={joinCode}
            onChange={(e) => {
              const val = e.target.value.replace(/\D/g, '').slice(0, 6);
              setJoinCode(val);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleJoinRoom();
            }}
            placeholder="000000"
            style={{
              ...styles.roomInput,
              ...(joinCode.length === 6 ? { borderColor: '#0d6efd', boxShadow: '0 0 0 3px rgba(13,110,253,0.12)' } : {})
            }}
            onFocus={(e) => {
              if (!e.target.style.boxShadow) {
                e.target.style.borderColor = '#0d6efd';
              }
            }}
            onBlur={(e) => {
              if (joinCode.length !== 6) {
                e.target.style.borderColor = '#dee2e6';
                e.target.style.boxShadow = 'none';
              }
            }}
            maxLength={6}
          />
          <button
            style={{
              ...styles.primaryBtn,
              ...(joinCode.length !== 6 ? styles.primaryBtnDisabled : {})
            }}
            disabled={joinCode.length !== 6}
            onClick={handleJoinRoom}
            onMouseEnter={(e) => {
              if (joinCode.length === 6) e.currentTarget.style.background = '#0b5ed7';
            }}
            onMouseLeave={(e) => {
              if (joinCode.length === 6) e.currentTarget.style.background = '#0d6efd';
            }}
            onMouseDown={(e) => {
              if (joinCode.length === 6) e.currentTarget.style.transform = 'scale(0.95)';
            }}
            onMouseUp={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
            }}
          >
            加入房间
          </button>
        </div>
      ) : (
        <div style={styles.fileList}>
          {receiverFiles.length === 0 ? (
            <div style={styles.emptyHint}>
              等待发送方发起文件传输...<br />
              <span style={{ color: '#ced4da', fontSize: 12 }}>
                连接已就绪，收到文件请求后将弹出确认窗口
              </span>
            </div>
          ) : (
            receiverFiles.map(file => {
              const status = getStatusDisplay(file.status);
              const showProgress = file.status === 'transferring';
              return (
                <div key={file.id} style={styles.fileItem}>
                  <FileIcon filename={file.name} type={file.type} size={42} />
                  <div style={styles.fileInfo}>
                    <div style={styles.fileNameRow}>
                      <span style={styles.fileName} title={file.name}>{file.name}</span>
                      {file.status === 'completed' ? (
                        <button
                          style={styles.saveBtn}
                          onClick={() => handleSave(file)}
                          onMouseEnter={(e) => { e.currentTarget.style.background = '#1bb587'; }}
                          onMouseLeave={(e) => { e.currentTarget.style.background = '#20c997'; }}
                          onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.96)'; }}
                          onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" strokeLinecap="round" strokeLinejoin="round"/>
                            <polyline points="7 10 12 15 17 10" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="12" y1="15" x2="12" y2="3" strokeLinecap="round" strokeLinejoin="round"/>
                          </svg>
                          保存
                        </button>
                      ) : status && (
                        <span style={{ ...styles.statusText, color: status.color }}>
                          {status.text}
                        </span>
                      )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={styles.fileMeta}>
                        {formatFileSize(file.size)}
                      </span>
                    </div>
                    {(showProgress || file.status === 'completed') && (
                      <>
                        <ProgressBar progress={file.progress} />
                        {showProgress && (
                          <div style={styles.speedRow}>
                            <span>{file.progress.toFixed(1)}%</span>
                            {file.speed > 0 && <span>{formatSpeed(file.speed)}</span>}
                            {file.transferredBytes !== undefined && file.transferredBytes > 0 && (
                              <span>{formatFileSize(file.transferredBytes)}</span>
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      <div style={styles.actions}>
        {hasCompleted && (
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
        {isConnected && receiverFiles.length > 0 && !hasCompleted && (
          <button
            style={{
              ...styles.continueBtn,
              background: '#6c757d',
              width: 'auto'
            }}
            onClick={clearReceiverFiles}
            onMouseEnter={(e) => { e.currentTarget.style.background = '#5c636a'; }}
            onMouseLeave={(e) => { e.currentTarget.style.background = '#6c757d'; }}
            onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
            onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
          >
            清空列表
          </button>
        )}
      </div>

      {incomingRequest && (
        <div
          style={styles.modalOverlay}
          onClick={(e) => {
            if (e.target === e.currentTarget) {
            }
          }}
        >
          <div style={styles.modal}>
            <div style={styles.modalTitle}>
              📥 收到文件传输请求
            </div>
            <div style={styles.modalFileInfo}>
              <FileIcon filename={incomingRequest.name} type={incomingRequest.type} size={48} />
              <div style={styles.modalFileDetails}>
                <div style={styles.modalFileName} title={incomingRequest.name}>
                  {incomingRequest.name}
                </div>
                <div style={styles.modalFileSize}>
                  {formatFileSize(incomingRequest.size)}
                  {incomingRequest.totalChunks > 0 && (
                    <span style={{ color: '#adb5bd', marginLeft: 8 }}>
                      · {incomingRequest.totalChunks} 个分片
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={styles.modalActions}>
              <button
                style={styles.rejectBtn}
                onClick={handleReject}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = '#dc3545';
                  e.currentTarget.style.color = '#dc3545';
                  e.currentTarget.style.background = 'rgba(220,53,69,0.04)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = '#dee2e6';
                  e.currentTarget.style.color = '#6c757d';
                  e.currentTarget.style.background = '#fff';
                }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                拒绝
              </button>
              <button
                style={styles.acceptBtn}
                onClick={handleAccept}
                onMouseEnter={(e) => { e.currentTarget.style.background = '#1bb587'; }}
                onMouseLeave={(e) => { e.currentTarget.style.background = '#20c997'; }}
                onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.97)'; }}
                onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                接收
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
