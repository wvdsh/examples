local M = {}

local function run(code)
    if html5 then html5.run(code) end
end

function M.init()
    run("window.WavedashJS && window.WavedashJS.init({ debug: true })")
end

function M.update_load_progress(fraction)
    run("window.WavedashJS && window.WavedashJS.updateLoadProgressZeroToOne(" .. tostring(fraction) .. ")")
end

return M
