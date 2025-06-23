
const METHODS ={
    'message': {
        params: ['text'],
        handler: (params, _) => {
            return params.text;
        }
    },
    'ping': {
        params: [],
        handler: (_, _) => {
            console.log('[Protocol] Received ping');
            return null;
        }
    },
    'pong': {
        params: [],
        handler: (_, _) => {
            console.log('[Protocol] Received pong');
            return null;
        }
    }
}

export function pParse(raw) {
    let obj;
    try {
        obj = (typeof raw === 'object') ? raw : JSON.parse(raw);
    } catch (e) {
        console.error('[Protocol] Failed to parse JSON:', e);
        return null;
    }

    if (typeof obj !== 'object' || !obj.type || !METHODS[obj.type]) {
        console.error('[Protocol] Invalid protocol methode:', raw);
        return null;
    }

    const method = METHODS[obj.type];
    for(const param of method.params) {
        if (!(param in obj)) {
            console.error(`[Protocol] Missing parameter: ${param} for method ${obj.type}`);
            return null;
        }
    }

    if (Object.keys(obj).length !== method.params.length + 1) {
        console.warn('[Protocol] Extra parameters found:', Object.keys(obj));
    }

    return method.handler(obj, raw);
}

export function pMessage(raw) {
    return {type: 'message', text: raw};
}

export function pPing() {
    return {type: 'ping'};
}

export function pPong() {
    return {type: 'pong'};
}
