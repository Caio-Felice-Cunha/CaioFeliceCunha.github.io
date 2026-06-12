/* ============================================================
   motion.js - Deep-space neural experience layer
   - Neural particle field (custom canvas)
   - Kinetic hero type + scroll reveals (GSAP, optional)
   - Magnetic buttons, custom cursor, smooth scroll (Lenis, optional)
   - Scroll-progress bar, parallax blobs
   Robustness:
   - prefers-reduced-motion => no animation, all content visible
   - GSAP/Lenis missing => content still visible, page still scrolls
   ============================================================ */
(function () {
    'use strict';

    var root = document.documentElement;
    var prefersReduced = false;
    try {
        prefersReduced = window.matchMedia &&
            window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch (e) {
        prefersReduced = false;
    }

    var isTouch = ('ontouchstart' in window) ||
        (navigator.maxTouchPoints && navigator.maxTouchPoints > 0);

    // motionAllowed mirrors the inline <head> gate: only true when the
    // reveal-hide CSS is actually in effect (html.js-anim present).
    var motionAllowed = root.classList.contains('js-anim') && !prefersReduced;

    function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }

    /* --------------------------------------------------------
       SCROLL PROGRESS BAR (cheap, runs even without libs)
       -------------------------------------------------------- */
    (function scrollProgress() {
        var bar = document.querySelector('.scroll-progress__bar');
        if (!bar) return;
        var ticking = false;
        function update() {
            var h = document.documentElement;
            var scrolled = h.scrollTop || document.body.scrollTop;
            var height = (h.scrollHeight - h.clientHeight) || 1;
            bar.style.width = clamp((scrolled / height) * 100, 0, 100) + '%';
            ticking = false;
        }
        window.addEventListener('scroll', function () {
            if (!ticking) { window.requestAnimationFrame(update); ticking = true; }
        }, { passive: true });
        update();
    })();

    /* --------------------------------------------------------
       NEURAL PARTICLE FIELD (custom canvas)
       Centerpiece: drifting nodes + proximity links + cursor pull.
       Paused on hidden tab / off-screen. Static single frame under
       reduced-motion. Skips entirely if no canvas.
       -------------------------------------------------------- */
    (function neuralField() {
        var canvas = document.getElementById('neural-canvas');
        if (!canvas || typeof canvas.getContext !== 'function') return;
        var ctx = canvas.getContext('2d');
        if (!ctx) return;

        var dpr = Math.min(window.devicePixelRatio || 1, 2);
        var w = 0, h = 0;
        var nodes = [];
        var mouse = { x: -9999, y: -9999, active: false };
        var rafId = null;
        var running = false;
        var inView = true;

        var LINK_DIST = 130;       // px threshold for drawing a link
        var MOUSE_DIST = 170;      // px cursor influence radius

        function nodeCount() {
            var area = window.innerWidth * window.innerHeight;
            // ~1 node per 14k px^2, clamped; lighter on small screens.
            var base = Math.round(area / 14000);
            if (window.innerWidth < 680) return clamp(base, 28, 55);
            return clamp(base, 70, 140);
        }

        function resize() {
            var rect = canvas.getBoundingClientRect();
            w = rect.width;
            h = rect.height;
            canvas.width = Math.round(w * dpr);
            canvas.height = Math.round(h * dpr);
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        }

        function seed() {
            nodes = [];
            var n = nodeCount();
            for (var i = 0; i < n; i++) {
                nodes.push({
                    x: Math.random() * w,
                    y: Math.random() * h,
                    vx: (Math.random() - 0.5) * 0.28,
                    vy: (Math.random() - 0.5) * 0.28,
                    r: Math.random() * 1.6 + 0.7,
                    hue: Math.random() // 0 = cyan, 1 = violet
                });
            }
        }

        // cyan (34,211,238) -> violet (168,85,247) by t
        function mix(t) {
            var r = Math.round(34 + (168 - 34) * t);
            var g = Math.round(211 + (85 - 211) * t);
            var b = Math.round(238 + (247 - 238) * t);
            return r + ',' + g + ',' + b;
        }

        function step() {
            ctx.clearRect(0, 0, w, h);

            for (var i = 0; i < nodes.length; i++) {
                var p = nodes[i];

                // cursor attraction (gentle)
                if (mouse.active) {
                    var dxm = mouse.x - p.x;
                    var dym = mouse.y - p.y;
                    var dm = Math.sqrt(dxm * dxm + dym * dym);
                    if (dm < MOUSE_DIST && dm > 0.01) {
                        var pull = (1 - dm / MOUSE_DIST) * 0.35;
                        p.vx += (dxm / dm) * pull * 0.04;
                        p.vy += (dym / dm) * pull * 0.04;
                    }
                }

                p.x += p.vx;
                p.y += p.vy;

                // soft velocity damping so cursor pull does not run away
                p.vx *= 0.992;
                p.vy *= 0.992;

                // wrap around edges
                if (p.x < -20) p.x = w + 20;
                else if (p.x > w + 20) p.x = -20;
                if (p.y < -20) p.y = h + 20;
                else if (p.y > h + 20) p.y = -20;

                // node dot
                ctx.beginPath();
                ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(' + mix(p.hue) + ',0.85)';
                ctx.fill();
            }

            // links between nearby nodes
            for (var a = 0; a < nodes.length; a++) {
                var na = nodes[a];
                for (var b = a + 1; b < nodes.length; b++) {
                    var nb = nodes[b];
                    var dx = na.x - nb.x;
                    var dy = na.y - nb.y;
                    var dist = Math.sqrt(dx * dx + dy * dy);
                    if (dist < LINK_DIST) {
                        var alpha = (1 - dist / LINK_DIST) * 0.35;
                        var t = (na.hue + nb.hue) / 2;
                        ctx.strokeStyle = 'rgba(' + mix(t) + ',' + alpha.toFixed(3) + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(na.x, na.y);
                        ctx.lineTo(nb.x, nb.y);
                        ctx.stroke();
                    }
                }

                // link node to cursor when close (the "reacting to you" effect)
                if (mouse.active) {
                    var cdx = na.x - mouse.x;
                    var cdy = na.y - mouse.y;
                    var cd = Math.sqrt(cdx * cdx + cdy * cdy);
                    if (cd < MOUSE_DIST) {
                        var ca = (1 - cd / MOUSE_DIST) * 0.5;
                        ctx.strokeStyle = 'rgba(' + mix(na.hue) + ',' + ca.toFixed(3) + ')';
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        ctx.moveTo(na.x, na.y);
                        ctx.lineTo(mouse.x, mouse.y);
                        ctx.stroke();
                    }
                }
            }
        }

        function loop() {
            step();
            rafId = window.requestAnimationFrame(loop);
        }

        function start() {
            if (running || prefersReduced) return;
            running = true;
            loop();
        }

        function stop() {
            running = false;
            if (rafId) { window.cancelAnimationFrame(rafId); rafId = null; }
        }

        // pointer tracking (relative to canvas)
        var hero = document.getElementById('hero');
        if (hero && !isTouch) {
            hero.addEventListener('mousemove', function (e) {
                var rect = canvas.getBoundingClientRect();
                mouse.x = e.clientX - rect.left;
                mouse.y = e.clientY - rect.top;
                mouse.active = true;
            });
            hero.addEventListener('mouseleave', function () {
                mouse.active = false;
                mouse.x = -9999; mouse.y = -9999;
            });
        }

        // pause when tab hidden
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) stop();
            else if (inView) start();
        });

        // pause when hero scrolled out of view
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (entries) {
                entries.forEach(function (en) {
                    inView = en.isIntersecting;
                    if (inView && !document.hidden) start();
                    else stop();
                });
            }, { threshold: 0.02 });
            io.observe(canvas);
        }

        var resizeTimer = null;
        window.addEventListener('resize', function () {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
                resize();
                seed();
                if (prefersReduced) step(); // refresh static frame
            }, 200);
        });

        // init
        resize();
        seed();
        if (prefersReduced) {
            step(); // render one calm static frame, no animation
        } else {
            start();
        }
    })();

    /* --------------------------------------------------------
       Everything below is pure enhancement. If motion is not
       allowed, bail now so all content is visible and usable.
       -------------------------------------------------------- */
    if (!motionAllowed) {
        // Ensure nothing stays hidden (defensive; CSS already covers this).
        root.classList.remove('js-anim');
        return;
    }

    var hasGSAP = typeof window.gsap !== 'undefined';

    if (!hasGSAP) {
        // Library failed to load: reveal all gated content immediately.
        root.classList.add('anim-failed');
        // Still wire up the cheap enhancements that need no GSAP.
        initCursor();
        initMagnetic();
        return;
    }

    var gsap = window.gsap;
    var hasST = typeof window.ScrollTrigger !== 'undefined';
    if (hasST) {
        gsap.registerPlugin(window.ScrollTrigger);
    }

    /* --------------------------------------------------------
       SCROLL: native (no Lenis). Mouse wheel and trackpad stay 1:1
       with the OS, which is snappier and more accessible than
       interpolating wheel input. ScrollTrigger works on native
       scroll by default; anchor jumps are smoothed via CSS
       scroll-behavior (gated behind prefers-reduced-motion).
       -------------------------------------------------------- */

    /* --------------------------------------------------------
       KINETIC HERO TYPE + orchestrated entrance timeline
       -------------------------------------------------------- */
    (function heroIntro() {
        var tl = gsap.timeline({ defaults: { ease: 'power3.out' } });

        var words = document.querySelectorAll('[data-reveal-title] .word');
        if (words.length) {
            tl.to(words, {
                y: '0%',
                opacity: 1,
                duration: 0.9,
                stagger: 0.08
            }, 0.15);
        }

        // Hero reveal elements (chip, subhead, lede, CTAs, photo) in order.
        var heroReveals = document.querySelectorAll('#hero [data-reveal]');
        if (heroReveals.length) {
            tl.to(heroReveals, {
                y: 0,
                opacity: 1,
                duration: 0.7,
                stagger: 0.12
            }, 0.45);
        }
    })();

    /* --------------------------------------------------------
       SCROLL REVEALS for every other [data-reveal] outside hero.
       Staggered within a [data-reveal-group] grid.
       -------------------------------------------------------- */
    if (hasST) {
        // Grouped reveals (card grids, cred strip, timeline) stagger together.
        document.querySelectorAll('[data-reveal-group]').forEach(function (group) {
            var items = group.querySelectorAll('[data-reveal]');
            if (!items.length) return;
            gsap.to(items, {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power3.out',
                stagger: 0.1,
                scrollTrigger: {
                    trigger: group,
                    start: 'top 82%',
                    once: true
                }
            });
        });

        // Standalone reveals (section eyebrows, titles, intros) not in hero
        // and not inside a reveal-group.
        document.querySelectorAll('[data-reveal]').forEach(function (el) {
            if (el.closest('#hero')) return;
            if (el.closest('[data-reveal-group]')) return;
            gsap.to(el, {
                y: 0,
                opacity: 1,
                duration: 0.7,
                ease: 'power3.out',
                scrollTrigger: {
                    trigger: el,
                    start: 'top 88%',
                    once: true
                }
            });
        });

        // Parallax on the atmospheric blobs.
        gsap.utils.toArray('.blob').forEach(function (blob, i) {
            gsap.to(blob, {
                yPercent: (i % 2 === 0 ? 18 : -14),
                ease: 'none',
                scrollTrigger: {
                    trigger: document.body,
                    start: 'top top',
                    end: 'bottom bottom',
                    scrub: true
                }
            });
        });
    } else {
        // No ScrollTrigger: reveal remaining gated content immediately so
        // nothing below the fold stays invisible.
        gsap.set('[data-reveal]:not(#hero [data-reveal])', { opacity: 1, y: 0 });
    }

    initCursor();
    initMagnetic();
    initCardGlow();

    /* --------------------------------------------------------
       REVEAL SAFETY NET. The GSAP ScrollTrigger reveals are the
       smooth path. This guarantees no [data-reveal] can ever stay
       stuck partially hidden, independent of GSAP's rAF (covers a
       throttled/backgrounded tab, or a once-trigger missed on a
       very fast jump). It runs only after scrolling settles, so it
       never fights an in-flight animation: by then any in-view
       reveal has finished and this is a no-op; only a genuinely
       stuck element gets forced to its final state.
       -------------------------------------------------------- */
    (function revealSafetyNet() {
        function settle() {
            var vh = window.innerHeight;
            document.querySelectorAll('[data-reveal]').forEach(function (el) {
                var r = el.getBoundingClientRect();
                if (r.top < vh * 0.92 && r.bottom > 0 &&
                    parseFloat(window.getComputedStyle(el).opacity) < 0.99) {
                    el.style.opacity = '1';
                    el.style.transform = 'none';
                }
            });
        }
        var t;
        window.addEventListener('scroll', function () {
            window.clearTimeout(t);
            t = window.setTimeout(settle, 1000);
        }, { passive: true });
        window.setTimeout(settle, 2000);
    })();

    /* ========================================================
       Helper inits (defined as hoisted functions)
       ======================================================== */

    function initCursor() {
        if (isTouch) return;
        var dot = document.querySelector('.cursor-dot');
        var ring = document.querySelector('.cursor-ring');
        if (!dot || !ring) return;

        document.body.classList.add('cursor-active');

        var mx = window.innerWidth / 2, my = window.innerHeight / 2;
        var rx = mx, ry = my;

        window.addEventListener('mousemove', function (e) {
            mx = e.clientX; my = e.clientY;
            dot.style.transform = 'translate(' + mx + 'px,' + my + 'px) translate(-50%,-50%)';
        }, { passive: true });

        function ringFollow() {
            rx += (mx - rx) * 0.18;
            ry += (my - ry) * 0.18;
            ring.style.transform = 'translate(' + rx + 'px,' + ry + 'px) translate(-50%,-50%)';
            window.requestAnimationFrame(ringFollow);
        }
        window.requestAnimationFrame(ringFollow);

        var interactive = 'a, button, [data-magnetic], input, .tab, .subtab';
        document.querySelectorAll(interactive).forEach(function (el) {
            el.addEventListener('mouseenter', function () {
                document.body.classList.add('cursor-hover');
            });
            el.addEventListener('mouseleave', function () {
                document.body.classList.remove('cursor-hover');
            });
        });
    }

    function initMagnetic() {
        if (isTouch) return;
        document.querySelectorAll('[data-magnetic]').forEach(function (el) {
            var strength = 0.3;
            el.addEventListener('mousemove', function (e) {
                var rect = el.getBoundingClientRect();
                var x = e.clientX - (rect.left + rect.width / 2);
                var y = e.clientY - (rect.top + rect.height / 2);
                el.style.transform = 'translate(' + (x * strength) + 'px,' + (y * strength) + 'px)';
            });
            el.addEventListener('mouseleave', function () {
                el.style.transform = 'translate(0,0)';
            });
        });
    }

    // Pointer-follow glow on flagship cards.
    function initCardGlow() {
        if (isTouch) return;
        document.querySelectorAll('.flagship-card').forEach(function (card) {
            card.addEventListener('mousemove', function (e) {
                var rect = card.getBoundingClientRect();
                card.style.setProperty('--mx', ((e.clientX - rect.left) / rect.width * 100) + '%');
                card.style.setProperty('--my', ((e.clientY - rect.top) / rect.height * 100) + '%');
            });
        });
    }
})();
