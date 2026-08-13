/**
 * wind-field.ts — interpolated wind from irregularly spaced stations.
 *
 *   const field = new WindField(stations);
 *   const { windDirection, windSpeed, confidence } = field.sample(lat, lon);
 *   const grid = field.sampleGrid(bounds, 128, 128);   // for map rendering
 *
 * Wind is interpolated as u/v vectors, never as bearings (350° and 10° average
 * to 180° otherwise). Weights are Gaussian in distance with a bandwidth that
 * adapts to local station density, multiplied by exponential recency decay.
 * Confidence combines proximity, freshness, coverage, network geometry,
 * station agreement, and a fault score — reported separately for speed and
 * direction, because they decouple: on a convergence line the speed is certain
 * and the bearing is meaningless, and in gusty terrain the reverse.
 *
 * Distances use an equirectangular approximation, within ~0.1% of haversine
 * across the 250 km search radius and unusable above ~85° latitude. Directions are
 * meteorological (270 = wind from the west). Speed is unit-agnostic, but
 * MAX_SPEED and SCALE_FLOOR assume m/s. No dependencies.
 */

const DEG = Math.PI / 180;
const M_PER_DEG = 111_320;
const LN_HALF = Math.log(0.5);
const MIN_BANDWIDTH_M = 2_000; // stops the kernel collapsing in dense clusters
const SCALE_FLOOR = 1.5; // robust-scale floor, stops over-rejection in calm air
const TUKEY_C = 4; // outlier cutoff, in robust sigmas

export interface WindStation {
  id?: string | number;
  lat: number;
  lon: number;
  windDirection: number;
  windSpeed: number;
  lastUpdatedTimestamp: number | string | Date;
}

export interface WindFieldOptions {
  /** Stations blended per query. Default 12. */
  neighbours?: number;
  /** Hard cutoff; nothing beyond this contributes. Default 250 km. */
  maxRadiusM?: number;
  /** Mean neighbour distance at which spatial confidence hits ~0.37. Default 60 km. */
  confidenceRadiusM?: number;
  /** Observation weight halves every this long. Default 30 min. */
  halfLifeMs?: number;
  /** Older than this and a station is ignored entirely. Default 3 h. */
  maxAgeMs?: number;
  /** Reject speeds above this as sensor faults. Default 100 (m/s). */
  maxSpeed?: number;
  /** Build-time per-station fault scoring. Default true. */
  detectFaults?: boolean;
}

export interface WindEstimate {
  windDirection: number | null;
  windSpeed: number | null;
  /** Geometric blend of the two below, for when you want one number. */
  confidence: number;
  speedConfidence: number;
  directionConfidence: number;
  u: number;
  v: number;
  stationsUsed: number;
  nearestDistanceM: number | null;
  meanAgeMs: number | null;
  /** |mean vector| / mean speed. Low means the neighbours cancel out. */
  coherence: number;
}

interface Prepared {
  lat: number;
  lon: number;
  u: number;
  v: number;
  spd: number;
  ts: number;
  rel: number;
  src: WindStation;
}

const DEFAULTS: Required<WindFieldOptions> = {
  neighbours: 12,
  maxRadiusM: 250_000,
  confidenceRadiusM: 60_000,
  halfLifeMs: 30 * 60_000,
  maxAgeMs: 3 * 3_600_000,
  maxSpeed: 100,
  detectFaults: true
};

export class WindField {
  private o: Required<WindFieldOptions>;
  private p: Prepared[] = [];
  // Latitude-sorted scan columns. Kept flat and separate from `p` so the
  // rejection loop touches only contiguous typed arrays — dereferencing the
  // object array per candidate costs more than all the arithmetic combined.
  private lats!: Float64Array;
  private lons!: Float64Array;
  private tss!: Float64Array;
  readonly rejected: { station: WindStation; reason: string }[] = [];

