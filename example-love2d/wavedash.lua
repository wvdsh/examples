-- Public Lua API for the Wavedash SDK.
--
-- LÖVE.js (2dengine build) lets Lua evaluate JavaScript synchronously by
-- calling os.execute("javascript:<code>"). Internally that goes through
-- love.system.openURL → window.open (intercepted by player.js) → eval. The
-- eval result is written to window._output, which io.read() can pick up via
-- the player.js window.prompt override. normalize1.lua glues all of that
-- together so os.execute returns the result string. We only need the
-- fire-and-forget direction here.
local M = {}

function M.init()
  os.execute([[javascript:
    window.WavedashJS && window.WavedashJS.init({ debug: true })
  ]])
end

function M.update_load_progress(fraction)
  local clamped = math.max(0, math.min(1, fraction or 0))
  os.execute(string.format([[javascript:
    window.WavedashJS && window.WavedashJS.updateLoadProgressZeroToOne(%f)
  ]], clamped))
end

return M
