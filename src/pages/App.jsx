import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Peer } from 'peerjs';
import { usePeerContext } from '../PeerContext';
import './App.css';

function App() {
  const [clientId, setClientId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { peer, setPeer, setConnection, peerRef } = usePeerContext();

  // Automatically connects if a host link with a host-id query parameter is present
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hostIdParam = params.get('host-id');
    if (hostIdParam) {
      setClientId(hostIdParam);
      setTimeout(() => handleConnect(hostIdParam), 0);
    }
    // eslint-disable-next-line
  }, []);

  const handleHost = () => {
    setError('');
    setConnecting(false);
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
    }
    const newPeer = new Peer();
    setPeer(newPeer);
    newPeer.on('open', () => {
      navigate('/host');
    });
    newPeer.on('error', (err) => {
      setError('PeerJS error: ' + err.message);
    });
  };

  const handleConnect = (idOverride) => {
    setError('');
    setConnecting(true);
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
    }
    const newPeer = new Peer();
    setPeer(newPeer);
    newPeer.on('open', () => {
      const targetId = idOverride || clientId;
      const conn = newPeer.connect(targetId);
      conn.on('open', () => {
        setConnection(conn);
        navigate('/chat');
      });
      conn.on('error', () => {
        setError('Connection failed! Please check the ID and try again.');
        setConnecting(false);
        newPeer.destroy();
      });
      setTimeout(() => {
        if (!conn.open) {
          setError('Peer not found! Please check the ID.');
          setConnecting(false);
          newPeer.destroy();
        }
      }, 4000);
    });
    newPeer.on('error', () => {
      setError('PeerJS error.');
      setConnecting(false);
      newPeer.destroy();
    });
  };

  return (
    <div className="app-flex">
      {/* Client: Connect section */}
      <div className="app-side left">
        <input
          type="text"
          value={clientId}
          onChange={e => setClientId(e.target.value)}
          placeholder="Enter Host ID"
          className="app-input"
          disabled={connecting}
        />
        <button
          onClick={() => handleConnect()}
          className="app-button"
          disabled={connecting || !clientId}
        >
          {connecting ? 'Connecting...' : 'Connect'}
        </button>
        {error && (
          <div style={{ color: '#d63031', marginTop: 12, textAlign: 'center', minHeight: 24 }}>
            {error}
          </div>
        )}
      </div>
      {/* Host: Setup section */}
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

export default App;
