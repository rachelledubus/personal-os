import React, { useEffect, useState } from 'react';
import Card from '../../components/ui/Card.jsx';
import ImageUploadField from '../../components/ui/ImageUploadField.jsx';
import { listAssetSlots, setAssetSlot } from '../../services/assets.js';

export default function AppearanceSection() {
  const [slots, setSlots] = useState([]);

  async function refresh() { setSlots(await listAssetSlots()); }
  useEffect(() => { refresh(); }, []);

  async function handleAssetChange(slotKey, newUrl) {
    await setAssetSlot(slotKey, newUrl);
    refresh();
  }

  const grouped = {};
  slots.forEach(s => { (grouped[s.category] ||= []).push(s); });

  return (
    <div className="stack" style={{ gap: 'var(--space-4)' }}>
      <p className="muted" style={{ fontSize: 'var(--text-caption)' }}>
        Upload your own image, or paste a link to one you've already got hosted somewhere (Google Drive
        share link, Imgur, etc.). Leave unset to use the built-in illustrated scene. Banners work best
        around 1600×440px, landscape.
      </p>
      {Object.entries(grouped).map(([category, items]) => (
        <div key={category}>
          <div className="section-label" style={{ marginBottom: 'var(--space-2)' }}>{category}</div>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            {items.map(slot => (
              <Card key={slot.key}>
                <div style={{ fontWeight: 700, fontSize: 'var(--text-small)' }}>{slot.label}</div>
                <div className="muted" style={{ fontSize: 'var(--text-micro)', marginBottom: 'var(--space-2)' }}>{slot.usedIn}</div>
                <ImageUploadField
                  value={slot.image_url}
                  onChange={url => handleAssetChange(slot.key, url)}
                  folder={slot.key}
                  previewStyle={
                    category === 'Banners'
                      ? { width: 160, height: 44, borderRadius: 4, objectFit: 'cover' }
                      : { width: 48, height: 48, borderRadius: '50%', objectFit: 'cover' }
                  }
                />
              </Card>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
