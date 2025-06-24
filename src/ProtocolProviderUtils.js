import { createContext, useContext } from 'react';

const ProtocolContext = createContext();
const useProtocolContext = () => useContext(ProtocolContext);

export { ProtocolContext, useProtocolContext };
