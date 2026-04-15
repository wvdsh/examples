function love.conf(t)
  t.identity = "example-love2d"
  t.version = "11.5"
  t.console = true

  t.window.title = "example-love2d"
  t.window.width = 960
  t.window.height = 540
  t.window.resizable = false

  t.modules.audio = false
  t.modules.joystick = false
  t.modules.physics = false
  t.modules.thread = false
  t.modules.touch = false
  t.modules.video = false
end
