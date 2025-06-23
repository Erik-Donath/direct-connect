import Peer from 'peerjs';

const PROTOCOL_VERSION = '1.0.0';

class Protocol {
  constructor(peer) {
    console.debug('Protocol: Konstruktor', peer);
    this.peer = peer;
    this.conn = null;
    this._onConnect = null;
    this._onMessage = null;
    this._handshakeDone = false;
    this._isHost = false;
  }

  static host() {
    console.debug('Protocol: host() aufgerufen');
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      peer.on('open', () => {
        console.debug('Protocol: Peer host open');
        const proto = new Protocol(peer);
        proto._isHost = true;
        peer.on('connection', conn => proto._handleHostConnection(conn));
        resolve(proto);
      });
      peer.on('error', (err) => {
        console.debug('Protocol: Peer host error', err);
        reject(err);
      });
    });
  }

  static connect(hostId) {
    console.debug('Protocol: connect() aufgerufen', hostId);
    return new Promise((resolve, reject) => {
      const peer = new Peer();
      peer.on('open', () => {
        console.debug('Protocol: Peer connect open');
        const proto = new Protocol(peer);
        proto._isHost = false;
        const conn = peer.connect(hostId);
        proto.conn = conn;
        // Handshake-Handler direkt setzen, damit keine Daten verloren gehen
        const onData = (data) => proto._handleClientHandshakeData(data, resolve, reject);
        conn.on('data', onData);
        conn.on('open', () => {/* optionales Logging */});
        conn.on('error', reject);
        setTimeout(() => {
          if (!conn.open) reject(new Error('Connection timeout'));
        }, 4000);
      });
      peer.on('error', (err) => {
        console.debug('Protocol: Peer connect error', err);
        reject(err);
      });
    });
  }

  _handleHostConnection(conn) {
    console.debug('Protocol: _handleHostConnection', conn);
    this.conn = conn;
    const onData = (data) => {
      console.debug('Protocol: _handleHostConnection onData', data);
      const msg = this.parse(data);
      if (!msg) return;
      if (msg.type === 'handshake') {
        if (msg.version === PROTOCOL_VERSION) {
          this._handshakeDone = true;
          this.conn.off('data', onData);
          this._setupMessaging();
          this._onConnect && this._onConnect();
        } else {
          this._send({ type: 'disconnect', reason: 'version-mismatch' });
          this.conn.close();
        }
      } else if (msg.type === 'disconnect') {
        this.conn.close();
      }
    };
    conn.on('data', onData);
    conn.on('open', () => {
      console.debug('Protocol: Host-Connection open, sende Handshake');
      this._send({ type: 'handshake', version: PROTOCOL_VERSION });
    });
  }

  _handleClientHandshakeData(data, resolve, reject) {
    console.debug('Protocol: _handleClientHandshakeData', data);
    const msg = this.parse(data);
    if (!msg) return;
    if (msg.type === 'handshake') {
      if (msg.version === PROTOCOL_VERSION) {
        this._send({ type: 'handshake', version: PROTOCOL_VERSION });
        this._handshakeDone = true;
        this.conn.off('data', this._handleClientHandshakeData);
        this._setupMessaging();
        resolve(this);
      } else {
        this._send({ type: 'disconnect', reason: 'version-mismatch' });
        this.conn.close();
        reject(new Error('Version mismatch'));
      }
    }
  }

  _setupMessaging() {
    console.debug('Protocol: _setupMessaging');
    this.conn.on('data', (data) => {
      console.debug('Protocol: _setupMessaging onData', data);
      const msg = this.parse(data);
      if (msg && msg.type === 'message' && this._onMessage) {
        this._onMessage(msg.text);
      }
    });
  }

  sendMessage(text) {
    console.debug('Protocol: sendMessage', text);
    if (this.conn && this.conn.open && this._handshakeDone) {
      this._send({ type: 'message', text });
    }
  }

  onConnect(cb) {
    console.debug('Protocol: onConnect gesetzt', cb);
    this._onConnect = cb;
  }

  onMessage(cb) {
    console.debug('Protocol: onMessage gesetzt', cb);
    this._onMessage = cb;
  }

  _send(obj) {
    console.debug('Protocol: _send', obj);
    if (this.conn && this.conn.open) {
      this.conn.send(JSON.stringify(obj));
    }
  }

  parse(raw) {
    console.debug('Protocol: parse', raw);
    try {
      const obj = typeof raw === 'object' ? raw : JSON.parse(raw);
      if (!obj.type) return null;
      return obj;
    } catch {
      return null;
    }
  }

  destroy() {
    console.debug('Protocol: destroy');
    if (this.conn) try { this.conn.close(); } catch {}
    if (this.peer) try { this.peer.destroy(); } catch {}
    this.conn = null;
    this.peer = null;
    this._onConnect = null;
    this._onMessage = null;
  }
}

export default Protocol;
