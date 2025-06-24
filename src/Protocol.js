import Peer from 'peerjs';
import E2EE from '@chatereum/react-e2ee';
import { generateKeyPair, exportPublicKeyToPem, exportPrivateKeyToPem, generateNonce } from './E2EE';

/**
 * Protocol versions:
 * 1.0.0 - Initial version (no encryption, basic message handling)
 * 1.1.0 - Added E2EE support, ping system, and disconnect handling
 * 1.2.0 - Now uses a state machine for connection initialization and handshake
 * 1.2.1 - Added signature verification for handshake, improved error handling, and nonce management
 * 1.2.2 - Improved connection flow by implementing Conection Class and refactoring Protocol methods
 * 1.2.3 - Added check for connection state before sending handshake messages, improved error handling, and cleaned up code structure
 * 1.3.0 - Added typing indicator support
 */
const PROTOCOL_VERSION = '1.3.0';

/**
 * Connection flow:
 * 1. Both peers generate E2EE key pairs and signature key pairs on initialization.
 * 2. Host waits for incoming connection, client connects to host.
 * 3. Host sends 'handshake-init' (version, public_key, sig_public_key, nonce) after connection is open.
 * 4. Client receives 'handshake-init', stores host's public key and nonce, generates its own nonce, and replies with 'handshake-response' (public_key, sig_public_key, nonce, signed_peer_nonce).
 * 5. Host receives 'handshake-response', verifies signature, stores client's public key and nonce, replies with 'handshake-final' (signed_peer_nonce).
 * 6. Client receives 'handshake-final', verifies signature. If valid, both peers are authenticated and switch to normal message handling.
 * 7. After authentication, protocol methods are available for normal communication (message, ping, disconnect). Ping system starts automatically.
 * 8. If no ping is received for 2 seconds, the connection is considered lost and both peers disconnect gracefully.
 * 9. Disconnect can be initiated by either peer with a reason, which is sent to the other peer.
 * 10. After disconnect, both peers reset their connection state and can start a new connection.
 * 
 * Available protocol methods after authentication:
 * - message: { text, timestamp } — Send a (possibly encrypted) chat message.
 * - ping: { timestamp } — Ping for connection health.
 * - disconnect: { reason } — Graceful disconnect with reason.
 * - typing_state { typing } - Notify the other peer about typing state
 */

class Connection {
  constructor() {
    this.peer = null;
    this.conn = null;
    this._onData = null;
    this._onOpen = null;
    this._onClose = null;
    this._onError = null;
  }

  async createPeer() {
    if (this.peer) {
      console.debug('[Connection] Destroying previous Peer instance.');
      this.peer.destroy();
    }
    this.peer = new Peer();
    await new Promise((resolve, reject) => {
      this.peer.once('open', id => {
        console.debug('[Connection] Peer open:', id);
        resolve();
      });
      this.peer.once('error', err => {
        console.error('[Connection] Peer error:', err);
        reject(err);
      });
    });
  }

  listenForConnections(onConnection) {
    if (!this.peer) throw new Error('Peer not initialized');
    const handler = conn => {
      console.debug('[Connection] Incoming connection.');
      if(this.conn) {
        console.warn('[Connection] Already connected, closing new connection.');
        this.close();
        return;
      }
      this._setupConn(conn);
      if (onConnection) onConnection(conn);
    };
    this.peer.on('connection', handler);
  }

  connectTo(hostId, onOpen, onError) {
    if (!this.peer) throw new Error('Peer not initialized');
    this.conn = this.peer.connect(hostId);
    this._setupConn(this.conn);
    if (onOpen) this._onOpen = onOpen;
    if (onError) this._onError = onError;
  }

  _setupConn(conn) {
    this.conn = conn;
    conn.on('data', data => {
      if (this._onData) this._onData(data);
    });
    conn.on('open', () => {
      console.debug('[Connection] Connection open.');
      if (this._onOpen) this._onOpen(conn);
    });
    conn.on('close', () => {
      console.debug('[Connection] Connection closed.');
      if (this._onClose) this._onClose();
    });
    conn.on('error', err => {
      console.error('[Connection] Connection error:', err);
      if (this._onError) this._onError(err);
    });
  }

