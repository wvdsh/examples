phase         = "booting";
boot_timer    = 0;
boot_message  = "Preparing GameMaker scene";
boot_detail   = "Setting up the pong playfield.";
boot_progress = 0;

sdk_backend = "pending";
sdk_user    = "pending";

init_started_ms = 0;
init_timeout_ms = 6000;

player_score = 0;
cpu_score    = 0;
player_y     = FIELD_H / 2;
cpu_y        = FIELD_H / 2;
cpu_target_y     = FIELD_H / 2;
cpu_retarget_in  = 0;
ball_x   = FIELD_W / 2;
ball_y   = FIELD_H / 2;
ball_vx  = 0;
ball_vy  = 0;
serve_dir = choose(-1, 1);
winner    = "";
