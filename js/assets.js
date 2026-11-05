/**
 * assets.js — Sprite asset loader with fallbacks for missing art.
 *
 * Port of src/assets.py. Loads PNGs from Sprites/ and Sprites/Awards/,
 * crops measured letter/digit/button regions from the 230x230 sprite
 * sheets, and provides fallbacks (null) so the game still runs while
 * art is incomplete.
 */

// Map game.js colour names to sprite sheet colour names.
const GAME_COLOUR_TO_SPRITE = {
    "green": "green",
    "yellow": "orange",
    "gray": "gray",
};

// Letter crop boxes [x, y, w, h] from the 230x230 sprite sheets.
// All letters are 27x34 pixels.
const LETTER_CROPS = {
    A: [24, 2, 27, 34],   B: [57, 2, 27, 34],   C: [89, 2, 27, 34],
    D: [119, 2, 27, 34],  E: [151, 2, 27, 34],  F: [184, 2, 27, 34],
    G: [24, 50, 27, 34],  H: [57, 50, 27, 34],  I: [89, 50, 27, 34],
    J: [119, 50, 27, 34], K: [151, 50, 27, 34], L: [184, 50, 27, 34],
    M: [24, 98, 27, 34],  N: [57, 98, 27, 34],  O: [89, 98, 27, 34],
    P: [119, 98, 27, 34], Q: [151, 98, 27, 34], R: [184, 98, 27, 34],
    S: [24, 146, 27, 34], T: [57, 146, 27, 34], U: [89, 146, 27, 34],
    V: [119, 146, 27, 34], W: [151, 146, 27, 34], X: [184, 146, 27, 34],
    Y: [23, 194, 27, 34], Z: [56, 194, 27, 34],
};

// Digit crop boxes from "Number Sprites.png"
const DIGIT_CROPS = {
    0: [42, 17, 49, 100],   1: [172, 18, 36, 102],  2: [293, 17, 51, 99],
    3: [419, 18, 52, 99],  4: [539, 20, 51, 100],
    5: [45, 147, 48, 94],   6: [164, 143, 51, 96],  7: [284, 141, 60, 100],
    8: [414, 141, 56, 107], 9: [541, 136, 55, 107],
};

// High-score digit crop boxes
const HS_DIGIT_CROPS = {
    0: [44, 0, 47, 114],    1: [175, 2, 37, 111],   2: [292, 0, 51, 110],
    3: [418, 2, 54, 110],   4: [543, 6, 47, 104],
    5: [45, 130, 51, 116],  6: [161, 129, 55, 117],  7: [287, 130, 54, 116],
    8: [413, 121, 60, 127],  9: [541, 125, 57, 122],
};

// Content boxes for non-sheet sprites [x, y, w, h]
const CONTENT_BOXES = {
    Title:              [19, 31, 135, 115],
    Says_Start:         [26, 39, 128, 84],
    Says_Back:          [20, 39, 125, 84],
    Says_enter:         [19, 36, 135, 88],
    Says_Hard:          [19, 36, 135, 92],
    Says_Quit:          [20, 31, 134, 115],
    CURRENT_Sprite:     [1, 51, 167, 51],
    HIGH_SCORE_sprite:  [0, 33, 165, 57],
    CLICK_TO_CONTINUE:  [3, 21, 164, 134],
    Main_Menu:          [22, 28, 122, 119],
    Help:              [22, 77, 189, 87],
};

// achievements.png button content box
const ACHIEVEMENTS_BTN_BOX = [4, 2, 237, 36];

// Letter sheet filenames by colour
const LETTER_SHEETS = {
    green:  "new a-z Green.png",
    red:    "new a-z Red.png",
    gray:   "new a-z Gray.png",
    teal:   "new a-z Teal.png",
    purple: "new a-z Purple.png",
    orange: "new a-z Orange.png",
};

// "No points" stamp images
const STAMP_FILES = [
    "No_points_-_last_guess.png",
    "last_guess_-_no_point_given.png",
    "Close_but_no_points_this_roun.png",
    "no_points_for_you_but_you_can.png",
];

// --- Awards sprites ---

const AWARDS_DIR = "Awards";

// Fanfare text sprites from Awards/Text/
const FANFARE_TEXT_FILES = {
    first_guess: "First_Guess.png",
    Streak: "Streak.png",
    Clocked: "Clocked.png",
    skin_of_your_teeth: "Skin_of_Your_Teeth.png",
    hard_earned: "Hard_Earned.png",
    perfect_streak: "Perfect_Streak.png",
    hard_mode_master: "Hard_Mode_Master.png",
    no_hints_needed: "No_Hints_Needed.png",
    solve_for_seed: "Solve_for_seed.png",
};

