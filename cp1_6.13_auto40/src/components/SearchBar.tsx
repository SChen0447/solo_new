import { useState, useEffect, useRef, KeyboardEvent } from 'react';
import { useApp } from '../context/AppContext';

const SearchBar = () => {
  const { currentWord, searchWord, isSearching, pageMode, clearSearch } = useApp();
  const [inputValue, setInputValue] = useState(currentWord);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setInputValue(currentWord);
  }, [currentWord]);

  useEffect(() => {
    if (pageMode === 'home' && !isFocused) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [pageMode]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      e.preventDefault();
      searchWord(inputValue);
    }
  };

  const handleClear = () => {
    setInputValue('');
    clearSearch();
    inputRef.current?.focus();
  };

  const handleSearchClick = () => {
    if (inputValue.trim()) {
      searchWord(inputValue);
    }
  };

  return (
    <div
      style={{
        width: '100%',
        maxWidth: pageMode === 'home' ? '600px' : '100%',
        margin: '0 auto',
        transition: 'max-width 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '16px',
          padding: '8px 8px 8px 24px',
          background: isFocused
            ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.25), rgba(168, 85, 247, 0.25))'
            : 'rgba(22, 33, 62, 0.8)',
          border: `2px solid ${isFocused ? 'rgba(139, 92, 246, 0.6)' : 'rgba(99, 102, 241, 0.2)'}`,
          backdropFilter: 'blur(12px)',
          boxShadow: isFocused
            ? '0 0 40px rgba(139, 92, 246, 0.25), 0 8px 32px rgba(0, 0, 0, 0.3)'
            : '0 4px 24px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: '-2px',
            left: '-2px',
            right: '-2px',
            bottom: '-2px',
            borderRadius: '18px',
            background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.4), rgba(168, 85, 247, 0.4), rgba(99, 102, 241, 0.4))',
            backgroundSize: '200% 200%',
            animation: isFocused ? 'gradientShift 3s ease infinite' : 'none',
            zIndex: -1,
            opacity: isFocused ? 0.6 : 0,
            transition: 'opacity 0.3s',
            filter: 'blur(8px)',
          }}
        />

        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke={isFocused ? '#a78bfa' : '#6366f1'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            flexShrink: 0,
            marginRight: '12px',
            transition: 'all 0.3s',
            transform: isSearching ? 'rotate(45deg)' : 'rotate(0)',
          }}
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="输入英文单词，按回车搜索..."
          style={{
            flex: 1,
            padding: '16px 8px',
            background: 'transparent',
            border: 'none',
            outline: 'none',
            color: '#e0e7ff',
            fontSize: pageMode === 'home' ? '18px' : '16px',
            fontWeight: 500,
            fontFamily: 'inherit',
            letterSpacing: '0.02em',
          }}
        />

        {inputValue && (
          <button
            onClick={handleClear}
            style={{
              width: '36px',
              height: '36px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(99, 102, 241, 0.15)',
              color: '#a5b4fc',
              cursor: 'pointer',
              marginRight: '8px',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.3)';
              e.currentTarget.style.color = '#ffffff';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(99, 102, 241, 0.15)';
              e.currentTarget.style.color = '#a5b4fc';
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        )}

        <button
          onClick={handleSearchClick}
          disabled={!inputValue.trim() || isSearching}
          style={{
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            background: inputValue.trim()
              ? 'linear-gradient(135deg, #6366f1, #a855f7)'
              : 'rgba(99, 102, 241, 0.2)',
            color: inputValue.trim() ? '#ffffff' : 'rgba(165, 180, 252, 0.5)',
            fontSize: '14px',
            fontWeight: 600,
            cursor: inputValue.trim() && !isSearching ? 'pointer' : 'not-allowed',
            transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            boxShadow: inputValue.trim() && !isSearching
              ? '0 4px 16px rgba(99, 102, 241, 0.4)'
              : 'none',
            letterSpacing: '0.03em',
          }}
          onMouseEnter={(e) => {
            if (inputValue.trim() && !isSearching) {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 6px 24px rgba(99, 102, 241, 0.5)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = inputValue.trim() && !isSearching
              ? '0 4px 16px rgba(99, 102, 241, 0.4)'
              : 'none';
          }}
        >
          {isSearching ? (
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" style={{ animation: 'spin 0.8s linear infinite' }}>
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.3" />
                <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
              </svg>
              搜索中
            </span>
          ) : (
            '搜索'
          )}
        </button>
      </div>

      {pageMode === 'home' && (
        <div
          style={{
            marginTop: '20px',
            display: 'flex',
            justifyContent: 'center',
            flexWrap: 'wrap',
            gap: '10px',
          }}
        >
          {['incredible', 'biology', 'photograph', 'telephone', 'transform'].map((word) => (
            <button
              key={word}
              onClick={() => searchWord(word)}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                border: '1px solid rgba(99, 102, 241, 0.3)',
                background: 'rgba(22, 33, 62, 0.6)',
                color: '#a5b4fc',
                fontSize: '13px',
                fontFamily: 'inherit',
                cursor: 'pointer',
                transition: 'all 0.25s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(99, 102, 241, 0.25)';
                e.currentTarget.style.borderColor = 'rgba(139, 92, 246, 0.5)';
                e.currentTarget.style.color = '#ffffff';
                e.currentTarget.style.transform = 'translateY(-1px)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'rgba(22, 33, 62, 0.6)';
                e.currentTarget.style.borderColor = 'rgba(99, 102, 241, 0.3)';
                e.currentTarget.style.color = '#a5b4fc';
                e.currentTarget.style.transform = 'translateY(0)';
              }}
            >
              {word}
            </button>
          ))}
        </div>
      )}

      <style>{`
        @keyframes gradientShift {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        input::placeholder {
          color: rgba(165, 180, 252, 0.4);
        }
      `}</style>
    </div>
  );
};

export default SearchBar;
