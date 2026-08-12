/*
 * The booth's state machine, in a browser.
 *
 * The states, the transitions and the commands are the ones in the fotofix
 * repository's camera/PROTOCOL.md, including the waits: three seconds of
 * countdown, thirty for a frozen frame nobody confirms, three minutes of
 * nothing before the invitation returns. An exhibitor pressing these is being
 * shown the machine in the entrance hall, so it behaves like it.
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
const video = document.getElementById('viewfinder')
const frozen = document.getElementById('frozen')
const picture = document.getElementById('picture')
const countdownEl = document.getElementById('countdown')
const photoIdEl = document.getElementById('photo-id')

/*
 * Every installed language has a full set of screens, keyed by both. Nothing
 * here enumerates the languages: what the page was given is what there is, as
 * on the booth, where a language is a directory.
 */
const screens = new Map(
  [...document.querySelectorAll('.screen')].map((el) => [
    `${el.dataset.lang}/${el.dataset.state}`,
    el,
  ]),
)
const languages = [
  ...new Set([...document.querySelectorAll('.screen')].map((el) => el.dataset.lang)),
]
/* The one the booth returns to by itself, and the one this starts in. */
const DEFAULT_LANGUAGE = languages[0]

let language = DEFAULT_LANGUAGE
let state = null
let stream = null
/* The frame at the end of the countdown, unmirrored, as it will be uploaded. */
let frame = null
let counting = false
let timer = null
let idle = null

/* Which screens the picture is drawn on, as screen.manifest says. */
const SHOWS_PICTURE = new Set(['live', 'keep', 'printing', 'done'])

/* ── the screens ──────────────────────────────────────────────────────────── */

/*
 * `keepLanguage` is for a screen reached from the address, which names the
 * language it wants. `hold` is for the same case: a step opened to be looked at
 * stays on screen, where one the booth arrived at moves on by itself. The first
 * button press puts it back on the clock.
 */
function show(next, { keepLanguage = false, hold = false } = {}) {
  /*
   * The language goes back to the booth's own on every arrival at LIVE and
   * ATTRACT, so the next person in front of it starts where the booth starts.
   * Pressing it again once you are there sticks, which is how a visitor takes
   * their photo in English.
   */
  if (!keepLanguage && next !== state && (next === 'live' || next === 'attract')) {
    language = DEFAULT_LANGUAGE
  }

  state = next
  paint()

  picture.hidden = !SHOWS_PICTURE.has(next)
  frozen.hidden = next === 'live'
  countdownEl.hidden = true
  photoIdEl.hidden = next !== 'done'

  clearTimeout(timer)
  clearTimeout(idle)
  timer = idle = null
  if (hold) return

  if (next === 'keep') timer = setTimeout(() => command('SHOOT'), CONFIRM_TIMEOUT_MS)
  /* The photo ID stands for done_seconds and then the invitation returns, as
     ST_DONE does in the booth: whoever comes next should find the invitation
     rather than a viewfinder with the last person's back in it. */
  if (next === 'done') timer = setTimeout(() => show('attract'), DONE_MS)

  /* Three minutes of nothing and the invitation comes back, as at the booth. */
  if (next === 'live') idle = setTimeout(() => show('attract'), ATTRACT_AFTER_MS)
}

/*
 * The screen for the state and the language currently in force — and the
 * address, which says the same two things in the same order as the template
 * they come from. Replacing rather than pushing keeps the back button meaning
 * what it did before, which is "leave", not "undo one countdown".
 */
function paint() {
  for (const [key, el] of screens) {
    if (key === `${language}/${state}`) el.setAttribute('data-current', '')
    else el.removeAttribute('data-current')
  }
  document.documentElement.lang = language
  history.replaceState(null, '', `/foto/kamera/${language}/${state}`)
}

function fit() {
  /* The screen is scaled to fit what is left after the buttons below it. */
  const box = document.querySelector('.controls').getBoundingClientRect().height + 64
  stage.style.setProperty(
    '--scale',
    String(Math.min(window.innerWidth / 1280, (window.innerHeight - box) / 1024)),
  )
}