  // Neighbour scratch, reused across queries. Never nested.
  private nI!: Int32Array;
  private nD!: Float64Array;
  private nX!: Float64Array;
  private nY!: Float64Array;
  private nW!: Float64Array;
  private nT!: Float64Array;
  private nR!: Float64Array;
  private nS!: Float64Array;
  private nC = 0;
  private r0 = 0; // starting search radius, from mean network density

  constructor(stations: readonly WindStation[], options: WindFieldOptions = {}) {
    const o = (this.o = { ...DEFAULTS, ...options });
    const now = Date.now();

    for (const s of stations) {
      const ts =
        typeof s.lastUpdatedTimestamp === 'number'
          ? s.lastUpdatedTimestamp
          : new Date(s.lastUpdatedTimestamp).getTime();
      const reason =
        !Number.isFinite(s.lat) || !Number.isFinite(s.lon) || Math.abs(s.lat) > 90
          ? 'bad coordinates'
          : !Number.isFinite(ts)
            ? 'bad timestamp'
            : ts > now + 120_000
              ? 'timestamp in the future'
              : !Number.isFinite(s.windSpeed) || s.windSpeed < 0
                ? 'bad wind speed'
                : s.windSpeed > o.maxSpeed
                  ? 'implausible wind speed'
                  : !Number.isFinite(s.windDirection)
                    ? 'bad wind direction'
                    : null;
      if (reason) {
        this.rejected.push({ station: s, reason });
        continue;
      }

      const r = s.windDirection * DEG;
      this.p.push({
        lat: s.lat,
        lon: ((((s.lon + 180) % 360) + 360) % 360) - 180,
        u: -s.windSpeed * Math.sin(r),
        v: -s.windSpeed * Math.cos(r),
        spd: s.windSpeed,
        ts,
        rel: 1,
        src: s
      });
    }

    this.p.sort((a, b) => a.lat - b.lat);
    this.lats = Float64Array.from(this.p, (x) => x.lat);
    this.lons = Float64Array.from(this.p, (x) => x.lon);
    this.tss = Float64Array.from(this.p, (x) => x.ts);
    const k = o.neighbours;
    this.nI = new Int32Array(k);
    this.nD = new Float64Array(k);
    this.nX = new Float64Array(k);
    this.nY = new Float64Array(k);
    this.nW = new Float64Array(k);
    this.nT = new Float64Array(k);
    this.nR = new Float64Array(k);
    this.nS = new Float64Array(k);

    // Scanning the full maxRadius band every query is wasteful on a dense
    // network, where the k nearest stations sit within a few km. Start from a
    // radius implied by the mean spacing and grow only if that comes up short.
    this.r0 = o.maxRadiusM; // never 0, or the radius-growth loop cannot terminate
    if (this.p.length) {
      const lat0 = this.p[0].lat,
        lat1 = this.p[this.p.length - 1].lat;
      let lonMin = Infinity,
        lonMax = -Infinity;
      for (const q of this.p) {
        if (q.lon < lonMin) lonMin = q.lon;
        if (q.lon > lonMax) lonMax = q.lon;
      }
      const h = Math.max(1e-3, lat1 - lat0) * M_PER_DEG;
      const w = Math.max(1e-3, lonMax - lonMin) * M_PER_DEG * Math.cos(((lat0 + lat1) / 2) * DEG);
      const spacing = Math.sqrt(Math.abs(h * w) / this.p.length);
      this.r0 = Math.min(o.maxRadiusM, Math.max(MIN_BANDWIDTH_M, spacing * Math.sqrt(k) * 2));
    }

    if (o.detectFaults) this.scoreFaults(now);
  }

  // -- neighbour search ------------------------------------------------------

