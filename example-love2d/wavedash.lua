local M = {}

local IS_WEB = love.system.getOS() == "Web"

local function log(message)
  print("[example-love2d] " .. message)
end

local function run_js(code)
  if not IS_WEB then
    return false
  end

  local ok = love.system.openURL("javascript:" .. code)

  if not ok then
    log("Failed to execute browser bridge command: " .. code)
    return false
  end

  return true
end

local function call_bridge(method_name, argument_list)
  if argument_list then
    return run_js(
      "window.WavedashBridge." .. method_name .. "(" .. argument_list .. ")"
    )
  end

  return run_js("window.WavedashBridge." .. method_name .. "()")
end

function M.init(debug, defer_events)
  if not IS_WEB then
    log("Not running in a web build; Wavedash SDK init skipped")
    return
  end

  call_bridge(
    "init",
    string.format("%d,%d", debug and 1 or 0, defer_events and 1 or 0)
  )
end

function M.update_load_progress(fraction)
  if not IS_WEB then
    return
  end

  local clamped = math.max(0, math.min(1, fraction or 0))
  call_bridge("progress", string.format("%.6f", clamped))
end

function M.ready_for_events()
  if not IS_WEB then
    return
  end

  call_bridge("readyForEvents")
end

function M.load_complete()
  if not IS_WEB then
    return
  end

  call_bridge("loadComplete")
end

return M
