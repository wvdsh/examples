local M = {}

function M.init()
    if not html5 then return end
    html5.run("window.WavedashJS && window.WavedashJS.init()")
end

function M.update_load_progress(fraction)
    if not html5 then return end
    html5.run(
        "window.WavedashJS && window.WavedashJS.updateLoadProgressZeroToOne("
        .. tostring(fraction) .. ")"
    )
end

return M