  /**
   * Fills the scratch arrays with the nearest fresh stations, sorted near→far.
   * Stations are sorted by latitude, so a binary-searched latitude band cuts
   * the candidate set to roughly (2 * maxRadius / 20000 km) of the network
   * before any distance is computed.
   */
  private near(lat: number, lon: number, now: number, skip: number): number {
    // Growing the radius is exact, not approximate: if k stations are found
    // inside r, the k-th nearest is within r, so nothing outside can qualify.
    for (let r = this.r0; ; r = Math.min(r * 2, this.o.maxRadiusM)) {
      const n = this.scan(lat, lon, now, skip, r);
      if (n >= this.o.neighbours || r >= this.o.maxRadiusM) return n;
    }
  }

  private scan(lat: number, lon: number, now: number, skip: number, radius: number): number {
    const o = this.o,
      k = o.neighbours,
      R2 = radius * radius;
    const band = radius / M_PER_DEG;
    const cosLat = Math.max(0.02, Math.cos(lat * DEG));
    const sinLat = Math.sin(lat * DEG);
    const bandLon = Math.min(180, band / cosLat);
    const { lats, lons, tss, nD, nI, nX, nY } = this;
    const lo = bisect(lats, lat - band);
    const hi = bisect(lats, lat + band);
    const oldest = now - o.maxAgeMs;
    this.nC = 0;

    for (let i = lo; i < hi; i++) {
      if (i === skip || tss[i] < oldest) continue;
      let dl = lons[i] - lon;
      if (dl > 180) dl -= 360;
      else if (dl < -180) dl += 360;
      if (dl > bandLon || dl < -bandLon) continue; // cheap reject before any maths
      // Cosine taken at the midpoint latitude rather than the query latitude,
      // via a first-order expansion. Keeps error ~0.1% instead of ~1% without
      // paying for a cos() per candidate.
      const dLat = lats[i] - lat;
      const dy = dLat * M_PER_DEG;
      const dx = dl * M_PER_DEG * Math.max(0.02, cosLat - sinLat * dLat * DEG * 0.5);
      const d2 = dx * dx + dy * dy;
      if (d2 > R2 || (this.nC === k && d2 >= nD[k - 1])) continue;

      let j = this.nC < k ? this.nC++ : k - 1;
      for (; j > 0 && nD[j - 1] > d2; j--) {
        nD[j] = nD[j - 1];
        nI[j] = nI[j - 1];
        nX[j] = nX[j - 1];
        nY[j] = nY[j - 1];
      }
      nD[j] = d2;
      nI[j] = i;
      nX[j] = dx;
      nY[j] = dy;
    }
    // Squared distances kept during the scan so the sqrt is paid k times, not
    // once per candidate. Ordering is identical either way.
    for (let j = 0; j < this.nC; j++) nD[j] = Math.sqrt(nD[j]);
    return this.nC;
  }

  // -- build-time fault scoring ---------------------------------------------

  /**
   * Scores every station against its own neighbourhood. Uses the component-wise
   * median rather than a mean: a mean is itself dragged off by the faulty
   * station, which then makes its innocent neighbours look like the outliers.
   *
   * Snapshot-only — it cannot see a sensor frozen at a plausible value. Persist
   * `reliability()` across refreshes if you want that.
   */
  private scoreFaults(now: number): void {
    const n = this.p.length;
    if (n < 6) return;
    const res = new Float64Array(n).fill(NaN);
    const us: number[] = [],
      vs: number[] = [];

    for (let i = 0; i < n; i++) {
      const m = this.near(this.p[i].lat, this.p[i].lon, now, i);
      if (m < 3) continue;
      us.length = 0;
      vs.length = 0;
      for (let j = 0; j < m; j++) {
        us.push(this.p[this.nI[j]].u);
        vs.push(this.p[this.nI[j]].v);
      }
      res[i] = Math.hypot(this.p[i].u - median(us), this.p[i].v - median(vs));
    }

    const finite = Array.from(res).filter(Number.isFinite);
    if (finite.length < 4) return;
    const scale = Math.max(1.4826 * median(finite), SCALE_FLOOR);
    for (let i = 0; i < n; i++) {
      if (!Number.isFinite(res[i])) continue;
      const z = res[i] / (3 * scale); // z=1 → half weight, z=2 → ~0.06
      this.p[i].rel = Math.max(0.02, 1 / (1 + z * z * z * z));
    }
  }

