// Minimal standalone stand-in for the real theOne pattern (server/services/*TheOneService.js).
// No DB, no sockets — just in-memory state + an event log, so it's runnable and testable in isolation.

/** Fake DB row per chamber: { sessionId, timeUsed, theOne } | null */
const fakeDb = { representative: null, senate: null };

/** Fake in-memory cache per chamber, rebuilt from fakeDb on "restart": { sessionId, timeUsed } | null */
const memory = { representative: null, senate: null };

const emittedEvents = [];
function emit(eventName, payload) {
  emittedEvents.push({ eventName, payload });
}

function _resetForTests() {
  fakeDb.representative = null;
  fakeDb.senate = null;
  memory.representative = null;
  memory.senate = null;
  emittedEvents.length = 0;
}

function setTheOne(chamber, sessionId, timeUsed = 0) {
  fakeDb[chamber] = { sessionId, timeUsed, theOne: true };
  memory[chamber] = { sessionId, timeUsed };
  emit(`${chamber}TheOneChanged`, { sessionId });
}

function clearTheOne(chamber) {
  if (fakeDb[chamber]) fakeDb[chamber].theOne = false;
  memory[chamber] = null;
  emit(`${chamber}TheOneChanged`, { sessionId: null });
}

/** Simulates the per-second timer tick: fire-and-forget write of elapsed time. */
function tick(chamber, secondsElapsed) {
  if (fakeDb[chamber] && !fakeDb[chamber].suspended) fakeDb[chamber].timeUsed = secondsElapsed;
  if (memory[chamber]) memory[chamber].timeUsed = secondsElapsed;
}

/** Simulates a server restart: rebuild memory from the DB's theOne flag. */
function restoreFromDb(chamber) {
  const row = fakeDb[chamber];
  memory[chamber] = row && row.theOne ? { sessionId: row.sessionId, timeUsed: row.timeUsed } : null;
}

// --- Candidate implements below ---

/**
 * Start a joint sitting: the non-presiding chamber's live session is suspended
 * (not cleared/lost) while the presiding chamber's own theOne keeps running.
 * Must survive a restart mid-joint-sitting: restoreFromDb() should still be
 * able to bring back which chamber was suspended and how much time it had used.
 */
function startJointSitting(presidingChamber) {
  const alreadySuspended = Object.keys(fakeDb).find(c => fakeDb[c]?.suspended === true);
  if (alreadySuspended) throw Error("Already active Joint sitting"); 
  const otherChamber = presidingChamber === 'representative' ? 'senate' : 'representative';

  fakeDb[otherChamber].suspended = true 
  clearTheOne(otherChamber)
}

/**
 * End a joint sitting: restore the suspended chamber to exactly the
 * session/timeUsed it had when the joint sitting started.
 */
function endJointSitting() {
  const suspendedChamber = Object.keys(fakeDb).find(
  chamber => fakeDb[chamber]?.suspended === true
);
  if (!suspendedChamber) return; // ไม่มีประชุมร่วมอยู่ → ไม่ทำอะไร
  const row = fakeDb[suspendedChamber];
  memory[suspendedChamber] = { sessionId: row.sessionId, timeUsed: row.timeUsed };
  fakeDb[suspendedChamber].suspended = false;
}

module.exports = {
  fakeDb,
  memory,
  emittedEvents,
  _resetForTests,
  setTheOne,
  clearTheOne,
  tick,
  restoreFromDb,
  startJointSitting,
  endJointSitting,
};
