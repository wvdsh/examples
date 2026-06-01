// Controller object created — report early progress.
wavedash_update_progress(0.3);

player_score = 0;
cpu_score    = 0;

player_y     = FIELD_H / 2;
cpu_y        = FIELD_H / 2;
cpu_target_y = FIELD_H / 2;
cpu_retarget_in = 0;
ball_x  = FIELD_W / 2;
ball_y  = FIELD_H / 2;
ball_vx = 0;
ball_vy = 0;
serve_dir = choose(-1, 1);

// Game state initialized — report mid progress.
wavedash_update_progress(0.7);

pong_prepare_serve(serve_dir);

// All setup done — signal fully loaded.
wavedash_update_progress(1);
wavedash_init();

phase = "play";
pong_start_serve();
