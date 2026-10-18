import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptSecret, encryptSecret, hashSecret } from './secret-box.js';

test('secret terenkripsi bisa didekripsi kembali', () => {
  const plain = 'sk-live-abcdef1234567890';
  const cipher = encryptSecret(plain);

  assert.notEqual(cipher, plain);
  assert.equal(cipher.includes(plain), false);
  assert.equal(decryptSecret(cipher), plain);
});

test('cipher menghasilkan nilai berbeda tiap enkripsi (IV acak)', () => {
  const plain = 'sk-same-value';
  assert.notEqual(encryptSecret(plain), encryptSecret(plain));
});

test('hash SHA-256 deterministik dan 64 hex', () => {
  const hash = hashSecret('sk-test');
  assert.equal(hash.length, 64);
  assert.match(hash, /^[0-9a-f]{64}$/);
  assert.equal(hash, hashSecret('sk-test'));
});

test('cipher rusak gagal didekripsi', () => {
  assert.throws(() => decryptSecret('not-a-valid-cipher'));
});
