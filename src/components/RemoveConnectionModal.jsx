import React from 'react';
import { useFamily } from '../FamilyContext';
import { X, Link2Off, Trash2 } from 'lucide-react';

const RemoveConnectionModal = ({ memberId, onClose }) => {
  const { data, removeRelationBetween } = useFamily();

  const member = data.members.find(m => m.id === memberId);
  if (!member) return null;

  // Find all relations involving this member
  const memberRelations = data.relations.filter(
    r => r.source === memberId || r.target === memberId
  );

  const getOtherMember = (rel) => {
    const otherId = rel.source === memberId ? rel.target : rel.source;
    return data.members.find(m => m.id === otherId);
  };

  const getRelLabel = (rel) => {
    if (rel.type === 'spouse') return 'Spouse';
    if (rel.source === memberId) return 'Child';
    return 'Parent';
  };

  const handleRemove = (otherId) => {
    removeRelationBetween(memberId, otherId);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(200,240,236,0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '420px',
        padding: '24px', position: 'relative',
      }}>
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ marginBottom: 16, fontSize: '1.15rem', color: 'var(--text-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Link2Off size={20} color="var(--danger-color)" /> Remove Connections for {member.name}
        </h2>

        {memberRelations.length === 0 ? (
          <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}>
            No active connections found for {member.name}.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {memberRelations.map(rel => {
              const other = getOtherMember(rel);
              if (!other) return null;
              const label = getRelLabel(rel);
              return (
                <div key={rel.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: 'rgba(255,255,255,0.6)',
                  border: '1px solid var(--glass-border)',
                }}>
                  <div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>
                      {other.name}
                    </span>
                    <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginLeft: 8 }}>
                      ({label})
                    </span>
                  </div>

                  <button
                    onClick={() => handleRemove(other.id)}
                    style={{
                      background: 'rgba(224,112,112,0.12)',
                      border: '1px solid rgba(224,112,112,0.3)',
                      color: 'var(--danger-color)',
                      borderRadius: 6,
                      padding: '4px 8px',
                      fontSize: '0.75rem',
                      fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                    title={`Disconnect ${member.name} from ${other.name}`}
                  >
                    <Trash2 size={13} /> Disconnect
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RemoveConnectionModal;
