import Peer from 'peerjs';
import E2EE from '@chatereum/react-e2ee';

// Protocol versions:
// 1.0.0 - Initial version (no encryption, basic message handling)
// 1.1.0 - Added E2EE support, ping system, and disconnect handling
// 1.2.0 - Now uses a state machine for connection initialization and handshake
// 1.2.1 - Added signature verification for handshake, improved error handling, and nonce management
const PROTOCOL_VERSION = '1.2.1';

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
 *
 * Available protocol methods after authentication:
 * - message: { text, timestamp } — Send a (possibly encrypted) chat message.
 * - ping: { timestamp } — Ping for connection health.
 * - disconnect: { reason } — Graceful disconnect with reason.
 **/

let shared_pair = null;

const PROTOCOL_METHODS = {
  disconnect: {
    params: ['reason'],
    handler: (protocol, params) => {
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
    handler: async (protocol, params) => {
      let decryptedText = params.text;
      if (protocol.ownKeys && protocol.ownKeys.private_key && typeof params.text === 'object') {
        try {
          decryptedText = await E2EE.decryptForPlaintext({
            encrypted_text: params.text,
            private_key: protocol.ownKeys.private_key
          });
        } catch {
          decryptedText = '[Decryption failed]';
        }
      }
      if (protocol.callbacks.onMessage) {
        protocol.callbacks.onMessage(decryptedText, params.timestamp);
      }
    }
  },
  ping: {
    params: ['timestamp'],
    handler: (protocol, params) => {
      protocol._lastPingReceived = Date.now();
      if (protocol.callbacks.onPing) {
        protocol.callbacks.onPing(params.timestamp);
      }
    }
  }
};

function createSharedPair() {
  return new Promise((resolve, reject) => {
    if (shared_pair) {
      resolve(shared_pair);
      return;
    }
    const peer = new Peer();
    peer.on('open', () => {
      shared_pair = peer;
      resolve(peer);
    });
    peer.on('error', (err) => {
      shared_pair = null;
      reject(err);
    });
  });
}

class Protocol {
  constructor(peer) {
    this.peer = peer;
    this.conn = null;

    this.ownKeys = null;
    this.peerPublicKey = null;
    this.ownSigKeys = null;
    this.peerSigPublicPem = null;

    this._isHost = false;
    this.state = 'INIT'; // INIT, WAIT_FOR_HANDSHAKE, WAIT_FOR_RESPONSE, WAIT_FOR_FINAL, AUTHENTICATED, CLOSED
    this.ownNonce = null;
    this.peerNonce = null;

    this.callbacks = {
      onConnect: null,
      onDisconnect: null,
      onMessage: null,
      onPing: null
    };

    this.onData = this._handleInitData.bind(this);

    this._generateKeys();
    this._generateSigKeys();
  }

  async _generateKeys() {
    this.ownKeys = await E2EE.getKeys();
  }

  async _generateSigKeys() {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: 'RSASSA-PKCS1-v1_5',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: 'SHA-256',
      },
      true,
      ['sign', 'verify']
    );
    this.ownSigKeys = {
      publicKey: keyPair.publicKey,
      privateKey: keyPair.privateKey,
      publicPem: await this._exportPublicKeyToPem(keyPair.publicKey),
      privatePem: await this._exportPrivateKeyToPem(keyPair.privateKey)
    };
  }

  async _exportPublicKeyToPem(key) {
    const spki = await window.crypto.subtle.exportKey('spki', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(spki)));
    return '-----BEGIN PUBLIC KEY-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END PUBLIC KEY-----';
  }

  async _exportPrivateKeyToPem(key) {
    const pkcs8 = await window.crypto.subtle.exportKey('pkcs8', key);
    const b64 = btoa(String.fromCharCode(...new Uint8Array(pkcs8)));
    return '-----BEGIN PRIVATE KEY-----\n' + b64.match(/.{1,64}/g).join('\n') + '\n-----END PRIVATE KEY-----';
  }

  static host() {
    return new Promise((resolve, reject) => {
      createSharedPair().then(peer => {
        const proto = new Protocol(peer);
        proto._isHost = true;
        proto.state = 'WAIT_FOR_HANDSHAKE';
        peer.on('connection', conn => {
          if (proto.conn !== null) {
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
    return new Promise((resolve, reject) => {
      let didFinish = false;
      let timeoutId;
      createSharedPair().then(peer => {
        const proto = new Protocol(peer);
        proto._isHost = false;
        proto.state = 'WAIT_FOR_HANDSHAKE';
        const conn = peer.connect(hostId);
        // Timeout after 5 seconds
        timeoutId = setTimeout(() => {
          if (!didFinish) {
            didFinish = true;
            try {
              conn && conn.close();
            }
            catch (e) {
              console.error('Error closing connection after timeout:', e);
            }
            const err = new Error('Connection could not be established (timeout).');
            console.error(err);
            reject(err);
          }
        }, 5000);
        conn.on('error', (err) => {
          if (!didFinish) {
            didFinish = true;
            clearTimeout(timeoutId);
            console.error('PeerJS connection error:', err);
            reject(err || new Error('Connection error.'));
          }
        });
        proto._handleConnection(conn, (protoInstance) => {
          if (!didFinish) {
            didFinish = true;
            clearTimeout(timeoutId);
            resolve(protoInstance);
          }
        }, (err) => {
          if (!didFinish) {
            didFinish = true;
            clearTimeout(timeoutId);
            console.error('Connection failed:', err);
            reject(err || new Error('Connection failed.'));
          }
        });
      }).catch(err => {
        console.error('Peer creation failed:', err);
        reject(err);
      });
    });
  }

  onConnect(callback) { this.callbacks.onConnect = callback; }
  onDisconnect(callback) { this.callbacks.onDisconnect = callback; }
  onMessage(callback) { this.callbacks.onMessage = callback; }
  onPing(callback) { this.callbacks.onPing = callback; }

  _startPing() {
    this._lastPingReceived = Date.now();
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._pingInterval = setInterval(() => {
      if (this.conn && this.conn.open) {
        this._send({ type: 'ping', timestamp: Date.now() });
      }
      // If no ping received for 2 seconds, disconnect
      if (Date.now() - this._lastPingReceived > 2000) {
        this.sendDisconnect('ping-timeout');
        this.conn && this.conn.close();
        clearInterval(this._pingInterval);
      }
    }, 1000);
  }

  sendDisconnect(reason = 'user-disconnect') {
    if (this._pingInterval) clearInterval(this._pingInterval);
    this._send({ type: 'disconnect', reason });
  }

  async sendMessage(text, timestamp = Date.now()) {
    if (this.conn && this.conn.open && this.state === 'AUTHENTICATED') {
      let messageText = text;
      if (this.peerPublicKey) {
        try {
          messageText = await E2EE.encryptPlaintext({
            public_key: this.peerPublicKey,
            plain_text: text
          });
        } catch {
          messageText = text;
        }
      }
      this._send({ type: 'message', text: messageText, timestamp });
    }
  }

  _send(obj) {
    if (this.conn && this.conn.open) {
      console.debug('[Protocol] Outgoing:', obj);
      this.conn.send(JSON.stringify(obj));
    }
  }

  _handleConnection(conn, resolve, reject = null) {
    this.conn = conn;

    conn.on('data', (data) => {
      this.onData(data);
    });

    conn.on('open', async () => {
      if (this._isHost) {
        while (!this.ownKeys || !this.ownSigKeys) {
          await new Promise(resolve => setTimeout(resolve, 50));
        }
        this.ownNonce = this._generateNonce();
        this._send({
          type: 'handshake-init',
          version: PROTOCOL_VERSION,
          public_key: this.ownKeys.public_key,
          sig_public_key: this.ownSigKeys.publicPem,
          nonce: this.ownNonce
        });
      }
      if (!this._isHost && reject) {
        setTimeout(() => {
          if (this.state !== 'AUTHENTICATED') {
            reject(new Error('Handshake timeout'));
          }
        }, 4000);
      }
    });

    conn.on('close', () => {
      this.conn = null;
      if (this._pingInterval) clearInterval(this._pingInterval);
      if (reject) reject(new Error('Connection closed'));
    });

    conn.on('error', (err) => {
      this.conn = null;
      if (this._pingInterval) clearInterval(this._pingInterval);
      if (reject) reject(err);
    });

    if (!this._isHost && resolve) {
      this.callbacks.onConnect = () => {
        resolve(this);
      };
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
    const key = this.ownSigKeys.privateKey;
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

  async _handleInitData(rawData) {
    while (!this.ownKeys || !this.ownKeys.private_key || !this.ownSigKeys) {
      await new Promise(resolve => setTimeout(resolve, 20));
    }
    console.debug('[Protocol] Incoming (init phase):', rawData);
    const message = this._parseMessage(rawData);
    if (!message) {
      this.sendDisconnect('invalid-message');
      this.conn.close();
      return;
    }
    if (this.state === 'AUTHENTICATED') {
      this.onData = this._handleData.bind(this);
      return;
    }
    if (message.type === 'handshake-init') {
      if (message.version !== PROTOCOL_VERSION) {
        this.sendDisconnect('version-mismatch');
        this.conn.close();
        return;
      }
      this.peerPublicKey = message.public_key;
      this.peerNonce = message.nonce;
      this.peerSigPublicPem = message.sig_public_key;
      this.ownNonce = this._generateNonce();
      const signedPeerNonce = await this.signNonce({ nonce: this.peerNonce });
      this._send({
        type: 'handshake-response',
        public_key: this.ownKeys.public_key,
        sig_public_key: this.ownSigKeys.publicPem,
        nonce: this.ownNonce,
        signed_peer_nonce: signedPeerNonce
      });
      this.state = 'WAIT_FOR_RESPONSE';
    } else if (message.type === 'handshake-response') {
      this.peerPublicKey = message.public_key;
      this.peerSigPublicPem = message.sig_public_key;
      this.peerNonce = message.nonce;
      const valid = await this.verifyNonce({
        public_key: this.peerSigPublicPem,
        nonce: this.ownNonce,
        signature: message.signed_peer_nonce
      });
      if (!valid) {
        this.sendDisconnect('handshake-invalid');
        this.conn.close();
        return;
      }
      const signedPeerNonce = await this.signNonce({ nonce: this.peerNonce });
      this._send({
        type: 'handshake-final',
        signed_peer_nonce: signedPeerNonce
      });
      // Host: handshake is complete after sending handshake-final
      this._handshakeComplete();
    } else if (message.type === 'handshake-final') {
      const valid = await this.verifyNonce({
        public_key: this.peerSigPublicPem,
        nonce: this.ownNonce,
        signature: message.signed_peer_nonce
      });
      if (!valid) {
        this.sendDisconnect('handshake-invalid');
        this.conn.close();
        return;
      }
      this._handshakeComplete();
    }
  }

  _handshakeComplete() {
    this.state = 'AUTHENTICATED';
    this.onData = this._handleData.bind(this);
    if (this.callbacks.onConnect) {
      this.callbacks.onConnect();
    }
    this._startPing();
  }

  _parseMessage(rawData) {
    try {
      const obj = typeof rawData === 'object' ? rawData : JSON.parse(rawData);
      if (!obj.type) {
        return null;
      }
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
    // Secure random nonce, base64 encoded
    const array = new Uint8Array(length);
    window.crypto.getRandomValues(array);
    return btoa(String.fromCharCode(...array));
  }
}

export default Protocol;
