import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import type { RSVP } from '../types';
import RSVPModal from './RSVPModal';

declare global {
  interface Window {
    L: any;
  }
}

const WeddingPage: React.FC = () => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [pulseKey, setPulseKey] = useState(0);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [rsvps, setRsvps] = useState<RSVP[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInitialized = useRef(false);

  const weddingDate = new Date('2026-10-01T18:00:00').getTime();
  const groomName = '张晨阳';
  const brideName = '李雨萱';

  const carouselImages = [
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=romantic%20wedding%20photo%20of%20a%20happy%20couple%20in%20a%20beautiful%20garden%20with%20soft%20golden%20light%20and%20flowers&image_size=landscape_16_9',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=elegant%20wedding%20venue%20decorated%20with%20white%20roses%20and%20golden%20lights%20romantic%20atmosphere&image_size=landscape_16_9',
    'https://trae-api-cn.mchost.guru/api/ide/v1/text_to_image?prompt=wedding%20rings%20on%20a%20beautiful%20book%20with%20roses%20and%20candles%20soft%20focus%20romantic&image_size=landscape_16_9'
  ];

  const cardColors = ['#FFF8E1', '#FFE0B2', '#F3E5F5'];

  const getRandomColor = () => cardColors[Math.floor(Math.random() * cardColors.length)];
  const getAvatarUrl = (name: string) => `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`;

  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date().getTime();
      const distance = weddingDate - now;

      if (distance > 0) {
        setTimeLeft({
          days: Math.floor(distance / (1000 * 60 * 60 * 24)),
          hours: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          minutes: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          seconds: Math.floor((distance % (1000 * 60)) / 1000)
        });
        setPulseKey(prev => prev + 1);
      }
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % carouselImages.length);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const loadMap = () => {
      if (mapRef.current && !mapInitialized.current && window.L) {
        const map = window.L.map(mapRef.current).setView([31.2304, 121.4737], 15);
        window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap contributors'
        }).addTo(map);
        window.L.marker([31.2304, 121.4737])
          .addTo(map)
          .bindPopup('上海外滩华尔道夫酒店<br/>婚礼宴会厅')
          .openPopup();
        mapInitialized.current = true;
      }
    };

    if (window.L) {
      loadMap();
    } else {
      const script = document.createElement('script');
      script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
      script.onload = loadMap;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    const fetchRsvps = async () => {
      try {
        const response = await axios.get('/api/rsvp');
        if (response.data.success) {
          setRsvps(response.data.data.filter((r: RSVP) => r.message.trim() !== ''));
        }
      } catch (error) {
        console.error('Failed to fetch RSVPs:', error);
      }
    };

    fetchRsvps();
  }, []);

  const handleRSVPSubmitted = () => {
    setShowSuccess(true);
    setTimeout(() => setShowSuccess(false), 3000);

    const fetchRsvps = async () => {
      try {
        const response = await axios.get('/api/rsvp');
        if (response.data.success) {
          setRsvps(response.data.data.filter((r: RSVP) => r.message.trim() !== ''));
        }
      } catch (error) {
        console.error('Failed to fetch RSVPs:', error);
      }
    };
    fetchRsvps();
  };

  const countdownContainerStyle: React.CSSProperties = {
    display: 'flex',
    justifyContent: 'center',
    gap: '20px',
    marginTop: '20px',
    flexWrap: 'wrap'
  };

  const countdownItemStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center'
  };

  const countdownNumberStyle: React.CSSProperties = {
    fontSize: '48px',
    fontWeight: 'bold',
    color: '#FF6B6B',
    fontFamily: "'Playfair Display', serif",
    animation: 'pulse 1s ease-in-out infinite'
  };

  const countdownLabelStyle: React.CSSProperties = {
    fontSize: '14px',
    color: '#757575',
    marginTop: '4px'
  };

  const carouselContainerStyle: React.CSSProperties = {
    position: 'relative',
    width: '100%',
    height: '500px',
    overflow: 'hidden',
    marginTop: '40px',
    borderRadius: '12px'
  };

  const carouselImageStyle: React.CSSProperties = {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    opacity: 0,
    transition: 'opacity 1s ease-in-out'
  };

  const carouselActiveStyle: React.CSSProperties = {
    ...carouselImageStyle,
    opacity: 1
  };

  const carouselDotsStyle: React.CSSProperties = {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    display: 'flex',
    gap: '10px'
  };

  const dotStyle: React.CSSProperties = {
    width: '12px',
    height: '12px',
    borderRadius: '50%',
    backgroundColor: '#E0E0E0',
    border: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease'
  };

  const activeDotStyle: React.CSSProperties = {
    ...dotStyle,
    backgroundColor: '#FFD93D',
    transform: 'scale(1.3)'
  };

  const mapContainerStyle: React.CSSProperties = {
    width: '100%',
    height: '400px',
    borderRadius: '12px',
    border: '2px solid #D4A574',
    overflow: 'hidden',
    marginTop: '40px'
  };

  const messageWallStyle: React.CSSProperties = {
    marginTop: '60px'
  };

  const messageGridStyle: React.CSSProperties = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, 200px)',
    gap: '20px',
    justifyContent: 'center',
    marginTop: '30px'
  };

  const messageCardStyle: React.CSSProperties = {
    padding: '20px',
    borderRadius: '12px',
    transition: 'all 0.2s ease-out',
    cursor: 'default'
  };

  const avatarStyle: React.CSSProperties = {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    marginBottom: '12px'
  };

  const rsvpButtonStyle: React.CSSProperties = {
    padding: '14px 40px',
    fontSize: '14px',
    fontWeight: 600,
    color: '#FFFFFF',
    background: 'linear-gradient(135deg, #FFD93D 0%, #FFB347 100%)',
    border: 'none',
    borderRadius: '30px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    marginTop: '30px',
    fontFamily: "'Noto Serif SC', serif"
  };

  const successToastStyle: React.CSSProperties = {
    position: 'fixed',
    bottom: '40px',
    left: '50%',
    transform: 'translateX(-50%)',
    backgroundColor: '#4CAF50',
    color: '#FFFFFF',
    padding: '16px 32px',
    borderRadius: '8px',
    fontSize: '16px',
    fontWeight: 500,
    zIndex: 1000,
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
    animation: 'slideUp 0.3s ease'
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '40px 20px' }}>
      <style>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }
        @keyframes slideUp {
          from { transform: translateX(-50%) translateY(20px); opacity: 0; }
          to { transform: translateX(-50%) translateY(0); opacity: 1; }
        }
        .message-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 8px 24px rgba(0, 0, 0, 0.125);
        }
        .rsvp-button:hover {
          font-size: 16px;
          filter: brightness(1.1);
        }
      `}</style>

      <div style={{ textAlign: 'center', marginBottom: '60px' }}>
        <p style={{ color: '#D4A574', fontSize: '18px', letterSpacing: '4px', marginBottom: '16px' }}>
          我们结婚啦
        </p>
        <h1 style={{
          fontSize: '56px',
          fontFamily: "'Playfair Display', serif",
          color: '#333333',
          marginBottom: '12px',
          fontWeight: 700
        }}>
          {groomName} <span style={{ color: '#D4A574' }}>&</span> {brideName}
        </h1>
        <p style={{ fontSize: '18px', color: '#757575' }}>
          2026年10月1日 · 上海外滩华尔道夫酒店
        </p>

        <div style={countdownContainerStyle}>
          <div style={countdownItemStyle}>
            <span key={`days-${pulseKey}`} style={countdownNumberStyle}>
              {String(timeLeft.days).padStart(2, '0')}
            </span>
            <span style={countdownLabelStyle}>天</span>
          </div>
          <div style={countdownItemStyle}>
            <span key={`hours-${pulseKey}`} style={countdownNumberStyle}>
              {String(timeLeft.hours).padStart(2, '0')}
            </span>
            <span style={countdownLabelStyle}>时</span>
          </div>
          <div style={countdownItemStyle}>
            <span key={`minutes-${pulseKey}`} style={countdownNumberStyle}>
              {String(timeLeft.minutes).padStart(2, '0')}
            </span>
            <span style={countdownLabelStyle}>分</span>
          </div>
          <div style={countdownItemStyle}>
            <span key={`seconds-${pulseKey}`} style={countdownNumberStyle}>
              {String(timeLeft.seconds).padStart(2, '0')}
            </span>
            <span style={countdownLabelStyle}>秒</span>
          </div>
        </div>

        <button
          className="rsvp-button"
          style={rsvpButtonStyle}
          onClick={() => setIsModalOpen(true)}
        >
          确认出席
        </button>
      </div>

      <div style={carouselContainerStyle}>
        {carouselImages.map((img, index) => (
          <img
            key={index}
            src={img}
            alt={`婚礼照片 ${index + 1}`}
            style={index === currentSlide ? carouselActiveStyle : carouselImageStyle}
          />
        ))}
        <div style={carouselDotsStyle}>
          {carouselImages.map((_, index) => (
            <button
              key={index}
              style={index === currentSlide ? activeDotStyle : dotStyle}
              onClick={() => setCurrentSlide(index)}
            />
          ))}
        </div>
      </div>

      <div style={{ marginTop: '40px', textAlign: 'center' }}>
        <h2 style={{
          fontSize: '28px',
          fontFamily: "'Playfair Display', serif",
          color: '#333333',
          marginBottom: '12px'
        }}>
          婚礼地点
        </h2>
        <p style={{ color: '#757575', marginBottom: '8px' }}>上海外滩华尔道夫酒店 · 三楼大宴会厅</p>
        <p style={{ color: '#999999', fontSize: '14px' }}>上海市黄浦区中山东一路2号</p>
      </div>

      <div ref={mapRef} style={mapContainerStyle} />

      <div style={messageWallStyle}>
        <h2 style={{
          fontSize: '28px',
          fontFamily: "'Playfair Display', serif",
          color: '#333333',
          textAlign: 'center',
          marginBottom: '12px'
        }}>
          宾客祝福
        </h2>
        <p style={{ color: '#757575', textAlign: 'center' }}>来自亲友们的美好祝愿</p>

        <div style={messageGridStyle}>
          {rsvps.map(rsvp => (
            <div
              key={rsvp.id}
              className="message-card"
              style={{
                ...messageCardStyle,
                backgroundColor: getRandomColor()
              }}
            >
              <img
                src={getAvatarUrl(rsvp.name)}
                alt={rsvp.name}
                style={avatarStyle}
              />
              <p style={{
                fontSize: '14px',
                fontWeight: 600,
                color: '#333333',
                marginBottom: '8px'
              }}>
                {rsvp.name}
              </p>
              <p style={{
                fontSize: '13px',
                color: '#666666',
                lineHeight: 1.6,
                wordBreak: 'break-word'
              }}>
                {rsvp.message}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ textAlign: 'center', marginTop: '60px', padding: '40px 0', borderTop: '1px solid #F0F0F0' }}>
        <button
          className="rsvp-button"
          style={rsvpButtonStyle}
          onClick={() => setIsModalOpen(true)}
        >
          确认出席
        </button>
        <p style={{ marginTop: '20px', color: '#999999', fontSize: '13px' }}>
          点击 <a href="/admin" style={{ color: '#D4A574', textDecoration: 'none' }}>这里</a> 进入管理后台
        </p>
      </div>

      {isModalOpen && (
        <RSVPModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmitted={handleRSVPSubmitted}
        />
      )}

      {showSuccess && (
        <div style={successToastStyle}>
          感谢您的回复！
        </div>
      )}
    </div>
  );
};

export default WeddingPage;