// Badge sprites from Awards/Badges/
const BADGE_FILES = {
    first_guess: "first_guess.png",
    hard_earned: "hard_earned.png",
    hard_mode_master: "hard_mode_master.png",
    no_hints_needed: "no_hints_needed.png",
    perfect_streak: "perfect_streak.png",
    skin_of_your_teeth: "skin_of_your_teeth.png",
    solve_for_seed: "Solve_for_seed.png",
    Clocked: "Clocked.png",
    Anvil: "Anvil.png",
};

// Shield sprites from Awards/Shields/ (9 shields: 8 badges pages +
// the 9th page's RoundIron1)
const SHIELD_FILES = [
    "Wood1.png", "Bronze1.png", "iron1.png", "Steel1.png",
    "Steel2.png", "Gold1.png", "Gold2.png", "Obsydion1.png",
    "RoundIron1.png",
];

// Milestone number sprites from Awards/Numbers/
const MILESTONE_NUMBERS = [5, 10, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700,
    800, 900, 1000, 1100, 1200, 1300, 1400, 1500, 1600,
    1700, 1800, 1900, 2000, 2055];

// Game-code glyph sprites from Awards/GameCode/
const GAME_CODE_GLYPHS = {
    ...Object.fromEntries([...Array(10).keys()].map(d => [String(d), `${d}.png`])),
    "?": "question.png",
    "!": "exclemation.png",
    "@": "AT.png",
    "#": "POUND.png",
    "$": "DOLAR.png",
    "%": "PERCENT.png",
    "^": "CARET.png",
    "&": "AND.png",
    "+": "PLUS.png",
    "*": "ASTRIX.png",
    "-": "-.png",
};


class AssetLoader {
    constructor(spritesDir) {
        this.spritesDir = spritesDir;
        this.letterSurfs = {};
        this.digitSurfs = {};
        this.hsDigitSurfs = {};
        this.buttonSurfs = {};
        this.bgSurfs = [];
        this.titleBgSurf = null;
        this.titleSurf = null;
        this.stampSurfs = [];
        // Awards
        this.badgeSurfs = {};
        this.shieldSurfs = [];
        this.fanfareTextSurfs = {};
        this.milestoneNumberSurfs = {};
        this.codeGlyphSurfs = {};
        this.codeLowerSurfs = {};
        this.lockoutSurf = null;
        this.loaded = false;
    }

    async loadAll() {
        const promises = [];

        // Letter sheets
        for (const [colour, filename] of Object.entries(LETTER_SHEETS)) {
            this.letterSurfs[colour] = {};
            promises.push(this._loadSheet(filename).then(img => {
                if (!img) return;
                for (const [letter, crop] of Object.entries(LETTER_CROPS)) {
                    this.letterSurfs[colour][letter] = this._cropToCanvas(img, crop);
                }
            }));
        }

        // Digit sheet
        promises.push(this._loadSheet("Number Sprites.png").then(img => {
            if (!img) return;
            for (const [digit, crop] of Object.entries(DIGIT_CROPS)) {
                this.digitSurfs[parseInt(digit)] = this._cropToCanvas(img, crop);
            }
        }));

        // High-score digit sheet
        promises.push(this._loadSheet("Number Sprites - High Score.png").then(img => {
            if (!img) return;
            for (const [digit, crop] of Object.entries(HS_DIGIT_CROPS)) {
                this.hsDigitSurfs[parseInt(digit)] = this._cropToCanvas(img, crop);
            }
        }));

        // Buttons and labels (crop to content)
        for (const [name, box] of Object.entries(CONTENT_BOXES)) {
            promises.push(this._loadSheet(name + ".png").then(img => {
                if (!img) return;
                this.buttonSurfs[name] = this._cropToCanvas(img, box);
            }));
        }

        // Gameplay backgrounds (kept in BG1-3 order; images load async)
        const bgSlots = [];
        for (let i = 1; i <= 3; i++) {
            promises.push(this._loadSheet(`BG${i}.png`).then(img => {
                bgSlots[i - 1] = img;
            }));
        }

        // Title background
        promises.push(this._loadSheet("TitleBackground.png").then(img => {
            this.titleBgSurf = img;
        }));

        // Title logo (cropped to content)
        promises.push(this._loadSheet("Title.png").then(img => {
            if (!img) return;
            this.titleSurf = this._cropToCanvas(img, CONTENT_BOXES["Title"]);
        }));

        // Stamp images (kept in STAMP_FILES order)
        const stampSlots = [];
        STAMP_FILES.forEach((filename, i) => {
            promises.push(this._loadSheet(filename).then(img => {
                stampSlots[i] = img;
            }));
        });

        // --- Awards sprites ---
        const shieldSlots = this._loadAwards(promises);

        await Promise.all(promises);
        // Drop missing files but keep the original file order.
        this.bgSurfs = bgSlots.filter(Boolean);
        this.stampSurfs = stampSlots.filter(Boolean);
        this.shieldSurfs = shieldSlots.filter(Boolean);
        this.loaded = true;
    }

