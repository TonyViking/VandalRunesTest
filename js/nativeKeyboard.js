/**
 * nativeKeyboard.js — Native on-screen keyboard bridge for touch devices.
 *
 * The whole game (including its stylised keyboard) is drawn on a <canvas>,
 * which cannot summon the device's OS keyboard. On phones/tablets this file
 * focuses a hidden <input> so the player's own native keyboard pops up, and
 * routes its keystrokes into the SAME pushAction(...) pipeline the physical
 * keyboard already uses (see setupKeyboard in main.js). No game logic or the
 * drawn keyboard is changed — the drawn keys stay as a tappable fallback.
 *
 * Scope (confirmed): the native keyboard is summoned ONLY in the "playing"
 * and "code" states, and dismissed (input blurred) in every other state
 * (title, help, reveal, fanfare, badges) so it never covers those designs.
 *
 * Depends on globals from main.js (pushAction) and the Display instance
 * (window.display). Call setupNativeKeyboard() once after display exists.
 */

(function () {
    "use strict";

    // States that accept typed characters. Everything else dismisses it.
    const TYPING_STATES = new Set(["playing", "code"]);

    // Code screen is case-sensitive and also accepts digits + these symbols
    // (mirrors the physical-keyboard handler in main.js for state "code").
    const CODE_SYMBOLS = "?!@#$%^&+*";

    function isTouchDevice() {
        return (
            ("ontouchstart" in window) ||
            (navigator.maxTouchPoints > 0) ||
            (navigator.msMaxTouchPoints > 0)
        );
    }

    function setupNativeKeyboard() {
        // Desktop with a physical keyboard: do nothing. The existing
        // setupKeyboard() handler already covers those players.
        if (!isTouchDevice()) {
            console.log("[nativeKeyboard] non-touch device — native keyboard bridge disabled");
            return;
        }

        const display = window.display;
        if (!display) {
            console.warn("[nativeKeyboard] no display instance — bridge not started");
            return;
        }

        const input = document.getElementById("native-input");
        if (!input) {
            console.warn("[nativeKeyboard] #native-input element missing — bridge not started");
            return;
        }

        // --- Summon / dismiss based on game state -----------------------

        // Re-fit the canvas by forwarding to the game's own window "resize"
        // handler, which recomputes scale and offsets (honouring the
        // pinTopForKeyboard flag). Defined once here so both setPinTop and
        // the visualViewport listeners below can use it.
        function refit() {
            window.dispatchEvent(new Event("resize"));
        }

        function wantsKeyboard() {
            return TYPING_STATES.has(display.state);
        }

        function configureFor(state) {
            // Playing: letters only, auto-capitalised. Code: case-sensitive,
            // allow digits/symbols, no autocapitalise/autocorrect.
            if (state === "code") {
                input.setAttribute("autocapitalize", "none");
                input.setAttribute("inputmode", "text");
            } else {
                input.setAttribute("autocapitalize", "characters");
                input.setAttribute("inputmode", "text");
            }
        }

        function summon() {
            configureFor(display.state);
            // focus() inside a user gesture is what makes the OS keyboard open.
            try { input.focus({ preventScroll: true }); }
            catch (e) { input.focus(); }
        }

        function dismiss() {
            if (document.activeElement === input) input.blur();
        }

        // Pin the UI to the top (grid clear of the keyboard) while focused,
        // and restore vertical centring when the keyboard goes away. Driven
        // by the input's real focus/blur so it stays in sync even when the
        // player hides the keyboard manually. refit() forwards to the game's
        // own resize so the new offset is applied immediately.
        function setPinTop(on) {
            if (display.pinTopForKeyboard === on) return;
            display.pinTopForKeyboard = on;
            refit();
        }
        input.addEventListener("focus", function () {
            if (wantsKeyboard()) setPinTop(true);
        });
        input.addEventListener("blur", function () {
            setPinTop(false);
        });

        // React to every state change. We wrap display.setState so we don't
        // have to touch the game loop; all transitions flow through here.
        const originalSetState = display.setState.bind(display);
        display.setState = function (newState) {
            const prev = display.state;
            originalSetState(newState);
            if (TYPING_STATES.has(newState)) {
                if (!TYPING_STATES.has(prev)) {
                    // Entered a typing state from a non-typing one.
                    summon();
                } else {
                    // Switched between playing <-> code: reconfigure.
                    configureFor(newState);
                }
            } else {
                dismiss();
            }
            console.log("[nativeKeyboard] state -> " + newState +
                (TYPING_STATES.has(newState) ? " (keyboard summoned)" : " (keyboard dismissed)"));
        };

        // Tapping the canvas while in a typing state re-summons the keyboard
        // if the player dismissed it (phones let the user hide it manually).
        display.canvas.addEventListener("touchend", function () {
            if (wantsKeyboard() && document.activeElement !== input) {
                summon();
            }
        });

        // --- Feed keystrokes into the existing action pipeline ----------

        // Tracks the input's value between "input" events so we can diff it
        // on keyboards that don't emit usable keydown. Declared before the
        // handlers so both can reference it unambiguously.
        let lastValue = "";

        // Letters/Enter/Backspace via keydown (desktop-style events that
        // many mobile keyboards still emit, and our emulator testing uses).
        //
        // IMPORTANT: the existing physical-keyboard handler (setupKeyboard in
        // main.js) listens on `document`. Events from this input bubble up to
        // document, so without stopPropagation every keystroke would be
        // processed twice (double letters). We handle it here and stop it.
        // We also preventDefault on handled keys so they don't additionally
        // fire an "input" event and get counted a second time below.
        input.addEventListener("keydown", function (e) {
            if (!wantsKeyboard()) return;
            const state = display.state;
            let handled = false;

            if (e.key === "Enter") {
                pushAction(state === "code" ? "code_enter" : "enter");
                handled = true;
            } else if (e.key === "Backspace") {
                pushAction(state === "code" ? "code_back" : "back");
                handled = true;
            } else if (state === "code") {
                if (/^[a-zA-Z0-9]$/.test(e.key)) {
                    // Codes are case-sensitive: keep the case as typed.
                    pushAction("code_letter", e.key);
                    handled = true;
                } else if (e.key.length === 1 && CODE_SYMBOLS.includes(e.key)) {
                    pushAction("code_letter", e.key);
                    handled = true;
                }
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                pushAction("letter", e.key.toUpperCase());
                handled = true;
            }

            if (handled) {
                // Keep the field empty and block the duplicate document-level
                // handler + any resulting "input" event.
                input.value = "";
                lastValue = "";
                e.preventDefault();
                e.stopPropagation();
            }
        });

        // Fallback for mobile keyboards that fire "input" with no useful
        // keydown (common on Android). We diff the value and translate the
        // net change into letter / back actions, then clear it back to "".
        input.addEventListener("input", function () {
            if (!wantsKeyboard()) { input.value = ""; lastValue = ""; return; }
            const state = display.state;
            const val = input.value;

            if (val.length > lastValue.length) {
                // Characters were added since last time.
                const added = val.slice(lastValue.length);
                for (const ch of added) {
                    if (state === "code") {
                        if (/^[a-zA-Z0-9]$/.test(ch) || CODE_SYMBOLS.includes(ch)) {
                            pushAction("code_letter", ch);
                        }
                    } else if (/^[a-zA-Z]$/.test(ch)) {
                        pushAction("letter", ch.toUpperCase());
                    }
                }
            } else if (val.length < lastValue.length) {
                // Characters were removed (backspace on keydown-less keyboards).
                const removed = lastValue.length - val.length;
                for (let i = 0; i < removed; i++) {
                    pushAction(state === "code" ? "code_back" : "back");
                }
            }
            // Keep the field empty so length never drifts and the native
            // keyboard's own autocomplete/suggestions can't accumulate text.
            input.value = "";
            lastValue = "";
        });

        // --- Keep the active area on screen when the keyboard opens -----

        // When the OS keyboard opens, some browsers shrink the visual
        // viewport (fires visualViewport resize) and others just overlay it.
        // The game's own window "resize" handler refits the 504x672 UI into
        // the remaining space; we forward visualViewport changes to it so the
        // grid + current guess stay centred in the visible region. This does
        // not move any element behind the keyboard into view by itself, but
        // it prevents the active guess row from being scaled off-screen.
        if (window.visualViewport) {
            window.visualViewport.addEventListener("resize", refit);
            window.visualViewport.addEventListener("scroll", refit);
        }

        // If we are already in a typing state at startup (we normally start
        // on "title", so this is just defensive), summon now.
        if (wantsKeyboard()) summon();

        console.log("[nativeKeyboard] touch device — native keyboard bridge active");
    }

    // Expose for main.js to call after the Display is created.
    window.setupNativeKeyboard = setupNativeKeyboard;
})();
