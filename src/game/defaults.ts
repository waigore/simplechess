import type { Color } from '../rules/types';
import type { OrientationMode, Setup, TimeControl } from './types';

export const NAME_MAX_LENGTH = 24;

export const DEFAULT_NAMES: Readonly<Record<Color, string>> = { w: 'White', b: 'Black' };

/** The one place setup defaults come from. */
export function defaultSetup(): Setup {
  return { names: { ...DEFAULT_NAMES }, timeControl: { kind: 'untimed' }, orientation: 'sideToMove' };
}

export interface SetupForm {
  names: Record<Color, string>;
  timeControl: TimeControl;
  orientation: OrientationMode;
}

/** Trims names, caps them at 24 characters, and substitutes the color default for blanks. */
export function resolveSetup(form: SetupForm): Setup {
  const name = (color: Color) => form.names[color].trim().slice(0, NAME_MAX_LENGTH).trim() || DEFAULT_NAMES[color];
  return { names: { w: name('w'), b: name('b') }, timeControl: form.timeControl, orientation: form.orientation };
}

/** Pre-fill for the New game dialog: a default name shows as an empty field so the placeholder appears. */
export function formFromSetup(setup: Setup): SetupForm {
  const field = (color: Color) => (setup.names[color] === DEFAULT_NAMES[color] ? '' : setup.names[color]);
  return { names: { w: field('w'), b: field('b') }, timeControl: setup.timeControl, orientation: setup.orientation };
}
