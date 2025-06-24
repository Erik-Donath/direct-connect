import { ProtocolContext } from './ProtocolContext.js';
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';

function ProtocolProvider({ children }) {
  const protocolRef = useRef(null);
  const [protocol, setProtocol] = useState(null);

  const destroyProtocol = () => {
    try {
      protocolRef.current?.destroy();
      protocolRef.current = null;
      setProtocol(null);
      console.debug('[ProtocolProvider] Protocol destroyed.');
    } catch (err) {
      console.error('[ProtocolProvider] Error destroying protocol:', err);
    }
  };

  const setNewProtocol = (proto) => {
    if (protocolRef.current && protocolRef.current !== proto) {
      destroyProtocol();
    }
    protocolRef.current = proto;
    setProtocol(proto);
    console.debug('[ProtocolProvider] New protocol set.');
  };

  return (
    <ProtocolContext.Provider value={{
      protocol,
      setNewProtocol,
      destroyProtocol,
      protocolRef,
    }}>
      {children}
    </ProtocolContext.Provider>
  );
}

ProtocolProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export { ProtocolProvider };
export default ProtocolProvider;
