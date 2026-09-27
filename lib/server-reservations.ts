import { database } from './server-db';
import { cleanupReservations } from './reservation-cleanup';
export { RESERVATION_MS, MAX_PENDING_ORDERS } from './reservation-cleanup';

// Cache only maintenance completion, never prices, inventory or account data.
// This is an isolate-local optimisation; SQL version guards handle other isolates.
const maintenance = new WeakMap<
  D1Database,
  { completed: number; pending?: Promise<void> }
>();
export async function expireReservations(force = true) {
  const db = database();
  let state = maintenance.get(db);
  if (!state) {
    state = { completed: 0 };
    maintenance.set(db, state);
  }
  if (state.pending) return state.pending;
  if (!force && Date.now() - state.completed < 30000) return;
  const entry = state;
  entry.pending = cleanupReservations(db)
    .then(() => {
      entry.completed = Date.now();
    })
    .finally(() => {
      entry.pending = undefined;
    });
  return entry.pending;
}
