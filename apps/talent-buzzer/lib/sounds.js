// Sound files the display page plays, and checks for files uploaded from the
// control page. Pure logic (no I/O) so it can be unit tested.
//
// Each sound is saved under one fixed name whatever its format: the browser
// works out the format from the bytes, not the file name.

const SOUND_FILES = { x: 'buzzer.mp3', 'all-x': 'all-out.mp3', golden: 'golden.mp3' };
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
  if (!(kind in SOUND_FILES)) throw new Error(`"${kind}" is not a sound (use ${Object.keys(SOUND_FILES).join(', ')})`);
  if (!buf.length) throw new Error('The file is empty');
  if (buf.length > MAX_SOUND_BYTES) throw new Error(`The file is too big (the limit is ${MAX_SOUND_BYTES / 1024 / 1024} MB)`);
  const format = soundFormat(buf);
  if (!format) throw new Error('That is not a sound file the screen can play (use MP3, WAV, M4A, OGG or FLAC)');
  return format;
}

module.exports = { SOUND_FILES, MAX_SOUND_BYTES, soundFormat, checkSound };
