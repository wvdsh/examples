(function () {
  const RENPY_WEB_ENTRYPOINT = "./renpy/index.html?embedded=1";

  function style(element, styles) {
    Object.assign(element.style, styles);
    return element;
  }

  async function waitForWavedash(timeoutMs = 15000) {
    const deadline = Date.now() + timeoutMs;
    while (!window.WavedashJS) {
      if (Date.now() > deadline) {
        throw new Error("This example must run inside `wavedash dev`, where `window.WavedashJS` is injected.");
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return window.WavedashJS;
  }

  function readUserName(sdk) {
    try {
      const user = typeof sdk.getUser === "function" ? sdk.getUser() : null;
      return user?.username || user?.name || user?.id || "";
    } catch (error) {
      console.warn("[example-renpy] Unable to read Wavedash user", error);
      return "";
    }
  }

  const sdkPromise = waitForWavedash();
  let iframeEl = null;

  // postMessage-based bridge. Ren'Py can't rely on window.parent object
  // access because wavedash dev's outer iframe may be cross-origin isolated.
  window.addEventListener("message", (event) => {
    const data = event.data;
    if (!data || data.type !== "wavedash-bridge") return;

    const { method, args } = data;
    if (method === "updateLoadProgress") {
      sdkPromise.then((sdk) => sdk.updateLoadProgressZeroToOne(args[0]))
        .catch((e) => console.error("[example-renpy]", e));
    } else if (method === "initSdk") {
      sdkPromise.then((sdk) => sdk.init({ debug: true }))
        .catch((e) => console.error("[example-renpy]", e));
    }
  });

  function ensureTarget() {
    let target = document.getElementById("wavedash-target");
    if (!target) {
      target = document.createElement("div");
      target.id = "wavedash-target";
      document.body.appendChild(target);
    }
    style(document.documentElement, { width: "100%", height: "100%", margin: "0", background: "#030712" });
    style(document.body, { width: "100%", height: "100%", margin: "0", overflow: "hidden", background: "#030712" });
    style(target, { position: "relative", width: "100%", height: "100%", overflow: "hidden", background: "#030712" });
    return target;
  }

  function main() {
    const target = ensureTarget();

    const stage = document.createElement("div");
    style(stage, { position: "absolute", inset: "0", background: "#030712" });
    target.appendChild(stage);

    const iframe = document.createElement("iframe");
    style(iframe, {
      position: "absolute", inset: "0", width: "100%", height: "100%",
      border: "0", display: "block", background: "#030712",
    });
    iframe.tabIndex = 0;
    iframe.title = "example-renpy";
    iframe.setAttribute("allow", "autoplay; fullscreen");

    iframeEl = iframe;
    iframe.addEventListener("load", () => iframe.focus());
    stage.appendChild(iframe);
    iframe.src = RENPY_WEB_ENTRYPOINT;
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", main);
  } else {
    main();
  }
})();
