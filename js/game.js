/**
 * game.js — Pure game logic for the offline endless Wordle game.
 *
 * Port of src/game.py. No UI dependencies. All game logic: word list
 * loading, guess checking (two-pass colour algorithm), seeded shuffle,
 * turn flow, hard mode validation, streak/high-score tracking,
 * achievement counters, badges, save code encode/decode, and
 * save/load via localStorage.
 */

const WORD_LENGTH = 5;
const MAX_GUESSES = 6;

const GREEN = "green";
const YELLOW = "yellow";
const GRAY = "gray";

const SAVE_KEY = "vandal_runes_state";

// --- Achievements and badges ---

const STREAK_MILESTONES = [
    5, 10, 25, 50, 100, 150, 200, 300, 400, 500, 600, 700, 800, 900,
    1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2055,
];

const NON_STREAK_BADGES = [
    "first_guess", "hard_earned", "skin_of_your_teeth",
    "perfect_streak", "hard_mode_master", "no_hints_needed",
];

const ALL_ACHIEVEMENTS = STREAK_MILESTONES.map(m => `streak_${m}`).concat(NON_STREAK_BADGES);

// --- Game code save system ---

// 64-character alphabet (no ambiguous chars: O/0, I/1/l, W/w removed).
// A-Z minus O,I,W (23) + a-z minus o,l,w, kept i (23) + 2-9 (8) + ?! (2) + @#$%^&+* (8) = 64.
const GAME_CODE_ALPHABET = (
    "ABCDEFGHJKLMNPQRSTUVXYZ" +        // 23 uppercase (no O, I, W)
    "abcdefghijkmnpqrstuvxyz" +      // 23 lowercase (no o, l, w, kept i)
    "23456789" +                      // 8 digits (no 0, 1)
    "?!" +                            // 2 punctuation
    "@#$%^&+*"                        // 8 symbols
);
if (GAME_CODE_ALPHABET.length !== 64) {
    throw new Error(`Alphabet length is ${GAME_CODE_ALPHABET.length}, expected 64`);
}

// --- Seeded shuffle (cross-platform) ---

// Fixed seed words for new runs (PLAN.md section 13.6). 64 words, in this
// exact order; the save code stores the index (0-63). Every word is also
// an answer. Changing this list or its order changes every code.
const SEED_WORDS = [
    "SWORD", "MAGES", "HELMS", "PARTY", "KNAVE", "BLADE", "SPEAR", "LANCE",
    "SABER", "KNIFE", "WANDS", "WITCH", "COVEN", "CHARM", "CURSE", "RUNED",
    "RELIC", "GRAIL", "CHEST", "HOARD", "CREST", "VISOR", "PLUME", "REALM",
    "REGAL", "DRAKE", "WHELP", "GHOUL", "GEIST", "HARPY", "FAIRY", "ANGEL",
    "SAINT", "DEITY", "FATES", "FABLE", "LYRIC", "TORCH", "BLAZE", "FIERY",
    "FLINT", "BRAND", "CLASH", "CLANK", "BRAWL", "FIGHT", "HAVOC", "WRATH",
    "VALOR", "WIELD", "YIELD", "WOUND", "BRUTE", "HAUNT", "NIGHT", "MOATS",
    "PIKES", "TWANG", "ADEPT", "TAMER", "FREYA", "CARVE", "BEARD", "SCALY",
];
if (SEED_WORDS.length !== 64) {
    throw new Error(`SEED_WORDS has ${SEED_WORDS.length} entries, expected 64`);
}

function seededShuffle(items, seedWord) {
    // All maths kept as unsigned 32-bit (>>> 0) so the order matches
    // src/game.py exactly for the same seed word.
    let seed = 0;
    for (let i = 0; i < seedWord.length; i++) {
        seed += seedWord.charCodeAt(i) * Math.pow(31, i);
    }
    let state = seed % 4294967296;

    function nextRand() {
        state = (state ^ (state << 13)) >>> 0;
        state = (state ^ (state >>> 17)) >>> 0;
        state = (state ^ (state << 5)) >>> 0;
        return state;
    }

    const arr = [...items];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = nextRand() % (i + 1);
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// --- Word list loading ---

function loadWords(text) {
    const words = [];
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        const word = trimmed.split("|")[0].trim().toUpperCase();
        if (word.length !== WORD_LENGTH) continue;
        if (!/^[A-Z]+$/.test(word)) continue;
        words.push(word);
    }
    return words;
}

