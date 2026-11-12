/* Generic navigation and modem examples; no assignment solution data. */
(() => {
  const c = 299792458, tau = 2 * Math.PI;
  const close = (a, b, tolerance = 1e-9) => Math.abs(a - b) < tolerance;
  const ctl = (id, label, min, max, step, value, unit = '') => ({id, label, min, max, step, value, unit});
  const pick = (id, label, value, choices) => ({id, label, value, options: choices.map(([value, label]) => ({value, label}))});
  const sources = ['Course: November navigation and digital-modulation topics; generic mathematical examples'];
  const sinc = x => Math.abs(x) < 1e-12 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);

  const f1 = 1575.42, f2 = 1227.60; // MHz; ratios and combination coefficients are dimensionless.
  const alpha = f1 * f1 / (f1 * f1 - f2 * f2);
  const beta = -f2 * f2 / (f1 * f1 - f2 * f2);
  const ionoRatio = (f1 / f2) ** 2;
  const noiseGain = Math.hypot(alpha, beta);
  modules.push({
    id: 'dual-frequency', group: 'Navigation', title: 'Dual-frequency ranging',
    heading: 'Two frequencies separate the leading ionospheric delay from common range',
    intro: 'Cancel a 1/f² code-delay term while tracking the noise and common biases that remain.', sources,
    controls: [ctl('iono', 'L1 ionospheric code delay', 0, 30, 1, 5, 'm'), ctl('common', 'Common residual bias', 0, 20, 1, 3, 'm'), ctl('sigma', 'Independent noise σ per frequency', .1, 3, .1, .5, 'm')],
    render(v, U) {
      const i1 = v.iono, i2 = v.iono * ionoRatio, residual = alpha * i1 + beta * i2;
      const bars = [{name: 'L1 code', iono: i1}, {name: 'L2 code', iono: i2}, {name: 'Ionosphere-free', iono: 0}];
      const ymax = Math.max(1, i2 + v.common), scale = 175 / ymax, baseline = 320;
      let s = U.text(60, 35, 'L1: 1575.42 MHz; L2: 1227.60 MHz') + U.text(60, 75, 'First-order code delay grows as 1/f²');
      bars.forEach((b, i) => {
        const x = 110 + i * 225, hc = v.common * scale, hi = b.iono * scale;
        s += `<rect x="${x}" y="${baseline - hc}" width="90" height="${hc}" fill="${U.C.b}"/>`;
        s += `<rect x="${x}" y="${baseline - hc - hi}" width="90" height="${hi}" fill="${U.C.a}"/>`;
        s += U.text(x + 45, 350, b.name, 'middle') + U.text(x + 45, 378, U.fmt(b.iono + v.common, 3) + ' m', 'middle');
      });
      s += U.line(70, baseline, 740, baseline, U.C.grid) + U.text(60, 420, 'Teal: first-order ionosphere; orange: common residual bias');
      s += U.text(60, 460, 'α = ' + U.fmt(alpha, 5) + '; β = ' + U.fmt(beta, 5) + '; independent-noise gain = ' + U.fmt(noiseGain, 3));
      return {svg: U.svg(s, 'L1 and L2 ionospheric delay and the retained common bias after combination', 800, 490),
        stats: [['First-order residual', U.fmt(residual, 6) + ' m'], ['Retained common bias', U.fmt((alpha + beta) * v.common, 3) + ' m'], ['Combined noise σ', U.fmt(v.sigma * noiseGain, 3) + ' m']],
        equation: 'P<sub>IF</sub> = αP₁ + βP₂; &nbsp; α = f₁²/(f₁²−f₂²); &nbsp; β = −f₂²/(f₁²−f₂²); &nbsp; σ<sub>IF</sub> = σ√(α²+β²)',
        note: 'Code pseudoranges with a common geometric/clock term and a first-order 1/f² ionospheric delay. Equal independent per-frequency noise is assumed; the plotted bars omit random realizations. Higher-order ionosphere, hardware biases and other residuals remain outside this model.',
        question: 'Why can removing the leading ionospheric term increase the measurement noise standard deviation?'};
    },
    checks: () => [
      {name: 'Ionosphere-free coefficients preserve a common range term', pass: close(alpha + beta, 1)},
      {name: 'L1/L2 first-order ionospheric term cancels', pass: Math.abs(alpha + beta * ionoRatio) < 1e-12},
      {name: 'L1/L2 independent equal-noise gain is approximately 2.978', pass: close(noiseGain, 2.978255244444737, 1e-9)}
    ]
  });

  const code31 = () => {
    const bits = [1, 1, 1, 1, 1];
    for (let i = 0; i < 31; i++) bits.push(bits[i] ^ bits[i + 2]);
    return bits.slice(0, 31).map(x => 2 * x - 1);
  };
  const code = code31();
  const codeCorrelation = shift => code.reduce((sum, x, i) => sum + x * code[(i + ((shift % 31) + 31) % 31) % 31], 0) / 31;
  const acquisitionScore = (delayError, frequencyError, seconds) => codeCorrelation(delayError) ** 2 * sinc(frequencyError * seconds) ** 2;
  const scoreDb = score => 10 * Math.log10(Math.max(1e-12, score));
  modules.push({
    id: 'gnss-acquisition', group: 'Navigation', title: 'Code-delay and Doppler search',
    heading: 'A receiver searches code alignment and carrier frequency together',
    intro: 'Inspect a sampled acquisition surface and the coherent loss from a wrong frequency hypothesis.', sources,
    controls: [ctl('delay', 'True code delay', 0, 30, 1, 9, 'chips'), ctl('doppler', 'True carrier offset', -1000, 1000, 25, 375, 'Hz'), ctl('time', 'Coherent integration T', 1, 20, 1, 5, 'ms'), ctl('trialDelay', 'Trial code delay', 0, 30, 1, 9, 'chips'), ctl('trialDoppler', 'Trial carrier offset', -1000, 1000, 100, 300, 'Hz')],
    render(v, U) {
      const T = v.time / 1000, x0 = 80, y0 = 60, dx = 15, dy = 12;
      let s = U.text(60, 28, 'Fixed 100 Hz frequency grid; color is power relative to exact alignment');
      let best = {score: -1, delay: 0, frequency: 0};
      for (let row = 0; row < 21; row++) {
        const frequency = 1000 - row * 100;
        for (let delay = 0; delay < 31; delay++) {
          const score = acquisitionScore(delay - v.delay, frequency - v.doppler, T);
          if (score > best.score) best = {score, delay, frequency};
          const level = Math.max(0, Math.min(1, (scoreDb(score) + 40) / 40));
          s += `<rect x="${x0 + delay * dx}" y="${y0 + row * dy}" width="${dx}" height="${dy}" fill="${U.C.a}" opacity="${.08 + .92 * level}"/>`;
        }
      }
      const row = (1000 - v.trialDoppler) / 100;
      s += `<rect x="${x0 + v.trialDelay * dx}" y="${y0 + row * dy}" width="${dx}" height="${dy}" fill="none" stroke="${U.C.b}" stroke-width="2"/>`;
      for (const delay of [0, 5, 10, 15, 20, 25, 30]) s += U.text(x0 + (delay + .5) * dx, 340, delay, 'middle');
      for (const frequency of [-1000, 0, 1000]) s += U.text(70, y0 + (1000 - frequency) / 100 * dy + 10, frequency, 'end');
      s += U.text(310, 380, 'Code-delay hypothesis (chips)', 'middle') + U.text(60, 420, 'Rows: frequency hypothesis in Hz; dark color: 0 dB; faint color: −40 dB or below');
      s += U.text(575, 90, 'Best sampled cell') + U.text(575, 125, best.delay + ' chips') + U.text(575, 160, best.frequency + ' Hz');
      s += U.text(575, 215, 'First frequency null') + U.text(575, 250, U.fmt(1 / T, 1) + ' Hz from truth');
      if (best.score < 1e-12) s += U.text(575, 300, 'Grid misses the narrow peak');
      const codePower = codeCorrelation(v.trialDelay - v.delay) ** 2;
      const dopplerPower = sinc((v.trialDoppler - v.doppler) * T) ** 2;
      return {svg: U.svg(s, 'Code delay and carrier-offset acquisition grid with a selected trial cell', 800, 450),
        stats: [['Trial code factor', U.fmt(codePower, 4)], ['Trial Doppler factor', U.fmt(dopplerPower, 4)], ['Trial score, −120 dB floor', U.fmt(scoreDb(codePower * dopplerPower), 2) + ' dB']],
        equation: 'A(Δd,Δf) = |R<sub>code</sub>(Δd)|² |sinc(ΔfT)|²; &nbsp; sinc(x) = sin(πx)/(πx)',
        note: 'A separable teaching acquisition surface using a periodic 31-chip code, ideal code timing and a constant data sign. It omits noise and actual code/Doppler coupling. Longer integration narrows the frequency response, so a fixed grid can miss a between-bin peak. Code delay is modulo the code period.',
        question: 'If integration time doubles, how should the frequency grid change to keep a similar worst-case coherent loss?'};
    },
    checks: () => [
      {name: 'Acquisition code factor has unit aligned and 1/961 off-peak power', pass: close(codeCorrelation(0), 1) && close(codeCorrelation(1) ** 2, 1 / 961)},
      {name: 'Exact code and frequency alignment has unit acquisition score', pass: close(acquisitionScore(0, 0, .005), 1)},
      {name: 'Residual frequency 1/T gives the first coherent null', pass: acquisitionScore(0, 200, .005) < 1e-25},
      {name: 'Half-cycle coherent mismatch has power 4/pi squared', pass: close(acquisitionScore(0, 100, .005), 4 / Math.PI ** 2)}
    ]
  });

  const raised = (t, a) => {
    if (a === 0) return sinc(t);
    if (Math.abs(1 - (2 * a * t) ** 2) < 1e-9) return Math.PI / 4 * sinc(1 / (2 * a));
    return sinc(t) * Math.cos(Math.PI * a * t) / (1 - (2 * a * t) ** 2);
  };
  const alphabet = M => {
    if (M === 2) return [[-1, 0], [1, 0]];
    const q = Math.sqrt(M), scale = Math.sqrt(2 * (M - 1) / 3), result = [];
    for (let y = 0; y < q; y++) for (let x = 0; x < q; x++) result.push([(2 * x - q + 1) / scale, (2 * y - q + 1) / scale]);
    return result;
  };
  modules.push({
    id: 'modem-chain', group: 'Digital', title: 'The modem signal chain',
    heading: 'Rates and waveform choices belong to specific stages of the modem',
    intro: 'Connect information bits, channel coding, constellation symbols and the combined pulse response.', sources,
    controls: [ctl('rate', 'Information bit rate', 1, 12, 1, 6, 'Mbit/s'), pick('codeRate', 'Channel code rate', .75, [[.5, '1/2'], [.75, '3/4'], [1, '1 (uncoded)']]), pick('M', 'Modulation alphabet', 16, [[2, 'BPSK'], [4, 'QPSK'], [16, '16-QAM'], [64, '64-QAM']]), ctl('rolloff', 'Combined raised-cosine rolloff', 0, 1, .05, .25, '')],
    render(v, U) {
      const coded = v.rate / v.codeRate, symbols = coded / Math.log2(v.M), bandwidth = (1 + v.rolloff) * symbols;
      const labels = [['Information bits', v.rate + ' Mbit/s'], ['Channel encoder', U.fmt(coded, 3) + ' Mbit/s'], ['Symbol mapper', U.fmt(symbols, 3) + ' Mbaud'], ['Pulse / channel', U.fmt(bandwidth, 3) + ' MHz RF']];
      let s = U.text(45, 32, 'Information → coded bits → I/Q symbols → occupied passband');
      labels.forEach(([name, rate], i) => {
        const x = 40 + 190 * i;
        s += `<rect x="${x}" y="65" width="150" height="85" rx="5" fill="none" stroke="${U.C.grid}"/>` + U.text(x + 75, 95, name, 'middle') + U.text(x + 75, 126, rate, 'middle');
        if (i < 3) s += U.arrow(x + 155, 106, x + 180, 106, U.C.a);
      });
      s += U.text(60, 215, 'Combined Nyquist pulse h(t)') + U.line(70, 350, 450, 350, U.C.grid) + U.line(260, 255, 260, 425, U.C.grid);
      s += U.path(Array.from({length: 361}, (_, i) => {const t = -3 + i / 60; return [70 + (t + 3) / 6 * 380, 350 - 70 * raised(t, v.rolloff)];}), U.C.a, 2);
      for (const t of [-3, 0, 3]) s += U.text(70 + (t + 3) / 6 * 380, 380, t, 'middle');
      s += U.text(260, 430, 't / T (symbol periods)', 'middle') + U.text(515, 215, 'Unit-average-energy I/Q');
      s += U.line(530, 330, 750, 330, U.C.grid) + U.line(640, 235, 640, 425, U.C.grid) + U.text(760, 336, 'I') + U.text(648, 238, 'Q');
      for (const point of alphabet(v.M)) s += U.circle(640 + point[0] * 70, 330 - point[1] * 70, 3.5, U.C.b, U.C.b);
      s += U.text(60, 480, 'The plotted pulse is the combined transmit/channel/receive reference response.');
      return {svg: U.svg(s, 'Modem rate chain with a raised-cosine pulse and normalized modulation alphabet', 800, 510),
        stats: [['Coded rate', U.fmt(coded, 3) + ' Mbit/s'], ['Symbol rate', U.fmt(symbols, 3) + ' Mbaud'], ['Occupied RF width', U.fmt(bandwidth, 3) + ' MHz']],
        equation: 'R<sub>coded</sub> = Rb/Rc; &nbsp; Rs = Rb/(Rc log₂M); &nbsp; B<sub>RF</sub> ≈ (1+α)Rs',
        note: 'Source compression is already included in the information input. Framing, pilots, synchronization overhead and channel errors are omitted. The pulse is a combined raised-cosine reference, which can be implemented with suitable root-raised-cosine transmit and matched-receive filters. The I/Q alphabet is energy normalized; no BER is predicted.',
        question: 'If code rate falls while information rate and modulation stay fixed, which downstream rates must rise?'};
    },
    checks: () => [
      {name: '6 Mbps, rate 3/4, 16-QAM, rolloff .25 gives 2.5 MHz RF', pass: close((6 / .75 / 4) * 1.25, 2.5)},
      {name: 'Every modem alphabet has unit average symbol energy', pass: [2, 4, 16, 64].every(M => close(alphabet(M).reduce((s, p) => s + p[0] ** 2 + p[1] ** 2, 0) / M, 1))},
      {name: 'Combined raised-cosine pulse has integer Nyquist zeros', pass: [0, .25, .5, 1].every(a => [1, 2, 3].every(n => Math.abs(raised(n, a)) < 1e-10))},
      {name: 'Raised-cosine removable singularity is evaluated', pass: close(raised(.5, 1), .5)}
    ]
  });

  const inverse4 = matrix => {
    const a = matrix.map((row, i) => row.concat([0, 1, 2, 3].map(j => +(i === j))));
    const norm = Math.max(...matrix.map(row => row.reduce((s, x) => s + Math.abs(x), 0)));
    for (let j = 0; j < 4; j++) {
      let pivot = j;
      for (let i = j + 1; i < 4; i++) if (Math.abs(a[i][j]) > Math.abs(a[pivot][j])) pivot = i;
      if (Math.abs(a[pivot][j]) < 1e-11 * Math.max(1, norm)) return null;
      [a[j], a[pivot]] = [a[pivot], a[j]];
      const divisor = a[j][j];
      for (let k = 0; k < 8; k++) a[j][k] /= divisor;
      for (let i = 0; i < 4; i++) if (i !== j) {
        const factor = a[i][j];
        for (let k = 0; k < 8; k++) a[i][k] -= factor * a[j][k];
      }
    }
    const result = a.map(row => row.slice(4));
    const inverseNorm = Math.max(...result.map(row => row.reduce((s, x) => s + Math.abs(x), 0)));
    if (!result.flat().every(Number.isFinite) || norm * inverseNorm > 1e12) return null;
    return result.map((row, i) => row.map((x, j) => (x + result[j][i]) / 2));
  };
  const skyFor = v => Array.from({length: 6}, (_, i) => ({az: (-v.spread / 2 + v.spread * i / 5) * Math.PI / 180, el: (i % 2 ? Math.min(85, v.low + v.separation) : v.low) * Math.PI / 180}));
  const dopFor = sky => {
    const H = sky.map(({az, el}) => [-Math.cos(el) * Math.sin(az), -Math.cos(el) * Math.cos(az), -Math.sin(el), 1]);
    const normal = Array.from({length: 4}, (_, i) => Array.from({length: 4}, (_, j) => H.reduce((s, row) => s + row[i] * row[j], 0)));
    const Q = inverse4(normal);
    if (!Q || [0, 1, 2, 3].some(i => Q[i][i] < 0)) return {ok: false};
    return {ok: true, Q, HDOP: Math.sqrt(Q[0][0] + Q[1][1]), VDOP: Math.sqrt(Q[2][2]), TDOP: Math.sqrt(Q[3][3]), PDOP: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2]), GDOP: Math.sqrt(Q[0][0] + Q[1][1] + Q[2][2] + Q[3][3])};
  };
  modules.push({
    id: 'gnss-dop-3d', group: 'Navigation', title: 'Three-dimensional DOP',
    heading: 'Six sky directions constrain east, north, up and receiver clock together',
    intro: 'Calculate the actual ENU-and-clock normal matrix and see when sky geometry loses a dimension.', sources,
    controls: [ctl('spread', 'Azimuth spread', 30, 360, 15, 300, '°'), ctl('low', 'Lower elevation group', 5, 60, 5, 20, '°'), ctl('separation', 'Elevation-group separation', 0, 60, 5, 35, '°'), ctl('sigma', 'Independent range-error σ', .5, 10, .5, 2, 'm')],
    render(v, U) {
      const sky = skyFor(v), result = dopFor(sky), cx = 225, cy = 255, R = 145;
      let s = U.text(55, 30, 'Generic six-source sky: north up, east right') + U.circle(cx, cy, R, 'none', U.C.muted) + U.circle(cx, cy, R / 2, 'none', U.C.grid);
      s += U.line(cx - R, cy, cx + R, cy, U.C.grid) + U.line(cx, cy - R, cx, cy + R, U.C.grid);
      s += U.text(cx, 90, 'N', 'middle') + U.text(390, cy + 5, 'E') + U.text(45, cy + 5, 'W') + U.text(cx, 430, 'S', 'middle');
      sky.forEach(({az, el}, i) => {
        const x = cx + R * Math.cos(el) * Math.sin(az), y = cy - R * Math.cos(el) * Math.cos(az);
        s += U.line(cx, cy, x, y, U.C.grid) + U.circle(x, y, 6, i % 2 ? U.C.b : U.C.a, i % 2 ? U.C.b : U.C.a);
      });
      s += U.text(55, 475, 'Sky radius = cos(elevation); the center is zenith.');
      if (result.ok) {
        [['HDOP', result.HDOP], ['VDOP', result.VDOP], ['PDOP', result.PDOP], ['TDOP', result.TDOP], ['GDOP', result.GDOP]].forEach(([name, value], i) => {s += U.text(440, 110 + i * 43, name + ' = ' + U.fmt(value, 3));});
        s += U.text(440, 365, '3-D position RMS scale:') + U.text(440, 398, U.fmt(v.sigma * result.PDOP, 3) + ' m');
        s += U.text(440, 443, 'Clock-time σ: ' + U.fmt(v.sigma * result.TDOP / c * 1e9, 2) + ' ns');
      } else {
        s += U.text(440, 140, 'Rank-deficient geometry') + U.text(440, 190, 'Equal elevations confound') + U.text(440, 225, 'height and clock distance.') + U.text(440, 290, 'Separate elevation groups') + U.text(440, 325, 'to recover this dimension.');
      }
      return {svg: U.svg(s, 'Six generic sky directions and a full ENU-plus-clock DOP calculation', 800, 505),
        stats: result.ok ? [['HDOP', U.fmt(result.HDOP, 3)], ['VDOP', U.fmt(result.VDOP, 3)], ['GDOP', U.fmt(result.GDOP, 3)]] : [['Matrix rank', 'Deficient'], ['Position DOP', 'Unavailable'], ['Clock DOP', 'Unavailable']],
        equation: 'Hᵢ = [−cosEᵢ sinAᵢ, −cosEᵢ cosAᵢ, −sinEᵢ, 1]; &nbsp; Q = (HᵀH)⁻¹; &nbsp; Cov = σ²Q<br>HDOP²=Qee+Qnn; VDOP²=Quu; TDOP²=Qbb; PDOP²=HDOP²+VDOP²; GDOP²=PDOP²+TDOP²',
        note: 'A local linearized 3-D model with six generic directions, equal independent range errors, and receiver clock expressed as distance cb. DOP is dimensionless; σPDOP is a three-coordinate RMS scale, not a confidence radius. Elevations cap at 85°. Rank-deficient or severely ill-conditioned matrices are reported rather than regularized into a false solution.',
        question: 'Why do six measurements at the same elevation still fail to separate height from clock bias?'};
    },
    checks: () => {
      const sky = skyFor({spread: 300, low: 20, separation: 35}), d = dopFor(sky), rotated = dopFor(sky.map(x => ({az: x.az + Math.PI / 2, el: x.el})));
      return [
        {name: 'Six mixed-elevation directions give finite positive 3-D DOP', pass: d.ok && [d.HDOP, d.VDOP, d.TDOP, d.PDOP, d.GDOP].every(x => Number.isFinite(x) && x > 0)},
        {name: 'Equal-elevation geometry exposes height/clock rank loss', pass: !dopFor(skyFor({spread: 300, low: 20, separation: 0})).ok},
        {name: 'Standard position/time/geometric DOP trace identities hold', pass: d.ok && close(d.PDOP ** 2, d.HDOP ** 2 + d.VDOP ** 2) && close(d.GDOP ** 2, d.PDOP ** 2 + d.TDOP ** 2)},
        {name: 'Rotating sky azimuth preserves horizontal and vertical DOP', pass: d.ok && rotated.ok && close(d.HDOP, rotated.HDOP) && close(d.VDOP, rotated.VDOP)}
      ];
    }
  });
})();
