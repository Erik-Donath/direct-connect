import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProtocolContext } from '../protocolContextUtils.js';
import Message from '../components/Message';
import './ChatWindow.css';

export default function ChatWindow() {
  console.debug('ChatWindow: Render');
  const navigate = useNavigate();
  const { protocol } = useProtocolContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    console.debug('ChatWindow: useEffect (protocol/navigate)', protocol);
    if (!protocol || !protocol.conn) {
      navigate('/', { replace: true });
    }
  }, [protocol, navigate]);

  useEffect(() => {
    console.debug('ChatWindow: useEffect (protocol)', protocol);
    if (!protocol || !protocol.conn) return;
    if (protocol.conn.open) {
      setIsOpen(true);
      return;
    }
    const handleOpen = () => setIsOpen(true);
    protocol.conn.on('open', handleOpen);
    return () => protocol.conn.off('open', handleOpen);
  }, [protocol]);

  useEffect(() => {
    console.debug('ChatWindow: useEffect (protocol/isOpen)', protocol, isOpen);
    if (!protocol || !isOpen) return;
    const onMsg = (text, timestamp) => {
      setMessages(msgs => [...msgs, { 
        sender: 'Peer', 
        text, 
        timestamp: timestamp || Date.now() 
      }]);
    };
    protocol.onMessage(onMsg);
    return () => protocol.onMessage(null);
  }, [protocol, isOpen]);

  useEffect(() => {
    if (!protocol || !protocol.conn) return;
    const handleClose = () => setDisconnected(true);
    protocol.conn.on('close', handleClose);
    return () => {
      if(protocol && protocol.conn)
        protocol.conn.off('close', handleClose);
    }
  }, [protocol]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    console.debug('ChatWindow: sendMessage', input);
    if (!input.trim() || !protocol || !isOpen) return;
    const timestamp = Date.now();
    await protocol.sendMessage(input);
    setMessages(msgs => [...msgs, { 
      sender: 'You', 
      text: input, 
      timestamp 
    }]);
    setInput('');
  };

  if (!protocol || !isOpen) return null;

  return (
    <>
      <div className="chatwindow-messages">
        {messages.map((msg, idx) => (
          <Message
            key={idx}
            text={msg.text}
            sender={msg.sender}
            timestamp={msg.timestamp}
          />
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
          disabled={!protocol || disconnected || !isOpen}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="chatwindow-send"
          onClick={sendMessage}
          disabled={!protocol || !input.trim() || disconnected || !isOpen}
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
