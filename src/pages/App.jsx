import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Protocol from '../Protocol';
import { useProtocolContext } from '../ProtocolContext';
import './App.css';

export default function App() {
  console.debug('App: Render');
  const [hostId, setHostId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setNewProtocol, destroyProtocol } = useProtocolContext();

  useEffect(() => {
    console.debug('App: useEffect (componentDidMount)');
    const params = new URLSearchParams(window.location.search);
    const hostIdParam = params.get('host-id');
    if (hostIdParam) {
      setHostId(hostIdParam);
      setTimeout(() => handleConnect(hostIdParam), 0);
    }
    // eslint-disable-next-line
  }, []);

  const handleHost = () => {
    console.debug('App: handleHost called - redirecting to /host');
    navigate('/host');
  };

  const handleConnect = (idOverride) => {
    console.debug('App: handleConnect called', idOverride || hostId);
    setError('');
    setConnecting(true);
    destroyProtocol();
    Protocol.connect(idOverride || hostId).then(proto => {
      console.debug('App: Protocol.connect() successful', proto);
      setNewProtocol(proto);
      navigate('/chat');
    }).catch(err => {
      console.debug('App: Protocol.connect() error', err);
      setError('Connection failed: ' + err.message);
      setConnecting(false);
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
