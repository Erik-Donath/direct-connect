import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { usePeer } from './PeerContext';
import './ChatWindow.css';

function ChatWindow() {
  const location = useLocation();
  const { isHost, hostId } = location.state || {};
  const peer = usePeer();
  const [connection, setConnection] = useState(null);

  useEffect(() => {
    if (!peer) return;
    if (isHost) {
      // Host waits for incoming connection
      const onConnection = (conn) => {
        setConnection(conn);
        conn.on('data', (data) => {
          // Chat logic can be added here
        });
      };
      peer.on('connection', onConnection);
      return () => peer.off('connection', onConnection);
    } else {
      // Client: connection was already established in App.jsx
      // (Optional: get connection from context if needed)
    }
  }, [peer, isHost]);

  return (
    <div className="chatwindow-root">
      <div className="chatwindow-panel">
        <h2>ChatWindow</h2>
        <p>Connection type: <b>{isHost ? 'Host' : 'Client'}</b></p>
        <p>Host ID: {hostId}</p>
        <p>Status: {isHost ? (connection ? 'Active' : 'Waiting for connection...') : 'Active'}</p>
        {/* Chat logic can be added here */}
      </div>
    </div>
  );
}

export default ChatWindow;
