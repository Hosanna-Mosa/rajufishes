export class HttpError extends Error {
  constructor(public status: number, message: string, public details?: unknown) {
    super(message)
  }
}
export const bad = (m: string, d?: unknown) => new HttpError(400, m, d)
export const notFound = (m = 'Not found') => new HttpError(404, m)
