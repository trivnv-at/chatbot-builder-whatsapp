import assert from 'node:assert/strict';
import test from 'node:test';
import { isWithinOfficeHours } from './schedule.js';

const at = (hour: number) => new Date(2026, 0, 1, hour, 0, 0).toISOString();

test('jam operasional nonaktif selalu diizinkan', () => {
  assert.equal(isWithinOfficeHours(at(3), { enabled: false, startHour: 9, endHour: 18 }), true);
});

test('jam dalam rentang diizinkan, di luar ditolak', () => {
  const hours = { enabled: true, startHour: 9, endHour: 18 };
  assert.equal(isWithinOfficeHours(at(10), hours), true);
  assert.equal(isWithinOfficeHours(at(8), hours), false);
  assert.equal(isWithinOfficeHours(at(18), hours), false);
});

test('rentang lewat tengah malam ditangani', () => {
  const hours = { enabled: true, startHour: 22, endHour: 6 };
  assert.equal(isWithinOfficeHours(at(23), hours), true);
  assert.equal(isWithinOfficeHours(at(5), hours), true);
  assert.equal(isWithinOfficeHours(at(12), hours), false);
});

test('tanggal tidak valid ditolak saat jam operasional aktif', () => {
  assert.equal(isWithinOfficeHours('bukan-tanggal', { enabled: true, startHour: 0, endHour: 24 }), false);
});
