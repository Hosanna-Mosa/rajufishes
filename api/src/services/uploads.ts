import crypto from 'node:crypto'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { env, isProd } from '../config/env.js'
import { HttpError } from '../lib/errors.js'

export const UPLOAD_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../uploads')
export const cloudinaryIsOn = () => Boolean(env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET)

/** Checks the file really is a jpeg, png or webp by its first bytes (the name and content type can lie). */
export function imageKind(b: Buffer): 'jpg' | 'png' | 'webp' | null {
  if (b.length > 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return 'jpg'
  if (b.length > 12 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return 'png'
  if (b.length > 12 && b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP') return 'webp'
  return null
}

export interface Stored { url: string; publicId: string; local: boolean }

/**
 * Cloudinary when its three keys are set. Otherwise (development only) the file goes to api/uploads
 * and is served from /uploads, which is clearly not for production use.
 */
export async function storeImage(data: Buffer, origin: string): Promise<Stored> {
  const kind = imageKind(data)
  if (!kind) throw new HttpError(400, 'Please upload a JPG, PNG or WebP photo.')
  if (cloudinaryIsOn()) {
    const timestamp = String(Math.floor(Date.now() / 1000))
    const folder = 'rajufishes'
    const signature = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${timestamp}${env.CLOUDINARY_API_SECRET}`).digest('hex')
    const form = new FormData()
    form.set('file', new Blob([new Uint8Array(data)]), `photo.${kind}`)
    form.set('api_key', env.CLOUDINARY_API_KEY); form.set('timestamp', timestamp); form.set('folder', folder); form.set('signature', signature)
    const res = await fetch(`https://api.cloudinary.com/v1_1/${env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: form })
    if (!res.ok) throw new HttpError(502, 'The photo could not be uploaded. Please try again.')
    const j = (await res.json()) as { secure_url: string; public_id: string }
    return { url: j.secure_url, publicId: j.public_id, local: false }
  }
  if (isProd) throw new HttpError(503, 'Photo upload is not set up.')
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  const name = `${crypto.randomBytes(10).toString('hex')}.${kind}`
  await fs.writeFile(path.join(UPLOAD_DIR, name), data)
  return { url: `${origin}/uploads/${name}`, publicId: `local:${name}`, local: true }
}
