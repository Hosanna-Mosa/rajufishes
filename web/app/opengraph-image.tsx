import { ImageResponse } from 'next/og'

export const alt = 'Raju Fishes: fresh fish, delivered cold'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Og() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', background: '#FFFFFF', color: '#111418', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80 }}>
      <div style={{ fontSize: 30, color: '#0A5C8F', letterSpacing: 6 }}>RAJU FISHES</div>
      <div style={{ fontSize: 150, fontWeight: 300, lineHeight: 0.98, marginTop: 24, letterSpacing: -4 }}>Fresh fish, delivered cold.</div>
      <div style={{ display: 'flex', marginTop: 48, height: 2, width: 520, background: '#D9DEE3' }} />
    </div>,
    size,
  )
}
