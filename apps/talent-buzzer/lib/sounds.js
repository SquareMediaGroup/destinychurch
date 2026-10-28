// Sound files the display page plays, and checks for files uploaded from the
// control page. Pure logic (no I/O) so it can be unit tested.
//
// Each sound is saved under one fixed name whatever its format: the browser
// works out the format from the bytes, not the file name. The two show styles
// keep separate X and all-X sounds, so switching style never plays a buzzer
// in celebrate mode (or a chime in buzzer mode). Golden is shared.

const SOUND_FILES = {
  celebrate: { x: 'ding.mp3', 'all-x': 'all-lit.mp3', golden: 'golden.mp3' },
  buzzer: { x: 'buzzer.mp3', 'all-x': 'all-out.mp3', golden: 'golden.mp3' },
};
const SOUND_KINDS = Object.keys(SOUND_FILES.buzzer);
const MAX_SOUND_BYTES = 20 * 1024 * 1024;

// The audio formats Chrome on the LED screen can play, by their first bytes.
function soundFormat(buf) {
  const ascii = (start, end) => buf.subarray(start, end).toString('latin1');
  if (ascii(0, 3) === 'ID3' || (buf[0] === 0xff && (buf[1] & 0xe0) === 0xe0)) return 'mp3';
  if (ascii(0, 4) === 'RIFF' && ascii(8, 12) === 'WAVE') return 'wav';
  if (ascii(0, 4) === 'OggS') return 'ogg';
  if (ascii(0, 4) === 'fLaC') return 'flac';
  if (ascii(4, 8) === 'ftyp') return 'm4a';
  return null;
}

// Throws a message for the control page if the upload can't be used.
function checkSound(kind, buf) {
  if (!SOUND_KINDS.includes(kind)) throw new Error(`"${kind}" is not a sound (use ${SOUND_KINDS.join(', ')})`);
  if (!buf.length) throw new Error('The file is empty');
  if (buf.length > MAX_SOUND_BYTES) throw new Error(`The file is too big (the limit is ${MAX_SOUND_BYTES / 1024 / 1024} MB)`);
  const format = soundFormat(buf);
  if (!format) throw new Error('That is not a sound file the screen can play (use MP3, WAV, M4A, OGG or FLAC)');
  return format;
}

module.exports = { SOUND_FILES, SOUND_KINDS, MAX_SOUND_BYTES, soundFormat, checkSound };
