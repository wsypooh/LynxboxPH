# Generates a DRAFT synthetic voice-over from scripts/help-media/narration/<topic>.md using
# the offline Windows voices, then mixes it into the topic's video via finalize-video.mjs.
# Usage: pwsh scripts/help-media/make-voiceover.ps1 -Topic record-payment [-Voice "Microsoft Zira Desktop"] [-Rate 0]
# Replace with a human recording later by passing it to finalize-video.mjs directly.
param(
  [Parameter(Mandatory)][string]$Topic,
  [string]$Voice = 'Microsoft Zira Desktop',
  [int]$Rate = 0
)
$ErrorActionPreference = 'Stop'
$here = $PSScriptRoot
$root = Resolve-Path (Join-Path $here '../..')
$outDir = Join-Path $here "out/voice-$Topic"
New-Item -ItemType Directory -Force $outDir | Out-Null
Get-ChildItem $outDir -Filter *.wav | Remove-Item

$rows = Select-String -Path (Join-Path $here "narration/$Topic.md") -Pattern '^\|\s*([\w:]+)\s*\|[^|]*\|\s*"(.+)"\s*\|\s*$'
if (-not $rows) { throw "No narration rows found in narration/$Topic.md" }
$metaFile = Join-Path $here "out/$Topic.json"
$marks = if (Test-Path $metaFile) { (Get-Content $metaFile -Raw | ConvertFrom-Json).marks } else { $null }

Add-Type -AssemblyName System.Speech
$tts = New-Object System.Speech.Synthesis.SpeechSynthesizer
$tts.SelectVoice($Voice)
$tts.Rate = $Rate

$clips = @()
$cursor = 0.0
$i = 0
foreach ($r in $rows) {
  $g = $r.Matches[0].Groups
  $when = $g[1].Value
  if ($when -match '^(\d+):(\d+)$') { $target = [int]$Matches[1] * 60 + [int]$Matches[2] }
  elseif ($marks -and $null -ne $marks.$when) { $target = [double]$marks.$when }
  else { throw "Unknown step '$when' (no such mark in out/$Topic.json - re-run the recording script)" }
  $wav = Join-Path $outDir ("{0:D2}.wav" -f $i)
  $tts.SetOutputToWaveFile($wav)
  $tts.Speak($g[2].Value)
  $tts.SetOutputToNull()
  $len = [double](& ffprobe -v error -show_entries format=duration -of csv=p=0 $wav)
  $start = [Math]::Max($target, $cursor + 0.3)   # never overlap the previous line
  $clips += [pscustomobject]@{ File = $wav; Start = $start }
  $cursor = $start + $len
  $i++
}
$tts.Dispose()

$ffArgs = @('-y')
foreach ($c in $clips) { $ffArgs += @('-i', $c.File) }
$filters = @(); $labels = ''
for ($n = 0; $n -lt $clips.Count; $n++) {
  $ms = [int]($clips[$n].Start * 1000)
  $filters += "[$n]adelay=$ms|$ms[a$n]"
  $labels += "[a$n]"
}
$filters += "${labels}amix=inputs=$($clips.Count):normalize=0[out]"
$mix = Join-Path $outDir 'voiceover.m4a'
$ffArgs += @('-filter_complex', ($filters -join ';'), '-map', '[out]', '-c:a', 'aac', $mix)
& ffmpeg @ffArgs 2>$null
if ($LASTEXITCODE -ne 0) { throw 'ffmpeg mix failed' }

Write-Host ("Voice-over: {0} ({1:N1}s)" -f $mix, $cursor)
Push-Location $root
try { node scripts/help-media/finalize-video.mjs $Topic $mix } finally { Pop-Location }
