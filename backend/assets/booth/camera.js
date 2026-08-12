/*
 * The booth's state machine, in a browser.
 *
 * The states, the transitions and the two commands are the ones in the fotofix
 * repository's camera/PROTOCOL.md, including the waits: three seconds of
 * countdown, thirty for a frozen frame nobody confirms, three minutes of
 * nothing before the invitation comes back. An exhibitor pressing these is
 * being shown the machine in the entrance hall, so it behaves like it.
 *
 * Two things a browser forces. The camera has to be asked for, which happens on
 * the first press rather than at the invitation. And there is no printer: the
 * slip is fetched as a PDF at the moment the printer would be producing it,
 * which is what the PRINTING screen is already there to cover.
 */

/* Seconds, as fotofix.conf spells them for the booth. */
const COUNTDOWN_FROM = 3
const COUNTDOWN_STEP_MS = 1000
const CONFIRM_TIMEOUT_MS = 30_000
const DONE_MS = 6_000
const ATTRACT_AFTER_MS = 180_000

const stage = document.querySelector('.stage')
const screens = new Map(
  [...document.querySelectorAll('.screen')].map((el) => [el.dataset.state, el]),
)
const video = document.getElementById('viewfinder')
const frozen = document.getElementById('frozen')
const picture = document.getElementById('picture')
const countdownEl = document.getElementById('countdown')
const photoIdEl = document.getElementById('photo-id')

/* Which screens the picture is drawn on. The manifest says the same thing to
   the Indy; here the element is simply hidden on the other two. */
const SHOWS_PICTURE = new Set(['live', 'keep', 'printing', 'done'])

let state = null
let stream = null
/* The frame at the end of the countdown, unmirrored, as it will be uploaded. */
let frame = null
let timer = null
let idle = null

/* ── the screens ──────────────────────────────────────────────────────────── */

function show(next) {
  state = next
  for (const [name, el] of screens) {
    if (name === next) el.setAttribute('data-current', '')
    else el.removeAttribute('data-current')
  }

  picture.hidden = !SHOWS_PICTURE.has(next)
  frozen.hidden = next === 'live'
  countdownEl.hidden = true
  photoIdEl.hidden = next !== 'done'

  clearTimeout(timer)
  timer = null
  if (next === 'keep') timer = setTimeout(() => command('SHOOT'), CONFIRM_TIMEOUT_MS)
  if (next === 'done') timer = setTimeout(() => show('live'), DONE_MS)

  /* Three minutes of nothing and the invitation comes back, as at the booth. */
  clearTimeout(idle)
  idle = null
  if (next === 'live') idle = setTimeout(() => show('attract'), ATTRACT_AFTER_MS)

  lamps()
}

/*
 * The lamps, as the button box would light them for this state. The screens
 * ship with the caps the booth painted on them; what changes here is only the
 * blinking, which no still image can carry.
 */
function lamps() {
  for (const cap of document.querySelectorAll('.cap')) {
    cap.classList.remove('beckon', 'counting', 'working', 'fault')
  }
  const current = screens.get(state)
  const caps = current ? [...current.querySelectorAll('.cap')] : []

  if (state === 'attract') caps[0]?.classList.add('beckon')
  if (state === 'printing') caps.forEach((cap) => cap.classList.add('working'))
  if (state === 'error') caps.forEach((cap) => cap.classList.add('fault'))
}

function fit() {
  stage.style.setProperty(
    '--scale',
    String(Math.min(window.innerWidth / 1280, window.innerHeight / 1024)),
  )
}

function fail(what) {
  const sub = screens.get('error').querySelector('.sub')
  if (sub && what) sub.textContent = what
  show('error')
}

/* ── sound ────────────────────────────────────────────────────────────────── */

/*
 * A beep on each digit and the shutter at the freeze, as the booth makes with
 * sfplay. Nothing waits for a sound: a browser that refuses to make noise must
 * not hold up the countdown.
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
  if (stream) return true
  if (!navigator.mediaDevices?.getUserMedia) {
    fail('Dieser Browser gibt keine Kamera frei.')
    return false
  }

  /* The audio context has to be made inside a gesture, or the countdown counts
     in silence. */
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
          ? 'Die Kamera wurde nicht freigegeben. Bitte die Erlaubnis erteilen.'
          : `Die Kamera lässt sich nicht öffnen: ${err.message}`,
      )
      return null
    })
  if (!stream) return false

  video.srcObject = stream
  await video.play()
  return true
}

/*
 * The frame the Indy would have taken: the viewfinder's own 640x480,
 * centre-cropped from whatever this device's camera hands over, and unmirrored.
 */
