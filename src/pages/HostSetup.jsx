import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProtocolContext } from '../protocolContextUtils.js';
import Protocol from '../Protocol';
import './HostSetup.css';

export default function HostSetup() {
  // Debug statement removed: Logging rendering in React components is not useful.
  const navigate = useNavigate();
  const { protocol, setNewProtocol } = useProtocolContext();
  const [peerId, setPeerId] = useState('');
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [error, setError] = useState('');
  const [initializing, setInitializing] = useState(false);

  useEffect(() => {
    console.debug('[HostSetup] useEffect: Protokoll-Status', protocol);
    
    // Check if a pair is already established or if a new one has to be created
    if (!protocol) {
      console.debug('[HostSetup] Kein Protokoll vorhanden, erstelle neuen Host');
      setInitializing(true);
      setError('');
      Protocol.host().then(proto => {
        console.debug('[HostSetup] Protocol.host erfolgreich:', proto);
        setNewProtocol(proto);
        setInitializing(false);
      }).catch(err => {
        console.error('[HostSetup] Protocol.host Fehler:', err);
        setError('Failed to initialize host: ' + err.message);
        setInitializing(false);
      });
      return;
    }

    // Protocol exists, check if it's properly set up
    if (!protocol.peer) {
      console.debug('[HostSetup] Protokoll vorhanden, Peer aber nicht bereit');
      return;
    }

    console.debug('[HostSetup] Existierendes Protokoll-Paar wird verwendet');
    setPeerId(protocol.peer.id || '');
    protocol.onConnect(() => {
      console.debug('[HostSetup] onConnect ausgelöst, weiter zu Chat');
      setWaiting(false);
      navigate('/chat', { replace: true });
    });
  }, [protocol, navigate, setNewProtocol]);

  const baseUrl = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '/');
  const chatLink = peerId ? `${baseUrl}?host-id=${peerId}` : '';

  if (error) {
    return (
      <div className="host-setup-container">
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
    return (
      <div className="host-setup-container">
        <h2>Initializing Host...</h2>
        <div className="host-waiting-status">
          Setting up your host connection...
        </div>
      </div>
    );
  }

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
