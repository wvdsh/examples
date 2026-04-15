use bevy::{
    math::bounding::{Aabb2d, BoundingCircle, BoundingVolume, IntersectsVolume},
    prelude::*,
    camera::ScalingMode,
};
use wasm_bindgen::prelude::*;

// --- WavedashJS bridge ---

#[wasm_bindgen(inline_js = "
    export function wavedash_update_progress(p) { WavedashJS.updateLoadProgressZeroToOne(p); }
    export function wavedash_init() { WavedashJS.init({ debug: true }); }
")]
extern "C" {
    fn wavedash_update_progress(p: f64);
    fn wavedash_init();
}

// Arena
const LEFT_WALL: f32 = -450.0;
const RIGHT_WALL: f32 = 450.0;
const TOP_WALL: f32 = 300.0;
const BOTTOM_WALL: f32 = -300.0;
const WALL_THICKNESS: f32 = 10.0;

// Paddle
const PADDLE_W: f32 = 20.0;
const PADDLE_H: f32 = 120.0;
const PADDLE_SPEED: f32 = 500.0;
const PADDLE_X: f32 = 400.0;
const PADDLE_PADDING: f32 = 10.0;

// Ball
const BALL_SIZE: f32 = 20.0;
const BALL_SPEED: f32 = 400.0;

// Colors
const BG_COLOR: Color = Color::srgb(0.04, 0.04, 0.04);
const FG_COLOR: Color = Color::WHITE;

fn main() {
    App::new()
        .add_plugins(DefaultPlugins.set(WindowPlugin {
            primary_window: Some(Window {
                fit_canvas_to_parent: true,
                prevent_default_event_handling: true,
                ..default()
            }),
            ..default()
        }))
        .insert_resource(ClearColor(BG_COLOR))
        .insert_resource(Score::default())
        .add_systems(Startup, setup)
        .add_systems(
            FixedUpdate,
            (move_paddles, apply_velocity, check_collisions).chain(),
        )
        .add_systems(Update, update_scoreboard)
        .run();
}

// --- Components ---

#[derive(Component)]
struct Paddle;

#[derive(Component, PartialEq)]
enum Player {
    Left,
    Right,
}

#[derive(Component)]
struct Ball;

#[derive(Component, Deref, DerefMut)]
struct Velocity(Vec2);

#[derive(Component)]
struct Collider;

#[derive(Component)]
struct ScoreboardUi;

// --- Resources ---

#[derive(Resource, Default)]
struct Score {
    left: u32,
    right: u32,
}

// --- Setup ---

fn setup(mut commands: Commands) {
    wavedash_update_progress(1.0);
    wavedash_init();
    commands.spawn((
        Camera2d,
        Projection::Orthographic(OrthographicProjection {
            scaling_mode: ScalingMode::AutoMin {
                min_width: RIGHT_WALL - LEFT_WALL + WALL_THICKNESS,
                min_height: TOP_WALL - BOTTOM_WALL + WALL_THICKNESS,
            },
            ..OrthographicProjection::default_2d()
        }),
    ));

    // Left paddle
    commands.spawn((
        Sprite::from_color(FG_COLOR, Vec2::ONE),
        Transform {
            translation: Vec3::new(-PADDLE_X, 0.0, 0.0),
            scale: Vec3::new(PADDLE_W, PADDLE_H, 1.0),
            ..default()
        },
        Paddle,
        Player::Left,
        Collider,
    ));

    // Right paddle
    commands.spawn((
        Sprite::from_color(FG_COLOR, Vec2::ONE),
        Transform {
            translation: Vec3::new(PADDLE_X, 0.0, 0.0),
            scale: Vec3::new(PADDLE_W, PADDLE_H, 1.0),
            ..default()
        },
        Paddle,
        Player::Right,
        Collider,
    ));

    // Ball
    commands.spawn((
        Sprite::from_color(FG_COLOR, Vec2::ONE),
        Transform {
            translation: Vec3::ZERO,
            scale: Vec3::new(BALL_SIZE, BALL_SIZE, 1.0),
            ..default()
        },
        Ball,
        Velocity(Vec2::new(1.0, 0.25).normalize() * BALL_SPEED),
    ));

    // Top wall
    commands.spawn((
        Sprite::from_color(FG_COLOR, Vec2::ONE),
        Transform {
            translation: Vec3::new(0.0, TOP_WALL, 0.0),
            scale: Vec3::new(RIGHT_WALL - LEFT_WALL + WALL_THICKNESS, WALL_THICKNESS, 1.0),
            ..default()
        },
        Collider,
    ));

    // Bottom wall
    commands.spawn((
        Sprite::from_color(FG_COLOR, Vec2::ONE),
        Transform {
            translation: Vec3::new(0.0, BOTTOM_WALL, 0.0),
            scale: Vec3::new(RIGHT_WALL - LEFT_WALL + WALL_THICKNESS, WALL_THICKNESS, 1.0),
            ..default()
        },
        Collider,
    ));

    // Center line (decorative)
    commands.spawn((
        Sprite::from_color(Color::srgba(1.0, 1.0, 1.0, 0.15), Vec2::ONE),
        Transform {
            translation: Vec3::new(0.0, 0.0, -1.0),
            scale: Vec3::new(2.0, TOP_WALL - BOTTOM_WALL, 1.0),
            ..default()
        },
    ));

    // Scores (world-space text)
    let score_color = TextColor(Color::srgba(1.0, 1.0, 1.0, 0.2));
    let score_font = TextFont { font_size: 80.0, ..default() };

    commands.spawn((
        Text2d::new("0"),
        score_font.clone(),
        score_color.clone(),
        TextLayout { justify: Justify::Center, ..default() },
        Transform::from_translation(Vec3::new(-100.0, TOP_WALL - 80.0, -0.5)),
        ScoreboardUi,
        Player::Left,
    ));

    commands.spawn((
        Text2d::new("0"),
        score_font,
        score_color,
        TextLayout { justify: Justify::Center, ..default() },
        Transform::from_translation(Vec3::new(100.0, TOP_WALL - 80.0, -0.5)),
        ScoreboardUi,
        Player::Right,
    ));
}

