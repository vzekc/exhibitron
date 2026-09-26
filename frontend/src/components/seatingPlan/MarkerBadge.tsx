/* A table marker as the legend and the question editor show it. */
const MarkerBadge = ({
  letter,
  color,
  size = 22,
}: {
  letter: string
  color: string
  size?: number
}) => (
  <svg width={size} height={size} viewBox="0 0 22 22" aria-hidden="true">
    <circle cx="11" cy="11" r="10" fill={color} stroke="#fff" strokeWidth="1.4" />
    <text
      x="11"
      y="15.2"
      textAnchor="middle"
      fontSize="12.5"
      fontWeight="bold"
      fontFamily="Liberation Sans, sans-serif"
      fill="#fff">
      {letter}
    </text>
  </svg>
)

export default MarkerBadge
