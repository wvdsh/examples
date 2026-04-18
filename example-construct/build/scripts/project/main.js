import { AsciiPongGame, attachInput, createInput } from "./pong.js";
import {
  describeUser,
  initSdk,
  reportProgress,
  waitForWavedash,
} from "./wavedash.js";

const LOG = (...args) => console.log("[example-construct]", ...args);

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

function updateInfoText(instance, user) {
  instance.text =
    "Runtime: Construct 3 folder project\n" +
    `User: ${shortenLabel(user)}`;
}

LOG("main.js module loaded, window.WavedashJS =", String(globalThis.WavedashJS));

runOnStartup(async (runtime) => {
  LOG("runOnStartup fired");
  runtime.addEventListener("beforeprojectstart", async () => {
    LOG("beforeprojectstart fired, window.WavedashJS =", String(globalThis.WavedashJS));

    const titleText = getRequiredText(runtime, "TitleText");
    const infoText = getRequiredText(runtime, "InfoText");
    const fieldText = getRequiredText(runtime, "FieldText");
    const footerText = getRequiredText(runtime, "FooterText");

    titleText.text = "";
    infoText.text = "";
    footerText.text = "";

    let sdk;
    try {
      sdk = await waitForWavedash();
      LOG("SDK found");
    } catch (error) {
      LOG("SDK wait failed:", error.message);
      return;
    }

    const input = createInput();
    attachInput(input);
    const game = new AsciiPongGame({ fieldText, footerText });

    game.prepare();
    game.start(input);

    LOG("calling reportProgress(1)");
    reportProgress(sdk, 1);
    LOG("calling initSdk");
    initSdk(sdk);
    LOG("SDK calls done");

    let lastTime = performance.now();
    runtime.addEventListener("tick", () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      game.tick(dt);
    });
  });
});
