var _dt = 1 / game_get_speed(gamespeed_fps);

switch (phase) {
    case "serve":
        pong_update_player(_dt);
        pong_update_cpu(_dt);

        if (keyboard_check_pressed(vk_space) || keyboard_check_pressed(vk_enter)) {
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

        if (keyboard_check_pressed(vk_space) || keyboard_check_pressed(vk_enter)) {
            pong_restart_match();
        }
        break;
}
