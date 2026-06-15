import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFeedbackStore, Demo } from '../stores/feedbackStore';

const DemoUploadPage = () => {
  const navigate = useNavigate();
  const {
    requirements,
    demos,
    currentRequirement,
    uploadProgress,
    isLoading,
    error,
    fetchRequirements,
    fetchDemos,
    uploadDemo,
    setCurrentDemo,
    setUploadProgress,
  } = useFeedbackStore();

  const [selectedReqId, setSelectedReqId] = useState('');
  const [title, setTitle] = useState('');
  const [creator, setCreator] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRefs = useRef<{ [key: string]: HTMLAudioElement | null }>({});
  const [progress, setProgress] = useState<{ [key: string]: number }>({});
  const [volume, setVolume] = useState<{ [key: string]: number }>({});

  useEffect(() => {
    fetchRequirements();
  }, [fetchRequirements]);

  useEffect(() => {
    if (currentRequirement) {
      setSelectedReqId(currentRequirement.id);
      fetchDemos(currentRequirement.id);
    }
  }, [currentRequirement, fetchDemos]);

  useEffect(() => {
    if (selectedReqId) {
      fetchDemos(selectedReqId);
    }
  }, [selectedReqId, fetchDemos]);

  useEffect(() => {
    return () => {
      setUploadProgress(0);
    };
  }, [setUploadProgress]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        alert('文件大小不能超过10MB');
        return;
      }
      if (!file.type.includes('audio/mpeg') && !file.name.endsWith('.mp3')) {
        alert('请上传MP3格式的文件');
        return;
      }
      setSelectedFile(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedReqId || !title || !creator || !selectedFile) return;

    await uploadDemo(selectedReqId, title, creator, selectedFile);
    setTitle('');
    setCreator('');
    setSelectedFile(null);
    setShowUploadForm(false);
    setUploadProgress(0);
  };

  const togglePlay = (demo: Demo) => {
    const audio = audioRefs.current[demo.id];
    if (!audio) return;

    if (playingId === demo.id) {
      audio.pause();
      setPlayingId(null);
    } else {
      Object.entries(audioRefs.current).forEach(([id, a]) => {
        if (id !== demo.id && a) {
          a.pause();
          a.currentTime = 0;
        }
      });
      audio.play();
      setPlayingId(demo.id);
    }
  };

  const handleTimeUpdate = (demoId: string) => {
    const audio = audioRefs.current[demoId];
    if (audio) {
      const percent = (audio.currentTime / audio.duration) * 100;
      setProgress(prev => ({ ...prev, [demoId]: percent || 0 }));
    }
  };

  const handleProgressClick = (demoId: string, e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRefs.current[demoId];
    if (!audio) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    audio.currentTime = percent * audio.duration;
  };

  const handleVolumeChange = (demoId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const audio = audioRefs.current[demoId];
    const vol = parseFloat(e.target.value);
    if (audio) {
      audio.volume = vol;
    }
    setVolume(prev => ({ ...prev, [demoId]: vol }));
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const CircularProgress = ({ percent, size = 48 }: { percent: number; size?: number }) => {
    const strokeWidth = 4;
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percent / 100) * circumference;

    return (
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(0, 212, 255, 0.2)"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="#00d4ff"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.3s ease' }}
        />
        <text
          x={size / 2}
          y={size / 2}
          textAnchor="middle"
          dominantBaseline="middle"
          fill="#00d4ff"
          fontSize="12"
          fontWeight="bold"
          style={{ transform: 'rotate(90deg)', transformOrigin: 'center' }}
        >
          {percent}%
        </text>
      </svg>
    );
  };

  const AudioPlayer = ({ demo }: { demo: Demo }) => {
    const isPlaying = playingId === demo.id;
    const currentProgress = progress[demo.id] || 0;
    const currentVolume = volume[demo.id] ?? 1;

    return (
      <div style={{
        background: 'rgba(15, 15, 35, 0.8)',
        borderRadius: '8px',
        padding: '12px',
        marginTop: '12px',
      }}>
        <audio
          ref={(el) => { audioRefs.current[demo.id] = el; }}
          src={`http://localhost:3001${demo.file_path}`}
          onTimeUpdate={() => handleTimeUpdate(demo.id)}
          onEnded={() => {
            setPlayingId(null);
            setProgress(prev => ({ ...prev, [demo.id]: 0 }));
          }}
          onLoadedMetadata={(e) => {
            const audio = e.target as HTMLAudioElement;
            if (audio.duration) {
              audio.volume = currentVolume;
            }
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button
            onClick={() => togglePlay(demo)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
              border: 'none',
              color: '#fff',
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'all 0.2s ease',
              flexShrink: 0,
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'scale(1.1)';
              e.currentTarget.style.boxShadow = '0 4px 15px rgba(124,58,237,0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'scale(1)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            {isPlaying ? '⏸' : '▶'}
          </button>

          <div style={{ flex: 1 }}>
            <div
              onClick={(e) => handleProgressClick(demo.id, e)}
              style={{
                height: '6px',
                background: 'rgba(55, 65, 81, 0.5)',
                borderRadius: '3px',
                cursor: 'pointer',
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              <div style={{
                height: '100%',
                width: `${currentProgress}%`,
                background: 'linear-gradient(90deg, #7c3aed, #00d4ff)',
                borderRadius: '3px',
                transition: 'width 0.1s linear',
              }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#6b7280', marginTop: '4px' }}>
              <span>{formatDuration((currentProgress / 100) * (audioRefs.current[demo.id]?.duration || 0))}</span>
              <span>{formatDuration(audioRefs.current[demo.id]?.duration || 0)}</span>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <span style={{ fontSize: '14px', color: '#7c3aed' }}>🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={currentVolume}
              onChange={(e) => handleVolumeChange(demo.id, e)}
              style={{
                width: '60px',
                height: '4px',
                WebkitAppearance: 'none',
                appearance: 'none',
                background: 'rgba(124, 58, 237, 0.3)',
                borderRadius: '2px',
                outline: 'none',
                cursor: 'pointer',
              }}
            />
          </div>
        </div>
      </div>
    );
  };

  const DemoCard = ({ demo }: { demo: Demo }) => {
    return (
      <div
        style={{
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '16px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          transition: 'all 0.2s ease',
          contain: 'layout style paint',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-5px)';
          e.currentTarget.style.boxShadow = '0 8px 30px rgba(124,58,237,0.3)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
          <div>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#e0e0e0', marginBottom: '4px' }}>
              {demo.title}
            </h3>
            <p style={{ fontSize: '13px', color: '#9ca3af' }}>创作者: {demo.creator}</p>
          </div>
          <span style={{ fontSize: '11px', color: '#6b7280' }}>{formatDate(demo.created_at)}</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontSize: '12px' }}>
          <span style={{ color: '#6b7280' }}>📄</span>
          <span style={{ color: '#9ca3af' }}>{demo.filename}</span>
        </div>

        <AudioPlayer demo={demo} />

        <button
          onClick={() => {
            setCurrentDemo(demo);
            navigate('/feedback');
          }}
          style={{
            width: '100%',
            marginTop: '12px',
            padding: '10px',
            background: 'transparent',
            border: '1px solid rgba(124, 58, 237, 0.5)',
            color: '#a78bfa',
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(124, 58, 237, 0.2)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent';
          }}
        >
          查看/添加反馈
        </button>
      </div>
    );
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px' }}>
        <div>
          <h1 style={{ fontSize: '28px', fontWeight: 700, marginBottom: '8px' }}>Demo投稿</h1>
          <p style={{ color: '#9ca3af' }}>上传和管理您的音乐Demo</p>
        </div>
        <button
          onClick={() => setShowUploadForm(!showUploadForm)}
          disabled={requirements.length === 0}
          style={{
            padding: '12px 24px',
            background: requirements.length === 0
              ? '#374151'
              : 'linear-gradient(135deg, #7c3aed, #00d4ff)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: requirements.length === 0 ? 'not-allowed' : 'pointer',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            if (requirements.length > 0) {
              e.currentTarget.style.transform = 'scale(1.05)';
              e.currentTarget.style.boxShadow = '0 4px 20px rgba(124,58,237,0.4)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {showUploadForm ? '取消' : '+ 上传Demo'}
        </button>
      </div>

      {error && (
        <div style={{
          padding: '12px 16px',
          background: 'rgba(239, 68, 68, 0.1)',
          border: '1px solid rgba(239, 68, 68, 0.3)',
          borderRadius: '8px',
          color: '#ef4444',
          marginBottom: '24px',
        }}>
          {error}
        </div>
      )}

      <div style={{ marginBottom: '24px' }}>
        <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
          选择征集需求
        </label>
        <select
          value={selectedReqId}
          onChange={(e) => setSelectedReqId(e.target.value)}
          style={{
            width: '100%',
            maxWidth: '400px',
            padding: '12px 16px',
            background: 'rgba(26, 26, 46, 0.8)',
            border: '1px solid rgba(124, 58, 237, 0.3)',
            borderRadius: '8px',
            color: '#e0e0e0',
            fontSize: '14px',
            outline: 'none',
            cursor: 'pointer',
          }}
        >
          <option value="">-- 请选择 --</option>
          {requirements.map((req) => (
            <option key={req.id} value={req.id}>{req.title}</option>
          ))}
        </select>
      </div>

      {showUploadForm && (
        <form onSubmit={handleSubmit} style={{
          background: 'rgba(26, 26, 46, 0.8)',
          backdropFilter: 'blur(10px)',
          borderRadius: '12px',
          padding: '24px',
          marginBottom: '32px',
          border: '1px solid rgba(124, 58, 237, 0.2)',
          animation: 'fadeIn 0.3s ease-out',
        }}>
          <h2 style={{ fontSize: '20px', marginBottom: '20px' }}>上传Demo</h2>

          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                  作品名称 *
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例如：夏日回忆"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 15, 35, 0.8)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)'; }}
                />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                  创作者名 *
                </label>
                <input
                  type="text"
                  value={creator}
                  onChange={(e) => setCreator(e.target.value)}
                  placeholder="您的名字或艺名"
                  required
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    background: 'rgba(15, 15, 35, 0.8)',
                    border: '1px solid rgba(124, 58, 237, 0.3)',
                    borderRadius: '8px',
                    color: '#e0e0e0',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.2s',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = '#7c3aed'; }}
                  onBlur={(e) => { e.target.style.borderColor = 'rgba(124, 58, 237, 0.3)'; }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '14px', marginBottom: '8px', color: '#d1d5db' }}>
                上传MP3文件 *
              </label>
              <div style={{
                border: '2px dashed rgba(124, 58, 237, 0.3)',
                borderRadius: '8px',
                padding: '24px',
                textAlign: 'center',
                background: 'rgba(15, 15, 35, 0.5)',
                transition: 'all 0.2s ease',
              }}>
                {selectedFile ? (
                  <div>
                    <div style={{ fontSize: '14px', color: '#a78bfa', marginBottom: '4px' }}>
                      ✓ 已选择文件
                    </div>
                    <div style={{ fontSize: '13px', color: '#9ca3af' }}>
                      {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      style={{
                        marginTop: '8px',
                        background: 'none',
                        border: 'none',
                        color: '#ef4444',
                        fontSize: '12px',
                        cursor: 'pointer',
                      }}
                    >
                      重新选择
                    </button>
                  </div>
                ) : (
                  <label style={{ cursor: 'pointer' }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>🎵</div>
                    <div style={{ fontSize: '14px', color: '#a78bfa', marginBottom: '4px' }}>
                      点击选择文件
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      支持MP3格式，最大10MB
                    </div>
                    <input
                      type="file"
                      accept=".mp3,audio/mpeg"
                      onChange={handleFileChange}
                      style={{ display: 'none' }}
                    />
                  </label>
                )}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginTop: '24px' }}>
            <button
              type="button"
              onClick={() => {
                setShowUploadForm(false);
                setTitle('');
                setCreator('');
                setSelectedFile(null);
                setUploadProgress(0);
              }}
              style={{
                padding: '12px 24px',
                background: 'transparent',
                border: '1px solid rgba(124, 58, 237, 0.5)',
                color: '#a78bfa',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(124, 58, 237, 0.1)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
            >
              取消
            </button>
            <button
              type="submit"
              disabled={isLoading || !selectedReqId || !title || !creator || !selectedFile}
              style={{
                padding: '12px 32px',
                background: 'linear-gradient(135deg, #7c3aed, #00d4ff)',
                color: '#fff',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: isLoading ? 'not-allowed' : 'pointer',
                opacity: isLoading || !selectedReqId || !title || !creator || !selectedFile ? 0.7 : 1,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                if (!isLoading && selectedReqId && title && creator && selectedFile) {
                  e.currentTarget.style.transform = 'scale(1.05)';
                }
              }}
              onMouseLeave={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
            >
              {isLoading ? '上传中...' : '上传Demo'}
            </button>
            {isLoading && uploadProgress > 0 && (
              <div style={{ marginLeft: '16px' }}>
                <CircularProgress percent={uploadProgress} />
              </div>
            )}
          </div>
        </form>
      )}

      {selectedReqId ? (
        <>
          <h2 style={{ fontSize: '18px', marginBottom: '16px', color: '#d1d5db' }}>
            Demo列表 ({demos.length})
          </h2>
          {isLoading && demos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#6b7280' }}>
              加载中...
            </div>
          ) : demos.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              background: 'rgba(26, 26, 46, 0.5)',
              borderRadius: '12px',
              border: '1px dashed rgba(124, 58, 237, 0.3)',
            }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎤</div>
              <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#e0e0e0' }}>暂无Demo</h3>
              <p style={{ color: '#6b7280' }}>点击上方"上传Demo"按钮提交您的作品</p>
            </div>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
              gap: '20px',
            }}>
              {demos.map((demo) => (
                <DemoCard key={demo.id} demo={demo} />
              ))}
            </div>
          )}
        </>
      ) : (
        <div style={{
          textAlign: 'center',
          padding: '60px 20px',
          background: 'rgba(26, 26, 46, 0.5)',
          borderRadius: '12px',
          border: '1px dashed rgba(124, 58, 237, 0.3)',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <h3 style={{ fontSize: '18px', marginBottom: '8px', color: '#e0e0e0' }}>请先选择征集需求</h3>
          <p style={{ color: '#6b7280' }}>从上方下拉框选择一个征集需求，即可查看和上传Demo</p>
        </div>
      )}
    </div>
  );
};

export default DemoUploadPage;
