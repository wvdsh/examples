function wavedash_js_init() {
  if (window.WavedashJS && typeof window.WavedashJS.init === "function") {
    window.WavedashJS.init({ debug: true });
  }
  return 1.0;
}

function wavedash_js_update_progress(progress) {
  if (window.WavedashJS && typeof window.WavedashJS.updateLoadProgressZeroToOne === "function") {
    window.WavedashJS.updateLoadProgressZeroToOne(progress);
  }
  return 1.0;
}
