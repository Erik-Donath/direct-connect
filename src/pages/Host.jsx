import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProtocolContext } from '../ProtocolContext.js';
import Protocol from '../Protocol.js';
import './Host.css';

function copyToClipboard(text, onSuccess, onError) {
  if (!text) return;
  navigator.clipboard.writeText(text)
    .then(onSuccess)
    .catch(err => {
      console.error('[Host] Failed to copy chat link:', err);
      if (onError) onError(err);
    });
}

export default function Host() {
  const navigate = useNavigate();
  const { setNewProtocol } = useProtocolContext();
  const [peerId, setPeerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    if (peerId) return;
    setInitializing(true);
    setError('');
    setWaiting(true);
    Protocol.host().then(proto => {
      setNewProtocol(proto);
      setInitializing(false);
      console.debug('[Host] Host protocol initialized.');
      proto.onConnect(() => {
        setWaiting(false);
        console.debug('[Host] Peer connected, navigating to /chat.');
        navigate('/chat', { replace: true });
      });
      setPeerId(proto.getPeerId());
      console.debug('[Host] PeerId set:', proto.getPeerId());
    }).catch(err => {
      console.error('[Host] Protocol.host error:', err);
      setError('Failed to initialize host: ' + err.message);
      setInitializing(false);
    });
  }, [navigate, setNewProtocol, peerId]);

  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
  const chatLink = peerId ? `${baseUrl}#/?host-id=${peerId}` : '';

  if (error) {
    console.error('[Host] Error state:', error);
    return (
      <div className="host-container">
        <h2>Host Setup Error</h2>
        <div style={{ color: '#d63031', textAlign: 'center', marginBottom: 16 }}>
          {error}
        </div>
        <button
          className="copy-hostid-btn"
          onClick={() => navigate('/')}
        >
          Back to Home
        </button>
      </div>
    );
  }

  if (initializing) {
    console.debug('[Host] Initializing host...');
    return (
      <div className="host-container">
        <h2>Initializing Host...</h2>
        <div className="host-waiting-status">
          Setting up your host connection...
        </div>
      </div>
    );
  }

  return (
    <div className="host-container">
      <h2>Your Host ID</h2>
      <div className="host-id-row">
        <span className="host-id">{peerId || '...'}</span>
        <button
          className="copy-hostid-btn"
          onClick={() => {
            if (chatLink) {
              copyToClipboard(
                chatLink,
                () => {
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1200);
                  console.debug('[Host] Chat link copied to clipboard:', chatLink);
                },
                () => setCopied(false)
              );
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