function loadDefinitions(text) {
    const defs = new Map();
    for (const line of text.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes("|")) continue;
        const idx = trimmed.indexOf("|");
        const word = trimmed.substring(0, idx).trim().toUpperCase();
        const definition = trimmed.substring(idx + 1).trim();
        defs.set(word, definition);
    }
    return defs;
}

// --- Guess checking ---

function checkGuess(guess, answer) {
    const colours = new Array(WORD_LENGTH).fill(GRAY);
    const answerChars = answer.split("");

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (guess[i] === answerChars[i]) {
            colours[i] = GREEN;
            answerChars[i] = null;
        }
    }

    for (let i = 0; i < WORD_LENGTH; i++) {
        if (colours[i] === GREEN) continue;
        const idx = answerChars.indexOf(guess[i]);
        if (idx !== -1) {
            colours[i] = YELLOW;
            answerChars[idx] = null;
        }
    }

    return colours;
}

// --- Game code encode/decode ---

function encodeSaveCode(state) {
    const highScore = Math.min(parseInt(state.highScore || 0), 0xFFF);
    const currentStreak = Math.min(parseInt(state.currentStreak || 0), 0xFFF);
    const currentHardStreak = Math.min(parseInt(state.currentHardStreak || 0), 0x1F);
    const currentLastGuessStreak = Math.min(parseInt(state.currentLastGuessStreak || 0), 0x3);
    const currentFastSolveStreak = Math.min(parseInt(state.currentFastSolveStreak || 0), 0xF);
    const totalNoHintSolves = Math.min(parseInt(state.totalNoHintSolves || 0), 0x3F);

    const badges = state.badgesEarned || [];
    let badgeBits = 0;
    for (let i = 0; i < NON_STREAK_BADGES.length; i++) {
        if (badges.includes(NON_STREAK_BADGES[i])) {
            badgeBits |= (1 << i);
        }
    }

    // The code packs 53 bits, more than JS bitwise operators handle
    // (they are 32-bit), so all packing uses BigInt.
    const data = BigInt(highScore)
        | (BigInt(currentStreak) << 12n)
        | (BigInt(currentHardStreak) << 24n)
        | (BigInt(currentLastGuessStreak) << 29n)
        | (BigInt(currentFastSolveStreak) << 31n)
        | (BigInt(totalNoHintSolves) << 35n)
        | (BigInt(badgeBits) << 41n);

    // 6-bit checksum: sum of the data bytes mod 64.
    let checksum = 0n;
    let d = data;
    while (d > 0n) {
        checksum += d & 0xFFn;
        d >>= 8n;
    }
    checksum &= 0x3Fn;

    let value = data | (checksum << 47n);

    const chars = [];
    for (let i = 0; i < 9; i++) {
        chars.push(GAME_CODE_ALPHABET[Number(value & 0x3Fn)]);
        value >>= 6n;
    }
    return chars.join("");
}

function decodeSaveCode(code) {
    if (typeof code !== "string" || code.length !== 9) return null;

    // Encoded LSB-first (chars[0] = bits 0-5), so read right-to-left.
    let value = 0n;
    for (let i = code.length - 1; i >= 0; i--) {
        const idx = GAME_CODE_ALPHABET.indexOf(code[i]);
        if (idx < 0) return null;
        value = (value << 6n) | BigInt(idx);
    }

    const data = value & ((1n << 47n) - 1n);
    const checksum = (value >> 47n) & 0x3Fn;

    let computed = 0n;
    let d = data;
    while (d > 0n) {
        computed += d & 0xFFn;
        d >>= 8n;
    }
    computed &= 0x3Fn;
    if (computed !== checksum) return null;

    const field = (shift, mask) => Number((data >> BigInt(shift)) & BigInt(mask));
    const highScore = field(0, 0xFFF);
    const currentStreak = field(12, 0xFFF);
    const currentHardStreak = field(24, 0x1F);
    const currentLastGuessStreak = field(29, 0x3);
    const currentFastSolveStreak = field(31, 0xF);
    const totalNoHintSolves = field(35, 0x3F);
    const badgeBits = field(41, 0x3F);

    const badgesEarned = [];
    for (let i = 0; i < NON_STREAK_BADGES.length; i++) {
        if (badgeBits & (1 << i)) {
            badgesEarned.push(NON_STREAK_BADGES[i]);
        }
    }
    for (const m of STREAK_MILESTONES) {
        if (highScore >= m) {
            badgesEarned.push(`streak_${m}`);
        }
    }

    return {
        highScore,
        currentStreak,
        seedWord: "",
        position: 0,
        currentHardStreak,
        currentLastGuessStreak,
        currentFastSolveStreak,
        totalNoHintSolves,
        badgesEarned,
    };
}

