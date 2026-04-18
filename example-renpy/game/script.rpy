label main_menu:
    call screen main_menu

screen main_menu():
    tag menu

    use pong_backdrop

    frame:
        xalign 0.5
        yalign 0.5
        xmaximum 940
        xpadding 48
        ypadding 38
        background Solid("#08111f")

        vbox:
            spacing 20

            text "Pong, a Simple Game That Changed Everything" size 44 color "#f8fafc"
            text "A short Ren'Py story on how one prototype helped define an industry." size 20 color "#cbd5e1" xmaximum 780

            textbutton "Start":
                action Start()
                text_size 26
                text_color "#f8fafc"
                text_hover_color "#67e8f9"
                background Solid("#164e63")
                hover_background Solid("#0e7490")
                xpadding 24
                ypadding 12

    key "K_RETURN" action Start()
    key "K_SPACE" action Start()

define guide = Character("Guide", who_color="#7dd3fc")
define alcorn = Character("Allan", who_color="#fde68a")
define bartender = Character("Bartender", who_color="#c4b5fd")

image bg studio = Solid("#0f172a")
image bg tavern = Solid("#221b2f")
image bg arcade = Solid("#101827")
image bg living_room = Solid("#1f2937")
image bg endcard = Solid("#08111f")

screen pong_backdrop():
    add Solid("#08111f")

    for segment in range(12):
        frame:
            background Solid("#334155")
            xalign 0.5
            ypos 26 + (segment * 54)
            xsize 6
            ysize 30

    frame:
        background Solid("#67e8f9")
        xalign 0.14
        yalign 0.34
        xsize 18
        ysize 164

    frame:
        background Solid("#fdba74")
        xalign 0.86
        yalign 0.58
        xsize 18
        ysize 164

    frame:
        background Solid("#f8fafc")
        xalign 0.53
        yalign 0.46
        xsize 22
        ysize 22

screen pong_title_card(card_title, card_subtitle):
    modal True
    use pong_backdrop

    frame:
        background Solid("#08111f")
        xalign 0.5
        yalign 0.5
        xmaximum 920
        xpadding 42
        ypadding 34

        vbox:
            spacing 16

            text "example-renpy" size 22 color "#67e8f9"
            text card_title size 44 color "#f8fafc"
            text card_subtitle size 24 color "#cbd5e1" xmaximum 780
            textbutton "Continue" action Return():
                text_size 24
            text "Click, tap, Enter, or Space to continue." size 18 color "#94a3b8"

    key "K_RETURN" action Return()
    key "K_SPACE" action Return()

label start:
    scene bg studio
    with fade

    narrator "Pong looks simple now: two paddles, a square ball, and a court."
    narrator "In the early 1970s, though, that simplicity made it powerful."
    guide "At Atari, Allan Alcorn was asked to build a table-tennis game as a training exercise."
    alcorn "That made it manageable: a clear idea, a short scope, and enough challenge to learn the hardware."

    scene bg tavern
    with dissolve

    narrator "Then the prototype reached Andy Capp's Tavern in California."
    bartender "Players lined up. The cabinet gathered so many quarters that the coin mechanism jammed."
    guide "That small test mattered because it proved people would pay to play again, even when the concept was brand new."

    scene bg arcade
    with dissolve

    narrator "Atari moved fast. Pong machines spread, competitors copied the formula, and arcade video games started to look like a real business."
    guide "Pong was not the only influence on the early industry, but it became one of the clearest commercial proofs."

    narrator "What part of Pong's impact stands out most?"

    menu:
        "The tavern test showed the idea worked.":
            narrator "A training exercise turned into a product when ordinary players kept feeding the machine quarters."
        "Arcades suddenly had a game people understood.":
            narrator "Pong was easy to read at a glance, which made it powerful on a busy arcade floor."
        "Home Pong brought games into the living room.":
            narrator "Once a version arrived at home, video games stopped being only a public novelty."

    scene bg living_room
    with dissolve

    narrator "The home version pushed the story even further. Video games became something families could keep in their own homes."
    guide "That shift helped establish games as an ongoing part of everyday life, not just a curiosity in bars and arcades."
    narrator "Pong's rules were tiny. Its historical effect was not."

    scene bg endcard
    with fade

    call screen pong_title_card(
        "A simple game can define an industry.",
        "Pong helped prove that video games could be approachable, commercial, and worth bringing home."
    )

    return
