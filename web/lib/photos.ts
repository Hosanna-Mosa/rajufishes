/**
 * Launch placeholder photos (see docs/PHOTOS.md). Used only when a product has no uploaded photo.
 * Matched by product name; a product with no match keeps the tinted placeholder.
 */
export type Photo = { src: string; alt: string }

const P = (file: string, alt: string): Photo => ({ src: `/images/products/${file}.webp`, alt })

const BY_NAME: Record<string, Photo> = {
  'seer fish steaks': P('seer-steaks', 'Fresh seer fish steaks on ice'),
  'black pomfret': P('black-pomfret', 'Two black pomfret on ice in a tray'),
  'tiger prawns': P('tiger-prawns', 'Fresh tiger prawns on ice'),
  'mud crab': P('mud-crab', 'A mud crab on ice with lemon'),
  'rohu': P('rohu', 'A whole rohu on ice in a tray'),
  'mackerel': P('mackerel', 'Three fresh mackerel on ice'),
  'white prawns': P('white-prawns', 'Peeled white prawns on ice'),
  'dry mackerel': P('dry-mackerel', 'Two dry salted mackerel on linen'),
  'dry shrimp': P('dry-shrimp', 'A pile of dry shrimp on linen'),
  'oil sardine': P('sardines', 'Fresh sardines on ice'),
  'sardines': P('sardines', 'Fresh sardines on ice'),
  'dry anchovies': P('dry-anchovies', 'Dry anchovies on linen'),
  'dry bombay duck': P('dry-bombay-duck', 'Dry bombay duck laid out in rows'),
  'fish fillet pack': P('frozen-basa', 'Frozen basa fillets in vacuum packs'),
  'frozen basa fillet': P('frozen-basa', 'Frozen basa fillets in vacuum packs'),
  'squid rings': P('frozen-squid', 'Frozen squid rings in a pack'),
  'frozen squid rings': P('frozen-squid', 'Frozen squid rings in a pack'),
}

export const photoFor = (name: string): Photo | null => BY_NAME[name.trim().toLowerCase()] ?? null

export const CATEGORY_PHOTO = {
  fresh: { src: '/images/categories/fresh.webp', alt: 'Fresh fish and shellfish on ice', label: 'Fresh fish', href: '/products?group=Fresh+fish' },
  'prawns-crab': { src: '/images/categories/prawns-crab.webp', alt: 'Cooked crab and prawns on ice', label: 'Prawns and crab', href: '/products?group=Prawns+and+crab' },
  dry: { src: '/images/categories/dry.webp', alt: 'Dry fish laid out on linen', label: 'Dry fish', href: '/products?group=Dry+fish' },
  frozen: { src: '/images/categories/frozen.webp', alt: 'Stacks of frozen fish packs in a cold store', label: 'Frozen packs', href: '/products?group=Frozen+packs' },
} as const
export type CategoryKey = keyof typeof CATEGORY_PHOTO

export const STORY = {
  boat: { src: '/images/story/boat-dawn.webp', alt: 'Our fishing boats at dawn' },
  box: { src: '/images/story/packed-box.webp', alt: 'An order packed in an insulated box with ice' },
} as const
