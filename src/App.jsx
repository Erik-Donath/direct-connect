import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeer } from './PeerContext';
import './App.css';

function App() {
  const [hostId, setHostId] = useState('Loading...');
  const [clientId, setClientId] = useState('');
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const peer = usePeer();

  useEffect(() => {
    if (!peer) return;
    const handleOpen = (id) => setHostId(id);
    peer.on('open', handleOpen);
    return () => peer.off('open', handleOpen);
  }, [peer]);

  const handleHost = () => {
    setError('');
    console.log('Host ID:', hostId);
    navigate('/chat', { state: { isHost: true, hostId } });
  };

  const handleConnect = async () => {
    setError('');
    setConnecting(true);
    try {
      const conn = peer.connect(clientId);
      conn.on('open', () => {
        conn.send('Hello');
        navigate('/chat', { state: { isHost: false, hostId: clientId } });
      });
      conn.on('error', (err) => {
        console.error('Connection failed!', err);
        setError('Connection failed! Please check the ID and try again.');
        setConnecting(false);
      });
      setTimeout(() => {
        if (conn.open === false) {
          console.error('Peer not found!');
          setError('Peer not found! Please check the ID.');
          setConnecting(false);
        }
      }, 4000);
    } catch (e) {
      console.error('Error while connecting!', e);
      setError('Error while connecting!');
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
            {error && (
              <div style={{ color: '#d63031', marginTop: 12, textAlign: 'center', minHeight: 24 }}>
                {error}
              </div>
            )}
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
