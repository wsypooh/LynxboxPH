// Packages everything needed to record voice-overs, then applies the finished audio.
//   node scripts/help-media/voiceover-kit.mjs build   -> out/voiceover-kit/ (silent videos + timed scripts)
//   node scripts/help-media/voiceover-kit.mjs apply   -> mixes every out/voiceover-kit/audio/<topic>.(m4a|mp3|wav)
//                                                       into public/help-videos/<topic>.mp4
import fs from 'fs'
import path from 'path'
import { execFileSync } from 'child_process'

const here = import.meta.dirname
const root = path.resolve(here, '../..')
const outDir = path.join(here, 'out')
const kit = path.join(outDir, 'voiceover-kit')
const audioDir = path.join(kit, 'audio')
const videos = path.join(root, 'public/help-videos')
const narrationDir = path.join(here, 'narration')
const mode = process.argv[2]

const fmt = s => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`
const duration = f => parseFloat(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f]).toString())
const topics = fs.readdirSync(narrationDir).filter(f => f.endsWith('.md')).map(f => f.replace(/\.md$/, ''))

if (mode === 'build') {
  fs.mkdirSync(audioDir, { recursive: true })
  for (const f of fs.readdirSync(kit)) if (/\.(mp4|md)$/.test(f)) fs.rmSync(path.join(kit, f))
  const index = []
  for (const t of topics) {
    const video = path.join(videos, `${t}.mp4`)
    const metaFile = path.join(outDir, `${t}.json`)
    if (!fs.existsSync(video) || !fs.existsSync(metaFile)) { console.warn(`skip ${t}: no video/marks yet`); continue }
    const { marks } = JSON.parse(fs.readFileSync(metaFile, 'utf8'))
    const md = fs.readFileSync(path.join(narrationDir, `${t}.md`), 'utf8')
    const title = (md.match(/^# Narration: (.+)$/m) || [, t])[1]
    const rows = [...md.matchAll(/^\|\s*(\w+)\s*\|\s*([^|]*?)\s*\|\s*"(.+)"\s*\|\s*$/gm)]
    const len = duration(video)
    let script = `# ${title}\n\nVideo: \`${t}.mp4\` (${len.toFixed(1)}s, silent). Save your recording as \`audio/${t}.m4a\` (or .mp3 / .wav).\n` +
      `The demo fills in forms but closes them without saving, so on the last line say what clicking Save would do.\n\n` +
      `| Time | Step | On screen | Say |\n| --- | --- | --- | --- |\n`
    for (const [, step, screen, line] of rows) {
      script += `| ${marks[step] !== undefined ? fmt(marks[step]) : '?'} | ${step} | ${screen} | ${line} |\n`
    }
    fs.writeFileSync(path.join(kit, `${t}.script.md`), script)
    fs.copyFileSync(video, path.join(kit, `${t}.mp4`))
    index.push(`- **${title}** — \`${t}.mp4\` + \`${t}.script.md\` (${len.toFixed(0)}s)`)
  }
  fs.writeFileSync(path.join(kit, 'README.md'),
    `# Voice-over kit\n\n${index.join('\n')}\n\n## How to use\n1. Watch each \`<topic>.mp4\` while reading its \`<topic>.script.md\` (times are when each step starts on screen).\n` +
    `2. Record the narration and save it in \`audio/\` as \`<topic>.m4a\`, \`.mp3\` or \`.wav\` (same name as the video).\n` +
    `3. Run \`node scripts/help-media/voiceover-kit.mjs apply\` from \`lynxbox-ph/\`. This mixes each audio file into \`public/help-videos/<topic>.mp4\`.\n` +
    `   If the narration runs longer than the video, the last frame is held so nothing is cut off.\n`)
  console.log(`Kit built: ${kit} (${index.length} topics)`)
} else if (mode === 'apply') {
  const files = fs.existsSync(audioDir) ? fs.readdirSync(audioDir) : []
  let applied = 0
  for (const t of topics) {
    const audio = files.find(f => new RegExp(`^${t}\\.(m4a|mp3|wav|aac|ogg)$`, 'i').test(f))
    if (!audio) continue
    execFileSync('node', [path.join(here, 'finalize-video.mjs'), t, path.join(audioDir, audio)], { stdio: 'inherit' })
    applied++
  }
  console.log(applied ? `Applied ${applied} voice-over(s).` : `No audio files found in ${audioDir}`)
} else {
  console.error('Usage: node scripts/help-media/voiceover-kit.mjs build|apply')
  process.exit(1)
}
