import { useCallback, useEffect, useRef, useState } from 'react';
import { useSaveTracker } from '../model/save-tracker';

/** Text fields save this long after the last keystroke (or at once on blur). */
export const AUTOSAVE_DELAY_MS = 800;

export interface AutosaveOptions<T> {
  /** Tracker slot, unique per field (e.g. 'course.title'). */
  slot: string;
  /** The current (edited) value. */
  value: T;
  /** The value the server had when the field mounted: nothing is sent while `value` equals it. */
  savedValue: T;
  /** Sends the value. Throwing marks the field as not saved. */
  save: (value: T) => Promise<unknown>;
  /** A client-side problem (a translation key); while set, nothing is sent. */
  validate?: (value: T) => string | null;
  isEqual?: (a: T, b: T) => boolean;
  /** 0 = save on the next tick (choices, toggles). */
  delay?: number;
  disabled?: boolean;
}

export interface AutosaveResult {
  /** The client-side problem, or the server's error for the last attempt. */
  problem: string | null;
  serverError: unknown;
  /** Send now (e.g. on blur). */
  flush: () => void;
}

/**
 * Debounced save of one value. Only the latest value is sent; a change made while a save is
 * running is sent after it. A pending change is sent when the field unmounts (leaving the
 * tab or the page), so nothing typed is lost.
 */
export function useAutosave<T>({
  slot,
  value,
  savedValue,
  save,
  validate,
  isEqual = Object.is,
  delay = AUTOSAVE_DELAY_MS,
  disabled = false,
}: AutosaveOptions<T>): AutosaveResult {
  const tracker = useSaveTracker();
  const [serverError, setServerError] = useState<unknown>(null);
  const latest = useRef({ value, save, validate, isEqual, disabled });
  const confirmed = useRef(savedValue);
  const inFlight = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    latest.current = { value, save, validate, isEqual, disabled };
  });

  const problem = validate?.(value) ?? null;

  const send = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    // A save already running picks up newer values when it finishes (the loop below).
    if (inFlight.current) return;
    for (;;) {
      const current = latest.current;
      if (current.disabled) return;
      if (current.isEqual(current.value, confirmed.current)) {
        tracker.setDirty(slot, false);
        return;
      }
      if (current.validate?.(current.value)) return;
      const sent = current.value;
      inFlight.current = true;
      try {
        await tracker.run(slot, () => current.save(sent));
        confirmed.current = sent;
        setServerError(null);
      } catch (error) {
        setServerError(error);
        // Keep the value; the next edit (or blur) tries again.
        tracker.setDirty(slot, false);
        return;
      } finally {
        inFlight.current = false;
      }
      // Loop: if the value changed while saving, the newer value is sent too.
    }
  }, [slot, tracker]);

  // Schedule on change.
  useEffect(() => {
    if (disabled) return;
    const unchanged = isEqual(value, confirmed.current);
    const invalid = Boolean(validate?.(value));
    tracker.setInvalid(slot, invalid && !unchanged);
    if (unchanged || invalid) {
      if (timer.current) clearTimeout(timer.current);
      timer.current = null;
      if (!inFlight.current) tracker.setDirty(slot, false);
      return;
    }
    tracker.setDirty(slot, true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void send(), delay);
    // `validate` and `isEqual` are read through `latest`; re-run only when the value changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, disabled, delay, send, slot, tracker]);

  // Send what's pending when the field goes away; clear its tracker state.
  useEffect(
    () => () => {
      if (timer.current) void send();
      tracker.setInvalid(slot, false);
    },
    [send, slot, tracker],
  );

  return {
    problem,
    serverError,
    flush: () => {
      if (timer.current) void send();
    },
  };
}
