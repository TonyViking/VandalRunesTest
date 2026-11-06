/**
 * display.js — Canvas rendering for the offline endless Wordle game.
 *
 * Port of src/display.py. All rendering, animations, state screens,
 * badges, fanfare, code screen, particles, stamps, hover/click.
 */

// --- Layout constants ---

const BASE_W = 504;
const BASE_H = 672;

// Grid
const TILE_SIZE = 50;
const TILE_GAP = 6;
const GRID_TOP = 110;
const GRID_LEFT = Math.floor((BASE_W - (5 * TILE_SIZE + 4 * TILE_GAP)) / 2);

// Keyboard
const KEYBOARD_TOP = 460;
const KEY_W = 44;
const KEY_H = 52;
const KEY_GAP = 6;
const BOTTOM_KEY_W = 34;

// Native-keyboard "TAP TO TYPE" square + "show keys" fallback link.
// Occupies the drawn-keyboard area (which spans 3 rows from KEYBOARD_TOP).
const TAP_SQUARE_W = 10 * KEY_W;                // matches top keyboard row width
const TAP_SQUARE_H = 100;
const TAP_SQUARE_X = Math.floor((BASE_W - TAP_SQUARE_W) / 2);
const TAP_SQUARE_Y = KEYBOARD_TOP + 6;
const SHOW_KEYS_W = 160;
const SHOW_KEYS_H = 30;
const SHOW_KEYS_X = Math.floor((BASE_W - SHOW_KEYS_W) / 2);
const SHOW_KEYS_Y = TAP_SQUARE_Y + TAP_SQUARE_H + 14;
const TAP_SQUARE_RECT = { x: TAP_SQUARE_X, y: TAP_SQUARE_Y, w: TAP_SQUARE_W, h: TAP_SQUARE_H };
const SHOW_KEYS_RECT = { x: SHOW_KEYS_X, y: SHOW_KEYS_Y, w: SHOW_KEYS_W, h: SHOW_KEYS_H };

// Hard mode button
const HARD_BTN_X = BASE_W - 135 - 8;
const HARD_BTN_Y = 8;
const HARD_BTN_W = 135;
const HARD_BTN_H = 92;

// Hint area
const HINT_LEFT = 140;
const HINT_RIGHT = HARD_BTN_X - 4;
const HINT_W = HINT_RIGHT - HINT_LEFT;
const HINT_Y = 8;
const HINT_H = 96;

// Main Menu button
const MENU_BTN_W = GRID_LEFT;
const MENU_BTN_H = 50;
const MENU_BTN_X = 0;
const MENU_BTN_Y = KEYBOARD_TOP - MENU_BTN_H - 4;

// Title screen button rects (new layout)
const START_RECT = { x: 188, y: 325, w: 128, h: 84 };
const QUIT_RECT  = { x: 188, y: 528, w: 128, h: 84 };
const HELP_RECT   = { x: 370, y: 353, w: 80, h: 28 };
const BADGES_RECT = { x: 34, y: 353, w: 120, h: 28 };
const CODE_RECT   = { x: 172, y: 440, w: 160, h: 28 };

// Badges screen layout
const BADGES_SHIELD_CX = 252;
const BADGES_SHIELD_CY = 218;
const BADGES_SHIELD_SCALE = 2.5;
const BADGE_STICKER_SIZE = 80;
const BADGE_STICKER_OFFSETS = [[-50, -46], [50, -46], [-50, 46], [50, 46]];
const BADGE_NAME_GRID_TOP = 438;
const BADGE_NAME_GRID_H = 165;
const BADGES_CONTINUE_RECT = { x: BASE_W - 120 - 8, y: 8, w: 120, h: 90 };

// Code screen layout
const CODE_SHIFT = KEY_H;
const CODE_DISPLAY_Y = 50 + CODE_SHIFT;
const CODE_ENTRY_Y = 180 + CODE_SHIFT;
const CODE_NUM_KEY_W = 36;
const CODE_NUM_KEY_H = 36;
const CODE_NUM_KEY_GAP = 4;
const CODE_NUM_ROW_TOP = KEYBOARD_TOP - CODE_NUM_KEY_H - CODE_NUM_KEY_GAP;
const CODE_BACK_KEY_W = 63;
const CODE_ENTRY_MAX = 11;
// Code-entry tile layout: 11 chars as 4-4-3 tiles with fixed dashes
// between groups, mirroring the guess-grid tile style. Sized to fit within
// the old entry-field width (BASE_W - 120).
const CODE_TILE_SIZE = 34;
const CODE_TILE_GAP = 4;
const CODE_DASH_W = 18;            // space reserved for each group dash
const CODE_ENTRY_TILE_Y = CODE_ENTRY_Y;   // vertical centre of the tile row
// Total width: 11 tiles + 10 tile-gaps + 2 dash slots (each replaces one
// tile-gap, so add CODE_DASH_W - CODE_TILE_GAP twice).
const CODE_ENTRY_TOTAL_W = (11 * CODE_TILE_SIZE) + (10 * CODE_TILE_GAP)
    + 2 * (CODE_DASH_W - CODE_TILE_GAP);
const CODE_ENTRY_LEFT = Math.floor((BASE_W - CODE_ENTRY_TOTAL_W) / 2);
// Per-tile x positions (left edge of each tile) and dash centres.
const CODE_TILE_XS = [];
{
    // The dashes sit between tiles 3->4 and 7->8 (0-based).
    let _x = CODE_ENTRY_LEFT;
    for (let i = 0; i < 11; i++) {
        CODE_TILE_XS.push(_x);
        _x += CODE_TILE_SIZE + CODE_TILE_GAP;
        if (i === 3 || i === 7) _x += (CODE_DASH_W - CODE_TILE_GAP);
    }
}
// Dash centres, used to draw the "-" separators between groups.
const CODE_DASH_CENTRES = [
    CODE_ENTRY_LEFT + 4 * CODE_TILE_SIZE + 3 * CODE_TILE_GAP + CODE_DASH_W / 2,
    CODE_ENTRY_LEFT + 8 * CODE_TILE_SIZE + 7 * CODE_TILE_GAP + 2 * (CODE_DASH_W - CODE_TILE_GAP) + CODE_DASH_W / 2,
];
// Native-keyboard tap square for the code screen: covers the number/letter
// pad area (from CODE_NUM_ROW_TOP down through the QWERTY rows), leaving the
// entry field, PASTE, MENU and COPY buttons above it untouched.
const CODE_TAP_SQUARE_X = TAP_SQUARE_X;
const CODE_TAP_SQUARE_Y = CODE_NUM_ROW_TOP;
const CODE_TAP_SQUARE_W = TAP_SQUARE_W;
const CODE_TAP_SQUARE_H = (KEYBOARD_TOP + 3 * (KEY_H + KEY_GAP)) - CODE_NUM_ROW_TOP - 10;
const CODE_TAP_SQUARE_RECT = { x: CODE_TAP_SQUARE_X, y: CODE_TAP_SQUARE_Y, w: CODE_TAP_SQUARE_W, h: CODE_TAP_SQUARE_H };
const CODE_SHOW_KEYS_RECT = { x: SHOW_KEYS_X, y: CODE_TAP_SQUARE_Y + CODE_TAP_SQUARE_H + 8, w: SHOW_KEYS_W, h: SHOW_KEYS_H };
// 11-character code shown in 4-4-3 chunks separated by dashes (13.13).
// RUN OF THE <SEED WORD> line, very top of the code screen (13.8, 13.13):
// teal sprite letters, above the CURRENT SAVE label.
const CODE_RUN_NAME_Y = 40;
const CODE_RUN_NAME_LETTER_H = 24;
const CODE_MENU_W = 120;
const CODE_MENU_H = 50;
const CODE_MENU_RECT = { x: 8, y: CODE_NUM_ROW_TOP - CODE_MENU_H - 8, w: CODE_MENU_W, h: CODE_MENU_H };
// Copy-to-clipboard button (mirrors menu button on the right side)
const CODE_COPY_RECT = { x: BASE_W - CODE_MENU_W - 8, y: CODE_NUM_ROW_TOP - CODE_MENU_H - 8, w: CODE_MENU_W, h: CODE_MENU_H };
// Paste button (below the entry field and error line, small, centred)
const CODE_PASTE_W = 100;
const CODE_PASTE_H = 32;
const CODE_PASTE_RECT = { x: Math.floor((BASE_W - CODE_PASTE_W) / 2), y: CODE_ENTRY_Y + 78, w: CODE_PASTE_W, h: CODE_PASTE_H };

// --- Colours ---

const BG = "#121213";
const WHITE = "#ffffff";
const EMPTY_BORDER = "#3a3a3c";
const FILLED_BORDER = "#565758";
const GREEN_BG = "#538d4e";
const ORANGE_BG = "#c97a38";
const GRAY_BG_C = "#3a3a3c";
const TEAL_BG = "#0a5a5a";
const PURPLE_BG = "#58388c";
const KEY_BG_COLOUR = "#818384";
const KEY_TEXT = "#ffffff";
const KEY_GREEN = "#538d4e";
const KEY_ORANGE = "#c97a38";
const KEY_GRAY = "#3a3a3c";
const KEY_PURPLE = "#58388c";
const TEXT_DIM = "#787878";
const TEXT_BRIGHT = "#d7d7d7";
const FLASH_COLOUR = "#dc3232";
const FLASH_DURATION = 60;
const BG_DIM = 0.4;
const KEY_ALPHA = 0.6;
const EMPTY_TILE_ALPHA = 0.5;

const CONFETTI_COLOURS = [
    [255,100,100],[100,200,255],[100,255,100],[255,255,100],
    [255,165,0],[200,100,255],[255,150,200],[100,255,255],
];
const FIREWORK_COLOURS = [
    [255,200,100],[255,100,100],[100,200,255],[255,255,150],
    [200,150,255],[150,255,150],
];

// --- Particle ---

class Particle {
    constructor(x, y, vx, vy, colour, life, gravity = 0.3, size = 6,
                w = null, h = null, angle = 0, spin = 0) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.colour = colour;
        this.life = life; this.maxLife = life;
        this.gravity = gravity;
        this.size = size;
        this.w = w || size; this.h = h || size;
        this.angle = angle; this.spin = spin;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy += this.gravity; this.vx *= 0.99;
        this.angle += this.spin; this.life -= 1;
    }
    isAlive() { return this.life > 0; }
}

// --- AmbientParticle ---

class AmbientParticle {
    constructor(x, y, vx, vy, colour, size, life, ptype,
                swayPhase = 0, swayAmp = 0, maxAlpha = 160) {
        this.x = x; this.y = y;
        this.vx = vx; this.vy = vy;
        this.colour = colour; this.size = size;
        this.life = life; this.maxLife = life;
        this.ptype = ptype;
        this.swayPhase = swayPhase; this.swayAmp = swayAmp;
        this.maxAlpha = maxAlpha;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        if (this.swayAmp !== 0) {
            this.x += Math.sin(this.swayPhase) * this.swayAmp;
            this.swayPhase += 0.03;
        }
        this.life -= 1;
    }
    isAlive() { return this.life > 0; }
    alphaRatio() {
        return Math.min(1.0, (this.maxLife - this.life) / 60, this.life / 60);
    }
}

// --- StampEffect ---

class StampEffect {
    constructor(image, cx, cy, rotation, baseW = 200, maxH = 130, drift = false) {
        this.image = image;
        const [origW, origH] = [image.width, image.height];
        this.baseW = baseW;
        this.baseH = Math.floor(origH * baseW / origW);
        if (maxH !== null && this.baseH > maxH) {
            this.baseH = maxH;
            this.baseW = Math.floor(origW * this.baseH / origH);
        }
        this.cx = cx; this.cy = cy;
        this.rotation = rotation;
        this.frame = 0;
        this.scale = 0.0; this.vel = 0.0;
        this.target = 1.0;
        this.stiffness = 0.22; this.damping = 0.28;
        this.scaleX = 0.0; this.scaleY = 0.0;
        this.done = false;
        this.drift = drift;
        this.driftFrame = 0;
    }

    update() {
        if (this.done) {
            if (this.drift) this.driftFrame += 1;
            return true;
        }
        this.frame += 1;
        const force = (this.target - this.scale) * this.stiffness;
        this.vel += force;
        this.vel *= (1.0 - this.damping);
        this.scale += this.vel;
        if (this.scale < this.target) {
            const amount = (this.target - this.scale) * 0.25;
            this.scaleX = Math.max(0.0, this.scale - amount);
            this.scaleY = this.scale + amount;
        } else if (this.scale > this.target) {
            const amount = (this.scale - this.target) * 0.25;
            this.scaleX = this.scale + amount;
            this.scaleY = this.scale - amount;
        } else {
            this.scaleX = this.target; this.scaleY = this.target;
        }
        if (this.frame > 15
                && Math.abs(this.scale - this.target) < 0.008
                && Math.abs(this.vel) < 0.005) {
            this.scaleX = this.target; this.scaleY = this.target;
            this.done = true;
        }
        return this.done;
    }

    draw(ctx, extraScale = 1.0) {
        if (this.scaleX < 0.02 || this.scaleY < 0.02) return;
        const w = Math.max(2, Math.floor(this.baseW * this.scaleX * extraScale));
        const h = Math.max(2, Math.floor(this.baseH * this.scaleY * extraScale));
        let cx = this.cx, cy = this.cy, rot = this.rotation;
        if (this.done && this.drift) {
            cx += 5 * Math.sin(this.driftFrame * 0.006);
            cy += 4 * Math.sin(this.driftFrame * 0.0045);
        }
        ctx.save();
        ctx.translate(cx, cy);
        // pygame rotates positive angles counter-clockwise; canvas rotates
        // them clockwise, so the sign is flipped to match the desktop tilt.
        if (Math.abs(rot) > 0.5) ctx.rotate(-rot * Math.PI / 180);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(this.image, -w / 2, -h / 2, w, h);
        ctx.restore();
    }
}

// --- Display ---

class Display {
    constructor(assets) {
        this.assets = assets;
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.ctx.imageSmoothingEnabled = false;
        this.virtual = document.createElement("canvas");
        this.virtual.width = BASE_W;
        this.virtual.height = BASE_H;
        this.vctx = this.virtual.getContext("2d");
        // Smooth scaling by default (pygame smoothscale); nearest-neighbour
        // only where desktop uses transform.scale (backgrounds, shields,
        // sprite-letter text).
        this.vctx.imageSmoothingEnabled = true;

        this.windowW = BASE_W;
        this.windowH = BASE_H;
        this.uiScale = 1;
        this.uiOffsetX = 0;
        this.uiOffsetY = 0;
        // When true, _resize() pins the UI to the top instead of centring it
        // vertically. Toggled by js/nativeKeyboard.js while the native
        // keyboard is open on a touch input screen.
        this.pinTopForKeyboard = false;
        // Touch devices use the OS native keyboard: the drawn keyboard is
        // replaced by a "TAP TO TYPE" square (js/nativeKeyboard.js sets this).
        this.useNativeKeyboard = false;
        // Fallback: if the player taps "show keys", reveal the original drawn
        // keyboard for the rest of the session even on a touch device.
        this.forceDrawnKeyboard = false;

        // On touch devices the native keyboard covers the bottom; lift the
        // guess grid + Main Menu button up by ~half a tile so they stay
        // clear of it even when the viewport doesn't pin to the top.
        // _gridLift() returns 0 on desktop so the layout is unchanged there.

        this.state = "title";
        this.revealMode = "solved";
        this.stampEffect = null;
        this.titleStamp = null;
        this.startStamp = null;
        this.quitStamp = null;
        this.highScoreStamp = null;
        this.helpStamp = null;
        this.badgesStamp = null;
        this.codeStamp = null;
        this.helpPage = 0;
        this.titleEntranceFrame = 0;
        this.ambientParticles = [];
        this.hoveredButton = null;
        this.hoverScale = 1.0;
        this.pressedButton = null;
        this.clickButton = null;
        this.clickScale = 1.0;
        this.clickVel = 0.0;
        this.clickPhase = "idle";

        // Fanfare state
        this.fanfareQueue = [];
        this.fanfareTitleStamp = null;
        this.fanfareBadgeStamp = null;
        this.fanfareFrame = 0;
        this._codeButtonSurf = null;

        // Badges screen state
        this.badgesPage = 0;
        this.badgesEntranceFrame = 0;
        this.badgesBadgeStamps = [null, null, null, null];
        this.badgesNameStamps = [null, null, null, null];
        this.badgesRotations = [];

        // Code screen state
        this.codeEntryBuffer = "";
        this.codeUppercase = true;   // ABC view by default (matches desktop)
        this.codeError = false;
        this.codeKeyRects = [];
        this._codeCurrentCode = null;
        this.codeCopyFeedback = false;  // shows "COPIED!" briefly after copy
        this.codeCopyTimer = 0;
        this.codePasteFeedback = false; // shows "PASTED!" briefly after paste
        this.codePasteTimer = 0;

        this.keyColours = {};
        this.message = "";
        this.messageTimer = 0;
        this.flashTimer = 0;
        this.particles = [];
        this.currentBg = null;
        this.bgIndex = 0;

        this.mouseX = 0;
        this.mouseY = 0;
        this.mouseDown = false;      // true = a press is waiting to be handled
        this.clickX = 0;
        this.clickY = 0;
        this.releasePending = false; // release arrived before the press was handled

        // Surface cache for performance
        this.surfaceCache = new Map();

        this.keyRects = [];
        this._computeKeyRects();
        this._setupCanvas();
        this._setupInput();
    }

    _computeKeyRects() {
        this.keyRects = [];
        const layout = [
            [["Q",KEY_W],["W",KEY_W],["E",KEY_W],["R",KEY_W],
             ["T",KEY_W],["Y",KEY_W],["U",KEY_W],["I",KEY_W],
             ["O",KEY_W],["P",KEY_W]],
            [["A",KEY_W],["S",KEY_W],["D",KEY_W],["F",KEY_W],
             ["G",KEY_W],["H",KEY_W],["J",KEY_W],["K",KEY_W],
             ["L",KEY_W]],
            [["BACK",125],["Z",BOTTOM_KEY_W],["X",BOTTOM_KEY_W],
             ["C",BOTTOM_KEY_W],["V",BOTTOM_KEY_W],["B",BOTTOM_KEY_W],
             ["N",BOTTOM_KEY_W],["M",BOTTOM_KEY_W],["ENTER",135]],
        ];
        for (let r = 0; r < layout.length; r++) {
            const row = layout[r];
            const totalW = row.reduce((s, [_, w]) => s + w, 0);
            let x = Math.floor((BASE_W - totalW) / 2);
            const y = KEYBOARD_TOP + r * (KEY_H + KEY_GAP);
            for (const [label, w] of row) {
                this.keyRects.push([label, {x, y, w, h: KEY_H}]);
                x += w;
            }
        }
    }

