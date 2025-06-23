import Peer from 'peerjs';

const PROTOCOL_VERSION = '1.0.0';

// Shared peer instance that is only created once
let shared_pair = null;

// Protocol method definitions with handlers and required parameters
const PROTOCOL_METHODS = {
  disconnect: {
    params: ['reason'],
    handler: (protocol, params) => {
      console.debug('Protocol: disconnect handler', params);
      if (protocol.callbacks.onDisconnect) {
        protocol.callbacks.onDisconnect(params.reason);
      }
      if (protocol.conn) {
        protocol.conn.close();
      }
    }
  },
  
  message: {
    params: ['text', 'timestamp'],
    handler: (protocol, params) => {
      console.debug('Protocol: message handler', params);
      if (protocol.callbacks.onMessage) {
        protocol.callbacks.onMessage(params.text, params.timestamp);
      }
    }
  },
  
  handshake: {
    params: ['version'],
    handler: (protocol, params) => {
      console.debug('Protocol: handshake handler', params);
      if (params.version === PROTOCOL_VERSION) {
        // Only clients should respond to handshake with their own handshake
        // Hosts should not send handshake back when they receive one
        if (!protocol._isHost && !protocol._handshakeDone) {
          protocol.sendHandshake();
        }
        protocol._handshakeDone = true;
        if (protocol.callbacks.onConnect) {
          protocol.callbacks.onConnect();
        }
        protocol._startPingSystem();
      } else {
        protocol.sendDisconnect('version-mismatch');
        protocol.conn.close();
      }
    }
  },
  
  ping: {
    params: ['timestamp'],
    handler: (protocol, params) => {
      console.debug('Protocol: ping handler', params);
      protocol._lastPingReceived = Date.now();
      if (protocol.callbacks.onPing) {
        protocol.callbacks.onPing(params.timestamp);
      }
    }
  }
};

// Function to create shared peer instance
function createSharedPair() {
  console.debug('Protocol: createSharedPair() called');
  return new Promise((resolve, reject) => {
    if (shared_pair) {
      console.debug('Protocol: shared_pair already exists, reusing');
      resolve(shared_pair);
      return;
    }
    
    const peer = new Peer();
    peer.on('open', () => {
      console.debug('Protocol: Shared peer opened');
      shared_pair = peer;
      resolve(peer);
    });
    peer.on('error', (err) => {
      console.debug('Protocol: Shared peer error', err);
      shared_pair = null;
      reject(err);
    });
  });
}

