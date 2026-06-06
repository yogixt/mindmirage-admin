/* Lightweight panchanga — tithi from low-precision solar/lunar longitudes
   (Meeus). Evaluated at 06:00 IST, the traditional sunrise reference.
   Accurate to within a few hours — right for marking days, not muhurta. */

const RAD = Math.PI / 180;

function julianDay(utcMillis: number): number {
  return utcMillis / 86400000 + 2440587.5;
}

function norm360(x: number): number {
  return ((x % 360) + 360) % 360;
}

function sunLongitude(T: number): number {
  const L0 = 280.46646 + 36000.76983 * T;
  const M = (357.52911 + 35999.05029 * T) * RAD;
  const C =
    (1.914602 - 0.004817 * T) * Math.sin(M) +
    0.019993 * Math.sin(2 * M) +
    0.000289 * Math.sin(3 * M);
  return norm360(L0 + C);
}

function moonLongitude(T: number): number {
  const Lp = 218.3164477 + 481267.88123421 * T;
  const D = (297.8501921 + 445267.1114034 * T) * RAD;
  const Mp = (134.9633964 + 477198.8675055 * T) * RAD;
  const M = (357.5291092 + 35999.0502909 * T) * RAD;
  const F = (93.272095 + 483202.0175233 * T) * RAD;
  const corr =
    6.288774 * Math.sin(Mp) +
    1.274027 * Math.sin(2 * D - Mp) +
    0.658314 * Math.sin(2 * D) +
    0.213618 * Math.sin(2 * Mp) -
    0.185116 * Math.sin(M) -
    0.114332 * Math.sin(2 * F);
  return norm360(Lp + corr);
}

const NAMES = [
  "Pratipadā", "Dvitīyā", "Tṛtīyā", "Caturthī", "Pañcamī",
  "Ṣaṣṭhī", "Saptamī", "Aṣṭamī", "Navamī", "Daśamī",
  "Ekādaśī", "Dvādaśī", "Trayodaśī", "Caturdaśī",
];

export type Tithi = {
  index: number; // 1..30
  name: string; // e.g. "Śukla Ekādaśī"
  isPurnima: boolean;
  isAmavasya: boolean;
  isEkadashi: boolean;
};

/* Tithi on a calendar date (YYYY-MM-DD), reckoned at 06:00 IST. */
export function tithiForDate(ymd: string): Tithi {
  const [y, m, d] = ymd.split("-").map(Number);
  // 06:00 IST = 00:30 UTC
  const utc = Date.UTC(y, m - 1, d, 0, 30, 0);
  const T = (julianDay(utc) - 2451545.0) / 36525;
  const diff = norm360(moonLongitude(T) - sunLongitude(T));
  const index = Math.floor(diff / 12) + 1; // 1..30

  const isPurnima = index === 15;
  const isAmavasya = index === 30;
  const isEkadashi = index === 11 || index === 26;
  const paksha = index <= 15 ? "Śukla" : "Kṛṣṇa";
  const name = isPurnima
    ? "Pūrṇimā"
    : isAmavasya
      ? "Amāvasyā"
      : `${paksha} ${NAMES[(index - 1) % 15]}`;

  return { index, name, isPurnima, isAmavasya, isEkadashi };
}
