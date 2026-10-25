/** Six line-art fish for "Browse by kind". Brand blue, 1.5px stroke. */
const BODY = 'M8 22 C22 6 52 4 72 22 C52 40 22 38 8 22 Z'
const TAIL = 'M72 22 L90 8 L90 36 Z'

export function FishIcon({ extra }: { extra?: 'whiskers' | 'claws' | 'tentacles' | 'slim' }) {
  return (
    <svg width="96" height="44" viewBox="0 0 96 44" fill="none" stroke="var(--brand)" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" aria-hidden="true">
      <path d={BODY} />
      <path d={TAIL} />
      <circle cx="24" cy="20" r="1.6" fill="var(--brand)" />
      <path d="M40 14 C44 20 44 24 40 30" />
      {extra === 'whiskers' && <path d="M8 22 L1 18 M8 22 L1 26" />}
      {extra === 'claws' && <path d="M30 10 L26 2 M46 8 L48 1" />}
      {extra === 'tentacles' && <path d="M14 30 L10 40 M24 33 L22 42 M34 33 L34 42" />}
    </svg>
  )
}
