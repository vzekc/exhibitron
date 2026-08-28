import { useEffect, useState } from 'react'
import QRCode from 'qrcode'
import {
  NAME_BOX,
  NAME_TAG,
  NameTagExhibition,
  NameTagExhibitor,
  getNameFontSize,
  getNameTagName,
  getNameTagNickname,
  getNameTagUrl,
} from './nameTag.ts'

interface NameTagPreviewProps {
  exhibitor: NameTagExhibitor
  exhibition: NameTagExhibition
  className?: string
}

// True-to-size rendering of the printed name tag.  Sized in millimetres so that it
// matches NameTagPDF, and typeset in Lato for the same reason.  The logo and the title
// flow across the top; the name and the QR code are anchored to the bottom corners, so
// the tall logo and the QR code can share the same band of height without colliding.
const NameTagPreview = ({ exhibitor, exhibition, className = '' }: NameTagPreviewProps) => {
  const [qrCode, setQrCode] = useState('')
  const url = getNameTagUrl(exhibitor.id)

  useEffect(() => {
    QRCode.toDataURL(url, { margin: 0, width: 300 }).then(setQrCode, () => setQrCode(''))
  }, [url])

  const name = getNameTagName(exhibitor)
  const nickname = getNameTagNickname(exhibitor)

  return (
    <div
      className={`relative overflow-hidden rounded-sm border border-gray-300 bg-white dark:border-gray-600 ${className}`}
      style={{
        width: `${NAME_TAG.width}mm`,
        height: `${NAME_TAG.height}mm`,
        fontFamily: 'Lato, sans-serif',
        color: '#111827',
      }}>
      <div
        className="flex items-start justify-between"
        style={{ margin: `${NAME_TAG.padding}mm ${NAME_TAG.padding}mm 0` }}>
        <img src="/vzekc-logo.svg" alt="VzEkC" style={{ height: `${NAME_TAG.logoHeight}mm` }} />
        <div className="flex-1 text-right" style={{ color: '#4a4a4a' }}>
          <div className="font-bold" style={{ fontSize: `${NAME_TAG.titleFontSize}pt` }}>
            {exhibition.title}
          </div>
          {exhibition.venue && (
            <div style={{ fontSize: `${NAME_TAG.titleFontSize}pt` }}>{exhibition.venue}</div>
          )}
        </div>
      </div>
      <div
        className="absolute overflow-hidden"
        style={{
          left: `${NAME_TAG.padding}mm`,
          bottom: `${NAME_TAG.padding}mm`,
          width: `${NAME_BOX.width}mm`,
        }}>
        <div
          className="font-bold leading-tight"
          style={{ fontSize: `${getNameFontSize(name, !!nickname)}pt` }}>
          {name}
        </div>
        {nickname && (
          <div
            className="leading-tight"
            style={{ fontSize: `${NAME_TAG.nicknameFontSize}pt`, color: '#4a4a4a' }}>
            {nickname}
          </div>
        )}
      </div>
      <img
        src={qrCode}
        alt={url}
        className="absolute"
        style={{
          right: `${NAME_TAG.padding}mm`,
          bottom: `${NAME_TAG.padding}mm`,
          width: `${NAME_TAG.qrSize}mm`,
          height: `${NAME_TAG.qrSize}mm`,
        }}
      />
    </div>
  )
}

export default NameTagPreview
