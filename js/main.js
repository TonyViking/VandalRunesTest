/**
 * main.js — Entry point for the offline endless Wordle game.
 *
 * Wires game.js to display.js, runs the game loop, handles all
 * state machines (title, gameplay, reveal, fanfare, badges, code).
 */

// MAX_GUESSES and WORD_LENGTH are defined in game.js

let game, display;
let inputBuffer = "";
let running = true;
let transitionTimer = 0;
let pendingReveal = false;
let pendingNoPointStamp = false;
let actionQueue = [];

// Performance monitoring (set to true to enable FPS counter)
const SHOW_FPS = false;
let frameCount = 0;
let lastFpsUpdate = 0;

function pushAction(action, data) {
    actionQueue.push({ action, data });
}

function popAction() {
    if (!actionQueue.length) return { action: null, data: null };
    return actionQueue.shift();
}

async function init() {
    const loading = document.getElementById("loading");
    try {
        loading.textContent = "Loading word lists...";
        const [answersText, guessesText] = await Promise.all([
            fetch("data/VandalRunesAnswers.txt").then(r => {
                if (!r.ok) throw new Error(`Failed to load answers: ${r.status}`);
                return r.text();
            }),
            fetch("data/guesses.txt").then(r => {
                if (!r.ok) throw new Error(`Failed to load guesses: ${r.status}`);
                return r.text();
            }),
        ]);
        
        loading.textContent = "Processing word lists...";
        const answers = loadWords(answersText);
        const definitions = loadDefinitions(answersText);
        const guesses = new Set(loadWords(guessesText));
        
        loading.textContent = "Initializing game...";
        game = new Game(answers, definitions, guesses);
        
        loading.textContent = "Loading sprites...";
        const assets = new AssetLoader("Sprites");
        await assets.loadAll();
        
        loading.textContent = "Starting game...";
        display = new Display(assets);
        // Expose for the native-keyboard bridge (js/nativeKeyboard.js), which
        // needs the Display instance to gate the OS keyboard by game state.
        window.display = display;
        window.game = game;
        setupNativeKeyboard();
        display.setState("title");
        display.spawnTitleStamp();
        loading.style.display = "none";
        setupKeyboard();
        requestAnimationFrame(gameLoop);
    } catch (e) {
        loading.innerHTML = `
            <div style="color: #ff6b6b; text-align: center; padding: 20px;">
                <div style="font-size: 24px; margin-bottom: 10px;">⚠️ Error Loading Game</div>
                <div style="margin-bottom: 20px;">${e.message}</div>
                <button onclick="location.reload()" style="
                    padding: 10px 20px;
                    font-size: 16px;
                    background: #538d4e;
                    color: white;
                    border: none;
                    border-radius: 4px;
                    cursor: pointer;
                ">Retry</button>
            </div>
        `;
        console.error(e);
    }
}

