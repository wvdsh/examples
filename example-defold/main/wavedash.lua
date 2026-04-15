local M = {}

local function log(message)
    print("[example-defold] " .. message)
end

function M.init()
    if not html5 then
        log("Not running in HTML5; Wavedash SDK calls will be skipped")
        return
    end
    log("Initializing Wavedash SDK")
    html5.run("window.WavedashJS && window.WavedashJS.init()")
end

function M.update_load_progress(fraction)
    if not html5 then return end
    html5.run(
        "window.WavedashJS && window.WavedashJS.updateLoadProgressZeroToOne("
        .. tostring(fraction) .. ")"
    )
end

function M.load_complete()
    if not html5 then return end
    log("Signaling load complete")
    html5.run("window.WavedashJS && window.WavedashJS.loadComplete()")
end

return M
