import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { Filter, Eye, EyeOff, Search, Plus, Palette, X } from 'lucide-react';

const HeritageFilter = ({ onClose }) => {
  const { allHeritages, hiddenHeritages, toggleHeritageVisibility, heritageColors, saveHeritageColor } = useFamily();
  const [query, setQuery] = useState('');
  const [newHeritage, setNewHeritage] = useState('');
  const [activeColorPicker, setActiveColorPicker] = useState(null);

  const defaultColors = ['#45b7ae', '#e0899a', '#f59e0b', '#8b5cf6', '#3b82f6', '#ec4899', '#10b981'];

  const filtered = allHeritages.filter(h => h.toLowerCase().includes(query.toLowerCase()));

  const handleAddHeritage = (e) => {
    e.preventDefault();
    if (!newHeritage.trim()) return;
    const name = newHeritage.trim();
    if (!heritageColors[name]) {
      const color = defaultColors[Object.keys(heritageColors).length % defaultColors.length];
      saveHeritageColor(name, color);
    }
    setNewHeritage('');
  };

  return (
    <div style={{
      position: 'fixed',
      bottom: 80, right: 16,
      width: 320,
      background: 'rgba(15, 23, 42, 0.92)',
      backdropFilter: 'blur(16px)',
      border: '1px solid rgba(69, 183, 174, 0.3)',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
      zIndex: 1000,
      padding: 16,
      display: 'flex', flexDirection: 'column', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-primary)', fontWeight: 700, fontSize: '0.92rem' }}>
          <Filter size={16} color="var(--accent-color)" />
          Family Heritage & Color Legend
        </div>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </div>

      {/* Search */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.05)', padding: '6px 10px', borderRadius: 8, border: '1px solid rgba(69,183,174,0.15)' }}>
        <Search size={14} color="var(--text-secondary)" />
        <input
          type="text"
          placeholder="Filter family names..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{ background: 'transparent', border: 'none', color: 'var(--text-primary)', fontSize: '0.8rem', outline: 'none', width: '100%' }}
        />
      </div>

      {/* Add New Heritage Legend */}
      <form onSubmit={handleAddHeritage} style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          placeholder="Add family clan/surname..."
          value={newHeritage}
          onChange={e => setNewHeritage(e.target.value)}
          style={{ flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(69,183,174,0.15)', borderRadius: 8, padding: '4px 8px', color: 'var(--text-primary)', fontSize: '0.78rem' }}
        />
        <button type="submit" style={{ padding: '4px 10px', background: 'var(--accent-color)', border: 'none', borderRadius: 8, color: 'white', fontWeight: 700, fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}>
          <Plus size={12} /> Add
        </button>
      </form>

      {/* Heritage List */}
      <div style={{ maxHeight: 200, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {filtered.length === 0 ? (
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', textAlign: 'center', padding: 12 }}>
            No heritages added yet. Assign heritages to members to filter them here.
          </div>
        ) : (
          filtered.map(name => {
            const isHidden = hiddenHeritages.has(name);
            const currentColor = heritageColors[name] || '#45b7ae';

            return (
              <div
                key={name}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '6px 10px',
                  background: isHidden ? 'rgba(255,255,255,0.02)' : 'rgba(69,183,174,0.08)',
                  borderRadius: 8,
                  border: `1px solid ${isHidden ? 'rgba(255,255,255,0.05)' : currentColor + '40'}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="color"
                    value={currentColor}
                    onChange={e => saveHeritageColor(name, e.target.value)}
                    style={{ width: 18, height: 18, border: 'none', borderRadius: '50%', cursor: 'pointer', background: 'transparent' }}
                    title="Change family line color"
                  />
                  <span style={{ fontSize: '0.82rem', fontWeight: 600, color: isHidden ? 'var(--text-secondary)' : 'var(--text-primary)', textDecoration: isHidden ? 'line-through' : 'none' }}>
                    {name}
                  </span>
                </div>

                <button
                  onClick={() => toggleHeritageVisibility(name)}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: isHidden ? 'var(--text-secondary)' : 'var(--accent-color)' }}
                  title={isHidden ? "Show family members" : "Hide family members"}
                >
                  {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default HeritageFilter;
