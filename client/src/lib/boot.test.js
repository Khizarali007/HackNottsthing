import { test } from 'node:test'
import assert from 'node:assert/strict'
import {
  BLOCK_COUNT,
  FINISH_MS,
  HOLD_MS,
  MAX_WAIT_MS,
  MIN_LOADING_MS,
  SOFT_FILL_TO,
  bootProgress,
  fullAtMs,
  litBlocks,
  loadingDoneAtMs,
  shouldSkipBoot,
} from './boot.js'

// Samples progress every 10 ms up to endMs.
function samples(readyAtMs, endMs = 12000) {
  const out = []
  for (let t = 0; t <= endMs; t += 10) out.push([t, bootProgress(t, readyAtMs)])
  return out
}

const READY_TIMES = [null, 0, 100, 1000, 1850, 2000, 2400, 3000, 5000, 7999, 8000, 9000, 20000]

test('timing constants match the spec', () => {
  assert.equal(MIN_LOADING_MS, 2200)
  assert.equal(FINISH_MS, 350)
  assert.equal(HOLD_MS, 400)
  assert.equal(MAX_WAIT_MS, 8000)
  assert.equal(SOFT_FILL_TO, 0.9)
  assert.equal(BLOCK_COUNT, 20)
})

test('progress starts at 0 and stays within 0..1', () => {
  for (const readyAt of READY_TIMES) {
    assert.equal(bootProgress(0, readyAt), 0)
    for (const [t, p] of samples(readyAt)) {
      assert.ok(p >= 0 && p <= 1, `out of range at t=${t}, readyAt=${readyAt}: ${p}`)
    }
  }
})

test('progress never decreases', () => {
  for (const readyAt of READY_TIMES) {
    let prev = -1
    for (const [t, p] of samples(readyAt)) {
      assert.ok(p >= prev, `went down at t=${t}, readyAt=${readyAt}`)
      prev = p
    }
  }
})

test('progress stays at or below 0.9 while not ready', () => {
  for (let t = 0; t < MAX_WAIT_MS; t += 10) {
    assert.ok(bootProgress(t, null) <= SOFT_FILL_TO)
  }
  // Ready at 5 s: still capped right up to that moment.
  for (let t = 0; t < 5000; t += 10) {
    assert.ok(bootProgress(t, 5000) <= SOFT_FILL_TO)
  }
})

test('soft fill gets close to 0.9 and then waits there', () => {
  assert.ok(bootProgress(2400, null) > 0.89)
  assert.equal(bootProgress(2400, null), bootProgress(6000, null))
})

test('progress never reaches 1 before MIN_LOADING_MS', () => {
  for (const readyAt of READY_TIMES) {
    assert.ok(bootProgress(MIN_LOADING_MS - 1, readyAt) < 1, `readyAt=${readyAt}`)
  }
})

test('progress reaches 1 within FINISH_MS of ready once the minimum has passed', () => {
  for (const readyAt of [2000, 2400, 3000, 5000, 7999]) {
    assert.ok(bootProgress(readyAt + FINISH_MS - 1, readyAt) < 1)
    assert.equal(bootProgress(readyAt + FINISH_MS, readyAt), 1)
  }
})

test('early ready finishes exactly at MIN_LOADING_MS', () => {
  for (const readyAt of [0, 100, 1000]) {
    assert.equal(fullAtMs(readyAt), MIN_LOADING_MS)
    assert.equal(bootProgress(MIN_LOADING_MS, readyAt), 1)
  }
})

test('the safety valve counts as ready', () => {
  assert.ok(bootProgress(MAX_WAIT_MS - 1, null) <= SOFT_FILL_TO)
  assert.equal(bootProgress(MAX_WAIT_MS + FINISH_MS, null), 1)
  // A very late ready can't hold things up past the valve either.
  assert.equal(bootProgress(MAX_WAIT_MS + FINISH_MS, 20000), 1)
})

test('loading hands over HOLD_MS after the bar is full', () => {
  assert.equal(loadingDoneAtMs(0), MIN_LOADING_MS + HOLD_MS)
  assert.equal(loadingDoneAtMs(3000), 3000 + FINISH_MS + HOLD_MS)
  assert.equal(loadingDoneAtMs(null), MAX_WAIT_MS + FINISH_MS + HOLD_MS)
})

test('litBlocks floors progress into 20 blocks', () => {
  assert.equal(litBlocks(0), 0)
  assert.equal(litBlocks(0.049), 0)
  assert.equal(litBlocks(0.05), 1)
  assert.equal(litBlocks(0.5), 10)
  assert.equal(litBlocks(0.9), 18)
  assert.equal(litBlocks(0.999), 19)
  assert.equal(litBlocks(1), 20)
})

test('litBlocks clamps odd input', () => {
  assert.equal(litBlocks(-0.5), 0)
  assert.equal(litBlocks(3), BLOCK_COUNT)
  assert.equal(litBlocks(NaN), 0)
  assert.equal(litBlocks(undefined), 0)
})

test('shouldSkipBoot finds boot=off anywhere, any case', () => {
  for (const search of ['?boot=off', '?BOOT=OFF', '?Boot=Off', '?a=1&boot=off', '?boot=off&a=1', '?a=1&boot=off&b=2', 'boot=off']) {
    assert.equal(shouldSkipBoot(search), true, search)
  }
})

test('shouldSkipBoot ignores everything else', () => {
  for (const search of ['', '?', '?boot=on', '?boot=offline', '?reboot=off', '?boot=', '?a=boot=off', null, undefined, 42]) {
    assert.equal(shouldSkipBoot(search), false, String(search))
  }
})
