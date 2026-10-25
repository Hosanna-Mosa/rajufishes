import { ImageResponse } from 'next/og'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 64, height: 64, background: '#0A5C8F', color: '#F4B400', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 900, border: '4px solid #10202B' }}>R</div>,
    size,
  )
}
