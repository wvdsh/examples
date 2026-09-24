// window.Wavedash is injected by the host before any page script runs.
export function getWavedash() {
  if (!globalThis.Wavedash) {
    throw new Error(
      "This example must run inside `wavedash dev`, where `window.Wavedash` is injected."
    );
  }
  return globalThis.Wavedash;
}

export function describeUser(sdk) {
  if (!sdk || typeof sdk.getUser !== "function") {
    return "pending";
  }

  try {
    const user = sdk.getUser();
    return user?.username || user?.id || "unavailable";
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
