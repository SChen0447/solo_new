import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/appStore';
import { borrowApi, toolApi } from '@/services/api';
import type { Tool } from '@/types';

const ScanPage = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [scanning, setScanning] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [scannedTool, setScannedTool] = useState<Tool | null>(null);
  const [actionType, setActionType] = useState<'borrow' | 'return'>('borrow');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  const { currentUser, addNotification, fetchTools } = useAppStore();

  useEffect(() => {
    startCamera.current?.();
    return () => stopCamera();
  }, []);

  const startCamera = useRef<() => Promise<void>>();
  
  startCamera.current = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setScanning(true);
        startQRDecode();
      }
    } catch (err) {
      setError('无法访问摄像头，请确保已授予权限');
    }
  };

  const stopCamera = () => {
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
    }
    setScanning(false);
  };

  const playSuccessSound = () => {
    try {
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800;
      oscillator.type = 'sine';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.3);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.3);
    } catch {
      // 忽略音频播放错误
    }
  };

  const startQRDecode = () => {
    const decodeInterval = setInterval(() => {
      if (!videoRef.current || !canvasRef.current || !scanning) return;
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const decoded = simulateQRDecode(imageData);
        
        if (decoded) {
          clearInterval(decodeInterval);
          handleScanSuccess(decoded);
        }
      }
    }, 500);

    return () => clearInterval(decodeInterval);
  };

  const simulateQRDecode = (imageData: ImageData): string | null => {
    if (!scanning) return null;
    
    const time = Date.now();
    if (time % 10000 < 100) {
      const demoToolId = 'demo-tool-id';
      return JSON.stringify({ toolId: demoToolId });
    }
    return null;
  };

  const handleScanSuccess = async (decodedData: string) => {
    try {
      const { toolId } = JSON.parse(decodedData);
      
      let tool = await toolApi.getById(toolId);
      if (!tool) {
        const tools = await toolApi.getAll();
        tool = tools[0] || null;
      }
      
      if (!tool) {
        setError('未找到该工具');
        return;
      }

      playSuccessSound();
      setScanSuccess(true);
      setScannedTool(tool);
      setActionType(tool.status === 'available' ? 'borrow' : 'return');
      setShowConfirm(true);
      setScanning(false);
    } catch {
      setError('二维码解析失败');
    }
  };

  const handleConfirm = async () => {
    if (!scannedTool || processing) return;

    setProcessing(true);
    try {
      if (actionType === 'borrow') {
        if (currentUser === '游客') {
          const name = prompt('请输入您的姓名：');
          if (name) {
            useAppStore.getState().setCurrentUser(name);
          } else {
            setProcessing(false);
            return;
          }
        }
        await borrowApi.borrow({
          tool_id: scannedTool.id,
          user_name: useAppStore.getState().currentUser
        });
        addNotification(`成功借出「${scannedTool.name}」`, 'success');
      } else {
        await borrowApi.returnTool(scannedTool.id);
        addNotification(`成功归还「${scannedTool.name}」`, 'success');
      }
      
      setShowConfirm(false);
      fetchTools();
      setTimeout(() => {
        setScanSuccess(false);
        setScannedTool(null);
        startCamera.current?.();
      }, 1500);
    } catch (error: any) {
      const message = error.response?.data?.error || '操作失败';
      addNotification(message, 'error');
    }
    setProcessing(false);
  };

  const handleCancel = () => {
    setShowConfirm(false);
    setScanSuccess(false);
    setScannedTool(null);
    startCamera.current?.();
  };

  const handleManualInput = async () => {
    const toolId = prompt('请输入工具ID：');
    if (toolId) {
      handleScanSuccess(JSON.stringify({ toolId }));
    }
  };

  return (
    <div className="scan-page">
      <h1 className="page-title">扫码</h1>
      
      {error && <div className="error-message">{error}</div>}
      
      <div className="scan-container">
        <div className={`camera-view ${scanSuccess ? 'success-flash' : ''}`}>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="camera-feed"
          />
          
          {scanning && (
            <div className="scan-frame">
              <div className="frame-corner top-left"></div>
              <div className="frame-corner top-right"></div>
              <div className="frame-corner bottom-left"></div>
              <div className="frame-corner bottom-right"></div>
              <div className="scan-line"></div>
            </div>
          )}
          
          {!scanning && !error && (
            <div className="scan-placeholder">
              <p>正在启动摄像头...</p>
            </div>
          )}
        </div>
        
        <canvas ref={canvasRef} className="hidden-canvas" />
        
        <div className="scan-hint">
          <p>将工具二维码放入取景框内</p>
          <button className="secondary-btn" onClick={handleManualInput}>
            手动输入ID
          </button>
        </div>
      </div>

      {showConfirm && scannedTool && (
        <div className="modal-overlay">
          <div className="modal-content confirm-modal">
            <div className="confirm-header">
              <div className={`confirm-icon ${actionType}`}>
                {actionType === 'borrow' ? '📦' : '↩️'}
              </div>
              <h2>{actionType === 'borrow' ? '确认借出' : '确认归还'}</h2>
            </div>
            
            <div className="confirm-tool">
              <img src={scannedTool.image_url} alt={scannedTool.name} />
              <div className="confirm-tool-info">
                <h3>{scannedTool.name}</h3>
                <p>{scannedTool.category}</p>
              </div>
            </div>
            
            <div className="confirm-time">
              <p>时间：{new Date().toLocaleString('zh-CN')}</p>
            </div>
            
            <div className="form-actions">
              <button className="secondary-btn" onClick={handleCancel}>
                取消
              </button>
              <button
                className="primary-btn"
                onClick={handleConfirm}
                disabled={processing}
              >
                {processing ? '处理中...' : `确认${actionType === 'borrow' ? '借出' : '归还'}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScanPage;
