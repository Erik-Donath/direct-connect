import { useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { usePeerContext } from '../PeerContext';
import './ChatWindow.css';

function ChatWindow() {
  const location = useLocation();
  const navigate = useNavigate();
  const { isHost, hostId } = location.state || {};
  const { peer, connection, setConnection } = usePeerContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const messagesEndRef = useRef(null);

  // Redirect to / if no valid hostId or peer
  useEffect(() => {
    if (!hostId || !peer) {
      navigate('/', { replace: true });
    }
  }, [hostId, peer, navigate]);

  // Host: wait for incoming connection
  useEffect(() => {
    if (!peer || !isHost) return;
    const onConnection = (conn) => {
      setConnection(conn);

      // Remove all previous listeners to avoid duplicates
      conn.off('data');
      conn.on('data', (data) => {
        setMessages((msgs) => [...msgs, { sender: 'Peer', text: data }]);
      });
    };
    peer.on('connection', onConnection);
    return () => peer.off('connection', onConnection);
  }, [peer, isHost, setConnection]);

  // Client: listen for incoming messages
  useEffect(() => {
    if (!connection) return;

    // Remove all previous listeners to avoid duplicates
    connection.off('data');
    const onData = (data) => {
      setMessages((msgs) => [...msgs, { sender: 'Peer', text: data }]);
    };
    connection.on('data', onData);
    return () => connection.off('data', onData);
  }, [connection]);

  // Handle connection close event for both host and client
  useEffect(() => {
    if (!connection) return;
    const handleClose = () => {
      setDisconnected(true);
    };
    connection.on('close', handleClose);
    return () => connection.off('close', handleClose);
  }, [connection]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !connection) return;
    connection.send(input);
    setMessages((msgs) => [...msgs, { sender: 'You', text: input }]);
    setInput('');
  };

  return (
    <>
      <div className="chatwindow-info">
        <span>Connection type: <b>{isHost ? 'Host' : 'Client'}</b></span>
        <span>Host ID: <b>{hostId}</b></span>
        <span>Status: <b>{disconnected ? 'Disconnected' : connection ? 'Active' : isHost ? 'Waiting for connection...' : 'Connecting...'}</b></span>
      </div>
      <div className="chatwindow-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`chatwindow-message ${msg.sender === 'You' ? 'self' : 'peer'}`}>
            <span>{msg.text}</span>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      <div className="chatwindow-input-row">
        <input
          className="chatwindow-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={disconnected ? 'Connection closed' : 'Type your message...'}
          disabled={!connection || disconnected}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="chatwindow-send"
          onClick={sendMessage}
          disabled={!connection || !input.trim() || disconnected}
        >
          Send
        </button>
      </div>
      {disconnected && (
        <div className="chatwindow-back-center">
          <button
            className="chatwindow-send"
            style={{ marginTop: 16 }}
            onClick={() => navigate('/')}
          >
            Back to Start
          </button>
        </div>
      )}
    </>
  );
}

export default ChatWindow;
