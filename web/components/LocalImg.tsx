'use client'
import Image from 'next/image'
import { useEffect, useRef, useState } from 'react'

/** A shop photo from /public, sized by Next. The wrapper's tint shows until it has loaded, then the photo fades in. */
export function LocalImg({ src, alt, sizes, priority, className = '' }: { src: string; alt: string; sizes: string; priority?: boolean; className?: string }) {
  const ref = useRef<HTMLImageElement>(null)
  const [wait, setWait] = useState(false)
  useEffect(() => { if (ref.current && !ref.current.complete) setWait(true) }, [])
  return (
    <Image
      ref={ref}
      src={src}
      alt={alt}
      fill
      sizes={sizes}
      quality={85}
      priority={priority}
      className={`${className} fade${wait ? ' wait' : ''}`}
      style={{ objectFit: 'cover' }}
      onLoad={() => setWait(false)}
      onError={() => setWait(false)}
    />
  )
}
