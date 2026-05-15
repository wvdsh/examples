// @ts-check
import { instantiate } from './instantiate.js';
import { defaultBrowserSetup } from './platforms/browser.js';


/** @type {import('./index.d').init} */
async function initBrowser(_options) {
    /** @type {import('./index.d').Options} */
    const options = _options || {
    };
    let module = options.module;
    if (!module) {
        // Stream Pong.wasm with progress so the SDK loading bar reflects real
        // bytes. `instantiate` accepts a Response, so we rebuild one from the
        // collected bytes after streaming.
        const sdk = await window.Wavedash;
        sdk.updateLoadProgressZeroToOne(0);
        const response = await fetch(new URL("Pong.wasm", import.meta.url));
        const total = +response.headers.get("Content-Length") || 0;
        let bytes;
        if (!total || !response.body) {
            bytes = new Uint8Array(await response.arrayBuffer());
        } else {
            const reader = response.body.getReader();
            const chunks = [];
            let received = 0;
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                chunks.push(value);
                received += value.length;
                sdk.updateLoadProgressZeroToOne((received / total) * 0.95);
            }
            bytes = new Uint8Array(received);
            let pos = 0;
            for (const c of chunks) { bytes.set(c, pos); pos += c.length; }
        }
        sdk.updateLoadProgressZeroToOne(0.95);
        module = new Response(bytes, { headers: { "Content-Type": "application/wasm" } });
    }
    const instantiateOptions = await defaultBrowserSetup({
        module,
    })
    return await instantiate(instantiateOptions);
}


/** @type {import('./index.d').init} */
export async function init(options) {
        return initBrowser(options);
    }