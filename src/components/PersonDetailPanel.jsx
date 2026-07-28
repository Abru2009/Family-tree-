import React, { useMemo } from 'react';
import { X, User, Phone, Mail, Globe, MapPin, Briefcase, Building, Flag, FileText, Heart, Calendar, Hash } from 'lucide-react';

// ─── Age calculator ────────────────────────────────────────────────────────
const calcAge = (birthDate, deathDate) => {
  if (!birthDate) return null;
  const start = new Date(birthDate);
  const end   = deathDate ? new Date(deathDate) : new Date();
  if (isNaN(start)) return null;
  let age = end.getFullYear() - start.getFullYear();
  const m = end.getMonth() - start.getMonth();
  if (m < 0 || (m === 0 && end.getDate() < start.getDate())) age--;
  return Math.max(0, age);
};

const fmt = (d) => {
  if (!d) return null;
  const [y, mo, day] = d.split('-').map(Number);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[mo - 1]} ${day}, ${y}`;
};

// ─── Row ────────────────────────────────────────────────────────────────────
const Row = ({ icon: Icon, label, value }) => {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '8px 0', borderBottom: '1px solid rgba(69,183,174,0.1)' }}>
      <Icon size={14} color="var(--accent-color)" style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 1 }}>{label}</div>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-primary)', wordBreak: 'break-word' }}>{value}</div>
      </div>
    </div>
  );
};

// ─── Component ──────────────────────────────────────────────────────────────
const PersonDetailPanel = ({ member, data, heritageColors, onClose, onEdit }) => {
  if (!member) return null;

  const age    = calcAge(member.birthDate, member.deathDate);
  const isMale = member.gender === 'male';
  const accent = isMale ? '#45b7ae' : '#e0899a';

  // Build quick relationship summary
  const relationships = useMemo(() => {
    if (!data) return [];
    const list = [];
    data.relations.forEach(r => {
      const isSource = r.source === member.id;
      const isTarget = r.target === member.id;
      if (!isSource && !isTarget) return;
      const otherId = isSource ? r.target : r.source;
      const other   = data.members.find(m => m.id === otherId);
      if (!other) return;
      if (r.type === 'spouse') list.push({ label: 'Spouse', name: other.name });
      else if (r.type === 'child') {
        if (isSource) list.push({ label: 'Child',  name: other.name });
        else          list.push({ label: 'Parent', name: other.name });
      }
    });
    return list;
  }, [data, member.id]);

  const herColor = member.heritage && heritageColors?.[member.heritage];

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 340,
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(10, 18, 35, 0.96)',
      backdropFilter: 'blur(20px)',
      borderLeft: `2px solid ${accent}40`,
      boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      animation: 'slideInRight 0.2s ease',
    }}>
      {/* ── Header ── */}
      <div style={{
        background: `linear-gradient(135deg, ${accent}22, transparent)`,
        borderBottom: `1px solid ${accent}30`,
        padding: '20px 16px 16px',
        flexShrink: 0,
      }}>
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 14, right: 14, background: 'rgba(255,255,255,0.06)', border: 'none', borderRadius: 8, color: 'var(--text-secondary)', cursor: 'pointer', padding: 6 }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          {/* Avatar */}
          <div style={{
            width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
            border: `3px solid ${accent}60`,
            overflow: 'hidden',
            background: `${accent}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {member.photo
              ? <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={32} color={accent} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0, lineHeight: 1.3 }}>{member.name}</h2>
            <div style={{ fontSize: '0.75rem', color: accent, fontWeight: 600, marginTop: 2 }}>
              {member.gender === 'male' ? '♂ Male' : '♀ Female'}
              {age !== null && ` · ${member.deathDate ? 'Died aged' : 'Age'} ${age}`}
            </div>
            {member.heritage && (
              <div style={{
                marginTop: 6,
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: herColor ? `${herColor}20` : 'rgba(69,183,174,0.1)',
                border: `1px solid ${herColor || accent}40`,
                borderRadius: 20, padding: '2px 8px',
                fontSize: '0.7rem', fontWeight: 700, color: herColor || accent,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: herColor || accent, flexShrink: 0 }} />
                {member.heritage}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={onEdit}
          style={{
            marginTop: 14, width: '100%',
            padding: '8px', borderRadius: 10,
            background: `${accent}20`, border: `1px solid ${accent}50`,
            color: accent, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
          }}
        >
          ✏️ Edit Profile
        </button>
      </div>

      {/* ── Scrollable body ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '8px 16px 24px' }}>

        {/* Dates block */}
        <div style={{ marginTop: 12, marginBottom: 4 }}>
          <Row icon={Calendar} label="Date of Birth"  value={fmt(member.birthDate)} />
          <Row icon={Calendar} label="Date of Death"  value={fmt(member.deathDate)} />
        </div>

        {/* Contact */}
        <Row icon={Phone}     label="Phone"           value={member.phone} />
        <Row icon={Mail}      label="Email"           value={member.email} />
        <Row icon={Globe}     label="Social / Online" value={member.social} />

        {/* Location */}
        <Row icon={MapPin}    label="Home Address"    value={member.address} />
        <Row icon={MapPin}    label="Current Location"value={member.location} />

        {/* Career */}
        <Row icon={Briefcase} label="Occupation"      value={member.occupation} />
        <Row icon={Building}  label="Company"         value={member.company} />

        {/* Heritage & Notes */}
        <Row icon={Flag}      label="Family Heritage" value={member.heritage} />
        <Row icon={FileText}  label="Notes"           value={member.notes} />

        {/* Relationships */}
        {relationships.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-secondary)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 8 }}>
              <Heart size={12} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              Relationships
            </div>
            {relationships.map((r, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px', marginBottom: 4,
                background: 'rgba(69,183,174,0.05)',
                border: '1px solid rgba(69,183,174,0.12)',
                borderRadius: 8,
              }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{r.label}</span>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-primary)', fontWeight: 600 }}>{r.name}</span>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!member.phone && !member.email && !member.birthDate && !member.occupation && !member.heritage && !member.notes && relationships.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-secondary)', fontSize: '0.82rem' }}>
            <Hash size={28} style={{ margin: '0 auto 8px', opacity: 0.3, display: 'block' }} />
            No details added yet.<br />Click Edit Profile to fill in their info.
          </div>
        )}
      </div>

      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); opacity: 0; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default PersonDetailPanel;
