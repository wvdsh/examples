export async function waitForWavedash(timeoutMs = 15000) {
  const deadline = Date.now() + timeoutMs;
  while (!globalThis.WavedashJS) {
    if (Date.now() > deadline) {
      throw new Error(
        "This example must run inside `wavedash dev`, where `window.WavedashJS` is injected."
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return globalThis.WavedashJS;
}

export function describeUser(sdk) {
  if (!sdk || typeof sdk.getUser !== "function") {
    return "pending";
  }

  try {
    const user = sdk.getUser();
    return user?.username || user?.name || user?.id || "unavailable";
  } catch (error) {
    console.warn("[example-construct] Unable to read Wavedash user", error);
    return "unavailable";
  }
}

export function initSdk(sdk) {
  sdk.init({ debug: true });
}

export function reportProgress(sdk, progress) {
  sdk.updateLoadProgressZeroToOne(progress);
}
