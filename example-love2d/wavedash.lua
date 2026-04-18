-- Public Lua API for the Wavedash SDK.
--
-- LÖVE.js has no direct Lua<->JS FFI, so commands cross the boundary as
-- stdout prefixed with [WAVEDASH_BRIDGE]. web/wavedash-bridge.js sniffs these
-- lines from console.log and calls into window.WavedashJS. To add more SDK
-- methods, emit a new prefixed command here and handle it in the bridge.
local M = {}

local PREFIX = "[WAVEDASH_BRIDGE]"

function M.init()
  print(PREFIX .. "init")
end

function M.update_load_progress(fraction)
  local clamped = math.max(0, math.min(1, fraction or 0))
  print(string.format("%sprogress:%.6f", PREFIX, clamped))
end

return M
