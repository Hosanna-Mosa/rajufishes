import { BetaAnalyticsDataClient } from '@google-analytics/data'
import { env } from '../config/env.js'

export type Range = 'today' | '7d' | '30d'
export const RANGES: Range[] = ['today', '7d', '30d']
const START: Record<Range, string> = { today: 'today', '7d': '6daysAgo', '30d': '29daysAgo' }

export type Row = { label: string; value: number }
export type GaData = {
  connected: true
  totalUsers: number
  newUsers: number
  returningUsers: number
  sessions: number
  avgEngagementSec: number
  topPages: { path: string; views: number }[]
  sources: Row[]
  devices: { mobile: number; desktop: number; tablet: number }
  cities: Row[]
  funnel: { view_item: number; add_to_cart: number; begin_checkout: number; purchase: number }
}
export type NotConnected = { connected: false; reason: 'missing_credentials' | 'google_error'; message: string }

/** The two calls we use, so tests can stand in for Google. */
export type GaClient = {
  runReport(req: Record<string, unknown>): Promise<[{ rows?: { dimensionValues?: { value?: string | null }[] | null; metricValues?: { value?: string | null }[] | null }[] | null }, ...unknown[]]>
  runRealtimeReport(req: Record<string, unknown>): Promise<[{ rows?: { metricValues?: { value?: string | null }[] | null }[] | null }, ...unknown[]]>
}

let override: GaClient | null = null
let real: GaClient | null = null
export const setGaClientForTests = (c: GaClient | null) => { override = c; real = null; cache.clear() }

export function gaConfigured(): boolean {
  return !!override || (!!env.GA4_PROPERTY_ID && !!env.GA_SERVICE_ACCOUNT_JSON_BASE64)
}

function client(): GaClient {
  if (override) return override
  if (!real) {
    const creds = JSON.parse(Buffer.from(env.GA_SERVICE_ACCOUNT_JSON_BASE64, 'base64').toString('utf8'))
    real = new BetaAnalyticsDataClient({ credentials: { client_email: creds.client_email, private_key: creds.private_key }, projectId: creds.project_id }) as unknown as GaClient
  }
  return real
}
const property = () => `properties/${env.GA4_PROPERTY_ID || 'test'}`

// ---- a small in-memory cache, so a busy admin page never gets near Google's limits ----
let clock = () => Date.now()
export const setClockForTests = (f: (() => number) | null) => { clock = f ?? (() => Date.now()) }
const cache = new Map<string, { at: number; value: unknown }>()
async function cached<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const hit = cache.get(key)
  if (hit && clock() - hit.at < ttlMs) return hit.value as T
  const value = await load()
  cache.set(key, { at: clock(), value })
  return value
}

const num = (v?: string | null) => Number(v ?? 0) || 0
type Rep = Awaited<ReturnType<GaClient['runReport']>>[0]
const rowsOf = (r: Rep) => (r.rows ?? []).map((x) => ({ d: (x.dimensionValues ?? []).map((v) => v.value ?? ''), m: (x.metricValues ?? []).map((v) => num(v.value)) }))

const notConnected = (reason: NotConnected['reason'], message: string): NotConnected => ({ connected: false, reason, message })

export async function gaReport(range: Range): Promise<GaData | NotConnected> {
  if (!gaConfigured()) return notConnected('missing_credentials', 'Google Analytics is not connected yet.')
  try {
    return await cached(`report:${range}`, 60_000, async () => {
      const c = client()
      const dateRanges = [{ startDate: START[range], endDate: 'today' }]
      const run = async (dimension: string | null, metrics: string[], extra: Record<string, unknown> = {}) =>
        rowsOf((await c.runReport({ property: property(), dateRanges, metrics: metrics.map((name) => ({ name })), ...(dimension ? { dimensions: [{ name: dimension }] } : {}), ...extra }))[0])
      const [tot, pages, src, dev, cit, evs] = await Promise.all([
        run(null, ['totalUsers', 'newUsers', 'sessions', 'userEngagementDuration', 'activeUsers']),
        run('pagePath', ['screenPageViews'], { limit: 10, orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }] }),
        run('sessionDefaultChannelGroup', ['sessions'], { limit: 10, orderBys: [{ metric: { metricName: 'sessions' }, desc: true }] }),
        run('deviceCategory', ['sessions']),
        run('city', ['activeUsers'], { limit: 10, orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }] }),
        run('eventName', ['eventCount'], { dimensionFilter: { filter: { fieldName: 'eventName', inListFilter: { values: ['view_item', 'add_to_cart', 'begin_checkout', 'purchase'] } } } }),
      ])
      const t = tot[0]?.m ?? []
      const [totalUsers = 0, newUsers = 0, sessions = 0, engagement = 0, active = 0] = t
      const dev3 = { mobile: 0, desktop: 0, tablet: 0 }
      for (const r of dev) { const k = r.d[0]?.toLowerCase(); if (k === 'mobile' || k === 'desktop' || k === 'tablet') dev3[k] += r.m[0] ?? 0 }
      const ev = (n: string) => evs.find((r) => r.d[0] === n)?.m[0] ?? 0
      const data: GaData = {
        connected: true,
        totalUsers, newUsers, returningUsers: Math.max(0, totalUsers - newUsers), sessions,
        avgEngagementSec: active ? Math.round(engagement / active) : 0,
        topPages: pages.map((r) => ({ path: r.d[0] || '/', views: r.m[0] ?? 0 })),
        sources: src.map((r) => ({ label: r.d[0] || '(other)', value: r.m[0] ?? 0 })),
        devices: dev3,
        cities: cit.filter((r) => r.d[0] && r.d[0] !== '(not set)').map((r) => ({ label: r.d[0], value: r.m[0] ?? 0 })),
        funnel: { view_item: ev('view_item'), add_to_cart: ev('add_to_cart'), begin_checkout: ev('begin_checkout'), purchase: ev('purchase') },
      }
      return data
    })
  } catch (e) {
    console.error('Google Analytics request failed:', e instanceof Error ? e.message : e)
    return notConnected('google_error', 'Google Analytics did not answer. Check the setup in docs/ANALYTICS.md.')
  }
}

export async function gaRealtime(): Promise<{ connected: true; activeNow: number } | NotConnected> {
  if (!gaConfigured()) return notConnected('missing_credentials', 'Google Analytics is not connected yet.')
  try {
    return await cached('realtime', 30_000, async () => {
      const [r] = await client().runRealtimeReport({ property: property(), metrics: [{ name: 'activeUsers' }] })
      return { connected: true as const, activeNow: num(r.rows?.[0]?.metricValues?.[0]?.value) }
    })
  } catch (e) {
    console.error('Google Analytics realtime request failed:', e instanceof Error ? e.message : e)
    return notConnected('google_error', 'Google Analytics did not answer. Check the setup in docs/ANALYTICS.md.')
  }
}
