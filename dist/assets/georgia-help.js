/* Plain-text teaching help for the GeorgiaTenna project controls. */
(() => {
  'use strict';
  const root=typeof window==='undefined'?globalThis:window;
  const help={
    'gs-preset':{
      title:'Array examples',
      paragraphs:['Default, compact, wide and thinned arrays provide synthetic equal-amplitude starting layouts. Their aperture sizes and empty sites change the interference pattern, coverage and hardware count.','Optimal loads the saved best-found 175-element design evaluated on the original raster. This explorer uses coarse samples and a schematic boundary, so its displayed miss/spill counts and score can differ from that reference. Re-evaluate the full raster and off-map reception when judging a modified design.']
    },
    '[data-gs-play]':{
      title:'Wave animation',
      paragraphs:['Play or pause the slowed visual wave motion. The current array, calculated coverage and figure of merit stay the same while this animation runs.']
    },
    '[data-gs-reset]':{
      title:'Reset the whole system',
      paragraphs:['Restore the default array, geometry, phases and transmit power. This returns all physical settings to one shared starting example.']
    },
    'gs-tab-system':{
      title:'System view',
      paragraphs:['See the satellite, Earth, Georgia footprint, enlarged array and phase-coherence inset together. The connections show how one set of array settings produces a geographic result.']
    },
    'gs-tab-array':{
      title:'Array view',
      paragraphs:['Inspect the installed sites and their feed phases at a larger scale. Dot colors and arrows show the total applied feed phase; the phasor inset includes propagation phase toward Georgia’s center.']
    },
    'gs-tab-georgia':{
      title:'Georgia view',
      paragraphs:['Inspect the received-power samples and state boundary. Each location uses its own observation direction and slant range, so the same feed phases can reinforce differently across the map.']
    },
    '[data-gs-power-colors]':{
      title:'Coverage and power colors',
      paragraphs:['Coverage colors separate covered Georgia samples, missed Georgia samples and reception outside Georgia at the −80 dBm threshold. Power colors instead show the continuous received level using the displayed dBm scale. The calculated field and score stay the same.']
    },
    'gs-element':{
      title:'Selected element',
      paragraphs:['Choose a grid site or saved sparse feed to inspect or edit. The selected installed element’s contribution is highlighted orange in the phasor inset. Selecting it changes the highlight; its physical settings change through the phase and install/remove controls.']
    },
    'gs-element-phase':{
      title:'Individual phase offset',
      paragraphs:['Add the phase offset δ to the selected feed after automatic steering and the X/Y phase ramps. This rotates that element’s complex contribution while the other feeds retain their settings. Changing one contribution can alter the combined field and coverage.'],
      example:'Try moving one installed feed’s offset from 0° to 180°. Its phasor reverses, and the teal mean-field arrow changes as the sum is recomputed.'
    },
    '[data-gs-remove]':{
      title:'Install or remove an element',
      paragraphs:['Removing an element removes its field contribution and its hardware from N. Its grid site becomes empty; other sites keep their positions and phase-ramp indices. Installing it restores that site with its stored individual phase offset.']
    },
    'gs-controls-geometry':{
      title:'Physical geometry',
      paragraphs:['These settings place the satellite and orient the physical aperture. Geometry determines the rays, ranges and array-local coordinates used by the field calculation.']
    },
    'gs-controls-aperture':{
      title:'Aperture layout',
      paragraphs:['Rows, columns and lattice step set the array’s installed-site layout and physical extent. The aperture controls angular beam widths and the locations of other lobes.']
    },
    'gs-controls-beam':{
      title:'Electronic beam control',
      paragraphs:['These settings change feed phases while the physical aperture stays in its selected orientation. Automatic steering aims a regular array toward a geographic target or retargets the saved shaped footprint. Extra ramps and individual offsets modify that solution.']
    },
    'gs-longitude':{
      title:'Satellite longitude',
      paragraphs:['Choose the equatorial GEO satellite’s Earth-fixed longitude. Moving it changes the ray directions and slant ranges to Georgia, which changes the steering phases and free-space received power.']
    },
    'gs-normal':{
      title:'Physical array normal',
      paragraphs:['The array normal is perpendicular to its plane and defines broadside. “Toward Georgia” points the untilted normal at the fixed center, 32.7° N, 83.6° W; “Toward Earth’s center” points it along nadir. Tilt and roll then orient the aperture relative to that reference.','The electronic steering latitude and longitude are separate settings. Automatic steering can aim the phases toward that chosen target with either physical-normal choice.']
    },
    'gs-tilt-x':{
      title:'Tilt about local x',
      paragraphs:['Rotate the physical aperture about its local x axis. This changes its normal and the propagation direction components measured in the aperture frame. Automatic steering recomputes the feed phases and can preserve coherence at its target while the projected pattern changes.']
    },
    'gs-tilt-y':{
      title:'Tilt about local y',
      paragraphs:['Rotate the physical aperture about its local y axis. This changes its normal and the local propagation coordinates. With automatic steering enabled, the feeds compensate toward the chosen target; turning it off lets you inspect physical pointing with the remaining phase settings held.']
    },
    'gs-roll':{
      title:'Array roll',
      paragraphs:['Rotate the element layout about the aperture’s own normal. The normal stays fixed while the layout axes and phase-ramp directions rotate relative to Earth. Automatic steering recalculates the feed phases in the rotated frame.']
    },
    'gs-rows':{
      title:'Array rows',
      paragraphs:['On a regular grid, change the number of potential sites along local y. At fixed lattice step, more rows extend the aperture and add feeds except at removed sites. The pattern and the score’s hardware term both change.','Optimal keeps its saved sparse layout. Choose a regular preset to unlock the row, column and lattice-step controls.']
    },
    'gs-columns':{
      title:'Array columns',
      paragraphs:['On a regular grid, change the number of potential sites along local x. At fixed lattice step, more columns extend the aperture and add feeds except at removed sites. The beam shape and hardware count both affect the score.','Optimal keeps its saved sparse layout. Choose a regular preset to unlock the row, column and lattice-step controls.']
    },
    'gs-stride':{
      title:'Lattice step and physical spacing',
      paragraphs:['On a regular grid, the lattice step is the number of half-wavelength intervals between neighboring displayed row or column positions. Larger spacing increases the aperture without adding elements, which can narrow lobes and produce additional coherent directions called grating lobes.','Regular-grid extra phase steps apply per displayed row or column interval. Removing an intermediate site preserves those indices. Optimal instead keeps fixed sparse positions on the fine λ/2 lattice, and its extra phase steps apply per fine-lattice coordinate step. Choose a regular preset to change the layout spacing.'],
      equation:'d = sλ/2, where s is Lattice step and d is adjacent grid-position spacing.',
      example:'At 30 GHz, λ/2 is about 5 mm. Lattice step 4 gives approximately 20 mm between adjacent displayed positions.'
    },
    'gs-auto-steer':{
      title:'Automatic electronic steering',
      paragraphs:['For a regular array, calculate feed phases that cancel relative propagation phase toward the chosen steering latitude and longitude. Extra X/Y ramps and individual offsets are then added. With automatic steering off, these remaining phase controls provide manual steering.','Optimal starts with its saved shaped feed phases and automatic steering off. Enabling it adds a differential correction from the saved Georgia reference direction to the new target direction. At the saved geometry and default target the correction is zero, preserving the reference design. A shaped footprint can retain deliberate phase differences at its center.','For a regular array with zero extra ramps and offsets, automatic steering gives coherent addition toward its target. With automatic steering off and every feed phase zero, broadside is a coherent direction. Larger lattice spacing can create other coherent directions too.'],
      equation:'Regular: ψauto,n = −k(xₙuₛ + yₙvₛ). Optimal: ψn = ψsaved,n + k[xₙ(uRef − uₛ) + yₙ(vRef − vₛ)]. uₛ and vₛ are target direction cosines; uRef and vRef are the saved reference. Extra ramps and individual offsets add to these phases.'
    },
    'gs-steer-lat':{
      title:'Electronic steering latitude',
      paragraphs:['Choose the north/south location used by automatic steering. With automatic steering enabled, the model recomputes the steering phases toward that target while the physical array follows its geometry settings. With it off, the new target is stored and the feed phases stay unchanged. The phasor inset continues to evaluate the fixed Georgia center.']
    },
    'gs-steer-lon':{
      title:'Electronic steering longitude',
      paragraphs:['Choose the east/west location used by automatic steering. With automatic steering enabled, moving this target changes the feed phases and geographic interference pattern. With it off, the new target is stored and the feed phases stay unchanged. The phasor inset continues to measure coherence at 32.7° N, 83.6° W.']
    },
    'gs-phase-x':{
      title:'Extra phase step X',
      paragraphs:['On a regular grid, add a systematic phase increment as you move one displayed column along +x. The ramp is centered on the array, so its middle index has zero extra phase. A phase gradient changes the directions in which waves reinforce.','The ramp adds to automatic steering and individual offsets. Zero leaves the existing solution unchanged. Grid intervals remain in place across removed sites. Optimal instead uses its saved fine-lattice x coordinate gx: extra phase is gxΔψX, measured per λ/2 interval from the saved origin.','For a uniform linear array, its total progressive phase obeys Δψ = −kd sin θ, with k = 2π/λ and θ a signed angle from broadside toward +x. An extra step shifts an existing pattern feature by Δu = −ΔψX/(kd), where u is its x direction cosine. Use radians and d = sλ/2 for regular grids or d = λ/2 for Optimal’s ramp. A shifted direction must be visible; wider regular spacing can produce multiple grating lobes.'],
      equation:'Regular grid: ψ(r,c) = ψauto(r,c) + (c − c₀)ΔψX + (r − r₀)ΔψY + δ(r,c), with c₀ = (C − 1)/2 and r₀ = (R − 1)/2. r and c are zero-based indices; R and C count rows and columns, and δ is the individual offset. Optimal adds gxΔψX + gyΔψY to its saved/retargeted phases. Controls display degrees.',
      example:'For a 5 × 5 grid, X = +30° and Y = 0° give −60°, −30°, 0°, +30°, +60° across every row. These are the additional ramp phases; the array dots show total feed phase.'
    },
    'gs-phase-y':{
      title:'Extra phase step Y',
      paragraphs:['On a regular grid, add a systematic phase increment as you move one displayed row along +y. The centered row index has zero extra phase. X and Y ramps together control two array-local directional coordinates.','Regular-grid spacing is d = sλ/2, with s the Lattice step. Empty sites retain their indices, so installed feeds two rows apart differ by twice the Y step. Optimal instead adds gyΔψY using the saved fine-lattice y coordinate gy, measured per λ/2 interval from its saved origin.','With the model’s positive propagation-phase convention, a Y ramp shifts a pattern feature’s y direction cosine v by −ΔψY/(kd), when that shifted direction is visible. Use radians and the spacing associated with the step: d = sλ/2 for a regular grid, d = λ/2 for Optimal’s fine lattice.'],
      equation:'Regular extra phase = (c − c₀)ΔψX + (r − r₀)ΔψY, with c₀ = (C − 1)/2 and r₀ = (R − 1)/2. Optimal extra phase = gxΔψX + gyΔψY. All terms use one angular unit.',
      example:'For five rows with Y = +30° and X = 0°, the added phases are −60°, −30°, 0°, +30°, +60° as the row index increases along +y.'
    },
    'gs-power':{
      title:'Total radiated power',
      paragraphs:['Set the array’s total radiated transmit power in dBW. The model first normalizes the complete forward radiation pattern, then applies this power in the free-space link. Raising power increases received levels and can cover more Georgia samples while increasing reception outside the state.','The normalized phasor diagram depends on geometry and relative phase. Changing transmit power leaves its angles and normalized mean unchanged.'],
      equation:'P(dBW) = 10 log₁₀(P in watts). A +3 dB change approximately doubles power.'
    },
    '[data-gs-fit]':{
      title:'Minimum power for sampled Georgia',
      paragraphs:['Adjust transmit power until the weakest visible Georgia sample reaches −80 dBm with a 0.05 dB numerical margin. This changes power while keeping the current array and phases.','The fit uses this coarse regional grid. A complete assignment design also needs the original raster and separate off-map checks. Some patterns cannot cover all samples within the control’s power range.']
    },
    'phasor':{
      title:'Read the phasor sum',
      paragraphs:['The horizontal and vertical crosshairs are the real and imaginary axes of a complex field. The circle frames this phase-plane display. Each pale ray is one installed feed’s unit-magnitude array-factor contribution at Georgia’s center, 32.7° N, 83.6° W. Its angle includes electronic feed phase and direction-dependent propagation phase. Overlapping rays can conceal their count; orange highlights the selected installed feed.','The teal arrow is the complex sum divided by N, the number of installed active elements. Its length ranges from 0 for cancellation to 1 for complete alignment. Its direction gives the resulting field’s phase angle in the complex plane. Geographic beam pointing is determined by how this sum varies across observation directions.','The project objective balances statewide coverage, reception outside Georgia and hardware count. A shaped design such as Optimal can use partial cancellation at the center while improving that whole-footprint tradeoff. Center coherence measures one direction; the figure of merit evaluates geographic coverage.','Changing the steering target leaves this inset’s observation point at Georgia’s center. Clicking a map sample changes its power readout while this observation point stays fixed. Automatic steering can compensate after physical rotation, preserving coherence at its chosen target. The inset shows the array factor; forward-pattern and Earth-visibility conditions still govern actual gain.'],
      equation:'Φₙ = ψₙ + k(xₙu + yₙv); Eₙ = exp(jΦₙ) = cos Φₙ + j sin Φₙ; Ē = ΣEₙ/N. Here k = 2π/λ, xₙ and yₙ are element positions, u and v are observation-ray direction cosines, ψₙ is feed phase and j² = −1.',
      example:'If |Ē| = 0.846, then |Ē|² ≈ 0.716: 71.6% of the perfectly aligned array-factor power for the same N equal-amplitude feeds. Absolute gain additionally uses the full-pattern power integral; received power also uses transmit power, range and receive gain.'
    },
    'optimal':{
      title:'Saved best-found reference',
      paragraphs:['Optimal restores the saved 175-element design, including its sparse positions, shaped feed phases, satellite geometry and radiated power. It is the best recorded original-raster search candidate; mathematical global optimality remains unproven.','The original-raster reference and this explorer’s coarse schematic map use different samples and boundaries. The coarse map can report different miss/spill counts, including misses, while the saved design meets the original Georgia raster requirement. Its center coherence also reflects deliberate beam shaping.','Editing phases, geometry, installed feeds or power creates a modified design. Compare its full original-raster coverage and off-map reception before judging an improvement to the assignment score.']
    },
    'feed-phase':{
      title:'Total feed phase',
      paragraphs:['This is the selected element’s applied electronic phase after automatic steering, X/Y ramps and its individual offset have been combined. Phases separated by 360° are equivalent. Array dots show this feed phase; the phasor inset additionally includes propagation phase toward its observation point.']
    },
    'fom':{
      title:'Regional sampled figure of merit',
      paragraphs:['The score combines installed hardware N, missed Georgia samples M and covered samples outside Georgia S. Each Georgia miss contributes 100 times the count penalty of one outside sample. The teaching score assumes W = 1 for a valid radiating model.','The full assignment uses its original pixels and model-correctness conditions. This coarse regional score helps compare the current teaching examples; a strong center-point phasor alone does not establish statewide coverage or control remote sidelobes.'],
      equation:'FoM = W / [√(N + 100) × (100M + S)].'
    },
    'coverage':{
      title:'Georgia covered',
      paragraphs:['This is the fraction of sampled Georgia locations with received power at or above −80 dBm. Each point uses its own array factor, visibility and slant range. The center-point phasor is one directional sample of that wider calculation.']
    },
    'spill':{
      title:'Outside reception',
      paragraphs:['Count the regional grid samples outside the schematic Georgia boundary whose received power reaches −80 dBm. This count changes as lobes move or transmit power changes. Whole-Earth sidelobe checks and physical covered area are separate calculations.']
    },
    'installed':{
      title:'Installed elements N',
      paragraphs:['N counts the actual installed feeds, all active with equal magnitude in this teaching model. Empty lattice positions contribute neither hardware count nor a field. Adding elements changes both the radiation pattern and the score’s √(N + 100) factor.']
    },
    'project-longitude':{
      title:'Illustrative GEO longitude',
      paragraphs:['Move the equatorial satellite relative to this geometry figure’s target at 33° N, 84° W. Slant range, ground look angles and the target’s array-local coordinates are recomputed. This figure has independent controls from Whole system.']
    },
    'project-normal':{
      title:'Illustrative aperture normal',
      paragraphs:['Choose a physical normal toward this figure’s target or toward Earth’s center. The target ray stays fixed while its coordinates relative to the aperture change. Electronic steering can aim a beam away from broadside.']
    },
    'project-rays':{
      title:'Transmit and look rays',
      paragraphs:['The satellite-to-target ray is used for the transmitted pattern. The reverse ground-to-satellite ray is used for the station’s look angles. The display can show either direction or both without changing the physical positions.']
    },
    'project-axes':{
      title:'Local coordinate axes',
      paragraphs:['Show the station’s east, north and up axes together with the aperture’s xA, yA and normal zA. Projecting the same ray into these different frames gives the coordinates appropriate to ground pointing or array steering.']
    },
    'project-steer':{
      title:'Target steering in the geometry figure',
      paragraphs:['Aim the illustrative beam toward the target by electronic phase control. With this setting off, the drawn beam stays broadside to the selected physical aperture. The satellite, target and ground look angles stay fixed.']
    },
    'project-phase':{
      title:'Feed ramp in the lattice figure',
      paragraphs:['Add this phase between neighboring x-index columns of the independent five-by-five patch. Its center site is empty. This figure uses a ramp starting at its first column and displays the sum of feed phasors at broadside.']
    },
    'project-frequency':{
      title:'Frequency and half-wave spacing',
      paragraphs:['Set frequency f in this independent lattice example. The wavelength is λ = c/f and the half-wave spacing is λ/2. The displayed phase-index ramp stays fixed while the physical wavelength and spacing scale together.']
    },
    'project-beamwidth':{
      title:'Schematic footprint width',
      paragraphs:['Change the width of the independent Gaussian teaching footprint in Fig. 7. A wider footprint can reduce Georgia misses while increasing outside reception. Whole system computes its footprint from actual coherent array-factor samples instead.']
    },
    'project-peak':{
      title:'Schematic peak received power',
      paragraphs:['Raise or lower the peak of Fig. 7’s independent Gaussian footprint relative to its −80 dBm threshold. This illustrates the threshold tradeoff while keeping the schematic width fixed.']
    },
    'project-array-path-phase-spacing':{
      title:'Two-element spacing',
      paragraphs:['Set separation d in wavelengths for the two-element example. Projected distance creates the propagation phase difference, so wider spacing changes how rapidly phase varies with observation angle.']
    },
    'project-array-path-phase-theta':{
      title:'Angle in the two-element example',
      paragraphs:['This θ is measured from the element-stack axis. Broadside is therefore 90° in this figure. The projected path difference is d cos θ.'],
      equation:'Relative phase = β + kd cos θ, where β is the second feed’s phase and k = 2π/λ.'
    },
    'project-array-path-phase-beta':{
      title:'Second-element feed phase',
      paragraphs:['Apply phase β electronically to the second element. It combines with the geometric path phase at the observer. Reinforcement occurs when their total relative phase is a multiple of 360°.']
    },
    'project-planar-array-nx':{
      title:'Planar elements along x',
      paragraphs:['Set the number of half-wavelength-spaced elements along x in this independent rectangular array. More x extent generally narrows the coherent peak along the corresponding angular coordinate.']
    },
    'project-planar-array-ny':{
      title:'Planar elements along y',
      paragraphs:['Set the number of half-wavelength-spaced elements along y in this independent rectangular array. The two aperture dimensions control the two angular widths of its pattern.']
    },
    'project-planar-array-u0':{
      title:'Steering direction cosine u₀',
      paragraphs:['Set the target ray’s component along aperture x. Together with v₀, this chooses an angular direction in the forward visible disk u² + v² ≤ 1. These are dimensionless local direction coordinates.']
    },
    'project-planar-array-v0':{
      title:'Steering direction cosine v₀',
      paragraphs:['Set the target ray’s component along aperture y. Linear feed-phase ramps align the rectangular array toward the chosen u₀, v₀ direction. The geographic conversion is handled separately in Whole system.']
    },
    'project-array-normalization-n':{
      title:'Elements in the normalization example',
      paragraphs:['Change the number of equal-amplitude feeds in this independent linear array. Both the directional field sum and the total angular radiation integral change, so absolute gain follows their ratio.']
    },
    'project-array-normalization-spacing':{
      title:'Spacing in the normalization example',
      paragraphs:['Set element spacing relative to wavelength. Spacing changes the pattern across angles, including sidelobes or grating lobes, and therefore enters the full-pattern normalization.']
    },
    'project-array-normalization-phase':{
      title:'Progressive phase in the normalization example',
      paragraphs:['Add phase β from one element to the next. This steers the coherent addition and redistributes directional power. The angular integral provides the total-power reference for the resulting directivity.']
    },
    'project-array-normalization-eta':{
      title:'Radiation efficiency',
      paragraphs:['Set the fraction η of accepted power that becomes radiated power. Directivity describes the angular concentration; gain relative to accepted power is G = ηD. Lower efficiency sends less accepted power into radiation.']
    },
    'project-array-normalization-watts':{
      title:'Accepted power',
      paragraphs:['Set the watts accepted by this illustrative antenna. Radiation efficiency converts this into radiated watts. Increasing this power scales the absolute intensity while leaving the normalized pattern’s directivity unchanged.']
    },
    'project-link-budget-pt':{
      title:'Transmitter power in the link ledger',
      paragraphs:['Set transmitter power in dBW, referenced to 1 W. The ledger combines it with directional transmit gain, free-space spreading, receive gain and the listed losses to obtain received carrier power.']
    },
    'project-link-budget-gt':{
      title:'Directional transmit gain',
      paragraphs:['Set antenna gain toward the receiver in dBi, referenced to an isotropic radiator. Transmit power plus transmit gain gives EIRP in dBW for this link.']
    },
    'project-link-budget-gr':{
      title:'Receive antenna gain',
      paragraphs:['Set receive gain toward the transmitter in dBi. Greater gain provides a larger effective collecting aperture at the same frequency and increases the received carrier power.']
    },
    'project-link-budget-range':{
      title:'Slant range',
      paragraphs:['Set the straight-line transmitter-to-receiver distance. Free-space received power falls as 1/R² at fixed gains and frequency; doubling R adds about 6 dB of path loss.']
    },
    'project-link-budget-freq':{
      title:'Frequency in the link ledger',
      paragraphs:['Set the carrier frequency and hence λ = c/f. At fixed antenna gains and range, free-space path loss increases with frequency. A fixed physical antenna aperture has a frequency-dependent gain, which would need a separate linked model.']
    },
    'project-link-budget-loss':{
      title:'Other link losses',
      paragraphs:['Subtract the listed additional loss in dB from carrier power. This is a lumped allowance for effects beyond the displayed ideal free-space spreading and directional antenna gains.']
    },
    'project-link-budget-temp':{
      title:'System noise temperature',
      paragraphs:['Set equivalent system noise temperature T in kelvin. Thermal noise spectral density is N₀ = kBT in watts per hertz. Increasing T lowers C/N₀ and Eb/N₀ for the same received carrier and information rate.']
    },
    'project-link-budget-rate':{
      title:'Information bit rate',
      paragraphs:['Set information bit rate Rb. At fixed carrier power and noise density, a higher rate provides less energy per information bit.'],
      equation:'Eb/N₀ = C/N₀ − 10 log₁₀(Rb), using C/N₀ in dB-Hz and Rb in bits/s.'
    },
    '[data-hint]':{
      title:'Practice hint',
      paragraphs:['Reveal a short cue for the nearby practice question while keeping its worked comparison separate.']
    },
    '[data-compare]':{
      title:'Compare your reasoning',
      paragraphs:['After writing an attempt, open the nearby explanation and compare its physical reasoning with yours. Simulator settings remain unchanged.']
    }
  };
  for(const entry of Object.values(help)){
    Object.freeze(entry.paragraphs);
    Object.freeze(entry);
  }
  root.GeorgiaHelp=Object.freeze(help);
})();
