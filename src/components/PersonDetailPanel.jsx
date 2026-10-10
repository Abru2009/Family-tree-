import React, { useMemo } from 'react';
import {
  X, User, Phone, Mail, Globe, MapPin, Briefcase, Building,
  Flag, FileText, Heart, Calendar, ChevronRight, Users
} from 'lucide-react';

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

const SectionHeader = ({ icon: Icon, title, accent }) => (
  <div style={{
    display: 'flex', alignItems: 'center', gap: 7,
    padding: '12px 0 6px',
    borderBottom: `1px solid ${accent}25`,
    marginBottom: 4,
  }}>
    <Icon size={12} color={accent} />
    <span style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.8px', textTransform: 'uppercase', color: accent }}>
      {title}
    </span>
  </div>
);

const InfoRow = ({ icon: Icon, label, value, accent, multiline = false }) => {
  if (!value) return null;
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '7px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
      <Icon size={13} color={`${accent}99`} style={{ marginTop: 2, flexShrink: 0 }} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: '0.63rem', color: 'rgba(255,255,255,0.35)', fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 2 }}>
          {label}
        </div>
        <div style={{
          fontSize: '0.83rem', color: 'rgba(255,255,255,0.9)', wordBreak: 'break-word',
          lineHeight: multiline ? 1.5 : 1.3,
          whiteSpace: multiline ? 'pre-wrap' : 'normal',
        }}>
          {value}
        </div>
      </div>
    </div>
  );
};

