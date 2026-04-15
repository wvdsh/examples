(function () {
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Failed to load ${src}`));
      document.head.appendChild(script);
    });
  }

  async function main() {
    if (!window.WavedashJS) {
      throw new Error(
        "This example must run inside `wavedash dev`, where `window.WavedashJS` is injected."
      );
    }

    await loadScript("./wasm_exec.js");

    const go = new Go();
    const result = await WebAssembly.instantiateStreaming(
      fetch("./game.wasm"),
      go.importObject
    );
    go.run(result.instance);
  }

  main().catch((error) => {
    console.error("[example-go]", error);
  });
})();