function grab() {
  const w = video.videoWidth
  const h = video.videoHeight
  const wanted = frozen.width / frozen.height
  const cropW = w / h > wanted ? h * wanted : w
  const cropH = w / h > wanted ? h : w / wanted

  frozen
    .getContext('2d')
    .drawImage(
      video,
      (w - cropW) / 2,
      (h - cropH) / 2,
      cropW,
      cropH,
      0,
      0,
      frozen.width,
      frozen.height,
    )
  frame = frozen
}

/* ── the transitions ──────────────────────────────────────────────────────── */

function countdown() {
  let at = COUNTDOWN_FROM
  const plate = countdownEl.querySelector('.plate')
  const cap = screens.get('live').querySelector('.cap')

  countdownEl.hidden = false
  plate.textContent = String(at)
  cap?.classList.add('counting')
  beep()

  timer = setInterval(() => {
    at -= 1
    if (at > 0) {
      plate.textContent = String(at)
      beep()
      return
    }

    clearInterval(timer)
    timer = null
    cap?.classList.remove('counting')
    shutter()
    grab()
    show('keep')
  }, COUNTDOWN_STEP_MS)
}

/*
 * What the booth does between the green button and the closing screen: the
 * photo goes up, the slip is produced, and only then is there an ID to show.
 */
async function save() {
  show('printing')

  const blob = await new Promise((resolve) => frozen.toBlob(resolve, 'image/jpeg', 0.92))
  if (!blob) return fail('Das Bild ließ sich nicht in ein JPEG umwandeln.')

  const response = await fetch('/api/visitor-photo/kamera', {
    method: 'POST',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  }).catch((err) => fail(`Das Foto konnte nicht übertragen werden: ${err.message}`))
  if (!response) return
  if (!response.ok) return fail(`Die Website hat das Foto abgelehnt (${response.status}).`)

  const photo = await response.json()
  if (!(await slip(photo))) {
    /* A printer that has quietly stopped is what the booth's fault screen is
       for, and a slip that never arrived is worse here: the deletion code is on
       it and nowhere else. */
    return fail('Der Laufzettel konnte nicht erzeugt werden.')
  }

  /* The glyph sheet, six cells of it, in the slot the manifest reserves. */
  photoIdEl.replaceChildren(
    ...[...photo.id].map((ch) => {
      const cell = document.createElement('div')
      cell.className = 'cell glyph'
      cell.textContent = ch
      return cell
    }),
  )
  show('done')
}

/*
 * The Laufzettel. On the booth it is on paper before this screen is reached, so
 * it is fetched here rather than offered as something to press: the deletion
 * code is on it and nowhere else, and a slip nobody took is a slip lost.
 */
async function slip(photo) {
  const response = await fetch(`/foto/${photo.id}/beleg.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: photo.code }),
  }).catch(() => null)
  if (!response?.ok) return false

  const url = URL.createObjectURL(await response.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `${photo.id}-beleg.pdf`
  a.click()
  URL.revokeObjectURL(url)
  return true
}

/*
 * One way in, as the booth has one for the button box and its own keyboard. A
 * command that does not apply in the current state is dropped without
 * complaint, so a press can be sent whenever it happens.
 */
async function command(what) {
  if (state === 'attract') {
    /* Any button wakes it — and this is the gesture the camera is asked for on. */
    if (await startCamera()) show('live')
    return
  }

  if (what === 'SHOOT') {
    if (state === 'live' && !timer) return countdown()
    if (state === 'keep') {
      frame = null
      return show('live')
    }
    return
  }

  if (what === 'SAVE' && state === 'keep') return void save()
  if (what === 'CLEAR' && state === 'error') return show(stream ? 'live' : 'attract')
}

/*
 * The caps the screens are drawn with become the things to press: on every
 * screen the first is the red button and the second the green one, which is
 * what the booth's own labels underneath them say.
 */
for (const screen of screens.values()) {
  screen.querySelectorAll('.foot .button').forEach((button, i) => {
    const what = i === 0 ? 'SHOOT' : 'SAVE'
    button.dataset.command = what
    button.setAttribute('role', 'button')
    button.setAttribute('tabindex', '0')
    button.addEventListener('click', () => command(what))
    button.addEventListener('keydown', (event) => {
      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        command(what)
      }
    })
  })
}

/* The invitation says any button, and there is no button box to press. */
screens.get('attract').addEventListener('click', () => command('SHOOT'))

/*
 * A fault at the booth is released over the control port by somebody from the
 * stand. There is no control port here, so the screen itself takes it.
 */
screens.get('error').addEventListener('click', () => command('CLEAR'))

/* The booth's own keyboard sends the same commands, and so does this one. */
addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (event.target.closest?.('[data-command]')) return
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
