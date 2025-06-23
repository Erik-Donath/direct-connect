import React, { createContext, useContext, useRef, useState } from 'react';

const ProtocolContext = createContext();

export function ProtocolProvider({ children }) {
  console.debug('ProtocolProvider: Render');
  const protocolRef = useRef(null);
  const [protocol, setProtocol] = useState(null);

  const destroyProtocol = () => {
    console.debug('ProtocolProvider: destroyProtocol');
    protocolRef.current?.destroy();
    protocolRef.current = null;
    setProtocol(null);
  };

  const setNewProtocol = (proto) => {
    console.debug('ProtocolProvider: setNewProtocol', proto);
    // Nur zerstören, wenn ein anderes Protokoll gesetzt wird
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

export function useProtocolContext() {
  return useContext(ProtocolContext);
}
