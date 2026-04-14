default wavedash_sdk_connected = False
default wavedash_sdk_state_text = "SDK pending"
default wavedash_user_name = ""
default wavedash_first_playable_reported = False

init -100 python:
    import json
    import renpy.store as store

    # The browser wrapper stays intentionally thin. Once the web export is
    # running, Ren'Py owns the meaningful startup sequence from here on.
    BRIDGE_EXPR = "window.parent && window.parent.__ExampleRenpyBridge"
    READY_POLL_ATTEMPTS = 160
    READY_POLL_SECONDS = 0.05
    PROGRESS_RUNTIME_AVAILABLE = 0.46
    PROGRESS_INIT_SDK = 0.66
    PROGRESS_PREPARE_FIRST_SCENE = 0.88
    PROGRESS_READY = 1.0

    class ExampleWavedashBridge(object):
        bridge_expr = BRIDGE_EXPR

        def _run(self, script):
            renpy.emscripten.run_script(script)

        def _run_int(self, script):
            return renpy.emscripten.run_script_int(script)

        def _run_string(self, script):
            return renpy.emscripten.run_script_string(script)

        def bridge_available(self):
            if not renpy.emscripten:
                return False

            return bool(
                self._run_int("(function() { return %s ? 1 : 0; })();" % self.bridge_expr)
            )

        def require_bridge(self):
            if not renpy.emscripten:
                raise RuntimeError("This example requires the Ren'Py web runtime.")

            if not self.bridge_available():
                raise RuntimeError(
                    "This example must be launched by build/web/game.js inside wavedash dev."
                )

        def _call_void(self, method, *args):
            encoded_args = ", ".join(json.dumps(arg) for arg in args)
            if encoded_args:
                invocation = "bridge.%s(%s);" % (method, encoded_args)
            else:
                invocation = "bridge.%s();" % method

            self._run(
                "(function() {"
                "var bridge = %s;"
                "if (!bridge || typeof bridge.%s !== 'function') { return; }"
                "%s"
                "})();"
                % (self.bridge_expr, method, invocation)
            )

        def _call_int(self, method):
            return self._run_int(
                "(function() {"
                "var bridge = %s;"
                "if (!bridge || typeof bridge.%s !== 'function') { return 0; }"
                "return bridge.%s();"
                "})();"
                % (self.bridge_expr, method, method)
            )

        def _call_string(self, method):
            return self._run_string(
                "(function() {"
                "var bridge = %s;"
                "if (!bridge || typeof bridge.%s !== 'function') { return ''; }"
                "var result = bridge.%s();"
                "return result == null ? '' : String(result);"
                "})();"
                % (self.bridge_expr, method, method)
            )

        def set_loading(self, step, progress, detail):
            self._call_void("setLoading", step, progress, detail)

        def init_sdk(self):
            self._call_void("initSdk")

        def is_sdk_ready(self):
            return bool(self._call_int("isSdkReady"))

        def get_last_error(self):
            return self._call_string("getLastError")

        def get_user_name(self):
            return self._call_string("getUserName")

        def expose_playable(self):
            self._call_void("exposePlayable")

        def ready_for_events(self):
            self._call_void("readyForEvents")

        def load_complete(self):
            self._call_void("loadComplete")

        def show_fatal(self, message, detail):
            self._call_void("showFatal", message, detail)

    WAVEDASH_BRIDGE = ExampleWavedashBridge()

    if "wavedash_status_overlay" not in config.overlay_screens:
        config.overlay_screens.append("wavedash_status_overlay")

    def wavedash_reset_state():
        store.wavedash_sdk_connected = False
        store.wavedash_sdk_state_text = "SDK pending"
        store.wavedash_user_name = ""
        store.wavedash_first_playable_reported = False

    def wavedash_fail(message, detail):
        store.wavedash_sdk_connected = False
        store.wavedash_sdk_state_text = "SDK error"

        if WAVEDASH_BRIDGE.bridge_available():
            WAVEDASH_BRIDGE.show_fatal(message, detail)

        renpy.error("%s\n\n%s" % (message, detail))

    def wavedash_boot():
        bridge = WAVEDASH_BRIDGE
        bridge.require_bridge()

        bridge.set_loading(
            "Ren'Py runtime available",
            PROGRESS_RUNTIME_AVAILABLE,
            "The web export is running. Ren'Py now owns the rest of startup.",
        )
        store.wavedash_sdk_state_text = "SDK starting"
        renpy.pause(READY_POLL_SECONDS, hard=True)

        bridge.set_loading(
            "Initializing Wavedash SDK",
            PROGRESS_INIT_SDK,
            "Calling WavedashJS.init({ debug: true, deferEvents: true }) through the thin browser bridge.",
        )
        bridge.init_sdk()

        for _ in range(READY_POLL_ATTEMPTS):
            error_detail = bridge.get_last_error()
            if error_detail:
                raise RuntimeError(error_detail)

            if bridge.is_sdk_ready():
                store.wavedash_sdk_connected = True
                store.wavedash_sdk_state_text = "SDK connected"
                store.wavedash_user_name = bridge.get_user_name()
                break

            renpy.pause(READY_POLL_SECONDS, hard=True)
        else:
            raise RuntimeError("WavedashJS did not report ready before the startup timeout.")

        bridge.set_loading(
            "Preparing first playable scene",
            PROGRESS_PREPARE_FIRST_SCENE,
            "The first Ren'Py screen will be shown before deferred events are released.",
        )
        renpy.pause(READY_POLL_SECONDS, hard=True)

    def wavedash_report_first_playable():
        if store.wavedash_first_playable_reported:
            return

        # This screen is the first state the player can actually interact with,
        # so this is the earliest correct moment to release deferred events.
        WAVEDASH_BRIDGE.set_loading(
            "Loading complete",
            PROGRESS_READY,
            "The first interactive Ren'Py screen is visible and can accept input.",
        )
        WAVEDASH_BRIDGE.expose_playable()
        WAVEDASH_BRIDGE.ready_for_events()
        WAVEDASH_BRIDGE.load_complete()
        store.wavedash_first_playable_reported = True

label splashscreen:
    $ wavedash_reset_state()
    python:
        try:
            wavedash_boot()
        except Exception as error:
            wavedash_fail("Failed to boot example-renpy.", str(error))
    return

label before_main_menu:
    jump start
