import { createContext, useContext, useRef, useState } from 'react';

const PeerContext = createContext();

export function PeerProvider({ children }) {
  const peerRef = useRef(null);
  const [connection, setConnection] = useState(null);

  const setPeer = (newPeer) => {
    if (peerRef.current) {
      try { peerRef.current.destroy(); } catch {}
    }
    peerRef.current = newPeer;
  };

  return (
    <PeerContext.Provider value={{ peer: peerRef.current, setPeer, connection, setConnection, peerRef }}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeerContext() {
  return useContext(PeerContext);
}
