import React from 'react';

export default function ErrorMessage({ error }) {
  if (!error) return null;
  return (
    <div style={{ color: '#d63031', marginTop: 12, textAlign: 'center', minHeight: 24 }}>
      {error}
    </div>
  );
}
