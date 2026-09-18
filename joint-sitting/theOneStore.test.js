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
test('suspended chamber survives server restart mid-joint-sitting', () => {
  store.setTheOne('representative', 'rep-session-1', 100);
  store.setTheOne('senate', 'sen-session-1', 50);

  store.startJointSitting('representative');
  store.tick('representative', 120); // เวลาผ่านไประหว่างประชุมร่วม

  // 💥 จำลอง server crash + restart
  store.restoreFromDb('representative');
  store.restoreFromDb('senate');

  // หลัง restart: rep ต้องยัง live, senate ต้องยัง null (ยังถูกพักอยู่)
  assert.ok(store.memory.representative, 'rep should still be live after restart');
  assert.strictEqual(store.memory.senate, null, 'senate should still be suspended after restart');

  // จบประชุมร่วม — senate ต้องกลับมาที่ timeUsed เดิมก่อนถูกพัก
  store.endJointSitting();
  assert.strictEqual(store.memory.senate.sessionId, 'sen-session-1');
  assert.strictEqual(store.memory.senate.timeUsed, 50, 'senate should resume at pre-joint-sitting time, not rep time');
});

// --- Race condition / edge case tests ---

// Case 1: startJointSitting ถูกเรียก 2 ครั้ง → ควร throw error ไม่ใช่ปล่อยให้ทั้งสองฝั่ง suspend
test('calling startJointSitting twice should throw, not leave both chambers suspended', () => {
  store.setTheOne('representative', 'rep-session-1', 100);
  store.setTheOne('senate', 'sen-session-1', 50);

  store.startJointSitting('representative'); // senate suspended

  assert.throws(
    () => store.startJointSitting('senate'), // เรียกซ้ำ → ควร throw!
    /Already active Joint sitting/,
    'should throw when joint sitting is already active'
  );

  // และ rep ต้องไม่ถูก suspend ด้วย
  assert.strictEqual(store.fakeDb.representative?.suspended, undefined,
    'presiding chamber should not be suspended after failed second startJointSitting');
});

// Case 2: tick ยิงมาที่ chamber ที่ถูกพัก → timeUsed ถูกเขียนทับ
test('tick on suspended chamber should not corrupt the restore value', () => {
  store.setTheOne('representative', 'rep-session-1', 100);
  store.setTheOne('senate', 'sen-session-1', 50);

  store.startJointSitting('representative');
  store.tick('senate', 999); // tick ผิดฝั่ง! senate ถูกพักอยู่

  store.endJointSitting();

  assert.strictEqual(store.memory.senate.timeUsed, 50,
    'senate timeUsed should be 50 (pre-suspension), not 999 (tick during suspension)');
});

// Case 3: endJointSitting ถูกเรียกตอนไม่มีประชุมร่วม → ไม่ควร crash
test('endJointSitting when no joint sitting is active should not crash', () => {
  store.setTheOne('representative', 'rep-session-1', 100);
  // ไม่ได้ startJointSitting เลย!

  assert.doesNotThrow(() => {
    store.endJointSitting();
  }, 'endJointSitting with no active joint sitting should not throw');
});

console.log('all tests passed');
