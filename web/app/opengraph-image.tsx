import { ImageResponse } from 'next/og'

export const alt = 'Raju Fishes: fresh off the boat'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function Og() {
  return new ImageResponse(
    <div style={{ width: '100%', height: '100%', background: '#0A5C8F', color: '#fff', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 80 }}>
      <div style={{ fontSize: 34, color: '#F4B400', fontWeight: 700 }}>RAJU FISHES · FAMILY FLEET</div>
      <div style={{ fontSize: 160, fontWeight: 900, lineHeight: 0.95, marginTop: 16 }}>Fresh off the boat.</div>
      <div style={{ display: 'flex', marginTop: 48, height: 24, width: 520 }}><div style={{ flex: 1, background: '#fff' }} /><div style={{ flex: 1, background: '#D7342A' }} /><div style={{ flex: 1, background: '#F4B400' }} /></div>
    </div>,
    size,
  )
}
