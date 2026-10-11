# Simple Chess — Overview

Simple Chess is a React single-page app for two people at one computer to play a game of chess. The screen should feel like the play view on chess.com or Lichess: a large board, a clear sidebar, and quick piece motion.

There is no backend. Anything that must survive a refresh lives in the browser.

## Players

One shared screen, two seats: White and Black. Seats can have display names. There are no accounts and no remote opponent.

## Features

- Standard chess from the normal starting position
- A clear indicator of whose turn it is
- Timed games: blitz, rapid, and custom, plus untimed for a casual game
- Mouse play: pick a piece up, put it back, or move it
- Animated piece movement
- Victory, defeat, and tie animations when the game ends
- Optional position evaluation and top suggested moves when a UCI-compatible engine is available locally

## Out of scope

Online multiplayer, accounts, chat, puzzles, variants, lessons, takebacks, premoves, sound, and a computer opponent that plays the moves. The engine only suggests. Opening books, PGN export, and theme pickers are out of scope.

## Quality bar

Movement is quick and snappy. The board and pieces look like one design. Rules, clocks, and results are correct. If the engine is unavailable, the rest of the game still works.

## Docs

| Doc | Contents |
| --- | --- |
| [01-gameplay](01-gameplay.md) | How a game is played |
| [02-presentation](02-presentation.md) | Layout, look, and motion |
| [03-platform](03-platform.md) | App shape, saving, engine, and done |

Build a playable untimed game first, then clocks and saving, then the engine and a visual pass.
