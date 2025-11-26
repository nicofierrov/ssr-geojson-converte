export interface UTMCoordinate {
  easting: number
  northing: number
  zone: number
  hemisphere: 'N' | 'S'
}

export interface WGS84Coordinate {
  latitude: number
  longitude: number
}

const K0 = 0.9996
const E = 0.00669438
const E_P2 = E / (1 - E)
const R = 6378137

const E2 = E * E
const E3 = E2 * E
const E_P2_2 = E_P2 * E_P2
const E_P2_3 = E_P2_2 * E_P2

const SQRT_E = Math.sqrt(1 - E)
const _E = (1 - SQRT_E) / (1 + SQRT_E)
const _E2 = _E * _E
const _E3 = _E2 * _E
const _E4 = _E3 * _E
const _E5 = _E4 * _E

const M1 = 1 - E / 4 - 3 * E2 / 64 - 5 * E3 / 256
const M2 = 3 * E / 8 + 3 * E2 / 32 + 45 * E3 / 1024
const M3 = 15 * E2 / 256 + 45 * E3 / 1024
const M4 = 35 * E3 / 3072

const P2 = 3 / 2 * _E - 27 / 32 * _E3 + 269 / 512 * _E5
const P3 = 21 / 16 * _E2 - 55 / 32 * _E4
const P4 = 151 / 96 * _E3 - 417 / 128 * _E5
const P5 = 1097 / 512 * _E4

export function utmToWgs84(utm: UTMCoordinate): WGS84Coordinate {
  const { easting, northing, zone, hemisphere } = utm
  
  const x = easting - 500000
  const y = hemisphere === 'N' ? northing : northing - 10000000
  
  const m = y / K0
  const mu = m / (R * M1)
  
  const pRad = mu + P2 * Math.sin(2 * mu) + P3 * Math.sin(4 * mu) + P4 * Math.sin(6 * mu) + P5 * Math.sin(8 * mu)
  
  const pSin = Math.sin(pRad)
  const pCos = Math.cos(pRad)
  const pTan = pSin / pCos
  const pTan2 = pTan * pTan
  const pTan4 = pTan2 * pTan2
  
  const epSin = 1 - E * pSin * pSin
  const epSinSqrt = Math.sqrt(epSin)
  
  const n = R / epSinSqrt
  const r = (1 - E) / epSin
  
  const c = E_P2 * pCos * pCos
  const c2 = c * c
  
  const d = x / (n * K0)
  const d2 = d * d
  const d3 = d2 * d
  const d4 = d3 * d
  const d5 = d4 * d
  const d6 = d5 * d
  
  const latitude = pRad - (pTan / r) * (d2 / 2 - d4 / 24 * (5 + 3 * pTan2 + 10 * c - 4 * c2 - 9 * E_P2)) +
    d6 / 720 * (61 + 90 * pTan2 + 298 * c + 45 * pTan4 - 252 * E_P2 - 3 * c2)
  
  const longitude = (d - d3 / 6 * (1 + 2 * pTan2 + c) +
    d5 / 120 * (5 - 2 * c + 28 * pTan2 - 3 * c2 + 8 * E_P2 + 24 * pTan4)) / pCos
  
  const centralMeridian = (zone - 1) * 6 - 180 + 3
  
  return {
    latitude: latitude * (180 / Math.PI),
    longitude: centralMeridian + longitude * (180 / Math.PI)
  }
}

export function parseUTMCoordinate(easting: string | number, northing: string | number, zone: number = 18, hemisphere: 'N' | 'S' = 'S'): WGS84Coordinate {
  const eastingNum = typeof easting === 'string' ? parseFloat(easting.replace(/[^\d.-]/g, '')) : easting
  const northingNum = typeof northing === 'string' ? parseFloat(northing.replace(/[^\d.-]/g, '')) : northing
  
  return utmToWgs84({
    easting: eastingNum,
    northing: northingNum,
    zone,
    hemisphere
  })
}

export function isValidUTM18S(easting: number, northing: number): boolean {
  return easting >= 160000 && easting <= 850000 && northing >= 5400000 && northing <= 8200000
}

export function isValidChileanBounds(lat: number, lon: number): boolean {
  return lat >= -56 && lat <= -17 && lon >= -76 && lon <= -66
}