const PersonChip = ({ name, role, accent, onSelect }) => (
  <button
    onClick={onSelect}
    style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      width: '100%', padding: '7px 10px', marginBottom: 4,
      background: 'rgba(255,255,255,0.04)',
      border: `1px solid ${accent}20`,
      borderRadius: 8, cursor: 'pointer',
      textAlign: 'left', gap: 8,
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: `${accent}18`, border: `1px solid ${accent}40`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <User size={13} color={accent} />
      </div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'rgba(255,255,255,0.9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {name}
        </div>
        <div style={{ fontSize: '0.62rem', color: `${accent}bb`, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.4px' }}>
          {role}
        </div>
      </div>
    </div>
    <ChevronRight size={13} color={`${accent}60`} style={{ flexShrink: 0 }} />
  </button>
);

const StatBadge = ({ label, value, accent }) => {
  if (!value && value !== 0) return null;
  return (
    <div style={{
      flex: '1 1 0', minWidth: 70,
      background: `${accent}10`, border: `1px solid ${accent}25`,
      borderRadius: 10, padding: '10px 8px', textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.1rem', fontWeight: 800, color: accent }}>{value}</div>
      <div style={{ fontSize: '0.58rem', color: 'rgba(255,255,255,0.4)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.4px', marginTop: 2 }}>{label}</div>
    </div>
  );
};

const PersonDetailPanel = ({ member, data, heritageColors, onClose, onEdit, onSelectMember }) => {
  if (!member) return null;

  const age    = calcAge(member.birthDate, member.deathDate);
  const isMale = member.gender === 'male';
  const accent = isMale ? '#45b7ae' : '#e0899a';
  const herColor = member.heritage && heritageColors?.[member.heritage];
  const isDead = !!member.deathDate;

  const { parents, spouses, children, siblings } = useMemo(() => {
    if (!data) return { parents: [], spouses: [], children: [], siblings: [] };
    const memberMap = Object.fromEntries(data.members.map(m => [m.id, m]));
    const parents = [], spouses = [], children = [];

    data.relations.forEach(r => {
      if (r.type === 'spouse') {
        if (r.source === member.id) spouses.push(memberMap[r.target]);
        if (r.target === member.id) spouses.push(memberMap[r.source]);
      } else if (r.type === 'child') {
        if (r.source === member.id) children.push(memberMap[r.target]);
        if (r.target === member.id) parents.push(memberMap[r.source]);
      }
    });

    const parentIds = new Set(parents.map(p => p?.id).filter(Boolean));
    const siblings = [];
    if (parentIds.size > 0) {
      data.relations.forEach(r => {
        if (r.type === 'child' && parentIds.has(r.source) && r.target !== member.id) {
          const sib = memberMap[r.target];
          if (sib && !siblings.find(s => s.id === sib.id)) siblings.push(sib);
        }
      });
    }

    return {
      parents: parents.filter(Boolean),
      spouses: spouses.filter(Boolean),
      children: children.filter(Boolean),
      siblings: siblings.filter(Boolean),
    };
  }, [data, member.id]);

  const personAccent = (p) => p?.gender === 'male' ? '#45b7ae' : '#e0899a';
  const hasContact  = member.phone || member.email || member.social;
  const hasLocation = member.address || member.location;
  const hasCareer   = member.occupation || member.company;
  const hasFamily   = parents.length || spouses.length || children.length || siblings.length;

  return (
    <div style={{
      position: 'fixed',
      top: 0, right: 0, bottom: 0,
      width: 380,
      zIndex: 1100,
      display: 'flex',
      flexDirection: 'column',
      background: 'rgba(8, 15, 30, 0.97)',
      backdropFilter: 'blur(24px)',
      borderLeft: `2px solid ${accent}35`,
      boxShadow: '-12px 0 40px rgba(0,0,0,0.5)',
      animation: 'slideInRight 0.22s cubic-bezier(0.22,1,0.36,1)',
    }}>

      {/* ── HEADER ── */}
      <div style={{
        background: `linear-gradient(160deg, ${accent}18 0%, transparent 60%)`,
        borderBottom: `1px solid ${accent}25`,
        padding: '18px 16px 14px',
        flexShrink: 0,
        position: 'relative',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 14, right: 14,
          background: 'rgba(255,255,255,0.07)', border: 'none',
          borderRadius: 8, color: 'rgba(255,255,255,0.5)',
          cursor: 'pointer', padding: 6, lineHeight: 0,
        }}>
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, paddingRight: 34 }}>
          <div style={{
            width: 72, height: 72, borderRadius: '50%', flexShrink: 0,
            border: `3px solid ${accent}55`,
            overflow: 'hidden',
            background: `${accent}12`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: `0 0 20px ${accent}25`,
          }}>
            {member.photo
              ? <img src={member.photo} alt={member.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : <User size={32} color={accent} />
            }
          </div>

          <div style={{ flex: 1, minWidth: 0, paddingTop: 2 }}>
            <h2 style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff', margin: 0, lineHeight: 1.25 }}>
              {member.name}
            </h2>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6 }}>
              <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${accent}20`, color: accent, border: `1px solid ${accent}40` }}>
                {isMale ? '♂ Male' : '♀ Female'}
              </span>
              {member.generation && (
                <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: 'rgba(255,255,255,0.07)', color: 'rgba(255,255,255,0.55)', border: '1px solid rgba(255,255,255,0.12)' }}>
                  Gen {member.generation}
                </span>
              )}
              <span style={{
                fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: isDead ? 'rgba(160,100,100,0.2)' : 'rgba(80,200,140,0.15)',
                color: isDead ? '#c07070' : '#50c88c',
                border: `1px solid ${isDead ? '#c0707040' : '#50c88c40'}`,
              }}>
                {isDead ? '✦ Deceased' : '● Living'}
              </span>
            </div>
            {member.heritage && (
              <div style={{
                marginTop: 7, display: 'inline-flex', alignItems: 'center', gap: 5,
                background: herColor ? `${herColor}18` : 'rgba(69,183,174,0.1)',
                border: `1px solid ${herColor || accent}40`,
                borderRadius: 20, padding: '3px 9px',
                fontSize: '0.68rem', fontWeight: 700, color: herColor || accent,
              }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: herColor || accent, flexShrink: 0 }} />
                {member.heritage} Family
              </div>
            )}
          </div>
        </div>

        {(age !== null || children.length > 0 || spouses.length > 0) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
            {age !== null && <StatBadge label={isDead ? 'Age at death' : 'Age'} value={age} accent={accent} />}
            {spouses.length > 0 && <StatBadge label="Spouse(s)" value={spouses.length} accent={accent} />}
            {children.length > 0 && <StatBadge label="Children" value={children.length} accent={accent} />}
            {siblings.length > 0 && <StatBadge label="Siblings" value={siblings.length} accent={accent} />}
          </div>
        )}

        <button onClick={onEdit} style={{
          marginTop: 12, width: '100%', padding: '9px', borderRadius: 10,
          background: `${accent}18`, border: `1px solid ${accent}45`,
          color: accent, fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer',
          letterSpacing: '0.3px',
        }}>
          ✏️ Edit Profile
        </button>
      </div>

      {/* ── SCROLLABLE BODY ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 28px' }}>

        {(member.birthDate || member.deathDate) && (
          <>
            <SectionHeader icon={Calendar} title="Vitals" accent={accent} />
            <InfoRow icon={Calendar} label="Date of Birth" value={fmt(member.birthDate)} accent={accent} />
            {age !== null && <InfoRow icon={Calendar} label={isDead ? 'Age at Death' : 'Current Age'} value={`${age} years old`} accent={accent} />}
            {member.deathDate && <InfoRow icon={Calendar} label="Date of Death" value={fmt(member.deathDate)} accent={accent} />}
          </>
        )}

        {hasContact && (
          <>
            <SectionHeader icon={Phone} title="Contact" accent={accent} />
            <InfoRow icon={Phone}  label="Phone"           value={member.phone}  accent={accent} />
            <InfoRow icon={Mail}   label="Email"           value={member.email}  accent={accent} />
            <InfoRow icon={Globe}  label="Social / Online" value={member.social} accent={accent} />
          </>
        )}

        {hasLocation && (
          <>
            <SectionHeader icon={MapPin} title="Location" accent={accent} />
            <InfoRow icon={MapPin} label="Home Address"     value={member.address}  accent={accent} />
            <InfoRow icon={MapPin} label="Current Location" value={member.location} accent={accent} />
          </>
        )}

        {hasCareer && (
          <>
            <SectionHeader icon={Briefcase} title="Career" accent={accent} />
            <InfoRow icon={Briefcase} label="Occupation" value={member.occupation} accent={accent} />
            <InfoRow icon={Building}  label="Company"    value={member.company}    accent={accent} />
          </>
        )}

        {member.heritage && (
          <>
            <SectionHeader icon={Flag} title="Family Heritage" accent={accent} />
            <InfoRow icon={Flag} label="Family / Clan" value={member.heritage} accent={accent} />
          </>
        )}

        {member.notes && (
          <>
            <SectionHeader icon={FileText} title="Notes" accent={accent} />
            <InfoRow icon={FileText} label="Notes" value={member.notes} accent={accent} multiline />
          </>
        )}

        {hasFamily && (
          <>
            <SectionHeader icon={Users} title="Family Connections" accent={accent} />
            {parents.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, paddingLeft: 2 }}>Parents</div>
                {parents.map(p => <PersonChip key={p.id} name={p.name} role="Parent" accent={personAccent(p)} onSelect={() => onSelectMember?.(p.id)} />)}
              </div>
            )}
            {spouses.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, paddingLeft: 2 }}>Spouse</div>
                {spouses.map(p => <PersonChip key={p.id} name={p.name} role="Spouse" accent={personAccent(p)} onSelect={() => onSelectMember?.(p.id)} />)}
              </div>
            )}
            {siblings.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, paddingLeft: 2 }}>Siblings</div>
                {siblings.map(p => <PersonChip key={p.id} name={p.name} role="Sibling" accent={personAccent(p)} onSelect={() => onSelectMember?.(p.id)} />)}
              </div>
            )}
            {children.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <div style={{ fontSize: '0.62rem', color: 'rgba(255,255,255,0.3)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4, paddingLeft: 2 }}>Children</div>
                {children.map(p => <PersonChip key={p.id} name={p.name} role="Child" accent={personAccent(p)} onSelect={() => onSelectMember?.(p.id)} />)}
              </div>
            )}
          </>
        )}

        {!member.birthDate && !hasContact && !hasLocation && !hasCareer && !member.heritage && !member.notes && !hasFamily && (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'rgba(255,255,255,0.25)', fontSize: '0.82rem' }}>
            <User size={32} style={{ margin: '0 auto 10px', opacity: 0.2, display: 'block' }} />
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
