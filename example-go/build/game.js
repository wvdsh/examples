(function () {
  async function fetchWasmWithProgress(url, onProgress) {
    const response = await fetch(url);
    const total = +response.headers.get("Content-Length") || 0;
    if (!total || !response.body) {
      return new Uint8Array(await response.arrayBuffer());
    }
    const reader = response.body.getReader();
    const chunks = [];
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      onProgress(received / total);
    }
    const bytes = new Uint8Array(received);
    let pos = 0;
    for (const c of chunks) { bytes.set(c, pos); pos += c.length; }
    return bytes;
  }

  async function main() {
    const sdk = window.Wavedash;
    if (!sdk) {
      throw new Error(
        "This example must run inside `wavedash dev`, where `window.Wavedash` is injected."
      );
    }
    sdk.updateLoadProgressZeroToOne(0);

    await sdk.loadScript("./wasm_exec.js");

    // Reserve the last 5% for compile/instantiate.
    const wasmBytes = await fetchWasmWithProgress("./game.wasm",
      (p) => sdk.updateLoadProgressZeroToOne(p * 0.95));
    sdk.updateLoadProgressZeroToOne(0.95);

    const go = new Go();
    const { instance } = await WebAssembly.instantiate(wasmBytes, go.importObject);
    go.run(instance);
  }

  main().catch((error) => {
    console.error("[example-go]", error);
  });
})();
