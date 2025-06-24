import PropTypes from 'prop-types';
import './Message.css';

export default function Message({ text, sender, timestamp }) {
  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <div className={`message ${sender === 'self' ? 'message-self' : 'message-peer'}`}>
      <div className="message-content">
        <span className="message-text">{text}</span>
        <span className="message-timestamp">{formatTime(timestamp)}</span>
      </div>
    </div>
  );
}

Message.propTypes = {
  text: PropTypes.string.isRequired,
  sender: PropTypes.string.isRequired,
  timestamp: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.number
  ]).isRequired,
};
