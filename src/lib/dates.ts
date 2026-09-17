/** Pure date helpers usable from client and server components. */

/** Earliest value for a datetime-local input: some hours from now, minute precision. */
export function minDatetimeLocal(hoursAhead = 2) {
  return new Date(Date.now() + hoursAhead * 3_600_000).toISOString().slice(0, 16);
}