// --- 11-character save code (PLAN.md sections 13.1-13.11, stage B) ---
//
// The save code IS the save (13.1).  Two forms (13.3):
//   Form A — used while any of the 7 non-streak badges is not won.
//            High score caps at 4,095.  Packs tri, Hard Mode Master
//            progress (0-25), Skin of Your Teeth (0-3), Perfect Streak
//            (0-10), No Hints Needed (0-50), the three yes/no badges
//            (First Guess, Hard Earned, Solve for Seed) as bits, seed
//            word index (0-63), position (0-2054).
//   Form B — all 7 non-streak badges won.  High score caps at 3,114,408.
//            Packs only tri, seed word index, position, offset past
//            FORM_A_COUNT.  Badges never regress, so B never returns to A.
// The decoder tells the forms apart by data < FORM_A_COUNT.
//
// All packing uses BigInt (the value needs 66 bits; JS bitwise ops are
// 32-bit).  Mirrors src/game.py encode_save_code_11 / decode_save_code_11
// exactly — same field order, same maths.

const FORM_A_HIGH_SCORE_CAP = 4095;
const FORM_B_HIGH_SCORE_CAP = 3114408;

// Number of possible Form A data values (mirrors the Python constant).
const FORM_A_COUNT = BigInt(FORM_A_HIGH_SCORE_CAP + 1) * BigInt(FORM_A_HIGH_SCORE_CAP + 2) / 2n
    * 26n * 4n * 11n * 51n * 8n * 64n * 2055n;
// Largest Form B data value; codes decoding past this are invalid.
const FORM_B_MAX = (
    FORM_A_COUNT
    + BigInt(FORM_B_HIGH_SCORE_CAP + 1) * BigInt(FORM_B_HIGH_SCORE_CAP + 2) / 2n
    * 64n * 2055n
    - 1n
);
if (FORM_B_MAX >= 64n ** 10n) {
    throw new Error("11-character code space overflow");
}

function byteSumMod64(n) {
    // 6-bit checksum: sum of the bytes of n, mod 64 (13.4 step 3).
    let total = 0n;
    let d = n;
    while (d > 0n) {
        total += d & 0xFFn;
        d >>= 8n;
    }
    return total & 0x3Fn;
}

function packSeedIndex(state) {
    const seedWord = state.seedWord || "";
    const idx = SEED_WORDS.indexOf(seedWord);
    return idx >= 0 ? idx : 0;
}

function tri(highScore, currentStreak) {
    return BigInt(highScore) * BigInt(highScore + 1) / 2n + BigInt(currentStreak);
}

function untri(t) {
    // Inverse of tri: integer sqrt via Newton's method (floor sqrt,
    // matching Python's math.isqrt), then the triangular inverse.
    const tri8 = 8n * t + 1n;
    let r = tri8;
    while (r * r > tri8) r = (r + tri8 / r) / 2n;
    const hs = (r - 1n) / 2n;
    return [Number(hs), Number(t - hs * (hs + 1n) / 2n)];
}

