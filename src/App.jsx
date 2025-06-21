import { useState, useEffect } from 'react';
import './App.css';
import { useNavigate } from 'react-router-dom';
import { usePeer } from './PeerContext';

function App() {
  const [hostId, setHostId] = useState('Loading...');
  const [clientId, setClientId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const navigate = useNavigate();
  const peer = usePeer();

  useEffect(() => {
    if (!peer) return;
    const handleOpen = (id) => setHostId(id);
    peer.on('open', handleOpen);
    return () => peer.off('open', handleOpen);
  }, [peer]);

  const handleHost = () => {
    console.log('Host ID:', hostId);
    navigate('/chat', { state: { isHost: true, hostId } });
  };

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const conn = peer.connect(clientId);
      conn.on('open', () => {
        conn.send('Hello');
        navigate('/chat', { state: { isHost: false, hostId: clientId } });
      });
      conn.on('error', () => {
        alert('Connection failed!');
        setConnecting(false);
      });
      setTimeout(() => {
        if (conn.open === false) {
          alert('Peer not found!');
          setConnecting(false);
        }
      }, 4000);
    } catch (e) {
      alert('Error while connecting!');
      setConnecting(false);
    }
  };

  return (
    <div className="app-root">
      <div className="app-panel">
        <h2 className="app-title">Direct Connect</h2>
        <div className="app-flex">
          {/* Left side: Connect */}
          <div className="app-side left">
            <input
              type="text"
              value={clientId}
              onChange={e => setClientId(e.target.value)}
              placeholder="Enter Peer ID"
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
          </div>
          {/* Right side: Host */}
          <div className="app-side right">
            <div className="app-id-label">Your Host ID:</div>
            <div className="app-id-value">{hostId}</div>
            <button
              onClick={handleHost}
              className="app-button host"
            >
              Host / Create
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
