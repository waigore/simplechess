# Playtest plan: untimed game

Epic A ([#7](https://github.com/waigore/simplechess/issues/7)), task [#9](https://github.com/waigore/simplechess/issues/9). Design under test: [docs/design/epic-a-untimed.md](../design/epic-a-untimed.md) (referred to below as "design §n").

This plan verifies the untimed slice on a production build: two people play a complete game with the mouse, on a wide window and a narrow one, with correct rules, results, motion, and look. Every scenario has an ID, preconditions, exact steps, and an observable pass/fail criterion. Where this plan and `spec/` or the design disagree, `spec/` wins, then the design; report the disagreement in your results.

Every move sequence in this plan was replayed with chess.js 1.x before it was written down: each line is legal, produces exactly the SAN shown, and ends on its last move with the stated result (and not earlier).

## 1. Environment

### Build and serve

From a clean checkout of the commit under test, at the repo root:

```bash
npm ci
npm run build
npm run preview        # serves the production build (Vite default: http://localhost:4173)
```

If the project's README or `package.json` names a different command for serving the production build, use that and note it in the results. Never test against the dev server (`npm run dev`). Record the commit SHA in the results.

Also run `npm run test:coverage` once and record the overall line coverage. It must be ≥ 80% and the command must exit 0 (see E-05a for the fifty-move rule test).

### Viewports

| ID | Window size (CSS px) | Expected layout |
| --- | --- | --- |
| **W** (wide) | 1440 × 900 | Board left, 320px sidebar right. Board side = 864px. |
| **N** (narrow) | 390 × 844 | Sidebar stacked under the board. Board side = 368px. |

Board side follows design §1: wide `min(100vh − 32, 100vw − 368, 960)`, narrow `min(100vw − 16, 640)`, both rounded down to a multiple of 8.

Use a real mouse pointer at both sizes: resize a desktop window, or set the viewport in Playwright or DevTools device mode **with touch emulation off**. Touch input is not tested in this slice.

### Browsers

- **Chromium** (current stable Chrome or Playwright Chromium): every scenario.
- **Firefox** (current stable): only F-01 and LK-01, as a smoke check.

### Reduced motion

Turn this on only for MO-08, and off for every other scenario:

- Chrome DevTools → ⋮ → More tools → Rendering → "Emulate CSS media feature prefers-reduced-motion" → `reduce`; or
- Playwright: `page.emulateMedia({ reducedMotion: 'reduce' })`; or
- OS setting (macOS: Accessibility → Display → Reduce motion; Windows: Settings → Accessibility → Visual effects → Animation effects off).

### Evidence

Save screenshots as `{scenarioId}-{W|N}.png` (for example `LK-03-N.png`) and attach them to the playtest task. Motion scenarios need a screen recording or a DevTools Performance recording with screenshots enabled. A scenario with no evidence where evidence is asked for counts as **blocked**, not pass.

## 2. Conventions

- **Moves** are written in SAN with move numbers (`1. e4 e5 2. Nf3`). To play a move, pick up the piece on its origin square and put it on its destination square. Unless a step says **drag**, use click-click: click the origin, then click the destination.
- **Setup shorthand** (all through the setup dialog, design §2):
  - **Default names** = both name fields left blank → players are `White` and `Black`.
  - **Custom names** = White `Alice`, Black `Bob` → labels `Alice (White)` and `Bob (Black)`.
  - **Flip** = orientation "Side to move at the bottom" (the default).
  - **Fixed** = orientation "White stays at the bottom".
- **Fresh game** = press **New game**, enter the stated setup, press **Start game**, and confirm **Abandon and start** if asked.
- **Status** means the two-line status block under the upper nameplate. "Primary / Secondary" is written as `Primary` / `Secondary`. "—" means no secondary line.
- **Result row** is the last row the move list adds when the game ends: `1-0`, `0-1`, or `½-½`.
- Unless a scenario says otherwise, use **default names + Fixed**, so White's home rank stays at the bottom.

## 3. Scenarios

The **Run on** column says which viewports to run. Scenarios marked **W+N** are run once on each viewport and recorded as two separate results.

### 3.1 Setup (SET)

| ID | Run on | Preconditions | Steps | Pass when |
| --- | --- | --- | --- | --- |
| SET-01 | W+N | Fresh page load | 1. Load the app. 2. Press Escape. 3. Look at the dialog. | The setup dialog is open over the start position with a dimmed backdrop. It has no Cancel button, and Escape does not close it. Keyboard focus is in the White name field. Fields, in order: White name (placeholder "White"), Black name (placeholder "Black"), Time control with exactly one option, **Untimed**, selected (no disabled or "coming soon" options), Board orientation with **Side to move at the bottom** selected. Buttons: **Start game** only. |
| SET-02 | W | SET-01 dialog open | Leave both names blank and press **Start game**. | The dialog closes. Upper plate: `Black`, color word `Black`. Lower plate: `White`, color word `White`, with `To move` badge and highlight. Status: `White to move` / —. Move list: `No moves yet`. |
| SET-03 | W | Fresh game | In setup, type three spaces in both name fields and start. | Names fall back to `White` and `Black` exactly as in SET-02. |
| SET-04 | W+N | Fresh game | In setup, enter Custom names and start. | Lower plate name `Alice` with color word `White`; upper plate `Bob` / `Black`. Status `Alice (White) to move` / —. |
| SET-05 | W | Fresh game | In the White name field, type `ABCDEFGHIJKLMNOPQRSTUVWXYZ0123` (30 characters) and start. | The field accepts at most 24 characters. The plate shows `ABCDEFGHIJKLMNOPQRSTUVWX`, or a truncated version with an ellipsis if it does not fit. The layout does not overflow. |
| SET-06 | W | Fresh game; type ` Alice ` (with spaces) as White | Start the game. | The name is trimmed: the status reads `Alice (White) to move`. |
| SET-07 | W | Custom names, Flip; no move played | Press **New game**. | The dialog opens pre-filled with `Alice`, `Bob`, and Side to move at the bottom, and it has a **Cancel** button. |
| SET-08 | W | SET-07 dialog open | Press **Cancel**. Reopen with New game and press Escape. | Both times the dialog closes and the game is unchanged (same names, still `Alice (White) to move`, `No moves yet`). |
| SET-09 | W | Custom names; no move played | New game → change orientation to Fixed → **Start game**. | It starts immediately with **no** confirm step. |
| SET-10 | W+N | Custom names; play `1. e4` | New game → **Start game**. | The dialog content is replaced by **Abandon the current game?** and the line "The game between Alice (White) and Bob (Black) will be lost." with **Back** and **Abandon and start** (danger style). |
| SET-11 | W | SET-10 confirm step showing | 1. Press **Back**. 2. Press Start game again and then Escape at the confirm step. | Each time the setup form returns with the same values. The board still shows `1. e4` behind the dialog. |
| SET-12 | W | SET-10 confirm step showing | Press **Abandon and start**. | New game: start position, `No moves yet`, no last-move highlight, `Alice (White) to move`. |
| SET-13 | W | Custom names; play `1. e4`; open New game | Press **Cancel**. | The game is unchanged: `1. e4` in the move list, last-move highlight on e2 and e4, `Bob (Black) to move`. |
| SET-14 | W | A finished game (for example after E-01) | New game → Start game. | It starts immediately with **no** confirm step. |

### 3.2 Turn indicator and orientation (TURN)

| ID | Run on | Preconditions | Steps | Pass when |
| --- | --- | --- | --- | --- |
| TURN-01 | W+N | Custom names, **Flip** | Play `1. e4 e5 2. Nf3 Nc6`, one move at a time. After each move, wait for it to settle and check the board and sidebar. | After every move: (a) the board has flipped so the side to move is at the bottom; (b) the lower plate is the side to move, with `To move` badge and highlight (raised background and 3px green left border), and the upper plate has neither; (c) the status primary line names the side to move (`Bob (Black) to move`, then `Alice (White) to move`, and so on); (d) coordinates follow the board: with Black at the bottom the files read h→a left to right and rank 1 is at the top. Status, badge, and highlight always agree. The flip is instant (no rotation) and happens after the move animation ends. |
| TURN-02 | W+N | Custom names, **Fixed** | Play `1. e4 e5 2. Nf3 Nc6`. | White stays at the bottom the whole time. The upper plate is always Bob/Black and the lower plate always Alice/White. Badge, highlight, and status move between the plates each move and always agree. |
| TURN-03 | W | Default names, Fixed | Play `1. e4 f6 2. Qh5+`. | Status: `Black to move` / `Check`. The e8 square shows the red check highlight. The move list shows `2. Qh5+`. |
| TURN-04 | W | TURN-03 position | Play `2... g6`. | The check highlight on e8 disappears and the status is `White to move` / —. |

### 3.3 Mouse (MOUSE)

Default names + Fixed, fresh game, unless stated.

| ID | Run on | Preconditions | Steps | Pass when |
| --- | --- | --- | --- | --- |
| M-01 | W+N | Start position | Hover a White piece, then a Black piece, then an empty square. | The cursor is `grab` over White pieces, and the default arrow over Black pieces and empty squares. |
| M-02 | W+N | Start position | Click the e2 pawn. | e2 gets the selection highlight. Filled dots appear on e3 and e4 in the same frame. No other markers. |
| M-03 | W+N | M-02 | Click e4. | The pawn slides to e4 and settles. e2 and e4 get the last-move highlight. Move list: `1. e4`. Status `Black to move`. |
| M-04 | W+N | After `1. e4` | **Drag** the g8 knight slowly over f6 without releasing, then release on f6. | While dragging, the knight's center stays under the pointer, g8 shows a 30%-opacity ghost with the selection highlight, and f6 (a legal square) gets the drag-hover tint while the pointer is over it. On release the knight sits on f6 at once (no slide). Move list: `1. e4 Nf6`. |
| M-05 | W | Start position | **Drag** the g1 knight, then release on g1. | The knight is back on g1 at once and **stays selected**: markers on f3 and h3 still show. Then click f3: the move commits as `1. Nf3`. |
| M-06 | W+N | Start position | **Drag** the g1 knight to g4 (not a knight move) and release. | The knight returns to g1 with a short slide. Nothing is selected, no markers show, the move list still says `No moves yet`, and the status is `White to move`. |
| M-07 | W+N | Start position | **Drag** the b1 knight outside the board (onto the page background or sidebar) and release. | Same as M-06: the piece returns, nothing is recorded, nothing is selected. |
| M-08 | W | Start position | Start dragging the b1 knight and press Escape before releasing. | Same as M-06. |
| M-09 | W | Start position | Click e2, then click e5 (an illegal empty square). | Deselected: no markers, no highlight, no move. |
| M-10 | W | Start position | Click e2, then click outside the board. Then click e2 and press Escape. | Both times: deselected, no move. |
| M-11 | W | Start position | Click e2, then click e2 again. | Deselected. |
| M-12 | W | Start position | Click e2, then click the g1 knight. | Selection moves to g1. Markers now show on f3 and h3 only. |
| M-13 | W+N | Start position (White to move) | Click the e7 pawn. Then try to **drag** it to e5. | Nothing happens: no selection, no markers, the pawn does not move, and the status is still `White to move`. |
| M-14 | W | Start position | Click an empty square (e4). | Nothing happens. |
| M-15 | W+N | Play `1. e4 d5` | Click the e4 pawn. | A dot shows on e5 and a ring around the edge of d5. The Black pawn on d5 stays fully visible inside the ring. |
| M-16 | W | M-15 | Click d5. | The capture is played. Move list `2. exd5`. Only one pawn is on d5. |

### 3.4 Rules (RULE)

Default names + Fixed, fresh game for each row.

| ID | Run on | Steps | Pass when |
| --- | --- | --- | --- |
| R-01 | W+N | Play `1. e4 e5 2. Nf3 Nc6 3. Bc4 Bc5`. Click the e1 king, then click g1. Then play `4... Nf6 5. d3` and **drag** the e8 king to g8. | When the king is selected, g1 has a marker. After each castle the king and rook both moved (White: Kg1, Rf1; Black: Kg8, Rf8). Move list: `4. O-O` and `5... O-O`. |
| R-02 | W+N | Play `1. d4 d5 2. Nc3 Nc6 3. Bf4 Bf5 4. Qd2 Qd7`. Click e1, then click c1. Then click e8 and click c8. | White: Kc1, Rd1. Black: Kc8, Rd8. Move list: `5. O-O-O O-O-O`. |
| R-03 | W | From the start position, click the e1 king. Then **drag** it to g1 and release. | No markers appear (every king move is blocked). The drop is refused: the king returns to e1, nothing is recorded. |
| R-04 | W | Play `1. e4 b6 2. g3 Ba6 3. Bg2 Nc6 4. Nf3 Nf6`. Click the e1 king. Then **drag** it to g1. | The king is not in check, f1 and g1 are empty, but f1 is attacked by the a6 bishop. No marker shows on g1 (or anywhere). The drag to g1 is refused and the king returns to e1. Nothing is recorded; status `White to move`. |
| R-05 | W+N | Play `1. e4 a6 2. e5 d5`. Click the e5 pawn. Then click d6. | When the e5 pawn is selected there is a dot on e6 and a capture ring on d6 (the empty en passant square). After clicking d6, the pawn is on d6 and the Black pawn on d5 is gone. Move list: `3. exd6`. |
| R-06 | W | Play `1. e4 f6 2. Qh5+`. Click the a7 pawn. Click a6. Then try to **drag** the b8 knight to c6. | The a7 pawn shows no markers and clicking a6 does nothing. The knight drop is refused. Only `2... g6` is legal (clicking g7 shows a single dot on g6). |
| R-07 | W | Play `1. e4 e5 2. Nc3 Nf6 3. d3 Bb4`. Click the c3 knight. Then **drag** it to d5. | The pinned knight shows no markers, and the drop is refused. |
| R-08 | W | From the start position, **drag** the b1 knight to b3. | Refused; the knight returns to b1. |

#### Promotion (PROMO)

**White prefix**: `1. a4 b5 2. axb5 a6 3. bxa6 Bb7 4. axb7 Nc6`. White's b7 pawn can then capture on a8 (rook) or push to b8 (empty).

**Black prefix**: `1. b4 a5 2. Bb2 axb4 3. Nc3 bxc3 4. e3 cxb2 5. Nf3`. Black's b2 pawn can then capture on a1 (rook) or push to b1 (empty).

| ID | Run on | Preconditions | Steps | Pass when |
| --- | --- | --- | --- | --- |
| P-01 | W+N | Default names, Fixed, White prefix | Click b7, then click a8. | The pawn appears on a8 and the rook is removed. The rest of the board dims. A picker shows four round cells in the a-file: a8 Queen, a7 Knight, a6 Rook, a5 Bishop, in White. The move list still ends at `4... Nc6`, the status is still `White to move`, and the board has not flipped. |
| P-02 | W+N | P-01 picker open | Choose **Queen**. | A White queen is on a8. Move list `5. bxa8=Q`. Status `Black to move`. |
| P-03 | W | Fresh game, White prefix | **Drag** b7 to a8 and choose **Knight**. | `5. bxa8=N`; White knight on a8. |
| P-04 | W | Fresh game, White prefix | Click b7, then click b8, then choose **Rook**. | The picker runs b8, b7, b6, b5. Result: `5. b8=R`; White rook on b8. |
| P-05 | W | Fresh game, White prefix | **Drag** b7 to b8 and choose **Bishop**. | `5. b8=B`; White bishop on b8. |
| P-06 | W+N | Fresh game, White prefix | Click b7, then a8, then press Escape. Repeat, but this time click a dimmed square outside the picker. | Each time: the pawn returns to b7, the Black rook reappears on a8, the dimming and picker go away, nothing is recorded (move list ends `4... Nc6`), the status is `White to move`, and nothing is selected. |
| P-07 | W+N | Default names, **Fixed**, Black prefix | Click b2, then a1. Choose **Queen**. | The picker is in the a-file running upward from a1: a1 Queen, a2 Knight, a3 Rook, a4 Bishop, in Black. Result `5... bxa1=Q`. |
| P-08 | W+N | Default names, **Flip**, Black prefix | Click b2, then a1. Choose **Knight**. | Black is at the bottom, so a1 is at the top of the board and the picker runs downward from it (a1 Queen first). It stays inside the board. Result `5... bxa1=N`. After the choice, the board flips to White at the bottom. |
| P-09 | W | P-01 picker open | Press Tab four times, then Enter. | Focus starts on Queen, and Tab cycles through the four cells with a visible focus outline. Enter promotes to the focused piece. |

### 3.5 Endings (END)

Run each ending on a fresh game. Unless stated, use **default names + Fixed**. Any input method is fine for long lines (scripted input such as Playwright is fine too). For every ending, also check the **common end state**:

- The board is locked: clicking or dragging a piece of either color does nothing.
- The actions row shows only **New game**, in primary style.
- Neither nameplate is highlighted. Badges: the winner shows `Winner` and the loser shows none; on a draw both show `Draw`.
- The move list ends with the result row, which is scrolled into view.

| ID | Run on | Moves / steps | Pass when (status and result row, plus the common end state) |
| --- | --- | --- | --- |
| E-01 | W+N | Fool's mate: `1. f3 e5 2. g4 Qh4#` | `Black wins` / `by checkmate`. The e1 king square has the check highlight. Move list `2. g4 Qh4#`, result row `0-1`. Black plate `Winner`. |
| E-02 | W | Stalemate: `1. e3 a5 2. Qh5 Ra6 3. Qxa5 h5 4. h4 Rah6 5. Qxc7 f6 6. Qxd7+ Kf7 7. Qxb7 Qd3 8. Qxb8 Qh7 9. Qxc8 Kg6 10. Qe6` | Before the last move the status is `White to move` (with `Check` after `6. Qxd7+`). After `10. Qe6`: `Draw` / `by stalemate`, result row `½-½`. |
| E-03 | W+N | Threefold repetition: `1. Nf3 Nf6 2. Ng1 Ng8 3. Nf3 Nf6 4. Ng1 Ng8` | After `4. Ng1` the game is still running (`Black to move`). After `4... Ng8`: `Draw` / `by threefold repetition`, result row `½-½`. No claim button appears at any point. |
| E-04 | W | Insufficient material (73 half-moves): `1. d3 a5 2. Bf4 e6 3. Bxc7 Qxc7 4. g4 Qxh2 5. Rxh2 Ba3 6. Rxh7 Bxb2 7. Rxg7 Bxg7 8. Nf3 Bxa1 9. Nbd2 Rh7 10. Qxa1 Rh1 11. Ng5 Rxf1+ 12. Kxf1 Ra7 13. Nxe6 dxe6 14. f4 Ra6 15. Qc1 e5 16. fxe5 Bxg4 17. e6 Bxe6 18. Qb1 Bxa2 19. Qxb7 Nh6 20. Qxf7+ Bxf7 21. c3 Bg6 22. Kg1 Bxd3 23. exd3 Nc6 24. d4 Nxd4 25. cxd4 Ra7 26. d5 Rh7 27. d6 a4 28. Kh2 a3 29. Nc4 Kf8 30. Nxa3 Rf7 31. Nb5 Rh7 32. d7 Rxd7 33. Nc7 Rxc7 34. Kg3 Ng8 35. Kg4 Rg7+ 36. Kh5 Rg6 37. Kxg6` | The game is running before `37. Kxg6`. After it, only Kg6 (White), Kf8 and Ng8 (Black) remain, and the status is `Draw` / `by insufficient material`, result row `½-½`. The move list SAN matches the line exactly; a mismatch means an entry error (redo) or a SAN bug (report it). |
| E-05a | — | Run `npm run test:coverage`. Find the unit test for the fifty-move rule (search the test files for `fifty`). | A unit test exists that reaches a position with the half-move clock at 99, plays one quiet move, and asserts the game ends as a draw with reason fifty-move rule. It passes. Record the test file and test name. |
| E-05b | W | Fifty-move rule (102 half-moves; no capture or pawn move after `1... e5`, no checks, no repeated position): `1. e4 e5 2. Qh5 Nc6 3. Ne2 Nb8 4. Qf3 Qe7 5. Qh5 Qb4 6. Kd1 Qb6 7. Qf3 Qf6 8. Qa3 Qc6 9. Qd3 Qc5 10. Qa6 Qb5 11. Ng1 Nh6 12. Qa4 Qc6 13. Qc4 Kd8 14. Ke1 Qa4 15. Qd5 Ng8 16. Qc6 Qa3 17. Kd1 Qd3 18. Qd6 Ke8 19. Qf6 Qd4 20. Qh6 Qe3 21. Be2 Ke7 22. Qf4 Kd8 23. Bf3 Qd4 24. Qg4 Qa4 25. Be2 Qd4 26. Qf5 Qd3 27. Bg4 Qd6 28. Ke2 Qc5 29. Qg6 Be7 30. Kd3 Na6 31. Be6 Qb4 32. Bb3 Qb6 33. Bd5 Qe6 34. Nh3 Qf5 35. Qg5 Qg4 36. Re1 Qh4 37. Qh5 Bb4 38. Rh1 Bf8 39. Rf1 Bd6 40. Nf4 Rb8 41. Rd1 Qf6 42. Na3 Qf5 43. Qg4 Ke8 44. Rb1 Qh5 45. Qg6 Ke7 46. Ke3 Ra8 47. Qh6 Bb4 48. Be6 Kd8 49. Rf1 Qg5 50. Qh5 Qf6 51. Bh3 Be7` | After `51. Bh3` the game is running (`Black to move`). After `51... Be7`: `Draw` / `by the fifty-move rule`, result row `½-½`. The move list SAN matches the line exactly. If scripted input is not available, E-05b may be marked **blocked** with a note, as long as E-05a passes. |
| E-06 | W | Default names, no move played | Press **Resign**, then **Cancel**. Press **Resign** again, then press Escape. Press **Resign** a third time and confirm with **Resign**. | The confirm dialog reads `White, resign this game?` with Cancel and a danger-style Resign. Cancel and Escape change nothing. After confirming: `Black wins` / `White resigned`, and the move list shows the result row `0-1`. The design does not say whether `No moves yet` stays above the result row; record what you see as a note, not a failure. |
| E-07 | W+N | Custom names; play `1. e4` | Bob (Black, to move) presses **Resign** and confirms. | The dialog reads `Bob (Black), resign this game?`. Status: `Alice (White) wins` / `Bob (Black) resigned`. Result row `1-0`. Alice's plate shows `Winner`. |
| E-08 | W+N | Custom names; play `1. e4 e5` | White presses **Offer draw**. Then try to click and drag a White piece and a Black piece. Then press **Accept draw**. | While the offer is pending: status `Alice (White) offers a draw` / `Bob (Black), accept or decline`. The actions row is replaced by **Accept draw** (primary) and **Decline**, with **New game** still shown. No piece can be selected or moved. After accepting: `Draw` / `by agreement`, result row `½-½`, both plates `Draw`. |
| E-09 | W | Custom names; play `1. e4 e5`; White presses **Offer draw** | Press **Decline**. Then play `2. Nf3`. | After Decline: Resign / Offer draw / New game return. Status `Alice (White) to move` / `Draw offer declined`. **Offer draw** is disabled. After `2. Nf3`: status `Bob (Black) to move` / —, and **Offer draw** is enabled again. |
| E-10 | W | Default names; play `1. e4 f6 2. Qh5+` | Black presses **Offer draw**; White presses **Decline**. | Status `Black to move` / `Check · Draw offer declined`. |
| E-11 | W | Custom names; play `1. e4 e5`; White presses **Offer draw** | Press **New game**, then **Cancel**. | The offer is still pending: same status, Accept/Decline still shown, and the board still locked. |
| E-12 | W | Default names, Fixed; play `1. e4` | Click the e7 pawn (markers show on e6 and e5). Then Black, the side to move, presses **Offer draw**. | The selection and markers are cleared when the offer opens. |

### 3.6 Move list (LIST)

| ID | Run on | Preconditions | Steps | Pass when |
| --- | --- | --- | --- | --- |
| L-01 | W+N | Fresh game, default names, Fixed | Sample game: `1. e4 f5 2. exf5 g6 3. fxg6 Bg7 4. gxh7 Bf6 5. hxg8=Q+ Rxg8 6. Nf3 d6 7. Bc4 Nc6 8. O-O e6 9. Qe2 Kd7 10. Qxe6#`. At `5. hxg8=Q+`, take the h7 pawn to g8 and choose Queen. | The list has exactly 10 numbered rows, with SAN exactly as written: captures (`exf5`, `Rxg8`, `Qxe6#`), promotion with capture and check (`hxg8=Q+`), castling (`O-O`), mate (`#`). English letters, no figurines. Then a result row `1-0` (centered). Status `White wins` / `by checkmate`. |
| L-02 | W | During L-01 | Check the formatting after each move. | The move number is right-aligned and muted, followed by a period. White's move is in column 2 and Black's in column 3; a row with only White's move leaves column 3 empty. Rows alternate background colors. The latest half-move has a raised background and bold weight. |
| L-03 | W | During L-01 | Hover and click several move entries. | No hover effect, default cursor, and nothing happens on click (the board does not change). |
| L-04 | N | E-04 on narrow (any long line), or 30+ half-moves | Watch the move list as moves are played. | The list is capped at about 40% of the viewport height and scrolls internally. After every move the latest row is visible without manual scrolling, and the jump is instant (no smooth scroll). |
| L-05 | W | Fresh game | Look at the move list. | It shows `No moves yet` in muted text. |

### 3.7 Motion (MOTION)

Measure with a DevTools Performance recording (screenshots on) or a screen recording at ≥ 30 fps. If the implementation uses CSS transitions or the Web Animations API, you can also check durations in the console right after the action with `document.getAnimations().map(a => a.effect.getTiming().duration)`. Record the method you used.

| ID | Run on | Steps | Pass when |
| --- | --- | --- | --- |
| MO-01 | W+N | Click-click `1. e4`. | The pawn slides from e2 to e4 and arrives within **≤ 200 ms** of the click (target 150 ms). No frame shows it past e4 (no overshoot or bounce). It is fully settled after arriving. |
| MO-02 | W+N | Drag a knight around the board in fast circles, then stop. | In every frame, the piece's center is under the pointer (within ~2px). It never lags behind and catches up, and it does not keep moving after the pointer stops. |
| MO-03 | W | After `1. e4 d5`, click-click `2. exd5`. Then in a fresh game after `1. e4 d5`, **drag** `2. exd5`. | Click: the d5 pawn fades out while the e4 pawn slides in, and is gone when the mover lands (~150 ms). Drag: the captured pawn disappears at once on drop. |
| MO-04 | W | R-01 setup. Click-click `4. O-O`. | The rook slides h1→f1 at the same time as the king slides e1→g1, and both land together. |
| MO-05 | W | R-05 setup. Click-click `3. exd6`. | The d5 pawn fades out over ~150 ms while the e5 pawn moves to d6, so the capture on a different square is visible. |
| MO-06 | W+N | Drag the g1 knight to g4 and release (illegal). | The knight returns to g1 within **≤ 170 ms** (target 120 ms), with no overshoot. |
| MO-07 | W | Click-click `1. e4`. Within 100 ms of the second click (while the pawn is still moving), click the g8 knight. | The pawn's slide jumps straight to e4, and the knight is selected right away (markers on f6 and h6). Input is never ignored. |
| MO-08 | W+N | Turn on **reduced motion**. Repeat MO-01, MO-03 (click), MO-04, MO-05, MO-06, then MO-02. | Every move, capture, castle, en passant, and put-back shows the end position at once with no tween (`document.getAnimations()` is empty or all durations are 0). Dragging still tracks the pointer as in MO-02. |
| MO-09 | W | Custom names, Flip. Play `1. e4`. | The pawn slide finishes first, and then the board flips in one frame (no rotation). |

### 3.8 Look and cohesion (LOOK)

Take every screenshot at both **W** and **N**, at full page size.

| ID | Run on | Setup | Screenshot / check | Pass when |
| --- | --- | --- | --- | --- |
| LK-01 | W+N | Fresh game, Custom names, Fixed | Start position. | The board measures 864 × 864 on W and 368 × 368 on N. On W, the 320px sidebar is to the right, as tall as the board, in this order: upper plate (Bob), status, actions, move list, lower plate (Alice). On N, the sidebar is under the board at the board's width, in the same order, and the board is fully visible at the top on load. Squares are cream `#EEEED2` and green `#769656`. Page `#1F1E1B`. No app header. |
| LK-02 | W+N | LK-01 | Coordinates. | Rank numbers are in the top-left of the a-file squares and file letters in the bottom-right of the rank-1 squares, in the opposite square color, readable at both sizes. |
| LK-03 | W+N | Play `1. e4 d5 2. exd5` | After a capture. | e4 and d5 show the yellow last-move overlay. The White pawn on d5 is readable. |
| LK-04 | W+N | Play `1. e4 f6 2. Qh5+` | Check. | The e8 king square has a red radial highlight under the king, the king is clearly readable, and the status shows `Check`. |
| LK-05 | W+N | After E-01 | Game end. | Result text, badges, result row, and the New game button are all visible at once without scrolling on W. On N they are reachable by scrolling, and the board stays fully visible at the top. |
| LK-06 | W+N | Select a White piece that has a capture available (M-15 position) | Selection and markers. | The selection overlay, dots, and capture ring use the same dark-green tone and fit the board palette. |
| LK-07 | W+N | All of the above | Overall review. | Every piece of both colors is readable on both square colors. Pieces are the cburnett set with no shadows. Board, pieces, sidebar, buttons, and dialogs read as one product with the same palette and type. Text is not clipped and no horizontal scrollbar appears. |
| LK-08 | W | Resize the window from 1440 wide down to 860, then 859, then back. | Breakpoint. | At 860 wide the layout is still side by side (board 488px at 900 tall). At 859 it is stacked. The switch is immediate with no animation. The move list, board position, and status are unchanged. |
| LK-09 | W | Check `src/assets/pieces/` (or wherever the piece set is stored). | Piece license. | A LICENSE file for the cburnett set sits next to the piece assets, separate from app code. |

### 3.9 Accessibility basics (A11Y)

| ID | Run on | Steps | Pass when |
| --- | --- | --- | --- |
| A-01 | W | Press Tab through the sidebar buttons and the setup dialog controls. | Each control shows a visible focus outline (light yellow, 2px, offset). Mouse clicks do not show the outline. |
| A-02 | W | Open New game, press Tab repeatedly, then Cancel. | Focus stays inside the dialog while it is open, and returns to **New game** after closing. |
| A-03 | W | Inspect the status block. | It has `aria-live="polite"`. |

### 3.10 Full games (FULL)

| ID | Run on | Setup | Steps | Pass when |
| --- | --- | --- | --- | --- |
| F-01 | W (Chromium and Firefox) | Custom names, **Flip** | Play a complete game of at least 25 full moves to a **checkmate** of your choice, mixing click-click and drag about half and half. Include at least one capture and one castle. Then press New game and start again. | Every intended legal move is accepted the first time and recorded with the right SAN, no illegal move is ever accepted, and the board flips after each move. Status, badges, and highlight always agree. The end shows the correct winner and `by checkmate`, the result row, and the locked board. New game starts cleanly. Paste the final move list text into the results. |
| F-02 | N | Default names, **Fixed** | Play a complete game of at least 20 full moves, ending by **draw offer accepted** or **resignation** (your choice), mixing click and drag. | Same as F-01, using the matching result text, on the narrow layout with no horizontal scroll and the board always square. |

## 4. Not tested in this slice

These are deferred or out of scope. Do not report their absence as a failure. Do report it if any of them **appear**:

- Clocks of any kind (blitz, rapid, custom, increment, timeout, pause). Time control shows only **Untimed**.
- Persistence: a page refresh returns to the setup dialog with a new game. That is expected in this slice.
- Engine analysis, evaluation bar, suggested lines, arrows, and "engine unavailable" messages.
- Victory, defeat, and tie result animations.
- Keyboard board play, touch-specific behavior, the board-flip button, move-list navigation, draw claims, right-click annotations, sound, takebacks, premoves, PGN export, and theme choices.

## 5. Results template

Copy this into the playtest task. Record one row per scenario per viewport (W+N scenarios get two rows).

```markdown
**Build**: commit `<sha>` · served with `<command>` · `npm run test:coverage`: <xx.x>% lines, exit <code>
**Browsers**: Chromium <version>; Firefox <version> (F-01, LK-01 only)
**Engine**: not part of this slice

| Scenario | Viewport | Result | Notes / evidence |
| --- | --- | --- | --- |
| SET-01 | W | pass / fail / blocked | screenshot SET-01-W.png |
| SET-01 | N | | |
| … | | | |

### Failures
For each fail: scenario ID, viewport, steps to reproduce, expected (quote this plan), actual, and evidence.

### Quality notes
Feel of moves (snappy? any lag?), visual cohesion, anything the plan didn't cover but a player would notice.
```

A slice passes when every scenario is **pass**, except E-05b, which may be **blocked** if E-05a passes. Any **fail** is reported on the playtest task, with the fix routed to the implementation owner.
