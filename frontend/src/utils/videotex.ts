/*
 * A Minitel's page, read off the wire.
 *
 * A port in Minitel mode carries videotex, and a terminal emulator shown that
 * stream makes nothing of it: the cursor moves by US and two coordinates, the
 * picture is the mosaic set, and the colours are escape sequences no VT100
 * knows. This keeps the 40x25 page the terminal would show — clear, cursor
 * addressing, the G0/G1 shifts, the colour attributes, REP and the printable
 * codes — and paints it the way the 1B's tube does, the eight videotex colours
 * as eight greys.
 */

export const COLS = 40
export const ROWS = 25

/* The videotex colour codes in order of the grey each shows on the tube. */
const GREY_CODES = [0, 4, 1, 5, 2, 6, 3, 7]
const grey = (code: number) =>
  Math.round((Math.max(0, GREY_CODES.indexOf(code)) * 255) / (GREY_CODES.length - 1))

const WHITE = 7
const BLACK = 0

/* The six blocks of a mosaic cell weigh 1, 2, 4, 8, 16 and 64 in reading order. */
const BLOCK_WEIGHTS = [1, 2, 4, 8, 16, 64]

function mosaicBlocks(code: number): boolean[] {
  const value = (code & 0x1f) + (code >= 0x60 ? 0x20 : 0)
  return BLOCK_WEIGHTS.map((_, i) => (value & (1 << i)) !== 0)
}

type Cell = { code: number; mosaic: boolean; fg: number; bg: number }

const blank = (): Cell => ({ code: 0x20, mosaic: false, fg: WHITE, bg: BLACK })

/* What a control sequence is still waiting for, across chunk boundaries. */
type Pending = 'none' | 'row' | 'col' | 'attribute' | 'repeat'

export class VideotexScreen {
  private cells: Cell[] = Array.from({ length: COLS * ROWS }, blank)
  private row = 1
  private col = 1
  private fg = WHITE
  private bg = BLACK
  private mosaic = false
  private last: Cell = blank()
  private pending: Pending = 'none'
  private cursor = false

  reset() {
    this.cells = Array.from({ length: COLS * ROWS }, blank)
    this.row = 1
    this.col = 1
    this.fg = WHITE
    this.bg = BLACK
    this.mosaic = false
    this.pending = 'none'
    this.cursor = false
  }

  feed(bytes: Uint8Array) {
    for (const b of bytes) this.byte(b & 0x7f)
  }

  private byte(b: number) {
    switch (this.pending) {
      case 'row':
        this.row = b - 0x40
        this.pending = 'col'
        return
      case 'col':
        this.col = b - 0x40
        /* Addressing the cursor restores the terminal's default colours. */
        this.fg = WHITE
        this.bg = BLACK
        this.pending = 'none'
        return
      case 'attribute':
        if (b >= 0x40 && b <= 0x47) this.fg = b - 0x40
        else if (b >= 0x50 && b <= 0x57) this.bg = b - 0x50
        this.pending = 'none'
        return
      case 'repeat':
        for (let k = 0; k < b - 0x40; k++) this.put({ ...this.last })
        this.pending = 'none'
        return
    }

    if (b === 0x0c) {
      this.reset()
    } else if (b === 0x0e) {
      this.mosaic = true
    } else if (b === 0x0f) {
      this.mosaic = false
    } else if (b === 0x11) {
      this.cursor = true
    } else if (b === 0x14) {
      this.cursor = false
    } else if (b === 0x1f) {
      this.pending = 'row'
    } else if (b === 0x1b) {
      this.pending = 'attribute'
    } else if (b === 0x12) {
      this.pending = 'repeat'
    } else if (b === 0x08) {
      if (this.col > 1) this.col -= 1
    } else if (b === 0x0d) {
      this.col = 1
    } else if (b === 0x0a) {
      if (this.row < ROWS - 1) this.row += 1
    } else if (b >= 0x20) {
      this.put({ code: b, mosaic: this.mosaic, fg: this.fg, bg: this.bg })
    }
  }

  private put(cell: Cell) {
    if (this.row >= 0 && this.row < ROWS && this.col >= 1 && this.col <= COLS) {
      this.cells[this.row * COLS + this.col - 1] = cell
    }
    this.last = cell
    if (++this.col > COLS) {
      this.col = 1
      if (++this.row >= ROWS) this.row = 1
    }
  }

  /*
   * The page onto a canvas. A cell is drawn at whatever size the canvas gives
   * it; the tube shows 40x25 cells at 4:3, so the canvas should be that shape.
   */
  paint(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d')
    if (!context) return
    const cw = canvas.width / COLS
    const ch = canvas.height / ROWS
    const bands = [0, ch * 0.4, ch * 0.7, ch]

    context.font = `bold ${Math.floor(ch * 0.8)}px ui-monospace, Menlo, monospace`
    context.textBaseline = 'middle'
    context.textAlign = 'center'

    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        const cell = this.cells[r * COLS + c]
        const x = c * cw
        const y = r * ch
        context.fillStyle = `rgb(${grey(cell.bg)},${grey(cell.bg)},${grey(cell.bg)})`
        context.fillRect(x, y, cw, ch)
        const ink = `rgb(${grey(cell.fg)},${grey(cell.fg)},${grey(cell.fg)})`
        if (cell.mosaic) {
          const blocks = mosaicBlocks(cell.code)
          context.fillStyle = ink
          for (let by = 0; by < 3; by++) {
            for (let bx = 0; bx < 2; bx++) {
              if (!blocks[by * 2 + bx]) continue
              context.fillRect(
                x + (bx * cw) / 2,
                y + bands[by],
                cw / 2 + 0.5,
                bands[by + 1] - bands[by] + 0.5,
              )
            }
          }
        } else if (cell.code > 0x20) {
          context.fillStyle = ink
          context.fillText(String.fromCharCode(cell.code), x + cw / 2, y + ch / 2)
        }
      }
    }

    if (this.cursor && this.row < ROWS && this.col <= COLS) {
      context.fillStyle = 'rgba(255,255,255,0.8)'
      context.fillRect((this.col - 1) * cw, this.row * ch, cw, ch)
    }
  }
}
