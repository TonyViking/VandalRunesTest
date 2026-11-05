# Vandal Runes

A 5-letter word-guessing game set in a medieval dungeon spray-painted by
punks. Endless words, a streak to protect, and badges to earn.

**Play:** https://tonyviking.github.io/VandalRunes/

Runs in any modern browser, desktop or mobile. No account, no install.
Progress saves in your browser.

## How to Play

Guess the hidden 5-letter word in 6 tries.

- **Green** — right letter, right spot
- **Orange** — right letter, wrong spot
- **Gray** — letter not in the word

Solve words in a row to build your streak. Fail a word and the streak
resets to zero. Your longest streak is your high score.

**Last guess**
- Easy mode: the word's definition shows as a hint. Solving gives no
  point, but your streak is kept.
- Hard mode: no hint. Solving earns the point.

**Hard mode**
- Every guess must reuse the letters already revealed.
- Turn it on before your first guess of a word. Turn it off any time.

## Save Code

Your progress saves automatically. Open **C0dE?** on the title screen
to see your 11-character save code.

- **Copy** it to keep your progress safe or move it to another device.
- **Paste** or type a code to load it. Loading a code replaces your
  current save.
- Leaving a word part-way through skips to the next word. Your streaks
  are kept.

## Badges

33 badges: streak milestones from 5 to 2,055, plus badges for play
styles such as solving on the first guess, winning on the last guess in
hard mode, and solving your run's seed word. View them from the
**Achievements!** button on the title screen.

## Controls

- Type letters, **Enter** to submit, **Backspace** to delete, **Esc**
  for the title screen.
- Mouse and touch work for every on-screen button.
- Code screen: **Ctrl+C** copies your code, **Ctrl+V** pastes one.
- Title screen: Start, Help, Quit, Achievements!, C0dE?

## Run Locally

1. Download or clone this folder.
2. In the folder, run `python -m http.server 8080`.
3. Open `http://localhost:8080/`.

## Project Structure

```
index.html          Entry point
style.css           Layout and rendering styles
js/
  game.js           Game logic (word lists, colours, streaks, badges, save code)
  assets.js         Sprite loader
  display.js        Canvas rendering (all screens and animations)
  main.js           Game loop, input, screen flow
data/
  VandalRunesAnswers.txt   2,055 themed answer words with definitions
  guesses.txt              14,887 valid guesses
Sprites/            Pixel art (letters, digits, backgrounds, buttons, badges)
LICENSE             GPL-3.0
```

## License

GPL-3.0 — see [LICENSE](LICENSE).