  sendData(obj) {
    if (this.isOpen()) {
      try {
        this.conn.send(JSON.stringify(obj));
      } catch (e) {
        console.error('[Connection] Failed to send data:', e);
      }
    } else {
      console.warn('[Connection] Tried to send data but connection is not open.');
    }
  }

  onData(cb) {
    this._onData = cb;
  }

  onOpen(cb) {
    this._onOpen = cb;
  }

  onClose(cb) {
    this._onClose = cb;
  }

  onError(cb) {
    this._onError = cb;
  }

  isOpen() {
    return this.conn && this.conn.open;
  }

  close() {
    if (this.conn) {
      try { this.conn.close(); } catch (e) { /* intentionally ignored */ }
      this.conn = null;
    }
    this._onData = null;
    this._onOpen = null;
    this._onClose = null;
    this._onError = null;
    console.debug('[Connection] Connection closed.');
  }

  destroy() {
    this.close();
    if (this.peer) {
      this.peer.removeAllListeners();
      try { this.peer.destroy(); } catch (e) { /* intentionally ignored */ }
      this.peer = null;
    }
    console.debug('[Connection] Peer destroyed.');
  }
}

const PROTOCOL_METHODS = {
  disconnect: {
    params: ['reason'],
    handler: (protocol, params) => {
      if (protocol.callbacks.onDisconnect) protocol.callbacks.onDisconnect(params.reason);
      protocol.destroyConnection();
    }
  },
  message: {
    params: ['text', 'timestamp'],
    handler: async (protocol, params) => {
      let decryptedText = params.text;
      if (protocol.connectionState.ownKeys && protocol.connectionState.ownKeys.private_key && typeof params.text === 'object') {
        try {
          decryptedText = await E2EE.decryptForPlaintext({
            encrypted_text: params.text,
            private_key: protocol.connectionState.ownKeys.private_key
          });
        } catch {
          console.error('[Protocol] Decryption failed:', params.text);
          decryptedText = '[Decryption failed]';
        }
      }
      if (protocol.callbacks.onMessage) protocol.callbacks.onMessage(decryptedText, params.timestamp);
    }
  },
  ping: {
    params: ['timestamp'],
    handler: (protocol, params) => {
      protocol._lastPingReceived = Date.now();
      if (protocol.callbacks.onPing) protocol.callbacks.onPing(params.timestamp);
    }
  },
  typing_state: {
    params: ['typing'],
    handler: (protocol, params) => {
      if (protocol.callbacks.onTypingState) {
        protocol.callbacks.onTypingState(params.typing);
      }
    }
  }
};