class Protocol {
  constructor(peer) {
    console.debug('Protocol: Constructor', peer);
    this.peer = peer;
    this.conn = null;
    this._handshakeDone = false;
    this._isHost = false;
    this._pingInterval = null;
    this._pingTimeout = null;
    this._lastPingReceived = null;
    
    // Callbacks for UI integration
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onMessage: null,
      onPing: null
    };
  }

  static host() {
    console.debug('Protocol: host() called');
    return new Promise((resolve, reject) => {
      // Both client and host need a Peer object, so both host and connect functions are the same at the beginning
      createSharedPair().then(peer => {
        console.debug('Protocol: Host using shared peer');
        const proto = new Protocol(peer);
        proto._isHost = true;
        
        // Set up connection handler with client limit check
        peer.on('connection', conn => {
          // Only one client can connect - check if we already have a connection
          if (proto.conn !== null) {
            console.debug('Protocol: Rejecting connection - already have a client connected');
            conn.close();
            return;
          }
          proto._handleConnection(conn);
        });
        
        resolve(proto);
      }).catch(reject);
    });
  }

  static connect(hostId) {
    console.debug('Protocol: connect() called', hostId);
    return new Promise((resolve, reject) => {
      // Both client and host need a Peer object, so both host and connect functions are the same at the beginning
      createSharedPair().then(peer => {
        console.debug('Protocol: Client using shared peer');
        const proto = new Protocol(peer);
        proto._isHost = false;
        
        // Connect function uses the shared_pair and calls .connect for the connection pair needed by the client
        const conn = peer.connect(hostId);
        proto._handleConnection(conn, resolve, reject);
      }).catch(reject);
    });
  }

  // Get list of available protocol methods
  getProtocolMethods() {
    return Object.keys(PROTOCOL_METHODS);
  }

  // Callback setters for UI integration
  onConnect(callback) {
    this.callbacks.onConnect = callback;
  }

  onDisconnect(callback) {
    this.callbacks.onDisconnect = callback;
  }

  onMessage(callback) {
    this.callbacks.onMessage = callback;
  }

  onPing(callback) {
    this.callbacks.onPing = callback;
  }

  // Send methods for each protocol method
  sendDisconnect(reason = 'user-disconnect') {
    console.debug('Protocol: sendDisconnect', reason);
    this._send({ type: 'disconnect', reason });
  }

  sendMessage(text, timestamp = Date.now()) {
    console.debug('Protocol: sendMessage', text, timestamp);
    if (this.conn && this.conn.open && this._handshakeDone) {
      this._send({ type: 'message', text, timestamp });
    }
  }

  sendHandshake(version = PROTOCOL_VERSION) {
    console.debug('Protocol: sendHandshake', version);
    this._send({ type: 'handshake', version });
  }

  sendPing(timestamp = Date.now()) {
    console.debug('Protocol: sendPing', timestamp);
    this._send({ type: 'ping', timestamp });
  }

  _handleConnection(conn, resolve, reject = null) {
    console.debug('Protocol: _handleConnection', conn);
    this.conn = conn;
    
    conn.on('data', (data) => {
      this._processMessage(data);
    });
    
    conn.on('open', () => {
      console.debug('Protocol: Connection opened');
      
      // Host sends handshake first
      if (this._isHost) {
        this.sendHandshake();
      }
      
      // Set up connection timeout for clients
      if (!this._isHost && reject) {
        setTimeout(() => {
          if (!this._handshakeDone) {
            reject(new Error('Handshake timeout'));
          }
        }, 4000);
      }
    });
    
    conn.on('close', () => {
      console.debug('Protocol: Connection closed');
      this.conn = null;
    });
    
    conn.on('error', (err) => {
      console.debug('Protocol: Connection error', err);
      this.conn = null;
      if (reject) reject(err);
    });
    
    // For clients, resolve after successful handshake
    if (!this._isHost && resolve) {
      const originalOnConnect = this.callbacks.onConnect;
      this.callbacks.onConnect = () => {
        resolve(this);
        this.callbacks.onConnect = originalOnConnect;
        if (originalOnConnect) originalOnConnect();
      };
    }
  }

  // Central message processing function
  _processMessage(rawData) {
    console.debug('Protocol: _processMessage', rawData);
    
    const message = this._parseMessage(rawData);
    if (!message) {
      console.warn('Protocol: Failed to parse message', rawData);
      return;
    }
    
    const { type } = message;
    const methodDef = PROTOCOL_METHODS[type];
    
    if (!methodDef) {
      console.warn('Protocol: Unknown message type', type);
      return;
    }
    
    // Validate required parameters
    const params = this._validateParams(message, methodDef.params);
    if (!params) {
      console.warn('Protocol: Invalid parameters for', type, message);
      return;
    }
    
    // Call the handler
    try {
      methodDef.handler(this, params);
    } catch (error) {
      console.error('Protocol: Handler error for', type, error);
    }
  }

  _parseMessage(rawData) {
    try {
      const obj = typeof rawData === 'object' ? rawData : JSON.parse(rawData);
      if (!obj.type) {
        console.warn('Protocol: Message missing type field');
        return null;
      }
      return obj;
    } catch (error) {
      console.warn('Protocol: JSON parse error', error);
      return null;
    }
  }

  _validateParams(message, requiredParams) {
    const params = {};
    
    for (const param of requiredParams) {
      if (!(param in message)) {
        console.warn('Protocol: Missing required parameter', param);
        return null;
      }
      params[param] = message[param];
    }
    
    return params;
  }

  _send(obj) {
    console.debug('Protocol: _send', obj);
    if (this.conn && this.conn.open) {
      this.conn.send(JSON.stringify(obj));
    }
  }

  _startPingSystem() {
    console.debug('Protocol: _startPingSystem');
    this._lastPingReceived = Date.now();

    // Clear any existing ping system first
    this._clearPingSystem();

    this._pingInterval = setInterval(() => {
      if (this.conn && this.conn.open) {
        this.sendPing();
      }

      if (this._lastPingReceived && Date.now() - this._lastPingReceived > 3000) {
        console.debug('Protocol: Ping timeout, closing connection');
        this._forceClose();
      }
    }, 1000);
  }

  _forceClose() {
    console.debug('Protocol: _forceClose');
    this._clearPingSystem();
    if (this.conn) {
      try { 
        this.conn.close(); 
      } catch (error) {
        // Ignore connection close errors
        console.debug('Protocol: Error closing connection', error);
      }
    }
    // Don't destroy shared peer, just clear connection
    this.conn = null;
  }

  _clearPingSystem() {
    console.debug('Protocol: _clearPingSystem');
    if (this._pingInterval) {
      clearInterval(this._pingInterval);
      this._pingInterval = null;
    }
    if (this._pingTimeout) {
      clearInterval(this._pingTimeout);
      this._pingTimeout = null;
    }
  }

  destroy() {
    console.debug('Protocol: destroy');
    this._clearPingSystem();
    if (this.conn) {
      try { 
        this.conn.close(); 
      } catch (error) {
        // Ignore connection close errors
        console.debug('Protocol: Error closing connection during destroy', error);
      }
    }
    // Don't destroy shared peer, just clear reference
    this.conn = null;
    this.peer = null;
    // Clear all callbacks
    Object.keys(this.callbacks).forEach(key => {
      this.callbacks[key] = null;
    });
    this._lastPingReceived = null;
  }
}

export default Protocol;
export { PROTOCOL_METHODS };
