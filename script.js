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
    const sectionEls = document.querySelectorAll('.hero, #features, #screens, #workflow, #audience, #desktop, #cta');
    const sectionConfigs = [
      { driftAngle: 0,   nebulaHue: 0,   rotation: 0   },  // hero
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
    const clickableImgs = document.querySelectorAll('.mac-frame img, .mac-frame-sm img, .hero-screenshot img');

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

})();