    // True when native-keyboard mode is active and the drawn keyboard is
    // suppressed (touch device, player hasn't chosen the "show keys"
    // fallback). Controls tap routing: while this is true, the drawn keys
    // are never hit-tested.
    _showTapSquare() {
        return this.useNativeKeyboard && !this.forceDrawnKeyboard;
    }

    // True when the "TAP TO TYPE" square should actually be drawn and be
    // tappable. Only when native mode is active AND the native keyboard is
    // currently closed — once it opens (pinTopForKeyboard) the square is
    // redundant and would otherwise float in view over the keyboard, so we
    // hide it.
    _tapSquareVisible() {
        return this._showTapSquare() && !this.pinTopForKeyboard;
    }

    // Vertical lift applied on touch devices so the guess grid + Main Menu
    // button clear the native keyboard. ~half a tile. 0 on desktop.
    _gridLift() {
        return this.useNativeKeyboard ? Math.round(TILE_SIZE / 2) : 0;
    }

    // Draw the "TAP TO TYPE" square + small "show keys" fallback link in the
    // keyboard area. Used on playing and code screens on touch devices.
    // squareRect/linkRect default to the playing-screen positions; the code
    // screen passes its own. hoverId distinguishes the two squares' hovers.
    _drawTapSquare(squareRect = TAP_SQUARE_RECT, linkRect = SHOW_KEYS_RECT, hoverId = "tap-square") {
        const ctx = this.vctx;
        const hs = this._hoverExtra(hoverId);
        const r = squareRect;
        // Square: dark rounded panel matching the game's other buttons.
        let x = r.x, y = r.y, w = r.w, h = r.h;
        if (hs !== 1.0) {
            const nw = Math.floor(w * hs), nh = Math.floor(h * hs);
            x = Math.floor(r.x + r.w / 2 - nw / 2);
            y = Math.floor(r.y + r.h / 2 - nh / 2);
            w = nw; h = nh;
        }
        ctx.fillStyle = "#1e1e28";
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.fill();
        ctx.strokeStyle = "#50506a";
        ctx.lineWidth = 2;
        this._roundRect(ctx, x, y, w, h, 8);
        ctx.stroke();
        // Label: keyboard glyph + "TAP TO TYPE"
        ctx.fillStyle = TEXT_BRIGHT;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        const cx = Math.floor(r.x + r.w / 2);
        const cy = Math.floor(r.y + r.h / 2);
        ctx.font = "28px Arial";
        ctx.fillText("\u2328", cx, cy - 14);   // ⌨ keyboard glyph
        ctx.font = "bold 20px Arial";
        ctx.fillText("TAP TO TYPE", cx, cy + 18);
        // Fallback link: "show keys"
        ctx.fillStyle = TEXT_DIM;
        ctx.font = "15px Arial";
        ctx.textBaseline = "middle";
        ctx.fillText("show keys", Math.floor(linkRect.x + linkRect.w / 2),
            Math.floor(linkRect.y + linkRect.h / 2));
    }

