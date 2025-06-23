import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProtocolContext } from '../ProtocolContext';
import './HostSetup.css';

export default function HostSetup() {
  console.debug('HostSetup: Render');
  const navigate = useNavigate();
  const { protocol } = useProtocolContext();
  const [peerId, setPeerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(true);

  useEffect(() => {
    console.debug('HostSetup: useEffect, protocol:', protocol);
    if (!protocol || !protocol.peer) return;
    setPeerId(protocol.peer.id || '');
    protocol.onConnect(() => {
      console.debug('HostSetup: onConnect ausgelöst');
      setWaiting(false);
      navigate('/chat', { replace: true });
    });
    // eslint-disable-next-line
  }, [protocol, navigate]);

  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
  const chatLink = peerId ? `${baseUrl}?host-id=${peerId}` : '';

  return (
    <div className="host-setup-container">
      <h2>Your Host ID</h2>
      <div className="host-id-row">
        <span className="host-id">{peerId || '...'}</span>
        <button
          className="copy-hostid-btn"
          onClick={() => {
            if (chatLink) {
              navigator.clipboard.writeText(chatLink);
              setCopied(true);
              setTimeout(() => setCopied(false), 1200);
            }
          }}
          style={{ marginLeft: 12 }}
          disabled={!chatLink}
        >
          {copied ? 'Link copied!' : 'Copy link'}
        </button>
      </div>
      <div className="host-waiting-status">
        {waiting ? 'Waiting for connection...' : 'Connected!'}
      </div>
    </div>
  );
}
