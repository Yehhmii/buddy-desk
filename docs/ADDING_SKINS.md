# Adding a character skin

Characters are the face of the assistant. There are three kinds, from easiest to hardest.

## 1. An SVG skin (recommended)

A skin is one SVG file. Jarvis Desk moves named parts of it: it breathes, blinks, tilts its head, waves an arm, sways hair, and opens the mouth while talking. You draw the character, name the groups, and it comes to life.

Start from `src/renderer/src/assets/skins/luna.svg` or `rex.svg`.

### The format

- `viewBox="0 0 240 300"`. Draw the character standing, centred on x = 120, feet near y = 285.
- Name groups with `data-part`. Every part is optional.

| `data-part` | What it does                        | Extra attributes                                                                             |
| ----------- | ----------------------------------- | -------------------------------------------------------------------------------------------- |
| `figure`    | The whole character. Breathes, bobs | `data-pivot="x y"`: where it is anchored (the feet)                                          |
| `head`      | Tilts gently                        | `data-pivot`: the neck                                                                       |
| `armR`      | The waving arm                      | `data-pivot`: the shoulder. `data-rest`: resting angle in degrees. `data-wave`: raised angle |
| `armL`      | Sways slightly                      | `data-pivot`, `data-rest`                                                                    |
| `eyes`      | Blinks                              | `data-pivot`: the centre of the eyes                                                         |
| `mouth`     | Opens while speaking                | `data-pivot`: the mouth centre. `data-closed`: resting openness (0.1 to 1)                   |
| `sway`      | Hair, ears, tails. Repeat as needed | `data-pivot`: where it attaches. `data-phase`: offset so pieces do not move in step          |

Draw the arm hanging straight down from its pivot. Rotating by a negative angle raises it, so `data-wave="-148"` lifts the hand up and out.

Poses: the skin **stands** while idle or thinking and **waves** while listening or speaking.

### Registering it

1. Save your file as `src/renderer/src/assets/skins/yourname.svg`.
2. In `src/renderer/src/features/voice/skins.ts`, import it with `?raw` and add it to `SVG_SKINS`.
3. In `src/shared/characters.ts`, add `{ id: 'yourname', name: 'Your Name', blurb: '...' }`.
4. Run `npm run dev`, open Settings > Character, and check it.

Only bundled artwork is ever loaded. Never accept SVG from users or the network: the markup is inserted into the page.

## 2. A frame-by-frame skin

Like Buddy: two folders of transparent images, `standing/` and `waving/`. Frames play forward then backward so the loop is seamless. Look at `src/renderer/src/features/voice/BuddySprite.tsx`. Use WebP with transparency, about 366 by 432 pixels, and keep the total size reasonable (Buddy is about 1.2 MB for 55 frames).

## 3. A code-drawn skin

Like the orb: a canvas renderer (`orbRenderer.ts`). Only worth it for abstract characters.

## Before you submit

- Make sure you own the artwork or it is licensed so the project can redistribute it (MIT-compatible). Say where it came from in your pull request.
- Keep it friendly and suitable for all ages.
- Add a screenshot to the pull request.
