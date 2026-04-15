function wavedash_init() {
    if (wavedash_js_is_available() < 0.5) {
        show_debug_message("[example-gamemaker] WavedashJS not found on window");
        return false;
    }

    show_debug_message("[example-gamemaker] Initializing Wavedash SDK");
    return (wavedash_js_init() > 0.5);
}

function wavedash_update_progress(_progress) {
    wavedash_js_update_progress(_progress);
}

function wavedash_is_ready() {
    return (wavedash_js_is_ready() > 0.5);
}

function wavedash_ready_for_events() {
    show_debug_message("[example-gamemaker] Releasing deferred events");
    wavedash_js_ready_for_events();
}

function wavedash_load_complete() {
    show_debug_message("[example-gamemaker] Signaling load complete");
    wavedash_js_load_complete();
}

function wavedash_get_user() {
    return wavedash_js_get_user();
}

function wavedash_get_backend_state() {
    return wavedash_js_get_backend_state();
}
