/*
 * The badges the seating plan can put on a table. Fotofix comes from the table
 * itself; the others come from the checkbox survey questions that carry a map
 * marker, and mark every table held by an exhibitor who ticked one. A marker
 * is known by its kind: `fotofix`, or the question's key.
 */
export type Marker = {
  kind: string
  letter: string
  color: string
  label: string
}

export const FOTOFIX_MARKER: Marker = {
  kind: 'fotofix',
  letter: 'F',
  color: '#c62828',
  label: 'fotofix',
}

export const DEFAULT_MARKERS = [FOTOFIX_MARKER.kind]

const svgNS = 'http://www.w3.org/2000/svg'

/*
 * The group that holds every badge, last in the plan so that the badges, and
 * their pulse, lie above all tables. Moved to the end again on each call, in
 * case the plan has grown since.
 */
export const markerLayer = (svg: SVGSVGElement) => {
  let layer = svg.querySelector<SVGGElement>(':scope > g[data-marker-layer]')
  if (!layer) {
    layer = document.createElementNS(svgNS, 'g')
    layer.setAttribute('data-marker-layer', '')
    layer.setAttribute('pointer-events', 'none')
  }
  svg.appendChild(layer)
  return layer
}

/* A table's box in the layer's coordinates, whatever transforms lie between them. */
const boxIn = (layer: SVGGElement, element: Element) => {
  const box = (element as SVGGraphicsElement).getBBox()
  const toLayer = layer
    .getScreenCTM()
    ?.inverse()
    .multiply((element as SVGGraphicsElement).getScreenCTM()!)
  if (!toLayer) return box
  const corners = [
    [box.x, box.y],
    [box.x + box.width, box.y],
    [box.x, box.y + box.height],
    [box.x + box.width, box.y + box.height],
  ].map(([x, y]) => new DOMPoint(x, y).matrixTransform(toLayer))
  const xs = corners.map((corner) => corner.x)
  const ys = corners.map((corner) => corner.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, width: Math.max(...xs) - x, height: Math.max(...ys) - y }
}

/*
 * The sizes of the badges, from the short side of a typical table: small
 * enough that four fit on a table beside its number, and a pulse that grows
 * them to a size that stands out on the whole plan.
 */
export const markerSizes = (layer: SVGGElement, tableElements: Element[]) => {
  const shorts = tableElements
    .map((element) => boxIn(layer, element))
    .map((box) => Math.min(box.width, box.height))
    .filter((short) => short > 0)
    .sort((a, b) => a - b)
  const short = shorts[Math.floor(shorts.length / 2)] ?? 0
  const pad = short * 0.04
  const radius = (short - pad * 3) / 4
  return { radius, pad, pulseScale: radius ? (short * 0.62) / radius : 1 }
}

export type MarkerSizes = ReturnType<typeof markerSizes>

/*
 * Draws the badges of one table into the layer. They fill the corners, two at the right or
 * top end first, then two at the other, then further rows inward, so that the
 * table number in the middle stays readable. A white ring carries them against
 * any table colour. The table's earlier badges are removed first, so that a
 * marker turned off disappears.
 */
export const drawMarkers = (
  layer: SVGGElement,
  tableElement: Element,
  markers: Marker[],
  { radius, pad, pulseScale }: MarkerSizes,
) => {
  layer
    .querySelectorAll(`[data-marker-table="${tableElement.id}"]`)
    .forEach((existing) => existing.remove())
  if (!markers.length || !radius) return

  const box = boxIn(layer, tableElement)
  if (!box.width || !box.height) return

  const horizontal = box.width >= box.height
  const short = horizontal ? box.height : box.width
  const shortStart = horizontal ? box.y : box.x
  const longStart = horizontal ? box.x : box.y
  const longEnd = longStart + (horizontal ? box.width : box.height)

  markers.forEach((marker, index) => {
    const row = Math.floor(index / 4)
    const atFarEnd = index % 4 < 2
    const column = index % 2
    // The first column is the right one on an upright table, the top one on a lying one.
    const across = horizontal === (column === 0) ? 0.25 : 0.75
    const offset = pad + radius + row * (2 * radius + pad)
    const along = atFarEnd
      ? horizontal
        ? longEnd - offset
        : longStart + offset
      : horizontal
        ? longStart + offset
        : longEnd - offset
    const acrossPosition = shortStart + short * across
    const cx = horizontal ? along : acrossPosition
    const cy = horizontal ? acrossPosition : along

    const badge = document.createElementNS(svgNS, 'g')
    badge.setAttribute('data-marker-table', tableElement.id)
    badge.setAttribute('data-marker', marker.kind)
    badge.setAttribute('class', 'table-marker')
    badge.setAttribute('style', `--pulse-scale: ${pulseScale}`)

    const disc = document.createElementNS(svgNS, 'circle')
    disc.setAttribute('cx', String(cx))
    disc.setAttribute('cy', String(cy))
    disc.setAttribute('r', String(radius))
    disc.setAttribute('fill', marker.color)
    disc.setAttribute('stroke', '#ffffff')
    disc.setAttribute('stroke-width', String(radius * 0.14))

    const letter = document.createElementNS(svgNS, 'text')
    letter.setAttribute('x', String(cx))
    letter.setAttribute('y', String(cy + radius * 0.42))
    letter.setAttribute('text-anchor', 'middle')
    letter.setAttribute('font-size', String(radius * 1.25))
    letter.setAttribute('font-family', 'Liberation Sans, sans-serif')
    letter.setAttribute('font-weight', 'bold')
    letter.setAttribute('fill', '#ffffff')
    letter.textContent = marker.letter

    badge.appendChild(disc)
    badge.appendChild(letter)
    layer.appendChild(badge)
  })
}
