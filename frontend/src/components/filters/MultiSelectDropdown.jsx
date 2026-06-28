import { memo, useState, useRef, useEffect, useMemo } from 'react';

/**
 * MultiSelectDropdown
 * ----------------------------------------------------------------------
 * Feature 7: beautiful, searchable, multi-choice dropdown filter for one
 * categorical field. Selected values render as removable chips inline in
 * the trigger button so the active filter state is always visible without
 * opening the panel.
 */
export const MultiSelectDropdown = memo(function MultiSelectDropdown({
  label,
  options,
  selected,
  onToggle,
  onClear,
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef(null);

  useEffect(() => {
    function handleOutside(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const filteredOptions = useMemo(() => {
    if (!query) return options;
    const q = query.toLowerCase();
    return options.filter((opt) => opt.toLowerCase().includes(q));
  }, [options, query]);

  return (
    <div className="multiselect" ref={rootRef}>
      <button
        className={`multiselect__trigger ${selected.size > 0 ? 'multiselect__trigger--active' : ''}`}
        onClick={() => setIsOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="multiselect__label">{label}</span>
        {selected.size > 0 && <span className="multiselect__badge">{selected.size}</span>}
        <span className="multiselect__chevron" aria-hidden="true">⌄</span>
      </button>

      {isOpen && (
        <div className="multiselect__panel" role="listbox">
          <input
            type="text"
            className="multiselect__search mono"
            placeholder={`Filter ${label.toLowerCase()}…`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
          <div className="multiselect__options">
            {filteredOptions.length === 0 && (
              <div className="multiselect__empty">No matches</div>
            )}
            {filteredOptions.map((opt) => (
              <label key={opt} className="multiselect__option">
                <input
                  type="checkbox"
                  checked={selected.has(opt)}
                  onChange={() => onToggle(opt)}
                />
                <span>{opt}</span>
              </label>
            ))}
          </div>
          {selected.size > 0 && (
            <button className="multiselect__clear" onClick={onClear}>
              Clear {label}
            </button>
          )}
        </div>
      )}

      {selected.size > 0 && (
        <div className="multiselect__chips">
          {Array.from(selected).map((value) => (
            <span key={value} className="filter-chip">
              {value}
              <button
                onClick={() => onToggle(value)}
                aria-label={`Remove ${value} filter`}
                className="filter-chip__remove"
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
});