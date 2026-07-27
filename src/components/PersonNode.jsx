import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, MoreVertical, Plus, Edit, Trash2, Link2Off } from 'lucide-react';

/* ─── Shared helpers ─────────────────────────────────────────────── */
export const formatDate = (dateStr) => {
  if (!dateStr) return 'Date unknown';
  const [year, month, day] = dateStr.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[month - 1]} ${day}, ${year}`;
};

export const isBirthdayToday = (dateStr) => {
  if (!dateStr) return false;
  const [, month, day] = dateStr.split('-').map(Number);
  const today = new Date();
  return month === today.getMonth() + 1 && day === today.getDate();
};

/* ─── Reusable PersonCard (used by both PersonNode & CoupleNode) ──── */
export const PersonCard = ({ member, onAddRelative, onUpdateMember, onRemoveConnections, onDelete, style }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isMale = member.gender === 'male';

  useEffect(() => {
    const fn = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, []);

  const accentBorder = isMale ? 'rgba(69,183,174,0.35)' : 'rgba(224,137,154,0.35)';

  return (
    <div className="glass" style={{
      padding: '16px',
      width: '220px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      position: 'relative',
      borderTop: `4px solid ${isMale ? 'var(--accent-color)' : 'var(--female-color)'}`,
      ...style,
    }}>
      {/* Generation Badge */}
      {member.generation !== undefined && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: isMale ? 'rgba(69, 183, 174, 0.15)' : 'rgba(224, 137, 154, 0.15)',
          border: `1px solid ${isMale ? 'rgba(69, 183, 174, 0.35)' : 'rgba(224, 137, 154, 0.35)'}`,
          color: isMale ? 'var(--accent-color)' : 'var(--female-color)',
          borderRadius: '10px',
          padding: '1px 7px',
          fontSize: '0.65rem',
          fontWeight: 700,
          pointerEvents: 'none',
          letterSpacing: '0.5px',
        }}>
          Gen {member.generation}
        </div>
      )}

      {/* 3-dot menu */}
      <div ref={menuRef} className="nodrag nopan" style={{ position: 'absolute', top: 8, right: 8, zIndex: 100, pointerEvents: 'all' }}>
        <button
          className="btn-icon nodrag nopan"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(v => !v); }}
        >
          <MoreVertical size={18} />
        </button>
        {menuOpen && (
          <div className="dropdown-menu nodrag nopan" style={{ pointerEvents: 'all' }}>
            <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onAddRelative(member.id); }}>
              <Plus size={14} /> Add Relative
            </button>
            <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onUpdateMember(member.id); }}>
              <Edit size={14} /> Edit Info
            </button>
            {onRemoveConnections && (
              <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onRemoveConnections?.(member.id); }}>
                <Link2Off size={14} /> Disconnect...
              </button>
            )}
            <button className="dropdown-item danger nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenuOpen(false); onDelete(member.id); }}>
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div style={{
        width: 60, height: 60, borderRadius: '50%',
        background: `rgba(${isMale ? '69,183,174' : '224,137,154'},0.08)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 10, overflow: 'hidden',
        border: `2px solid ${accentBorder}`,
      }}>
        {member.photo
          ? <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <User size={30} color={isMale ? 'var(--male-color)' : 'var(--female-color)'} />}
      </div>

      {/* Name */}
      <h3 style={{ fontSize: '0.95rem', fontWeight: 700, margin: '0 0 4px', textAlign: 'center', color: 'var(--text-primary)' }}>
        {member.name}{isBirthdayToday(member.birthDate) && <span title="Birthday today!"> 🎂</span>}
      </h3>
      <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 500 }}>
        {formatDate(member.birthDate)}
      </p>
    </div>
  );
};

/* ─── PersonNode (single, unmarried person) ──────────────────────── */
const handleStyle = {
  width: 8,
  height: 8,
  background: '#45b7ae',
  border: '2px solid #ffffff',
  boxShadow: '0 0 4px rgba(69, 183, 174, 0.3)',
  borderRadius: '50%',
  zIndex: 10,
  cursor: 'crosshair',
};

const PersonNode = ({ data }) => (
  <div style={{ position: 'relative' }}>
    <Handle type="target" position={Position.Top} id="top" style={{ ...handleStyle, top: -4 }} />
    <Handle type="source" position={Position.Bottom} id="bottom" style={{ ...handleStyle, bottom: -4 }} />
    <Handle type="target" position={Position.Left} id="left" style={{ ...handleStyle, left: -4 }} />
    <Handle type="source" position={Position.Right} id="right" style={{ ...handleStyle, right: -4 }} />

    <PersonCard
      member={{ id: data.id, name: data.name, gender: data.gender, birthDate: data.birthDate, photo: data.photo }}
      onAddRelative={data.onAddRelative}
      onUpdateMember={data.onUpdateMember}
      onRemoveConnections={data.onRemoveConnections}
      onDelete={data.onDelete}
    />
  </div>
);

export default PersonNode;