    _loadSheet(filename, subdir) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => resolve(null);
            if (subdir) {
                img.src = `${this.spritesDir}/${subdir}/${filename}`;
            } else {
                img.src = `${this.spritesDir}/${filename}`;
            }
        });
    }

    _cropToCanvas(img, [x, y, w, h]) {
        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        return canvas;
    }

    _loadAwards(promises) {
        const ad = AWARDS_DIR;

        // achievements.png button (cropped to content)
        promises.push(this._loadSheet("achievements.png", ad).then(img => {
            if (img) this.buttonSurfs["achievements"] = this._cropToCanvas(img, ACHIEVEMENTS_BTN_BOX);
        }));

        // Badge sprites from Awards/Badges/
        for (const [name, fname] of Object.entries(BADGE_FILES)) {
            promises.push(this._loadSheet(fname, `${ad}/Badges`).then(img => {
                if (img) this.badgeSurfs[name] = img;
            }));
        }

        // Shield sprites from Awards/Shields/ (page order = SHIELD_FILES order)
        const shieldSlots = [];
        SHIELD_FILES.forEach((fname, i) => {
            promises.push(this._loadSheet(fname, `${ad}/Shields`).then(img => {
                shieldSlots[i] = img;
            }));
        });

        // Fanfare text sprites from Awards/Text/
        for (const [key, fname] of Object.entries(FANFARE_TEXT_FILES)) {
            promises.push(this._loadSheet(fname, `${ad}/Text`).then(img => {
                if (img) this.fanfareTextSurfs[key] = img;
            }));
        }

        // Milestone number sprites from Awards/Numbers/
        for (const m of MILESTONE_NUMBERS) {
            // Skip 2055 - it uses the Clocked badge instead
            if (m === 2055) continue;
            promises.push(this._loadSheet(`${m}.png`, `${ad}/Numbers`).then(img => {
                if (img) this.milestoneNumberSurfs[m] = img;
            }));
        }

        // Game-code glyph sprites from Awards/GameCode/
        for (const [ch, fname] of Object.entries(GAME_CODE_GLYPHS)) {
            promises.push(this._loadSheet(fname, `${ad}/GameCode`).then(img => {
                if (img) this.codeGlyphSurfs[ch] = img;
            }));
        }

        // Lowercase Blue a-z sheet from Awards/GameCode/
        promises.push(this._loadSheet("lowercase Blue a-z.png", `${ad}/GameCode`).then(img => {
            if (!img) return;
            for (const [letter, crop] of Object.entries(LETTER_CROPS)) {
                this.codeLowerSurfs[letter] = this._cropToCanvas(img, crop);
            }
        }));

        // General prohibition sign (lockout)
        promises.push(this._loadSheet("general prohibition sign.png", ad).then(img => {
            this.lockoutSurf = img;
        }));

        return shieldSlots;
    }

    // --- Accessors ---

    getLetter(colour, letter) {
        return (this.letterSurfs[colour] || {})[letter] || null;
    }

    getDigit(digit) {
        return this.digitSurfs[digit] || null;
    }

    getHsDigit(digit) {
        return this.hsDigitSurfs[digit] || null;
    }

    getButton(name) {
        return this.buttonSurfs[name] || null;
    }

    getBackground() {
        if (!this.bgSurfs.length) return null;
        return this.bgSurfs[Math.floor(Math.random() * this.bgSurfs.length)];
    }

    getTitleBackground() {
        return this.titleBgSurf;
    }

    getTitle() {
        return this.titleSurf;
    }

    getStamp() {
        if (!this.stampSurfs.length) return null;
        return this.stampSurfs[Math.floor(Math.random() * this.stampSurfs.length)];
    }

    hasStamps() {
        return this.stampSurfs.length > 0;
    }

    hasDigits() {
        return Object.keys(this.digitSurfs).length > 0;
    }

    hasHsDigits() {
        return Object.keys(this.hsDigitSurfs).length > 0;
    }

    // --- Awards accessors ---

    getBadge(name) {
        return this.badgeSurfs[name] || null;
    }

    getShield(index) {
        if (index >= 0 && index < this.shieldSurfs.length) {
            return this.shieldSurfs[index];
        }
        return null;
    }

    getFanfareText(key) {
        return this.fanfareTextSurfs[key] || null;
    }

    getMilestoneNumber(milestone) {
        return this.milestoneNumberSurfs[milestone] || null;
    }

    getCodeGlyph(ch) {
        return this.codeGlyphSurfs[ch] || null;
    }

    getCodeLower(letter) {
        return this.codeLowerSurfs[letter.toUpperCase()] || null;
    }

    getLockout() {
        return this.lockoutSurf;
    }

    hasAwards() {
        return Object.keys(this.badgeSurfs).length > 0
            || this.shieldSurfs.length > 0
            || Object.keys(this.fanfareTextSurfs).length > 0;
    }
}