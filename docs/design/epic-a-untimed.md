# Design: untimed game — board, setup, mouse, move list

Epic A ([#7](https://github.com/waigore/simplechess/issues/7)), task [#8](https://github.com/waigore/simplechess/issues/8).

This is the design for the first playable slice: two people play a complete untimed game with the mouse on one screen. It refines [spec/01-gameplay.md](../../spec/01-gameplay.md) and [spec/02-presentation.md](../../spec/02-presentation.md). Where this document and `spec/` disagree, `spec/` wins and this document needs fixing.

## 1. Screen layout

One screen. The board is always square and is the visual focus. There is no app header.

### Wide (viewport width ≥ 860px)

```text
┌──────────────────────────────────────────────┐
│  ┌────────────────────────┐  ┌────────────┐  │
│  │                        │  │ Upper plate│  │  ← aligned with board top
│  │                        │  ├────────────┤  │
│  │                        │  │ Status     │  │
│  │         Board          │  ├────────────┤  │
│  │                        │  │ Actions    │  │
│  │                        │  ├────────────┤  │
│  │                        │  │ Move list  │  │  ← fills remaining height, scrolls
│  │                        │  ├────────────┤  │
│  │                        │  │ Lower plate│  │  ← aligned with board bottom
│  └────────────────────────┘  └────────────┘  │
└──────────────────────────────────────────────┘
```

- Page padding 16px. Gap between board and sidebar 16px. Board + sidebar are centered horizontally as one group.
- Sidebar width 320px.
- Board side = `min(100vh − 32px, 100vw − 320px − 48px, 960px)`, rounded down to a multiple of 8 so every square is a whole number of pixels.
- Sidebar height equals board height. The move list absorbs leftover height and scrolls internally; nothing else in the sidebar scrolls.
- Reserved, empty in this slice: a 24px-wide slot to the left of the board for the evaluation bar (engine epic). Do not render it now; the layout just has to allow inserting it later without restructuring.

### Narrow (viewport width < 860px)

```text
┌──────────────────┐
│      Board       │
├──────────────────┤
│ Upper plate      │
│ Status           │
│ Actions          │
│ Move list        │  ← max-height 40vh (min 120px), scrolls internally
│ Lower plate      │
└──────────────────┘
```

- Page padding 8px. Board side = `min(100vw − 16px, 640px)`, rounded down to a multiple of 8, centered.
- The sidebar is stacked directly under the board, same width as the board, same order as wide. The page scrolls vertically if needed; the board is at the top and fully visible on load.
- Crossing the breakpoint (window resize) re-lays out immediately with no animation and no game-state change.

### Sidebar order and orientation

Top to bottom: **upper nameplate, status, actions, move list, lower nameplate**.

The upper nameplate always belongs to the color shown at the top of the board; the lower nameplate to the color at the bottom. When the board flips, the two nameplates swap in the same frame as the board.

## 2. Setup flow

### When setup appears

- **Initial load**: the setup dialog opens over the start position. There is no saved game in this slice, so every load starts here. The dialog has no Cancel; Escape does nothing.
- **"New game" button**: opens the same dialog, pre-filled with the current game's names and orientation. A name equal to its color default ("White" for White, "Black" for Black) pre-fills as an empty field so the placeholder shows; starting with it blank gives the same name. It has **Cancel** (and Escape) which closes the dialog and leaves the current game exactly as it was.

### Dialog

Modal, centered over the viewport, width `min(420px, 100vw − 32px)`, with a backdrop `rgba(0, 0, 0, 0.55)` over the page. Focus goes to the White name field when it opens and is trapped in the dialog.

Fields, in order:

| Field | Control | Default | Notes |
| --- | --- | --- | --- |
| White name | text input, placeholder "White" | empty | max 24 chars; trimmed on start |
| Black name | text input, placeholder "Black" | empty | max 24 chars; trimmed on start |
| Time control | radio group, one option: **Untimed** (selected) | Untimed | The clocks epic adds Blitz / Rapid / Custom to this same group. Do not show disabled or "coming soon" options now. |
| Board orientation | radio group: **Side to move at the bottom** / **White stays at the bottom** | Side to move at the bottom | |

Buttons: **Cancel** (secondary; only when opened from "New game") and **Start game** (primary). Enter in a text field activates Start game.

A name that is blank or whitespace-only after trimming becomes "White" or "Black" for that color.

### Confirmation when a game is underway

A game is **underway** when at least one move has been played and there is no result yet.

If a game is underway when **Start game** is pressed, the dialog content is replaced by a confirm step:

> **Abandon the current game?**
> The game between {White label} and {Black label} will be lost.
>
> [Back] [Abandon and start]

- **Back** returns to the filled-in setup form, unchanged.
- **Abandon and start** (danger style) starts the new game.
- Cancel/Escape at the confirm step behaves like Back.

If no move has been played, or the game already has a result, Start game starts the new game immediately with no confirm step.

Starting a game resets: position to the standard start, move list empty, no last-move highlight, no selection, no pending draw offer, no result. White moves first.

## 3. Board orientation

- **White stays at the bottom**: White's home rank is at the bottom for the whole game.
- **Side to move at the bottom** (default): White is at the bottom at the start. After every committed move (after its animation settles, and after promotion is chosen) the board flips so the new side to move is at the bottom. The flip is instant (no rotation tween). It continues to apply to the final position: after a game-ending move the side that would move next is at the bottom.
- Coordinates, nameplates, and the promotion picker all follow the current orientation.

## 4. Turn and result status

### Player labels

`label(color)` is used everywhere a player is named in text:

- If the player's name equals that color's default ("White" for White, "Black" for Black): just the color, e.g. `White`.
- Otherwise: `{name} ({Color})`, e.g. `Alice (White)`.

### Status block

Two lines, announced to assistive tech (`aria-live="polite"`):

- **Primary** — 18px, weight 600, `--text`.
- **Secondary** — 14px, weight 400, `--text-muted`. Omitted when empty.

| State | Primary | Secondary |
| --- | --- | --- |
| In progress | `{label(toMove)} to move` | — |
| In progress, side to move in check | `{label(toMove)} to move` | `Check` |
| In progress, draw offer just declined | `{label(toMove)} to move` | `Draw offer declined` (cleared on the next move) |
| Draw offer pending | `{label(offerer)} offers a draw` | `{label(opponent)}, accept or decline` |
| Checkmate | `{label(winner)} wins` | `by checkmate` |
| Resignation | `{label(winner)} wins` | `{label(loser)} resigned` |
| Stalemate | `Draw` | `by stalemate` |
| Threefold repetition | `Draw` | `by threefold repetition` |
| Fifty-move rule | `Draw` | `by the fifty-move rule` |
| Insufficient material | `Draw` | `by insufficient material` |
| Agreed draw | `Draw` | `by agreement` |

If check and a declined offer apply at once, the secondary line reads `Check · Draw offer declined`.

Threefold repetition, the fifty-move rule, and insufficient material end the game automatically as soon as the rules library reports them; there is no "claim" button. When more than one ending applies at once, checkmate wins over all draws; among draws use the order in the table above.

### Nameplates

Each nameplate is a 48px-high row:

```text
[ king icon ] {name}            [badge]  [clock slot]
              {Color}
```

- King icon: 24px, the piece set's king in that color.
- Name: 15px, weight 600, truncated with an ellipsis. Under it the color word ("White" / "Black") at 12px, `--text-muted`. The color word is shown even when the name is the default, so color is never conveyed by the icon alone.
- **Clock slot**: reserved, right-aligned, empty and zero-width in untimed games. The clocks epic fills it.
- **Badge** (text pill, 12px, weight 600):
  - In progress, side to move: `To move`.
  - Game over, winner: `Winner`. Loser: no badge.
  - Game over, draw: `Draw` on both.

Highlight for the side to move (in progress only): background `--panel-raised` and a 3px left border in `--accent`, plus the `To move` badge. The other plate has background `--panel` and a transparent 3px left border (so nothing shifts). After the game ends, neither plate is highlighted; only the badges change.

The three cues (status text, badge text, plate highlight) always agree.

## 5. Actions

The action row sits under the status. Buttons are 36px high, 14px text, full-width split evenly.

| State | Buttons |
| --- | --- |
| In progress | **Resign**, **Offer draw**, **New game** |
| Draw offer pending | replaced by the draw-offer panel (below); **New game** still shown |
| Game over | **New game** only, primary style |

**Resign** and **Offer draw** always act for the side to move; the status above names who that is.

### Resign

1. Side to move presses **Resign**. Allowed at any point while the game is in progress, including before the first move.
2. Confirm dialog: **"{label(toMove)}, resign this game?"** with [Cancel] [Resign] (danger style). Escape/Cancel closes it with no change.
3. On Resign: the game ends; status `{label(opponent)} wins` / `{label(toMove)} resigned`.

### Draw offer

1. Side to move presses **Offer draw**. Allowed any time the game is in progress, except right after that same side's offer was declined in the current turn (button disabled until they move).
2. The action row is replaced by the offer panel: **Accept draw** (primary) and **Decline** (secondary). The status shows `{label(offerer)} offers a draw` / `{label(opponent)}, accept or decline`.
3. While an offer is pending, the board is locked: no piece can be picked up, selected, or moved, and an existing selection is cleared. So a move can never be played while an offer is pending; the opponent must accept or decline first.
4. **Accept draw**: game ends, `Draw` / `by agreement`.
5. **Decline**: panel closes, the action row returns, the same side is still to move. Secondary status shows `Draw offer declined` until the next move. **Offer draw** is disabled until that side has moved.
6. **New game** during a pending offer runs the normal setup flow. Cancel leaves the offer pending.

## 6. Mouse interaction

Use pointer events on the board, so mouse works and touch works the same way. Set `touch-action: none` on the board so dragging never scrolls the page. Right-click does nothing in this slice.

Only pieces of the side to move are interactive, and only while the game is in progress, no offer is pending, and no dialog or promotion picker is open. The cursor is `grab` over those pieces, `grabbing` while dragging, and default elsewhere.

### States and transitions

| # | State / event | Result |
| --- | --- | --- |
| 1 | **Idle**, pointer down on own piece | Piece becomes **selected**: origin square gets the selection highlight, legal-destination markers appear in the same frame. |
| 2 | Selected (pointer still down), pointer moves > 4px | **Dragging**: piece lifts out of the square and its center follows the pointer exactly, every frame, with no easing. The origin square keeps the selection highlight and shows the piece as a ghost at 30% opacity. A legal square under the pointer gets the drag-hover tint. |
| 3 | Selected (pointer still down), pointer up without moving > 4px | Stays **selected** (click mode). |
| 4 | Selected, pointer down on a legal destination | Move commits **on pointer down**, not on release, with the committed-move animation (§10). The following pointer up does nothing. |
| 5 | Selected, pointer down on the same piece | Pressed again, as in row 1. If the pointer moves > 4px before release, it drags (row 2). If it is released without moving > 4px, deselect: markers disappear. |
| 6 | Selected, pointer down on another own piece | That piece becomes selected instead (same as row 1, including starting a drag if the pointer moves). |
| 7 | Selected, pointer down on an illegal square (empty or an opponent piece that isn't a legal capture) or outside the board, Escape, or the window loses focus | Deselect. No move. |
| 8 | Dragging, release on a legal destination | Move commits. The piece snaps to the destination square center with no tween (it is already under the pointer); other pieces involved (captured piece, castling rook, en passant pawn) animate per §10. |
| 9 | Dragging, release on the origin square | Piece is put back instantly and **stays selected**, so the player can finish with a click. |
| 10 | Dragging, release on an illegal square or off the board | Piece returns to its origin with the put-back animation (§10). Deselect. Nothing is recorded. |
| 11 | Dragging, Escape, pointer cancel, or the window loses focus | Same as row 10. |
| 12 | Idle, pointer down on an opponent piece | Nothing: no selection, no markers, no drag. |
| 13 | Idle, pointer down on an empty square | Nothing. |
| 14 | Game over, offer pending, dialog open, or picker open | No piece can be picked up. |

A legal capture of an opponent piece in rows 4 and 8 is just a legal destination; rows 7, 10, and 12 only apply when the square isn't a legal destination for the selected piece.

### Legal-destination markers

Shown only while a piece is selected or dragged, for every legal destination of that piece:

- **Empty square**: a centered filled dot, diameter 28% of the square, color `--move-dest`.
- **Capture square** (including the en passant target square): a ring that hugs the square's edge: a radial gradient that is transparent inside 80% of the square and `--move-dest` outside it. The piece on the square stays fully visible.
- **Drag hover** over a legal square: whole-square tint `--drag-hover`, which replaces the dot/ring on that square.

Markers sit above the square color and highlights, below the pieces (except the dragged piece, which is above everything).

## 7. Promotion

When a pawn's move to the last rank is legal (by click or by drop):

1. The pawn is shown on the promotion square (normal move animation for click; already there for drag). Any piece it captures is removed. The move is **not** committed yet: the move list, status, and orientation don't change.
2. The rest of the board dims with an overlay `rgba(0, 0, 0, 0.45)`.
3. A picker appears in the promotion square's file: four square cells, each the size of a board square, starting on the promotion square and running toward the center of the board. Order from the promotion square inward: **Queen, Knight, Rook, Bishop**, in the mover's color. Cells use `--picker-bg` with a 50% radius; hovered cell uses `--picker-hover`. It is always inside the board, so it fits on narrow too.
4. Clicking a cell commits the move with that piece. The pawn is replaced by the chosen piece instantly, then the move is recorded and play continues (including the orientation flip). The Queen cell opens under the pointer, so the press or release that opened the picker never chooses a cell; only a new click does.
5. **Cancel**: clicking anywhere outside the four cells (on the dimmed board or elsewhere), pressing Escape, or the window losing focus cancels. The pawn goes back to its origin with the put-back animation, any captured piece reappears, nothing is recorded, and it is still the same side to move with no selection.
6. The cells are buttons with accessible names ("Promote to queen", etc.). Focus moves to Queen when the picker opens; Tab cycles the four cells; Enter selects.

## 8. Move list

- Two columns of half-moves under a move number, one row per full move:

  ```text
   1.  e4      e5
   2.  Nf3     Nc6
   3.  Bb5     a6
  ```

- Number column: right-aligned, `--text-muted`, followed by a period. White's move in the second column, Black's in the third. A row with only White's move leaves the third column empty.
- SAN exactly as the rules library produces it with English piece letters (K, Q, R, B, N; no figurines): captures `x`, castling `O-O` / `O-O-O`, promotion `=Q`, check `+`, mate `#`.
- 14px tabular-figure font, row height 28px. Alternate row backgrounds `--panel` / `--panel-alt`.
- The most recent half-move has a `--panel-raised` background and weight 600.
- When the game ends, append a final row with the score, centered: `1-0`, `0-1`, or `½-½`.
- Empty state (before the first move): `No moves yet` in `--text-muted`.
- After every move (and when the result row is added) the list scrolls so the latest row is visible. Scrolling is instant, not smooth.
- Record only: entries are not buttons, have no hover state, use the default cursor, and clicking them does nothing.

## 9. Look

### Palette

Use these as CSS custom properties. One theme only.

| Token | Value | Use |
| --- | --- | --- |
| `--bg` | `#1F1E1B` | page background |
| `--panel` | `#2A2926` | sidebar sections, inactive nameplate, move list rows |
| `--panel-alt` | `#26251F` | alternate move-list row |
| `--panel-raised` | `#3A3833` | active nameplate, latest move, secondary buttons |
| `--border` | `#3D3B37` | 1px separators between sidebar sections |
| `--text` | `#E8E6E3` | primary text |
| `--text-muted` | `#A8A5A0` | secondary text, move numbers |
| `--accent` | `#81B64C` | primary buttons (text `#1F1E1B`), active-plate border, badges |
| `--danger` | `#C94A3F` | danger buttons (text `#FFFFFF`) |
| `--focus` | `#F6F68A` | 2px focus outline, 2px offset |
| `--sq-light` | `#EEEED2` | light squares |
| `--sq-dark` | `#769656` | dark squares |
| `--last-move` | `rgba(255, 255, 51, 0.45)` | overlay on last move's from and to squares |
| `--selected` | `rgba(20, 85, 30, 0.50)` | overlay on the selected piece's square |
| `--move-dest` | `rgba(20, 85, 30, 0.50)` | legal-move dot and capture ring |
| `--drag-hover` | `rgba(20, 85, 30, 0.30)` | legal square under a dragged piece |
| `--check` | radial gradient, `#E5484D` at center fading to transparent at 90% | on the king's square when that king is in check (including checkmate) |
| `--picker-bg` | `#E8E6E3` | promotion picker cell |
| `--picker-hover` | `#81B64C` | hovered promotion picker cell |

Layering on a square, bottom to top: square color, last-move overlay, check, selected overlay, markers / drag hover, coordinates, piece.

Buttons: 6px radius, no shadows. Sidebar sections have 6px radius corners at the top and bottom of the sidebar only. The board has square corners and no border.

Typography: system UI stack (`system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`). Use `font-variant-numeric: tabular-nums` in the move list.

### Pieces

One set: **cburnett** (Colin M.L. Burnett), the familiar Staunton-style SVG set used by Lichess and Wikipedia (Wikimedia Commons `Chess_{k,q,r,b,n,p}{l,d}t45.svg`). It is licensed under GFDL / BSD / GPL; ship it under the BSD terms with its license file next to the assets (for example `src/assets/pieces/cburnett/LICENSE`), separate from application code. The coder should confirm the license text from the source page when importing. White pieces have a black outline and black pieces have light details, so both stay readable on both square colors.

Pieces fill the square (the SVG's own padding gives the margin). No shadows.

### Coordinates

Always shown, inside the board:

- Rank numbers in the top-left corner of each square in the leftmost file.
- File letters in the bottom-right corner of each square in the bottom rank.
- They follow orientation: with Black at the bottom, files read h→a left to right and ranks 1→8 top to bottom.
- Font size 14% of the square side, clamped to 10–16px, weight 600, 2px inset from the corner.
- Color is the opposite square color: `--sq-dark` on light squares, `--sq-light` on dark squares.
- Not selectable and ignore pointer events.

## 10. Motion

| Motion | Duration | Easing |
| --- | --- | --- |
| Committed move (click-to-move): piece slides from origin to destination | 150ms | `cubic-bezier(0.2, 0, 0, 1)` (fast out, no overshoot) |
| Drag drop on a legal square: dragged piece to square center | 0ms (snap) | — |
| Put-back (illegal drop, off board, cancelled drag, cancelled promotion) | 120ms | same |
| Captured piece (normal capture, click) | fades 1 → 0 over the same 150ms as the mover, removed when it lands | linear |
| Captured piece (normal capture, drag) | removed instantly on drop | — |
| Castling rook | slides at the same time and duration as the king (150ms), for click or drag | same as committed move |
| En passant captured pawn | fades 1 → 0 over 150ms, for click or drag, so the capture on a different square is visible | linear |
| Board flip (side-to-move orientation) | instant, after the move animation settles | — |
| Highlights, markers, badges, status text | instant | — |
| Dialogs and promotion picker | instant open/close | — |

Rules:

- Moves settle at once: no bounce, no overshoot.
- Input is never blocked by an animation. If the next pointer down happens while a move is still animating, the animation jumps to its end state first. The press applies to the square the player saw when pressing; a pending side-to-move flip happens right after.
- Dragging is direct manipulation, not an animation: the piece follows the pointer every frame with no smoothing, even under reduced motion.
- **Reduced motion** (`prefers-reduced-motion: reduce`): every tween above becomes 0ms. Committed moves, captures, castling, en passant, and put-back show the end position at once. Dragging still tracks the pointer.

## 11. Accessibility basics

- The status block is the text source of truth for turn and result and is `aria-live="polite"`.
- Every button, input, radio, and picker cell has a visible focus outline (`--focus`, 2px, offset 2px) when focused by keyboard (`:focus-visible`).
- Dialogs trap focus and return focus to the button that opened them when they close.
- Text contrast: `--text` and `--text-muted` on `--panel` and `--panel-raised` are ≥ 4.5:1; button text on `--accent` and `--danger` is ≥ 4.5:1.
- Color is never the only signal: turn uses text + badge + highlight; check uses the status "Check" plus the king-square highlight and `+` in the move list; results use text.
- Board play is mouse/pointer only, as in the spec. Keyboard board play is not in scope.

## 12. Deferred to later epics (leave seams, do not build)

| Item | Epic | Seam to leave |
| --- | --- | --- |
| Clocks: blitz, rapid, custom, increment, timeout, pause | Clocks & saving | Time-control radio group in setup; clock slot in each nameplate; "timeout" as a future result reason |
| Saving and restoring the game and preferences | Clocks & saving | Setup reads its defaults from one place (today: hard-coded) |
| Engine analysis, evaluation bar, suggested lines, best-move arrow | Engine | Space left of the board for the eval bar; engine lines section under the move list |
| Victory, defeat, and tie animations | Visual pass | Result is a distinct state the board and sidebar render from, so an animation layer can key off it later |

## 13. Out of scope

Same as the epic: online play, accounts, chat, puzzles, variants, lessons, takebacks, premoves, sound, an engine that plays moves, opening books, PGN export, theme pickers. Also not in this slice: keyboard board play, board-flip button, move-list navigation, draw claims, arrows or right-click annotations.
