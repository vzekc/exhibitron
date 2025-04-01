import { useEffect, useState } from 'react'

const NUM_COMPUTERS = 13

const RandomComputer = ({ className = '' }: { className?: string }) => {
  const [computerNumber, setComputerNumber] = useState(1)

  useEffect(() => {
    setComputerNumber(Math.floor(Math.random() * NUM_COMPUTERS) + 1)
  }, [])

  return (
    <img
      src={`/computers/${computerNumber}.svg`}
      alt="Random computer illustration"
      className={`h-[60px] w-[60px] opacity-15 ${className}`}
    />
  )
}

export default RandomComputer
