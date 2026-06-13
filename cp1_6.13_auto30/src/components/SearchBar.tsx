import React, { useState, useEffect, useRef } from 'react';

interface SearchBarProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  delay?: number;
}

const SearchBar: React.FC<SearchBarProps> = ({
  onSearch,
  placeholder = '搜索歌手、歌名或专辑...',
  delay = 300,
}) => {
  const [query, setQuery] = useState('');
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    timeoutRef.current = setTimeout(() => {
      onSearch(query);
    }, delay);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [query, onSearch, delay]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  };

  return (
    <div className="search-bar">
      <div className="search-bar__icon">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
      </div>
      <input
        type="text"
        className="search-bar__input"
        placeholder={placeholder}
        value={query}
        onChange={handleChange}
      />
      {query && (
        <button
          className="search-bar__clear"
          onClick={() => setQuery('')}
          aria-label="清除搜索"
        >
          ×
        </button>
      )}
    </div>
  );
};

export default SearchBar;