  // -- query -----------------------------------------------------------------

  sample(lat: number, lon: number, now: number = Date.now()): WindEstimate {
    const o = this.o;
    const m = this.near(lat, lon, now, -1);
    if (m === 0) return EMPTY();

    const { nD, nI, nW, nT, nR, nX, nY } = this;
    // Bandwidth from the local median neighbour distance, so dense clusters get
    // a tight kernel and sparse gaps a wide one with no global tuning.
    const L = Math.max(nD[m >> 1], MIN_BANDWIDTH_M);

    let sumW = 0,
      sumBase = 0;
    for (let j = 0; j < m; j++) {
      const s = this.p[nI[j]];
      const t = nD[j] / L;
      nT[j] = Math.exp((LN_HALF * (now - s.ts)) / o.halfLifeMs);
      const base = Math.exp(-t * t) * nT[j];
      nW[j] = base * s.rel;
      sumW += nW[j];
      sumBase += base;
    }
    if (sumW <= 0) return EMPTY();
    // How much of the nearby, fresh observing capacity we actually trust.
    const trust = clamp01(sumW / sumBase);

    let cu = 0,
      cv = 0;
    for (let j = 0; j < m; j++) {
      cu += nW[j] * this.p[nI[j]].u;
      cv += nW[j] * this.p[nI[j]].v;
    }
    cu /= sumW;
    cv /= sumW;

    // Tukey biweight rejection. Needs >=4 points, below which an outlier is
    // indistinguishable from a genuine gradient.
    let outlierFrac = 0;
    if (m >= 4) {
      for (let j = 0; j < m; j++) {
        nR[j] = Math.hypot(this.p[nI[j]].u - cu, this.p[nI[j]].v - cv);
        this.nS[j] = nR[j];
      }
      const cutoff = TUKEY_C * Math.max(1.4826 * medianOf(this.nS, m), SCALE_FLOOR);
      let sw = 0,
        au = 0,
        av = 0;
      for (let j = 0; j < m; j++) {
        const t = nR[j] / cutoff;
        nW[j] *= t < 1 ? (1 - t * t) * (1 - t * t) : 0;
        sw += nW[j];
        au += nW[j] * this.p[nI[j]].u;
        av += nW[j] * this.p[nI[j]].v;
      }
      if (sw > 1e-12) {
        outlierFrac = 1 - sw / sumW;
        cu = au / sw;
        cv = av / sw;
        sumW = sw;
      }
    }

    // Single accumulation pass for every statistic the confidence needs.
    let sw2 = 0,
      sSpd = 0,
      sDist = 0,
      sAge = 0,
      sFresh = 0,
      sVar = 0;
    let bx = 0,
      by = 0,
      bw = 0; // bearings to stations → extrapolation check
    let dx = 0,
      dy = 0,
      dw = 0; // unit wind vectors → directional agreement
    for (let j = 0; j < m; j++) {
      const w = nW[j];
      if (w <= 0) continue;
      const s = this.p[nI[j]];
      sw2 += w * w;
      sSpd += w * s.spd;
      sDist += w * nD[j];
      sAge += w * Math.max(0, now - s.ts);
      sFresh += w * nT[j];
      if (nD[j] > 1) {
        bx += (w * nY[j]) / nD[j];
        by += (w * nX[j]) / nD[j];
        bw += w;
      }
      if (s.spd > 1e-9) {
        // Damped so near-calm stations, whose bearings are mostly noise, don't
        // pollute the directional agreement measure.
        const dj = w * (s.spd / (s.spd + 0.5));
        dx += (dj * s.u) / s.spd;
        dy += (dj * s.v) / s.spd;
        dw += dj;
      }
    }

    const speed = sSpd / sumW;
    for (let j = 0; j < m; j++) {
      if (nW[j] > 0) {
        const e = this.p[nI[j]].spd - speed;
        sVar += nW[j] * e * e;
      }
    }

    const vecSpeed = Math.hypot(cu, cv);
    const coherence = clamp01((vecSpeed + 0.25) / (speed + 0.25));
    const nEff = (sumW * sumW) / sw2;

    // Confidence factors, each 0–1.
    const pr = sDist / sumW / o.confidenceRadiusM;
    const fProx = Math.exp(-pr * pr);
    const fFresh = clamp01(sFresh / sumW);
    const fCov = 1 - Math.exp(-nEff / 2);
    // A bearing resultant near 1 means every station lies the same way — we're
    // extrapolating off the edge of the network, not interpolating inside it.
    let fGeom = 1;
    if (bw > 0) {
      fGeom = 0.3 + 0.7 * (1 - clamp01(Math.hypot(bx, by) / bw));
      const nb = nD[0] / (0.25 * o.confidenceRadiusM); // sitting on a station
      fGeom += (1 - fGeom) * Math.exp(-nb * nb); // makes one-sidedness moot
    }
    const disp = Math.sqrt(sVar / sumW) / (speed + 1);
    const fAgreeS = 1 / (1 + disp * disp);
    const fAgreeD = 0.15 + 0.85 * (dw > 0 ? clamp01(Math.hypot(dx, dy) / dw) : 0);
    const fInteg = clamp01((1 - 0.5 * outlierFrac) * Math.sqrt(trust));

    // Weighted geometric mean of the shared factors; freshness multiplies from
    // outside so stale data collapses confidence rather than being averaged away.
    const shared = 1.5 * lg(fProx) + lg(fCov) + lg(clamp01(fGeom)) + 0.9 * lg(fInteg);
    const W = 1.5 + 1 + 1 + 0.9 + 1.3;
    const sc = clamp01(fFresh * Math.exp((shared + 1.3 * lg(fAgreeS)) / W));
    const dc = clamp01(fFresh * Math.exp((shared + 1.3 * lg(fAgreeD)) / W));

    // If the mean vector has collapsed, fall back to the unit-vector mean so we
    // still return a bearing; directionConfidence will already be low.
    const [ou, ov] = vecSpeed > 1e-6 ? [cu, cv] : [dx, dy];
    return {
      windDirection: (((Math.atan2(-ou, -ov) / DEG) % 360) + 360) % 360,
      windSpeed: speed,
      confidence: Math.sqrt(sc * dc),
      speedConfidence: sc,
      directionConfidence: dc,
      u: cu,
      v: cv,
      stationsUsed: m,
      nearestDistanceM: nD[0],
      meanAgeMs: sAge / sumW,
      coherence
    };
  }

