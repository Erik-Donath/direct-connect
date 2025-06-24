import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProtocolContext } from '../ProtocolContext.js';
import Message from '../components/Message.jsx';
import './Chat.css';

export default function Chat() {
  const navigate = useNavigate();
  const { protocol } = useProtocolContext();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [disconnected, setDisconnected] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (!protocol || !protocol.isReady()) {
      console.warn('[Chat] No protocol or connection found, redirecting to home.');
      navigate('/', { replace: true });
    }
  }, [protocol, navigate]);

  useEffect(() => {
    if (!protocol || !protocol.isReady()) return;
    if (protocol.connection.conn.open) {
      setIsOpen(true);
      console.debug('[Chat] Connection is open.');
      return;
    }
    const handleOpen = () => {
      setIsOpen(true);
      console.debug('[Chat] Connection opened.');
    };
    protocol.connection.conn.on('open', handleOpen);
    return () => protocol.connection.conn.off('open', handleOpen);
  }, [protocol]);

  useEffect(() => {
    if (!protocol || !isOpen) return;
    const onMsg = (text, timestamp) => {
      setMessages(msgs => [...msgs, { 
        sender: 'peer', 
        text, 
        timestamp: timestamp || Date.now() 
      }]);
      console.debug('[Chat] Received message:', text);
    };
    protocol.onMessage(onMsg);
    return () => protocol.onMessage(null);
  }, [protocol, isOpen]);

  useEffect(() => {
    if (!protocol || !protocol.isReady()) return;
    const handleClose = () => {
      setDisconnected(true);
      console.warn('[Chat] Connection closed.');
    };
    protocol.connection.conn.on('close', handleClose);
    return () => {
      if(protocol && protocol.isReady())
        protocol.connection.conn.off('close', handleClose);
    }
  }, [protocol]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim()) {
      console.warn('[Chat] Tried to send empty message.');
      return;
    }
    if (!protocol) {
      console.error('[Chat] No protocol instance for sending message.');
      return;
    }
    if (disconnected) {
      console.warn('[Chat] Tried to send message while disconnected.');
      return;
    }
    if (!isOpen) {
      console.warn('[Chat] Tried to send message while connection not open.');
      return;
    }
    
    const timestamp = Date.now();
    try {
      await protocol.sendMessage(input);
      setMessages(msgs => [...msgs, { 
        sender: 'self', 
        text: input, 
        timestamp 
      }]);
      console.debug('[Chat] Sent message:', input);
      setInput('');
    } catch (err) {
      console.error('[Chat] Failed to send message:', err);
    }
  };

  if (!protocol || (!protocol.isReady() && !disconnected)) return null;

  return (
    <>
      <div className="chat-messages">
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
      <div className="chat-input-row">
        <input
          className="chat-input"
          type="text"
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={disconnected ? 'Connection closed' : 'Type your message...'}
          disabled={!protocol || disconnected || !isOpen}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
        />
        <button
          className="chat-send"
          onClick={sendMessage}
          disabled={!protocol || !input.trim() || disconnected || !isOpen}
        >
          Send
        </button>
      </div>
      {disconnected && (
        <div className="chat-back-center">
          <button
            className="chat-send"
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
