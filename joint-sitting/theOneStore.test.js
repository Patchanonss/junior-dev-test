// No framework — plain assert, run with: node theOneStore.test.js
const assert = require('assert');
const store = require('./theOneStore');

function test(name, fn) {
  store._resetForTests();
  fn();
  console.log(`ok - ${name}`);
}

test('presiding chamber keeps running, other chamber is suspended', () => {
  store.setTheOne('representative', 'rep-session-1', 100);
  store.setTheOne('senate', 'sen-session-1', 50);

  store.startJointSitting('representative');

  assert.strictEqual(store.memory.senate, null, 'senate should be suspended, not live');
  assert.ok(store.memory.representative, 'presiding chamber should stay live');
});

test('ending joint sitting restores the suspended chamber exactly', () => {
  store.setTheOne('representative', 'rep-session-1', 100);
  store.setTheOne('senate', 'sen-session-1', 50);

  store.startJointSitting('representative');
  store.tick('representative', 130); // time passes during the joint sitting

  store.endJointSitting();

  assert.strictEqual(store.memory.senate.sessionId, 'sen-session-1');
  assert.strictEqual(store.memory.senate.timeUsed, 50, 'senate should resume at its pre-joint-sitting time');
});

// Candidate: add one test for the restart-mid-joint-sitting edge case from Part A #3.

console.log('all tests passed');
