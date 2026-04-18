default wavedash_first_playable_reported = False

init -100 python:
    import renpy.store as store

    # Ren'Py's run_script eval sandbox can't reach window, so the bridge is a
    # stdout sniffer: Python print()s a prefixed command, wavedash-bridge.js
    # wraps console.log and dispatches to WavedashJS.
    PREFIX = "[WAVEDASH_BRIDGE]"

    def wavedash_report_first_playable():
        if store.wavedash_first_playable_reported:
            return
        store.wavedash_first_playable_reported = True

        print("%supdateLoadProgress:%s" % (PREFIX, 1))
        print("%sinitSdk" % PREFIX)

label before_main_menu:
    $ wavedash_report_first_playable()
    return