    _setupCanvas() {
        this._resize();
        // Debounced resize handler for better performance
        let resizeTimeout;
        window.addEventListener("resize", () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => this._resize(), 100);
        });
    }

    _resize() {
        // Canvas fills the whole container; the 504x672 UI is centred
        // inside it and the space around is filled by the background
        // image (11.8 polish) — no blank bars.
        const container = document.getElementById("game-container");
        const cw = container.clientWidth;
        const ch = container.clientHeight;
        let scale = Math.min(cw / BASE_W, ch / BASE_H);
        if (scale < 0.1) scale = 0.1;
        this.uiScale = scale;
        this.windowW = Math.floor(BASE_W * scale);
        this.windowH = Math.floor(BASE_H * scale);
        this.uiOffsetX = Math.floor((cw - this.windowW) / 2);
        // Normally the UI is centred vertically. When pinTopForKeyboard is
        // set (touch input screens with the native keyboard open), pin it to
        // the top instead so the grid sits as high as possible, clear of the
        // keyboard. Set by js/nativeKeyboard.js; off everywhere else, so
        // desktop / non-input screens keep the original centred layout.
        if (this.pinTopForKeyboard) {
            this.uiOffsetY = 0;
        } else {
            this.uiOffsetY = Math.floor((ch - this.windowH) / 2);
        }
        this.canvas.width = cw;
        this.canvas.height = ch;
        this.canvas.style.width = cw + "px";
        this.canvas.style.height = ch + "px";
    }

    setState(newState) {
        this.state = newState;
    }

    _getCachedSurface(key, generator) {
        if (!this.surfaceCache.has(key)) {
            this.surfaceCache.set(key, generator());
        }
        return this.surfaceCache.get(key);
    }

    _setupInput() {
        this.canvas.addEventListener("mousemove", (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
        });
        // A press is stored as a pending click (with its position) and
        // handled on the next frame, so a quick tap is never lost.  If the
        // release arrives before that frame, it is applied after the press.
        const press = (x, y) => {
            this.mouseX = x; this.mouseY = y;
            this.clickX = x; this.clickY = y;
            this.mouseDown = true;
            this.releasePending = false;
        };
        const release = () => {
            if (this.mouseDown) this.releasePending = true;
            else this._setClickUp();
        };
        this.canvas.addEventListener("mousedown", (e) => {
            if (e.button !== 0) return;
            const rect = this.canvas.getBoundingClientRect();
            press(e.clientX - rect.left, e.clientY - rect.top);
        });
        this.canvas.addEventListener("mouseup", (e) => {
            if (e.button !== 0) return;
            release();
        });
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const rect = this.canvas.getBoundingClientRect();
            press(touch.clientX - rect.left, touch.clientY - rect.top);
        }, { passive: false });
        this.canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
            release();
        }, { passive: false });
    }

    _windowToLogical(pos) {
        // Canvas-relative coords -> UI coords: subtract the centred UI
        // offset first (the canvas is bigger than the UI when the
        // container aspect differs from 504:672).
        const mx = Math.floor((pos[0] - this.uiOffsetX) / this.uiScale);
        const my = Math.floor((pos[1] - this.uiOffsetY) / this.uiScale);
        if (mx < 0 || mx >= BASE_W || my < 0 || my >= BASE_H) return [null, null];
        return [mx, my];
    }

    _pointInRect(x, y, rect) {
        return x >= rect.x && x < rect.x + rect.w && y >= rect.y && y < rect.y + rect.h;
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }

    // --- Background ---

    pickNewBackground() {
        if (!this.assets.bgSurfs.length) {
            this.currentBg = null;
            this.ambientParticles = [];
            return;
        }
        const bgIdx = this.bgIndex % this.assets.bgSurfs.length;
        this.currentBg = this.assets.bgSurfs[bgIdx];
        this.bgIndex += 1;
        this.spawnAmbient(bgIdx);
    }

    _blitCover(surf, target, dim = 0.0) {
        const [sw, sh] = [surf.width, surf.height];
        const [tw, th] = [target.width, target.height];
        let scale = 1;
        while (sw * scale < tw || sh * scale < th) scale += 1;
        const dw = sw * scale, dh = sh * scale;
        const ox = Math.floor((tw - dw) / 2);
        const oy = Math.floor((th - dh) / 2);
        const ctx = target.getContext("2d");
        ctx.save();
        ctx.imageSmoothingEnabled = false;  // integer nearest-neighbour cover
        ctx.drawImage(surf, ox, oy, dw, dh);
        ctx.restore();
        if (dim > 0.0) {
            ctx.fillStyle = `rgba(0,0,0,${dim})`;
            ctx.fillRect(0, 0, tw, th);
        }
    }

    // --- Ambient particles ---

    EMBER_COLOURS = [
        [255,140,50],[255,100,40],[255,160,60],[220,80,30],[255,120,30],[240,90,30],
    ];
    DUST_COLOURS = [[200,200,210],[180,180,190],[210,210,220]];
    SNOW_COLOURS = [[240,240,250],[230,235,245],[250,250,255]];

    spawnAmbient(bgIndex) {
        this.ambientParticles = [];
        // 3 BGs, 3 effects: BG1 embers, BG2 dust, BG3 snow
        if (bgIndex === 0) {
            for (let i = 0; i < 25; i++) this.ambientParticles.push(this._makeEmber());
        } else if (bgIndex === 1) {
            for (let i = 0; i < 50; i++) this.ambientParticles.push(this._makeDust());
        } else if (bgIndex === 2) {
            for (let i = 0; i < 35; i++) this.ambientParticles.push(this._makeSnow());
        }
    }

    _makeEmber() {
        return new AmbientParticle(
            Math.random() * BASE_W, Math.random() * (BASE_H * 0.5) + BASE_H * 0.5,
            Math.random() * 0.4 - 0.2, Math.random() * 0.5 - 0.8,
            this.EMBER_COLOURS[Math.floor(Math.random() * this.EMBER_COLOURS.length)],
            Math.floor(Math.random() * 3) + 3, Math.floor(Math.random() * 200) + 300,
            "ember", 0, 0, 150);
    }

    _makeDust() {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 0.2 + 0.1;
        return new AmbientParticle(
            Math.random() * BASE_W, Math.random() * BASE_H,
            Math.cos(angle) * speed, Math.sin(angle) * speed,
            this.DUST_COLOURS[Math.floor(Math.random() * this.DUST_COLOURS.length)],
            Math.floor(Math.random() * 2) + 1, Math.floor(Math.random() * 200) + 400,
            "dust", 0, 0, 100);
    }

    _makeSnow() {
        return new AmbientParticle(
            Math.random() * BASE_W, Math.random() * (BASE_H * 0.3) - 30,
            Math.random() * 0.6 - 0.3, Math.random() * 1.0 + 0.5,
            this.SNOW_COLOURS[Math.floor(Math.random() * this.SNOW_COLOURS.length)],
            Math.floor(Math.random() * 3) + 2, Math.floor(Math.random() * 200) + 400,
            "snow", Math.random() * Math.PI * 2, Math.random() * 0.5 + 0.3, 180);
    }

    _respawnAmbient(p) {
        if (p.ptype === "ember") {
            p.x = Math.random() * BASE_W;
            p.y = Math.random() * (BASE_H * 0.3) + BASE_H * 0.7;
            p.vx = Math.random() * 0.4 - 0.2;
            p.vy = Math.random() * 0.5 - 0.8;
            p.life = Math.floor(Math.random() * 200) + 300;
        } else if (p.ptype === "dust") {
            p.x = Math.random() * BASE_W;
            p.y = Math.random() * BASE_H;
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 0.2 + 0.1;
            p.vx = Math.cos(angle) * speed;
            p.vy = Math.sin(angle) * speed;
            p.life = Math.floor(Math.random() * 200) + 400;
        } else if (p.ptype === "snow") {
            p.x = Math.random() * BASE_W;
            p.y = -30 + Math.random() * 20;
            p.vx = Math.random() * 0.6 - 0.3;
            p.vy = Math.random() * 1.0 + 0.5;
            p.life = Math.floor(Math.random() * 200) + 400;
        }
        p.maxLife = p.life;
    }

    tickAmbient() {
        for (const p of this.ambientParticles) {
            p.update();
            if (p.life <= 0) {
                this._respawnAmbient(p);
                continue;
            }
            if (p.y < -30) { p.y = BASE_H + 30; p.x = Math.random() * BASE_W; }
            else if (p.y > BASE_H + 30) { p.y = -30; p.x = Math.random() * BASE_W; }
            if (p.x < -30) p.x = BASE_W + 30;
            else if (p.x > BASE_W + 30) p.x = -30;
        }
    }

    _drawAmbient() {
        const ctx = this.vctx;
        for (const p of this.ambientParticles) {
            if (p.life <= 0) continue;
            const ratio = p.alphaRatio();
            const alpha = Math.floor(p.maxAlpha * ratio);
            if (alpha <= 0) continue;
            const [r, g, b] = p.colour;
            ctx.fillStyle = `rgba(${r},${g},${b},${alpha / 255})`;
            ctx.beginPath();
            ctx.arc(Math.floor(p.x), Math.floor(p.y), p.size, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    // --- Drawing ---

    draw(game, inputBuffer = "") {
        this.vctx.imageSmoothingEnabled = true;
        if (this.state === "title") {
            this._drawTitleScreen(game);
        } else if (this.state === "help") {
            this._drawHelpScreen(game);
        } else if (this.state === "reveal") {
            this._drawReveal(game);
        } else if (this.state === "fanfare") {
            this._drawFanfare(game);
        } else if (this.state === "badges") {
            this._drawBadges(game);
        } else if (this.state === "code") {
            this._drawCode(game);
        } else {
            this._drawGameplay(game, inputBuffer);
        }
        this._present();
    }

    _present() {
        // Whole canvas gets the current screen's background image,
        // cover-scaled, same dim as inside the UI area, then the UI is
        // drawn centred on top — no blank bars (11.8 polish).
        const ctx = this.ctx;
        ctx.imageSmoothingEnabled = false;
        const [bgSurf, bgDim] = this._screenBg();
        if (bgSurf) this._blitCover(bgSurf, this.canvas, bgDim);
        else { ctx.fillStyle = BG; ctx.fillRect(0, 0, this.canvas.width, this.canvas.height); }
        ctx.drawImage(this.virtual, this.uiOffsetX, this.uiOffsetY,
            this.windowW, this.windowH);
    }

    _screenBg() {
        // The current screen's background (surface, dim) — the same
        // surface and dim the screen draws inside the UI area.
        if (this.state === "title" || this.state === "badges") {
            return [this.assets.getTitleBackground(), BG_DIM];
        }
        if (this.state === "playing" || this.state === "reveal" ||
            this.state === "fanfare") {
            return [this.currentBg, BG_DIM];
        }
        if (this.state === "help") {
            return [this.assets.bgSurfs[0] || null, BG_DIM];
        }
        if (this.state === "code") {
            return [this.assets.bgSurfs[0] || null, 0.6];
        }
        return [null, 0.0];
    }

    // --- Title screen ---

    // Title-screen entrance trigger frames (5-frame stagger, 11.8 polish)
    // Order: Title → Start → Help → Quit → High Score → Badges → C0dE?
    TITLE_TRIGGER = 0;
    START_TRIGGER = 5;
    HELP_TRIGGER = 10;
    QUIT_TRIGGER = 15;
    HIGH_SCORE_TRIGGER = 20;
    BADGES_TRIGGER = 25;
    CODE_TRIGGER = 30;

    _drawTitleScreen(game) {
        const ctx = this.vctx;
        ctx.imageSmoothingEnabled = true;

        const titleBg = this.assets.getTitleBackground();
        if (titleBg) this._blitCover(titleBg, this.virtual, BG_DIM);
        else { ctx.fillStyle = BG; ctx.fillRect(0, 0, BASE_W, BASE_H); }

        // Title logo
        const title = this.assets.getTitle();
        if (this.titleStamp) {
            this.titleStamp.draw(ctx);
        } else if (title) {
            const tw = title.width, th = title.height;
            const scale = 2;
            ctx.drawImage(title, Math.floor((BASE_W - tw * scale) / 2),
                Math.floor(130 - th * scale / 2), tw * scale, th * scale);
        } else {
            ctx.fillStyle = TEXT_BRIGHT;
            ctx.font = "bold 36px Arial";
            ctx.textAlign = "center";
            ctx.fillText("VANDAL RUNES", BASE_W / 2, 130);
        }

        // High score
        if (this.highScoreStamp) {
            this.highScoreStamp.draw(ctx);
        } else if (this.titleEntranceFrame >= this.HIGH_SCORE_TRIGGER) {
            this._drawTitleHighScore(game);
        }

        // Start
        const startBtn = this.assets.getButton("Says_Start");
        if (this.startStamp) {
            this.startStamp.draw(ctx, this._hoverExtra("start"));
        } else if (this.titleEntranceFrame >= this.START_TRIGGER) {
            this._drawScaledBtn(ctx, startBtn, START_RECT, this._hoverExtra("start"), "START", GREEN_BG);
        }

        // Help (stamps in early, -8° rotation for personality)
        const helpBtn = this.assets.getButton("Help");
        if (this.helpStamp) {
            this.helpStamp.draw(ctx, this._hoverExtra("help"));
        } else if (this.titleEntranceFrame >= this.HELP_TRIGGER) {
            this._drawScaledBtnRot(ctx, helpBtn, HELP_RECT, this._hoverExtra("help"), "HELP", "#3c3c3c", -8);
        }

        // Quit
        const quitBtn = this.assets.getButton("Says_Quit");
        if (this.quitStamp) {
            this.quitStamp.draw(ctx, this._hoverExtra("quit"));
        } else if (this.titleEntranceFrame >= this.QUIT_TRIGGER) {
            this._drawScaledBtn(ctx, quitBtn, QUIT_RECT, this._hoverExtra("quit"), "QUIT", "#782828");
        }

        // High score
        if (this.highScoreStamp) {
            this.highScoreStamp.draw(ctx);
        } else if (this.titleEntranceFrame >= this.HIGH_SCORE_TRIGGER) {
            this._drawTitleHighScore(game);
        }

        // Badges (+5° rotation, counter-clockwise)
        const badgesBtn = this.assets.getButton("achievements");
        if (this.badgesStamp) {
            this.badgesStamp.draw(ctx, this._hoverExtra("badges"));
        } else if (this.titleEntranceFrame >= this.BADGES_TRIGGER) {
            this._drawScaledBtnRot(ctx, badgesBtn, BADGES_RECT, this._hoverExtra("badges"), "BADGES", "#3c5050", 5);
        }

        // Code
        if (this.codeStamp) {
            this.codeStamp.draw(ctx, this._hoverExtra("code"));
        } else if (this.titleEntranceFrame >= this.CODE_TRIGGER) {
            const codeBtn = this._composeCodeButton();
            if (codeBtn) {
                this._drawScaledBtn(ctx, codeBtn, CODE_RECT, this._hoverExtra("code"), "C0dE?", "#3c3c50");
            }
        }
    }

    _drawScaledBtn(ctx, img, rect, hs, fallbackText, fallbackColour) {
        if (!img) {
            ctx.fillStyle = fallbackColour;
            this._roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 6);
            ctx.fill();
            ctx.fillStyle = WHITE;
            ctx.font = "bold 22px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(fallbackText, Math.floor(rect.x + rect.w / 2), Math.floor(rect.y + rect.h / 2));
            return;
        }
        const fitScale = Math.min((rect.w - 4) / img.width, (rect.h - 4) / img.height);
        const s = fitScale * hs;
        const w = Math.floor(img.width * s);
        const h = Math.floor(img.height * s);
        ctx.drawImage(img, Math.floor(rect.x + rect.w / 2 - w / 2),
            Math.floor(rect.y + rect.h / 2 - h / 2), w, h);
    }

    _drawScaledBtnRot(ctx, img, rect, hs, fallbackText, fallbackColour, rot) {
        if (!img) {
            ctx.save();
            ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
            ctx.rotate(-rot * Math.PI / 180);
            ctx.fillStyle = fallbackColour;
            this._roundRect(ctx, -rect.w / 2, -rect.h / 2, rect.w, rect.h, 6);
            ctx.fill();
            ctx.fillStyle = WHITE;
            ctx.font = "bold 22px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(fallbackText, 0, 0);
            ctx.restore();
            return;
        }
        const fitScale = Math.min((rect.w - 4) / img.width, (rect.h - 4) / img.height);
        let scaled = img;
        if (fitScale < 1) {
            const nw = Math.floor(img.width * fitScale);
            const nh = Math.floor(img.height * fitScale);
            const tmp = document.createElement("canvas");
            tmp.width = nw; tmp.height = nh;
            tmp.getContext("2d").drawImage(img, 0, 0, nw, nh);
            scaled = tmp;
        }
        if (hs !== 1.0) {
            const sw = Math.floor(scaled.width * hs);
            const sh = Math.floor(scaled.height * hs);
            const tmp2 = document.createElement("canvas");
            tmp2.width = sw; tmp2.height = sh;
            tmp2.getContext("2d").drawImage(scaled, 0, 0, sw, sh);
            scaled = tmp2;
        }
        ctx.save();
        ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
        ctx.rotate(-rot * Math.PI / 180);  // pygame sign (positive = counter-clockwise)
        ctx.drawImage(scaled, -Math.floor(scaled.width / 2), -Math.floor(scaled.height / 2));
        ctx.restore();
    }

    _drawTitleHighScore(game) {
        const ctx = this.vctx;
        const best = game.getHighScore();
        const labelH = 40, numH = 40, gap = 6;
        const label = this.assets.getButton("HIGH_SCORE_sprite");
        let sw, sh;
        if (label) {
            const lw = label.width, lh = label.height;
            const scale = labelH / lh;
            sw = Math.max(1, Math.floor(lw * scale));
            sh = Math.max(1, Math.floor(lh * scale));
        } else {
            ctx.font = "bold 18px Arial";
            const m = ctx.measureText("HIGH SCORE");
            sw = m.width; sh = 18;
        }
        const digits = this._hsDigitsToSurfs(best);
        let totalNumW = 0;
        let numSurf = null;
        if (digits.length > 0) {
            for (const d of digits) {
                const scale = numH / d.height;
                totalNumW += Math.max(1, Math.floor(d.width * scale)) + 3;
            }
            totalNumW -= 3;
        } else {
            numSurf = { width: ctx.measureText(String(best)).width, height: numH };
            totalNumW = numSurf.width;
        }
        const totalW = sw + gap + totalNumW;
        const totalH = Math.max(sh, numH);
        const startX = Math.floor((BASE_W - totalW) / 2);
        const startY = 294 - totalH;
        if (label) {
            ctx.drawImage(label, startX, startY + (totalH - sh) / 2, sw, sh);
        } else {
            ctx.fillStyle = TEXT_BRIGHT;
            ctx.textAlign = "center";
            ctx.fillText("HIGH SCORE", Math.floor(startX + sw / 2), Math.floor(startY + sh / 2));
        }
        const numX = startX + sw + gap;
        if (digits.length > 0) {
            let dx = numX;
            for (const d of digits) {
                const scale = numH / d.height;
                const dw = Math.max(1, Math.floor(d.width * scale));
                ctx.drawImage(d, dx, startY + (totalH - numH) / 2, dw, numH);
                dx += dw + 3;
            }
        } else if (numSurf) {
            ctx.fillText(String(best), Math.floor(numX + totalNumW / 2), Math.floor(startY + totalH / 2));
        }
    }

    _composeCodeButton() {
        return this._getCachedSurface('codeButton', () => {
            const chars = [["upper","C"],["digit","0"],["lower","D"],["upper","E"],["punct","?"]];
            const glyphH = 30;
            const surfs = [];
            for (const [kind, ch] of chars) {
                let s;
                if (kind === "upper") s = this.assets.getLetter("gray", ch);
                else if (kind === "lower") s = this.assets.getCodeLower(ch);
                else s = this.assets.getCodeGlyph(ch);
                if (!s) {
                    const col = kind === "lower" ? "#649bff" : "#c8c8d2";
                    s = document.createElement("canvas");
                    s.width = 20; s.height = glyphH;
                    const sctx = s.getContext("2d");
                    sctx.font = `bold ${glyphH}px Arial`;
                    sctx.fillStyle = col;
                    sctx.textBaseline = "top";
                    sctx.fillText(ch, 0, 0);
                } else {
                    const scale = glyphH / s.height;
                    const nw = Math.max(1, Math.floor(s.width * scale));
                    const tmp = document.createElement("canvas");
                    tmp.width = nw; tmp.height = glyphH;
                    tmp.getContext("2d").drawImage(s, 0, 0, nw, glyphH);
                    s = tmp;
                }
                surfs.push(s);
            }
            if (!surfs.length) return null;
            let totalW = 0;
            for (const s of surfs) totalW += s.width + 2;
            totalW -= 2;
            const maxH = Math.max(...surfs.map(s => s.height));
            const surf = document.createElement("canvas");
            surf.width = totalW; surf.height = maxH;
            const sctx = surf.getContext("2d");
            let x = 0;
            for (const s of surfs) {
                sctx.drawImage(s, x, 0);
                x += s.width + 2;
            }
            return surf;
        });
    }

    _composeHighScoreSurface(game) {
        const best = game.getHighScore();
        const cacheKey = `highScore_${best}`;
        
        return this._getCachedSurface(cacheKey, () => {
            const ctx = this.vctx;
            const labelH = 40, numH = 40, gap = 6;
            const label = this.assets.getButton("HIGH_SCORE_sprite");
            let sw, sh, scaledLabel;
            if (label) {
                const lw = label.width, lh = label.height;
                const scale = labelH / lh;
                sw = Math.max(1, Math.floor(lw * scale));
                sh = Math.max(1, Math.floor(lh * scale));
                scaledLabel = document.createElement("canvas");
                scaledLabel.width = sw; scaledLabel.height = sh;
                scaledLabel.getContext("2d").drawImage(label, 0, 0, sw, sh);
            } else {
                scaledLabel = document.createElement("canvas");
                const sctx2 = scaledLabel.getContext("2d");
                sctx2.font = "bold 18px Arial";
                sctx2.fillStyle = TEXT_BRIGHT;
                sctx2.textBaseline = "top";
                sctx2.fillText("HIGH SCORE", 0, 0);
                sw = scaledLabel.width = sctx2.measureText("HIGH SCORE").width;
                sh = scaledLabel.height = 18;
            }
            const digits = this._hsDigitsToSurfs(best);
            let totalNumW = 0;
            let digitSurfs = [];
            if (digits.length > 0) {
                for (const d of digits) {
                    const scale = numH / d.height;
                    const dw = Math.max(1, Math.floor(d.width * scale));
                    const tmp = document.createElement("canvas");
                    tmp.width = dw; tmp.height = numH;
                    tmp.getContext("2d").drawImage(d, 0, 0, dw, numH);
                    digitSurfs.push(tmp);
                    totalNumW += dw + 3;
                }
                totalNumW -= 3;
            } else {
                totalNumW = ctx.measureText(String(best)).width;
            }
            const totalW = sw + gap + totalNumW;
            const totalH = Math.max(sh, numH);
            const surf = document.createElement("canvas");
            surf.width = totalW; surf.height = totalH;
            const sctx3 = surf.getContext("2d");
            sctx3.drawImage(scaledLabel, 0, (totalH - sh) / 2);
            let numX = sw + gap;
            if (digitSurfs.length) {
                for (const d of digitSurfs) {
                    sctx3.drawImage(d, numX, (totalH - numH) / 2);
                    numX += d.width + 3;
                }
            }
            return surf;
        });
    }

    // --- Title entrance ---

    spawnTitleStamp() {
        const title = this.assets.getTitle();
        if (!title) return;
        const tw = title.width;
        this.titleEntranceFrame = 0;
        this.startStamp = null;
        this.helpStamp = null;
        this.quitStamp = null;
        this.highScoreStamp = null;
        this.badgesStamp = null;
        this.codeStamp = null;
        this.titleStamp = new StampEffect(title, Math.floor(BASE_W / 2), 130, 0,
            tw * 2, null, true);
    }

    tickTitleEntrance(game) {
        this.titleEntranceFrame += 1;
        const f = this.titleEntranceFrame;

        if (f === this.START_TRIGGER && !this.startStamp) {
            const btn = this.assets.getButton("Says_Start");
            if (btn) this.startStamp = new StampEffect(
                btn, START_RECT.x + START_RECT.w / 2, START_RECT.y + START_RECT.h / 2,
                0, btn.width, null);
        } else if (f === this.HELP_TRIGGER && !this.helpStamp) {
            const btn = this.assets.getButton("Help");
            if (btn) this.helpStamp = new StampEffect(
                btn, HELP_RECT.x + HELP_RECT.w / 2, HELP_RECT.y + HELP_RECT.h / 2,
                -8, HELP_RECT.w, null);
        } else if (f === this.QUIT_TRIGGER && !this.quitStamp) {
            const btn = this.assets.getButton("Says_Quit");
            if (btn) this.quitStamp = new StampEffect(
                btn, QUIT_RECT.x + QUIT_RECT.w / 2, QUIT_RECT.y + QUIT_RECT.h / 2,
                0, btn.width, null);
        } else if (f === this.HIGH_SCORE_TRIGGER && !this.highScoreStamp) {
            const hs = this._composeHighScoreSurface(game);
            if (hs) {
                const cy = 294 - hs.height / 2;
                this.highScoreStamp = new StampEffect(
                    hs, Math.floor(BASE_W / 2), cy, 0, hs.width, null);
            }
        } else if (f === this.BADGES_TRIGGER && !this.badgesStamp) {
            const btn = this.assets.getButton("achievements");
            if (btn) {
                const bw = Math.min(BADGES_RECT.w, 120);
                this.badgesStamp = new StampEffect(
                    btn, BADGES_RECT.x + BADGES_RECT.w / 2, BADGES_RECT.y + BADGES_RECT.h / 2,
                    5, bw, null);
            }
        } else if (f === this.CODE_TRIGGER && !this.codeStamp) {
            const btn = this._composeCodeButton();
            if (btn) this.codeStamp = new StampEffect(
                btn, CODE_RECT.x + CODE_RECT.w / 2, CODE_RECT.y + CODE_RECT.h / 2,
                0, btn.width, null);
        }

        if (this.titleStamp) this.titleStamp.update();
        if (this.startStamp) this.startStamp.update();
        if (this.helpStamp) this.helpStamp.update();
        if (this.quitStamp) this.quitStamp.update();
        if (this.highScoreStamp) this.highScoreStamp.update();
        if (this.badgesStamp) this.badgesStamp.update();
        if (this.codeStamp) this.codeStamp.update();
    }

    clearTitleStamps() {
        this.titleStamp = null;
        this.startStamp = null;
        this.quitStamp = null;
        this.highScoreStamp = null;
        this.helpStamp = null;
        this.badgesStamp = null;
        this.codeStamp = null;
        this.titleEntranceFrame = 0;
    }

    // --- Help screen (3 dynamic pages) ---

    startHelp() {
        this.helpPage = 0;
        this._helpLayoutCache = {};  // re-layout (sprites may have loaded)
    }

    nextHelpPage() {
        this.helpPage += 1;
        if (this.helpPage >= 7) {
            this.helpPage = 0;
            return false;
        }
        return true;
    }

    _drawHelpTitleSprite() {
        // Small title sprite, centred at top — smaller than the title
        // screen so it reads as a header, not the home screen.
        const ctx = this.vctx;
        const title = this.assets.getTitle();
        if (!title) return 55;
        const targetH = 45;
        const scale = targetH / title.height;
        const tw = Math.floor(title.width * scale);
        const th = Math.floor(title.height * scale);
        const x = Math.floor((BASE_W - tw) / 2);
        const y = 12;
        ctx.drawImage(title, x, y, tw, th);
        return y + th + 8;
    }

    _drawHelpTextBlock(text, y, letterH, colour = "purple", gap = 6) {
        // Render a word-wrapped text block in sprite font, centred.
        // Returns the Y position after the block.
        const ctx = this.vctx;
        const surf = this._renderTextColoured(text, BASE_W - 40, colour, letterH, Math.round(letterH * 0.45), 10, true);
        if (surf) {
            ctx.drawImage(surf,
                Math.floor((BASE_W - surf.width) / 2), y);
            return y + surf.height + gap;
        }
        return y + letterH + gap;
    }

    _drawHelpHeading(text, y, gap = 12) {
        return this._drawHelpTextBlock(text, y, 44, "purple", gap);
    }

    _drawHelpBody(text, y, colour = "purple", gap = 8) {
        return this._drawHelpTextBlock(text, y, 34, colour, gap);
    }

    _drawHelpScreen(game) {
        const ctx = this.vctx;
        ctx.imageSmoothingEnabled = true;
        const bg = this.assets.bgSurfs[0] || null;
        if (bg) this._blitCover(bg, this.virtual, BG_DIM);
        else { ctx.fillStyle = BG; ctx.fillRect(0, 0, BASE_W, BASE_H); }

        const topY = this._drawHelpTitleSprite();

        if (this.helpPage < this.HELP_PAGES.length) {
            this._drawHelpDataPage(this.helpPage, topY);
        } else {
            this._drawHelpPage7(game, topY);
        }

        // Page counter at bottom
        const pageText = `PAGE ${this.helpPage + 1} / 7`;
        const pageSurf = this._renderTextColoured(pageText, 200, "gray", 20, 9, 10, true);
        if (pageSurf) {
            ctx.drawImage(pageSurf,
                Math.floor((BASE_W - pageSurf.width) / 2),
                BASE_H - 40);
        }

        // Click-to-continue (top-right, same as badges screen)
        const clickBtn = this.assets.getButton("CLICK_TO_CONTINUE");
        if (clickBtn) {
            const [scaled, rect] = this._scaleToFit(clickBtn, BADGES_CONTINUE_RECT);
            if (scaled) ctx.drawImage(scaled, rect.x, rect.y, rect.w, rect.h);
        } else {
            ctx.fillStyle = TEXT_DIM;
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Click to continue",
                Math.floor(BADGES_CONTINUE_RECT.x + BADGES_CONTINUE_RECT.w / 2),
                Math.floor(BADGES_CONTINUE_RECT.y + BADGES_CONTINUE_RECT.h / 2));
        }
    }

    // Help pages 1-6 as data.  Each body item is a whole sentence: the
    // sprite-text renderer wraps it across the full width, so lines are
    // filled instead of breaking after 1-3 words.  "pair" puts a coloured
    // word and its meaning on one line.  "sprite" is a button image.
    HELP_PAGES = [
        [
            { t: "heading", text: "HOW TO PLAY" },
            { t: "body", text: "GUESS THE HIDDEN WORD. 5 LETTERS, 6 TRIES." },
            { t: "gap" },
            { t: "body", colour: "green", text: "GREEN - RIGHT LETTER, RIGHT SPOT" },
            { t: "body", colour: "orange", text: "ORANGE - RIGHT LETTER, WRONG SPOT" },
            { t: "body", colour: "gray", text: "GRAY - LETTER NOT IN THE WORD" },
        ],
        [
            { t: "heading", text: "STREAKS" },
            { t: "body", text: "SOLVE WORDS IN A ROW TO BUILD YOUR STREAK." },
            { t: "body", text: "FAIL A WORD AND YOUR STREAK RESETS TO ZERO." },
            { t: "body", text: "YOUR LONGEST STREAK IS YOUR HIGH SCORE." },
        ],
        [
            { t: "heading", text: "HARD MODE" },
            { t: "body", text: "MUST REUSE REVEALED LETTERS IN EVERY GUESS." },
            { t: "body", text: "EARN A POINT EVEN ON THE LAST GUESS." },
            { t: "body", text: "CAN ONLY TURN ON BEFORE THE FIRST GUESS. TURN OFF ANY TIME." },
        ],
        [
            { t: "heading", text: "LAST GUESS" },
            { t: "body", text: "EASY: HINT SHOWN, NO POINT, STREAK KEPT." },
            { t: "body", text: "HARD: NO HINT, POINT EARNED." },
            { t: "heading", text: "CONTROLS" },
            { t: "body", text: "TYPE LETTERS, ENTER TO SUBMIT, BACKSPACE TO DELETE, ESC FOR TITLE." },
        ],
        [
            { t: "heading", text: "SAVE CODE" },
            { t: "body", text: "YOUR PROGRESS SAVES AUTOMATICALLY." },
            { t: "body", text: "OPEN" },
            { t: "sprite", name: "code" },
            { t: "body", text: "TO VIEW YOUR CODE. COPY IT TO KEEP YOUR PROGRESS SAFE." },
            { t: "body", text: "LOADING A CODE OVERWRITES YOUR SAVE." },
        ],
        [
            { t: "heading", text: "BADGES" },
            { t: "body", text: "EARN BADGES FOR STREAKS AND DIFFERENT PLAY STYLES. VIEW THEM FROM THE" },
            { t: "sprite", name: "achievements" },
            { t: "body", text: "SCREEN." },
            { t: "body", text: "LOADING MID-SOLVE SKIPS TO THE NEXT WORD BUT KEEPS STREAKS." },
        ],
    ];

    // Lay out one help page at a given body letter height.  Returns a list
    // of {surf, h} rows (null surf = blank gap) and the total height.
    _layoutHelpPage(items, bodyH) {
        const headH = Math.round(bodyH * 1.3);
        const maxW = BASE_W - 40;
        const lineGap = Math.max(4, Math.round(bodyH * 0.3));
        const paraGap = Math.round(bodyH * 0.6);
        const spaceW = Math.max(6, Math.round(bodyH * 0.45));
        const rows = [];
        let total = 0;
        const add = (surf, h, gapAfter) => {
            rows.push({ surf, h, gapAfter });
            total += h + gapAfter;
        };
        for (const it of items) {
            if (it.t === "heading") {
                const s = this._renderTextColoured(it.text, maxW, "purple", headH, spaceW, lineGap, true);
                if (s) add(s, s.height, paraGap);
            } else if (it.t === "body") {
                const s = this._renderTextColoured(it.text, maxW, it.colour || "gray", bodyH, spaceW, lineGap, true);
                if (s) add(s, s.height, paraGap);
            } else if (it.t === "gap") {
                add(null, 0, paraGap);
            } else if (it.t === "pair") {
                const w = this._renderTextColoured(it.word, maxW, it.colour, bodyH, spaceW, lineGap, true);
                const restW = w ? maxW - w.width - spaceW * 2 : maxW;
                const r = this._renderTextColoured(it.text, restW, "purple", bodyH, spaceW, lineGap, true);
                if (w && r && r.height === bodyH) {
                    // Both fit on one line: join them
                    const c = document.createElement("canvas");
                    c.width = w.width + spaceW * 2 + r.width;
                    c.height = bodyH;
                    const cctx = c.getContext("2d");
                    cctx.drawImage(w, 0, 0);
                    cctx.drawImage(r, w.width + spaceW * 2, 0);
                    add(c, c.height, paraGap);
                } else {
                    if (w) add(w, w.height, lineGap);
                    const r2 = this._renderTextColoured(it.text, maxW, "purple", bodyH, spaceW, lineGap, true);
                    if (r2) add(r2, r2.height, paraGap);
                }
            } else if (it.t === "sprite") {
                let spr = null;
                if (it.name === "code") spr = this._composeCodeButton();
                else spr = this.assets.getButton(it.name);
                if (spr) {
                    const sh = Math.round(bodyH * 1.2);
                    const sw = Math.floor(spr.width * sh / spr.height);
                    const c = document.createElement("canvas");
                    c.width = Math.max(1, sw); c.height = sh;
                    c.getContext("2d").drawImage(spr, 0, 0, sw, sh);
                    add(c, sh, lineGap);
                }
            }
        }
        if (rows.length) total -= rows[rows.length - 1].gapAfter;
        return { rows, total };
    }

    // Draw a help page, shrinking the text until it fits between the
    // title sprite and the page counter.  Layout is cached per page.
    _drawHelpDataPage(pageIndex, topY) {
        const ctx = this.vctx;
        const top = topY + 16;
        const bottom = BASE_H - 50;   // keep clear of "PAGE n / 7"
        const avail = bottom - top;
        if (!this._helpLayoutCache) this._helpLayoutCache = {};
        let lay = this._helpLayoutCache[pageIndex];
        if (!lay) {
            const items = this.HELP_PAGES[pageIndex];
            for (let bodyH = 34; bodyH >= 16; bodyH -= 2) {
                lay = this._layoutHelpPage(items, bodyH);
                if (lay.total <= avail) break;
            }
            this._helpLayoutCache[pageIndex] = lay;
        }
        // Centre the block vertically in the free space
        let y = top + Math.max(0, Math.floor((avail - lay.total) / 2));
        for (const row of lay.rows) {
            if (row.surf) {
                ctx.drawImage(row.surf, Math.floor((BASE_W - row.surf.width) / 2), y);
            }
            y += row.h + row.gapAfter;
        }
    }

    _drawHelpPage7(game, topY) {
        // Page 7: Current Streaks (larger counters)
        const ctx = this.vctx;
        let y = topY + 20;

        y = this._drawHelpHeading("CURRENT STREAKS", y, 24);

        // 5 counters: text sprite on left, "Current: N" on right
        const counters = [
            { sprite: "Streak",              value: game.getStreak() },
            { sprite: "hard_mode_master",    value: game.state.currentHardStreak },
            { sprite: "skin_of_your_teeth",   value: game.state.currentLastGuessStreak },
            { sprite: "perfect_streak",       value: game.state.currentFastSolveStreak },
            { sprite: "no_hints_needed",      value: game.state.totalNoHintSolves, label: "TOTAL" },
        ];

        const spriteH = 56;  // Increased from 30px
        const rowGap = 20;   // Increased from 10px
        const valueTextH = 32;  // Increased from 18px

        for (const c of counters) {
            const spr = this.assets.getFanfareText(c.sprite);
            if (spr) {
                const scale = spriteH / spr.height;
                const sw = Math.floor(spr.width * scale);
                const sh = Math.floor(spr.height * scale);
                ctx.drawImage(spr, 30, y, sw, sh);
            }
            // "Current: N" on the right side
            const valueText = `${c.label || "CURRENT"}: ${c.value}`;
            const valSurf = this._renderTextColoured(valueText, 320, "gray", valueTextH, 12, 10, true);
            if (valSurf) {
                ctx.drawImage(valSurf,
                    BASE_W - 30 - valSurf.width,
                    y + Math.floor((spriteH - valSurf.height) / 2));
            }
            y += spriteH + rowGap;
        }
    }

    // --- Gameplay ---

    _drawGameplay(game, inputBuffer = "") {
        const ctx = this.vctx;
        ctx.imageSmoothingEnabled = true;
        if (this.currentBg) this._blitCover(this.currentBg, this.virtual, BG_DIM);
        else { ctx.fillStyle = BG; ctx.fillRect(0, 0, BASE_W, BASE_H); }
        this._drawAmbient();
        this._drawScore(game);
        this._drawHardButton(game);
        this._drawMenuButton(game);
        this._drawHint(game);
        this._drawGrid(game, inputBuffer);
        if (this._showTapSquare()) {
            if (this._tapSquareVisible()) this._drawTapSquare();
        } else {
            this._drawKeyboard(game);
        }
        this._drawParticles();
        this._drawMessage();
    }

    _drawScore(game) {
        const streak = game.getStreak();
        const best = game.getHighScore();
        const areaX = 0, areaW = GRID_LEFT, areaH = GRID_TOP;
        const rowH = Math.floor(areaH / 2);
        this._drawScoreStacked("HIGH_SCORE_sprite", best, areaX, 0, areaW, rowH, true);
        this._drawScoreStacked("CURRENT_Sprite", streak, areaX, rowH, areaW, rowH, false);
    }

    _drawScoreStacked(spriteName, value, x, y, w, h, useHsDigits) {
        const ctx = this.vctx;
        const titleH = Math.floor(h * 0.58);
        const numH = Math.floor(h * 0.38);
        const numY = y + titleH + 2;
        const label = this.assets.getButton(spriteName);
        if (label) {
            const lw = label.width, lh = label.height;
            const scale = Math.min(w / lw, titleH / lh);
            const sw = Math.max(1, Math.floor(lw * scale));
            const sh = Math.max(1, Math.floor(lh * scale));
            ctx.drawImage(label, Math.floor(x + (w - sw) / 2), y, sw, sh);
        } else {
            ctx.fillStyle = TEXT_BRIGHT;
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "alphabetic";
            ctx.fillText(spriteName.replace("_Sprite", "").replace("_sprite", "").replace(/_/g, " "),
                Math.floor(x + w / 2), Math.floor(y + titleH / 2));
        }
        const digits = useHsDigits ? this._hsDigitsToSurfs(value) : this._digitsToSurfs(value);
        if (digits.length > 0) {
            let totalW = 0;
            const scaled = digits.map(d => {
                const scale = numH / d.height;
                const dw = Math.max(1, Math.floor(d.width * scale));
                totalW += dw + 2;
                return [d, dw];
            });
            totalW -= 2;
            let dx = Math.floor(x + (w - totalW) / 2);
            for (const [d, dw] of scaled) {
                ctx.drawImage(d, dx, numY, dw, numH);
                dx += dw + 2;
            }
        } else {
            ctx.fillStyle = TEXT_BRIGHT;
            ctx.font = "bold 18px Arial";
            ctx.textAlign = "center";
            ctx.fillText(String(value), Math.floor(x + w / 2), Math.floor(numY + numH / 2));
        }
    }

    _digitsToSurfs(value) {
        if (!this.assets.hasDigits()) return [];
        const result = [];
        for (const ch of String(value)) {
            const d = this.assets.getDigit(parseInt(ch));
            if (d) result.push(d);
            else return [];
        }
        return result;
    }

    _hsDigitsToSurfs(value) {
        if (!this.assets.hasHsDigits()) return this._digitsToSurfs(value);
        const result = [];
        for (const ch of String(value)) {
            const d = this.assets.getHsDigit(parseInt(ch));
            if (d) result.push(d);
            else return this._digitsToSurfs(value);
        }
        return result;
    }

    _drawHardButton(game) {
        const ctx = this.vctx;
        const hardOn = game.isHardMode();
        const btn = this.assets.getButton("Says_Hard");
        const hs = this._hoverExtra("hard");
        if (btn) {
            const [scaled, rect] = this._scaleToFit(btn, { x: HARD_BTN_X, y: HARD_BTN_Y, w: HARD_BTN_W, h: HARD_BTN_H });
            if (scaled) {
                let img = scaled;
                let r = rect;
                if (hs !== 1.0) {
                    const sw = Math.floor(scaled.width * hs);
                    const sh = Math.floor(scaled.height * hs);
                    const tmp = document.createElement("canvas");
                    tmp.width = sw; tmp.height = sh;
                    tmp.getContext("2d").drawImage(scaled, 0, 0, sw, sh);
                    img = tmp;
                    r = { x: Math.floor(HARD_BTN_X + HARD_BTN_W / 2 - sw / 2),
                          y: Math.floor(HARD_BTN_Y + HARD_BTN_H / 2 - sh / 2),
                          w: sw, h: sh };
                }
                if (hardOn) {
                    ctx.drawImage(img, r.x, r.y);
                } else {
                    ctx.globalAlpha = 0.31;
                    ctx.drawImage(img, r.x, r.y);
                    ctx.globalAlpha = 1.0;
                }
            }
        } else {
            const colour = hardOn ? GREEN_BG : "#3c3c3c";
            ctx.fillStyle = colour;
            this._roundRect(ctx, HARD_BTN_X, HARD_BTN_Y, HARD_BTN_W, HARD_BTN_H, 4);
            ctx.fill();
            ctx.strokeStyle = WHITE;
            ctx.lineWidth = 1;
            this._roundRect(ctx, HARD_BTN_X, HARD_BTN_Y, HARD_BTN_W, HARD_BTN_H, 4);
            ctx.stroke();
            ctx.fillStyle = WHITE;
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(hardOn ? "Hard: ON" : "Hard: OFF",
                Math.floor(HARD_BTN_X + HARD_BTN_W / 2),
                Math.floor(HARD_BTN_Y + HARD_BTN_H / 2));
        }
    }

    _drawMenuButton(game) {
        const ctx = this.vctx;
        const btn = this.assets.getButton("Main_Menu");
        const hs = this._hoverExtra("menu");
        // Lift with the grid on touch devices so the menu button clears the
        // native keyboard. 0 on desktop (lift == 0).
        const menuY = MENU_BTN_Y - this._gridLift();
        if (btn) {
            const [scaled, rect] = this._scaleToFit(btn, { x: MENU_BTN_X, y: menuY, w: MENU_BTN_W, h: MENU_BTN_H });
            if (scaled) {
                if (hs !== 1.0) {
                    const sw = Math.floor(scaled.width * hs);
                    const sh = Math.floor(scaled.height * hs);
                    const tmp = document.createElement("canvas");
                    tmp.width = sw; tmp.height = sh;
                    tmp.getContext("2d").drawImage(scaled, 0, 0, sw, sh);
                    ctx.drawImage(tmp, Math.floor(MENU_BTN_X + MENU_BTN_W / 2 - sw / 2),
                        Math.floor(menuY + MENU_BTN_H / 2 - sh / 2), sw, sh);
                } else {
                    ctx.drawImage(scaled, rect.x, rect.y);
                }
            }
        } else {
            ctx.fillStyle = "#3c3c3c";
            this._roundRect(ctx, MENU_BTN_X, menuY, MENU_BTN_W, MENU_BTN_H, 4);
            ctx.fill();
            ctx.strokeStyle = WHITE;
            ctx.lineWidth = 1;
            this._roundRect(ctx, MENU_BTN_X, menuY, MENU_BTN_W, MENU_BTN_H, 4);
            ctx.stroke();
            ctx.fillStyle = WHITE;
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText("MENU", Math.floor(MENU_BTN_X + MENU_BTN_W / 2),
                Math.floor(menuY + MENU_BTN_H / 2));
        }
    }

    _drawHint(game) {
        const guessCount = game.getGuessCount();
        if (guessCount !== MAX_GUESSES - 1) return;
        const definition = game.getDefinition();
        if (!definition) return;
        const ctx = this.vctx;
        const hintSurf = this._renderTextColoured(definition, HINT_W, "red", 18, 6, 4);
        if (!hintSurf) return;
        if (game.isHardMode()) ctx.globalAlpha = 0;
        else ctx.globalAlpha = 1;
        ctx.drawImage(hintSurf,
            Math.floor(HINT_LEFT + HINT_W / 2 - hintSurf.width / 2),
            Math.floor(HINT_Y + HINT_H / 2 - hintSurf.height / 2));
        ctx.globalAlpha = 1;
    }

    _drawGrid(game, inputBuffer = "") {
        const ctx = this.vctx;
        const history = game.getGuessHistory();
        const guessCount = game.getGuessCount();
        const flashing = this._isFlashing();
        const lift = this._gridLift();
        for (let row = 0; row < 6; row++) {
            for (let col = 0; col < 5; col++) {
                const x = GRID_LEFT + col * (TILE_SIZE + TILE_GAP);
                const y = GRID_TOP - lift + row * (TILE_SIZE + TILE_GAP);
                if (row < guessCount) {
                    const { word, colours } = history[row];
                    const letter = word[col];
                    const spriteColour = GAME_COLOUR_TO_SPRITE[colours[col]] || "purple";
                    this._drawTileSprite(x, y, letter, spriteColour, true);
                } else if (row === guessCount) {
                    if (col < inputBuffer.length) {
                        const letter = inputBuffer[col];
                        const border = flashing ? FLASH_COLOUR : FILLED_BORDER;
                        this._drawTileSprite(x, y, letter, "teal", false, border);
                    } else {
                        const border = flashing ? FLASH_COLOUR : EMPTY_BORDER;
                        this._drawTile(x, y, "", BG, border, false);
                    }
                } else {
                    this._drawTile(x, y, "", EMPTY_BORDER, EMPTY_BORDER, false, EMPTY_TILE_ALPHA);
                }
            }
        }
    }

    _drawTileSprite(x, y, letter, spriteColour, filled = false, border = null) {
        const ctx = this.vctx;
        const bg = filled ? this._spriteColourBg(spriteColour) : BG;
        ctx.fillStyle = bg;
        this._roundRect(ctx, x, y, TILE_SIZE, TILE_SIZE, 4);
        ctx.fill();
        if (!filled) {
            ctx.strokeStyle = border || EMPTY_BORDER;
            ctx.lineWidth = 2;
            this._roundRect(ctx, x, y, TILE_SIZE, TILE_SIZE, 4);
            ctx.stroke();
        }
        if (letter) {
            const lsurf = this.assets.getLetter(spriteColour, letter);
            if (lsurf) {
                ctx.drawImage(lsurf,
                    Math.floor(x + TILE_SIZE / 2 - lsurf.width / 2),
                    Math.floor(y + TILE_SIZE / 2 - lsurf.height / 2));
            } else {
                ctx.fillStyle = WHITE;
                ctx.font = "bold 28px Arial";
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
                ctx.fillText(letter, Math.floor(x + TILE_SIZE / 2), Math.floor(y + TILE_SIZE / 2));
            }
        }
    }

    _drawTile(x, y, letter, bg, border, filled = false, alpha = 1.0) {
        const ctx = this.vctx;
        if (alpha < 1.0) ctx.globalAlpha = alpha;
        ctx.fillStyle = bg;
        this._roundRect(ctx, x, y, TILE_SIZE, TILE_SIZE, 4);
        ctx.fill();
        if (!filled) {
            ctx.strokeStyle = border;
            ctx.lineWidth = 2;
            this._roundRect(ctx, x, y, TILE_SIZE, TILE_SIZE, 4);
            ctx.stroke();
        }
        if (letter) {
            ctx.fillStyle = WHITE;
            ctx.font = "bold 28px Arial";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(letter, Math.floor(x + TILE_SIZE / 2), Math.floor(y + TILE_SIZE / 2));
        }
        ctx.globalAlpha = 1.0;
    }

    _scaleToFit(surf, targetRect, padding = 2) {
        if (!surf) return [null, null];
        const [sw, sh] = [surf.width, surf.height];
        const tw = targetRect.w - padding * 2;
        const th = targetRect.h - padding * 2;
        const scale = Math.min(tw / sw, th / sh);
        if (scale >= 1) {
            return [surf, { x: Math.floor(targetRect.x + targetRect.w / 2 - sw / 2),
                           y: Math.floor(targetRect.y + targetRect.h / 2 - sh / 2),
                           w: sw, h: sh }];
        }
        const nw = Math.max(1, Math.floor(sw * scale));
        const nh = Math.max(1, Math.floor(sh * scale));
        // Return an actually-scaled canvas (matches pygame smoothscale), so
        // callers that draw it at its own size get the fitted size.
        const scaled = this._smoothScale(surf, nw, nh);
        return [scaled, { x: Math.floor(targetRect.x + targetRect.w / 2 - nw / 2),
                          y: Math.floor(targetRect.y + targetRect.h / 2 - nh / 2),
                          w: nw, h: nh }];
    }

    _smoothScale(surf, w, h) {
        const c = document.createElement("canvas");
        c.width = Math.max(1, Math.floor(w));
        c.height = Math.max(1, Math.floor(h));
        const cctx = c.getContext("2d");
        cctx.imageSmoothingEnabled = true;
        cctx.imageSmoothingQuality = "high";
        cctx.drawImage(surf, 0, 0, c.width, c.height);
        return c;
    }

    _spriteColourBg(name) {
        switch (name) {
            case "green": return GREEN_BG;
            case "orange": return ORANGE_BG;
            case "gray": return GRAY_BG_C;
            case "teal": return TEAL_BG;
            case "purple": return PURPLE_BG;
            default: return BG;
        }
    }

    _drawKeyboard(game) {
        const ctx = this.vctx;
        const hardMode = game && game.isHardMode();
        for (const [label, rect] of this.keyRects) {
            const colourName = this.keyColours[label];
            let spriteColour;
            if (colourName === undefined) {
                spriteColour = hardMode ? "purple" : "teal";
            } else {
                spriteColour = GAME_COLOUR_TO_SPRITE[colourName] || "teal";
            }
            const hs = this._hoverExtra(label);
            if (label === "BACK") {
                const btn = this.assets.getButton("Says_Back");
                if (btn) {
                    const [scaled, srect] = this._scaleToFit(btn, rect);
                    if (scaled) {
                        if (hs !== 1.0) {
                            const sw = Math.floor(scaled.width * hs);
                            const sh = Math.floor(scaled.height * hs);
                            const tmp = document.createElement("canvas");
                            tmp.width = sw; tmp.height = sh;
                            tmp.getContext("2d").drawImage(scaled, 0, 0, sw, sh);
                            ctx.drawImage(tmp, Math.floor(rect.x + rect.w / 2 - sw / 2),
                                Math.floor(rect.y + rect.h / 2 - sh / 2), sw, sh);
                        } else {
                            ctx.drawImage(scaled, srect.x, srect.y, srect.w, srect.h);
                        }
                    }
                } else {
                    ctx.fillStyle = KEY_BG_COLOUR;
                    this._roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
                    ctx.fill();
                    ctx.fillStyle = KEY_TEXT;
                    ctx.font = "bold 14px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("BACK", Math.floor(rect.x + rect.w / 2), Math.floor(rect.y + rect.h / 2));
                }
            } else if (label === "ENTER") {
                const btn = this.assets.getButton("Says_enter");
                if (btn) {
                    const [scaled, srect] = this._scaleToFit(btn, rect);
                    if (scaled) {
                        if (hs !== 1.0) {
                            const sw = Math.floor(scaled.width * hs);
                            const sh = Math.floor(scaled.height * hs);
                            const tmp = document.createElement("canvas");
                            tmp.width = sw; tmp.height = sh;
                            tmp.getContext("2d").drawImage(scaled, 0, 0, sw, sh);
                            ctx.drawImage(tmp, Math.floor(rect.x + rect.w / 2 - sw / 2),
                                Math.floor(rect.y + rect.h / 2 - sh / 2), sw, sh);
                        } else {
                            ctx.drawImage(scaled, srect.x, srect.y, srect.w, srect.h);
                        }
                    }
                } else {
                    ctx.fillStyle = KEY_BG_COLOUR;
                    this._roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
                    ctx.fill();
                    ctx.fillStyle = KEY_TEXT;
                    ctx.font = "bold 14px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText("ENTER", Math.floor(rect.x + rect.w / 2), Math.floor(rect.y + rect.h / 2));
                }
            } else {
                const bg = this._keyBg(colourName, hardMode);
                if (bg) {
                    const [r2, g2, b2] = this._hexToRgb(bg);
                    ctx.fillStyle = `rgba(${r2},${g2},${b2},${KEY_ALPHA})`;
                    this._roundRect(ctx, rect.x, rect.y, rect.w, rect.h, 4);
                    ctx.fill();
                }
                const lsurf = this.assets.getLetter(spriteColour, label);
                if (lsurf) {
                    if (hs !== 1.0) {
                        const lw = Math.floor(lsurf.width * hs);
                        const lh = Math.floor(lsurf.height * hs);
                        ctx.drawImage(lsurf,
                            Math.floor(rect.x + rect.w / 2 - lw / 2),
                            Math.floor(rect.y + rect.h / 2 - lh / 2), lw, lh);
                    } else {
                        ctx.drawImage(lsurf,
                            Math.floor(rect.x + rect.w / 2 - lsurf.width / 2),
                            Math.floor(rect.y + rect.h / 2 - lsurf.height / 2));
                    }
                } else {
                    ctx.fillStyle = KEY_TEXT;
                    ctx.font = "bold 18px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(label, Math.floor(rect.x + rect.w / 2), Math.floor(rect.y + rect.h / 2));
                }
            }
        }
    }

    _keyBg(colourName, hardMode = false) {
        if (colourName === "green") return KEY_GREEN;
        if (colourName === "yellow") return KEY_ORANGE;
        if (colourName === "gray") return null;
        return null;
    }

    _hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return [r, g, b];
    }

    _drawMessage() {
        if (this.message && this.messageTimer > 0) {
            const ctx = this.vctx;
            // Render in red sprite font (matches hint text + INVALID CODE)
            const surf = this._renderTextColoured(this.message, BASE_W - 80, "red", 20);
            if (!surf) return;
            const cx = Math.floor(BASE_W / 2);
            // Normally the toast sits at the bottom. When the UI is pinned to
            // the top for the native keyboard, the bottom is behind the
            // keyboard, so draw it just above the guess grid instead (top
            // region, always visible).
            const cy = this.pinTopForKeyboard
                ? Math.max(Math.floor(surf.height / 2) + 6, GRID_TOP - this._gridLift() - 18)
                : BASE_H - 25;
            // Dark rounded background behind the text
            const padX = 12, padY = 6;
            ctx.fillStyle = "#282828";
            this._roundRect(ctx,
                cx - Math.floor(surf.width / 2) - padX,
                cy - Math.floor(surf.height / 2) - padY,
                surf.width + padX * 2,
                surf.height + padY * 2, 4);
            ctx.fill();
            // Sprite text centred
            ctx.drawImage(surf,
                cx - Math.floor(surf.width / 2),
                cy - Math.floor(surf.height / 2));
        }
    }

    // --- Reveal overlay ---

    RED_FONT_FALLBACK = [200, 40, 40];
    PURPLE_FONT_FALLBACK = [140, 80, 200];
    REVEAL_MODES = {
        solved: { sprite: "red", fallback: [200, 40, 40] },
        failed: { sprite: "purple", fallback: [140, 80, 200] },
        purple: { sprite: "purple", fallback: [140, 80, 200] },
        teal:   { sprite: "teal", fallback: [40, 170, 170] },
        red:    { sprite: "red", fallback: [200, 40, 40] },
        green:  { sprite: "green", fallback: [83, 141, 78] },
        orange: { sprite: "orange", fallback: [201, 122, 56] },
        gray:   { sprite: "gray", fallback: [120, 120, 120] },
    };

    // Ink bounds of a letter sprite: blank columns on the left and right.
    // Every letter sits in a fixed-width cell, so narrow letters (I, L)
    // carry a lot of empty space.  Cached per sprite.
    _glyphInk(lsurf) {
        if (!this._glyphInkCache) this._glyphInkCache = new WeakMap();
        let ink = this._glyphInkCache.get(lsurf);
        if (ink) return ink;
        const w = lsurf.width, h = lsurf.height;
        let left = 0, right = 0;
        try {
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            const cx = c.getContext("2d");
            cx.drawImage(lsurf, 0, 0);
            const d = cx.getImageData(0, 0, w, h).data;
            let L = w, R = -1;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (d[(y * w + x) * 4 + 3] > 20) {
                        if (x < L) L = x;
                        if (x > R) R = x;
                    }
                }
            }
            if (R >= L) { left = L; right = w - 1 - R; }
        } catch (e) { /* unreadable image: no trim */ }
        ink = { left, right };
        this._glyphInkCache.set(lsurf, ink);
        return ink;
    }

    // tight = true: trim each letter to its ink and overlap neighbours
    // slightly (used by the Help screen).  Other screens keep the
    // original spacing.
    _renderTextColoured(text, maxWidth, colour = "red",
                         letterH = 28, spaceW = 12, lineGap = 10, tight = false) {
        const mode = this.REVEAL_MODES[colour] || this.REVEAL_MODES["solved"];
        const spriteName = mode.sprite;
        const fallbackColour = mode.fallback;
        text = text.toUpperCase();
        const words = text.split(" ").filter(w => w.length > 0);
        if (!words.length) return null;
        const wordSurfs = [];
        for (const word of words) {
            const glyphs = [];
            for (const ch of word) {
                if (tight && /[0-9]/.test(ch)) {
                    // Number sprites (Number Sprites.png), trimmed to ink
                    const dsurf = this.assets.getDigit(parseInt(ch));
                    if (dsurf) {
                        const ink = this._glyphInk(dsurf);
                        const srcX = ink.left;
                        const srcW = Math.max(1, dsurf.width - ink.left - ink.right);
                        const sw = Math.max(1, Math.floor(srcW * letterH / dsurf.height));
                        const tmp = document.createElement("canvas");
                        tmp.width = sw; tmp.height = letterH;
                        const tctx = tmp.getContext("2d");
                        tctx.imageSmoothingEnabled = false;
                        tctx.drawImage(dsurf, srcX, 0, srcW, dsurf.height, 0, 0, sw, letterH);
                        glyphs.push(tmp);
                        continue;
                    }
                }
                if (/[A-Z]/.test(ch)) {
                    const lsurf = this.assets.getLetter(spriteName, ch);
                    if (lsurf) {
                        const scale = letterH / lsurf.height;
                        let srcX = 0, srcW = lsurf.width;
                        if (tight) {
                            const ink = this._glyphInk(lsurf);
                            srcX = ink.left;
                            srcW = Math.max(1, lsurf.width - ink.left - ink.right);
                        }
                        const sw = Math.max(1, Math.floor(srcW * scale));
                        const tmp = document.createElement("canvas");
                        tmp.width = sw; tmp.height = letterH;
                        const tctx = tmp.getContext("2d");
                        tctx.imageSmoothingEnabled = false;  // desktop: transform.scale
                        tctx.drawImage(lsurf, srcX, 0, srcW, lsurf.height, 0, 0, sw, letterH);
                        glyphs.push(tmp);
                        continue;
                    }
                }
                const tmp = document.createElement("canvas");
                const tctx = tmp.getContext("2d");
                tctx.font = `bold ${letterH}px Arial`;
                const m = tctx.measureText(ch);
                tmp.width = Math.max(1, Math.ceil(m.width));
                tmp.height = letterH;
                tctx.font = `bold ${letterH}px Arial`;
                tctx.fillStyle = `rgb(${fallbackColour.join(",")})`;
                tctx.textBaseline = "top";
                tctx.fillText(ch, 0, 0);
                glyphs.push(tmp);
            }
            if (glyphs.length) {
                // Tight mode: letters overlap by a small amount
                const overlap = tight ? Math.max(1, Math.round(letterH * 0.06)) : 0;
                const wordW = glyphs.reduce((s, g) => s + g.width, 0)
                    - overlap * (glyphs.length - 1);
                const ws = document.createElement("canvas");
                ws.width = Math.max(1, wordW); ws.height = letterH;
                const wctx = ws.getContext("2d");
                let gx = 0;
                for (const g of glyphs) {
                    wctx.drawImage(g, gx, 0);
                    gx += g.width - overlap;
                }
                wordSurfs.push(ws);
            }
        }
        if (!wordSurfs.length) return null;
        const lines = [];
        let currentLine = [];
        let currentW = 0;
        for (const ws of wordSurfs) {
            const ww = ws.width;
            if (currentLine.length > 0 && currentW + spaceW + ww > maxWidth) {
                lines.push(currentLine);
                currentLine = [ws];
                currentW = ww;
            } else {
                if (currentLine.length > 0) currentW += spaceW;
                currentLine.push(ws);
                currentW += ww;
            }
        }
        if (currentLine.length) lines.push(currentLine);
        const lineH = letterH + lineGap;
        const totalH2 = lines.length * lineH - lineGap;
        let maxLineW = 0;
        for (const line of lines) {
            const lw = line.reduce((s, ws) => s + ws.width, 0) + spaceW * (line.length - 1);
            if (lw > maxLineW) maxLineW = lw;
        }
        const result = document.createElement("canvas");
        result.width = maxLineW; result.height = totalH2;
        const rctx = result.getContext("2d");
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const lw = line.reduce((s, ws) => s + ws.width, 0) + spaceW * (line.length - 1);
            let x = Math.floor((maxLineW - lw) / 2);
            const y = i * lineH;
            for (const ws of line) {
                rctx.drawImage(ws, x, y);
                x += ws.width + spaceW;
            }
        }
        return result;
    }

    _drawReveal(game) {
        const ctx = this.vctx;
        const mode = this.revealMode;
        const isFailed = mode === "failed";
        const colour = isFailed ? "purple" : "red";
        this._drawGameplay(game, "");
        ctx.fillStyle = isFailed ? "rgba(140,20,20,0.94)" : "rgba(0,0,0,0.94)";
        ctx.fillRect(0, 0, BASE_W, BASE_H);
        if (!isFailed) this._drawParticles();
        const answer = game.getAnswer();
        const wordSurf = this._renderTextColoured(answer, BASE_W - 40, colour, 48);
        if (wordSurf) {
            ctx.drawImage(wordSurf,
                Math.floor(BASE_W / 2 - wordSurf.width / 2),
                Math.floor(BASE_H / 2 - 70 - wordSurf.height / 2));
        }
        const definition = game.getDefinition();
        if (definition) {
            const defSurf = this._renderTextColoured(definition, BASE_W - 60, colour, 26);
            if (defSurf) {
                ctx.drawImage(defSurf,
                    Math.floor(BASE_W / 2 - defSurf.width / 2),
                    Math.floor(BASE_H / 2 + 30 - defSurf.height / 2));
            }
        }
        const clickBtn = this.assets.getButton("CLICK_TO_CONTINUE");
        if (clickBtn) {
            const [scaled, rect] = this._scaleToFit(clickBtn,
                { x: 0, y: BASE_H - 100, w: BASE_W, h: 80 });
            if (scaled) ctx.drawImage(scaled, rect.x, rect.y, rect.w, rect.h);
        } else {
            ctx.fillStyle = TEXT_DIM;
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Click to continue", Math.floor(BASE_W / 2), BASE_H - 40);
        }
        if (this.stampEffect) this.stampEffect.draw(ctx);
    }

    // --- Message and flash ---

    setMessage(text, duration = 120) {
        this.message = text;
        this.messageTimer = duration;
    }
    tickMessage() { if (this.messageTimer > 0) this.messageTimer -= 1; }
    setFlash(duration = FLASH_DURATION) { this.flashTimer = duration; }
    tickFlash() { if (this.flashTimer > 0) this.flashTimer -= 1; }
    _isFlashing() {
        if (this.flashTimer <= 0) return false;
        const elapsed = FLASH_DURATION - this.flashTimer;
        return elapsed % 30 < 15;
    }

    // --- Particles ---

    spawnConfetti() {
        for (let i = 0; i < 60; i++) {
            this.particles.push(new Particle(
                Math.random() * BASE_W, Math.random() * 35 - 40,
                Math.random() * 3 - 1.5, Math.random() * 2 + 1,
                CONFETTI_COLOURS[Math.floor(Math.random() * CONFETTI_COLOURS.length)],
                Math.floor(Math.random() * 80) + 120, 0.04,
                Math.floor(Math.random() * 4) + 5,
                Math.floor(Math.random() * 4) + 5,
                Math.floor(Math.random() * 2) + 2,
                Math.random() * 360, Math.random() * 16 - 8));
        }
    }

    spawnFireworks() {
        for (let i = 0; i < 4; i++) {
            const cx = Math.floor(Math.random() * (BASE_W - 160) + 80);
            const cy = Math.floor(Math.random() * 220 + 80);
            const colour = FIREWORK_COLOURS[Math.floor(Math.random() * FIREWORK_COLOURS.length)];
            for (let j = 0; j < 35; j++) {
                const angle = Math.random() * Math.PI * 2;
                const speed = Math.random() * 7 + 3;
                this.particles.push(new Particle(
                    cx, cy, Math.cos(angle) * speed, Math.sin(angle) * speed,
                    colour, Math.floor(Math.random() * 40) + 50, 0.06,
                    Math.floor(Math.random() * 3) + 3));
            }
        }
    }

    tickParticles() {
        for (const p of this.particles) p.update();
        this.particles = this.particles.filter(p => p.isAlive());
    }

    _drawParticles() {
        const ctx = this.vctx;
        for (const p of this.particles) {
            if (!p.isAlive()) continue;
            const ratio = p.life / p.maxLife;
            const c = p.colour.map(ch => Math.floor(ch * ratio));
            ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
            if (p.w !== p.h) {
                ctx.save();
                ctx.translate(Math.floor(p.x), Math.floor(p.y));
                ctx.rotate(p.angle * Math.PI / 180);
                ctx.fillRect(-Math.floor(p.w / 2) - 2, -Math.floor(p.h / 2) - 2, p.w, p.h);
                ctx.restore();
            } else {
                ctx.beginPath();
                ctx.arc(Math.floor(p.x), Math.floor(p.y), p.size, 0, Math.PI * 2);
                ctx.fill();
            }
        }
    }

    // --- Keyboard colours ---

    updateKeyColours(game) {
        for (const { word, colours } of game.getGuessHistory()) {
            for (let i = 0; i < word.length; i++) {
                const letter = word[i];
                const colourName = colours[i];
                const current = this.keyColours[letter];
                if (current === "green") continue;
                if (colourName === "green") this.keyColours[letter] = "green";
                else if (colourName === "yellow" && current !== "green") this.keyColours[letter] = "yellow";
                else if (colourName === "gray" && current === undefined) this.keyColours[letter] = "gray";
            }
        }
    }

    resetKeyColours() { this.keyColours = {}; }

    // --- Hover detection ---

    HOVER_TARGET = 1.08;
    HOVER_EASE = 0.15;

    _updateHover() {
        const [mx, my] = this._windowToLogical([this.mouseX, this.mouseY]);
        this.hoveredButton = null;
        if (mx === null) return;
        if (this.state === "title") {
            if (this.titleEntranceFrame >= this.CODE_TRIGGER) {
                if (this._pointInRect(mx, my, START_RECT)) this.hoveredButton = "start";
                else if (this._pointInRect(mx, my, QUIT_RECT)) this.hoveredButton = "quit";
                else if (this._pointInRect(mx, my, HELP_RECT)) this.hoveredButton = "help";
                else if (this._pointInRect(mx, my, BADGES_RECT)) this.hoveredButton = "badges";
                else if (this._pointInRect(mx, my, CODE_RECT)) this.hoveredButton = "code";
            }
        } else if (this.state === "playing") {
            if (this._pointInRect(mx, my, { x: HARD_BTN_X, y: HARD_BTN_Y, w: HARD_BTN_W, h: HARD_BTN_H }))
                this.hoveredButton = "hard";
            else if (this._pointInRect(mx, my, { x: MENU_BTN_X, y: MENU_BTN_Y - this._gridLift(), w: MENU_BTN_W, h: MENU_BTN_H }))
                this.hoveredButton = "menu";
            else if (this._showTapSquare()) {
                if (this._tapSquareVisible()) {
                    if (this._pointInRect(mx, my, TAP_SQUARE_RECT)) this.hoveredButton = "tap-square";
                    else if (this._pointInRect(mx, my, SHOW_KEYS_RECT)) this.hoveredButton = "show-keys";
                }
            }
            else {
                for (const [label, rect] of this.keyRects) {
                    if (this._pointInRect(mx, my, rect)) {
                        this.hoveredButton = label;
                        break;
                    }
                }
            }
        } else if (this.state === "badges") {
            // whole screen clickable, no button hover
        } else if (this.state === "code") {
            if (this._pointInRect(mx, my, CODE_MENU_RECT)) {
                this.hoveredButton = "code-menu";
            } else if (this._pointInRect(mx, my, CODE_COPY_RECT)) {
                this.hoveredButton = "code-copy";
            } else if (this._pointInRect(mx, my, CODE_PASTE_RECT)) {
                this.hoveredButton = "code-paste";
            } else if (this._showTapSquare()) {
                if (this._tapSquareVisible()) {
                    if (this._pointInRect(mx, my, CODE_TAP_SQUARE_RECT)) this.hoveredButton = "code-tap-square";
                    else if (this._pointInRect(mx, my, CODE_SHOW_KEYS_RECT)) this.hoveredButton = "code-show-keys";
                }
            } else {
                for (const [label, rect] of this.codeKeyRects) {
                    if (this._pointInRect(mx, my, rect)) {
                        this.hoveredButton = label;
                        break;
                    }
                }
            }
        }
    }

    tickHover() {
        const target = this.hoveredButton !== null ? this.HOVER_TARGET : 1.0;
        this.hoverScale += (target - this.hoverScale) * this.HOVER_EASE;
    }

    // --- Click ---

    CLICK_STIFFNESS = 0.22;
    CLICK_DAMPING = 0.28;
    CLICK_SHRINK = 0.92;
    CLICK_GROW = 1.15;

    _setClickDown(button) {
        this.pressedButton = button;
        this.clickButton = button;
        this.clickScale = this.CLICK_SHRINK;
        this.clickVel = 0.0;
        this.clickPhase = "pressed";
    }

    _setClickUp() {
        if (this.pressedButton !== null) {
            this.clickScale = this.CLICK_GROW;
            this.clickVel = 0.0;
            this.clickPhase = "released";
            this.pressedButton = null;
        }
    }

    tickClick() {
        if (this.clickPhase === "pressed") {
            this.clickScale = this.CLICK_SHRINK;
        } else if (this.clickPhase === "released") {
            const target = this.clickButton === this.hoveredButton ? this.HOVER_TARGET : 1.0;
            const force = (target - this.clickScale) * this.CLICK_STIFFNESS;
            this.clickVel += force;
            this.clickVel *= (1.0 - this.CLICK_DAMPING);
            this.clickScale += this.clickVel;
            if (Math.abs(this.clickScale - target) < 0.008 && Math.abs(this.clickVel) < 0.005) {
                this.clickScale = 1.0;
                this.clickVel = 0.0;
                this.clickPhase = "idle";
                this.clickButton = null;
            }
        }
    }

    _hoverExtra(key) {
        if (this.clickButton !== null && this.clickPhase !== "idle" && key === this.clickButton) {
            return this.clickScale;
        }
        if (this.hoveredButton === key) return this.hoverScale;
        return 1.0;
    }

    // --- Input handling (returns action string or null) ---

    handleEvents() {
        if (!this.mouseDown) return null;
        this.mouseDown = false; // consume the click
        const action = this._handleClick(this.clickX, this.clickY);
        if (this.releasePending) {
            this.releasePending = false;
            this._setClickUp();
        }
        return action;
    }

    _handleClick(px, py) {
        const [mx, my] = this._windowToLogical([px, py]);
        if (mx === null) return null;

        {
            if (this.state === "title") {
                if (this._pointInRect(mx, my, START_RECT)) { this._setClickDown("start"); return "start"; }
                if (this._pointInRect(mx, my, QUIT_RECT)) { this._setClickDown("quit"); return "quit"; }
                if (this._pointInRect(mx, my, HELP_RECT)) { this._setClickDown("help"); return "help"; }
                if (this._pointInRect(mx, my, BADGES_RECT)) { this._setClickDown("badges"); return "badges"; }
                if (this._pointInRect(mx, my, CODE_RECT)) { this._setClickDown("code"); return "code"; }
            } else if (this.state === "help") {
                this._setClickDown("help-continue");
                return "continue";
            } else if (this.state === "reveal") {
                this._setClickDown("reveal");
                return "continue";
            } else if (this.state === "fanfare") {
                this._setClickDown("fanfare");
                return "continue";
            } else if (this.state === "badges") {
                this._setClickDown("badges-continue");
                return "badges_continue";
            } else if (this.state === "code") {
                if (this._pointInRect(mx, my, CODE_MENU_RECT)) {
                    this._setClickDown("code-menu");
                    return "code_menu";
                }
                if (this._pointInRect(mx, my, CODE_COPY_RECT)) {
                    this._setClickDown("code-copy");
                    return "code_copy";
                }
                if (this._pointInRect(mx, my, CODE_PASTE_RECT)) {
                    this._setClickDown("code-paste");
                    return "code_paste";
                }
                if (this._showTapSquare()) {
                    if (this._tapSquareVisible()) {
                        if (this._pointInRect(mx, my, CODE_TAP_SQUARE_RECT)) {
                            this._setClickDown("code-tap-square");
                            return "summon_keyboard";
                        }
                        if (this._pointInRect(mx, my, CODE_SHOW_KEYS_RECT)) {
                            this._setClickDown("code-show-keys");
                            return "show_drawn_keys";
                        }
                    }
                    return null;  // native mode: never hit the drawn keys
                }
                for (const [label, rect] of this.codeKeyRects) {
                    if (this._pointInRect(mx, my, rect)) {
                        this._setClickDown(label);
                        if (label === "ENTER") return "code_enter";
                        if (label === "BACK") return "code_back";
                        if (label === "TOGGLE") return "code_toggle";
                        let ch = label;
                        if (!this.codeUppercase && ch.match(/[A-Z]/)) ch = ch.toLowerCase();
                        return ["code_letter", ch];
                    }
                }
            } else if (this.state === "playing") {
                if (this._pointInRect(mx, my, { x: HARD_BTN_X, y: HARD_BTN_Y, w: HARD_BTN_W, h: HARD_BTN_H })) {
                    this._setClickDown("hard");
                    return "toggle_hard";
                }
                if (this._pointInRect(mx, my, { x: MENU_BTN_X, y: MENU_BTN_Y - this._gridLift(), w: MENU_BTN_W, h: MENU_BTN_H })) {
                    this._setClickDown("menu");
                    return "menu";
                }
                if (this._showTapSquare()) {
                    if (this._tapSquareVisible()) {
                        if (this._pointInRect(mx, my, TAP_SQUARE_RECT)) {
                            this._setClickDown("tap-square");
                            return "summon_keyboard";
                        }
                        if (this._pointInRect(mx, my, SHOW_KEYS_RECT)) {
                            this._setClickDown("show-keys");
                            return "show_drawn_keys";
                        }
                    }
                    return null;  // native mode: never hit the drawn keys
                }
                for (const [label, rect] of this.keyRects) {
                    if (this._pointInRect(mx, my, rect)) {
                        this._setClickDown(label);
                        if (label === "ENTER") return "enter";
                        if (label === "BACK") return "back";
                        return ["letter", label];
                    }
                }
            }
        }
        return null;
    }

    // --- Fanfare ---

    _fanfareSpecs(achId) {
        if (achId.startsWith("streak_")) {
            const m = parseInt(achId.split("_")[1]);
            if (m === 2055) return ["Clocked", ["badge", "Clocked"]];
            return ["Streak", ["number", m]];
        }
        return [achId, ["badge", achId]];
    }

    _composeFanfareTitle(achId) {
        const [titleKey] = this._fanfareSpecs(achId);
        const textSurf = this.assets.getFanfareText(titleKey);
        if (!textSurf) return null;
        if (titleKey === "Streak") {
            // "Streak" text + milestone number built from code-glyph digits.
            const m = parseInt(achId.split("_")[1]);
            const targetH = 130;
            const numSurf = this._composeNumberFromGlyphs(m, targetH);
            const tw = textSurf.width, th = textSurf.height;
            const tS = this._smoothScale(textSurf, Math.floor(tw * targetH / th), targetH);
            if (numSurf) {
                const gap = 8;
                const surf = document.createElement("canvas");
                surf.width = tS.width + gap + numSurf.width;
                surf.height = targetH;
                const sctx = surf.getContext("2d");
                sctx.drawImage(tS, 0, 0);
                sctx.drawImage(numSurf, tS.width + gap, 0);
                return surf;
            }
            return tS;
        }
        return textSurf;
    }

    _composeFanfareBadge(achId) {
        const [, badgeSpec] = this._fanfareSpecs(achId);
        if (badgeSpec[0] === "badge") return this.assets.getBadge(badgeSpec[1]);
        if (badgeSpec[0] === "number") return this.assets.getMilestoneNumber(badgeSpec[1]);
        return null;
    }

    startFanfare(achievementIds) {
        this.fanfareQueue = [...achievementIds];
        this.fanfareFrame = 0;
        this._beginFanfare();
    }

    _beginFanfare() {
        if (!this.fanfareQueue.length) {
            this.fanfareTitleStamp = null;
            this.fanfareBadgeStamp = null;
            return false;
        }
        const achId = this.fanfareQueue.shift();
        this.fanfareFrame = 0;
        const titleSurf = this._composeFanfareTitle(achId);
        const badgeSurf = this._composeFanfareBadge(achId);
        if (titleSurf) {
            const tw = Math.min(titleSurf.width, BASE_W - 40);
            this.fanfareTitleStamp = new StampEffect(
                titleSurf, Math.floor(BASE_W / 2), 180, 0, tw, 160);
        } else {
            this.fanfareTitleStamp = null;
        }
        if (badgeSurf) {
            this.fanfareBadgeStamp = new StampEffect(
                badgeSurf, Math.floor(BASE_W / 2), 360,
                (Math.random() * 20) - 10, 90, 90);
        } else {
            this.fanfareBadgeStamp = null;
        }
        this.spawnConfetti();
        this.spawnFireworks();
        return true;
    }

    nextFanfare() {
        this.fanfareTitleStamp = null;
        this.fanfareBadgeStamp = null;
        return this._beginFanfare();
    }

    fanfareDone() {
        return !this.fanfareQueue.length
            && !this.fanfareTitleStamp
            && !this.fanfareBadgeStamp;
    }

    tickFanfare() {
        this.fanfareFrame += 1;
        if (this.fanfareTitleStamp) this.fanfareTitleStamp.update();
        if (this.fanfareBadgeStamp) this.fanfareBadgeStamp.update();
        this.tickParticles();
    }

    _drawFanfare(game) {
        this._drawGameplay(game, "");
        const ctx = this.vctx;
        ctx.fillStyle = "rgba(0,0,0,0.86)";
        ctx.fillRect(0, 0, BASE_W, BASE_H);
        this._drawParticles();
        if (this.fanfareTitleStamp) this.fanfareTitleStamp.draw(ctx);
        if (this.fanfareBadgeStamp && this.fanfareFrame > 10) {
            this.fanfareBadgeStamp.draw(ctx);
        }
        if (this.fanfareFrame > 30) {
            const clickBtn = this.assets.getButton("CLICK_TO_CONTINUE");
            if (clickBtn) {
                const [scaled, rect] = this._scaleToFit(clickBtn,
                    { x: 0, y: BASE_H - 100, w: BASE_W, h: 80 });
                if (scaled) ctx.drawImage(scaled, rect.x, rect.y, rect.w, rect.h);
            } else {
                ctx.fillStyle = TEXT_DIM;
                ctx.font = "14px Arial";
                ctx.textAlign = "center";
                ctx.fillText("Click to continue", Math.floor(BASE_W / 2), BASE_H - 40);
            }
        }
    }

    // --- Badges screen ---

    // 9 badges-screen pages.  Page 9 (12.9): solve_for_seed on
    // RoundIron1 + 3 empty slots for future badges (null = empty:
    // no sticker, no name).
    BADGES_PAGES = [
        [0, ["streak_5", "perfect_streak", "no_hints_needed", "skin_of_your_teeth"]],
        [1, ["first_guess", "hard_earned", "hard_mode_master", "streak_2055"]],
        [2, ["streak_10", "streak_25", "streak_50", "streak_100"]],
        [3, ["streak_150", "streak_200", "streak_300", "streak_400"]],
        [4, ["streak_500", "streak_600", "streak_700", "streak_800"]],
        [5, ["streak_900", "streak_1000", "streak_1100", "streak_1200"]],
        [6, ["streak_1300", "streak_1400", "streak_1500", "streak_1600"]],
        [7, ["streak_1700", "streak_1800", "streak_1900", "streak_2000"]],
        [8, ["solve_for_seed", null, null, null]],
    ];

    startBadges() {
        this.badgesPage = 0;
        this._beginBadgesPage();
    }

    _beginBadgesPage() {
        this.badgesEntranceFrame = 0;
        this.badgesBadgeStamps = [null, null, null, null];
        this.badgesNameStamps = [null, null, null, null];
        this.badgesRotations = [
            Math.random() * 36 - 18,
            Math.random() * 36 - 18,
            Math.random() * 36 - 18,
            Math.random() * 36 - 18,
        ];
    }

    tickBadges(game) {
        this.badgesEntranceFrame += 1;
        const f = this.badgesEntranceFrame;
        const [, badgeIds] = this.BADGES_PAGES[this.badgesPage];
        const cellW = Math.floor((BASE_W - 20) / 2);
        const cellH = Math.floor(BADGE_NAME_GRID_H / 2);
        const maxNameW = cellW - 16;
        const maxNameH = cellH - 8;

        const earnedIndices = [];
        for (let i = 0; i < badgeIds.length; i++) {
            if (badgeIds[i] !== null && game.isBadgeEarned(badgeIds[i])) {
                earnedIndices.push(i);
            }
        }
        const numEarned = earnedIndices.length;
        const nameStart = 1 + numEarned * 5;

        for (let j = 0; j < earnedIndices.length; j++) {
            const i = earnedIndices[j];
            const badgeTrigger = 1 + j * 5;
            if (f >= badgeTrigger && !this.badgesBadgeStamps[i]) {
                const badgeSurf = this._getBadgeSticker(badgeIds[i]);
                if (badgeSurf) {
                    const [ox, oy] = BADGE_STICKER_OFFSETS[i];
                    const cx = BADGES_SHIELD_CX + ox;
                    const cy = BADGES_SHIELD_CY + oy;
                    const [sw, sh] = this._stickerSize(badgeSurf);
                    this.badgesBadgeStamps[i] = new StampEffect(
                        badgeSurf, cx, cy, this.badgesRotations[i],
                        sw, sh);
                }
            }
        }

        // Name stamps (always, fixed order TL, TR, BL, BR).
        // Empty slots (null) get no name.
        for (let i = 0; i < badgeIds.length; i++) {
            if (badgeIds[i] === null) continue;
            const nameTrigger = nameStart + i * 5;
            if (f >= nameTrigger && !this.badgesNameStamps[i]) {
                const nameSurf = this._getBadgeNameSurf(badgeIds[i]);
                if (nameSurf) {
                    const [cx2, cy2] = this._badgeNamePosition(i);
                    this.badgesNameStamps[i] = new StampEffect(
                        nameSurf, cx2, cy2, 0, maxNameW, maxNameH);
                }
            }
        }

        for (const stamp of this.badgesBadgeStamps) {
            if (stamp) stamp.update();
        }
        for (const stamp of this.badgesNameStamps) {
            if (stamp) stamp.update();
        }
    }

    _badgeNamePosition(i) {
        const cellW = Math.floor((BASE_W - 20) / 2);
        const cellH = Math.floor(BADGE_NAME_GRID_H / 2);
        const positions = [
            [10 + cellW / 2, BADGE_NAME_GRID_TOP + cellH / 2],
            [10 + cellW + cellW / 2, BADGE_NAME_GRID_TOP + cellH / 2],
            [10 + cellW / 2, BADGE_NAME_GRID_TOP + cellH + cellH / 2],
            [10 + cellW + cellW / 2, BADGE_NAME_GRID_TOP + cellH + cellH / 2],
        ];
        return positions[i];
    }

    _getBadgeSticker(badgeId) {
        let surf;
        if (badgeId.startsWith("streak_")) {
            const m = parseInt(badgeId.split("_")[1]);
            surf = (m === 2055) ? this.assets.getBadge("Clocked")
                                : this.assets.getMilestoneNumber(m);
        } else {
            surf = this.assets.getBadge(badgeId);
        }
        return surf ? this._trimToInk(surf) : null;
    }

    // Sticker draw size: every badge gets the same area (a square of
    // BADGE_STICKER_SIZE), keeping its shape, so wide and tall badges look
    // the same weight.  Capped so nothing grows past 1.25x the box.
    _stickerSize(surf) {
        const area = BADGE_STICKER_SIZE * BADGE_STICKER_SIZE;
        const aspect = surf.width / surf.height;
        let w = Math.sqrt(area * aspect);
        let h = w / aspect;
        const cap = BADGE_STICKER_SIZE * 1.25;
        if (w > cap) { w = cap; h = w / aspect; }
        if (h > cap) { h = cap; w = h * aspect; }
        return [Math.max(1, Math.round(w)), Math.max(1, Math.round(h))];
    }

    // Crop a sprite to its visible pixels (all four sides), so stickers
    // fill their box the same way whatever padding the PNG has.  Cached.
    _trimToInk(surf) {
        if (!this._trimCache) this._trimCache = new WeakMap();
        const hit = this._trimCache.get(surf);
        if (hit) return hit;
        let out = surf;
        try {
            const w = surf.width, h = surf.height;
            const c = document.createElement("canvas");
            c.width = w; c.height = h;
            const cx = c.getContext("2d");
            cx.drawImage(surf, 0, 0);
            const d = cx.getImageData(0, 0, w, h).data;
            let L = w, R = -1, T = h, B = -1;
            for (let y = 0; y < h; y++) {
                for (let x = 0; x < w; x++) {
                    if (d[(y * w + x) * 4 + 3] > 20) {
                        if (x < L) L = x; if (x > R) R = x;
                        if (y < T) T = y; if (y > B) B = y;
                    }
                }
            }
            if (R >= L && B >= T) {
                const t = document.createElement("canvas");
                t.width = R - L + 1; t.height = B - T + 1;
                t.getContext("2d").drawImage(surf, L, T, t.width, t.height,
                    0, 0, t.width, t.height);
                out = t;
            }
        } catch (e) { /* unreadable image: use as is */ }
        this._trimCache.set(surf, out);
        return out;
    }

    _drawBadges(game) {
        const ctx = this.vctx;
        const bg = this.assets.getTitleBackground();
        if (bg) this._blitCover(bg, this.virtual, BG_DIM);
        else { ctx.fillStyle = BG; ctx.fillRect(0, 0, BASE_W, BASE_H); }

        const [shieldIdx, badgeIds] = this.BADGES_PAGES[this.badgesPage];

        // Shield (static)
        const shield = this.assets.getShield(shieldIdx);
        if (shield) {
            const sw = Math.floor(168 * BADGES_SHIELD_SCALE);
            const scaled = document.createElement("canvas");
            scaled.width = sw; scaled.height = sw;
            const shctx = scaled.getContext("2d");
            shctx.imageSmoothingEnabled = false;  // desktop: transform.scale
            shctx.drawImage(shield, 0, 0, sw, sw);
            ctx.drawImage(scaled,
                Math.floor(BADGES_SHIELD_CX - sw / 2),
                Math.floor(BADGES_SHIELD_CY - sw / 2));
        }

        // Locked badges (static, blacked out).  Empty slots (null)
        // draw nothing.
        for (let i = 0; i < badgeIds.length; i++) {
            if (badgeIds[i] === null) continue;
            if (!game.isBadgeEarned(badgeIds[i])) {
                const badgeSurf = this._getBadgeSticker(badgeIds[i]);
                if (badgeSurf) {
                    const [ox, oy] = BADGE_STICKER_OFFSETS[i];
                    const cx = BADGES_SHIELD_CX + ox;
                    const cy = BADGES_SHIELD_CY + oy;
                    // Same size as the earned sticker (_stickerSize)
                    const [fw, fh] = this._stickerSize(badgeSurf);
                    const fitted = this._smoothScale(badgeSurf, fw, fh);
                    if (!fitted) continue;
                    // Black out — RGB to 0, alpha kept
                    const sticker = document.createElement("canvas");
                    sticker.width = fitted.width;
                    sticker.height = fitted.height;
                    const sctx2 = sticker.getContext("2d");
                    sctx2.drawImage(fitted, 0, 0);
                    // Black out the solid part only: faint edge pixels
                    // (glow, soft shadow) are dropped so the silhouette
                    // matches the earned badge's visible shape.
                    try {
                        const img = sctx2.getImageData(0, 0, sticker.width, sticker.height);
                        const px = img.data;
                        for (let k = 0; k < px.length; k += 4) {
                            px[k] = 0; px[k + 1] = 0; px[k + 2] = 0;
                            if (px[k + 3] < 128) px[k + 3] = 0;
                        }
                        sctx2.putImageData(img, 0, 0);
                    } catch (e) {
                        sctx2.globalCompositeOperation = "source-atop";
                        sctx2.fillStyle = "#000000";
                        sctx2.fillRect(0, 0, sticker.width, sticker.height);
                        sctx2.globalCompositeOperation = "source-over";
                    }
                    ctx.save();
                    ctx.translate(cx, cy);
                    if (Math.abs(this.badgesRotations[i]) > 0.5) {
                        // pygame sign (positive = counter-clockwise)
                        ctx.rotate(-this.badgesRotations[i] * Math.PI / 180);
                    }
                    ctx.drawImage(sticker, -Math.floor(sticker.width / 2), -Math.floor(sticker.height / 2));
                    ctx.restore();
                }
            }
        }

        // Earned badge stamps
        for (let i = 0; i < badgeIds.length; i++) {
            const stamp = this.badgesBadgeStamps[i];
            if (stamp) stamp.draw(ctx);
        }

        // Name stamps
        for (let i = 0; i < this.badgesNameStamps.length; i++) {
            const stamp = this.badgesNameStamps[i];
            if (stamp) stamp.draw(ctx);
        }

        // Click to continue (top-right)
        const clickBtn = this.assets.getButton("CLICK_TO_CONTINUE");
        if (clickBtn) {
            const [scaled2, rect2] = this._scaleToFit(clickBtn, BADGES_CONTINUE_RECT);
            if (scaled2) ctx.drawImage(scaled2, rect2.x, rect2.y, rect2.w, rect2.h);
        } else {
            ctx.fillStyle = TEXT_DIM;
            ctx.font = "14px Arial";
            ctx.textAlign = "center";
            ctx.fillText("Click to continue",
                Math.floor(BADGES_CONTINUE_RECT.x + BADGES_CONTINUE_RECT.w / 2),
                Math.floor(BADGES_CONTINUE_RECT.y + BADGES_CONTINUE_RECT.h / 2));
        }
    }

    nextBadgesPage() {
        this.badgesPage += 1;
        if (this.badgesPage >= this.BADGES_PAGES.length) {
            this.badgesPage = 0;
            return false;
        }
        this._beginBadgesPage();
        return true;
    }

    _getBadgeNameSurf(badgeId) {
        if (badgeId.startsWith("streak_")) {
            const m = parseInt(badgeId.split("_")[1]);
            if (m === 2055) return this.assets.getFanfareText("Clocked");
            return this._composeStreakName(m);
        }
        return this.assets.getFanfareText(badgeId);
    }

    _composeStreakName(milestone) {
        const textSurf = this.assets.getFanfareText("Streak");
        if (!textSurf) return null;
        const targetH = 70;
        const numH = Math.floor(targetH * 0.6);
        const tw = textSurf.width, th = textSurf.height;
        const tScale = targetH / th;
        const tS = document.createElement("canvas");
        tS.width = Math.floor(tw * tScale); tS.height = targetH;
        tS.getContext("2d").drawImage(textSurf, 0, 0, tS.width, tS.height);
        const numSurf = this._composeNumberFromGlyphs(milestone, numH);
        if (!numSurf) return tS;
        const gap = 6;
        const totalW = tS.width + gap + numSurf.width;
        const surf = document.createElement("canvas");
        surf.width = totalW; surf.height = targetH;
        const sctx = surf.getContext("2d");
        sctx.drawImage(tS, 0, 0);
        sctx.drawImage(numSurf, tS.width + gap, Math.floor((targetH - numH) / 2));
        return surf;
    }

    _composeNumberFromGlyphs(number, targetH) {
        const th = Math.max(1, Math.floor(targetH));
        const digitSurfs = [];
        let totalW = 0;
        for (const ch of String(number)) {
            let glyph = this.assets.getCodeGlyph(ch);
            if (!glyph) {
                // Font fallback (size the canvas before drawing — resizing clears it)
                const tmp = document.createElement("canvas");
                const tctx = tmp.getContext("2d");
                tctx.font = `bold ${th}px Arial`;
                tmp.width = Math.max(1, Math.ceil(tctx.measureText(ch).width));
                tmp.height = th;
                tctx.font = `bold ${th}px Arial`;
                tctx.fillStyle = TEXT_BRIGHT;
                tctx.textBaseline = "top";
                tctx.fillText(ch, 0, 0);
                glyph = tmp;
            }
            const [gw2, gh2] = [glyph.width, glyph.height];
            if (gh2 <= 0) continue;
            const scale2 = th / gh2;
            const dw = Math.max(1, Math.floor(gw2 * scale2));
            const tmp2 = document.createElement("canvas");
            tmp2.width = dw; tmp2.height = th;
            tmp2.getContext("2d").drawImage(glyph, 0, 0, dw, th);
            digitSurfs.push(tmp2);
            totalW += dw;
        }
        if (!digitSurfs.length) return null;
        const surf = document.createElement("canvas");
        surf.width = totalW; surf.height = th;
        let x = 0;
        for (const d of digitSurfs) {
            surf.getContext("2d").drawImage(d, x, 0);
            x += d.width;
        }
        return surf;
    }

    // --- Code screen ---

    startCode(game) {
        this.codeEntryBuffer = "";
        this.codeUppercase = true;   // ABC view by default (matches desktop)
        this.codeError = false;
        this.codeCopyFeedback = false;
        this.codeCopyTimer = 0;
        this.codePasteFeedback = false;
        this.codePasteTimer = 0;
        // Same code the save holds (skip rule applied, 13.5).
        this._codeCurrentCode = game.getSaveCode();
        // Run name for the very top line (13.8, 13.13) — the run the
        // code points at.
        this._codeRunName = `RUN OF THE ${game._codeState().seedWord || ""}`;
        this._computeCodeKeyRects();
    }

    tickCodeCopy() {
        if (this.codeCopyTimer > 0) {
            this.codeCopyTimer -= 1;
            if (this.codeCopyTimer === 0) {
                this.codeCopyFeedback = false;
            }
        }
    }

    copyCurrentCode() {
        if (!this._codeCurrentCode) return;
        const code = this._codeCurrentCode;
        // Try the async clipboard API first, fall back to a hidden textarea
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(code).then(() => {
                this.codeCopyFeedback = true;
                this.codeCopyTimer = 90;
            }).catch(() => {
                this._copyFallback(code);
            });
        } else {
            this._copyFallback(code);
        }
    }

    _copyFallback(code) {
        try {
            const ta = document.createElement("textarea");
            ta.value = code;
            ta.style.position = "fixed";
            ta.style.opacity = "0";
            document.body.appendChild(ta);
            ta.select();
            document.execCommand("copy");
            document.body.removeChild(ta);
            this.codeCopyFeedback = true;
            this.codeCopyTimer = 90;
        } catch (e) {
            console.warn("Clipboard copy failed:", e);
        }
    }

    tickCodePaste() {
        if (this.codePasteTimer > 0) {
            this.codePasteTimer -= 1;
            if (this.codePasteTimer === 0) {
                this.codePasteFeedback = false;
            }
        }
    }

    pasteIntoEntry() {
        const doPaste = (text) => {
            if (!text) return;
            // Filter to valid code-alphabet characters only, cap at 11
            let cleaned = "";
            for (const ch of text) {
                if (GAME_CODE_ALPHABET.indexOf(ch) >= 0) {
                    cleaned += ch;
                    if (cleaned.length >= CODE_ENTRY_MAX) break;
                }
            }
            if (cleaned.length > 0) {
                this.codeEntryBuffer = cleaned;
                this.codeError = false;
                this.codePasteFeedback = true;
                this.codePasteTimer = 90;
            }
        };
        if (navigator.clipboard && navigator.clipboard.readText) {
            navigator.clipboard.readText().then(doPaste).catch(() => {
                console.warn("Clipboard read failed (permission denied or unsupported).");
            });
        } else {
            console.warn("Clipboard paste not supported in this browser.");
        }
    }

    _chunkCode(code) {
        // Split a (partial) 11-character code into 4-4-3 chunks,
        // joined by dashes.  Dashes between filled chunks only —
        // a partial entry shows only the chunks that have characters.
        const parts = [code.slice(0, 4), code.slice(4, 8), code.slice(8, 11)]
            .filter(p => p.length > 0);
        return parts.join("-");
    }

    _computeCodeKeyRects() {
        this.codeKeyRects = [];
        // Top row (10 keys + BACK)
        const topRow = this.codeUppercase ? 
            [["?",CODE_NUM_KEY_W],["!",CODE_NUM_KEY_W],
                ["@",CODE_NUM_KEY_W],["#",CODE_NUM_KEY_W],
                ["$",CODE_NUM_KEY_W],["%",CODE_NUM_KEY_W],
                ["^",CODE_NUM_KEY_W],["&",CODE_NUM_KEY_W],
                ["+",CODE_NUM_KEY_W],["*",CODE_NUM_KEY_W],
                ["BACK",CODE_BACK_KEY_W]] :
            [["1",CODE_NUM_KEY_W],["2",CODE_NUM_KEY_W],
                ["3",CODE_NUM_KEY_W],["4",CODE_NUM_KEY_W],
                ["5",CODE_NUM_KEY_W],["6",CODE_NUM_KEY_W],
                ["7",CODE_NUM_KEY_W],["8",CODE_NUM_KEY_W],
                ["9",CODE_NUM_KEY_W],["0",CODE_NUM_KEY_W],
                ["BACK",CODE_BACK_KEY_W]];
        let topTotalW = topRow.reduce((s, [_, w]) => s + w, 0) + (topRow.length - 1) * CODE_NUM_KEY_GAP;
        let x = Math.floor((BASE_W - topTotalW) / 2);
        for (const [label, w] of topRow) {
            this.codeKeyRects.push([label, { x, y: CODE_NUM_ROW_TOP, w, h: CODE_NUM_KEY_H }]);
            x += w + CODE_NUM_KEY_GAP;
        }
        // QWERTY rows (same as gameplay)
        const qwertyRows = [
            [["Q",KEY_W],["W",KEY_W],["E",KEY_W],["R",KEY_W],
             ["T",KEY_W],["Y",KEY_W],["U",KEY_W],["I",KEY_W],
             ["O",KEY_W],["P",KEY_W]],
            [["A",KEY_W],["S",KEY_W],["D",KEY_W],["F",KEY_W],
             ["G",KEY_W],["H",KEY_W],["J",KEY_W],["K",KEY_W],
             ["L",KEY_W]],
            [["TOGGLE",125],["Z",BOTTOM_KEY_W],["X",BOTTOM_KEY_W],
             ["C",BOTTOM_KEY_W],["V",BOTTOM_KEY_W],["B",BOTTOM_KEY_W],
             ["N",BOTTOM_KEY_W],["M",BOTTOM_KEY_W],["ENTER",135]],
        ];
        let y = KEYBOARD_TOP;
        for (const row of qwertyRows) {
            const totalW = row.reduce((s, [_, w]) => s + w, 0);
            x = Math.floor((BASE_W - totalW) / 2);
            for (const [label2, w2] of row) {
                this.codeKeyRects.push([label2, { x, y, w: w2, h: KEY_H }]);
                x += w2;
            }
            y += KEY_H + KEY_GAP;
        }
    }

    _drawCodeGlyph(ch, cx, cy, height = 40) {
        const ctx = this.vctx;
        let surf;
        if (ch.match(/[A-Z]/) && ch.length === 1) {
            surf = this.assets.getLetter("gray", ch);
        } else if (ch.match(/[a-z]/) && ch.length === 1) {
            surf = this.assets.getCodeLower(ch.toUpperCase());
        } else if (ch.match(/[0-9]/)) {
            surf = this.assets.getCodeGlyph(ch);
        } else if (["?","!","@","#","$","%","^","&","+","*","-"].includes(ch)) {
            surf = this.assets.getCodeGlyph(ch);
        }
        if (!surf) {
            const col = ch.match(/[a-z]/) ? "#649bff" : "#c8c8d2";
            const tmp = document.createElement("canvas");
            const tctx = tmp.getContext("2d");
            tctx.font = `bold ${height}px Arial`;
            tctx.fillStyle = col;
            tctx.textBaseline = "top";
            tctx.fillText(ch, 0, 0);
            tmp.width = tctx.measureText(ch).width;
            tctx.font = `bold ${height}px Arial`;
            tctx.fillStyle = col;
            tctx.fillText(ch, 0, 0);
            surf = tmp;
        } else {
            const scale = height / surf.height;
            const nw = Math.max(1, Math.floor(surf.width * scale));
            const tmp = document.createElement("canvas");
            tmp.width = nw; tmp.height = height;
            tmp.getContext("2d").drawImage(surf, 0, 0, nw, height);
            surf = tmp;
        }
        ctx.drawImage(surf, Math.floor(cx - surf.width / 2), Math.floor(cy - surf.height / 2));
    }

    _drawCodeRow(text, cx, cy, height = 40, charGap = 4, maxWidth = null) {
        if (!text) return;
        const surfs = [];
        let totalW = 0;
        for (const ch of text) {
            let surf;
            let fallbackCol = "#c8c8d2";
            if (ch.match(/[A-Z]/) && ch.length === 1) {
                surf = this.assets.getLetter("gray", ch);
            } else if (ch.match(/[a-z]/) && ch.length === 1) {
                surf = this.assets.getCodeLower(ch.toUpperCase());
                fallbackCol = "#649bff";
            } else if (ch.match(/[0-9]/)) {
                surf = this.assets.getCodeGlyph(ch);
            } else if (["?","!","@","#","$","%","^","&","+","*","-"].includes(ch)) {
                surf = this.assets.getCodeGlyph(ch);
            }
            if (!surf) {
                const tmp = document.createElement("canvas");
                const tctx = tmp.getContext("2d");
                tctx.font = `bold ${height}px Arial`;
                tctx.fillStyle = fallbackCol;
                tctx.textBaseline = "top";
                tctx.fillText(ch, 0, 0);
                tmp.width = tctx.measureText(ch).width;
                tctx.font = `bold ${height}px Arial`;
                tctx.fillStyle = fallbackCol;
                tctx.fillText(ch, 0, 0);
                surf = tmp;
            } else {
                const scale = height / surf.height;
                const nw = Math.max(1, Math.floor(surf.width * scale));
                const tmp = document.createElement("canvas");
                tmp.width = nw; tmp.height = height;
                tmp.getContext("2d").drawImage(surf, 0, 0, nw, height);
                surf = tmp;
            }
            surfs.push(surf);
            totalW += surf.width + charGap;
        }
        totalW -= charGap;

        // Auto-scale down if the row is wider than maxWidth
        let drawScale = 1.0;
        if (maxWidth !== null && totalW > maxWidth) {
            drawScale = maxWidth / totalW;
        }

        let x = cx - Math.floor(totalW * drawScale / 2);
        const ctx = this.vctx;
        for (const s of surfs) {
            const dw = Math.max(1, Math.floor(s.width * drawScale));
            const dh = Math.max(1, Math.floor(s.height * drawScale));
            ctx.drawImage(s, x, cy - Math.floor(dh / 2), dw, dh);
            x += dw + Math.floor(charGap * drawScale);
            if (x > cx + Math.floor(maxWidth * drawScale / 2) + 2 && maxWidth !== null) break;
        }
    }

    // Draw the code-entry field as 4-4-3 tiles with fixed dashes between
    // groups, mirroring the guess-grid tile style. Filled tiles show their
    // character (sprite, falling back to Arial); empty tiles show as empty
    // bordered boxes. The current input position gets a highlighted border.
    _drawCodeEntryTiles() {
        const ctx = this.vctx;
        const buf = this.codeEntryBuffer || "";
        const tileY = CODE_ENTRY_TILE_Y - Math.floor(CODE_TILE_SIZE / 2);
        const flashing = this._isFlashing();

        // Dashes between groups (fixed, drawn from the layout constants).
        ctx.fillStyle = TEXT_DIM;
        ctx.font = `bold ${CODE_TILE_SIZE}px Arial`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        for (const dx of CODE_DASH_CENTRES) {
            ctx.fillText("-", Math.floor(dx), CODE_ENTRY_TILE_Y);
        }

        for (let i = 0; i < CODE_ENTRY_MAX; i++) {
            const x = CODE_TILE_XS[i];
            const ch = i < buf.length ? buf[i] : "";
            const isCurrent = i === buf.length;  // cursor position

            // Tile background + border (matches guess-grid empty/filled style).
            if (ch) {
                ctx.fillStyle = "#1e1e28";
                this._roundRect(ctx, x, tileY, CODE_TILE_SIZE, CODE_TILE_SIZE, 4);
                ctx.fill();
                ctx.strokeStyle = flashing && isCurrent ? FLASH_COLOUR : "#50506a";
            } else {
                ctx.fillStyle = "#1e1e28";
                this._roundRect(ctx, x, tileY, CODE_TILE_SIZE, CODE_TILE_SIZE, 4);
                ctx.fill();
                ctx.strokeStyle = isCurrent ? "#8a8a9a" : EMPTY_BORDER;
            }
            ctx.lineWidth = 2;
            this._roundRect(ctx, x, tileY, CODE_TILE_SIZE, CODE_TILE_SIZE, 4);
            ctx.stroke();

            // Character sprite (or Arial fallback), centred in the tile.
            if (ch) {
                this._drawCodeEntryChar(ch, x + CODE_TILE_SIZE / 2, CODE_ENTRY_TILE_Y);
            }
        }
    }

    // Draw a single code-entry character centred at (cx, cy). Uses sprite
    // glyphs when available (matching the code screen's other text) and
    // falls back to a styled Arial glyph.
    _drawCodeEntryChar(ch, cx, cy) {
        const ctx = this.vctx;
        const height = Math.floor(CODE_TILE_SIZE * 0.66);
        let surf = null;
        if (ch.match(/[A-Z]/) && ch.length === 1) {
            surf = this.assets.getLetter("gray", ch);
        } else if (ch.match(/[a-z]/) && ch.length === 1) {
            surf = this.assets.getCodeLower(ch.toUpperCase());
        } else if (ch.match(/[0-9]/)) {
            surf = this.assets.getCodeGlyph(ch);
        } else if (["?","!","@","#","$","%","^","&","+","*"].includes(ch)) {
            surf = this.assets.getCodeGlyph(ch);
        }
        if (!surf) {
            ctx.fillStyle = ch.match(/[a-z]/) ? "#649bff" : "#c8c8d2";
            ctx.font = `bold ${height}px Arial`;
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(ch, Math.floor(cx), Math.floor(cy));
        } else {
            const scale = height / surf.height;
            const dw = Math.max(1, Math.floor(surf.width * scale));
            const dh = Math.max(1, Math.floor(surf.height * scale));
            ctx.drawImage(surf, Math.floor(cx - dw / 2), Math.floor(cy - dh / 2), dw, dh);
        }
    }

    _drawCode(game) {
        const ctx = this.vctx;
        const bg = this.assets.bgSurfs[0] || null;
        if (bg) this._blitCover(bg, this.virtual, 0.6);
        else { ctx.fillStyle = BG; ctx.fillRect(0, 0, BASE_W, BASE_H); }

        // Menu button
        this._drawCodeMenuButton();

        // Copy-to-clipboard button (right side, mirrors menu button)
        this._drawCodeCopyButton();

        // Paste button (below the entry field)
        this._drawCodePasteButton();

        // Run name: RUN OF THE <SEED WORD>, very top, teal sprite
        // letters (13.8, 13.13)
        const runSurf = this._renderTextColoured(
            this._codeRunName, BASE_W - 40, "teal", CODE_RUN_NAME_LETTER_H);
        if (runSurf) {
            ctx.drawImage(runSurf,
                Math.floor(BASE_W / 2 - runSurf.width / 2),
                CODE_RUN_NAME_Y - Math.floor(runSurf.height / 2));
        } else {
            this._renderLabel(this._codeRunName, 252, CODE_RUN_NAME_Y, "#28aaaa");
        }

        // "Current save" label (purple)
        const csSurf = this._renderTextColoured("CURRENT SAVE", BASE_W - 40, "purple", 27);
        if (csSurf) {
            ctx.drawImage(csSurf,
                Math.floor(BASE_W / 2 - csSurf.width / 2),
                CODE_DISPLAY_Y - 15 - Math.floor(csSurf.height / 2));
        } else {
            this._renderLabel("CURRENT SAVE", 252, CODE_DISPLAY_Y - 15, "#c8c8d2");
        }

        // Current code, 4-4-3 chunks (13.13)
        if (this._codeCurrentCode) {
            this._drawCodeRow(this._chunkCode(this._codeCurrentCode),
                Math.floor(BASE_W / 2), CODE_DISPLAY_Y + 20, 44, 4, BASE_W - 40);
        }

        // Separator
        const sepY = 110 + CODE_SHIFT;
        ctx.strokeStyle = "#3c3c46";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(40, sepY);
        ctx.lineTo(BASE_W - 40, sepY);
        ctx.stroke();

        // "Enter new code" label (purple)
        const encSurf = this._renderTextColoured("ENTER NEW CODE TO LOAD", BASE_W - 40, "purple", 27);
        if (encSurf) {
            ctx.drawImage(encSurf,
                Math.floor(BASE_W / 2 - encSurf.width / 2),
                130 + CODE_SHIFT - Math.floor(encSurf.height / 2));
        } else {
            this._renderLabel("ENTER NEW CODE TO LOAD", 252, 130 + CODE_SHIFT, "#c8c8d2");
        }

        // Entry field — 4-4-3 tiles with fixed dashes between groups,
        // mirroring the guess-grid style (see _drawCodeEntryTiles).
        this._drawCodeEntryTiles();

        // Error
        if (this.codeError) {
            const err = this._renderTextColoured("INVALID CODE", BASE_W - 40, "red", 36);
            if (err) {
                ctx.drawImage(err,
                    Math.floor(BASE_W / 2 - err.width / 2),
                    230 + CODE_SHIFT - Math.floor(err.height / 2));
            }
        }

        // Keyboard
        if (this._showTapSquare()) {
            if (this._tapSquareVisible()) {
                this._drawTapSquare(CODE_TAP_SQUARE_RECT, CODE_SHOW_KEYS_RECT, "code-tap-square");
            }
        } else {
            this._drawCodeKeyboard();
        }
    }

    _renderLabel(text, cx, cy, colour) {
        const ctx = this.vctx;
        ctx.fillStyle = colour;
        ctx.font = "14px Arial";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(text, cx, cy);
    }

    _drawCodeMenuButton() {
        const ctx = this.vctx;
        const btn = this.assets.getButton("Main_Menu");
        const hs = this._hoverExtra("code-menu");
        if (btn) {
            const [scaled, rect] = this._scaleToFit(btn, CODE_MENU_RECT);
            if (scaled) {
                if (hs !== 1.0) {
                    const sw = Math.floor(scaled.width * hs);
                    const sh = Math.floor(scaled.height * hs);
                    const tmp = document.createElement("canvas");
                    tmp.width = sw; tmp.height = sh;
                    tmp.getContext("2d").drawImage(scaled, 0, 0, sw, sh);
                    ctx.drawImage(tmp, Math.floor(CODE_MENU_RECT.x + CODE_MENU_RECT.w / 2 - sw / 2),
                        Math.floor(CODE_MENU_RECT.y + CODE_MENU_RECT.h / 2 - sh / 2), sw, sh);
                } else {
                    ctx.drawImage(scaled, rect.x, rect.y, rect.w, rect.h);
                }
            }
        } else {
            // Sprite-font fallback: draw button bg + "MENU" in gray sprite letters
            const sw = Math.floor(CODE_MENU_RECT.w * hs);
            const sh = Math.floor(CODE_MENU_RECT.h * hs);
            const dx = Math.floor(CODE_MENU_RECT.x + CODE_MENU_RECT.w / 2 - sw / 2);
            const dy = Math.floor(CODE_MENU_RECT.y + CODE_MENU_RECT.h / 2 - sh / 2);
            ctx.fillStyle = "#3c3c3c";
            this._roundRect(ctx, dx, dy, sw, sh, 4);
            ctx.fill();
            ctx.strokeStyle = WHITE;
            ctx.lineWidth = 1;
            this._roundRect(ctx, dx, dy, sw, sh, 4);
            ctx.stroke();
            this._drawCodeRow("MENU",
                Math.floor(dx + sw / 2), Math.floor(dy + sh / 2), 18, 3, sw - 8);
        }
    }

    _drawCodeCopyButton() {
        const ctx = this.vctx;
        const hs = this._hoverExtra("code-copy");
        const label = this.codeCopyFeedback ? "COPIED!" : "COPY";
        const bgColour = this.codeCopyFeedback ? GREEN_BG : "#3c3c3c";
        const x = CODE_COPY_RECT.x, y = CODE_COPY_RECT.y;
        const w = CODE_COPY_RECT.w, h = CODE_COPY_RECT.h;
        const sw = Math.floor(w * hs);
        const sh = Math.floor(h * hs);
        const dx = Math.floor(x + w / 2 - sw / 2);
        const dy = Math.floor(y + h / 2 - sh / 2);
        ctx.fillStyle = bgColour;
        this._roundRect(ctx, dx, dy, sw, sh, 4);
        ctx.fill();
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 1;
        this._roundRect(ctx, dx, dy, sw, sh, 4);
        ctx.stroke();
        // Sprite-font label (gray uppercase letters + code-glyph "!")
        this._drawCodeRow(label,
            Math.floor(dx + sw / 2), Math.floor(dy + sh / 2), 18, 3, sw - 8);
    }

    _drawCodePasteButton() {
        const ctx = this.vctx;
        const hs = this._hoverExtra("code-paste");
        const label = this.codePasteFeedback ? "PASTED!" : "PASTE";
        const bgColour = this.codePasteFeedback ? GREEN_BG : "#3c3c3c";
        const x = CODE_PASTE_RECT.x, y = CODE_PASTE_RECT.y;
        const w = CODE_PASTE_RECT.w, h = CODE_PASTE_RECT.h;
        const sw = Math.floor(w * hs);
        const sh = Math.floor(h * hs);
        const dx = Math.floor(x + w / 2 - sw / 2);
        const dy = Math.floor(y + h / 2 - sh / 2);
        ctx.fillStyle = bgColour;
        this._roundRect(ctx, dx, dy, sw, sh, 4);
        ctx.fill();
        ctx.strokeStyle = WHITE;
        ctx.lineWidth = 1;
        this._roundRect(ctx, dx, dy, sw, sh, 4);
        ctx.stroke();
        // Sprite-font label (gray uppercase letters + code-glyph "!")
        this._drawCodeRow(label,
            Math.floor(dx + sw / 2), Math.floor(dy + sh / 2), 16, 3, sw - 6);
    }

    _composeToggleButton() {
        let chars;
        if (this.codeUppercase) {
            chars = [["lower","a"],["lower","b"],["lower","c"],
                     ["dash","-"],["digit","1"],["digit","2"],["digit","3"]];
        } else {
            chars = [["upper","A"],["upper","B"],["upper","C"],
                     ["dash","-"],["symbol","?"],["symbol","!"],
                     ["symbol","@"],["symbol","#"]];
        }
        const glyphH = 24;
        const surfs = [];
        for (const [kind, ch] of chars) {
            let s;
            let fallbackCol = "#c8c8d2";
            if (kind === "upper") s = this.assets.getLetter("gray", ch);
            else if (kind === "lower") { s = this.assets.getCodeLower(ch.toUpperCase()); fallbackCol = "#649bff"; }
            else if (kind === "digit") s = this.assets.getCodeGlyph(ch);
            else if (kind === "symbol") s = this.assets.getCodeGlyph(ch);
            else if (kind === "dash") s = this.assets.getCodeGlyph("-");
            if (!s) {
                s = document.createElement("canvas");
                const sctx = s.getContext("2d");
                sctx.font = `bold ${glyphH}px Arial`;
                sctx.fillStyle = fallbackCol;
                sctx.textBaseline = "top";
                sctx.fillText(ch, 0, 0);
                s.width = sctx.measureText(ch).width;
                sctx.font = `bold ${glyphH}px Arial`;
                sctx.fillStyle = fallbackCol;
                sctx.fillText(ch, 0, 0);
            } else {
                const scale = glyphH / s.height;
                const nw = Math.max(1, Math.floor(s.width * scale));
                const tmp = document.createElement("canvas");
                tmp.width = nw; tmp.height = glyphH;
                tmp.getContext("2d").drawImage(s, 0, 0, nw, glyphH);
                s = tmp;
            }
            surfs.push(s);
        }
        if (!surfs.length) return null;
        let totalW = 0;
        for (const s2 of surfs) totalW += s2.width + 2;
        totalW -= 2;
        const maxH = Math.max(...surfs.map(s => s.height));
        const surf = document.createElement("canvas");
        surf.width = totalW; surf.height = maxH;
        let x = 0;
        for (const s3 of surfs) {
            surf.getContext("2d").drawImage(s3, x, 0);
            x += s3.width + 2;
        }
        return surf;
    }

    _drawCodeKeyboard() {
        const ctx = this.vctx;
        for (const [label, rect] of this.codeKeyRects) {
            const hs = this._hoverExtra(label);
            if (["BACK", "ENTER", "TOGGLE"].includes(label)) {
                let btn;
                if (label === "BACK") btn = this.assets.getButton("Says_Back");
                else if (label === "ENTER") btn = this.assets.getButton("Says_enter");
                else btn = this._composeToggleButton();
                if (btn) {
                    let target = rect;
                    if (hs !== 1.0) {
                        target = { x: rect.x + rect.w / 2 - rect.w * hs / 2,
                                   y: rect.y + rect.h / 2 - rect.h * hs / 2,
                                   w: Math.floor(rect.w * hs), h: Math.floor(rect.h * hs) };
                    }
                    const [scaled, srect] = this._scaleToFit(btn, target);
                    if (scaled) ctx.drawImage(scaled, srect.x, srect.y, srect.w, srect.h);
                } else {
                    let display = label;
                    if (label === "TOGGLE") {
                        display = this.codeUppercase ? "abc-123" : "ABC-?!@#";
                    }
                    let r2 = rect;
                    if (hs !== 1.0) {
                        r2 = { x: rect.x + rect.w / 2 - rect.w * hs / 2,
                               y: rect.y + rect.h / 2 - rect.h * hs / 2,
                               w: Math.floor(rect.w * hs), h: Math.floor(rect.h * hs) };
                    }
                    ctx.fillStyle = label === "ENTER" ? "#325032" : "#32323c";
                    this._roundRect(ctx, r2.x, r2.y, r2.w, r2.h, 4);
                    ctx.fill();
                    ctx.fillStyle = WHITE;
                    ctx.font = "bold 14px Arial";
                    ctx.textAlign = "center";
                    ctx.textBaseline = "middle";
                    ctx.fillText(display, Math.floor(r2.x + r2.w / 2), Math.floor(r2.y + r2.h / 2));
                }
            } else {
                let r3 = rect;
                if (hs !== 1.0) {
                    r3 = { x: rect.x + rect.w / 2 - rect.w * hs / 2,
                           y: rect.y + rect.h / 2 - rect.h * hs / 2,
                           w: Math.floor(rect.w * hs), h: Math.floor(rect.h * hs) };
                }
                ctx.fillStyle = "#282832";
                this._roundRect(ctx, r3.x, r3.y, r3.w, r3.h, 4);
                ctx.fill();
                ctx.strokeStyle = "#46465a";
                ctx.lineWidth = 1;
                this._roundRect(ctx, r3.x, r3.y, r3.w, r3.h, 4);
                ctx.stroke();
                let ch = label;
                if (ch.match(/[A-Z]/) && !this.codeUppercase) ch = ch.toLowerCase();
                this._drawCodeGlyph(ch, r3.x + r3.w / 2, r3.y + r3.h / 2, 26);
            }
        }
    }

    // --- No-point stamp ---

    spawnNoPointStamp() {
        if (!this.assets.hasStamps()) return;
        const image = this.assets.getStamp();
        if (!image) return;
        const positions = [[252,80],[120,80],[384,80],[252,490],[120,490],[384,490]];
        const [cx, cy] = positions[Math.floor(Math.random() * positions.length)];
        const rotation = Math.random() * 40 - 20;
        this.stampEffect = new StampEffect(image, cx, cy, rotation);
    }

    tickStamp() { if (this.stampEffect) this.stampEffect.update(); }
    clearStamp() { this.stampEffect = null; }

    // --- Lifecycle ---

    setState(state) {
        this.state = state;
    }

    setRevealMode(mode) { this.revealMode = mode; }

    tick(fps = 60) {
        // No-op in browser (requestAnimationFrame handles timing)
    }

    quit() {
        // No-op in browser
    }
}