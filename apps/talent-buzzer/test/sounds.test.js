const test = require('node:test');
const assert = require('node:assert/strict');
const { soundFormat, checkSound, MAX_SOUND_BYTES } = require('../lib/sounds');

const bytes = (...parts) => Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p, 'latin1') : Buffer.from(p))));

test('soundFormat recognises the formats the display can play', () => {
  assert.equal(soundFormat(bytes('ID3', [4, 0, 0])), 'mp3');
  assert.equal(soundFormat(bytes([0xff, 0xfb, 0x90, 0x00])), 'mp3');
  assert.equal(soundFormat(bytes('RIFF', [0, 0, 0, 0], 'WAVEfmt ')), 'wav');
  assert.equal(soundFormat(bytes('OggS', [0, 2])), 'ogg');
  assert.equal(soundFormat(bytes('fLaC', [0])), 'flac');
  assert.equal(soundFormat(bytes([0, 0, 0, 0x20], 'ftypM4A ')), 'm4a');
  assert.equal(soundFormat(bytes('<html>')), null);
  assert.equal(soundFormat(bytes('RIFF', [0, 0, 0, 0], 'AVI ')), null);
});

test('checkSound rejects unknown sounds, empty, oversized and non-audio files', () => {
  const mp3 = bytes('ID3', [4, 0, 0]);
  assert.equal(checkSound('x', mp3), 'mp3');
  assert.equal(checkSound('golden', mp3), 'mp3');
  assert.throws(() => checkSound('../config', mp3), /not a sound/);
  assert.throws(() => checkSound('x', Buffer.alloc(0)), /empty/);
  assert.throws(() => checkSound('x', Buffer.alloc(MAX_SOUND_BYTES + 1, 0xff)), /too big/);
  assert.throws(() => checkSound('all-x', bytes('PK', [3, 4])), /not a sound file/);
});
