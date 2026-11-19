"""Publish reviewed study chapters beside their related interactive topics."""
from pathlib import Path
import html
import json
import re
import shutil

COURSE = '/courses/gt/ece6390/'
READING = {
 'exam-1': {
  'orbits': ['kepler-ellipse','geo-frames','solar-pressure-components','numerical-orbits','hohmann-transfer','orbit-types'],
  'look-angles': ['look-triangle','azimuth-components'],
  'spacecraft': ['eclipse-battery','solar-array','rocket-mass','electric-propulsion','thermal-balance','radiation-redundancy'],
  'waves': ['divergence-curl','standing-wave','plane-wave','polarization','phasor-interference','double-curl','displacement-current','helmholtz-curvature'],
  'antennas': ['dipole-pattern','gain-references','solid-angle'],
  'radio': ['db-distance','link-budget','receiver-noise','doppler-shift','rain-path','bandwidth-noise','free-space-flux'],
 },
 'exam-2': {
  'apertures': ['aperture-phasors','circular-aperture','dish-gain','reflector-screens'],
  'arrays': ['array-multiplication','array-path-phase','planar-array','beamforming-frontends'],
  'link': ['array-footprint','array-normalization'],
  'digital': ['sampling-alias','quantization-pcm','source-compression'],
  'pulses': ['nyquist-pulse','rectangular-pulse-spectrum','matched-filter'],
  'modulation': ['iq-constellation','rate-bandwidth','adaptive-modcod','ofdm-multipath','modem-chain'],
  'advanced-digital': ['broadcast-constellations','dvbs2-chain','amplifier-backoff'],
  'detection': ['energy-per-bit','bpsk-detection','qam-error-probability'],
  'coding': ['product-parity','block-code-distance','convolutional-code','iterative-decoding','ldpc-constraints','soft-decisions'],
  'navigation': ['gnss-orbits','doppler-pass','pseudorange-clock','gnss-geometry','pn-correlation','lfsr-code','processing-gain','gnss-error-budget','navigation-frames','near-far','dual-frequency','gnss-acquisition','gnss-dop-3d'],
 },
}
# Stable figure labels lead a learner straight to the matching explanation.
READING_FIGURES = {
 'kepler-ellipse':'fig:e1-orbit-ellipse','geo-frames':'fig:e1-orbit-groundtracks',
 'solar-pressure-components':'fig:e1-orbit-srp','numerical-orbits':'fig:e1-orbit-numerical',
 'hohmann-transfer':'fig:e1-orbit-transfer','orbit-types':'fig:e1-orbit-families',
 'look-triangle':'fig:e1-look-triangle','azimuth-components':'fig:e1-look-bearing',
 'eclipse-battery':'fig:e1-systems-eclipse','solar-array':'fig:e1-systems-solar',
 'rocket-mass':'fig:e1-systems-rocket','electric-propulsion':'fig:e1-systems-electric',
 'thermal-balance':'fig:e1-systems-thermal','radiation-redundancy':'fig:e1-systems-radiation',
 'divergence-curl':'fig:e1-wave-maxwell','standing-wave':'fig:e1-wave-doublecurl',
 'plane-wave':'fig:e1-wave-plane','polarization':'fig:e1-wave-polarization',
 'phasor-interference':'fig:e1-wave-phasor','double-curl':'fig:e1-wave-doublecurl',
 'displacement-current':'fig:e1-wave-maxwell','helmholtz-curvature':'fig:e1-wave-doublecurl',
 'dipole-pattern':'fig:e1-ant-pattern3d','gain-references':'fig:e1-ant-losses',
 'solid-angle':'fig:e1-ant-directivity','db-distance':'fig:e1-rf-rangefrequency',
 'link-budget':'fig:e1-rf-budget','receiver-noise':'fig:e1-rf-noise',
 'doppler-shift':'fig:e1-rf-doppler','rain-path':'fig:e1-rf-rain',
 'bandwidth-noise':'fig:e1-rf-noise','free-space-flux':'fig:e1-rf-link',
 'aperture-phasors':'fig:aperturepaths','circular-aperture':'fig:disk',
 'dish-gain':'fig:dish','reflector-screens':'fig:dish-spillover',
 'array-multiplication':'fig:arr-element','array-path-phase':'fig:arr-steering',
 'planar-array':'fig:arr-planar','beamforming-frontends':'fig:arr-feed-controls',
 'array-footprint':'fig:arr-workflow','array-normalization':'fig:arr-normal',
 'sampling-alias':'fig:rep-folding','quantization-pcm':'fig:rep-quantizer',
 'source-compression':'fig:rep-compression','nyquist-pulse':'fig:rep-rolloff',
 'rectangular-pulse-spectrum':'fig:rep-rectangular','matched-filter':'fig:rep-matched',
 'iq-constellation':'fig:mod-iq','rate-bandwidth':'fig:mod-rates',
 'adaptive-modcod':'fig:mod-adaptation','ofdm-multipath':'fig:mod-ofdm',
 'modem-chain':'fig:mod-chain','broadcast-constellations':'fig:vid789-constellations',
 'dvbs2-chain':'fig:vid789-dvbs2-chain','amplifier-backoff':'fig:vid789-amplifier',
 'energy-per-bit':'fig:vid789-ber-energy','bpsk-detection':'fig:vid789-bpsk-tail',
 'qam-error-probability':'fig:vid789-qam-errors','product-parity':'fig:vid789-parity-product',
 'block-code-distance':'fig:vid789-codebook','convolutional-code':'fig:vid789-convolutional',
 'iterative-decoding':'fig:vid789-iterative-code','ldpc-constraints':'fig:vid789-ldpc-graph',
 'soft-decisions':'fig:vid789-soft-decisions','gnss-orbits':'fig:nav-purpose',
 'doppler-pass':'fig:nav-doppler','pseudorange-clock':'fig:nav-clock',
 'gnss-geometry':'fig:nav-circles','pn-correlation':'fig:nav-correlation',
 'lfsr-code':'fig:nav-lfsr','processing-gain':'fig:nav-processing-bandwidth',
 'gnss-error-budget':'fig:nav-error-budget','navigation-frames':'fig:nav-ecef',
 'near-far':'fig:nav-near-far','dual-frequency':'fig:nav-ionosphere',
 'gnss-acquisition':'fig:audit-nav-acquisition','gnss-dop-3d':'fig:audit-nav-sky-dop',
}
QUESTIONS = {
 'orbits': ('Two satellites have the same semi-major axis but different eccentricities. Which properties must match, and which can differ?', 'Separate the period and specific energy from the instantaneous speed and endpoint radii.', 'In the same two-body central field, period and specific orbital energy depend on semi-major axis and match. Perigee/apogee radii, angular momentum, instantaneous speeds and time spent at a given radius can differ.'),
 'look-angles': ('A satellite lies below the local horizon. What should its signed elevation show, and which part of the geometry determines that sign?', 'Project the station-to-satellite ray onto local up.', 'The elevation is negative because the viewing ray has a negative local-up component. In atan2(up, horizontal magnitude), the denominator is nonnegative and the numerator retains the horizon sign.'),
 'spacecraft': ('Why can a solar array that supplies the sunlit load still fail the full-orbit energy budget?', 'Include the eclipse load and the finite recharge interval.', 'Sunlit generation must supply the live load and replace energy spent in eclipse, including conversion losses and the stated end-of-life margin. Matching only the instantaneous sunlit load leaves no recharge energy.'),
 'waves': ('Two equal fields arrive with opposite phase. What should you add first to predict the received power?', 'A field has amplitude and phase; power is quadratic.', 'Add the complex field amplitudes with their polarizations and phases, then compute the power from the combined field. Opposite coherent contributions can cancel even though either field alone carries power.'),
 'antennas': ('An antenna keeps the same normalized radiation shape but its radiation efficiency falls. Which of directivity, gain and realized gain must change?', 'Keep pattern normalization, radiation loss and input mismatch separate.', 'Directivity stays fixed if the complete pattern shape is unchanged. Gain falls with radiation efficiency. Realized gain also includes mismatch, so it falls by the efficiency change if mismatch is held fixed.'),
 'radio': ('Double the range while keeping frequency, power, gains and excess losses fixed. How do received power and free-space path loss change?', 'Use the inverse-square range dependence and 20 log10 of the range ratio.', 'Received power becomes one quarter, about 6.02 dB lower. Free-space path loss increases by about 6.02 dB. Receiver noise is unchanged if its temperature and equivalent bandwidth are unchanged.'),
 'apertures': ('At fixed wavelength, what does a wider uniformly illuminated aperture tend to do to its main beam?', 'Connect transverse phase variation with angular cancellation.', 'A larger aperture makes the main beam narrower and increases ideal directivity. The detailed sidelobes depend on aperture shape and illumination; adding taper changes that tradeoff.'),
 'arrays': ('Why must fields be added before normalizing an array power pattern?', 'The relative phases create cross terms.', 'Each feed contributes a complex field. Squaring the magnitude of their sum includes constructive and destructive cross terms. Summing element powers first would discard the interference that forms the beam.'),
 'link': ('Why does a beam maximum over Georgia alone fail to establish full coverage?', 'A link requirement applies at every specified receiving location.', 'Coverage requires the received-power calculation at every evaluated location, including antenna gain in that direction, range and receiver assumptions. A peak says little about the weakest location or spill outside the target.'),
 'digital': ('What changes when you increase sampling rate, quantization bits, or compression, one at a time?', 'These knobs act on time selection, amplitude labels and description length.', 'Sampling rate changes recorded observations per second; quantization bits change the allowed amplitude resolution and raw bits per sample; compression changes how efficiently the recorded information is represented. Their effects on rate and distortion are different.'),
 'pulses': ('How can pulses overlap in time while their symbols remain separable?', 'Look at the combined response at decision times.', 'The combined transmitter, channel and receiver response can have zero contributions from other symbols at the selected sample times. The pulses may overlap between those instants; timing error or channel distortion can disturb that zero-ISI condition.'),
 'modulation': ('Keep symbol rate fixed and change QPSK to 16-QAM. What rate changes, and what energy definition is needed for a fair error comparison?', 'Count coded bits per symbol, then identify what is held fixed.', 'Mapped coded-bit rate doubles from two to four bits per symbol. Compare error performance at a declared common symbol energy or bit energy, and state code rate and overhead before claiming a change in useful information rate.'),
 'advanced-digital': ('At fixed channel width, predict the separate effects of lower rolloff and lower code rate.', 'One affects symbol packing; the other affects information bits per coded bit.', 'In the stated raised-cosine model, lower rolloff permits a larger symbol rate. Lower code rate puts more redundancy into each information bit and reduces useful throughput at a fixed physical symbol rate; reliability depends on the supported code and decoder.'),
 'detection': ('Why can QPSK match BPSK BER at equal energy per bit but differ at equal energy per symbol?', 'QPSK carries two bits in one symbol.', 'Ideal coherent Gray QPSK has two independent BPSK coordinates. At equal bit energy they have equal decision distance relative to noise. At equal symbol energy, QPSK allocates half as much energy to each bit.'),
 'coding': ('Does adding the same number of redundancy bits guarantee the same error-correction performance?', 'Consider codeword spacing and the decoder.', 'Performance depends on code structure, distance, block or memory length, decoder metrics and channel assumptions, as well as rate. Equal redundancy alone does not fix these properties.'),
 'navigation': ('Why does an accurate receiver clock estimate still require suitable satellite geometry for an accurate position?', 'Each range constrains position mainly along one viewing direction.', 'The receiver solves position and clock together. Nearly parallel viewing directions leave some displacement components weakly constrained, so measurement errors can produce a large position uncertainty even when clock estimation is included.'),
}


