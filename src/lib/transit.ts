import type { components } from './transit-api'

type Schemas = components['schemas']
export type SubwayArrivals = Schemas['ArrivalsResponse']
export type PathArrivals = Schemas['PathArrivalsResponse']
export type BusArrivals = Schemas['BusArrivalsResponse']
export type AlertsResponse = Schemas['AlertsResponse']
export type SubwayAlertsResponse = Schemas['SubwayAlertsResponse']
export type NearbyStations = Schemas['CitibikeNearbyResponse']
export type StationResponse = Schemas['CitibikeStationResponse']

export type Fetcher = (path: string, params?: Record<string, string | number>) => Promise<unknown>

/** A failed call to transit. Carries the status and the API's error code, never the URL or the token. */
export class TransitError extends Error {
  constructor(
    readonly status: number,
    readonly code: string
  ) {
    super(`transit ${status} ${code}`)
  }
}

const TIMEOUT_MS = 8000

/** The server-side client. The token stays here: it must never reach the browser. */
export function transitFetcher(baseUrl: string, token: string, fetchImpl: typeof fetch = fetch): Fetcher {
  const base = baseUrl.replace(/\/+$/, '')
  return async (path, params = {}) => {
    const url = new URL(base + path)
    for (const [k, v] of Object.entries(params)) url.searchParams.set(k, String(v))
    let res: Response
    try {
      res = await fetchImpl(url, {
        headers: { 'X-Transit-Token': token },
        cache: 'no-store',
        signal: AbortSignal.timeout(TIMEOUT_MS),
      })
    } catch {
      throw new TransitError(0, 'unreachable')
    }
    if (!res.ok) {
      const body = (await res.json().catch(() => null)) as { code?: string } | null
      throw new TransitError(res.status, body?.code ?? 'unknown')
    }
    return res.json()
  }
}
