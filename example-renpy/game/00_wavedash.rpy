default wavedash_first_playable_reported = False

init -100 python:
    import renpy.store as store

    def wavedash_report_first_playable():
        if store.wavedash_first_playable_reported:
            return
        store.wavedash_first_playable_reported = True

        if not renpy.emscripten:
            return

        renpy.emscripten.run_script("""
            Promise.resolve(window.WavedashJS).then(function (sdk) {
                sdk.updateLoadProgressZeroToOne(1);
                sdk.init({ debug: true });
            });
        """)

label before_main_menu:
    $ wavedash_report_first_playable()
    return
