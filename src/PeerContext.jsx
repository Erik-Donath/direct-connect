import { createContext, useContext, useState } from 'react';

const PeerContext = createContext();

export function PeerProvider({ children }) {
  // Provide peer and connection state, but do not instantiate Peer automatically
  const [peer, setPeer] = useState(null);
  const [connection, setConnection] = useState(null);

  return (
    <PeerContext.Provider value={{ peer, setPeer, connection, setConnection }}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeerContext() {
  return useContext(PeerContext);
}
