import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { X, Trash2, User, Users } from 'lucide-react';
import ImageCropper from './ImageCropper';

/* ─── Helpers ──────────────────────────────────────────────────── */
const cardStyle = {
  background: 'rgba(69,183,174,0.06)',
  border: '1.5px solid rgba(69,183,174,0.2)',
  borderRadius: '14px',
  padding: '16px',
};

const PhotoField = ({ label, photo, onUpload, onRemove }) => {
  const [cropSrc, setCropSrc] = useState(null);
  const handleFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setCropSrc(reader.result);
    reader.readAsDataURL(file);
    e.target.value = '';
  };
  return (
    <div>
      <label className="label">{label}</label>
      {cropSrc && (
        <div style={{ position: 'relative', minHeight: '220px', borderRadius: '12px', overflow: 'hidden', marginBottom: '8px' }}>
          {/* Inline cropper – reuse ImageCropper */}
          <ImageCropper
            imageSrc={cropSrc}
            onCropComplete={(img) => { onUpload(img); setCropSrc(null); }}
            onCancel={() => setCropSrc(null)}
          />
        </div>
      )}
      {!cropSrc && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {photo && (
            <>
              <img src={photo} alt="preview" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }} />
              <button type="button" className="btn" style={{ background: 'var(--danger-color)', padding: '6px 12px', fontSize: '0.8rem' }} onClick={onRemove}>
                <Trash2 size={14} /> Remove
              </button>
            </>
          )}
          <label style={{ cursor: 'pointer', fontSize: '0.82rem', color: 'var(--accent-color)', fontWeight: 600, textDecoration: 'underline' }}>
            {photo ? 'Change photo' : '+ Upload photo'}
            <input type="file" accept="image/*" onChange={handleFile} style={{ display: 'none' }} />
          </label>
        </div>
      )}
    </div>
  );
};

/* ─── Main Modal ────────────────────────────────────────────────── */
const AddMemberModal = ({ relatedToId, onClose }) => {
  const { data, addMember, addParents } = useFamily();
  const [name,         setName]         = useState('');
  const [gender,       setGender]       = useState('male');
  const [birthDate,    setBirthDate]    = useState('');
  const [relationType, setRelationType] = useState('child');
  const [photo,        setPhoto]        = useState(null);

  // Dual-parent state
  const [fatherName,      setFatherName]      = useState('');
  const [fatherBirthDate, setFatherBirthDate] = useState('');
  const [fatherPhoto,     setFatherPhoto]     = useState(null);
  const [motherName,      setMotherName]      = useState('');
  const [motherBirthDate, setMotherBirthDate] = useState('');
  const [motherPhoto,     setMotherPhoto]     = useState(null);

  const isRoot        = relatedToId === 'ROOT';
  const relatedPerson = isRoot ? null : data.members.find(m => m.id === relatedToId);
  const isParentMode  = relationType === 'parent' && !isRoot;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isParentMode) {
      if (!fatherName.trim() && !motherName.trim()) return;
      addParents(
        { name: fatherName || 'Father', birthDate: fatherBirthDate, photo: fatherPhoto },
        { name: motherName || 'Mother', birthDate: motherBirthDate, photo: motherPhoto },
        relatedToId
      );
    } else {
      if (!name.trim()) return;
      if (isRoot) {
        addMember({ name, gender, birthDate, photo });
      } else {
        addMember({ name, gender, birthDate, photo }, relationType, relatedToId);
      }
    }
    onClose();
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(200,240,236,0.45)',
      backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000,
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: isParentMode ? '560px' : '420px',
        padding: '28px', position: 'relative',
        maxHeight: '90vh', overflowY: 'auto',
      }}>
        {/* Close */}
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
          <X size={20} />
        </button>

        <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          {isRoot ? '🌱 Start Your Family Tree' : `Add relative for ${relatedPerson?.name}`}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

          {/* Relation selector (not shown for root) */}
          {!isRoot && (
            <div>
              <label className="label">Relation Type</label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                {['child','spouse','sibling','parent'].map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRelationType(r)}
                    style={{
                      padding: '10px', borderRadius: '10px', border: '1.5px solid',
                      borderColor: relationType === r ? 'var(--accent-color)' : 'rgba(69,183,174,0.25)',
                      background:  relationType === r ? 'rgba(69,183,174,0.12)' : 'transparent',
                      color: relationType === r ? 'var(--accent-color)' : 'var(--text-secondary)',
                      fontWeight: 600, fontSize: '0.85rem', cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                    }}
                  >
                    {r === 'parent' ? <Users size={15}/> : <User size={15}/>}
                    {r === 'parent' ? 'Parents' : r.charAt(0).toUpperCase() + r.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── DUAL PARENT FORM ─────────────────────────────────── */}
          {isParentMode ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Father */}
              <div style={cardStyle}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '12px' }}>👤 Parent</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="label">Name</label>
                    <input className="input" type="text" placeholder="Father's name"
                      value={fatherName} onChange={e => setFatherName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <input className="input" type="date" max={today}
                      value={fatherBirthDate} onChange={e => setFatherBirthDate(e.target.value)} />
                  </div>
                  <PhotoField label="Photo" photo={fatherPhoto}
                    onUpload={setFatherPhoto} onRemove={() => setFatherPhoto(null)} />
                </div>
              </div>

              {/* Mother */}
              <div style={cardStyle}>
                <p style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--accent-color)', marginBottom: '12px' }}>👤 Parent</p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div>
                    <label className="label">Name</label>
                    <input className="input" type="text" placeholder="Mother's name"
                      value={motherName} onChange={e => setMotherName(e.target.value)} />
                  </div>
                  <div>
                    <label className="label">Date of Birth</label>
                    <input className="input" type="date" max={today}
                      value={motherBirthDate} onChange={e => setMotherBirthDate(e.target.value)} />
                  </div>
                  <PhotoField label="Photo" photo={motherPhoto}
                    onUpload={setMotherPhoto} onRemove={() => setMotherPhoto(null)} />
                </div>
              </div>
            </div>
          ) : (
            /* ── SINGLE PERSON FORM ──────────────────────────────── */
            <>
              <div>
                <label className="label">Name</label>
                <input className="input" type="text" placeholder="e.g. Jane Doe"
                  value={name} onChange={e => setName(e.target.value)} required />
              </div>

              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ flex: 1 }}>
                  <label className="label">Gender</label>
                  <select className="input" value={gender} onChange={e => setGender(e.target.value)} style={{ appearance: 'none' }}>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="label">Date of Birth</label>
                  <input className="input" type="date" max={today}
                    value={birthDate} onChange={e => setBirthDate(e.target.value)} />
                </div>
              </div>

              <div>
                <PhotoField label="Photo (Optional)" photo={photo} onUpload={setPhoto} onRemove={() => setPhoto(null)} />
              </div>
            </>
          )}

          <button type="submit" className="btn" style={{ marginTop: '4px', padding: '12px' }}>
            {isRoot ? '🌱 Start Family Tree'
              : isParentMode ? 'Add Parents'
              : `Add ${relationType.charAt(0).toUpperCase() + relationType.slice(1)}`}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddMemberModal;
