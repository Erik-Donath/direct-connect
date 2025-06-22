import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Peer } from 'peerjs';
import { usePeerContext } from './PeerContext';
import CentralPanelLayout from "./CentralPanelLayout";
import './App.css';

function App() {
  const [hostId, setHostId] = useState('');
  const [clientId, setClientId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { peer, setPeer, setConnection } = usePeerContext();

  const handleHost = () => {
    setError('');
    setConnecting(false)
    if (peer) peer.destroy(); // Clean up any previous peer

    const newPeer = new Peer();
    setPeer(newPeer);
    newPeer.on('open', (id) => {
      setHostId(id);
      navigate('/chat', { state: { isHost: true, hostId: id } });
    });
    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setError('PeerJS error: ' + err.message);
    });
  };

  const handleConnect = () => {
    setError('');
    setConnecting(true);
    if (peer) peer.destroy();

    const newPeer = new Peer();
    setPeer(newPeer);
    newPeer.on('open', () => {
      const conn = newPeer.connect(clientId);
      conn.on('open', () => {
        setConnection(conn);
        navigate('/chat', { state: { isHost: false, hostId: clientId } });
      });
      conn.on('error', (err) => {
        console.error('Connection error:', err);
        setError('Connection failed! Please check the ID and try again.');
        setConnecting(false);
        newPeer.destroy();
      });
      setTimeout(() => {
        if (!conn.open) {
          console.warn('Connection timed out');
          setError('Peer not found! Please check the ID.');
          setConnecting(false);
          newPeer.destroy();
        }
      }, 4000);
    });

    newPeer.on('error', (err) => {
      console.error('PeerJS error:', err);
      setError('PeerJS error: ' + err.message);
      setConnecting(false);
      newPeer.destroy();
    });
  };

  return (
    <CentralPanelLayout title="Direct Connect">
      <div className="app-flex">
        {/* Left side: Connect as Client */}
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
            onClick={handleConnect}
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
        {/* Right side: Host */}
        <div className="app-side right">
          <div className="app-id-label">Your Host ID:</div>
          <div className="app-id-value">{hostId || 'Press Host to generate'}</div>
          <button
            onClick={handleHost}
            className="app-button host"
          >
            Host / Create
          </button>
        </div>
      </div>
    </CentralPanelLayout>
  );
}

export default App;
