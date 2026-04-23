application = {
    content = {
        -- Solar2D's config.lua width/height are the *portrait* dimensions.
        -- With orientation=landscape (see build.settings), these get swapped
        -- at runtime so display.contentWidth=1920 / display.contentHeight=1080.
        width   = 1080,
        height  = 1920,
        scale   = "letterBox",
        fps     = 60,
    },
}
