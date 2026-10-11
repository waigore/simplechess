# Architecture: untimed game — modules, state, rules adapter, interaction, seams

Epic A ([#7](https://github.com/waigore/simplechess/issues/7)), task [#14](https://github.com/waigore/simplechess/issues/14). Inputs: [design](../design/epic-a-untimed.md) (referred to as "design §n"), [playtest plan](../playtest/epic-a-untimed.md), [spec/03-platform.md](../../spec/03-platform.md), [AGENTS.md](../../AGENTS.md).

This document fixes module boundaries, state shapes, and the test plan for the untimed slice. It does not change product behavior: where it seems to, the design wins and this document needs fixing. Code snippets are binding for names and shapes, not for exact formatting.

## 1. Stack and scripts

| Concern | Choice |
| --- | --- |
| Language | TypeScript 5, `strict: true`, `noUncheckedIndexedAccess: true`, `noFallthroughCasesInSwitch: true` |
| UI | React 19 + React DOM 19, function components and hooks only |
| Build | Vite 8 with `@vitejs/plugin-react` |
| Rules | `chess.js` `^1.4.0` (BSD-2-Clause), see §3 |
| Unit tests | Vitest 5, `jsdom` environment, `@testing-library/react` + `@testing-library/user-event` for component tests |
| Coverage | `@vitest/coverage-v8` |
| Lint | ESLint 9 flat config (`eslint.config.js`): `typescript-eslint`, `eslint-plugin-react-hooks` |
| Styling | Plain CSS files next to components, tokens as CSS custom properties in `src/ui/theme.css`. No CSS-in-JS, no UI kit. |
| Node | 22 (matches CI) |

No other runtime dependencies. No router, no state library: one screen and one store (§4).

### `package.json` scripts

| Script | Command | Used by |
| --- | --- | --- |
| `dev` | `vite` | local only; never for playtest |
| `build` | `tsc -b && vite build` | CI, playtest |
| `preview` | `vite preview` (default `http://localhost:4173`) | playtest |
| `lint` | `eslint .` | CI |
| `test` | `vitest run` | local |
| `test:coverage` | `vitest run --coverage` | CI gate, playtest E-05a |

### Coverage gate

Configure Vitest in `vite.config.ts` (`test` block):

```ts
test: {
  environment: 'jsdom',
  setupFiles: ['src/test/setup.ts'],
  coverage: {
    provider: 'v8',
    include: ['src/**/*.{ts,tsx}'],
    exclude: ['src/main.tsx', 'src/**/*.d.ts', 'src/**/*.test.{ts,tsx}', 'src/test/**'],
    thresholds: { lines: 80, statements: 80, functions: 80, branches: 80 },
    reporter: ['text', 'json-summary', 'html'],
  },
},
```

Exclusions and why:

- `src/main.tsx` — three-line bootstrap (`createRoot(...).render(<App />)`); exercised by the build, not unit tests.
- `*.d.ts`, test files, `src/test/**` (setup and shared fixtures) — not product code.
- Assets (`src/assets/**`) are not `.ts/.tsx`, so `include` already leaves them out.

Nothing else is excluded. In particular components, the animator, and the pointer hook count toward coverage.

**CI**: [.github/workflows/ci.yml](../../.github/workflows/ci.yml) already runs `npm ci`, `npm run lint --if-present`, `npm run test:coverage`, and `npm run build` on every PR that touches code. Vitest exits non-zero when any threshold is missed, which fails the job. No workflow change is needed; the Coder only has to add the scripts and commit `package-lock.json`.

## 2. Module layout

```text
src/
  main.tsx                    bootstrap only
  app/
    App.tsx                   owns the store, dialogs, displayed orientation; renders GameScreen
    GameScreen.tsx            layout shell: BoardArea + Sidebar, wide/narrow
  rules/                      the ONLY importer of chess.js
    types.ts                  Square, Color, PieceType, Piece, MoveInput, MoveDetail, PositionView, RulesOutcome
    rulesGame.ts              RulesGame: thin adapter over a chess.js instance
  game/                       app-level game state (pure data + store)
    types.ts                  Setup, GameRecord, GameState, Result, DrawOffer, EndReason
    defaults.ts               default setup values (the one place setup reads defaults from)
    gameStore.ts              createGameStore(): the single source of truth + actions
    status.ts                 label(), status lines, badges, score, dialog prompts (all player-facing game text)
    orientation.ts            boardOrientation(mode, sideToMove)
    moveRows.ts               SAN list → numbered rows
  interaction/
    machine.ts                pure state machine for pick-up / select / drag / promotion
    geometry.ts               point ↔ square for a board size and orientation
    useBoardPointer.ts        DOM wiring: pointer events, capture, Escape, blur, outside-click → machine events
  motion/
    constants.ts              durations and easing from design §10
    plan.ts                   pure: move/put-back → list of tweens
    animator.ts               WAAPI executor: run, finishAll, settle callback
    useReducedMotion.ts       prefers-reduced-motion media query hook
  ui/
    theme.css                 palette tokens (design §9), base type, focus ring
    layout.ts                 computeLayout(viewport) → mode + board side
    useViewport.ts            window size hook
    board/                    Board, SquaresLayer, MarkersLayer, Coordinates, PiecesLayer, GhostsLayer, PromotionPicker, pieceAssets.ts
    sidebar/                  Nameplate, StatusBlock, ActionBar, DrawOfferPanel, MoveList
    dialogs/                  Modal (focus trap + Escape), SetupDialog, ResignDialog
  assets/pieces/cburnett/     wK.svg … bP.svg + LICENSE
  test/                       setup.ts (jsdom polyfills), fixtures.ts (move lines from the playtest plan)
```

Tests sit next to the file they test (`rulesGame.test.ts` beside `rulesGame.ts`).

### Allowed dependencies

| Module | May import | Must not import |
| --- | --- | --- |
| `rules` | `chess.js` | React, anything in `src/` outside `rules` |
| `game` | `rules` | React, `chess.js`, `ui`, `interaction`, `motion` |
| `interaction/machine.ts`, `interaction/geometry.ts` | `rules/types` | React, DOM, `chess.js`, `game/gameStore` |
| `interaction/useBoardPointer.ts` | React, `interaction/*`, `rules/types` | `chess.js` |
| `motion` | `rules/types`, `interaction/geometry` | `chess.js`, `game` |
| `ui` | React, `game` (types, `status`, `orientation`, `moveRows`), `interaction`, `motion`, `rules/types` | `chess.js`, `game/gameStore` internals |
| `app` | everything above except `chess.js` | `chess.js` |

Enforce the `chess.js` boundary with ESLint `no-restricted-imports` for every file outside `src/rules/`. Rules logic (legality, check, endings, SAN) never lives in a component or hook; components ask `PositionView` and `status.ts`.

## 3. Rules authority

**Library**: [`chess.js`](https://github.com/jhlywa/chess.js) `^1.4.0`, BSD-2-Clause, maintained, TypeScript types included. It is the only authority for legal moves, check, SAN, and rules endings. No hand-rolled move generation.

### Adapter

`rules/rulesGame.ts` wraps one mutable `Chess` instance behind a small typed class. Nothing outside `rules/` sees chess.js types.

```ts
// rules/types.ts
export type Color = 'w' | 'b';
export type PieceType = 'p' | 'n' | 'b' | 'r' | 'q' | 'k';
export type PromotionPiece = 'q' | 'n' | 'r' | 'b';
export type Square = `${'a'|'b'|'c'|'d'|'e'|'f'|'g'|'h'}${1|2|3|4|5|6|7|8}`;
export interface Piece { color: Color; type: PieceType }

export interface MoveInput { from: Square; to: Square; promotion?: PromotionPiece }

export interface MoveOption {           // one legal destination for a selected piece
  to: Square;
  capture: boolean;                     // true for en passant too (ring marker on the empty ep square)
  promotion: boolean;                   // picker needed
}

export interface MoveDetail {           // what the move list and motion need about a played move
  color: Color;
  from: Square;
  to: Square;
  piece: PieceType;
  san: string;                          // exactly chess.js SAN, e.g. "bxa8=Q+", "O-O", "Qh4#"
  captured?: { piece: Piece; square: Square };   // square differs from `to` for en passant
  rook?: { from: Square; to: Square };            // castling
  promotion?: PromotionPiece;
}

export type RulesOutcome =
  | { kind: 'checkmate'; winner: Color }
  | { kind: 'stalemate' | 'threefold' | 'fiftyMove' | 'insufficientMaterial' };

export interface PositionView {
  fen: string;
  board: ReadonlyMap<Square, Piece>;
  turn: Color;
  inCheck: boolean;
  checkedKing: Square | null;
  legal: ReadonlyMap<Square, readonly MoveOption[]>;   // only squares with ≥1 legal move; empty when game over
  halfmoveClock: number;
  outcome: RulesOutcome | null;
}
```

```ts
// rules/rulesGame.ts
export const START_FEN: string;

export class RulesGame {
  static replay(moves: readonly MoveInput[], startFen?: string): RulesGame; // throws only on a corrupt record
  play(move: MoveInput): MoveDetail | null;   // null = illegal; state unchanged; never throws to callers
  view(): PositionView;                       // cached per position; recomputed only after play()
}
```

Rules for the adapter:

- **Legal moves per square**: `view().legal` is built once per position from `chess.moves({ verbose: true })`, grouped by `from`, de-duplicated by `to` (the four promotion moves become one `MoveOption` with `promotion: true`). `capture` is `isCapture() || isEnPassant()`: in chess.js 1.4, `isCapture()` is `false` for en passant, and the ep square still needs a ring (R-05).
- **Applying a move**: `play()` checks the input against `legal` first and returns `null` on a miss (chess.js 1.x throws on illegal input; the adapter must not let that escape). A promotion move without `promotion` is illegal; a non-promotion move with `promotion` is illegal.
- **SAN**: taken from the chess.js `Move.san` returned by `move()`. The game store appends `MoveDetail` to its own list. **Never call `chess.history()`** during play: it undoes and redoes the whole game on every call.
- **Secondary pieces**: `captured.square` is the `to` square, except en passant (`isEnPassant()`), where it is the `to` file on the mover's `from` rank. `rook` is set for `isKingsideCastle()` / `isQueensideCastle()` (h→f or a→d on the king's rank).
- **Check**: `inCheck` from `chess.isCheck()`; `checkedKing` is that side's king square (also set on checkmate, for the red highlight).
- **Outcome**, in this priority order (design §4): `isCheckmate()` → `checkmate` (winner = the side that just moved); `isStalemate()` → `stalemate`; `isThreefoldRepetition()` → `threefold`; `isDrawByFiftyMoves()` → `fiftyMove`; `isInsufficientMaterial()` → `insufficientMaterial`. Automatic: no claim step anywhere.
- **`startFen`** exists so unit tests can build positions directly (the fifty-move test needs half-move clock 99). App code always replays from `START_FEN`.

Resignation and agreed draw are **not** rules outcomes; they live in the game layer (§4).

### Performance

Measured on chess.js 1.4.0 (Node 22): replaying a 102-ply game from the start, then generating moves, costs about **33 ms**. That is too slow to do on every move. So:

- During play, one `RulesGame` lives inside the store and is advanced with `play()` (well under 1 ms).
- `RulesGame.replay()` is used only to start a game and (later) to restore one.
- A test asserts that replaying a record gives the same `PositionView` and history as playing it move by move (§10), so the two paths cannot drift.

## 4. Game state model

### Types

```ts
// game/types.ts
export type OrientationMode = 'sideToMove' | 'whiteBottom';
export type TimeControl = { kind: 'untimed' };          // clocks epic widens this union

export interface Setup {
  names: Record<Color, string>;                        // already trimmed; blank resolved to "White"/"Black"
  timeControl: TimeControl;
  orientation: OrientationMode;
}

export type DrawOffer =
  | { state: 'none' }
  | { state: 'pending'; by: Color }
  | { state: 'declined'; by: Color };                  // shown until the next move; blocks re-offer by `by`

export type Termination = { kind: 'resignation'; by: Color } | { kind: 'agreement' };

export interface GameRecord {                          // serializable source of truth (plain JSON)
  setup: Setup;
  moves: MoveInput[];
  termination: Termination | null;                     // app-level endings only
  drawOffer: DrawOffer;
}

export type EndReason =
  | 'checkmate' | 'resignation'
  | 'stalemate' | 'threefold' | 'fiftyMove' | 'insufficientMaterial' | 'agreement';
export interface Result { winner: Color | null; reason: EndReason }   // winner null = draw

export interface GameState {                           // immutable snapshot the UI renders from
  record: GameRecord;
  position: PositionView;
  history: readonly MoveDetail[];                      // one per record.moves entry
  lastMove: { from: Square; to: Square } | null;
  result: Result | null;                               // derived: rules outcome, else termination
  underway: boolean;                                   // history.length > 0 && result === null
}
```

### Single source of truth

`GameRecord` is the source of truth. Everything else in `GameState` is derived from it: `position` and `history` from `record.moves` replayed from the standard start (spec/03 persistence seam), and `result` from `position.outcome ?? record.termination`. When a game ends, `position.legal` is replaced by an empty map, so the board has nothing to pick up.

### Store

`game/gameStore.ts` owns the record and its private `RulesGame`. React reads it with `useSyncExternalStore`. It is an external store, not `useReducer`, because the `RulesGame` is mutable: StrictMode double-invokes reducers, which would apply a move twice.

```ts
export interface GameStore {
  getState(): GameState;                  // same object until the next change
  subscribe(listener: () => void): () => void;
  newGame(setup: Setup): void;            // fresh record, RulesGame.replay([])
  move(input: MoveInput): MoveDetail | null;
  resign(): void;                         // side to move resigns
  offerDraw(): void;                      // side to move offers
  acceptDraw(): void;
  declineDraw(): void;
}
export function createGameStore(initial?: GameRecord): GameStore;  // initial → RulesGame.replay(initial.moves)
```

Guards (each refused action is a no-op that returns `null` or does nothing, never throws):

| Action | Allowed when | Effect |
| --- | --- | --- |
| `move` | no result, `drawOffer.state !== 'pending'`, move legal | append to `moves` and `history`; `drawOffer` → `none` |
| `resign` | no result, no pending offer | `termination = { kind: 'resignation', by: turn }` (allowed before the first move) |
| `offerDraw` | no result, `drawOffer` is `none`, or `declined` by the other side | `drawOffer = { state: 'pending', by: turn }` |
| `acceptDraw` | offer pending | `termination = { kind: 'agreement' }`, `drawOffer` → `none` |
| `declineDraw` | offer pending | `drawOffer = { state: 'declined', by }` |
| `newGame` | always | replaces the record |

Every change produces a new `GameState` object; unchanged parts (for example `history` when only the offer changes) keep their identity so memoized components skip work.

### Setup defaults

`game/defaults.ts` exports `defaultSetup(): Setup` (`names` White/Black, untimed, `sideToMove`). The initial dialog and the first store read from it. This is the one place the persistence epic will change to read saved preferences.

`resolveSetup(form)` (also in `defaults.ts`) trims names, caps them at 24 characters, and substitutes the color default for blanks. The "New game" dialog pre-fills each name field with the stored name, or with an empty field when the stored name equals the color default (so the placeholder shows).

### UI-only state (held in `App`, not in the store)

- `dialog: null | { kind: 'setup'; cancellable: boolean } | { kind: 'resign' }`. The setup dialog's form vs confirm step is local to `SetupDialog`.
- `displayedOrientation: Color` — the color at the bottom of the board as shown. It lags the store by one animation: it is set to `boardOrientation(setup.orientation, position.turn)` when the animator reports the move settled (§7), on `newGame`, and immediately when there is nothing to animate.
- Interaction state (§5) lives in `Board` via `useReducer` (the machine is pure).

## 5. Interaction state machine

`interaction/machine.ts` is a pure function. `useBoardPointer.ts` translates DOM events into machine events and carries out the returned effects.

```ts
type Point = { x: number; y: number };    // client px

export type InteractionState =
  | { kind: 'idle' }
  | { kind: 'pressed'; from: Square; pointerId: number; start: Point; wasSelected: boolean }
  | { kind: 'selected'; from: Square }
  | { kind: 'dragging'; from: Square; pointerId: number; hover: Square | null }
  | { kind: 'promoting'; from: Square; to: Square; via: 'click' | 'drag' };

export type InteractionEvent =
  | { type: 'down'; square: Square | null; point: Point; pointerId: number }  // square null = off board
  | { type: 'move'; square: Square | null; point: Point; pointerId: number }
  | { type: 'up'; square: Square | null; point: Point; pointerId: number }
  | { type: 'cancel' }                         // Escape, pointercancel, window blur, outside-board pointerdown
  | { type: 'choosePromotion'; piece: PromotionPiece }
  | { type: 'reset' };                        // lock engaged, new game, external state change

export interface InteractionContext {
  locked: boolean;                            // result, pending offer, or any dialog open
  turn: Color;
  board: ReadonlyMap<Square, Piece>;
  legal: ReadonlyMap<Square, readonly MoveOption[]>;
}

export type Effect =
  | { kind: 'commit'; move: MoveInput; via: 'click' | 'drag' | 'picker' }
  | { kind: 'putBack'; from: Square; dropPoint: Point | null }   // null = instant (no tween)
  | { kind: 'previewPromotion'; from: Square; to: Square; via: 'click' | 'drag' };

export const DRAG_THRESHOLD_PX = 4;
export function transition(s: InteractionState, e: InteractionEvent, ctx: InteractionContext):
  { state: InteractionState; effects: Effect[] };
```

"Own piece" = a piece of `ctx.turn`. "Legal destination" = an entry in `ctx.legal.get(from)`. If `ctx.locked`, every event returns `idle` with no effects (design §6 row 14).

### Transitions (design §6 row numbers)

| From | Event | Condition | To | Effects |
| --- | --- | --- | --- | --- |
| idle | down | own piece | pressed (`wasSelected: false`) | — (row 1: selection + markers render from `pressed`) |
| idle | down | opponent piece, empty, off board | idle | — (rows 12, 13) |
| pressed | move | distance from `start` > 4px | dragging | — (row 2) |
| pressed | up | `wasSelected: false` | selected | — (row 3) |
| pressed | up | `wasSelected: true` | idle | — (row 5: click on the selected piece deselects) |
| selected | down | legal destination, not promotion | idle | commit `via: 'click'` (row 4) |
| selected | down | legal destination, promotion | promoting `via: 'click'` | previewPromotion (§7 of design) |
| selected | down | the selected piece | pressed (`wasSelected: true`) | — (drag can start again; up without drag = row 5) |
| selected | down | another own piece | pressed (`wasSelected: false`) on that square | — (row 6) |
| selected | down | anything else, off board | idle | — (row 7) |
| selected / pressed | cancel | — | idle | — (row 7 Escape / outside) |
| dragging | move | — | dragging, `hover` = square if legal else null | — (drag-hover tint) |
| dragging | up | legal destination, not promotion | idle | commit `via: 'drag'` (row 8) |
| dragging | up | legal destination, promotion | promoting `via: 'drag'` | previewPromotion |
| dragging | up | origin square | selected | putBack `dropPoint: null` (row 9: instant) |
| dragging | up | illegal or off board | idle | putBack with the drop point (row 10) |
| dragging | cancel | — | idle | putBack with the last pointer point (row 11) |
| promoting | choosePromotion | — | idle | commit `{from, to, promotion}` `via: 'picker'` |
| promoting | down outside picker, cancel | — | idle | putBack from `to` (pawn slides back; captured piece reappears) |
| any | reset | — | idle | — |

Events whose `pointerId` differs from the active pointer are ignored. A capture is just a legal destination; the opponent-piece rows only apply when the square is not one.

### Pointer handling (`useBoardPointer`)

- Listen to `pointerdown` on the board element. Ignore non-primary pointers and any button other than the main one (`button !== 0`), so right-click does nothing.
- On a `pointerdown` that starts `pressed`, call `board.setPointerCapture(pointerId)`. `pointermove`, `pointerup`, and `pointercancel` then arrive at the board even off the board; `lostpointercapture` is treated as `cancel` while dragging.
- Map points to squares with `geometry.squareAt(point, boardRect, displayedOrientation)`; a point outside the rect is `null` (off board). Read the rect once on `pointerdown`.
- While `selected` or `promoting`, a capture-phase `pointerdown` listener on `document` sends `cancel` when the target is outside the board, and outside the picker when promoting (row 7, design §7 cancel). Clicks on the dimmed board outside the picker are handled by the picker overlay and also send `cancel`.
- While not idle, a `keydown` listener for Escape sends `cancel`; `window` `blur` sends `cancel`.
- The dragged piece's position is written straight to its element (`style.transform`) in the `pointermove` handler, with no React render and no easing, so it tracks every frame. Only `hover` changes go through React state, and only when the hovered square changes.
- Before handling any `pointerdown`, call `animator.finishAll()` (§7). The square is resolved with the orientation the player saw when they pressed; the flip that `finishAll` triggers happens after.
- Board CSS: `touch-action: none; user-select: none`. Pieces are `div`s with a CSS `background-image`, not `<img>`, so the browser never starts a native image drag.
- Cursor: `grab` on pieces of the side to move when unlocked, `grabbing` on the board while dragging, default otherwise.

### Lock

`App` computes `locked = result !== null || drawOffer.state === 'pending' || dialog !== null`. When `locked` turns true, `Board` dispatches `reset`, which clears any selection (playtest E-12). `promoting` keeps the rest of the UI usable; the picker itself is the only target on the board.

## 6. UI composition

```text
App                                   store, dialog state, displayedOrientation
├─ GameScreen  (mode, boardSize)      CSS grid: wide = [board | sidebar], narrow = stacked
│  ├─ BoardArea                       flex row; reserved eval-bar slot position (not rendered)
│  │  └─ Board                        size, orientation, position, lastMove, locked, interaction
│  │     ├─ SquaresLayer              64 squares: color, last-move, check, selected overlays
│  │     ├─ MarkersLayer              dots / rings / drag-hover tint
│  │     ├─ Coordinates               rank numbers (left file), file letters (bottom rank)
│  │     ├─ PiecesLayer               one absolutely positioned element per occupied square
│  │     ├─ GhostsLayer               fading captured pieces during a tween
│  │     ├─ DraggedPiece              above everything while dragging
│  │     └─ PromotionPicker           dim overlay + 4 cells in the promotion file
│  └─ Sidebar                         same width as board on narrow, 320px on wide
│     ├─ Nameplate (upper)            color = opposite of displayedOrientation
│     ├─ StatusBlock                  aria-live="polite"
│     ├─ ActionBar | DrawOfferPanel   by drawOffer/result
│     ├─ MoveList                     (engine-lines slot position after it, not rendered)
│     └─ Nameplate (lower)            color = displayedOrientation
├─ SetupDialog  (Modal)               form step ↔ confirm step
└─ ResignDialog (Modal)
```

Stacking order inside `Board` matches design §9 layering: square color → last-move → check → selected → markers/drag-hover → coordinates → pieces → dragged piece → picker overlay.

### Board sizing and breakpoint

`ui/layout.ts`:

```ts
export const BREAKPOINT = 860;
export function computeLayout(vw: number, vh: number): { mode: 'wide' | 'narrow'; boardSize: number } {
  const floor8 = (n: number) => Math.max(0, Math.floor(n / 8) * 8);
  return vw >= BREAKPOINT
    ? { mode: 'wide', boardSize: floor8(Math.min(vh - 32, vw - 320 - 48, 960)) }
    : { mode: 'narrow', boardSize: floor8(Math.min(vw - 16, 640)) };
}
```

`useViewport()` reads `window.innerWidth/innerHeight` and updates on `resize` (no debounce, so the breakpoint switch is immediate). Square side = `boardSize / 8` (a whole number because `boardSize` is a multiple of 8). The board size is passed as an inline width/height; everything inside is positioned in square units. Wide sidebar height equals `boardSize`; the move list is `flex: 1; overflow-y: auto`. Narrow move list: `max-height: max(120px, 40vh)`.

### Orientation

`game/orientation.ts`: `boardOrientation(mode, turn) = mode === 'whiteBottom' ? 'w' : turn`. Only `displayedOrientation` (§4) is passed down. `geometry.ts` is the only place that maps squares to screen positions, and `Board`, `Coordinates`, `PromotionPicker`, and the pointer hook all use it, so the board, coordinates, picker direction, and pointer mapping cannot disagree. Nameplates take their colors from the same value, so they swap in the same render as the board.

### Text

`game/status.ts` is the single source of player-facing game text, all built from `GameState` + `Setup`:

- `label(setup, color)` — `White` or `Alice (White)` (design §4).
- `statusLines(state): { primary: string; secondary: string | null }` — every row of the design §4 table, including `Check · Draw offer declined`.
- `badge(state, color): 'To move' | 'Winner' | 'Draw' | null` and `isActivePlate(state, color)`.
- `scoreText(result)` — `1-0`, `0-1`, `½-½`.
- `resignPrompt(state)`, `abandonText(setup)` — the confirm dialog strings.

Every switch over `EndReason` is exhaustive (`satisfies never` default), so adding `timeout` later fails to compile until the text exists. Static button labels ("Resign", "Offer draw", …) stay in their components.

### Dialogs

`ui/dialogs/Modal.tsx`: `role="dialog"`, `aria-modal="true"`, backdrop, focus trap (Tab / Shift+Tab wrap inside), Escape calls an optional `onEscape` (absent for the initial setup dialog), initial focus on a given element, and focus returns to the element that was focused when it opened. It is a small custom component rather than native `<dialog>`, because jsdom does not support `showModal()` and the trap and return must be unit-testable.

## 7. Motion

### Mechanism

The Web Animations API (`element.animate`) on `transform` and `opacity`, so the browser composites the tweens and `document.getAnimations()` reports them (playtest MO section). No animation library, no CSS transition classes.

Pieces are keyed by square. After a commit, React renders the new position and a `useLayoutEffect` (keyed by a motion token that increments per commit or put-back) starts the tweens before the browser paints, so the piece never flashes at its destination.

### Plan (pure, tested)

```ts
// motion/constants.ts
export const COMMIT_MS = 150;
export const PUT_BACK_MS = 120;
export const EASE = 'cubic-bezier(0.2, 0, 0, 1)';

// motion/plan.ts
export type Tween =
  | { kind: 'slide'; square: Square; from: Square | Point; duration: number }  // element now at `square`
  | { kind: 'fade'; piece: Piece; square: Square; duration: number };          // ghost removed on finish

export function planCommit(m: MoveDetail, via: 'click' | 'drag' | 'picker', reduced: boolean): Tween[];
export function planPutBack(from: Square, start: Square | Point | null, reduced: boolean): Tween[];
```

| Case | Mover | Captured | Rook |
| --- | --- | --- | --- |
| click | slide 150ms | fade 150ms, linear | slide 150ms |
| drag | none (snap) | none (removed on drop); en passant pawn fades 150ms | slide 150ms |
| picker (promotion chosen) | none (pawn already on the square, replaced instantly) | none (already removed by the preview) | — |
| put-back after illegal drop / cancel | slide 120ms from the drop point | — | — |
| put-back after promotion cancel | slide 120ms from the promotion square | reappears instantly | — |
| drop on origin | none | — | — |

With `reduced === true` every tween is dropped (not run at 0ms), so `document.getAnimations()` is empty (MO-08). Dragging is unaffected.

The promotion preview (`previewPromotion`) does not touch the store. `Board` renders a preview board (pawn on `to`, captured piece hidden) while `promoting`, and for `via: 'click'` slides the pawn there with the normal 150ms commit tween.

### Animator

`motion/animator.ts`, one instance per `Board`:

```ts
export interface Animator {
  run(tweens: Tween[], resolve: (t: Tween) => HTMLElement | null, onSettled: () => void): void;
  finishAll(): void;     // finish() every running animation, then call pending onSettled callbacks now
}
```

- `run` first calls `finishAll()`, so a new tween never overlaps an old one.
- `onSettled` runs once, when every tween in the batch finished, or synchronously from `finishAll()`, or immediately when the batch is empty. `App` passes a callback that sets `displayedOrientation`, so the flip happens after the slide (MO-09) and right away when interrupted (MO-07).
- Fade ghosts are removed in their own finish handler.
- The animator takes `element.animate` through the resolved elements, so tests pass fake elements whose `animate` returns a controllable stub.

`useReducedMotion()` subscribes to `matchMedia('(prefers-reduced-motion: reduce)')` and its `change` event.

## 8. Assets

```text
src/assets/pieces/cburnett/
  wK.svg wQ.svg wR.svg wB.svg wN.svg wP.svg
  bK.svg bQ.svg bR.svg bB.svg bN.svg bP.svg
  LICENSE            cburnett set, BSD terms, author Colin M.L. Burnett, source URL
```

Source: Wikimedia Commons `Chess_{k,q,r,b,n,p}{l,d}t45.svg`, renamed. The Coder confirms and copies the license text from the source pages (design §9). `ui/board/pieceAssets.ts` imports the 12 files through Vite (`import wK from '../../assets/pieces/cburnett/wK.svg'`) and exports a `Record<\`${Color}${Uppercase<PieceType>}\`, string>` of URLs. Nothing else references the asset paths. The nameplate king icon uses the same map.

## 9. Seams for deferred work

Name only; do not build, flag, or stub behavior.

| Deferred | Seam in this slice |
| --- | --- |
| Clocks (design §12) | `TimeControl` union in `Setup` (only `untimed` now); the time-control radio group in `SetupDialog` renders from a list with one entry; `Nameplate` has a `clock?: ReactNode` prop rendered in a right-aligned, zero-width-when-empty slot; `EndReason` is an exhaustive union, so `timeout` is a compile-guided addition; `GameStore.move` is the single commit point where a clock would switch. |
| Persistence | `GameRecord` is plain JSON; `createGameStore(initial?)` already rebuilds state with `RulesGame.replay` (the spec/03 replay path, tested in §10); `defaultSetup()` is the one place setup defaults come from. |
| Engine | `PositionView.fen` is what a UCI worker needs (`position fen …`); a future `src/engine/` may depend on `rules/types` only and runs in a worker; `BoardArea` is a flex row so the 24px eval bar goes to the left of `Board`; the engine-lines section goes between `MoveList` and the lower `Nameplate`; the interaction state already tells when a piece is held (hints clear then). |
| Result animations | `GameState.result` is a distinct value both `Board` and `Sidebar` render from; a result layer would sit above `PromotionPicker` in the `Board` stack and key off `result`. |

## 10. Test plan

Fixtures: `src/test/fixtures.ts` holds the move lines from the playtest plan (R-01…R-07, P prefixes, E-01…E-05b, L-01) as SAN arrays so tests and the playtest use the same lines. A helper converts SAN to `MoveInput` through `RulesGame` in tests.

### `rules/rulesGame.test.ts`

- Legal moves: start position has 20; `e2` → `e3`, `e4`; `g1` → `f3`, `h3`; no entries for Black's pieces when White is to move.
- Illegal moves return `null` and leave `fen` unchanged: `e2-e5`, `b1-b3` (R-08), moving an opponent piece, a promotion square without a piece, a `promotion` on a non-promotion move.
- Pin (R-07 line): the c3 knight has no legal entry. Check evasion (R-06 line): only `g7-g6`.
- Castling: kingside both colors (R-01) with `rook` reported and SAN `O-O`; queenside both (R-02), SAN `O-O-O`; refused when blocked (start position, king has no moves); refused **through check** (R-04 line: no `e1-g1`, `play` returns `null`).
- En passant (R-05): `MoveOption` on d6 has `capture: true`; `play` reports `captured.square === 'd5'`; SAN `exd6`.
- Promotion: each of `q`, `n`, `r`, `b` for White (push and capture, P-01…P-05), one Black promotion (P-07), SAN `bxa8=Q`, `b8=R`, etc.; the four promotion moves collapse into one `MoveOption`.
- Endings: checkmate (E-01, winner `b`, `checkedKing` = e1), stalemate (E-02), threefold (E-03, not before the last move), insufficient material (E-04), fifty-move (E-05b line, not before the last move).
- **Fifty-move from half-move clock 99** (playtest E-05a): `RulesGame.replay([], '4k3/8/8/8/8/8/8/R3K3 w - - 99 80')`, play `a1-a2`, expect `outcome.kind === 'fiftyMove'`; also with clock 99, a pawn move or capture does not end the game, and a mating 100th half-move is `checkmate`, not a draw. Name the test so it contains "fifty".
- SAN: the L-01 sample game yields exactly the listed SAN.
- Replay equivalence: replaying E-04's moves equals playing them one by one (`view()` and the list of `MoveDetail`).

### `game/gameStore.test.ts`

New game resets everything; `move` appends and clears a declined offer; moves are refused while an offer is pending and after a result; resign before the first move (White resigns, Black wins); resign after `1. e4` (Black resigns); offer → accept → `agreement`; offer → decline → `declined` blocks a re-offer by that side and not by the other side, and is cleared by the next move; `underway` true/false cases; `createGameStore(record)` matches the live store for the same moves; `getState()` identity is stable without changes; subscribers fire once per change.

### `game/status.test.ts`

Every row of the design §4 status table with default and custom names; combined `Check · Draw offer declined`; ending priority when several apply; badges and active plate for in progress, win, and draw; `scoreText`; resign and abandon prompts. Also `defaults.test.ts` (trim, 24-char cap, blank → default) and `moveRows.test.ts` (odd/even lengths, empty).

### `interaction/machine.test.ts`

One test per design §6 row (1–14), the promotion paths (click and drag preview, choose, Escape, click outside), drag release on origin vs illegal vs off board, ignoring a second pointer, and `reset` from every state. `geometry.test.ts`: `squareAt` / square origin for both orientations, edges, and off-board points. `layout.test.ts`: the playtest viewports (1440×900 → wide 864; 390×844 → narrow 368; 860×900 → wide 488; 859 → narrow).

### `motion/*.test.ts`

`plan.test.ts`: each row of the §7 table, including reduced motion giving no tweens. `animator.test.ts`: with stub elements, `finishAll` finishes running animations and fires `onSettled` once; an empty batch settles immediately; `run` interrupts a previous batch.

### Component tests (React Testing Library, jsdom)

- `SetupDialog`: initial vs New game (Cancel and Escape present or not), trimming and fallback, `maxLength=24`, confirm step only when underway, Back / Abandon.
- `Modal`: focus trap wraps, focus returns to the opener.
- `StatusBlock` has `aria-live="polite"`; `ActionBar` / `DrawOfferPanel` button sets per state, Offer draw disabled after a decline; `ResignDialog` text.
- `MoveList`: rows, empty state, result row, scrolled to the bottom after an update.
- `Board`: click-click commits `e2-e4` through the store; a drag past 4px and release off board puts back with no move; opponent piece not selectable; promotion picker shows four labelled buttons in the right order and commits the chosen piece.
- `App` smoke test: start a game from the initial dialog, play Fool's mate by clicks, and see `Black wins` / `by checkmate` and `0-1`.

`src/test/setup.ts` provides what jsdom lacks: `PointerEvent`, `setPointerCapture` / `releasePointerCapture`, `matchMedia`, and a stub `Element.prototype.animate`. Board tests stub `getBoundingClientRect` on the board element so points map to squares.

No browser end-to-end suite in this slice; the playtest covers real-browser behavior.

## 11. Scope check

Nothing here adds clocks, saving, engine, result animations, keyboard board play, a flip button, move-list navigation, draw claims, arrows, sound, takebacks, premoves, PGN export, or themes. The seams in §9 are types, props, and layout positions only.
