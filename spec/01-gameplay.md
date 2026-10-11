# Gameplay

## Starting a game

Setup asks for the two names, a time control, and board orientation. Blank names become "White" and "Black".

Orientation is either "side to move at the bottom" (the default) or "White stays at the bottom". Starting another game while one is underway asks for confirmation first.

## Whose turn

The side to move is named in text. Their nameplate is highlighted, and in a timed game their clock is the active one. Color is never the only signal.

When the game ends, that same status shows who won or that the game is drawn, with a short reason (checkmate, resignation, time, stalemate, agreement, and so on).

## Rules

The game is standard chess. That covers normal piece movement, check, checkmate, castling, en passant, and promotion. The mover chooses the promotion piece.

Games also end by stalemate, threefold repetition, the fifty-move rule, insufficient material, resignation, or an agreed draw. The side to move may resign, or offer a draw for the opponent to accept or decline.

An illegal move is refused and the piece goes back to the square it left. Use a maintained chess rules library as the authority for legal moves and these endings.

## Clocks

- Blitz: 3 minutes, with a 2 second increment
- Rapid: 10 minutes, no increment
- Custom: a chosen base time and increment
- Untimed: no clocks

The side to move's clock runs. It starts when White plays the first move. After a move, that player receives the increment and the opponent's clock starts. A player who runs out of time loses, unless the opponent has no way to checkmate, in which case the game is a draw. A timed game can be paused.

## Mouse

The side to move can click a piece and then a destination, or drag the piece. Letting go on the origin, on an illegal square, or off the board puts the piece back. Legal destinations are shown while a piece is held. The opponent's pieces cannot be picked up.

## Move list

The sidebar records moves in standard notation as they happen. It is a record of the game, not a way to step back through earlier positions.

## Engine hints

Suggested moves are hints drawn for the player. They do not play themselves.
