'use client'
import { useEffect, useRef, useState, type ImgHTMLAttributes } from 'react'

/** A photo that fades in over its placeholder once it has loaded. Photos already loaded when the page opens are left alone. */
export function FadeImg(props: ImgHTMLAttributes<HTMLImageElement>) {
  const ref = useRef<HTMLImageElement>(null)
  const [wait, setWait] = useState(false)
  useEffect(() => { if (ref.current && !ref.current.complete) setWait(true) }, [])
  return (
    // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
    <img {...props} ref={ref} className={`${props.className ?? ''} fade${wait ? ' wait' : ''}`} onLoad={() => setWait(false)} onError={() => setWait(false)} />
  )
}
