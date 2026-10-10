// Mixes an optional voice-over into a recorded walkthrough and compresses it for the web.
// Usage: node scripts/help-media/finalize-video.mjs <topic> [voiceover.(mp3|wav|m4a)]
//   in : scripts/help-media/out/<topic>.mp4
//   out: public/help-videos/<topic>.mp4  (720p, H.264 + AAC, faststart)
// If the voice-over is longer than the video, the last frame is held so nothing is cut off.
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const [topic, voiceover] = process.argv.slice(2)
if (!topic) {
  console.error('Usage: node scripts/help-media/finalize-video.mjs <topic> [voiceover-file]')
  process.exit(1)
}

const root = path.resolve(import.meta.dirname, '../..')
const input = path.join(root, 'scripts/help-media/out', `${topic}.mp4`)
const outDir = path.join(root, 'public/help-videos')
const output = path.join(outDir, `${topic}.mp4`)
if (!fs.existsSync(input)) throw new Error(`Recording not found: ${input} (run the topic's script first)`)
if (voiceover && !fs.existsSync(voiceover)) throw new Error(`Voice-over file not found: ${voiceover}`)
fs.mkdirSync(outDir, { recursive: true })

const duration = file =>
  parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file]).toString())

// The recorder notes how much page-loading time to cut from the start.
const metaFile = path.join(root, 'scripts/help-media/out', `${topic}.json`)
const trimStart = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, 'utf8')).trimStart || 0 : 0
const videoLength = duration(input) - trimStart

const args = ['-y']
if (trimStart > 0) args.push('-ss', String(trimStart))
args.push('-i', input)
let filter = 'scale=-2:720'
if (voiceover) {
  args.push('-i', voiceover)
  const extra = duration(voiceover) - videoLength
  if (extra > 0) filter += `,tpad=stop_mode=clone:stop_duration=${(extra + 0.5).toFixed(2)}`
  args.push('-map', '0:v', '-map', '1:a', '-c:a', 'aac', '-b:a', '128k')
} else {
  args.push('-an')
}
args.push('-vf', filter, '-c:v', 'libx264', '-crf', '28', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', output)

execFileSync('ffmpeg', args, { stdio: 'ignore' })
const mb = (fs.statSync(output).size / 1024 / 1024).toFixed(2)
console.log(`${output} (${mb} MB, ${duration(output).toFixed(1)}s${voiceover ? ', with voice-over' : ', silent'})`)
if (mb > 3) console.warn('Warning: over 3 MB; consider a shorter clip or higher CRF.')
