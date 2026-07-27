import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { X, Trash2 } from 'lucide-react';
import ImageCropper from './ImageCropper';

const UpdateMemberModal = ({ memberId, onClose }) => {
  const { data, updateMember } = useFamily();
  const member = data.members.find(m => m.id === memberId);

  const [name, setName] = useState(member?.name || '');
  const [gender, setGender] = useState(member?.gender || 'male');
  const [birthDate, setBirthDate] = useState(member?.birthDate || '');
  const [photo, setPhoto] = useState(member?.photo || null);
  const [cropImageSrc, setCropImageSrc] = useState(null);

  if (!member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateMember(memberId, { name, gender, birthDate, photo });
    onClose();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setCropImageSrc(reader.result);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage) => {
    setPhoto(croppedImage);
    setCropImageSrc(null);
  };

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(200,240,236,0.4)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      backdropFilter: 'blur(4px)'
    }}>
      <div className="glass" style={{ width: '100%', maxWidth: '400px', padding: '24px', position: 'relative', display: 'flex', flexDirection: 'column' }}>
        
        {cropImageSrc && (
          <ImageCropper 
            imageSrc={cropImageSrc} 
            onCropComplete={handleCropComplete} 
            onCancel={() => setCropImageSrc(null)} 
          />
        )}
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
        >
          <X size={20} />
        </button>
        
        <h2 style={{ marginBottom: '16px', fontSize: '1.25rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          Update {member.name}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label className="label">Name</label>
            <input 
              className="input" 
              type="text" 
              placeholder="e.g. Jane Doe"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Gender</label>
              <select 
                className="input" 
                value={gender} 
                onChange={e => setGender(e.target.value)}
                style={{ appearance: 'none' }}
              >
                <option value="male" style={{ color: 'black' }}>Male</option>
                <option value="female" style={{ color: 'black' }}>Female</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Date of Birth</label>
              <input 
                className="input" 
                type="date" 
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
          </div>

          <div>
            <label className="label">Photo</label>
            {photo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <img 
                  src={photo} 
                  alt="Preview" 
                  style={{ width: '60px', height: '60px', borderRadius: '50%', objectFit: 'cover' }} 
                />
                <button type="button" className="btn" style={{ background: 'var(--danger-color)' }} onClick={() => setPhoto(null)}>
                  <Trash2 size={16} /> Remove
                </button>
              </div>
            )}
            <input 
              className="input" 
              type="file" 
              accept="image/*"
              onChange={handlePhotoUpload}
              style={{ padding: '8px' }}
            />
          </div>

          <button type="submit" className="btn" style={{ marginTop: '8px' }}>
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateMemberModal;