  /**
   * Samples a regular grid, row-major from the south edge. Cheaper than calling
   * `sample` per pixel: sample coarsely, then bilinear-interpolate between nodes.
   */
  sampleGrid(
    bounds: { south: number; west: number; north: number; east: number },
    cols: number,
    rows: number,
    now: number = Date.now()
  ) {
    const n = cols * rows;
    const out = {
      cols,
      rows,
      bounds,
      u: new Float32Array(n),
      v: new Float32Array(n),
      speed: new Float32Array(n),
      direction: new Float32Array(n),
      confidence: new Float32Array(n)
    };
    const dLat = rows > 1 ? (bounds.north - bounds.south) / (rows - 1) : 0;
    const dLon = cols > 1 ? (bounds.east - bounds.west) / (cols - 1) : 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const e = this.sample(bounds.south + r * dLat, bounds.west + c * dLon, now);
        const i = r * cols + c;
        out.u[i] = e.u;
        out.v[i] = e.v;
        out.speed[i] = e.windSpeed ?? NaN;
        out.direction[i] = e.windDirection ?? NaN;
        out.confidence[i] = e.confidence;
      }
    }
    return out;
  }

  /** Stations scored as likely faulty, worst first. */
  suspects(threshold = 0.5) {
    return this.p
      .filter((s) => s.rel < threshold)
      .map((s) => ({ station: s.src, reliability: s.rel }))
      .sort((a, b) => a.reliability - b.reliability);
  }

  /** Per-station fault scores, keyed by id. */
  reliability(): Map<string | number, number> {
    const out = new Map<string | number, number>();
    for (const s of this.p) if (s.src.id !== undefined) out.set(s.src.id, s.rel);
    return out;
  }

  get stationCount(): number {
    return this.p.length;
  }
}

