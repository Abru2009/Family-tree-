import React, { useState, useRef, useEffect } from 'react';
import { Search, ChevronDown, Check, X } from 'lucide-react';

const SearchableSelect = ({ options = [], value, onChange, placeholder = "Select...", label, style }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Format options: convert string array or object array to [{ value, label }]
  const formattedOptions = options.map(opt => {
    if (typeof opt === 'string') return { value: opt, label: opt };
    return opt;
  }).sort((a, b) => a.label.localeCompare(b.label));

  const filtered = formattedOptions.filter(opt =>
    opt.label.toLowerCase().includes(query.toLowerCase())
  );

  const selectedOption = formattedOptions.find(o => o.value === value);

  return (
    <div ref={containerRef} style={{ position: 'relative', ...style }}>
      {label && <label className="label">{label}</label>}
      <div
        onClick={() => setOpen(!open)}
        className="input"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          userSelect: 'none',
        }}
      >
        <span style={{ color: selectedOption ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} color="var(--text-secondary)" />
      </div>

      {open && (
        <div style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          right: 0,
          marginTop: 4,
          background: 'rgba(15, 23, 42, 0.95)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(69, 183, 174, 0.3)',
          borderRadius: 12,
          boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
          zIndex: 9999,
          overflow: 'hidden',
        }}>
          <div style={{ padding: 8, borderBottom: '1px solid rgba(69, 183, 174, 0.15)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <Search size={14} color="var(--text-secondary)" />
            <input
              type="text"
              placeholder="Search..."
              value={query}
              onChange={e => setQuery(e.target.value)}
              autoFocus
              style={{
                background: 'transparent',
                border: 'none',
                color: 'var(--text-primary)',
                fontSize: '0.85rem',
                outline: 'none',
                width: '100%',
              }}
            />
            {query && (
              <X size={14} color="var(--text-secondary)" style={{ cursor: 'pointer' }} onClick={() => setQuery('')} />
            )}
          </div>

          <div style={{ maxHeight: 180, overflowY: 'auto', padding: 4 }}>
            {filtered.length === 0 ? (
              <div style={{ padding: '8px 12px', fontSize: '0.8rem', color: 'var(--text-secondary)', textAlign: 'center' }}>
                No options found
              </div>
            ) : (
              filtered.map(opt => (
                <div
                  key={opt.value}
                  onClick={() => {
                    onChange(opt.value);
                    setOpen(false);
                    setQuery('');
                  }}
                  style={{
                    padding: '8px 12px',
                    fontSize: '0.85rem',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    color: opt.value === value ? 'var(--accent-color)' : 'var(--text-primary)',
                    background: opt.value === value ? 'rgba(69, 183, 174, 0.12)' : 'transparent',
                  }}
                >
                  <span>{opt.label}</span>
                  {opt.value === value && <Check size={14} />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;
