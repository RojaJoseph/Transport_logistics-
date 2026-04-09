/**
 * NMEA 0183 sentence parser
 * Supports: $GPRMC, $GPGGA, $GNRMC, $GNGGA
 */

export interface NmeaFix {
  deviceId: string;
  lat: number;
  lng: number;
  altitude: number;
  speed: number;
  heading: number;
  accuracy: number;
  satellites: number;
  timestamp: Date;
}

export function parseNMEA(sentence: string, deviceId = 'unknown'): Omit<NmeaFix, 'deviceId'> | null {
  sentence = sentence.trim();

  // Validate checksum
  const star = sentence.lastIndexOf('*');
  if (star > 0) {
    const body     = sentence.slice(1, star);
    const checksum = parseInt(sentence.slice(star + 1), 16);
    let calc = 0;
    for (let i = 0; i < body.length; i++) calc ^= body.charCodeAt(i);
    if (calc !== checksum) return null;
  }

  const parts = sentence.split(',');
  const type  = parts[0].replace('$', '');

  // ── $GPRMC / $GNRMC ─────────────────────────────────────────
  if (type === 'GPRMC' || type === 'GNRMC') {
    const status = parts[2];
    if (status !== 'A') return null;  // void fix

    const lat  = dmmToDecimal(parts[3], parts[4]);
    const lng  = dmmToDecimal(parts[5], parts[6]);
    const speed = parseFloat(parts[7] || '0') * 1.852;  // knots → km/h
    const heading = parseFloat(parts[8] || '0');
    const timeStr = parts[1];
    const dateStr = parts[9];

    if (!lat || !lng) return null;
    return {
      lat, lng,
      altitude:  0,
      speed:     Math.round(speed),
      heading:   Math.round(heading),
      accuracy:  5,
      satellites:0,
      timestamp: parseNMEADateTime(timeStr, dateStr),
    };
  }

  // ── $GPGGA / $GNGGA ─────────────────────────────────────────
  if (type === 'GPGGA' || type === 'GNGGA') {
    const fixQuality = parseInt(parts[6] || '0');
    if (fixQuality === 0) return null;  // no fix

    const lat      = dmmToDecimal(parts[2], parts[3]);
    const lng      = dmmToDecimal(parts[4], parts[5]);
    const satellites = parseInt(parts[7] || '0');
    const hdop     = parseFloat(parts[8] || '1');
    const altitude = parseFloat(parts[9] || '0');
    const timeStr  = parts[1];

    if (!lat || !lng) return null;
    return {
      lat, lng,
      altitude:  Math.round(altitude),
      speed:     0,
      heading:   0,
      accuracy:  Math.round(hdop * 3),  // rough approximation
      satellites,
      timestamp: parseNMEATime(timeStr),
    };
  }

  return null;
}

// Convert DDDMM.MMMMM + hemisphere to decimal degrees
function dmmToDecimal(dmmStr: string, hemi: string): number {
  if (!dmmStr || !hemi) return 0;
  const raw = parseFloat(dmmStr);
  const deg = Math.floor(raw / 100);
  const min = raw - deg * 100;
  const dec = deg + min / 60;
  return (hemi === 'S' || hemi === 'W') ? -dec : dec;
}

function parseNMEADateTime(timeStr: string, dateStr: string): Date {
  const hh = timeStr.slice(0, 2);
  const mm = timeStr.slice(2, 4);
  const ss = timeStr.slice(4, 6);
  const dd = dateStr.slice(0, 2);
  const mo = dateStr.slice(2, 4);
  const yy = dateStr.slice(4, 6);
  return new Date(`20${yy}-${mo}-${dd}T${hh}:${mm}:${ss}Z`);
}

function parseNMEATime(timeStr: string): Date {
  const now = new Date();
  const hh = timeStr.slice(0, 2);
  const mm = timeStr.slice(2, 4);
  const ss = timeStr.slice(4, 6);
  return new Date(`${now.toISOString().slice(0, 10)}T${hh}:${mm}:${ss}Z`);
}
