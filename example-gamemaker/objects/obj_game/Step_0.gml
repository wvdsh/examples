var _dt = 1 / game_get_speed(gamespeed_fps);

switch (phase) {

    case "booting":
        boot_timer += _dt;

        if (boot_timer >= 0.12) {
            boot_progress = 0.12;
            wavedash_update_progress(0.12);
            phase = "init_sdk";
        }
        break;

    // init_sdk calls init() on its first frame, then polls isReady() until
    // the SDK reports readiness or the timeout expires.
    case "init_sdk":
        if (init_started_ms == 0) {
            if (!wavedash_init()) {
                phase        = "error";
                boot_message = "Startup failed";
                boot_detail  = "This example must run inside wavedash dev.";
                show_debug_message("[example-gamemaker] " + boot_detail);
                break;
            }

            boot_progress = 0.42;
            boot_message  = "Initializing Wavedash SDK";
            boot_detail   = "Calling init() from GameMaker and waiting for readiness.";
            wavedash_update_progress(0.42);
            init_started_ms = current_time;
        } else if (wavedash_is_ready()) {
            sdk_backend = wavedash_get_backend_state();
            sdk_user    = wavedash_get_user();

            boot_progress = 0.78;
            boot_message  = "Building game state";
            boot_detail   = "Preparing the pong playfield and opening serve.";
            wavedash_update_progress(0.78);
            phase = "building";
        } else if (current_time - init_started_ms > init_timeout_ms) {
            phase        = "error";
            boot_message = "SDK timeout";
            boot_detail  = "WavedashJS did not report ready before the startup timeout.";
            show_debug_message("[example-gamemaker] " + boot_detail);
        }
        break;

    case "building":
        player_score = 0;
        cpu_score    = 0;
        winner       = "";
        pong_prepare_serve(choose(-1, 1));

        boot_progress = 1;
        boot_message  = "Finalizing startup";
        boot_detail   = "GameMaker has reached the first playable frame.";
        wavedash_update_progress(1);
        phase = "finalizing";
        break;

    case "finalizing":
        wavedash_ready_for_events();
        wavedash_load_complete();

        sdk_backend = "ready";
        sdk_user    = wavedash_get_user();
        phase       = "serve";
        break;

    case "serve":
        pong_update_player(_dt);
        pong_update_cpu(_dt);

        if (keyboard_check_pressed(vk_space)
            || keyboard_check_pressed(vk_enter)) {
            pong_start_serve();
        }
        break;

    case "play":
        pong_update_player(_dt);
        pong_update_cpu(_dt);
        pong_update_ball(_dt);
        break;

    case "game_over":
        pong_update_player(_dt);
        pong_update_cpu(_dt);

        if (keyboard_check_pressed(vk_space)
            || keyboard_check_pressed(vk_enter)) {
            pong_restart_match();
        }
        break;
}
