import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { X, Plus, Trash2, User, ChevronDown, ChevronUp } from 'lucide-react';
import ImageCropper from './ImageCropper';

// ─── Child Row ────────────────────────────────────────────────────────────────
const today = new Date().toISOString().split('T')[0];

const ChildRow = ({ index, child, onChange, onRemove }) => {
  return (
    <div style={{
      background: 'rgba(69,183,174,0.05)',
      border: '1.5px solid rgba(69,183,174,0.18)',
      borderRadius: 12,
      padding: '14px 16px',
      display: 'flex',
      flexDirection: 'column',
      gap: 10,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--accent-color)' }}>
          Child {index + 1}
        </span>
        <button
          type="button"
          onClick={onRemove}
          style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', padding: 4 }}
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div style={{ display: 'flex', gap: 10 }}>
        <div style={{ flex: 2 }}>
          <label className="label" style={{ fontSize: '0.7rem' }}>Name</label>
          <input
            className="input"
            style={{ fontSize: '0.85rem', padding: '7px 10px' }}
            placeholder={`Child ${index + 1} name`}
            value={child.name}
            onChange={e => onChange('name', e.target.value)}
          />
        </div>
        <div style={{ flex: 1 }}>
          <label className="label" style={{ fontSize: '0.7rem' }}>Gender</label>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {['male', 'female'].map(g => (
              <button
                key={g}
                type="button"
                onClick={() => onChange('gender', g)}
                style={{
                  flex: 1, padding: '6px 0', borderRadius: 8,
                  border: '1.5px solid',
                  borderColor: child.gender === g ? 'var(--accent-color)' : 'rgba(69,183,174,0.25)',
                  background:  child.gender === g ? 'rgba(69,183,174,0.15)' : 'transparent',
                  color: child.gender === g ? 'var(--accent-color)' : 'var(--text-secondary)',
                  fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {g === 'male' ? '♂' : '♀'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div>
        <label className="label" style={{ fontSize: '0.7rem' }}>Date of Birth</label>
        <input
          className="input"
          type="date"
          max={today}
          style={{ fontSize: '0.85rem', padding: '7px 10px' }}
          value={child.birthDate}
          onChange={e => onChange('birthDate', e.target.value)}
        />
      </div>
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
const BulkChildModal = ({ parentId, onClose }) => {
  const { data, addBulkChildren } = useFamily();
  const parent = data.members.find(m => m.id === parentId);
  const [childCount, setChildCount] = useState(1);
  const [children, setChildren] = useState([
    { name: '', gender: 'male', birthDate: '' },
  ]);

  const updateCount = (val) => {
    const n = Math.max(1, Math.min(20, val));
    setChildCount(n);
    setChildren(prev => {
      if (n > prev.length) {
        return [...prev, ...Array(n - prev.length).fill(null).map(() => ({ name: '', gender: 'male', birthDate: '' }))];
      }
      return prev.slice(0, n);
    });
  };

  const updateChild = (index, field, value) => {
    setChildren(prev => prev.map((c, i) => i === index ? { ...c, [field]: value } : c));
  };

  const removeChild = (index) => {
    if (children.length === 1) return;
    setChildren(prev => prev.filter((_, i) => i !== index));
    setChildCount(c => c - 1);
  };

  const addRow = () => updateCount(childCount + 1);

  const handleSubmit = (e) => {
    e.preventDefault();
    const valid = children.filter(c => c.name.trim());
    if (!valid.length) return;
    addBulkChildren(parentId, valid);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10,18,35,0.7)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200,
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: 480,
        padding: '24px', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto',
        borderRadius: 20,
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}>
          <X size={18} />
        </button>

        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', marginBottom: 4 }}>
          👶 Add Children
        </h2>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginBottom: 20 }}>
          {parent ? `Adding children for ${parent.name}` : 'Bulk add children'}
        </p>

        {/* Quick count setter */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '12px 16px', background: 'rgba(69,183,174,0.08)', borderRadius: 12, border: '1px solid rgba(69,183,174,0.2)' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', flex: 1 }}>
            Number of Children
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <button type="button" onClick={() => updateCount(childCount - 1)}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(69,183,174,0.15)', border: '1px solid rgba(69,183,174,0.3)', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>−</button>
            <input
              type="number" min={1} max={20}
              value={childCount}
              onChange={e => updateCount(parseInt(e.target.value) || 1)}
              style={{ width: 48, textAlign: 'center', background: 'rgba(69,183,174,0.08)', border: '1px solid rgba(69,183,174,0.25)', borderRadius: 8, color: 'var(--text-primary)', padding: '4px', fontSize: '0.9rem', fontWeight: 700 }}
            />
            <button type="button" onClick={() => updateCount(childCount + 1)}
              style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(69,183,174,0.15)', border: '1px solid rgba(69,183,174,0.3)', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 700, fontSize: '1rem' }}>+</button>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
            {children.map((child, i) => (
              <ChildRow
                key={i}
                index={i}
                child={child}
                onChange={(field, val) => updateChild(i, field, val)}
                onRemove={() => removeChild(i)}
              />
            ))}
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button
              type="button"
              onClick={addRow}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: 'transparent', border: '1.5px dashed rgba(69,183,174,0.4)',
                color: 'var(--accent-color)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}
            >
              <Plus size={14} /> Add Row
            </button>
            <button
              type="submit"
              className="btn"
              style={{ flex: 2, padding: '10px' }}
            >
              ✅ Save {children.filter(c => c.name.trim()).length || ''} Children
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BulkChildModal;
