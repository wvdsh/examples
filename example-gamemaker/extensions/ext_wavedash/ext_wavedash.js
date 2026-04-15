function wavedash_js_is_available() {
  return window.WavedashJS ? 1.0 : 0.0;
}

function wavedash_js_init() {
  if (!window.WavedashJS || typeof window.WavedashJS.init !== "function") {
    return 0.0;
  }

  window.WavedashJS.init({ debug: true, deferEvents: true });
  return 1.0;
}

function wavedash_js_update_progress(progress) {
  if (
    window.WavedashJS &&
    typeof window.WavedashJS.updateLoadProgressZeroToOne === "function"
  ) {
    window.WavedashJS.updateLoadProgressZeroToOne(progress);
  }

  return 1.0;
}

function wavedash_js_is_ready() {
  if (
    !window.WavedashJS ||
    typeof window.WavedashJS.isReady !== "function"
  ) {
    return 1.0;
  }

  try {
    return window.WavedashJS.isReady() ? 1.0 : 0.0;
  } catch (e) {
    console.warn("[example-gamemaker] Wavedash readiness check failed", e);
    return 0.0;
  }
}

function wavedash_js_ready_for_events() {
  if (
    window.WavedashJS &&
    typeof window.WavedashJS.readyForEvents === "function"
  ) {
    window.WavedashJS.readyForEvents();
  }

  return 1.0;
}

function wavedash_js_load_complete() {
  if (
    window.WavedashJS &&
    typeof window.WavedashJS.loadComplete === "function"
  ) {
    window.WavedashJS.loadComplete();
  }

  return 1.0;
}

function wavedash_js_get_user() {
  if (
    !window.WavedashJS ||
    typeof window.WavedashJS.getUser !== "function"
  ) {
    return "pending";
  }

  try {
    var user = window.WavedashJS.getUser();
    return (user && (user.username || user.name || user.id)) || "unavailable";
  } catch (e) {
    console.warn("[example-gamemaker] Unable to read Wavedash user", e);
    return "unavailable";
  }
}

function wavedash_js_get_backend_state() {
  if (!window.WavedashJS) {
    return "unavailable";
  }

  try {
    if (
      typeof window.WavedashJS.isReady === "function" &&
      window.WavedashJS.isReady()
    ) {
      return "ready";
    }
  } catch (e) {
    return "available";
  }

  return "available";
}
