import { AsciiPongGame, attachInput, createInput } from "./pong.js";
import {
  attachSdkListeners,
  describeUser,
  finalizeSdk,
  getRequiredWavedash,
  initSdk,
  reportProgress,
} from "./wavedash.js";

function getRequiredText(runtime, objectName) {
  const objectType = runtime.objects[objectName];
  const instance = objectType && objectType.getFirstInstance();

  if (instance) {
    return instance;
  }

  throw new Error(`Missing required Text object: ${objectName}`);
}

function shortenLabel(value, maxLength = 22) {
  const text = String(value || "");

  if (text.length <= maxLength) {
    return text;
  }

  return `${text.slice(0, maxLength - 3)}...`;
}

function updateInfoText(instance, state) {
  instance.text =
    "Runtime: Construct 3 folder project\n" +
    `SDK: ${state.backend} | User: ${shortenLabel(state.user)} | Phase: ${state.phase}`;
}

// Keep Construct in charge of startup: wait until the layout exists, then perform the
// Wavedash handshake from the project's main script before the first playable frame.
runOnStartup(async (runtime) => {
  runtime.addEventListener("beforeprojectstart", async () => {
    const titleText = getRequiredText(runtime, "TitleText");
    const infoText = getRequiredText(runtime, "InfoText");
    const fieldText = getRequiredText(runtime, "FieldText");
    const footerText = getRequiredText(runtime, "FooterText");

    const input = createInput();
    const detachInput = attachInput(input);
    const game = new AsciiPongGame({
      fieldText,
      footerText,
    });

    const state = {
      backend: "pending",
      user: "pending",
      phase: "booting",
    };

    const refreshInfo = () => updateInfoText(infoText, state);

    titleText.text = "example-construct";
    refreshInfo();

    let detachSdkListeners = () => {};

    try {
      const sdk = getRequiredWavedash();

      detachSdkListeners = attachSdkListeners(sdk, {
        onConnected: () => {
          state.backend = "connected";
          state.user = describeUser(sdk);
          refreshInfo();
        },
        onDisconnected: () => {
          state.backend = "disconnected";
          refreshInfo();
        },
        onReconnecting: () => {
          state.backend = "reconnecting";
          refreshInfo();
        },
      });

      const runBootStep = async (phase, title, detail, progress, task = async () => {}) => {
        state.phase = phase;
        refreshInfo();
        game.showBoot(title, detail, progress);
        await Promise.resolve(task());
        await reportProgress(sdk, progress);
      };

      await runBootStep(
        "preparing scene",
        "Preparing Construct scene",
        "Building the text HUD and first frame.",
        0.12
      );

      let ready = false;
      await runBootStep(
        "initializing SDK",
        "Initializing Wavedash SDK",
        "Calling init() from Construct and waiting for readiness.",
        0.42,
        async () => {
          ready = await initSdk(sdk);
        }
      );
      if (!ready) {
        throw new Error("WavedashJS did not report ready before the startup timeout.");
      }

      state.backend = typeof sdk.isReady === "function" ? "ready" : "available";
      state.user = describeUser(sdk);
      refreshInfo();

      await runBootStep(
        "building game",
        "Construct is building the first playable state",
        "Preparing Pong state and drawing the opening serve.",
        0.78,
        async () => {
          game.prepare();
        }
      );

      await runBootStep(
        "releasing deferred events",
        "Finalizing startup",
        "Construct has reached the first playable frame.",
        1,
        async () => {
          await finalizeSdk(sdk);
        }
      );

      state.phase = "running";
      state.backend = "ready";
      state.user = describeUser(sdk);
      refreshInfo();

      game.start(input);

      let lastTime = performance.now();
      runtime.addEventListener("tick", () => {
        const now = performance.now();
        const dt = Math.min(0.05, (now - lastTime) / 1000);
        lastTime = now;
        game.tick(dt);
      });
    } catch (error) {
      console.error("[example-construct]", error);
      detachInput();
      detachSdkListeners();
      state.phase = "error";
      state.backend = "failed";
      refreshInfo();
      game.showFatal("Construct startup failed.", error);
    }
  });
});
