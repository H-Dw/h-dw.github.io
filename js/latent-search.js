/* ===========================================================================
   latent-search.js

   Draws the loop the site is about, left to right:

       latent prior  →  verifier-guided search  →  structure

   A cloud of samples, a search tree whose weak branches are pruned and one of
   which is rolled back, and a surviving path that carries samples out of the
   cloud and assembles them into a structure. The motion is the argument, so
   it is skipped entirely under prefers-reduced-motion — the resolved state is
   painted instead.

   Everything is laid out in a fixed 1080x300 logical space and scaled to fit.
   =========================================================================== */

(function (global) {
  "use strict";

  var VW = 1080, VH = 300;
  var SEED = 20260823;

  var COLOR = {
    sample: "93,105,112",
    edge: "93,105,112",
    ink: "38,46,52",
    win: "150,90,96",
    paper: "#F7F8F9"
  };

  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(v) { return v < 0 ? 0 : v > 1 ? 1 : v; }
  function ease(t) { return 1 - Math.pow(1 - t, 3); }
  function seg(p, a, b) { return clamp01((p - a) / (b - a)); }

  /* ---- the scene, laid out once ------------------------------------- */

  function buildScene() {
    var rnd = mulberry32(SEED);
    var i;

    /* 1. the prior: a gaussian cloud of samples */
    var cloud = [];
    for (i = 0; i < 210; i++) {
      var u1 = rnd() || 1e-6, u2 = rnd();
      var r = Math.sqrt(-2 * Math.log(u1));
      cloud.push({
        x: 112 + r * Math.cos(2 * Math.PI * u2) * 38,
        y: 150 + r * Math.sin(2 * Math.PI * u2) * 62,
        r: 1.1 + rnd() * 1.6,
        ph: rnd() * Math.PI * 2,
        d: rnd()
      });
    }

    /* 2. the search tree. x,y in logical space; `win` marks the path that
          survives, `back` marks the branch that gets rolled back. */
    var N = {
      n0: { x: 268, y: 150, win: true },
      n1: { x: 420, y: 80, win: true },
      n2: { x: 420, y: 218 },
      n3: { x: 566, y: 36 },
      n4: { x: 566, y: 116, win: true },
      n5: { x: 566, y: 190, back: true },
      n6: { x: 566, y: 272 },
      n7: { x: 700, y: 78 },
      n8: { x: 700, y: 150, win: true }
    };
    var edges = [
      { a: "n0", b: "n1", depth: 0, win: true },
      { a: "n0", b: "n2", depth: 0 },
      { a: "n1", b: "n3", depth: 1 },
      { a: "n1", b: "n4", depth: 1, win: true },
      { a: "n2", b: "n5", depth: 1 },
      { a: "n2", b: "n6", depth: 1 },
      { a: "n4", b: "n7", depth: 2 },
      { a: "n4", b: "n8", depth: 2, win: true }
    ];

    /* 3. the structure: an irregular lattice the samples assemble into */
    var lat = [];
    var cols = [790, 866, 942];
    var rows = [58, 128, 196, 262];
    for (var c = 0; c < cols.length; c++) {
      for (var q = 0; q < rows.length; q++) {
        if (c === 2 && q === 3) continue;
        if (c === 0 && q === 0) continue;
        lat.push({
          x: cols[c] + (rnd() - 0.5) * 24,
          y: rows[q] + (rnd() - 0.5) * 22,
          c: c, q: q
        });
      }
    }
    var bonds = [];
    for (i = 0; i < lat.length; i++) {
      for (var j = i + 1; j < lat.length; j++) {
        var dx = lat[i].x - lat[j].x, dy = lat[i].y - lat[j].y;
        if (Math.sqrt(dx * dx + dy * dy) < 96) bonds.push([i, j]);
      }
    }

    /* 4. which cloud samples travel, and the control points they follow */
    var movers = [];
    var pool = cloud.slice().sort(function (a, b) { return a.d - b.d; });
    for (i = 0; i < lat.length; i++) {
      var src = pool[i % pool.length];
      movers.push({
        from: src,
        to: lat[i],
        via: [N.n1, N.n4, N.n8],
        delay: (i / lat.length) * 0.5
      });
    }

    return { cloud: cloud, N: N, edges: edges, lat: lat, bonds: bonds, movers: movers };
  }

  /* ---- drawing ------------------------------------------------------- */

  function curve(ctx, a, b) {
    var mx = (a.x + b.x) / 2;
    ctx.moveTo(a.x, a.y);
    ctx.bezierCurveTo(mx, a.y, mx, b.y, b.x, b.y);
  }

  function pointOnPath(pts, t) {
    /* piecewise-linear walk through the control points */
    var n = pts.length - 1;
    var s = clamp01(t) * n;
    var i = Math.min(n - 1, Math.floor(s));
    var f = s - i;
    return {
      x: pts[i].x + (pts[i + 1].x - pts[i].x) * f,
      y: pts[i].y + (pts[i + 1].y - pts[i].y) * f
    };
  }

  function Scene(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.s = buildScene();
    this.p = 0;
    this.raf = null;
  }

  Scene.prototype.resize = function () {
    var dpr = Math.min(global.devicePixelRatio || 1, 2);
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width) return;
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.scale = rect.width / VW;
    this.ctx.setTransform(dpr * this.scale, 0, 0, dpr * this.scale, 0, 0);
    this.draw();
  };

  Scene.prototype.draw = function () {
    var ctx = this.ctx, s = this.s, p = this.p, i;
    if (!this.scale) return;
    ctx.clearRect(0, 0, VW, VH);

    var pIn = ease(seg(p, 0.00, 0.22));   // cloud appears
    var pTree = seg(p, 0.16, 0.56);        // edges draw
    var pPrune = ease(seg(p, 0.48, 0.70)); // weak branches fade
    var pWin = ease(seg(p, 0.54, 0.86));   // surviving path lights up
    var pMove = seg(p, 0.60, 1.00);        // samples travel and assemble

    /* --- prior cloud ------------------------------------------------- */
    for (i = 0; i < s.cloud.length; i++) {
      var c = s.cloud[i];
      var jitter = (1 - pIn) * 7;
      var a = 0.40 * pIn * (0.45 + c.d * 0.75);
      ctx.beginPath();
      ctx.fillStyle = "rgba(" + COLOR.sample + "," + a.toFixed(3) + ")";
      ctx.arc(
        c.x + Math.cos(c.ph) * jitter,
        c.y + Math.sin(c.ph * 1.7) * jitter,
        c.r, 0, Math.PI * 2
      );
      ctx.fill();
    }

    /* --- search tree -------------------------------------------------- */
    ctx.lineCap = "round";
    for (i = 0; i < s.edges.length; i++) {
      var e = s.edges[i];
      var t0 = 0.10 + e.depth * 0.28;
      var grow = ease(clamp01((pTree - t0 * 0.55) / 0.45));
      if (grow <= 0) continue;

      var A = s.N[e.a], B = s.N[e.b];
      var fade = e.win ? 1 : 1 - pPrune * 0.55;

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, A.x + (B.x - A.x) * grow + 1, VH);
      ctx.clip();

      ctx.beginPath();
      curve(ctx, A, B);
      ctx.strokeStyle = e.win
        ? "rgba(" + COLOR.edge + "," + (0.55 * (1 - pWin)).toFixed(3) + ")"
        : "rgba(" + COLOR.edge + "," + (0.52 * fade).toFixed(3) + ")";
      ctx.lineWidth = e.win ? 1.3 : 1.1;
      ctx.stroke();

      if (e.win) {
        ctx.beginPath();
        curve(ctx, A, B);
        ctx.strokeStyle = "rgba(" + COLOR.win + "," + (0.95 * pWin).toFixed(3) + ")";
        ctx.lineWidth = 2.1;
        ctx.stroke();
      }
      ctx.restore();
    }

    /* the surviving path hands off to the structure */
    if (pWin > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(s.N.n8.x, s.N.n8.y);
      ctx.bezierCurveTo(740, 150, 748, 146, 764, 140);
      ctx.strokeStyle = "rgba(" + COLOR.win + "," + (0.45 * pWin).toFixed(3) + ")";
      ctx.lineWidth = 1.6;
      ctx.setLineDash([3, 4]);
      ctx.stroke();
      ctx.restore();
    }

    /* rollback: a dashed retrace on the branch that was abandoned */
    if (pPrune > 0) {
      var from = s.N.n5, to = s.N.n2;
      ctx.save();
      ctx.setLineDash([4, 5]);
      ctx.beginPath();
      ctx.moveTo(from.x - 4, from.y + 12);
      ctx.bezierCurveTo(from.x - 50, from.y + 40, to.x + 30, to.y + 42, to.x + 4, to.y + 12);
      ctx.strokeStyle = "rgba(" + COLOR.edge + "," + (0.42 * pPrune).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.restore();
    }

    /* nodes */
    var keys = Object.keys(s.N);
    for (i = 0; i < keys.length; i++) {
      var n = s.N[keys[i]];
      var appear = ease(clamp01((pTree - (n.x - 268) / 600 * 0.5) / 0.4));
      if (appear <= 0) continue;
      var live = n.win ? 1 : 1 - pPrune * 0.5;
      ctx.beginPath();
      ctx.arc(n.x, n.y, n.win ? 4 : 3.2, 0, Math.PI * 2);
      ctx.fillStyle = COLOR.paper;
      ctx.fill();
      ctx.strokeStyle = n.win
        ? "rgba(" + COLOR.win + "," + (0.35 + 0.6 * pWin).toFixed(3) + ")"
        : "rgba(" + COLOR.edge + "," + (0.6 * live * appear).toFixed(3) + ")";
      ctx.lineWidth = n.win ? 1.7 : 1.2;
      ctx.stroke();
    }

    /* --- structure ---------------------------------------------------- */
    var arrived = [];
    for (i = 0; i < s.movers.length; i++) {
      var m = s.movers[i];
      var tm = ease(clamp01((pMove - m.delay) / (1 - 0.5)));
      if (tm <= 0) continue;
      var path = [m.from].concat(m.via, [m.to]);
      var pt = pointOnPath(path, tm);
      arrived.push(tm > 0.985);
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, 2.4, 0, Math.PI * 2);
      ctx.fillStyle = "rgba(" + COLOR.win + "," + (0.35 + 0.6 * tm).toFixed(3) + ")";
      ctx.fill();
    }

    var bondAlpha = ease(seg(p, 0.84, 1.0));
    if (bondAlpha > 0) {
      ctx.beginPath();
      for (i = 0; i < s.bonds.length; i++) {
        var b0 = s.lat[s.bonds[i][0]], b1 = s.lat[s.bonds[i][1]];
        ctx.moveTo(b0.x, b0.y);
        ctx.lineTo(b1.x, b1.y);
      }
      ctx.strokeStyle = "rgba(" + COLOR.ink + "," + (0.42 * bondAlpha).toFixed(3) + ")";
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  };

  Scene.prototype.play = function (ms) {
    var self = this, start = null;
    if (this.raf) global.cancelAnimationFrame(this.raf);
    function frame(ts) {
      if (start === null) start = ts;
      var t = Math.min(1, (ts - start) / ms);
      self.p = t;
      self.draw();
      if (t < 1) self.raf = global.requestAnimationFrame(frame);
    }
    this.raf = global.requestAnimationFrame(frame);
  };

  global.initLatentSearch = function (canvas) {
    if (!canvas || !canvas.getContext) return null;
    var scene = new Scene(canvas);
    var reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    scene.p = reduced ? 1 : 0;
    scene.resize();

    if (!reduced) {
      if ("IntersectionObserver" in global) {
        var io = new IntersectionObserver(function (entries) {
          if (entries[0].isIntersecting) {
            io.disconnect();
            scene.play(2800);
          }
        }, { threshold: 0.25 });
        io.observe(canvas);
      } else {
        scene.play(2800);
      }
    }

    var t;
    global.addEventListener("resize", function () {
      clearTimeout(t);
      t = setTimeout(function () { scene.resize(); }, 140);
    });

    return scene;
  };
})(window);
