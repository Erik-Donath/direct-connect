import { ProtocolContext } from './ProtocolProviderUtils';
import { useRef, useState } from 'react';
import PropTypes from 'prop-types';

function ProtocolProvider({ children }) {
  const protocolRef = useRef(null);
  const [protocol, setProtocol] = useState(null);

  const destroyProtocol = () => {
    protocolRef.current?.destroy();
    protocolRef.current = null;
    setProtocol(null);
  };

  const setNewProtocol = (proto) => {
    // Only destroy if a different protocol is being set
    if (protocolRef.current && protocolRef.current !== proto) {
      destroyProtocol();
    }
    protocolRef.current = proto;
    setProtocol(proto);
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
