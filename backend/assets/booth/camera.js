/*
 * The booth's state machine, in a browser.
 *
 * The states and the two commands are the ones in the fotofix repository's
 * camera/PROTOCOL.md, because an exhibitor testing this should be testing the
 * thing that is in the entrance hall: red shoots and discards, green keeps, a
 * command that does not apply is dropped, and the lamps say which is which.
 *
 * What differs is what a browser forces: the camera has to be asked for, and
 * the slip is a download rather than a strip of paper. Neither changes the
 * order anything happens in.
 */

const CAPTURE_WIDTH = 640
const CAPTURE_HEIGHT = 480

/* What the booth does between the shutter and the freeze. */
const COUNTDOWN_FROM = 3
const COUNTDOWN_STEP_MS = 1000

const stage = document.querySelector('.stage')
const screens = new Map(
  [...document.querySelectorAll('.screen')].map((el) => [el.dataset.state, el]),
)
const video = document.getElementById('viewfinder')
const countEl = document.getElementById('count')

let state = null
let stream = null
/* The frame the exhibitor approved, unmirrored, as it will be uploaded. */
let frame = null
let photo = null
let countdownTimer = null

/* ── the screen ───────────────────────────────────────────────────────────── */

function show(next) {
  state = next
  for (const [name, el] of screens) {
    if (name === next) el.setAttribute('data-current', '')
    else el.removeAttribute('data-current')
  }
  const focus = screens.get(next)?.querySelector('button.button:not(:disabled)')
  focus?.focus({ preventScroll: true })
}

function fit() {
  const narrow = window.innerWidth < 900
  document.body.classList.toggle('narrow', narrow)
  if (narrow) {
    stage.style.removeProperty('--scale')
    return
  }
  const scale = Math.min(window.innerWidth / 1280, window.innerHeight / 1024)
  stage.style.setProperty('--scale', String(scale))
}

function fail(text) {
  document.getElementById('error-text').textContent = text
  show('error')
}

/* ── sound ────────────────────────────────────────────────────────────────── */

/*
 * A beep on each digit and a click at the freeze, as the booth makes with
 * sfplay. Synthesised rather than fetched: they are two sine bursts, and a
 * browser that refuses to make noise must not hold up the countdown.
 */
let audio = null

function tone(frequency, ms, type = 'sine') {
  if (!audio) return
  const osc = audio.createOscillator()
  const gain = audio.createGain()
  osc.type = type
  osc.frequency.value = frequency
  gain.gain.setValueAtTime(0.0001, audio.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.25, audio.currentTime + 0.01)
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000)
  osc.connect(gain).connect(audio.destination)
  osc.start()
  osc.stop(audio.currentTime + ms / 1000)
}

const beep = () => tone(880, 120)
const shutter = () => tone(180, 60, 'square')

/* ── the camera ───────────────────────────────────────────────────────────── */

async function startCamera() {
  if (!navigator.mediaDevices?.getUserMedia) {
    fail('Dieser Browser gibt keine Kamera frei. Bitte einen anderen verwenden.')
    return
  }

  /* The audio context has to be made inside the gesture that starts the
     camera, or the countdown counts in silence. */
  audio ??= new (window.AudioContext ?? window.webkitAudioContext)()
  audio.resume()

  stream = await navigator.mediaDevices
    .getUserMedia({
      video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 960 } },
      audio: false,
    })
    .catch((err) => {
      fail(
        err.name === 'NotAllowedError'
          ? 'Die Kamera wurde nicht freigegeben. Bitte die Erlaubnis erteilen und es noch einmal versuchen.'
          : `Die Kamera lässt sich nicht öffnen: ${err.message}`,
      )
      return null
    })
  if (!stream) return

  video.srcObject = stream
  await video.play()
  show('live')
}

/*
 * The frame the booth would have taken: 640x480, centre-cropped from whatever
 * the device's camera hands over, and unmirrored — the viewfinder is a mirror
 * so that posing works, but lettering in the room has to read correctly on the
 * slip.
 */
function grab(canvas) {
  const w = video.videoWidth
  const h = video.videoHeight
  const wanted = CAPTURE_WIDTH / CAPTURE_HEIGHT
  const cropW = w / h > wanted ? h * wanted : w
  const cropH = w / h > wanted ? h : w / wanted

  canvas
    .getContext('2d')
    .drawImage(
      video,
      (w - cropW) / 2,
      (h - cropH) / 2,
      cropW,
      cropH,
      0,
      0,
      CAPTURE_WIDTH,
      CAPTURE_HEIGHT,
    )
}

