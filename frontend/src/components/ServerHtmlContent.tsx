import React from 'react'
import styles from './ServerHtmlContent.module.css'

interface ServerHtmlContentProps {
  html: string
  className?: string
}

const ServerHtmlContent: React.FC<ServerHtmlContentProps> = ({ html, className }) => {
  return (
    <div
      className={`${styles.serverHtmlContent} ${className || ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

export default ServerHtmlContent
