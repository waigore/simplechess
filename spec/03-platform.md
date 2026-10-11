# Platform

## App

Build a React single-page app with TypeScript. One screen is enough. There is no server, no accounts, and no remote API. Styling stays in the project.

## Saving

Store the unfinished game and preferences in the browser: names, time control, board orientation, and whether analysis is on. A refresh restores the position, the move history, the clocks, and a finished result.

Replay the game from the starting position so repetition and the fifty-move rule stay correct.

If the browser refuses storage, keep playing for the session and tell the player the game will not be kept.

## Engine

A local UCI engine means an engine running inside the page (a WebAssembly Stockfish build in a worker is the expected choice), loaded as its own asset. The browser cannot start a program installed on the computer, and this project does not add a server to do that.

The app speaks UCI to that worker. Analysis stays off until the player turns it on. Searching must not stall piece movement or input.

If the engine fails to load, say that it is unavailable and leave the game fully playable. Keep the engine's license with its asset, separate from the application code.

Show an evaluation and the top suggested moves for the current position. Update them as the engine searches. Clear the hints while a piece is being moved.

## Correctness

Cover the risky behavior with tests: legal and illegal moves, castling, en passant, promotion, checkmate, the main draws, clock increment, timeout, and restoring a game after reload. Check engine output against a few sample lines.

## Done

On a production build, two people can play a full game with the mouse on a wide window and on a narrow one. Rules and clocks match this spec. Motion feels snappy and the board looks cohesive. The same game is playable with the engine present and with the engine asset missing.
