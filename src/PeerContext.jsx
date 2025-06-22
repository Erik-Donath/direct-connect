import { createContext, useContext, useRef, useState } from 'react';

const PeerContext = createContext();

export function PeerProvider({ children }) {
  // UseRef for peer to persist across renders and navigation
  const peerRef = useRef(null);
  const [connection, setConnection] = useState(null);

  // Helper to set peer only once
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