function fail(what) {
  for (const lang of languages) {
    const sub = screens.get(`${lang}/error`)?.querySelector('.sub')
    if (sub && what) sub.textContent = what
  }
  show('error')
}

/* ── the lamps ────────────────────────────────────────────────────────────── */

/*
 * The button box's own table, from camera/buttonbox/main.py. A pattern is OFF,
 * ON, or a blink written as on-time and period in milliseconds, and it is timed
 * here the way the Pico times it, so no rate is written down twice. `keep` is
 * the screen's name for the state the protocol calls `frozen`.
 */
const OFF = null
const ON = true
const LAMPS = {
  attract: [[250, 2000], OFF],
  live: [ON, OFF],
  countdown: [[120, 240], OFF],
  keep: [ON, ON],
  printing: [OFF, [200, 400]],
  done: [OFF, ON],
  error: [
    [150, 300],
    [150, 300],
  ],
}

const redCap = document.querySelector('[data-command="SHOOT"] .cap')
const greenCap = document.querySelector('[data-command="SAVE"] .cap')

function setLamp(cap, pattern, now) {
  const lit = pattern === ON ? true : pattern === OFF ? false : now % pattern[1] < pattern[0]
  cap.classList.toggle('lit', lit)
}

setInterval(() => {
  const [red, green] = LAMPS[counting ? 'countdown' : state] ?? [OFF, OFF]
  const now = performance.now()
  setLamp(redCap, red, now)
  setLamp(greenCap, green, now)
}, 30)

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

  counting = true
  countdownEl.hidden = false
  plate.textContent = String(at)
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
    counting = false
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

  showId(photo.id)
  rememberPhoto(photo.id)
  show('done')
}

/*
 * The Laufzettel. On the booth it is on paper before this screen is reached, so
 * it arrives by itself rather than being offered as something to press: the
 * deletion code is on it and nowhere else, and a slip nobody took is a slip
 * lost.
 */
