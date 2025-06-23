import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePeerContext } from '../PeerContext';
import { pParse, pMessage } from '../Protocol';
import './ChatWindow.css';

function ChatWindow() {
  const navigate = useNavigate();
  const { connection } = usePeerContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  // Redirects to the start page if there is no active connection
  useEffect(() => {
    if (!connection) {
      navigate('/', { replace: true });
    }
  }, [connection, navigate]);

  // Only renders the chat once the connection is open
  useEffect(() => {
    if (!connection) return;
    if (connection.open) {
      setIsOpen(true);
      return;
    }
    const handleOpen = () => setIsOpen(true);
    connection.on('open', handleOpen);
    return () => connection.off('open', handleOpen);
  }, [connection]);

  // Listens for incoming messages when the connection is open
  useEffect(() => {
    if (!connection || !isOpen) return;
    const onData = (data) => {
      const text = pParse(data) || "Failed to parse message";

      setMessages((msgs) => [...msgs, { sender: 'Peer', text: text }]);
    };
    connection.on('data', onData);
    return () => connection.off('data', onData);
  }, [connection, isOpen]);

  // Sets the disconnected state if the connection is closed
  useEffect(() => {
    if (!connection) return;
    const handleClose = () => setDisconnected(true);
    connection.on('close', handleClose);
    return () => connection.off('close', handleClose);
  }, [connection]);

  // Scrolls to the latest message whenever messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !connection || !isOpen) return;
    connection.send(pMessage(input));
    setMessages((msgs) => [...msgs, { sender: 'You', text: input }]);
    setInput('');
  };

  if (!connection || !isOpen) return null;

  return (
    <>
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
          disabled={!connection || disconnected || !isOpen}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="chatwindow-send"
          onClick={sendMessage}
          disabled={!connection || !input.trim() || disconnected || !isOpen}
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
