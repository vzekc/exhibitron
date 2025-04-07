import '@styles/fonts/press-start-2p.css'

const RetroHeader = () => {
  return (
    <header className="relative mb-10 overflow-hidden bg-[#F7C55F] py-6">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between gap-4">
          <h1
            className="min-w-0 flex-1 origin-left pl-4 pt-1 font-['Press_Start_2P'] text-xl leading-relaxed tracking-wide text-[#333333] sm:text-2xl md:text-3xl lg:text-4xl"
            style={{
              textShadow: '2px 2px 0px rgba(0,0,0,0.1)',
              letterSpacing: '0.1em',
              transform: 'scale(0.7, 3)',
              transformOrigin: 'left center',
              whiteSpace: 'nowrap',
            }}>
            Classic Computing 2025
          </h1>
          <img
            src="/vzekc-logo-transparent-border.png"
            alt="VzEkC Logo"
            className="hidden w-16 flex-shrink-0 sm:block sm:w-20 md:w-24 lg:w-28"
          />
        </div>
      </div>
    </header>
  )
}

export default RetroHeader
