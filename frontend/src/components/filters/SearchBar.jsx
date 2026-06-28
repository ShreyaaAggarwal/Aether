import { memo } from 'react';

export const SearchBar = memo(function SearchBar({ value, onChange, resultCount }) {
  return (
    <div className="search-bar">
      <span className="search-bar__icon" aria-hidden="true">⌕</span>
      <input
        type="text"
        className="search-bar__input mono"
        placeholder="Search project, company, partner, country…"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label="Search telemetry records"
      />
      {value && (
        <>
          <span className="search-bar__count">{resultCount.toLocaleString()}</span>
          <button
            className="search-bar__clear"
            onClick={() => onChange('')}
            aria-label="Clear search"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
});