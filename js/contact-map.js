/* ===========================================================================
   contact-map.js
   Draws a residue–residue contact map for a two-chain complex, and resolves it
   out of noise on first paint. The denoising is not decoration: it is the
   process the research is about. Honours prefers-reduced-motion by painting
   the resolved state directly.
   =========================================================================== */

(function (global) {
  "use strict";

  var N = 52;          // residues per axis
  var SPLIT = 30;      // chain boundary: 0..29 target, 30..51 binder
  var SEED = 20260822;

  /* deterministic PRNG so the figure is the same on every visit */
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function buildMatrix() {
    var rnd = mulberry32(SEED);
    var m = [];
    var i, j;
    for (i = 0; i < N; i++) {
      m.push(new Float32Array(N));
    }

    function put(a, b, v) {
      if (a < 0 || b < 0 || a >= N || b >= N) return;
      if (v > m[a][b]) {
        m[a][b] = v;
        m[b][a] = v;
      }
    }

    /* sparse background — real maps are mostly empty */
    for (i = 0; i < N; i++) {
      for (j = i + 5; j < N; j++) {
        if (rnd() > 0.988) put(i, j, 0.12 + rnd() * 0.12);
      }
    }

    /* the diagonal: every residue contacts its sequence neighbours.
       This is the dominant feature of any contact map, so nothing else on the
       map is allowed to reach its intensity. */
    for (i = 0; i < N; i++) {
      put(i, i, 1.0);
      put(i, i + 1, 0.92);
      put(i, i + 2, 0.6);
      put(i, i + 3, 0.24 + rnd() * 0.1);
    }

    /* helices thicken the diagonal locally at i,i+3 and i,i+4 */
    [[3, 14], [19, 27], [34, 45]].forEach(function (seg) {
      for (i = seg[0]; i < seg[1]; i++) {
        put(i, i + 3, 0.62 + rnd() * 0.14);
        put(i, i + 4, 0.44 + rnd() * 0.16);
      }
    });

    /* antiparallel strand pairs: short anti-diagonal ladders. Kept short and
       well below the diagonal in intensity — with the mirror image they would
       otherwise merge into a second full-length diagonal. */
    [[3, 16, 4], [22, 29, 3], [35, 47, 4]].forEach(function (s) {
      var a = s[0], b = s[1], len = s[2];
      for (var k = 0; k < len; k++) {
        put(a + k, b - k, 0.46 + rnd() * 0.16);
      }
    });

    /* a couple of long-range tertiary contacts */
    [[6, 26], [11, 45], [38, 50]].forEach(function (c) {
      for (var a = 0; a < 2; a++) {
        for (var b = 0; b < 2; b++) {
          if (rnd() > 0.25) put(c[0] + a, c[1] + b, 0.34 + rnd() * 0.26);
        }
      }
    });

    /* the interface: two compact off-diagonal patches, sparse the way real
       inter-chain contacts are */
    [[24, 35, 2.4, 1.0], [17, 41, 1.8, 0.78]].forEach(function (c) {
      var ci = c[0], cj = c[1], sg = c[2], amp = c[3];
      for (i = 0; i < SPLIT; i++) {
        for (j = SPLIT; j < N; j++) {
          var d2 = ((i - ci) * (i - ci) + (j - cj) * (j - cj)) / (2 * sg * sg);
          var v = amp * Math.exp(-d2);
          if (v > 0.14 && rnd() > 0.32) put(i, j, Math.min(1, v * (0.8 + rnd() * 0.4)));
        }
      }
    });

    return m;
  }

  function ContactMap(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.matrix = buildMatrix();
    this.noise = (function () {
      var rnd = mulberry32(SEED + 7);
      var n = [];
      for (var i = 0; i < N; i++) {
        n.push(new Float32Array(N));
        for (var j = 0; j < N; j++) n[i][j] = rnd() * 0.62;
      }
      return n;
    })();
    this.progress = 0;
    this.raf = null;
  }

  ContactMap.prototype.resize = function () {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var rect = this.canvas.getBoundingClientRect();
    var size = Math.max(1, Math.round(Math.min(rect.width, rect.height)));
    this.canvas.width = size * dpr;
    this.canvas.height = size * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.size = size;
    this.draw();
  };

  ContactMap.prototype.draw = function () {
    var ctx = this.ctx;
    var size = this.size;
    if (!size) return;
    var step = size / N;
    var cell = Math.max(1, step - 1);
    var p = this.progress;
    var i, j;

    ctx.clearRect(0, 0, size, size);

    /* faint lattice so the empty regions still read as a grid */
    ctx.fillStyle = "rgba(228,234,231,0.032)";
    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        ctx.fillRect(i * step, j * step, cell, cell);
      }
    }

    for (i = 0; i < N; i++) {
      for (j = 0; j < N; j++) {
        /* diagonal sweep: the map resolves from the top-left corner outward */
        var delay = ((i + j) / (2 * N)) * 0.5;
        var local = (p - delay) / 0.5;
        local = local < 0 ? 0 : local > 1 ? 1 : local;
        var v = this.noise[i][j] * (1 - local) + this.matrix[i][j] * local;
        if (v < 0.035) continue;

        var isInterface = (i < SPLIT) !== (j < SPLIT);
        ctx.fillStyle = isInterface
          ? "rgba(240,110,164," + Math.min(1, v * 1.08).toFixed(3) + ")"
          : "rgba(222,232,228," + Math.min(0.92, v * 0.9).toFixed(3) + ")";
        ctx.fillRect(i * step, j * step, cell, cell);
      }
    }

    /* chain boundary */
    var b = SPLIT * step - 0.5;
    ctx.strokeStyle = "rgba(228,234,231,0.2)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(b, 0); ctx.lineTo(b, size);
    ctx.moveTo(0, b); ctx.lineTo(size, b);
    ctx.stroke();

    /* the quadrant the work is about */
    ctx.strokeStyle = "rgba(240,110,164," + (0.14 + 0.24 * p).toFixed(3) + ")";
    ctx.strokeRect(b, 0.5, size - b - 0.5, b);
  };

  ContactMap.prototype.animate = function (duration) {
    var self = this;
    var start = null;
    if (this.raf) global.cancelAnimationFrame(this.raf);

    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / duration);
      self.progress = 1 - Math.pow(1 - t, 3); // easeOutCubic
      self.draw();
      if (t < 1) self.raf = global.requestAnimationFrame(frame);
    }
    this.raf = global.requestAnimationFrame(frame);
  };

  global.initContactMap = function (canvas) {
    if (!canvas || !canvas.getContext) return null;
    var map = new ContactMap(canvas);
    var reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    map.progress = reduced ? 1 : 0;
    map.resize();

    if (!reduced) {
      /* wait until it is actually on screen before spending the animation */
      if ("IntersectionObserver" in global) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            io.disconnect();
            map.animate(1600);
          }
        }, { threshold: 0.2 });
        io.observe(canvas);
      } else {
        map.animate(1600);
      }
    }

    var t;
    global.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { map.resize(); }, 120);
    });

    return map;
  };
})(window);