function copyFrame(id) {
  const target = document.getElementById(id)
  target.getContext('2d').drawImage(frame, 0, 0)
}

/* ── the commands ─────────────────────────────────────────────────────────── */

function countdown() {
  let at = COUNTDOWN_FROM
  countEl.hidden = false
  countEl.textContent = String(at)
  beep()

  countdownTimer = setInterval(() => {
    at -= 1
    if (at > 0) {
      countEl.textContent = String(at)
      beep()
      return
    }

    clearInterval(countdownTimer)
    countdownTimer = null
    countEl.hidden = true
    screens.get('live').querySelector('.cap.red').classList.remove('counting')

    shutter()
    frame = document.createElement('canvas')
    frame.width = CAPTURE_WIDTH
    frame.height = CAPTURE_HEIGHT
    grab(frame)
    copyFrame('frozen')
    show('frozen')
  }, COUNTDOWN_STEP_MS)
}

async function save() {
  copyFrame('saving')
  show('saving')

  const blob = await new Promise((resolve) => frame.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) {
    fail('Das Bild ließ sich nicht in ein JPEG umwandeln.')
    return
  }

  const response = await fetch('/api/visitor-photo/kamera', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  }).catch((err) => {
    fail(`Das Foto konnte nicht übertragen werden: ${err.message}`)
    return null
  })
  if (!response) return

  if (!response.ok) {
    const said = await response.text().catch(() => '')
    fail(`Die Website hat das Foto abgelehnt (${response.status}). ${said}`.trim())
    return
  }

  photo = await response.json()
  copyFrame('kept')
  document.getElementById('photo-id').textContent = photo.id
  document.getElementById('delete-code').textContent = photo.code
  const link = document.getElementById('photo-page')
  link.href = `/foto/${photo.id}`
  show('done')
}

/*
 * The slip. It carries the deletion code, so it is not a file lying on the
 * server waiting to be fetched by anyone who knows the id — it is rendered
 * against the code the browser is holding, which is the same proof the
 * deletion form asks for.
 */
async function receipt() {
  const response = await fetch(`/foto/${photo.id}/beleg.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: photo.code }),
  }).catch((err) => {
    fail(`Der Beleg konnte nicht erzeugt werden: ${err.message}`)
    return null
  })
  if (!response) return

  if (!response.ok) {
    fail(`Der Beleg konnte nicht erzeugt werden (${response.status}).`)
    return
  }

  const url = URL.createObjectURL(await response.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `${photo.id}-beleg.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

/*
 * One entry point for every button and every key, as the booth has one for the
 * button box and its own keyboard. A command that does not apply in the current
 * state is dropped without complaint.
 */
function command(what) {
  if (what === 'SHOOT') {
    if (state === 'attract') return void startCamera()
    if (state === 'live' && !countdownTimer) {
      screens.get('live').querySelector('.cap.red').classList.add('counting')
      return countdown()
    }
    if (state === 'frozen') {
      frame = null
      return show('live')
    }
    if (state === 'done') {
      frame = null
      photo = null
      return show('live')
    }
    return
  }

  if (what === 'SAVE' && state === 'frozen') return void save()
  if (what === 'RECEIPT' && state === 'done') return void receipt()

  /* Releasing a fault gives the picture back rather than dropping it: a failed
     upload is the usual cause, and the frame it failed on is still the one the
     exhibitor approved. */
  if (what === 'CLEAR' && state === 'error') {
    if (frame) {
      copyFrame('frozen')
      return show('frozen')
    }
    return show(stream ? 'live' : 'attract')
  }
}

for (const button of document.querySelectorAll('button.button')) {
  button.addEventListener('click', () => command(button.dataset.command))
}

/* The booth's own keyboard sends the same commands, so that it stays operable
   when the button box does not. */
addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  /* A focused button is already the browser's to activate, and it knows which
     one is focused; taking the key here would fire the red one either way. */
  if (event.target.closest?.('button.button')) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    command('SHOOT')
  } else if (event.key === 's') {
    command('SAVE')
  } else if (event.key === 'c') {
    command('CLEAR')
  }
})

addEventListener('resize', fit)
fit()
show('attract')
