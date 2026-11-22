import fs from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'

// Produces a real 45-second MP4 ad: 6 animated product scenes with sound effects.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const appRoot = path.join(repoRoot, 'maxseller-app')
const imagesDir = path.join(appRoot, 'public/images')
const outDir = path.join(appRoot, 'public/reklama')
const tmpDir = path.join(process.env.TEMP || path.join(repoRoot, '.tmp'), 'maxseller-promo')
fs.mkdirSync(outDir, { recursive: true })
fs.mkdirSync(tmpDir, { recursive: true })

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const FONT = 'C:/Windows/Fonts/arial.ttf'
const CLIP = 7.5
const SCENES = [
  { img: 'cover-01.svg', tag: '01 / NIMA BU?', title: 'Raqamli mahsulotlar do\'koni', text: 'Saytlar, dizayn, hujjatlar va kurslar bir joyda.' },
  { img: 'cover-05.svg', tag: '02 / NEGA KERAK?', title: 'Vaqtingizni tejang', text: 'Tayyor va tahrirlanadigan faylni darhol oling.' },
  { img: 'cover-02.svg', tag: '03 / QANDAY ISHLAYDI?', title: 'Tanlang - to\'lang - yuklang', text: 'Email OTP, haqiqiy buyurtma, admin tasdiqlaydi.' },
  { img: 'cover-11.svg', tag: '04 / NIMA OLASIZ?', title: '12 mahsulot - 4 yo\'nalish', text: 'Veb, dizayn, hujjatlar va video darsliklar.' },
  { img: 'cover-12.svg', tag: '05 / ISHONCHLIMI?', title: 'Haqiqiy buyurtma, haqiqiy yordam', text: 'Holatni kabinetingizda kuzatib boring, 24/7 yordam.' },
  { img: 'cover-06.svg', tag: '06 / BOSHLANG', title: 'Bir klik va fayl sizning', text: 'Katalogga o\'ting. Bugun olishni boshlang.' },
]

const run = (cmd, args, label, cwd) => {
  const result = spawnSync(cmd, args, { encoding: 'utf8', timeout: 180000, windowsHide: true, cwd })
  if (result.status !== 0) {
    throw new Error(`${label} failed: ${result.stderr || result.stdout || result.error?.message || 'unknown'}`)
  }
  return result
}

// ffmpeg's filtergraph treats ':' as an option separator. Keep every path used
// inside drawtext relative (and the drive letter out of it) by running from tmpDir.
const localFont = path.join(tmpDir, 'arial.ttf')
if (!fs.existsSync(localFont)) fs.copyFileSync(FONT, localFont)
const txtFile = (name, value) => {
  const file = path.join(tmpDir, name)
  fs.writeFileSync(file, value, 'utf8')
  return file
}

/* ------------------------- rasterize SVG covers ------------------------ */
const rasters = []
for (const [index, scene] of SCENES.entries()) {
  const svg = path.join(imagesDir, scene.img)
  const png = path.join(tmpDir, `frame-${index + 1}.png`)
  const url = `file:///${svg.replace(/\\/g, '/')}`
  run(CHROME, [
    '--headless', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--disable-extensions',
    `--user-data-dir=${path.join(tmpDir, `chrome-${index}`)}`,
    `--screenshot=${png}`, '--window-size=800,500', url,
  ], `raster ${scene.img}`)
  rasters.push(png)
}

