draw_clear(c_black);

draw_set_halign(fa_center);
draw_set_valign(fa_top);
draw_set_colour(c_white);
draw_text(FIELD_W / 2, 4, "example-gamemaker");

pong_draw_info_bar();

switch (phase) {
    case "booting":
    case "init_sdk":
    case "building":
    case "finalizing":
        pong_draw_boot();
        break;

    case "error":
        pong_draw_error();
        break;

    default:
        pong_draw_game();
        break;
}

draw_set_halign(fa_left);
draw_set_valign(fa_top);