function encodeSaveCode11(state) {
    const badges = state.badgesEarned || [];
    const allWon = [...NON_STREAK_BADGES, "solve_for_seed"]
        .every(b => badges.includes(b));
    const seedIndex = BigInt(packSeedIndex(state));
    const position = BigInt(Math.max(0, Math.min(parseInt(state.position || 0), 2054)));

    let data;
    if (!allWon) {
        // Form A
        const highScore = Math.min(parseInt(state.highScore || 0), FORM_A_HIGH_SCORE_CAP);
        const currentStreak = Math.min(parseInt(state.currentStreak || 0), highScore);
        // Counter badges: the top value means "won" (12.2), so a won
        // badge always writes its top value, whatever the counter is now.
        const counter = (key, badge, top) => badges.includes(badge)
            ? BigInt(top)
            : BigInt(Math.max(0, Math.min(parseInt(state[key] || 0), top)));
        data = tri(highScore, currentStreak);
        data = data * 26n + counter("currentHardStreak", "hard_mode_master", 25);
        data = data * 4n + counter("currentLastGuessStreak", "skin_of_your_teeth", 3);
        data = data * 11n + counter("currentFastSolveStreak", "perfect_streak", 10);
        data = data * 51n + counter("totalNoHintSolves", "no_hints_needed", 50);
        const yesNo = (badges.includes("first_guess") ? 1 : 0)
            | (badges.includes("hard_earned") ? 2 : 0)
            | (badges.includes("solve_for_seed") ? 4 : 0);
        data = data * 8n + BigInt(yesNo);
        data = data * 64n + seedIndex;
        data = data * 2055n + position;
    } else {
        // Form B: only tri, seed index, position (13.4)
        const highScore = Math.min(parseInt(state.highScore || 0), FORM_B_HIGH_SCORE_CAP);
        const currentStreak = Math.min(parseInt(state.currentStreak || 0), highScore);
        const b = tri(highScore, currentStreak) * 64n + seedIndex;
        data = FORM_A_COUNT + b * 2055n + position;
    }

    const checksum = byteSumMod64(data);
    let value = data * 64n + checksum;

    const chars = [];
    for (let i = 0; i < 11; i++) {
        chars.push(GAME_CODE_ALPHABET[Number(value & 0x3Fn)]);
        value >>= 6n;
    }
    return chars.join("");
}

function decodeSaveCode11(code) {
    if (typeof code !== "string" || code.length !== 11) return null;
    for (const ch of code) {
        if (GAME_CODE_ALPHABET.indexOf(ch) < 0) return null;
    }

    let value = 0n;
    for (let i = code.length - 1; i >= 0; i--) {
        value = (value << 6n) | BigInt(GAME_CODE_ALPHABET.indexOf(code[i]));
    }

    const data = value / 64n;
    const checksum = value % 64n;
    if (byteSumMod64(data) !== checksum) return null;
    if (data > FORM_B_MAX) return null;

    const state = {
        highScore: 0,
        currentStreak: 0,
        seedWord: "",
        position: 0,
        currentHardStreak: 0,
        currentLastGuessStreak: 0,
        currentFastSolveStreak: 0,
        totalNoHintSolves: 0,
        badgesEarned: [],
    };

    let d = data;
    let badges;
    if (d < FORM_A_COUNT) {
        // Form A: position, then seed index, then the counters and
        // yes/no badge bits, all packed before the form test.
        const position = Number(d % 2055n); d /= 2055n;
        const seedIndex = Number(d % 64n); d /= 64n;
        const yesNo = Number(d % 8n); d /= 8n;
        const noHints = Number(d % 51n); d /= 51n;
        const perfect = Number(d % 11n); d /= 11n;
        const skin = Number(d % 4n); d /= 4n;
        const hardMaster = Number(d % 26n); d /= 26n;
        state.position = position;
        state.seedWord = SEED_WORDS[seedIndex];
        state.currentHardStreak = hardMaster;
        state.currentLastGuessStreak = skin;
        state.currentFastSolveStreak = perfect;
        state.totalNoHintSolves = noHints;
        badges = [];
        if (yesNo & 1) badges.push("first_guess");
        if (yesNo & 2) badges.push("hard_earned");
        if (yesNo & 4) badges.push("solve_for_seed");
        // Counter badges: a counter at its top value means won (12.2).
        if (hardMaster >= 25) badges.push("hard_mode_master");
        if (skin >= 3) badges.push("skin_of_your_teeth");
        if (perfect >= 10) badges.push("perfect_streak");
        if (noHints >= 50) badges.push("no_hints_needed");
    } else {
        // Form B: all 7 non-streak badges won; counters at "won" values.
        let b = d - FORM_A_COUNT;
        const position = Number(b % 2055n); b /= 2055n;
        const seedIndex = Number(b % 64n); b /= 64n;
        state.position = position;
        state.seedWord = SEED_WORDS[seedIndex];
        badges = [...NON_STREAK_BADGES, "solve_for_seed"];
        state.currentHardStreak = 25;
        state.currentLastGuessStreak = 3;
        state.currentFastSolveStreak = 10;
        state.totalNoHintSolves = 50;
        d = b;
    }

    const [highScore, currentStreak] = untri(d);
    state.highScore = highScore;
    state.currentStreak = currentStreak;
    for (const m of STREAK_MILESTONES) {
        if (highScore >= m) {
            badges.push(`streak_${m}`);
        }
    }
    state.badgesEarned = badges;
    return state;
}