/* --------------------------- WAV sound bed ---------------------------- */
const SR = 44100
const DURATION = CLIP * SCENES.length
const samples = new Float32Array(Math.floor(SR * DURATION))
const TAU = Math.PI * 2
for (let i = 0; i < samples.length; i += 1) {
  const t = i / SR
  let value = 0.016 * Math.sin(TAU * 55 * t) + 0.010 * Math.sin(TAU * 110 * t)
  for (let s = 0; s < SCENES.length; s += 1) {
    const dt = t - s * CLIP
    if (dt >= 0 && dt < 0.7) {
      const env = Math.exp(-dt * 5.5)
      value += 0.14 * env * (Math.random() * 2 - 1)
      value += 0.07 * env * Math.sin(TAU * (180 + dt * 780) * dt)
    }
    const blip = dt - 0.34
    if (blip >= 0 && blip < 0.14) value += 0.07 * Math.exp(-blip * 22) * Math.sin(TAU * 880 * blip)
  }
  const outro = t - (DURATION - 4.6)
  if (outro >= 0) {
    for (const freq of [523.25, 659.25, 783.99, 1046.5]) {
      value += 0.035 * Math.exp(-outro * 0.8) * Math.sin(TAU * freq * outro)
    }
  }
  samples[i] = Math.max(-1, Math.min(1, value))
}
const wav = Buffer.alloc(44 + samples.length * 2)
wav.write('RIFF', 0)
wav.writeUInt32LE(36 + samples.length * 2, 4)
wav.write('WAVEfmt ', 8)
wav.writeUInt32LE(16, 16)
wav.writeUInt16LE(1, 20)
wav.writeUInt16LE(1, 22)
wav.writeUInt32LE(SR, 24)
wav.writeUInt32LE(SR * 2, 28)
wav.writeUInt16LE(2, 32)
wav.writeUInt16LE(16, 34)
wav.write('data', 36)
wav.writeUInt32LE(samples.length * 2, 40)
for (let i = 0; i < samples.length; i += 1) wav.writeInt16LE(Math.round(samples[i] * 32767), 44 + i * 2)
const audioPath = path.join(tmpDir, 'audio.wav')
fs.writeFileSync(audioPath, wav)

/* ------------------------------ video clips --------------------------- */
const clips = []
for (const [index, scene] of SCENES.entries()) {
  const n = index + 1
  txtFile(`tag-${n}.txt`, scene.tag)
  txtFile(`title-${n}.txt`, scene.title)
  txtFile(`text-${n}.txt`, scene.text)
  const vf = [
    'scale=1600:900:force_original_aspect_ratio=increase',
    'crop=1600:900',
    "zoompan=z='min(zoom+0.0009,1.14)':d=1:s=1280x720:fps=30",
    `drawtext=textfile=tag-${n}.txt:fontfile=arial.ttf:fontsize=26:fontcolor=0x5EF2A0:x=(w-text_w)/2:y=h*0.20:enable='between(t,0.5,6.9)':expansion=none`,
    `drawtext=textfile=title-${n}.txt:fontfile=arial.ttf:fontsize=54:fontcolor=0xF3FFF7:box=1:boxcolor=0x03150ACC:boxborderw=18:x=(w-text_w)/2:y=h*0.38:enable='between(t,0.8,6.9)':expansion=none`,
    `drawtext=textfile=text-${n}.txt:fontfile=arial.ttf:fontsize=25:fontcolor=0xB9D6C4:x=(w-text_w)/2:y=h*0.62:enable='between(t,1.2,6.9)':expansion=none`,
    'fade=t=in:st=0:d=0.45',
    'fade=t=out:st=7:d=0.5',
  ].join(',')
  const clipName = `clip-${n}.mp4`
  run('ffmpeg', [
    '-y', '-loglevel', 'error', '-loop', '1', '-framerate', '30', '-t', String(CLIP), '-i', rasters[index],
    '-vf', vf, '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '27', '-pix_fmt', 'yuv420p', '-r', '30', '-an', clipName,
  ], `clip ${n}`, tmpDir)
  clips.push(path.join(tmpDir, clipName))
}

const list = path.join(tmpDir, 'list.txt')
fs.writeFileSync(list, clips.map((clip) => `file '${clip.replace(/\\/g, '/')}'`).join('\n') + '\n', 'utf8')

const video = path.join(outDir, 'maxseller-promo.mp4')
run('ffmpeg', [
  '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', list, '-i', audioPath,
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', video,
], 'mux video')

const poster = path.join(outDir, 'maxseller-promo-poster.jpg')
run('ffmpeg', ['-y', '-loglevel', 'error', '-ss', '2', '-i', video, '-frames:v', '1', '-q:v', '3', poster], 'poster')

console.log(`Promo video: ${video} (${(fs.statSync(video).size / 1024 / 1024).toFixed(2)} MB)`)
console.log(`Poster: ${poster}`)
