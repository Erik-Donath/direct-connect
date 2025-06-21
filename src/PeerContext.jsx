import React, { createContext, useContext, useRef } from 'react';
import { Peer } from 'peerjs';

const PeerContext = createContext();

export function PeerProvider({ children }) {
  // Peer-Instanz bleibt über die gesamte App-Lebensdauer erhalten
  const peerRef = useRef(null);
  if (!peerRef.current) {
    peerRef.current = new Peer();
  }
  return (
    <PeerContext.Provider value={peerRef.current}>
      {children}
    </PeerContext.Provider>
  );
}

export function usePeer() {
  return useContext(PeerContext);
}