// --- Game class ---

class Game {
    constructor(answers, definitions, guesses) {
        this.answers = answers;
        this.definitions = definitions;
        this.guesses = guesses;
        this.hardMode = false;
        this._pendingSeed = null;  // next run's seed word, once picked

        const missing = answers.filter(w => !guesses.has(w));
        if (missing.length > 0) {
            console.warn(`${missing.length} answer(s) not in guess list, e.g.`, missing.slice(0, 3));
        }

        this.state = this._loadState();
        this.currentAnswer = null;
        this.guessHistory = [];
        this.solved = false;
        this.failed = false;
        if (this.state.seedWord) {
            const shuffled = seededShuffle(this.answers, this.state.seedWord);
            this.currentAnswer = shuffled[this.state.position];
        } else {
            this._pickAnswer();
        }
    }

    _pickAnswer() {
        if (!this.state.seedWord) {
            // New shuffle — pick random seed from the fixed 64 (13.6)
            this.state.seedWord = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
            this.state.position = 0;
        } else if (this.state.position >= this.answers.length - 1) {
            // Cycle complete — new seed from the fixed 64, fresh cycle.
            // Same seed the saved code already points at, if any.
            this.state.seedWord = this._nextRunSeed();
            this.state.position = 0;
            this._pendingSeed = null;
        } else {
            this.state.position += 1;
        }

        const shuffled = seededShuffle(this.answers, this.state.seedWord);
        this.currentAnswer = shuffled[this.state.position];
        this.guessHistory = [];
        this.solved = false;
        this.failed = false;
    }

    _loadState() {
        // Load state from the 11-character save code (13.1).  The
        // localStorage key holds the code and nothing else.  A missing
        // key, a legacy JSON save (backward compat dropped), or an
        // invalid code all give safe defaults: a fresh run with a new
        // random seed word picked by _pickAnswer.
        try {
            const raw = localStorage.getItem(SAVE_KEY);
            if (!raw) throw new Error("no save");
            const state = decodeSaveCode11(raw.trim());
            if (!state) throw new Error("invalid code");
            return state;
        } catch (e) {
            return this._freshState();
        }
    }

    _freshState() {
        // Safe defaults for a fresh run (no save / unusable code).
        return {
            highScore: 0, currentStreak: 0,
            seedWord: "", position: 0,
            currentHardStreak: 0, currentLastGuessStreak: 0,
            currentFastSolveStreak: 0, totalNoHintSolves: 0,
            badgesEarned: [],
        };
    }

    _nextRunSeed() {
        // Seed word for the run after this one.  Picked once and kept, so
        // the saved code and the next word in this session use the same
        // new run.
        if (this._pendingSeed === null) {
            this._pendingSeed = SEED_WORDS[Math.floor(Math.random() * SEED_WORDS.length)];
        }
        return this._pendingSeed;
    }

    _codeState() {
        // The state the save code should hold right now (13.5).
        // - No guesses on the current word: the current word, as is.
        // - Word solved or failed: the next word.  Counters are already
        //   final for that word.
        // - Word in progress (guesses made, not finished): the next word
        //   (the skip).  Streaks and badge progress are kept, so a crash
        //   or an unintended close costs nothing but the word.
        // Next word past position 2054 starts a new run at position 0.
        // The in-memory state is untouched.
        const st = { ...this.state };
        if (this.guessHistory.length === 0) return st;
        if ((st.position || 0) >= this.answers.length - 1) {
            st.seedWord = this._nextRunSeed();
            st.position = 0;
        } else {
            st.position = (st.position || 0) + 1;
        }
        return st;
    }

