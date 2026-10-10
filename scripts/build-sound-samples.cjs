const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const sources = JSON.parse(fs.readFileSync(path.join(root, 'assets/audio/sources.json'), 'utf8'));
const samples = {};
for (const { kind, file } of sources) {
  const wav = fs.readFileSync(path.join(root, 'assets/audio', file));
  if (wav.toString('ascii', 0, 4) !== 'RIFF' || wav.toString('ascii', 8, 12) !== 'WAVE') throw Error(`Invalid WAV: ${file}`);
  let sampleRate, pcm;
  for (let offset = 12; offset + 8 <= wav.length;) {
    const size = wav.readUInt32LE(offset + 4), start = offset + 8;
    if (start + size > wav.length) throw Error(`Truncated WAV: ${file}`);
    const type = wav.toString('ascii', offset, offset + 4);
    if (type === 'fmt ') {
      if (size < 16 || wav.readUInt16LE(start) !== 1 || wav.readUInt16LE(start + 2) !== 1 || wav.readUInt16LE(start + 14) !== 16) throw Error(`Expected mono PCM16: ${file}`);
      sampleRate = wav.readUInt32LE(start + 4);
    }
    if (type === 'data') pcm = wav.subarray(start, start + size);
    offset = start + size + (size % 2);
  }
  if (!sampleRate || !pcm?.length || pcm.length % 2) throw Error(`Missing PCM: ${file}`);
  samples[kind] = { sampleRate, pcm: pcm.toString('base64') };
}
fs.writeFileSync(path.join(root, 'assets/sound-samples.js'), `// Generated from owner-approved CC0 WAVs. Rebuild with scripts/build-offline-deck.cjs.\nwindow.MISTAKERY_SOUND_SAMPLES = ${JSON.stringify(samples)};\n`);
