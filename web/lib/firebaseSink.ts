import { setSink } from './analytics'

const cfg = () => ({
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID,
})

/** True only when every Firebase value is filled in, and we are in production (or testing on purpose). */
export function analyticsEnabled(): boolean {
  const c = cfg()
  if (!Object.values(c).every(Boolean)) return false
  return process.env.NODE_ENV === 'production' || process.env.NEXT_PUBLIC_ANALYTICS_DEV === '1'
}

/** Loads Firebase only when asked (after the visitor said OK, and after the page is idle). */
export async function startFirebase(): Promise<boolean> {
  try {
    const [{ initializeApp, getApps }, { initializeAnalytics, isSupported, logEvent }] = await Promise.all([import('firebase/app'), import('firebase/analytics')])
    if (!(await isSupported())) return false
    const app = getApps()[0] ?? initializeApp(cfg())
    // page views are sent by hand on every route change; IP anonymising stays at Google's default
    const analytics = initializeAnalytics(app, { config: { send_page_view: false } })
    setSink((name, params) => logEvent(analytics, name as never, params as never))
    return true
  } catch {
    return false
  }
}
