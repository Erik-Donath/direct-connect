import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeerContext } from '../PeerContext';
import Peer from 'peerjs';
import './HostSetup.css';

function HostSetup() {
  const navigate = useNavigate();
  const { peerRef, setConnection } = usePeerContext();
  const [copied, setCopied] = useState(false);
  const [waiting, setWaiting] = useState(true);
  const [peerId, setPeerId] = useState(null);

  useEffect(() => {
    const peer = peerRef.current;
    if (!peer) return;
    
    // Navigates to the chat page when a connection is established
    const onConnection = (conn) => {
      setConnection(conn);
      setWaiting(false);
      navigate('/chat', { replace: true });
    };
    peer.on('connection', onConnection);
    return () => peer.off('connection', onConnection);
  }, [peerRef, setConnection, navigate]);

  useEffect(() => {
    if (!peerRef.current) {
      const peer = new Peer();
      peerRef.current = peer;
      peer.on('open', (id) => {
        setPeerId(id);
      });
    } else {
      setPeerId(peerRef.current.id);
    }
  }, [peerRef]);

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

export default HostSetup;