function gameLoop() {
    if (!running) return;

    // FPS monitoring
    if (SHOW_FPS) {
        frameCount++;
        const now = performance.now();
        if (now - lastFpsUpdate >= 1000) {
            console.log(`FPS: ${frameCount}`);
            frameCount = 0;
            lastFpsUpdate = now;
        }
    }

    try {
        display._updateHover();
        display.tickHover();
        display.tickClick();

        // Mouse/touch clicks are queued alongside keyboard actions; one
        // action is processed per frame, in the order it arrived.
        const mouseAction = display.handleEvents();
        if (mouseAction) {
            if (Array.isArray(mouseAction)) {
                pushAction(mouseAction[0], mouseAction[1]);
            } else {
                pushAction(mouseAction, null);
            }
        }
        const { action: act, data: dat } = popAction();

    if (act === "quit") {
        running = false;
        display.setState("title");
        display.spawnTitleStamp();
        running = true;
        requestAnimationFrame(gameLoop);
        return;
    }

    // Tap-square actions (touch devices, playing/code screens). The square
    // replaces the drawn keyboard; tapping it opens the OS native keyboard,
    // and the "show keys" link falls back to the drawn keyboard.
    if (act === "summon_keyboard") {
        if (window.nativeKeyboardFocus) window.nativeKeyboardFocus();
    } else if (act === "show_drawn_keys") {
        display.forceDrawnKeyboard = true;
        if (window.nativeKeyboardDismiss) window.nativeKeyboardDismiss();
    }

    // --- Title screen ---
    if (display.state === "title") {
        if (act === "start") {
            display.setState("playing");
            display.pickNewBackground();
            display.resetKeyColours();
            inputBuffer = "";
        } else if (act === "help") {
            display.startHelp();
            display.setState("help");
        } else if (act === "badges") {
            display.startBadges();
            display.setState("badges");
        } else if (act === "code") {
            display.startCode(game);
            display.setState("code");
        }
        display.tickMessage();
        display.tickFlash();
        display.tickParticles();
        display.tickTitleEntrance(game);
        display.draw(game, "");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- Help screen (3 pages, click to advance) ---
    if (display.state === "help") {
        if (act === "back" || act === "continue") {
            if (!display.nextHelpPage()) {
                display.setState("title");
                display.spawnTitleStamp();
            }
        }
        display.tickMessage();
        display.tickFlash();
        display.tickParticles();
        display.draw(game, "");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- Reveal overlay ---
    if (display.state === "reveal") {
        if (act === "continue") {
            display.clearStamp();
            if (display.revealMode === "failed") {
                display.setState("title");
                display.spawnTitleStamp();
            } else {
                game.nextWord();
                display.pickNewBackground();
                display.resetKeyColours();
                display.setState("playing");
            }
            inputBuffer = "";
        }
        display.tickMessage();
        display.tickFlash();
        display.tickParticles();
        display.tickStamp();
        display.draw(game, "");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- Fanfare (achievement queue) ---
    if (display.state === "fanfare") {
        if (act === "continue") {
            if (display.nextFanfare()) {
                // another fanfare started
            } else {
                display.setRevealMode("solved");
                if (pendingNoPointStamp) {
                    pendingNoPointStamp = false;
                    display.spawnNoPointStamp();
                }
                display.setState("reveal");
            }
        }
        display.tickFanfare();
        display.draw(game, "");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- Badges screen ---
    if (display.state === "badges") {
        if (act === "badges_continue") {
            if (!display.nextBadgesPage()) {
                display.setState("title");
                display.spawnTitleStamp();
            }
        }
        display.tickBadges(game);
        display.draw(game, "");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- Code screen ---
    if (display.state === "code") {
        if (act === "code_menu") {
            display.setState("title");
            display.spawnTitleStamp();
        } else if (act === "code_copy") {
            display.copyCurrentCode();
        } else if (act === "code_paste") {
            display.pasteIntoEntry();
        } else if (act === "code_toggle") {
            display.codeUppercase = !display.codeUppercase;
            display._computeCodeKeyRects();
        } else if (act === "code_back") {
            if (display.codeEntryBuffer) {
                display.codeEntryBuffer = display.codeEntryBuffer.slice(0, -1);
            }
            display.codeError = false;
        } else if (act === "code_letter") {
            if (display.codeEntryBuffer.length < CODE_ENTRY_MAX) {
                display.codeEntryBuffer += dat;
                display.codeError = false;
            }
        } else if (act === "code_enter") {
            const newState = decodeSaveCode11(display.codeEntryBuffer);
            if (newState) {
                game.loadFromState(newState);
                display.setState("playing");
                display.pickNewBackground();
                display.resetKeyColours();
                inputBuffer = "";
            } else {
                display.codeError = true;
            }
        }
        display.tickCodeCopy();
        display.tickCodePaste();
        display.draw(game, "");
        requestAnimationFrame(gameLoop);
        return;
    }

    // --- Gameplay ---
    if (transitionTimer > 0) {
        transitionTimer -= 1;
        display.tickMessage();
        display.tickFlash();
        display.tickParticles();
        display.tickAmbient();
        display.draw(game, "");
        if (transitionTimer === 0) {
            if (pendingReveal) {
                pendingReveal = false;
                display.setRevealMode("solved");
                if (pendingNoPointStamp) {
                    pendingNoPointStamp = false;
                    display.spawnNoPointStamp();
                }
                display.setState("reveal");
            } else {
                game.nextWord();
                display.pickNewBackground();
                display.resetKeyColours();
                inputBuffer = "";
            }
        }
        requestAnimationFrame(gameLoop);
        return;
    }

    // Prevent multiple calls to nextWord
    if (!game.transitioning && (game.solved || game.failed)) {
        game.transitioning = true;
        game.nextWord();
        display.pickNewBackground();
        display.resetKeyColours();
        inputBuffer = "";
        display.updateKeyColours(game);
        game.transitioning = false;
    }

    if (act === "toggle_hard") {
        const turningOn = !game.isHardMode();
        if (turningOn && game.getGuessCount() > 0) {
            display.setMessage("Can only turn hard on before first guess", 90);
        } else {
            game.setHardMode(!game.isHardMode());
            display.setMessage(`Hard mode ${game.isHardMode() ? "ON" : "OFF"}`, 60);
        }
    } else if (act === "menu") {
        display.setState("title");
        display.spawnTitleStamp();
        inputBuffer = "";
    } else if (act === "letter") {
        if (inputBuffer.length < WORD_LENGTH) {
            inputBuffer += dat;
        }
    } else if (act === "back") {
        if (inputBuffer.length > 0) {
            inputBuffer = inputBuffer.slice(0, -1);
        }
    } else if (act === "enter") {
        submitGuess();
    }

    display.tickMessage();
    display.tickFlash();
    display.tickParticles();
    display.tickAmbient();
    display.draw(game, inputBuffer);
    } catch (error) {
        console.error('Game loop error:', error);
        // Show error message but keep the game running
        display.setMessage("An error occurred. Game may be unstable.", 180);
        // Try to recover to a safe state
        if (display.state === "playing" && (game.solved || game.failed)) {
            display.setState("title");
            display.spawnTitleStamp();
        }
    }
    requestAnimationFrame(gameLoop);
}

function submitGuess() {
    if (inputBuffer.length !== WORD_LENGTH) {
        display.setMessage("Not enough letters", 60);
        return;
    }
    const oldHigh = game.getHighScore();
    const result = game.submitGuess(inputBuffer);
    if (result.colours === null) {
        display.setMessage(result.error || "Invalid", 90);
        display.setFlash();
        return;
    }
    display.updateKeyColours(game);
    inputBuffer = "";

    if (result.status === "solved") {
        const isLast = game.getGuessCount() >= MAX_GUESSES;
        if (isLast && !game.isHardMode()) {
            pendingNoPointStamp = true;
        } else {
            display.spawnConfetti();
            if (isLast && game.getHighScore() > oldHigh) {
                display.spawnFireworks();
            } else if (!isLast && game.getHighScore() > oldHigh) {
                display.spawnFireworks();
            }
        }
        const triggered = game.checkAchievements();
        if (triggered.length > 0) {
            display.startFanfare(triggered);
            display.setState("fanfare");
            pendingReveal = true;
        } else {
            transitionTimer = 60;
            pendingReveal = true;
        }
    } else if (result.status === "failed") {
        display.setRevealMode("failed");
        display.setState("reveal");
        inputBuffer = "";
    }
}

// --- Keyboard input ---

function setupKeyboard() {
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (display.state === "playing") {
                pushAction("menu");
            } else if (display.state === "code") {
                pushAction("code_menu");
            }
            e.preventDefault();
            return;
        }
        if (display.state === "title") {
            if (e.key === "Enter" || e.key === " ") {
                pushAction("start");
                e.preventDefault();
            }
            return;
        }
        if (display.state === "help") {
            if (e.key === "Enter" || e.key === " ") {
                pushAction("continue");
                e.preventDefault();
            }
            return;
        }
        if (display.state === "reveal") {
            if (e.key === "Enter" || e.key === " ") {
                pushAction("continue");
                e.preventDefault();
            }
            return;
        }
        if (display.state === "fanfare") {
            if (e.key === "Enter" || e.key === " ") {
                pushAction("continue");
                e.preventDefault();
            }
            return;
        }
        if (display.state === "badges") {
            if (e.key === "Enter" || e.key === " ") {
                pushAction("badges_continue");
                e.preventDefault();
            }
            return;
        }
        if (display.state === "code") {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "c") {
                pushAction("code_copy");
                e.preventDefault();
            } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
                pushAction("code_paste");
                e.preventDefault();
            } else if (e.key === "Enter") {
                pushAction("code_enter");
                e.preventDefault();
            } else if (e.key === "Backspace") {
                pushAction("code_back");
                e.preventDefault();
            } else if (/^[a-zA-Z]$/.test(e.key)) {
                // Codes are case-sensitive: keep the case as typed (Shift/Caps).
                pushAction("code_letter", e.key);
                e.preventDefault();
            } else if (/^[0-9]$/.test(e.key)) {
                pushAction("code_letter", e.key);
                e.preventDefault();
            } else if ("?!@#$%^&+*".includes(e.key) && e.key.length === 1) {
                pushAction("code_letter", e.key);
                e.preventDefault();
            }
            return;
        }
        // Playing state
        if (e.key === "Enter") {
            pushAction("enter");
            e.preventDefault();
        } else if (e.key === "Backspace") {
            pushAction("back");
            e.preventDefault();
        } else if (/^[a-zA-Z]$/.test(e.key)) {
            pushAction("letter", e.key.toUpperCase());
            e.preventDefault();
        }
    });
}

init();