import * as React from 'react'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import QrReader from 'react-qr-reader-es6'

const QrTableScanner: React.FC = () => {
  const navigate = useNavigate()
  const [isActive, setIsActive] = useState(true)

  const handleScan = (data: string | null) => {
    if (!data) return

    const url = URL.parse(data)
    const page = url?.pathname.match(/^\/table\/\d+$/)?.[0]
    if (page) {
      setIsActive(false)
      navigate(page)
    }
  }

  const handleError = (error: unknown) => {
    console.log(error)
  }

  //useEffect(() => () => setIsActive(false), [])
  useEffect(() => {
    return () => {
      console.log('useEffect callback called, isActive:', isActive)
    }
  }, [isActive])

  return (
    <div className="card">
      {isActive
        ? (<QrReader delay={300}
                     onError={handleError}
                     onScan={handleScan}
                     style={{ width: '100%' }} />)
        : (<p>Scanner inactive</p>)}
    </div>
  )
}

export default QrTableScanner
