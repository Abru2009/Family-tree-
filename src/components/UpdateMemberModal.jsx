import React, { useState } from 'react';
import { useFamily } from '../FamilyContext';
import { X, Trash2 } from 'lucide-react';
import ImageCropper from './ImageCropper';
import SearchableSelect from './SearchableSelect';

const UpdateMemberModal = ({ memberId, onClose }) => {
  const { data, updateMember } = useFamily();
  const member = data.members.find(m => m.id === memberId);

  const [name, setName] = useState(member?.name || '');
  const [gender, setGender] = useState(member?.gender || 'male');
  const [birthDate, setBirthDate] = useState(member?.birthDate || '');
  const [deathDate, setDeathDate] = useState(member?.deathDate || '');
  const [heritage, setHeritage] = useState(member?.heritage || '');
  const [phone, setPhone] = useState(member?.phone || '');
  const [email, setEmail] = useState(member?.email || '');
  const [social, setSocial] = useState(member?.social || '');
  const [address, setAddress] = useState(member?.address || '');
  const [location, setLocation] = useState(member?.location || '');
  const [occupation, setOccupation] = useState(member?.occupation || '');
  const [company, setCompany] = useState(member?.company || '');
  const [notes, setNotes] = useState(member?.notes || '');
  const [photo, setPhoto] = useState(member?.photo || null);
  const [cropImageSrc, setCropImageSrc] = useState(null);

  if (!member) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    updateMember(memberId, {
      name, gender, birthDate, deathDate, heritage,
      phone, email, social, address, location,
      occupation, company, notes, photo
    });
    onClose();
  };

  const handlePhotoUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setCropImageSrc(reader.result);
      reader.readAsDataURL(file);
    }
    e.target.value = '';
  };

  const handleCropComplete = (croppedImage) => {
    setPhoto(croppedImage);
    setCropImageSrc(null);
  };

  const today = new Date().toISOString().split('T')[0];

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(10, 18, 35, 0.75)',
      backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1200,
    }}>
      <div className="glass" style={{
        width: '100%', maxWidth: '540px',
        padding: '24px', position: 'relative',
        display: 'flex', flexDirection: 'column',
        maxHeight: '90vh', overflowY: 'auto',
        borderRadius: 20,
      }}>
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
        
        <h2 style={{ marginBottom: '16px', fontSize: '1.2rem', color: 'var(--text-primary)', fontWeight: 700 }}>
          Edit Profile — {member.name}
        </h2>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div>
            <label className="label">Full Name</label>
            <input 
              className="input" 
              type="text" 
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <SearchableSelect
                label="Gender"
                options={[{ value: 'male', label: 'Male' }, { value: 'female', label: 'Female' }]}
                value={gender}
                onChange={setGender}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Family Heritage (Surname/Clan)</label>
              <input 
                className="input" 
                type="text" 
                placeholder="e.g. McGregor, Abraham"
                value={heritage}
                onChange={e => setHeritage(e.target.value)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Date of Birth</label>
              <input 
                className="input" 
                type="date" 
                value={birthDate}
                onChange={e => setBirthDate(e.target.value)}
                max={today}
              />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Date of Death (if applicable)</label>
              <input 
                className="input" 
                type="date" 
                value={deathDate}
                onChange={e => setDeathDate(e.target.value)}
                max={today}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Phone</label>
              <input className="input" type="text" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+1 ..." />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Email</label>
              <input className="input" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@domain.com" />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Occupation</label>
              <input className="input" type="text" value={occupation} onChange={e => setOccupation(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Company</label>
              <input className="input" type="text" value={company} onChange={e => setCompany(e.target.value)} />
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="label">Home Address</label>
              <input className="input" type="text" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="label">Current Location</label>
              <input className="input" type="text" value={location} onChange={e => setLocation(e.target.value)} />
            </div>
          </div>

          <div>
            <label className="label">Notes</label>
            <textarea 
              className="input" 
              rows={2}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Additional biographical notes..."
              style={{ resize: 'vertical' }}
            />
          </div>

          <div>
            <label className="label">Profile Photo</label>
            {photo && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                <img 
                  src={photo} 
                  alt="Preview" 
                  style={{ width: '48px', height: '48px', borderRadius: '50%', objectFit: 'cover' }} 
                />
                <button type="button" className="btn" style={{ background: 'var(--danger-color)', padding: '6px 12px', fontSize: '0.8rem' }} onClick={() => setPhoto(null)}>
                  <Trash2 size={14} /> Remove
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

          <button type="submit" className="btn" style={{ marginTop: '8px', padding: '12px' }}>
            Save Profile Changes
          </button>
        </form>
      </div>
    </div>
  );
};

export default UpdateMemberModal;
