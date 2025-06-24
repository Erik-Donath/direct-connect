import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Protocol from '../Protocol';
import { useProtocolContext } from '../ProtocolContext.js';
import './App.css';

export default function App() {
  const [hostId, setHostId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setNewProtocol, destroyProtocol } = useProtocolContext();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hostIdParam = params.get('host-id');
    if (hostIdParam) {
      setHostId(hostIdParam);
      setTimeout(() => handleConnect(hostIdParam), 0);
      console.debug('[App] Auto-connecting with hostId from URL:', hostIdParam);
    }
  }, []);

  const handleHost = () => {
    navigate('/host');
  };

  const handleConnect = (idOverride) => {
    setError('');
    setConnecting(true);
    try {
      destroyProtocol();
    } catch (err) {
      console.warn('[App] Error destroying previous protocol:', err);
    }
    const targetId = idOverride || hostId;
    if (!targetId) {
      setError('No Host ID provided.');
      setConnecting(false);
      console.warn('[App] No Host ID provided for connection.');
      return;
    }
    console.debug('[App] Attempting connection to hostId:', targetId);
    Protocol.connect(targetId).then(proto => {
      setNewProtocol(proto);
      console.debug('[App] Connection established, navigating to /chat');
      navigate('/chat');
    }).catch(err => {
      setError('Connection failed: ' + err.message);
      setConnecting(false);
      console.error('[App] Connection failed:', err);
    });
  };

  return (
    <div className="app-flex">
      <div className="app-side left">
        <input
          type="text"
          value={hostId}
          onChange={e => setHostId(e.target.value)}
          placeholder="Enter Host ID"
          className="app-input"
          disabled={connecting}
        />
        <button
          onClick={() => handleConnect()}
          className="app-button"
          disabled={connecting || !hostId}
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
        {error && (
          <div style={{ color: '#d63031', marginTop: 12, textAlign: 'center', minHeight: 24 }}>
            {error}
          </div>
        )}
      </div>
      <div className="app-side right">
        <button
          onClick={handleHost}
          className="app-button host"
        >
          Host / Create
        </button>
      </div>
    </div>
  );
}
