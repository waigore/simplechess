# Presentation

## Layout

Follow the play screen of chess.com and Lichess.

On a wide window, show a large square board and a sidebar. The sidebar holds both players (name and clock), the turn or result, game actions such as resign and offer draw, the move list, and engine lines when analysis is on. An evaluation bar sits beside the board when analysis is on.

On a narrow window, stack the sidebar under the board. The board stays square and remains the focus.

The upper player in the sidebar is the side at the top of the board, so the plates follow a flip.

## Look

Use one theme for the whole screen: dark, quiet chrome and a classic light-and-dark board in the cream-and-green family. Pieces are a single set, in a familiar Staunton style, and both colors stay readable on both square colors.

Last-move, selection, legal-move, and check highlights belong to that same palette. Coordinates are visible on the board. Ship one theme only.

Check the start position, a capture, check, and the end of a game on a wide window and a phone-width window. The board, pieces, and panels should look like one product.

## Motion

Committed moves animate quickly and settle at once. A dragged piece follows the pointer directly, with no trailing glide. Captures, castling, and en passant are easy to follow. A piece put back returns promptly.

When the player prefers reduced motion, show the new position without the tween.

## Result animations

Leave the result on screen until a new game starts, with the board still visible.

- A win plays a victory animation and names the winner and the reason. The losing king plays a short defeat animation.
- A draw plays a distinct tie animation and names the reason.

Each result animation plays once and leaves "New game" usable.

## Analysis on the board

When analysis is on, show a numeric evaluation from White's point of view and a short list of the top suggested lines. The leading suggestion may be shown as an arrow. The arrow is a hint, separate from the legal-move markers.
