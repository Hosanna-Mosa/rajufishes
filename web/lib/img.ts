/**
 * Cloudinary can resize and compress on the fly. For its URLs we ask for the width we need (f_auto picks WebP or AVIF,
 * q_auto picks the quality). Other URLs (the local dev uploads) are used as they are.
 */
const isCloudinary = (u: string) => /^https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(u)

export function sized(url: string, width: number) {
  return isCloudinary(url) ? url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`) : url
}

/** A tiny (24 px wide, blurred) copy used as the background while the real photo loads. */
export function blurUrl(url: string) {
  return isCloudinary(url) ? url.replace('/image/upload/', '/image/upload/f_auto,q_30,c_limit,w_24,e_blur:200/') : null
}

export function srcSet(url: string, widths: number[]) {
  return isCloudinary(url) ? widths.map((w) => `${sized(url, w)} ${w}w`).join(', ') : undefined
}
