import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import { getCroppedImg } from '../utils/cropImage';

const ImageCropper = ({ imageSrc, onCropComplete, onCancel }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);

  const onCropCompleteHandler = useCallback((croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const croppedImage = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedImage);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div style={{
      position: 'absolute',
      inset: 0,
      background: 'var(--bg-color)',
      zIndex: 10,
      display: 'flex',
      flexDirection: 'column',
      borderRadius: '16px',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'relative', flex: 1 }}>
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropCompleteHandler}
          onZoomChange={setZoom}
        />
      </div>
      <div style={{ padding: '16px', display: 'flex', gap: '16px', background: 'rgba(0,0,0,0.5)' }}>
        <button className="btn" style={{ flex: 1, background: '#475569' }} onClick={onCancel}>
          Cancel
        </button>
        <button className="btn" style={{ flex: 1 }} onClick={handleSave}>
          Crop & Save
        </button>
      </div>
    </div>
  );
};

export default ImageCropper;