class Protocol {
  constructor() {
    this.connection = new Connection();
    this.connectionState = {
      ownKeys: null,
      peerPublicKey: null,
      ownSigKeys: null,
      peerSigPublicPem: null,
      isHost: false,
      ownNonce: null,
      peerNonce: null
    };
    this.state = 'INIT';
    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onMessage: null,
      onPing: null,
      onTypingState: null
    };
    this._pingInterval = null;
    this._lastPingReceived = null;
    this._generateKeys();
    this._generateSigKeys();
    this.connection.onData(this._handleInitData.bind(this));
    console.debug('[Protocol] Protocol instance created.');
  }

  isConnectionOpen() {
    return this.connection.isOpen();
  }

  closeConnection() {
    this.connection.close();
  }

  destroyConnection() {
    this.connection.destroy();
  }

  async _generateKeys() {
    this.connectionState.ownKeys = await E2EE.getKeys();
    console.debug('[Protocol] E2EE key pair generated.');
  }

  async _generateSigKeys() {
    const keyPair = await generateKeyPair();
    this.connectionState.ownSigKeys = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicPem: await exportPublicKeyToPem(keyPair.publicKey),
      privatePem: await exportPrivateKeyToPem(keyPair.privateKey)
    };
    console.debug('[Protocol] Signature key pair generated.');
  }

  static async host() {
    const proto = new Protocol();
    await proto.connection.createPeer();
    proto.connectionState.isHost = true;
    proto.state = 'WAIT_FOR_HANDSHAKE';
    return new Promise((resolve) => {
      proto.connection.listenForConnections(conn => {
        proto._setupConnection(conn);
        console.debug('[Protocol] Incoming connection received (host).');
      });
      const checkPeerId = () => {
        const id = proto.getPeerId();
        if (id) {
          resolve(proto);
          return true;
        }
        return false;
      };
      if (!checkPeerId()) {
        const interval = setInterval(() => {
          if (checkPeerId()) clearInterval(interval);
        }, 50);
      }
    });
  }

  static async connect(hostId) {
    const proto = new Protocol();
    await proto.connection.createPeer();
    proto.connectionState.isHost = false;
    proto.state = 'WAIT_FOR_HANDSHAKE';
    return new Promise((resolve, reject) => {
      let didFinish = false;
      let timeoutId;
      proto.connection.connectTo(
        hostId,
        conn => {
          proto._setupConnection(conn, () => {
            if (!didFinish) {
              didFinish = true;
              clearTimeout(timeoutId);
              console.debug('[Protocol] Connection established (client).');
              resolve(proto);
            }
          }, err => {
            if (!didFinish) {
              didFinish = true;
              clearTimeout(timeoutId);
              console.error('Connection failed:', err);
              reject(err || new Error('Connection failed.'));
            }
          });
        },
        err => {
          if (!didFinish) {
            didFinish = true;
            clearTimeout(timeoutId);
            console.error('PeerJS connection error:', err);
            reject(err || new Error('Connection error.'));
          }
        }
      );
      timeoutId = setTimeout(() => {
        if (!didFinish) {
          didFinish = true;
          try { proto.connection.close(); } catch (e) {}
          const err = new Error('Connection could not be established (timeout).');
          console.error(err);
          reject(err);
        }
      }, 5000);
    });
  }

  onConnect(callback) { this.callbacks.onConnect = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onMessage(callback) { this.callbacks.onMessage = callback; }
  onPing(callback) { this.callbacks.onPing = callback; }
  onTypingState(callback) { this.callbacks.onTypingState = callback; }

  isReady() {
    return this && this.connection && this.connection.isOpen();
  }

  getPeerId() {
    return this.connection && this.connection.peer ? this.connection.peer.id : '';
  }

  _startPing() {
    this._lastPingReceived = Date.now();
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._pingInterval = setInterval(() => {
      if (this.isConnectionOpen()) {
        this._send({ type: 'ping', timestamp: Date.now() });
      }
      if (Date.now() - this._lastPingReceived > 2000) {
        this.sendDisconnect('ping-timeout');
        this.closeConnection();
        clearInterval(this._pingInterval);
        console.debug('[Protocol] Ping timeout, connection closed.');
      }
    }, 1000);
  }

  sendDisconnect(reason = 'user-disconnect') {
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._send({ type: 'disconnect', reason });
    console.debug('[Protocol] Disconnect sent:', reason);
  }

  async sendMessage(text, timestamp = Date.now()) {
    if (this.isConnectionOpen() && this.state === 'AUTHENTICATED') {
      let messageText = text;
      if (this.connectionState.peerPublicKey) {
        try {
          messageText = await E2EE.encryptPlaintext({
            public_key: this.connectionState.peerPublicKey,
            plain_text: text
          });
        } catch {
          messageText = text;
        }
      }
      this._send({ type: 'message', text: messageText, timestamp });
      console.debug('[Protocol] Message sent:', text);
    }
  }

  async sendTypingState(typing) {
    if (this.isConnectionOpen() && this.state === 'AUTHENTICATED') {
      this._send({ type: 'typing_state', typing: typing });
      console.debug('[Protocol] Typing state sent:', typing ? 'typing' : 'not typing');
    }
  }

  _send(obj) {
    if (this.isConnectionOpen()) {
      console.debug('[Protocol] Outgoing:', obj);
      this.connection.sendData(obj);
    }
  }

  _setupConnection(conn, resolve, reject = null) {
    this.connection.conn = conn;
    // Set up data handler for this connection
    this.connection.onData(this._handleInitData.bind(this));
    conn.on('open', async () => {
      if (this.connectionState.isHost) {
        while (!this.connectionState.ownKeys || !this.connectionState.ownSigKeys) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.connectionState.ownNonce = this._generateNonce();
        this._send({
          type: 'handshake-init',
          version: PROTOCOL_VERSION,
          public_key: this.connectionState.ownKeys.public_key,
          sig_public_key: this.connectionState.ownSigKeys.publicPem,
          nonce: this.connectionState.ownNonce
        });
        console.debug('[Protocol] Sent handshake-init.');
      }
      if (!this.connectionState.isHost && reject) {
        setTimeout(() => {
          if (this.state !== 'AUTHENTICATED') reject(new Error('Handshake timeout'));
        }, 4000);
      }
    });
    conn.on('close', () => {
      this._handleDisconnect('connection-closed');
      if (reject) reject(new Error('Connection closed'));
      console.debug('[Protocol] Connection closed.');
    });
    conn.on('error', (err) => {
      this._handleDisconnect('connection-error');
      if (reject) reject(err);
      console.error('[Protocol] Connection error:', err);
    });
    if (!this.connectionState.isHost && resolve) {
      this.callbacks.onConnect = () => { resolve(this); };
    }
  }

  async importPublicKey(pem) {
    const b64 = pem.replace(/-----[^-]+-----|\s+/g, '');
    const der = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    return await window.crypto.subtle.importKey(
      'spki',
      der,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify']
    );
  }

  async signNonce({ nonce }) {
    const key = this.connectionState.ownSigKeys.privateKey;
    const enc = new TextEncoder().encode(nonce);
    const sig = await window.crypto.subtle.sign(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      enc
    );
    return btoa(String.fromCharCode(...new Uint8Array(sig)));
  }

  async verifyNonce({ public_key, nonce, signature }) {
    const key = await this.importPublicKey(public_key);
    const enc = new TextEncoder().encode(nonce);
    const sig = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    return await window.crypto.subtle.verify(
      { name: 'RSASSA-PKCS1-v1_5' },
      key,
      sig,
      enc
    );
  }

  _initFailed(reason) {
    this.sendDisconnect(reason);
    this.closeConnection();
    console.debug(`[Protocol] Handshake failed: ${reason}. Connection closed.`);
  }

  async _handleInitData(rawData) {
    while (!this.connectionState.ownKeys || !this.connectionState.ownKeys.private_key || !this.connectionState.ownSigKeys) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    console.debug('[Protocol] Incoming (init phase):', rawData);
    const message = this._parseMessage(rawData);
    if (!message) {
      this._initFailed('invalid-message');
      return;
    }
    if (this.state === 'AUTHENTICATED') {
      console.warn('[Protocol] Received data in InitDataHandler in AUTHENTICATED state, redirecting to handleData:', message);
      this.connection.onData(this._handleData.bind(this));
      this._handleData(rawData);
      return;
    }
    switch (message.type) {
      case 'handshake-init': {
        if (this.connectionState.isHost) {
          this._initFailed('unexpected-handshake-init');
          return;
        }
        if (message.version !== PROTOCOL_VERSION) {
          this._initFailed('version-mismatch');
          return;
        }
        this.connectionState.peerPublicKey = message.public_key;
        this.connectionState.peerNonce = message.nonce;
        this.connectionState.peerSigPublicPem = message.sig_public_key;
        this.connectionState.ownNonce = this._generateNonce();
        const signedPeerNonce = await this.signNonce({ nonce: this.connectionState.peerNonce });
        this._send({
          type: 'handshake-response',
          public_key: this.connectionState.ownKeys.public_key,
          sig_public_key: this.connectionState.ownSigKeys.publicPem,
          nonce: this.connectionState.ownNonce,
          signed_peer_nonce: signedPeerNonce
        });
        this.state = 'WAIT_FOR_RESPONSE';
        console.debug('[Protocol] Sent handshake-response.');
        break;
      }
      case 'handshake-response': {
        if (!this.connectionState.isHost) {
          this._initFailed('unexpected-handshake-response');
          return;
        }
        this.connectionState.peerPublicKey = message.public_key;
        this.connectionState.peerSigPublicPem = message.sig_public_key;
        this.connectionState.peerNonce = message.nonce;
        const valid = await this.verifyNonce({
          public_key: this.connectionState.peerSigPublicPem,
          nonce: this.connectionState.ownNonce,
          signature: message.signed_peer_nonce
        });
        if (!valid) {
          this._initFailed('handshake-invalid');
          return;
        }
        const signedPeerNonce = await this.signNonce({ nonce: this.connectionState.peerNonce });
        this._send({
          type: 'handshake-final',
          signed_peer_nonce: signedPeerNonce
        });
        this._handshakeComplete();
        console.debug('[Protocol] Sent handshake-final.');
        break;
      }
      case 'handshake-final': {
        if (this.connectionState.isHost) {
          this._initFailed('unexpected-handshake-final');
          return;
        }
        const valid = await this.verifyNonce({
          public_key: this.connectionState.peerSigPublicPem,
          nonce: this.connectionState.ownNonce,
          signature: message.signed_peer_nonce
        });
        if (!valid) {
          this._initFailed('handshake-invalid');
          return;
        }
        this._handshakeComplete();
        console.debug('[Protocol] Handshake complete.');
        break;
      }
      case 'ping': {
        console.warn('[Protocol] Received ping in init phase, ignoring.');
        break;
      }
      case 'disconnect': {
        console.debug('[Protocol] Received disconnect in init phase:', message.reason);
        this._handleDisconnect(message.reason);
        break;
      }
      default: {
        this._initFailed('unexpected-message-type');
        break;
      }
    }
  }

  _handshakeComplete() {
    this.state = 'AUTHENTICATED';
    this.connection.onData(this._handleData.bind(this));
    if (this.callbacks.onConnect) this.callbacks.onConnect();
    this._startPing();
    console.debug('[Protocol] Protocol authenticated.');
  }

  _parseMessage(rawData) {
    try {
      const obj = typeof rawData === 'object' ? rawData : JSON.parse(rawData);
      if (!obj.type) return null;
      return obj;
    } catch {
      return null;
    }
  }

  _handleData(rawData) {
    console.debug('[Protocol] Incoming:', rawData);
    const message = this._parseMessage(rawData);
    if (!message || !PROTOCOL_METHODS[message.type]) return;
    const method = PROTOCOL_METHODS[message.type];
    method.handler(this, message);
  }

  _generateNonce(length = 24) {
    return generateNonce(length);
  }

  _handleDisconnect(reason = 'connection-closed') {
    if (this._pingInterval) clearInterval(this._pingInterval);
    this.state = 'INIT';
    this.connection.destroy();
    this.connectionState = {
      ownKeys: null,
      peerPublicKey: null,
      ownSigKeys: null,
      peerSigPublicPem: null,
      isHost: false,
      ownNonce: null,
      peerNonce: null
    };
    this.onData = this._handleInitData.bind(this);
    if (this.callbacks.onDisconnect) this.callbacks.onDisconnect(reason);
    console.debug('[Protocol] State machine and connection reset.');
  }

  destroy() {
    this._handleDisconnect();
    console.debug('[Protocol] Protocol destroyed.');
  }
}

export default Protocol;
