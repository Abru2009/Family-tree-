import React, { useState, useRef, useEffect } from 'react';
import { Handle, Position } from '@xyflow/react';
import { User, MoreVertical, Plus, Edit, Trash2, Link2Off, Users } from 'lucide-react';

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
export const PersonCard = ({
  member,
  onAddRelative,
  onAddBulkChildren,
  onSelectMember,
  onUpdateMember,
  onRemoveConnections,
  onDelete,
  style,
  onMenuChange
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const isMale = member.gender === 'male';

  const setMenu = (val) => {
    setMenuOpen(val);
    onMenuChange?.(typeof val === 'function' ? val(menuOpen) : val);
  };

  useEffect(() => {
    const fn = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
        onMenuChange?.(false);
      }
    };
    document.addEventListener('mousedown', fn);
    return () => document.removeEventListener('mousedown', fn);
  }, [onMenuChange]);

  const accentBorder = isMale ? 'rgba(69,183,174,0.35)' : 'rgba(224,137,154,0.35)';

  return (
    <div
      className="glass"
      onClick={() => onSelectMember?.(member.id)}
      style={{
        padding: '16px',
        width: '220px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        position: 'relative',
        cursor: 'pointer',
        borderTop: `4px solid ${isMale ? 'var(--accent-color)' : 'var(--female-color)'}`,
        ...style,
      }}
    >
      {/* Generation Badge */}
      {member.generation !== undefined && (
        <div style={{
          position: 'absolute',
          top: 8,
          left: 8,
          background: isMale ? 'rgba(69, 183, 174, 0.12)' : 'rgba(224, 137, 154, 0.12)',
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
      <div
        ref={menuRef}
        className="nodrag nopan"
        style={{
          position: 'absolute', top: 8, right: 8,
          zIndex: menuOpen ? 9999 : 10,
          pointerEvents: 'all',
          isolation: 'isolate',
        }}
      >
        <button
          className="btn-icon nodrag nopan"
          style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-secondary)', padding: '4px' }}
          onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenu(v => !v); }}
        >
          <MoreVertical size={18} />
        </button>
        {menuOpen && (
          <div className="dropdown-menu nodrag nopan" style={{ pointerEvents: 'all', zIndex: 9999 }}>
            <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenu(false); onAddRelative?.(member.id); }}>
              <Plus size={14} /> Add Relative
            </button>
            <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenu(false); onAddBulkChildren?.(member.id); }}>
              <Users size={14} /> Add Bulk Children...
            </button>
            <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenu(false); onUpdateMember?.(member.id); }}>
              <Edit size={14} /> Edit Info
            </button>
            {onRemoveConnections && (
              <button className="dropdown-item nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenu(false); onRemoveConnections?.(member.id); }}>
                <Link2Off size={14} /> Disconnect...
              </button>
            )}
            <button className="dropdown-item danger nodrag nopan" onClick={(e) => { e.stopPropagation(); e.preventDefault(); setMenu(false); onDelete?.(member.id); }}>
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
const baseHandleStyle = {
  width: 8,
  height: 8,
  background: '#45b7ae',
  border: '2px solid #ffffff',
  boxShadow: '0 0 4px rgba(69, 183, 174, 0.3)',
  borderRadius: '50%',
  zIndex: 2,
  cursor: 'crosshair',
  transition: 'opacity 0.1s',
};

const PersonNode = ({ data }) => {
  const [menuOpen, setMenuOpen] = useState(false);

  const hiddenHandle = menuOpen
    ? { ...baseHandleStyle, opacity: 0, pointerEvents: 'none', zIndex: 0 }
    : baseHandleStyle;

  return (
    <div style={{ position: 'relative' }}>
      <Handle type="target"  position={Position.Top}    id="top"    style={{ ...hiddenHandle, top: -4 }} />
      <Handle type="source"  position={Position.Bottom} id="bottom" style={{ ...hiddenHandle, bottom: -4 }} />
      <Handle type="target"  position={Position.Left}   id="left"   style={{ ...hiddenHandle, left: -4 }} />
      <Handle type="source"  position={Position.Right}  id="right"  style={{ ...hiddenHandle, right: -4 }} />

      <PersonCard
        member={{ id: data.id, name: data.name, gender: data.gender, birthDate: data.birthDate, photo: data.photo, generation: data.generation }}
        onAddRelative={data.onAddRelative}
        onAddBulkChildren={data.onAddBulkChildren}
        onSelectMember={data.onSelectMember}
        onUpdateMember={data.onUpdateMember}
        onRemoveConnections={data.onRemoveConnections}
        onDelete={data.onDelete}
        onMenuChange={setMenuOpen}
      />
    </div>
  );
};

export default PersonNode;