async function slip(photo) {
  const response = await fetch(`/foto/${photo.id}/beleg.pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: photo.code }),
  }).catch(() => null)
  if (!response?.ok) return false

  /*
   * The anchor goes into the document before it is clicked and the object URL
   * outlives the click: a detached anchor does nothing in some browsers, and
   * revoking the URL in the same tick cancels the transfer it just started.
   */
  const url = URL.createObjectURL(await response.blob())
  const a = document.createElement('a')
  a.href = url
  a.download = `${photo.id}-beleg.pdf`
  a.rel = 'noopener'
  a.style.display = 'none'
  document.body.append(a)
  a.click()
  setTimeout(() => {
    a.remove()
    URL.revokeObjectURL(url)
  }, 60_000)
  return true
}

/*
 * One way in, as the booth has one for the button box and its own keyboard. A
 * command that does not apply in the current state is dropped without
 * complaint, so a press can be sent whenever it happens.
 */
async function command(what) {
  if (what === 'LANG') {
    language = languages[(languages.indexOf(language) + 1) % languages.length]
    paint()
    return
  }

  if (state === 'attract') {
    /* Any button wakes it — and this is the gesture the camera is asked for on. */
    if (await startCamera()) show('live')
    return
  }

  if (what === 'SHOOT') {
    if (state === 'live' && !counting) return countdown()
    if (state === 'keep') {
      frame = null
      return show('live')
    }
    /*
     * A fault at the booth is released over the control port by somebody from
     * the stand. There is no control port here, so the red button takes it.
     */
    if (state === 'error') return show(stream ? 'live' : 'attract')
    return
  }

  if (what === 'SAVE' && state === 'keep') return void save()
  if (what === 'CLEAR' && state === 'error') return show(stream ? 'live' : 'attract')
}

for (const button of document.querySelectorAll('.box-button')) {
  button.addEventListener('click', () => command(button.dataset.command))
}

/* The booth's own keyboard sends the same commands, and so does this one. */
addEventListener('keydown', (event) => {
  if (event.metaKey || event.ctrlKey || event.altKey) return
  if (event.target.closest?.('.box-button')) return
  if (event.key === ' ' || event.key === 'Enter') {
    event.preventDefault()
    command('SHOOT')
  } else if (event.key === 's') {
    command('SAVE')
  } else if (event.key === 'l') {
    command('LANG')
  } else if (event.key === 'c') {
    command('CLEAR')
  }
})

/*
 * The screen is scaled against the space the buttons leave, so it has to be
 * measured again whenever either could have changed — a window resize, but also
 * the first layout and the moment a webfont settles, which is why the box is
 * observed rather than measured once.
 */
addEventListener('resize', fit)
new ResizeObserver(fit).observe(document.querySelector('.controls'))
fit()

/*
 * Where to start: the address, if it names a screen that exists, so that a
 * reload comes back to the step that was open. The language comes with it and
 * is kept rather than reset — the address is what is being looked at, and
 * resetting it would make /foto/kamera/en/live show the German one.
 */
function start() {
  const [, , , lang, step] = location.pathname.split('/')
  if (step && screens.has(`${lang}/${step}`)) {
    language = lang
    /* Nothing has been photographed, so the closing screen would have an empty
       slot. A stand-in id makes the layout visible while it is being edited. */
    if (step === 'done') showId('K7NP4M')
    show(step, { keepLanguage: true, hold: true })
    return
  }
  show('attract')
}

/*
 * The last photo taken on this page, beside the button box. The closing screen
 * shows the id for six seconds and then the invitation returns, which is right
 * for a booth and awkward here — this keeps the page it landed on within reach.
 *
 * Kept for the tab rather than in a variable, so that it survives the reload
 * that a saved screen triggers.
 */
const lastPhotoEl = document.getElementById('last-photo')

function rememberPhoto(id) {
  sessionStorage.setItem('last-photo', id)
  showLastPhoto(id)
}

function showLastPhoto(id) {
  if (!id) return
  const link = lastPhotoEl.querySelector('a')
  /* Relative to the site, so the same page works here and on the exhibition's
     own server. */
  link.href = `/foto/${id}`
  link.textContent = id
  lastPhotoEl.hidden = false
}

/* The glyph sheet, six cells of it, in the slot the manifest reserves. */
function showId(id) {
  photoIdEl.replaceChildren(
    ...[...id].map((ch) => {
      const cell = document.createElement('div')
      cell.className = 'cell glyph'
      cell.textContent = ch
      return cell
    }),
  )
}

/*
 * While the screens are being worked on, the page asks what the server last
 * read them at and reloads when that changes. The address already carries the
 * step, so it comes back to the same screen — saving a template and looking at
 * the browser is the whole loop.
 *
 * Off in production: the server does not mark the page for it, and nothing here
 * runs.
 */
async function watchForEdits() {
  /* The server marks its own script tag when it is not running in production.
     `document.currentScript` is null in a module, so the tag is looked up. */
  if (!document.querySelector('script[data-watch]')) return

  /*
   * The server holds each question until the screens have changed, so this asks
   * again as soon as it is answered rather than on a timer: a save comes back
   * at once, and an idle editor makes a request every twenty seconds instead of
   * one a second. Every request here opens a database transaction, and one a
   * second was enough to starve the rest of the server.
   */
  let known = null
  for (;;) {
    const answer = await fetch(
      `/foto/kamera/stamp${known === null ? '' : `?since=${encodeURIComponent(known)}`}`,
    ).then(
      (r) => (r.ok ? r.json() : null),
      () => null,
    )

    /* A server that is restarting answers nothing; try again shortly rather
       than spinning against a closed port. */
    if (!answer) {
      await new Promise((resolve) => setTimeout(resolve, 2000))
      continue
    }
    if (known !== null && known !== answer.stamp) return location.reload()
    known = answer.stamp
  }
}

start()
showLastPhoto(sessionStorage.getItem('last-photo'))
watchForEdits()
