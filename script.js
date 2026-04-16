/* ============================================
   SBOBINO — Showcase Website Scripts
   Space-travel scroll animation + Lightbox
   ============================================ */

(function () {
  'use strict';

  /* ------------------------------------------------
     Reduced motion check
     ------------------------------------------------ */
  const prefersReducedMotion =
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------
     1. Mobile menu
     ------------------------------------------------ */
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('nav-links');

  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      nav.classList.toggle('open', !open);
    });
    nav.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        toggle.setAttribute('aria-expanded', 'false');
        nav.classList.remove('open');
      });
    });
  }

  /* ------------------------------------------------
     2. Smooth scroll for anchor links
     ------------------------------------------------ */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const id = this.getAttribute('href');
      if (id === '#') return;
      const target = document.querySelector(id);
      if (target) {
        e.preventDefault();
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.pushState(null, '', id);
      }
    });
  });

  /* ------------------------------------------------
     3. Header class on scroll
     ------------------------------------------------ */
  const header = document.querySelector('.site-header');
  if (header) {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', window.scrollY > 40);
          ticking = false;
        });
        ticking = true;
      }
    });
  }

  /* ------------------------------------------------
     4. Starfield canvas + Orbital Transfer system
     ------------------------------------------------ */
  const canvas = document.getElementById('starfield');
  if (canvas && !prefersReducedMotion) {
    const ctx = canvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let W, H;
    const STAR_COUNT = 320;
    const stars = [];

    // Scroll tracking
    let scrollY = 0;
    let prevScrollY = 0;
    let smoothScrollSpeed = 0;

    // Space layer for nebula hue-rotate
    const spaceLayer = document.querySelector('.space-layer');

    // Orbital transfer — section configs
    const sectionEls = document.querySelectorAll('.hero, #demo, #features, #screens, #workflow, #audience, #desktop, #cta');
    const sectionConfigs = [
      { driftAngle: 0,   nebulaHue: 0,   rotation: 0   },  // hero
      { driftAngle: -8,  nebulaHue: 15,  rotation: -1  },  // demo
      { driftAngle: 15,  nebulaHue: -10, rotation: 2   },  // features
      { driftAngle: -20, nebulaHue: 20,  rotation: -3  },  // screens
      { driftAngle: 10,  nebulaHue: -15, rotation: 4   },  // workflow
      { driftAngle: -12, nebulaHue: 10,  rotation: -2  },  // audience
      { driftAngle: 8,   nebulaHue: -5,  rotation: 1   },  // desktop
      { driftAngle: 0,   nebulaHue: 0,   rotation: 0   },  // cta
    ];

    // Smoothed orbital transfer state
    let currentDriftAngle = 0;
    let currentRotation = 0;
    let currentNebulaHue = 0;
    let transitionIntensity = 0; // 0–1, how "mid-transfer" we are

    function lerp(a, b, t) { return a + (b - a) * t; }
    function smoothstep(t) { return t * t * (3 - 2 * t); }

    function resize() {
      W = window.innerWidth;
      H = window.innerHeight;
      canvas.width = W * dpr;
      canvas.height = H * dpr;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }

    function makeStar(yOverride) {
      return {
        x: Math.random() * W,
        y: yOverride !== undefined ? yOverride : Math.random() * H,
        z: Math.random(),
        baseSize: 0.4 + Math.random() * 1.6,
        brightness: 0.3 + Math.random() * 0.7,
        twinkleOffset: Math.random() * Math.PI * 2,
        color: pickStarColor(),
        driftAccum: 0,  // accumulated lateral drift
      };
    }

    function pickStarColor() {
      const r = Math.random();
      if (r < 0.6)  return [230, 235, 255];
      if (r < 0.78) return [255, 240, 200];
      if (r < 0.9)  return [200, 210, 255];
      return [255, 200, 180];
    }

    function initStars() {
      stars.length = 0;
      for (let i = 0; i < STAR_COUNT; i++) stars.push(makeStar());
    }

    // Warp vignette
    const warpEl = document.getElementById('warp-vignette');

    // Scroll listener
    window.addEventListener('scroll', () => { scrollY = window.scrollY; }, { passive: true });

    // Section progress detection
    function getSectionProgress() {
      const sy = window.scrollY + window.innerHeight * 0.4;
      let currentIdx = 0;
      let progress = 0;

      for (let i = 0; i < sectionEls.length; i++) {
        const top = sectionEls[i].offsetTop;
        const next = i + 1 < sectionEls.length
          ? sectionEls[i + 1].offsetTop
          : document.documentElement.scrollHeight;
        if (sy >= top && sy < next) {
          currentIdx = i;
          progress = (sy - top) / (next - top);
          break;
        } else if (sy >= next && i === sectionEls.length - 1) {
          currentIdx = i;
          progress = 1;
        }
      }

      return { index: currentIdx, progress: Math.max(0, Math.min(1, progress)) };
    }

    // ---- Render loop ----
    let lastTime = 0;
    function frame(time) {
      const dt = Math.min((time - lastTime) / 16.667, 3);
      lastTime = time;

      // Scroll speed
      const rawSpeed = scrollY - prevScrollY;
      prevScrollY = scrollY;
      smoothScrollSpeed += (Math.abs(rawSpeed) - smoothScrollSpeed) * 0.12;

      // --- Orbital transfer calculations ---
      const { index, progress } = getSectionProgress();
      const curr = sectionConfigs[Math.min(index, sectionConfigs.length - 1)];
      const next = sectionConfigs[Math.min(index + 1, sectionConfigs.length - 1)];
      const t_smooth = smoothstep(progress);

      // Target values for this scroll position
      const targetDrift = lerp(curr.driftAngle, next.driftAngle, t_smooth);
      const targetRotation = lerp(curr.rotation, next.rotation, t_smooth);
      const targetNebulaHue = lerp(curr.nebulaHue, next.nebulaHue, t_smooth);

      // Smooth towards targets
      currentDriftAngle += (targetDrift - currentDriftAngle) * 0.06 * dt;
      currentRotation += (targetRotation - currentRotation) * 0.06 * dt;
      currentNebulaHue += (targetNebulaHue - currentNebulaHue) * 0.06 * dt;

      // Transition intensity: peaks between sections (progress near 0.5), fades at section centers
      const distFromCenter = Math.abs(progress - 0.5) * 2; // 0 at midpoint, 1 at edges
      transitionIntensity += ((1 - distFromCenter) - transitionIntensity) * 0.08 * dt;

      // Warp intensity with orbital transfer amplification
      const baseWarp = Math.min(smoothScrollSpeed / 60, 1);
      const warpIntensity = Math.min(baseWarp * (1 + transitionIntensity * 0.3), 1);

      // Apply canvas rotation
      canvas.style.transform = `rotate(${currentRotation}deg)`;

      // Apply nebula hue-rotate to space layer
      if (spaceLayer) {
        spaceLayer.style.filter = `hue-rotate(${currentNebulaHue}deg)`;
        // Subtle parallax shift for nebulae (less than stars = depth illusion)
        spaceLayer.style.transform = `translateX(${currentDriftAngle * 0.3}px)`;
      }

      // Warp vignette
      if (warpEl) {
        if (warpIntensity > 0.15 || transitionIntensity > 0.3) {
          warpEl.classList.add('active');
          const vignetteOpacity = Math.max(warpIntensity * 0.7, transitionIntensity * 0.05);
          warpEl.style.opacity = Math.min(vignetteOpacity, 0.8);
        } else {
          warpEl.classList.remove('active');
        }
      }

      // Clear
      ctx.clearRect(0, 0, W, H);

      // Time for twinkle
      const tTime = time * 0.001;

      // Drift velocity in px/frame from the current drift angle
      const driftRad = (currentDriftAngle * Math.PI) / 180;
      const driftVx = Math.sin(driftRad) * 0.8;

      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];

        // Accumulate lateral drift (near stars drift more)
        s.driftAccum += driftVx * (0.3 + s.z * 0.7) * dt;
        // Wrap horizontally
        let xPos = ((s.x + s.driftAccum) % (W + 40) + W + 40) % (W + 40) - 20;

        // Parallax vertical movement
        const parallaxFactor = 0.03 + s.z * 0.12;
        const yPos = ((s.y - scrollY * parallaxFactor) % (H + 40) + H + 40) % (H + 40) - 20;

        // Twinkle — boosted during orbital transfer
        const twinkleSpeed = (1.5 + s.z * 2) * (1 + transitionIntensity * 0.5);
        const twinkle = 0.6 + 0.4 * Math.sin(tTime * twinkleSpeed + s.twinkleOffset);
        const alpha = s.brightness * twinkle;

        // Size
        const size = s.baseSize * (0.8 + s.z * 0.6) * (1 + warpIntensity * s.z * 0.5);

        // Warp stretch
        const stretch = 1 + warpIntensity * s.z * 8;

        const [cr, cg, cb] = s.color;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${cr},${cg},${cb})`;

        if (stretch > 1.3) {
          const trailLen = size * stretch;
          ctx.beginPath();
          ctx.moveTo(xPos, yPos - trailLen / 2);
          ctx.lineTo(xPos + size * 0.5, yPos);
          ctx.lineTo(xPos, yPos + trailLen / 2);
          ctx.lineTo(xPos - size * 0.5, yPos);
          ctx.closePath();
          ctx.fill();

          if (s.z > 0.6 && warpIntensity > 0.3) {
            ctx.globalAlpha = alpha * 0.3;
            ctx.shadowBlur = 6;
            ctx.shadowColor = `rgba(${cr},${cg},${cb},0.5)`;
            ctx.fill();
          }
        } else {
          ctx.beginPath();
          ctx.arc(xPos, yPos, size, 0, Math.PI * 2);
          ctx.fill();

          if (s.z > 0.8 && alpha > 0.6) {
            ctx.globalAlpha = alpha * 0.15;
            ctx.beginPath();
            ctx.arc(xPos, yPos, size * 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }

        ctx.restore();
      }

      // Occasional shooting star
      drawShootingStar(ctx, tTime, W, H, warpIntensity);

      requestAnimationFrame(frame);
    }

    // ---- Shooting stars ----
    let shootingStar = null;

    function drawShootingStar(ctx, t, w, h, warp) {
      const spawnChance = 0.001 + warp * 0.004;
      if (!shootingStar && Math.random() < spawnChance) {
        const angle = -0.3 - Math.random() * 0.5;
        shootingStar = {
          x: w * 0.3 + Math.random() * w * 0.7,
          y: Math.random() * h * 0.4,
          vx: Math.cos(angle) * (4 + Math.random() * 4),
          vy: Math.sin(angle) * -(4 + Math.random() * 4),
          life: 1,
          length: 40 + Math.random() * 60,
        };
      }

      if (shootingStar) {
        const ss = shootingStar;
        ss.x += ss.vx;
        ss.y -= ss.vy;
        ss.life -= 0.015;

        if (ss.life <= 0 || ss.x < -100 || ss.y > h + 100) {
          shootingStar = null;
          return;
        }

        ctx.save();
        const grad = ctx.createLinearGradient(
          ss.x, ss.y,
          ss.x - ss.vx * ss.length * 0.3,
          ss.y + ss.vy * ss.length * 0.3
        );
        grad.addColorStop(0, `rgba(255,255,255,${ss.life * 0.9})`);
        grad.addColorStop(1, 'rgba(255,255,255,0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(ss.x, ss.y);
        ctx.lineTo(
          ss.x - ss.vx * ss.length * 0.3,
          ss.y + ss.vy * ss.length * 0.3
        );
        ctx.stroke();

        ctx.globalAlpha = ss.life;
        ctx.fillStyle = '#fff';
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 1.5, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }
    }

    // Init
    resize();
    initStars();
    requestAnimationFrame(frame);

    // Debounced resize
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        resize();
        initStars();
      }, 200);
    });
  }

  /* ------------------------------------------------
     5. Showcase entrance animations (IntersectionObserver)
     ------------------------------------------------ */
  if (!prefersReducedMotion) {
    const showcaseObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('in-view');
          showcaseObserver.unobserve(entry.target); // fire once
        }
      });
    }, { threshold: 0.15 });

    document.querySelectorAll(
      '.showcase-frame-enter, .showcase-text-enter, .showcase-card-enter'
    ).forEach(el => showcaseObserver.observe(el));
  }

  /* ------------------------------------------------
     6. Lightbox for screenshots
     ------------------------------------------------ */
  const lightbox = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCaption = document.getElementById('lightbox-caption');
  const lbClose = lightbox ? lightbox.querySelector('.lightbox-close') : null;

  if (lightbox) {
    // Collect all clickable images (mac frames + hero screenshot)
    const clickableImgs = document.querySelectorAll('.mac-frame img, .mac-frame-sm img, .screenshot-frame img, .hero-screenshot img');

    clickableImgs.forEach(img => {
      img.addEventListener('click', () => {
        lbImg.src = img.src;
        lbImg.alt = img.alt;
        lbCaption.textContent = img.alt || '';
        lightbox.classList.add('open');
        document.body.style.overflow = 'hidden';
      });
    });

    function closeLightbox() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }

    if (lbClose) lbClose.addEventListener('click', closeLightbox);

    lightbox.addEventListener('click', (e) => {
      if (e.target === lightbox) closeLightbox();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && lightbox.classList.contains('open')) {
        closeLightbox();
      }
    });
  }

  /* ------------------------------------------------
     7. Interactive transcription demo
     ------------------------------------------------ */
  // Word-level timestamps from Whisper (base model, word_timestamps=True)
  // Text corrected to match the official transcript provided by the user
  const DEMO_TRANSCRIPT = {
    audioSrc: 'assets/demo-audio.mp3',
    summary: 'The Artemis\u00a0II crew proposes naming two lunar craters: \u201cIntegrity,\u201d located on the far side near Ohm, and \u201cCarroll\u201d (C\u2011A\u2011R\u2011R\u2011O\u2011L\u2011L), on the nearside\u2011farside boundary northwest of Glushko \u2014 named in memory of Carol, a loved one from the astronaut family. Houston acknowledges the proposal.',
    segments: [
      { speaker: 1, speakerLabel: 'Integrity', startTime: 0, words: [
        {text:'line',time:0.46},{text:'straight',time:1.0},{text:'up',time:1.28},{text:'to',time:1.5},{text:'Ohm',time:1.74},{text:'on',time:2.24},{text:'the',time:2.54},{text:'far',time:2.66},{text:'side,',time:2.86},{text:'relatively',time:3.88},{text:'in',time:4.3},{text:'the',time:4.58},{text:'middle',time:4.64},{text:'is',time:4.92},{text:'an',time:5.32},{text:'unnamed',time:5.5},{text:'crater',time:5.76},{text:'and',time:6.0},{text:'we',time:6.1}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 6, words: [
        {text:'would',time:6.62},{text:'like',time:6.82},{text:'to',time:6.98},{text:'suggest',time:7.12},{text:'it',time:7.28},{text:'be',time:7.56},{text:'called',time:7.78},{text:'Integrity',time:7.92},{text:'in',time:8.66},{text:'the',time:9.02},{text:'future.',time:9.12}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 13, words: [
        {text:'And',time:13.52},{text:'the',time:14.08},{text:'second',time:14.64},{text:'one,',time:14.94},{text:'and',time:15.58},{text:'especially',time:15.78},{text:'meaningful',time:16.3},{text:'for',time:16.66},{text:'this',time:17.04},{text:'crew,',time:17.22},{text:'is',time:18.36},{text:'a',time:18.6},{text:'number',time:19.0},{text:'of',time:19.24},{text:'years',time:19.4},{text:'ago',time:19.56},{text:'we',time:19.92}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 19, words: [
        {text:'started',time:20.16},{text:'this',time:20.42},{text:'journey',time:20.7},{text:'in',time:21.04},{text:'our',time:21.44},{text:'close-knit',time:21.72},{text:'astronaut',time:22.2},{text:'family',time:22.48},{text:'and',time:22.94},{text:'we',time:23.88},{text:'lost',time:24.26},{text:'a',time:24.4},{text:'loved',time:24.64},{text:'one.',time:24.84}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 26, words: [
        {text:'And',time:26.56},{text:"there's",time:26.74},{text:'a',time:26.98},{text:'feature',time:27.18},{text:'in',time:28.02},{text:'a',time:28.8},{text:'really',time:28.9},{text:'neat',time:29.1},{text:'place',time:29.34},{text:'on',time:29.62},{text:'the',time:29.82},{text:'moon,',time:29.9},{text:'and',time:30.68},{text:'it',time:30.8},{text:'is',time:30.94},{text:'on',time:31.14},{text:'the',time:31.3},{text:'nearside-farside',time:31.54},{text:'boundary.',time:33.06}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 33, words: [
        {text:'In',time:34.14},{text:'fact,',time:34.22},{text:"it's",time:34.58},{text:'just',time:34.68},{text:'on',time:34.8},{text:'the',time:35.02},{text:'nearside',time:35.2},{text:'of',time:35.5},{text:'that',time:35.92},{text:'boundary.',time:36.12}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 36, words: [
        {text:'And',time:37.3},{text:'so',time:37.32},{text:'at',time:37.52},{text:'certain',time:37.66},{text:'times',time:37.96},{text:'of',time:38.56},{text:'the',time:39.9},{text:"moon's",time:40.1},{text:'transit',time:41.36},{text:'around',time:41.72},{text:'Earth,',time:41.98},{text:'we',time:43.46},{text:'will',time:43.68},{text:'be',time:43.82},{text:'able',time:43.94},{text:'to',time:44.04},{text:'see',time:44.16},{text:'this',time:44.36},{text:'from',time:44.56},{text:'Earth.',time:44.78}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 44, words: [
        {text:'And',time:45.92},{text:'so',time:46.02},{text:'we',time:46.18},{text:'lost',time:46.28},{text:'a',time:46.5},{text:'loved',time:46.66},{text:'one.',time:46.84}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 46, words: [
        {text:'Her',time:47.7},{text:'name',time:47.94},{text:'was',time:48.12},{text:'Carol,',time:48.3},{text:'the',time:50.46},{text:'spouse',time:50.9},{text:'of',time:51.2},{text:'Reed,',time:51.42},{text:'the',time:51.68},{text:'mother',time:52.2},{text:'of',time:52.48},{text:'Katie',time:53.4},{text:'and',time:53.82},{text:'Ellie.',time:54.16}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 56, words: [
        {text:'And',time:57.86},{text:'if',time:58.38},{text:'you',time:58.54},{text:'want',time:58.62},{text:'to',time:58.74},{text:'find',time:58.82},{text:'this',time:59.02},{text:'one,',time:59.26},{text:'you',time:59.68},{text:'look',time:59.7},{text:'at',time:59.86},{text:'Glushko,',time:60.02},{text:'and',time:62.2},{text:"it's",time:62.72},{text:'just',time:63.0},{text:'to',time:63.24},{text:'the',time:63.5},{text:'northwest',time:63.56},{text:'of',time:63.9},{text:'that,',time:64.24},{text:'at',time:64.68},{text:'the',time:65.0},{text:'same',time:65.1},{text:'latitude',time:65.32},{text:'as',time:65.68},{text:'Ome,',time:65.98},{text:'and',time:66.6},{text:"it's",time:66.68},{text:'a',time:66.88},{text:'bright',time:67.0},{text:'spot',time:67.64},{text:'on',time:68.02},{text:'the',time:68.68},{text:'moon.',time:68.8}
      ]},
      { speaker: 1, speakerLabel: 'Integrity', startTime: 69, words: [
        {text:'And',time:71.3},{text:'we',time:71.82},{text:'would',time:71.96},{text:'like',time:72.16},{text:'to',time:72.28},{text:'call',time:72.46},{text:'it',time:72.74},{text:'CAROL,',time:72.94},{text:'and',time:74.44},{text:'you',time:74.96},{text:'spell',time:75.06},{text:'that',time:75.32},{text:'C-A-R-R-O-L-L.',time:75.5}
      ]},
      { speaker: 2, speakerLabel: 'Houston', startTime: 85, words: [
        {text:'Integrity',time:85.98},{text:'and',time:86.52},{text:'Carol',time:86.96},{text:'Crater,',time:87.28},{text:'loud',time:88.18},{text:'and',time:88.28},{text:'clear.',time:88.4},{text:'Thank',time:89.12},{text:'you.',time:89.24}
      ]},
    ]
  };

  const demoPlay = document.getElementById('demo-play');
  const demoReset = document.getElementById('demo-reset');
  const demoTranscript = document.getElementById('demo-transcript');
  const demoPlaceholder = document.getElementById('demo-placeholder');
  const demoSummary = document.getElementById('demo-summary');
  const demoSummaryText = document.getElementById('demo-summary-text');
  const demoProgressBar = document.getElementById('demo-progress');
  const demoProgressFill = document.getElementById('demo-progress-fill');
  const demoDuration = document.getElementById('demo-duration');
  const demoPlayLabel = document.getElementById('demo-play-label');
  const demoIconPlay = demoPlay ? demoPlay.querySelector('.demo-icon-play') : null;
  const demoIconPause = demoPlay ? demoPlay.querySelector('.demo-icon-pause') : null;

  if (demoPlay && demoTranscript) {
    const audio = new Audio(DEMO_TRANSCRIPT.audioSrc);
    audio.preload = 'auto';
    let isPlaying = false;
    let segmentEls = []; // track created segment DOMs
    let summaryTimer = null;
    let resetting = false;

    function formatTime(s) {
      const m = Math.floor(s / 60);
      const sec = Math.floor(s % 60);
      return m + ':' + String(sec).padStart(2, '0');
    }

    function updatePlayButton(playing) {
      isPlaying = playing;
      if (demoIconPlay) demoIconPlay.style.display = playing ? 'none' : '';
      if (demoIconPause) demoIconPause.style.display = playing ? '' : 'none';
      if (demoPlayLabel) demoPlayLabel.textContent = playing ? 'Pause' : 'Play';
    }

    // Play / Pause
    demoPlay.addEventListener('click', () => {
      if (isPlaying) {
        audio.pause();
        updatePlayButton(false);
      } else {
        // Hide placeholder on first play
        if (demoPlaceholder) demoPlaceholder.style.display = 'none';
        audio.play();
        updatePlayButton(true);
      }
    });

    // Reset
    demoReset.addEventListener('click', () => {
      resetting = true;
      audio.pause();
      audio.currentTime = 0;
      updatePlayButton(false);
      // Clear segments
      segmentEls.forEach(el => el.remove());
      segmentEls = [];
      // Show placeholder
      if (demoPlaceholder) demoPlaceholder.style.display = '';
      // Hide summary
      if (demoSummary) { demoSummary.hidden = true; demoSummary.classList.remove('visible'); }
      if (demoProgressFill) demoProgressFill.style.width = '0%';
      if (demoDuration) demoDuration.textContent = '0:00 / ' + formatTime(audio.duration || 91);
      if (summaryTimer) { clearTimeout(summaryTimer); summaryTimer = null; }
      setTimeout(() => { resetting = false; }, 100);
    });

    // Time update — reveal words
    audio.addEventListener('timeupdate', () => {
      const t = audio.currentTime;
      const dur = audio.duration || 91;
      // Progress bar
      if (demoProgressFill) demoProgressFill.style.width = (t / dur * 100) + '%';
      if (demoDuration) demoDuration.textContent = formatTime(t) + ' / ' + formatTime(dur);
      if (demoProgressBar) demoProgressBar.setAttribute('aria-valuenow', Math.round(t / dur * 100));

      revealWords(t);
    });

    function revealWords(t) {
      if (resetting) return;
      const segs = DEMO_TRANSCRIPT.segments;
      let needsScroll = false;

      for (let i = 0; i < segs.length; i++) {
        const seg = segs[i];
        if (seg.startTime > t) break;

        // Create segment DOM if needed
        if (!segmentEls[i]) {
          const div = document.createElement('div');
          div.className = 'demo-segment demo-segment-s' + seg.speaker;
          div.innerHTML =
            '<div class="demo-segment-meta">' +
              '<span class="demo-speaker demo-speaker-' + seg.speaker + '">' + seg.speakerLabel + '</span>' +
            '</div>' +
            '<p class="demo-segment-text">' +
              seg.words.map(w => '<span class="demo-word" data-time="' + w.time + '">' + w.text + '</span>').join(' ') +
            '</p>' +
            '<span class="demo-timestamp">' + formatTime(seg.startTime) + '</span>';
          demoTranscript.appendChild(div);
          segmentEls[i] = div;
          // Trigger entrance animation
          requestAnimationFrame(() => { div.classList.add('visible'); });
          needsScroll = true;
        }

        // Reveal words within this segment
        const wordSpans = segmentEls[i].querySelectorAll('.demo-word');
        for (let j = 0; j < wordSpans.length; j++) {
          const wTime = parseFloat(wordSpans[j].dataset.time);
          if (wTime <= t) {
            if (!wordSpans[j].classList.contains('revealed')) {
              wordSpans[j].classList.add('revealed');
              needsScroll = true;
            }
          } else {
            // Support seek backward
            wordSpans[j].classList.remove('revealed');
          }
        }
      }

      // Remove segments that are after current time (seek backward)
      for (let i = segs.length - 1; i >= 0; i--) {
        if (segs[i].startTime > t && segmentEls[i]) {
          segmentEls[i].remove();
          segmentEls[i] = undefined;
        }
      }

      // Auto-scroll
      if (needsScroll) {
        demoTranscript.scrollTo({
          top: demoTranscript.scrollHeight,
          behavior: prefersReducedMotion ? 'auto' : 'smooth'
        });
      }
    }

    // Audio ended
    audio.addEventListener('ended', () => {
      updatePlayButton(false);
    });

    // Duration display once metadata loads
    audio.addEventListener('loadedmetadata', () => {
      if (demoDuration) demoDuration.textContent = '0:00 / ' + formatTime(audio.duration);
    });

    // Progress bar seek
    if (demoProgressBar) {
      function seekTo(e) {
        const rect = demoProgressBar.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        audio.currentTime = ratio * (audio.duration || 91);
      }

      demoProgressBar.addEventListener('click', seekTo);

      // Drag support
      let dragging = false;
      demoProgressBar.addEventListener('mousedown', (e) => { dragging = true; seekTo(e); });
      window.addEventListener('mousemove', (e) => { if (dragging) seekTo(e); });
      window.addEventListener('mouseup', () => { dragging = false; });

      // Keyboard (arrow keys seek ±5s)
      demoProgressBar.addEventListener('keydown', (e) => {
        const step = 5;
        if (e.key === 'ArrowRight') { audio.currentTime = Math.min(audio.currentTime + step, audio.duration); e.preventDefault(); }
        if (e.key === 'ArrowLeft')  { audio.currentTime = Math.max(audio.currentTime - step, 0); e.preventDefault(); }
        if (e.key === 'Home')       { audio.currentTime = 0; e.preventDefault(); }
        if (e.key === 'End')        { audio.currentTime = audio.duration; e.preventDefault(); }
      });
    }
  }

})();