// --- Systems ---

fn move_paddles(
    keyboard_input: Res<ButtonInput<KeyCode>>,
    mut query: Query<(&mut Transform, &Player), With<Paddle>>,
    time: Res<Time>,
) {
    for (mut transform, player) in &mut query {
        let mut direction = 0.0;

        match player {
            Player::Left => {
                if keyboard_input.pressed(KeyCode::KeyW) {
                    direction += 1.0;
                }
                if keyboard_input.pressed(KeyCode::KeyS) {
                    direction -= 1.0;
                }
            }
            Player::Right => {
                if keyboard_input.pressed(KeyCode::ArrowUp) {
                    direction += 1.0;
                }
                if keyboard_input.pressed(KeyCode::ArrowDown) {
                    direction -= 1.0;
                }
            }
        }

        let new_y = transform.translation.y + direction * PADDLE_SPEED * time.delta_secs();
        let max_y = TOP_WALL - WALL_THICKNESS / 2.0 - PADDLE_H / 2.0 - PADDLE_PADDING;
        let min_y = BOTTOM_WALL + WALL_THICKNESS / 2.0 + PADDLE_H / 2.0 + PADDLE_PADDING;
        transform.translation.y = new_y.clamp(min_y, max_y);
    }
}

fn apply_velocity(mut query: Query<(&mut Transform, &Velocity)>, time: Res<Time>) {
    for (mut transform, velocity) in &mut query {
        transform.translation.x += velocity.x * time.delta_secs();
        transform.translation.y += velocity.y * time.delta_secs();
    }
}

fn check_collisions(
    ball_query: Single<(&mut Transform, &mut Velocity), With<Ball>>,
    collider_query: Query<&Transform, (With<Collider>, Without<Ball>)>,
    mut score: ResMut<Score>,
) {
    let (mut ball_transform, mut ball_velocity) = ball_query.into_inner();
    let ball_pos = ball_transform.translation.truncate();

    // Scoring: ball past left boundary
    if ball_pos.x < LEFT_WALL - BALL_SIZE {
        score.right += 1;
        ball_transform.translation = Vec3::ZERO;
        ball_velocity.0 = Vec2::new(-1.0, 0.25).normalize() * BALL_SPEED;
        return;
    }

    // Scoring: ball past right boundary
    if ball_pos.x > RIGHT_WALL + BALL_SIZE {
        score.left += 1;
        ball_transform.translation = Vec3::ZERO;
        ball_velocity.0 = Vec2::new(1.0, 0.25).normalize() * BALL_SPEED;
        return;
    }

    // Bounce off walls and paddles
    let ball_bounding = BoundingCircle::new(ball_pos, BALL_SIZE / 2.0);

    for collider_transform in &collider_query {
        let collider_aabb = Aabb2d::new(
            collider_transform.translation.truncate(),
            collider_transform.scale.truncate() / 2.0,
        );

        if let Some(collision) = ball_collision(ball_bounding, collider_aabb) {
            match collision {
                Collision::Left => {
                    if ball_velocity.x > 0.0 {
                        ball_velocity.x = -ball_velocity.x;
                    }
                }
                Collision::Right => {
                    if ball_velocity.x < 0.0 {
                        ball_velocity.x = -ball_velocity.x;
                    }
                }
                Collision::Top => {
                    if ball_velocity.y < 0.0 {
                        ball_velocity.y = -ball_velocity.y;
                    }
                }
                Collision::Bottom => {
                    if ball_velocity.y > 0.0 {
                        ball_velocity.y = -ball_velocity.y;
                    }
                }
            }
        }
    }
}

fn update_scoreboard(
    score: Res<Score>,
    mut query: Query<(&mut Text2d, &Player), With<ScoreboardUi>>,
) {
    for (mut text, player) in &mut query {
        **text = match player {
            Player::Left => score.left.to_string(),
            Player::Right => score.right.to_string(),
        };
    }
}

// --- Collision ---

#[derive(Debug, PartialEq, Eq, Copy, Clone)]
enum Collision {
    Left,
    Right,
    Top,
    Bottom,
}

fn ball_collision(ball: BoundingCircle, aabb: Aabb2d) -> Option<Collision> {
    if !ball.intersects(&aabb) {
        return None;
    }

    let closest = aabb.closest_point(ball.center());
    let offset = ball.center() - closest;
    let side = if offset.x.abs() > offset.y.abs() {
        if offset.x < 0.0 {
            Collision::Left
        } else {
            Collision::Right
        }
    } else if offset.y > 0.0 {
        Collision::Top
    } else {
        Collision::Bottom
    };

    Some(side)
}