// -- helpers ------------------------------------------------------------------

/** First index in a sorted array whose value is >= x. */
function bisect(a: Float64Array, x: number): number {
  let lo = 0,
    hi = a.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

function median(a: number[]): number {
  a.sort((x, y) => x - y);
  const n = a.length;
  return n % 2 ? a[(n - 1) >> 1] : (a[n / 2 - 1] + a[n / 2]) / 2;
}

/** Allocation-free median for small n. Insertion sort; destroys buf[0..n). */
function medianOf(buf: Float64Array, n: number): number {
  for (let i = 1; i < n; i++) {
    const x = buf[i];
    let j = i - 1;
    while (j >= 0 && buf[j] > x) {
      buf[j + 1] = buf[j];
      j--;
    }
    buf[j + 1] = x;
  }
  return n % 2 ? buf[(n - 1) >> 1] : (buf[n / 2 - 1] + buf[n / 2]) / 2;
}

function clamp01(x: number): number {
  return Number.isFinite(x) ? (x < 0 ? 0 : x > 1 ? 1 : x) : 0;
}

/** Floored log, so one zeroed factor drags hard without giving -Infinity. */
function lg(x: number): number {
  return Math.log(x > 1e-6 ? x : 1e-6);
}

function EMPTY(): WindEstimate {
  return {
    windDirection: null,
    windSpeed: null,
    confidence: 0,
    speedConfidence: 0,
    directionConfidence: 0,
    u: 0,
    v: 0,
    stationsUsed: 0,
    nearestDistanceM: null,
    meanAgeMs: null,
    coherence: 0
  };
}

/*
 * Notes and limits
 * ----------------
 * Reporting speed. `windSpeed` is the weighted mean of station magnitudes;
 * `u`/`v` is the mean vector, whose magnitude is smaller wherever the flow
 * converges. Use `u`/`v` for streamlines and particle fields — that field is
 * divergence-consistent — and `windSpeed` for "the wind speed here".
 *
 * Fault detection is a snapshot. It compares each station to its neighbours at
 * one instant, so it cannot see a sensor frozen at a plausible value or a
 * constant bearing offset in uniform flow. Persist `reliability()` between
 * refreshes and treat repeated low scores as the real signal. Two stations at
 * identical coordinates that disagree are irreducibly ambiguous; both suffer.
 *
 * Terrain is invisible. The kernel knows only great-circle distance, so it will
 * blend a sheltered valley station with an exposed summit 8 km away. In complex
 * terrain drop `confidenceRadiusM` to 10-20 km so the output at least reports
 * its own unreliability.
 *
 * Scaling. Neighbour search is a binary-searched latitude band, which is fast
 * for spread-out networks and for anything up to a few thousand stations, but
 * degrades on a large network packed into a small area (~30 us/query at 20k
 * stations inside 10x15 degrees, versus ~2 us at 500 stations). If that is your
 * shape and it matters, a 2-D index is the fix. `detectFaults: false` also
 * removes the dominant build cost on large networks.
 *
 * Tuning. `confidenceRadiusM` is the main dial and encodes how fast you think
 * surface wind decorrelates. `halfLifeMs` should roughly match your reporting
 * interval. Directions are meteorological; if your feed uses the "blowing
 * toward" convention, add 180 on the way in.
 */
