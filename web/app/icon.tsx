import { ImageResponse } from 'next/og'

export const size = { width: 64, height: 64 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    <div style={{ width: 64, height: 64, background: '#FFFFFF', color: '#0A5C8F', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 44, fontWeight: 500, border: '2px solid #D9DEE3' }}>R</div>,
    size,
  )
}
