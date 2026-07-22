import React, { useRef, useState } from 'react';
import Button from './Button.jsx';
import { uploadImage } from '../../services/imageUpload.js';

/** Generic image field — upload a real file OR paste a link, with a
 *  reset back to the built-in default. Meant to be reused by any
 *  feature that needs an image slot (banners and the profile avatar
 *  today; nothing stops a future Guardian art picker from using this
 *  exact same component). `onChange(url | null)` is the only contract —
 *  the caller decides where that URL actually gets stored. */
export default function ImageUploadField({ value, onChange, folder = 'general', previewStyle }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState(null);
  const [urlInput, setUrlInput] = useState('');
  const [showUrlInput, setShowUrlInput] = useState(false);
  const fileInputRef = useRef(null);

  async function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);
    try {
      const url = await uploadImage(file, folder);
      onChange(url);
    } catch (err) {
      setError(err.message || 'Upload failed.');
    }
    setUploading(false);
    e.target.value = ''; // reset so picking the same file again still fires onChange
  }

  function handleUrlSave() {
    if (!urlInput.trim()) return;
    onChange(urlInput.trim());
    setUrlInput('');
    setShowUrlInput(false);
  }

  return (
    <div>
      {value && (
        <img src={value} alt="" style={previewStyle || { width: 80, height: 80, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }} />
      )}
      <div className="row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)', flexWrap: 'wrap' }}>
        <input type="file" accept="image/*" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} />
        <Button size="sm" variant="ghost" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
          {uploading ? 'Uploading…' : value ? 'Change image' : '+ Upload image'}
        </Button>
        <Button size="sm" variant="text" onClick={() => setShowUrlInput(!showUrlInput)}>
          {showUrlInput ? 'Cancel' : 'Or paste a link'}
        </Button>
        {value && <Button size="sm" variant="text" onClick={() => onChange(null)}>Reset to default</Button>}
      </div>
      {showUrlInput && (
        <div className="row" style={{ marginTop: 'var(--space-2)', gap: 'var(--space-2)', flexWrap: 'wrap' }}>
          <input placeholder="Image URL" value={urlInput} onChange={e => setUrlInput(e.target.value)} style={{ flex: 1, minWidth: 140 }} />
          <Button size="sm" onClick={handleUrlSave}>Save</Button>
        </div>
      )}
      {error && <div style={{ fontSize: 12, color: 'var(--danger)', marginTop: 4 }}>{error}</div>}
    </div>
  );
}