    getSaveCode() {
        // The current 11-character save code — the same code the save
        // holds.  Used by the code screen.
        return encodeSaveCode11(this._codeState());
    }

    _saveState() {
        // Write the save code.  The code comes from _codeState (skip
        // rule, 13.5).
        const code = this.getSaveCode();
        try {
            localStorage.setItem(SAVE_KEY, code);
        } catch (e) {
            console.warn('Failed to save game state:', e);
        }
    }

    isValidGuess(word) {
        return word.length === WORD_LENGTH && /^[A-Z]+$/.test(word) && this.guesses.has(word);
    }

    checkHardMode(word) {
        if (!this.hardMode || this.guessHistory.length === 0) {
            return { ok: true, error: "" };
        }

        const greenPositions = {};
        const minLetterCounts = {};

        for (const { word: prevGuess, colours: prevColours } of this.guessHistory) {
            const revealedCounts = {};
            for (let i = 0; i < WORD_LENGTH; i++) {
                const letter = prevGuess[i];
                const colour = prevColours[i];
                if (colour === GREEN) {
                    greenPositions[i] = letter;
                    revealedCounts[letter] = (revealedCounts[letter] || 0) + 1;
                } else if (colour === YELLOW) {
                    revealedCounts[letter] = (revealedCounts[letter] || 0) + 1;
                }
            }
            for (const [letter, count] of Object.entries(revealedCounts)) {
                if (count > (minLetterCounts[letter] || 0)) {
                    minLetterCounts[letter] = count;
                }
            }
        }

        for (const [pos, letter] of Object.entries(greenPositions)) {
            if (word[parseInt(pos)] !== letter) {
                return { ok: false, error: `Green ${letter} must stay at position ${parseInt(pos) + 1}` };
            }
        }

        const wordCounts = {};
        for (const c of word) {
            wordCounts[c] = (wordCounts[c] || 0) + 1;
        }
        for (const [letter, minCount] of Object.entries(minLetterCounts)) {
            if ((wordCounts[letter] || 0) < minCount) {
                return { ok: false, error: `Must use ${letter} at least ${minCount}x` };
            }
        }

        return { ok: true, error: "" };
    }

    submitGuess(word) {
        word = word.toUpperCase();
        if (this.solved || this.failed) {
            return { colours: null, status: "invalid", error: "Game already ended" };
        }
        if (!this.isValidGuess(word)) {
            return { colours: null, status: "invalid", error: "Not a valid word" };
        }
        const { ok, error } = this.checkHardMode(word);
        if (!ok) {
            return { colours: null, status: "invalid", error };
        }

        const colours = checkGuess(word, this.currentAnswer);
        this.guessHistory.push({ word, colours });
        const guessCount = this.guessHistory.length;
        const wasHard = this.hardMode;

        if (word === this.currentAnswer) {
            this.solved = true;
            const isLastGuess = guessCount >= MAX_GUESSES;

            if (!isLastGuess || wasHard) {
                this.state.currentStreak += 1;
                this.state.highScore = Math.max(this.state.highScore, this.state.currentStreak);
            }

            // Achievement counters
            if (isLastGuess) {
                this.state.currentLastGuessStreak += 1;
            } else {
                this.state.currentLastGuessStreak = 0;
            }
            if (guessCount <= 3) {
                this.state.currentFastSolveStreak += 1;
            } else {
                this.state.currentFastSolveStreak = 0;
            }
            if (wasHard) {
                this.state.currentHardStreak += 1;
            } else {
                this.state.currentHardStreak = 0;
            }
            if (wasHard || !isLastGuess) {
                this.state.totalNoHintSolves += 1;
            }

            this._saveState();
            return { colours, status: "solved" };
        }

        if (guessCount >= MAX_GUESSES) {
            this.failed = true;
            this.state.currentStreak = 0;
            this.state.currentLastGuessStreak = 0;
            this.state.currentFastSolveStreak = 0;
            this.state.currentHardStreak = 0;
            this._saveState();
            return { colours, status: "failed" };
        }

        // Save after every accepted guess so leaving mid-word applies
        // the skip rule on reload (13.5).
        this._saveState();
        return { colours, status: "continue" };
    }