def build_study_pages(root, csp, courses, page, relative, practice, index):
    source = root/'src/study-narratives.json'
    if not source.exists():
        return {'overview':'','search':[]}
    books=json.loads(source.read_text());dest=root/'dist'
    shutil.copytree(root/'src/narrative-figures',dest/'assets/narratives',dirs_exist_ok=True)
    shutil.copyfile(root/'src/narratives.css',dest/'assets/narratives.css')
    topic_lookup={x['route'].rstrip('/').split('/')[-1]:x for x in index if x['course']=='gt/ece6390'}
    overview=[];search=[];related={}
    for book in books:
        overview_file='courses/gt/ece6390/study/'+book['id']+'/index.html'
        overview_route='/'+overview_file.removesuffix('index.html')
        chapter_links=[]
        for at,chapter in enumerate(book['chapters']):
            file=chapter['route'].lstrip('/')+'index.html'
            def links(match):
                name,value=match[1],html.unescape(match[2])
                if value.startswith('/'):
                    value=relative(file,value)
                return name+'="'+html.escape(value,quote=True)+'"'
            content=re.sub(r'\b(href|src)="([^"]*)"',links,chapter['html'])
            topic_ids=READING.get(book['id'],{}).get(chapter['slug'],[])
            experiments=[]
            for ident in topic_ids:
                assert ident in topic_lookup, 'Reading links missing topic '+ident
                topic=topic_lookup[ident]
                experiments.append('<li><a href="'+relative(file,topic['route'])+'">'+html.escape(topic['title'])+'</a></li>')
                figure = READING_FIGURES[ident]
                fragment = re.search(r'<figure class="narrative-figure" id="'+re.escape(figure)+r'">.*?<figcaption><strong>Fig\. ([^.]+)\.</strong>', chapter['html'], re.S)
                assert fragment, 'Reading figure absent from chapter: '+ident+' / '+figure
                related.setdefault(ident,[]).append((book['title']+': '+chapter['title']+', Fig. '+fragment[1],chapter['route']+'#'+figure))
            if experiments:
                content+='<section class="study-experiments"><h2>Explore the figures</h2><ul class="study-links">'+''.join(experiments)+'</ul></section>'
            question=QUESTIONS.get(chapter['slug'],QUESTIONS['radio'])
            content+=practice('ece6390-'+book['id']+'-'+chapter['slug'],[dict(zip(('prompt','hint','answer'),question))])
            sequence=[]
            if at:
                prev=book['chapters'][at-1]
                sequence.append('<a rel="prev" href="'+relative(file,prev['route'])+'">← '+html.escape(prev['title'])+'</a>')
            if at+1<len(book['chapters']):
                nxt=book['chapters'][at+1]
                sequence.append('<a rel="next" href="'+relative(file,nxt['route'])+'">'+html.escape(nxt['title'])+' →</a>')
            body=('<main id="main" class="study-page"><p class="topic-breadcrumb"><a href="'+relative(file,COURSE)+'">ECE 6390</a> / <a href="../">'+book['title']+'</a></p>'
                  '<h1 id="'+chapter['label']+'">'+html.escape(chapter['title'])+'</h1>'+content+
                  '<nav class="topic-sequence" aria-label="Reading sequence">'+''.join(sequence)+'</nav></main>')
            assets='<link rel="stylesheet" href="'+relative(file,'/assets/narratives.css')+'"><script src="'+relative(file,'/assets/topic-practice.js')+'" defer></script><script src="'+relative(file,'/assets/figure-viewer.js')+'" defer></script>'
            out=dest/file;out.parent.mkdir(parents=True,exist_ok=True)
            out.write_text(page(file,chapter['title'],body,csp,courses,'gt/ece6390',extra=assets))
            chapter_links.append('<li><a href="'+relative(overview_file,chapter['route'])+'">'+html.escape(chapter['title'])+'</a></li>')
            search.append({'title':book['title']+': '+chapter['title'],'course':'gt/ece6390','code':'ECE 6390','group':'Study narrative','route':chapter['route'],'text':chapter['title']})
        body=('<main id="main" class="study-page"><p class="topic-breadcrumb"><a href="../../">ECE 6390</a></p><h1>'+book['title']+'</h1><p class="study-summary">'+html.escape(book['description'])+'</p>'
              '<section><h2>Reading sequence</h2><ol class="study-chapters">'+''.join(chapter_links)+'</ol></section></main>')
        extra='<link rel="stylesheet" href="'+relative(overview_file,'/assets/narratives.css')+'">'
        out=dest/overview_file;out.parent.mkdir(parents=True,exist_ok=True)
        out.write_text(page(overview_file,book['title']+' study narrative',body,csp,courses,'gt/ece6390',extra=extra))
        overview.append('<li><a href="study/'+book['id']+'/"><strong>'+book['title']+'</strong><span>'+html.escape(book['description'])+'</span></a></li>')
        search.append({'title':book['title']+' study narrative','course':'gt/ece6390','code':'ECE 6390','group':'Study narrative','route':overview_route,'text':book['description']})
    for ident,reading in related.items():
        file=dest/'courses/gt/ece6390/topics'/ident/'index.html'
        assert file.exists()
        rel=file.relative_to(dest).as_posix()
        section='<section class="topic-reading"><h2>Read the connected explanation</h2><ul>'+''.join('<li><a href="'+relative(rel,target)+'">'+html.escape(title)+'</a></li>' for title,target in reading)+'</ul></section>'
        text=file.read_text()
        assert '<section class="topic-reading practice"' in text
        text=text.replace('<section class="topic-reading practice"',section+'<section class="topic-reading practice"',1)
        file.write_text(text)
    return {'overview':'<section class="study-overviews"><h2>Study narratives</h2><ul class="study-cards">'+''.join(overview)+'</ul></section>','search':search}