    nextWord() {
        this._pickAnswer();
    }

    // --- Accessors ---

    getAnswer() { return this.currentAnswer; }
    getDefinition(word) {
        if (!word) word = this.currentAnswer;
        return this.definitions.get(word) || "";
    }
    getStreak() { return this.state.currentStreak; }
    getHighScore() { return this.state.highScore; }
    getGuessCount() { return this.guessHistory.length; }
    getGuessHistory() { return this.guessHistory; }
    setHardMode(on) { this.hardMode = on; }
    isHardMode() { return this.hardMode; }

    // --- Achievements ---

    getBadgesEarned() {
        return [...(this.state.badgesEarned || [])];
    }

    isBadgeEarned(badgeId) {
        if ((this.state.badgesEarned || []).includes(badgeId)) return true;
        if (badgeId.startsWith("streak_")) {
            const m = parseInt(badgeId.split("_")[1]);
            return this.state.highScore >= m;
        }
        return false;
    }

    checkAchievements() {
        const triggered = [];
        let changed = false;
        const badges = this.state.badgesEarned;
        const guessCount = this.guessHistory.length;

        function award(aid) {
            if (!badges.includes(aid)) {
                badges.push(aid);
                changed = true;
                return true;
            }
            return false;
        }

        // Streak milestones (ascending)
        for (const m of STREAK_MILESTONES) {
            if (this.state.highScore >= m) {
                const aid = `streak_${m}`;
                if (award(aid)) {
                    triggered.push(aid);
                }
            }
        }

        // first_guess: fanfare every time
        if (guessCount === 1) {
            award("first_guess");
            triggered.push("first_guess");
        }

        // hard_earned
        if (guessCount >= MAX_GUESSES && this.hardMode) {
            if (award("hard_earned")) {
                triggered.push("hard_earned");
            }
        }

        // skin_of_your_teeth
        if (this.state.currentLastGuessStreak >= 3) {
            if (award("skin_of_your_teeth")) {
                triggered.push("skin_of_your_teeth");
            }
        }

        // perfect_streak
        if (this.state.currentFastSolveStreak >= 10) {
            if (award("perfect_streak")) {
                triggered.push("perfect_streak");
            }
        }

        // hard_mode_master
        if (this.state.currentHardStreak >= 25) {
            if (award("hard_mode_master")) {
                triggered.push("hard_mode_master");
            }
        }

        // no_hints_needed
        if (this.state.totalNoHintSolves >= 50) {
            if (award("no_hints_needed")) {
                triggered.push("no_hints_needed");
            }
        }

        // solve_for_seed: solve the run's seed word (12.1, 12.2).
        // No counter: the seed word is also an answer, so it comes up
        // exactly once per run.  Any solve of it awards the badge —
        // any mode, any guess count, including an easy-mode last-guess
        // solve.  Failing or skipping it loses the chance for this
        // run; the next run has a new seed word.
        if (this.solved && this.currentAnswer === this.state.seedWord) {
            if (award("solve_for_seed")) {
                triggered.push("solve_for_seed");
            }
        }

        if (changed) {
            this._saveState();
        }
        return triggered;
    }

    loadFromState(newState) {
        // Replace the current save state with one decoded from a code.
        // Loading a code applies nothing extra (13.5): the code is
        // already the post-skip state.  The current word is restored
        // directly from the code's seed word and position — no fresh
        // shuffle, no advancing.
        this.state = newState;
        this._pendingSeed = null;
        this.currentAnswer = null;
        this.guessHistory = [];
        this.solved = false;
        this.failed = false;
        // Save after clearing the guess history so no skip is applied:
        // the code is already the post-skip state (13.5).
        this._saveState();
        if (this.state.seedWord) {
            const shuffled = seededShuffle(this.answers, this.state.seedWord);
            this.currentAnswer = shuffled[this.state.position];
        } else {
            this._pickAnswer();
        }
    }
}