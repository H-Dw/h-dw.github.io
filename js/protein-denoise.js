/* ===========================================================================
   protein-denoise.js

   A transparent, fixed-view denoising loop. Gaussian particles converge
   directly into an NGL-rendered cartoon of the 1ROP biological homodimer,
   then return to noise. The homepage never loads a molecular 3D engine.
   =========================================================================== */

(function (global) {
  "use strict";

  var VW = 480, VH = 330;
  var CENTER = { x: VW / 2, y: VH / 2 };
  var FPS_MS = 1000 / 20;
  var CYCLE_MS = 10400;
  var SEED = 20260823;
  var PARTICLE_COUNT = 132;
  var ASSET_VERSION = "20260825-lossless-webp";
  var IMAGE_SRC = "assets/rop-cartoon.webp?v=" + ASSET_VERSION;

  // Each casting atlas has four equal columns. frameTips are normalized to a
  // single cell, so the ribbon and the baked-in wand always share one pose.
  var AGENTS = [
    {
      id: "blue",
      src: "assets/agent-blue-casting-4f.webp?v=" + ASSET_VERSION,
      x: 18,
      y: 0,
      height: 126,
      cellAspect: 543 / 724,
      frameMs: 220,
      frameOffset: 0,
      restFrame: 1,
      ribbonFrame: 1,
      frameTips: [
        { x: 0.243, y: 0.127 },
        { x: 0.921, y: 0.635 },
        { x: 0.864, y: 0.816 },
        { x: 0.153, y: 0.276 }
      ],
      accent: [109, 213, 229],
      swingPhase: 0
    },
    {
      id: "red",
      src: "assets/agent-red-casting-4f.webp?v=" + ASSET_VERSION,
      x: 367,
      y: 172,
      height: 162,
      cellAspect: 0.5,
      frameMs: 220,
      frameOffset: 2,
      restFrame: 1,
      ribbonFrame: 1,
      frameTips: [
        { x: 0.151, y: 0.523 },
        { x: 0.099, y: 0.324 },
        { x: 0.106, y: 0.228 },
        { x: 0.104, y: 0.342 }
      ],
      accent: [244, 132, 164],
      swingPhase: Math.PI
    }
  ];

  var COLOR = {
    noise: [88, 100, 106],
    rose: [173, 98, 108],
    glacier: [85, 127, 145]
  };

  function mulberry32(seed) {
    return function () {
      seed |= 0;
      seed = (seed + 0x6d2b79f5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function clamp01(value) {
    return value < 0 ? 0 : value > 1 ? 1 : value;
  }

  function mix(a, b, t) {
    return a + (b - a) * t;
  }

  function smooth(t) {
    t = clamp01(t);
    return t * t * (3 - 2 * t);
  }

  function segment(progress, start, end) {
    return clamp01((progress - start) / (end - start));
  }

  function gaussian(rnd) {
    var u = Math.max(rnd(), 1e-7);
    var v = rnd();
    var value = Math.sqrt(-2 * Math.log(u)) * Math.cos(Math.PI * 2 * v);
    return Math.max(-2.55, Math.min(2.55, value));
  }

  function rgba(rgb, alpha) {
    return "rgba(" + rgb[0] + "," + rgb[1] + "," + rgb[2] + "," +
      clamp01(alpha).toFixed(3) + ")";
  }

  function blendColor(a, b, t) {
    return [
      Math.round(mix(a[0], b[0], t)),
      Math.round(mix(a[1], b[1], t)),
      Math.round(mix(a[2], b[2], t))
    ];
  }

  function quadraticPoint(start, control, end, t) {
    var inverse = 1 - t;
    return {
      x: inverse * inverse * start.x + 2 * inverse * t * control.x +
        t * t * end.x,
      y: inverse * inverse * start.y + 2 * inverse * t * control.y +
        t * t * end.y
    };
  }

  function imageRect(image) {
    var scale = Math.min(418 / image.width, 304 / image.height);
    var width = image.width * scale;
    var height = image.height * scale;
    return {
      x: CENTER.x - width / 2,
      y: CENTER.y - height / 2,
      width: width,
      height: height
    };
  }

  function createParticles() {
    var rnd = mulberry32(SEED);
    var particles = [];
    for (var i = 0; i < PARTICLE_COUNT; i++) {
      var x = CENTER.x + gaussian(rnd) * 58;
      var y = CENTER.y + gaussian(rnd) * 48;
      var distance = Math.sqrt(
        Math.pow(x - CENTER.x, 2) + Math.pow(y - CENTER.y, 2)
      );
      particles.push({
        start: { x: x, y: y },
        target: { x: CENTER.x, y: CENTER.y },
        targetColor: COLOR.glacier,
        delay: 0.035 + Math.min(1, distance / 135) * 0.12 + rnd() * 0.065,
        size: 0.9 + rnd() * 1.45,
        phase: rnd() * Math.PI * 2
      });
    }
    return particles;
  }

  function pickRibbonParticles(particles, origin) {
    var ranked = particles.map(function (particle, index) {
      var dx = particle.start.x - origin.x;
      var dy = particle.start.y - origin.y;
      return { index: index, distance: dx * dx + dy * dy };
    }).sort(function (a, b) { return a.distance - b.distance; });

    var picked = [];
    ranked.some(function (candidate) {
      var point = particles[candidate.index].start;
      var separated = picked.every(function (index) {
        var other = particles[index].start;
        return Math.hypot(point.x - other.x, point.y - other.y) > 18;
      });
      if (separated) picked.push(candidate.index);
      return picked.length === 3;
    });
    return picked;
  }

  function assignCartoonTargets(image, rect, particles) {
    var sample = document.createElement("canvas");
    sample.width = VW;
    sample.height = VH;
    var ctx = sample.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(image, rect.x, rect.y, rect.width, rect.height);

    var pixels = ctx.getImageData(0, 0, VW, VH).data;
    var candidates = [];
    var x, y, offset;
    for (y = 0; y < VH; y += 2) {
      for (x = 0; x < VW; x += 2) {
        offset = (y * VW + x) * 4;
        if (pixels[offset + 3] > 72) candidates.push(y * VW + x);
      }
    }

    var rnd = mulberry32(SEED ^ 0x1a2b3c4d);
    particles.forEach(function (particle) {
      var index = candidates[Math.floor(rnd() * candidates.length)];
      var tx = index % VW;
      var ty = Math.floor(index / VW);
      var colorOffset = (ty * VW + tx) * 4;
      particle.target = {
        x: tx + (rnd() - 0.5) * 1.8,
        y: ty + (rnd() - 0.5) * 1.8
      };
      particle.targetColor = [
        pixels[colorOffset],
        pixels[colorOffset + 1],
        pixels[colorOffset + 2]
      ];
    });
  }

  function particleState(particle, progress) {
    var settle = smooth(segment(
      progress,
      particle.delay,
      Math.min(0.76, particle.delay + 0.46)
    ));
    return {
      x: mix(particle.start.x, particle.target.x, settle),
      y: mix(particle.start.y, particle.target.y, settle),
      settle: settle
    };
  }

  function cycleProgress(time) {
    var phase = (time % CYCLE_MS) / CYCLE_MS;
    if (phase < 0.11) return 0;
    if (phase < 0.48) return smooth(segment(phase, 0.11, 0.48));
    if (phase < 0.64) return 1;
    if (phase < 0.97) return 1 - smooth(segment(phase, 0.64, 0.97));
    return 0;
  }

  function Scene(canvas) {
    var self = this;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.image = new Image();
    this.agentImages = {};
    this.rect = null;
    this.particles = createParticles();
    this.agentStates = AGENTS.map(function (agent) {
      var width = agent.height * agent.cellAspect;
      var ribbonTip = agent.frameTips[agent.ribbonFrame];
      var approximateTip = {
        x: agent.x + width * ribbonTip.x,
        y: agent.y + agent.height * ribbonTip.y
      };
      return {
        config: agent,
        ribbonParticles: pickRibbonParticles(self.particles, approximateTip)
      };
    });
    this.progress = 0;
    this.motionTime = 0;
    this.lastFrame = 0;
    this.startTime = 0;
    this.raf = null;
    this.visible = false;
    this.manual = false;
    this.ready = false;
    this.reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    this.readyPromise = new Promise(function (resolve) {
      self.resolveReady = resolve;
    });

    var pendingAssets = AGENTS.length + 1;
    function assetSettled() {
      pendingAssets -= 1;
      if (pendingAssets > 0) return;
      self.ready = !!self.rect;
      self.startTime = 0;
      self.draw();
      self.resolveReady(self);
      self.start();
    }

    this.image.onload = function () {
      self.rect = imageRect(self.image);
      assignCartoonTargets(self.image, self.rect, self.particles);
      assetSettled();
    };
    this.image.onerror = function () {
      if (global.console) global.console.error("Could not load " + IMAGE_SRC);
      assetSettled();
    };
    this.image.src = IMAGE_SRC;

    AGENTS.forEach(function (agent) {
      var image = new Image();
      self.agentImages[agent.id] = image;
      image.onload = assetSettled;
      image.onerror = function () {
        self.agentImages[agent.id] = null;
        if (global.console) global.console.error("Could not load " + agent.src);
        assetSettled();
      };
      image.src = agent.src;
    });
  }

  Scene.prototype.resize = function () {
    var rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    var dpr = Math.min(global.devicePixelRatio || 1, 1.5);
    this.canvas.width = Math.round(rect.width * dpr);
    this.canvas.height = Math.round(rect.height * dpr);
    this.ctx.setTransform(
      dpr * rect.width / VW, 0, 0, dpr * rect.height / VH, 0, 0
    );
    this.draw();
  };

  Scene.prototype.drawDenoisingField = function (progress) {
    var activity = Math.sin(Math.PI * progress);
    if (activity <= 0.015) return;

    var ctx = this.ctx;
    var radius = mix(134, 92, smooth(progress));
    ctx.save();
    ctx.translate(CENTER.x, CENTER.y);
    ctx.scale(1.18, 0.88);
    ctx.setLineDash([2, 9]);
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(COLOR.glacier, activity * 0.30);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.66, 0, Math.PI * 2);
    ctx.strokeStyle = rgba(COLOR.rose, activity * 0.22);
    ctx.stroke();
    ctx.restore();
  };

  Scene.prototype.drawFlows = function (progress) {
    var activity = Math.sin(Math.PI * progress);
    if (activity <= 0.02) return;

    var ctx = this.ctx;
    ctx.lineCap = "round";
    for (var i = 0; i < this.particles.length; i += 4) {
      var particle = this.particles[i];
      var state = particleState(particle, progress);
      var moving = Math.sin(Math.PI * state.settle);
      if (moving <= 0.07) continue;
      var dx = particle.target.x - state.x;
      var dy = particle.target.y - state.y;
      var length = Math.sqrt(dx * dx + dy * dy) || 1;
      var trail = Math.min(1, 19 / length);

      ctx.beginPath();
      ctx.moveTo(state.x, state.y);
      ctx.lineTo(state.x + dx * trail, state.y + dy * trail);
      ctx.strokeStyle = rgba(particle.targetColor, activity * moving * 0.34);
      ctx.lineWidth = 1.05;
      ctx.stroke();
    }
  };

  Scene.prototype.agentPose = function (agentState) {
    var agent = agentState.config;
    var image = this.agentImages[agent.id];
    var frameCount = agent.frameTips.length;
    var frameIndex = this.reduced ? agent.restFrame :
      Math.floor(this.motionTime / agent.frameMs + agent.frameOffset) % frameCount;
    var sourceWidth = image && image.naturalWidth ?
      image.naturalWidth / frameCount : 0;
    var width = agent.height * agent.cellAspect;
    var hover = Math.sin(this.motionTime / 820 + agent.swingPhase) * 0.7;
    var frameTip = agent.frameTips[frameIndex];
    return {
      x: agent.x,
      y: agent.y + hover,
      width: width,
      height: agent.height,
      sourceX: frameIndex * sourceWidth,
      sourceWidth: sourceWidth,
      frameIndex: frameIndex,
      tip: {
        x: agent.x + width * frameTip.x,
        y: agent.y + hover + agent.height * frameTip.y
      }
    };
  };

  Scene.prototype.drawAgentRibbons = function (progress) {
    var self = this;
    var ctx = this.ctx;
    var transition = Math.sin(Math.PI * progress);
    var activity = mix(0.34, 0.18, smooth(progress)) + transition * 0.52;
    if (activity <= 0.03) return;

    this.agentStates.forEach(function (agentState) {
      var agent = agentState.config;
      var image = self.agentImages[agent.id];
      if (!image || !image.naturalWidth) return;
      var pose = self.agentPose(agentState);
      agentState.ribbonParticles.forEach(function (particleIndex, ribbonIndex) {
        var state = particleState(self.particles[particleIndex], progress);
        var direction = agent.id === "blue" ? 1 : -1;
        var control = {
          x: (pose.tip.x + state.x) / 2 + direction * (ribbonIndex - 1) * 7,
          y: (pose.tip.y + state.y) / 2 - direction * (ribbonIndex - 1) * 8
        };
        var gradient = ctx.createLinearGradient(
          pose.tip.x, pose.tip.y, state.x, state.y
        );
        gradient.addColorStop(0, rgba(agent.accent, activity * 0.92));
        gradient.addColorStop(1, rgba(agent.accent, activity * 0.18));

        ctx.beginPath();
        ctx.moveTo(pose.tip.x, pose.tip.y);
        ctx.quadraticCurveTo(control.x, control.y, state.x, state.y);
        ctx.strokeStyle = rgba(agent.accent, activity * 0.16);
        ctx.lineWidth = 4.2;
        ctx.lineCap = "round";
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(pose.tip.x, pose.tip.y);
        ctx.quadraticCurveTo(control.x, control.y, state.x, state.y);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 1.15;
        ctx.stroke();

        var pulseProgress = (self.motionTime / 1050 + ribbonIndex * 0.29) % 1;
        var pulse = quadraticPoint(pose.tip, control, state, pulseProgress);
        ctx.beginPath();
        ctx.arc(pulse.x, pulse.y, 1.25, 0, Math.PI * 2);
        ctx.fillStyle = rgba(agent.accent, activity * 0.95);
        ctx.fill();
      });
    });
  };

  Scene.prototype.drawAgents = function () {
    var self = this;
    this.agentStates.forEach(function (agentState) {
      var agent = agentState.config;
      var image = self.agentImages[agent.id];
      if (!image || !image.naturalWidth) return;
      var pose = self.agentPose(agentState);
      self.ctx.save();
      self.ctx.globalAlpha = 0.97;
      self.ctx.drawImage(
        image,
        pose.sourceX,
        0,
        pose.sourceWidth,
        image.naturalHeight,
        pose.x,
        pose.y,
        pose.width,
        pose.height
      );
      self.ctx.restore();
    });
  };

  Scene.prototype.drawWandTipCaps = function (progress) {
    var self = this;
    var ctx = this.ctx;
    var transition = Math.sin(Math.PI * progress);
    var activity = mix(0.52, 0.34, smooth(progress)) + transition * 0.38;

    this.agentStates.forEach(function (agentState) {
      var agent = agentState.config;
      var image = self.agentImages[agent.id];
      if (!image || !image.naturalWidth) return;
      var pose = self.agentPose(agentState);
      var glow = ctx.createRadialGradient(
        pose.tip.x, pose.tip.y, 0.4, pose.tip.x, pose.tip.y, 5.4
      );
      glow.addColorStop(0, rgba(agent.accent, activity));
      glow.addColorStop(0.34, rgba(agent.accent, activity * 0.48));
      glow.addColorStop(1, rgba(agent.accent, 0));
      ctx.beginPath();
      ctx.arc(pose.tip.x, pose.tip.y, 5.4, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
      ctx.beginPath();
      ctx.arc(pose.tip.x, pose.tip.y, 1.15, 0, Math.PI * 2);
      ctx.fillStyle = rgba(agent.accent, Math.min(1, activity + 0.22));
      ctx.fill();
    });
  };

  Scene.prototype.drawParticles = function (progress) {
    var ctx = this.ctx;
    var cartoonAlpha = smooth(segment(progress, 0.48, 0.91));

    this.particles.forEach(function (particle) {
      var state = particleState(particle, progress);
      var color = blendColor(COLOR.noise, particle.targetColor, state.settle);
      var shimmer = 0.88 + Math.sin(particle.phase) * 0.12;
      var alpha = mix(0.60 * shimmer, 0.72, state.settle) *
        (1 - cartoonAlpha * 0.94);
      var radius = particle.size * mix(0.92, 1.18, state.settle) * 1.5;

      ctx.beginPath();
      ctx.arc(state.x, state.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = rgba(color, alpha);
      ctx.fill();
    });
  };

  Scene.prototype.drawCartoon = function (progress) {
    if (!this.ready || !this.rect) return;
    var alpha = smooth(segment(progress, 0.48, 0.91));
    if (alpha <= 0) return;

    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    this.ctx.drawImage(
      this.image,
      this.rect.x,
      this.rect.y,
      this.rect.width,
      this.rect.height
    );
    this.ctx.restore();
  };

  Scene.prototype.draw = function () {
    if (!this.canvas.width) return;
    this.ctx.clearRect(0, 0, VW, VH);
    this.drawAgentRibbons(this.progress);
    this.drawDenoisingField(this.progress);
    this.drawFlows(this.progress);
    this.drawAgents();
    this.drawWandTipCaps(this.progress);
    this.drawParticles(this.progress);
    this.drawCartoon(this.progress);
  };

  Scene.prototype.tick = function (timestamp) {
    var self = this;
    if (!this.visible || this.manual || this.reduced || document.hidden || !this.ready) {
      this.raf = null;
      return;
    }
    if (!this.startTime) this.startTime = timestamp;
    if (timestamp - this.lastFrame >= FPS_MS) {
      this.lastFrame = timestamp;
      this.motionTime = timestamp - this.startTime;
      this.progress = cycleProgress(this.motionTime);
      this.draw();
    }
    this.raf = global.requestAnimationFrame(function (time) { self.tick(time); });
  };

  Scene.prototype.start = function () {
    var self = this;
    if (this.raf || this.manual || this.reduced || !this.visible ||
        document.hidden || !this.ready) return;
    this.raf = global.requestAnimationFrame(function (time) { self.tick(time); });
  };

  Scene.prototype.stop = function () {
    if (this.raf) global.cancelAnimationFrame(this.raf);
    this.raf = null;
  };

  Scene.prototype.setProgress = function (progress) {
    this.manual = true;
    this.stop();
    this.progress = clamp01(progress);
    this.motionTime = this.progress * CYCLE_MS;
    this.draw();
  };

  Scene.prototype.resume = function () {
    this.manual = false;
    this.startTime = 0;
    this.start();
  };

  Scene.prototype.frameData = function (progress, width, height, time) {
    var previous = {
      canvas: this.canvas,
      ctx: this.ctx,
      progress: this.progress,
      motionTime: this.motionTime
    };
    var canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d");
    this.ctx.setTransform(width / VW, 0, 0, height / VH, 0, 0);
    this.progress = clamp01(progress);
    this.motionTime = time || 0;
    this.draw();
    var data = canvas.toDataURL("image/png");
    this.canvas = previous.canvas;
    this.ctx = previous.ctx;
    this.progress = previous.progress;
    this.motionTime = previous.motionTime;
    return data;
  };

  function exportFrames(scene) {
    var frameCount = 104;
    var batchSize = 8;
    var batch = [];
    scene.manual = true;
    scene.stop();

    for (var frame = 0; frame < frameCount; frame++) {
      batch.push(scene.frameData(
        cycleProgress(frame / frameCount * CYCLE_MS), VW, VH,
        frame / frameCount * CYCLE_MS
      ));
      if (batch.length === batchSize || frame === frameCount - 1) {
        var payload = document.createElement("textarea");
        payload.className = "protein-denoise-export-batch";
        payload.setAttribute("aria-hidden", "true");
        payload.style.cssText =
          "position:fixed;left:0;top:0;width:1px;height:1px;opacity:.01;pointer-events:none";
        payload.textContent = JSON.stringify(batch);
        document.body.appendChild(payload);
        batch = [];
      }
    }
    document.body.dataset.proteinExportReady = "true";
  }

  global.initProteinDenoise = function (canvas) {
    if (!canvas || !canvas.getContext) return null;
    var scene = new Scene(canvas);
    scene.resize();

    var fixedProgress = null;
    if (global.location && global.location.search) {
      var match = global.location.search.match(/[?&]protein-progress=([0-9.]+)/);
      if (match) fixedProgress = Number(match[1]);
    }

    if (fixedProgress !== null && isFinite(fixedProgress)) {
      scene.setProgress(fixedProgress);
    } else if (scene.reduced) {
      scene.progress = 1;
    } else if ("IntersectionObserver" in global) {
      var observer = new IntersectionObserver(function (entries) {
        scene.visible = entries[0].isIntersecting;
        if (scene.visible) scene.start();
        else scene.stop();
      }, { threshold: 0.05 });
      observer.observe(canvas);
    } else {
      scene.visible = true;
    }

    var resizeTimer;
    global.addEventListener("resize", function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () { scene.resize(); }, 120);
    });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) scene.stop();
      else scene.start();
    });

    if (global.location &&
        /[?&]export-protein-denoise=1(?:&|$)/.test(global.location.search)) {
      scene.readyPromise.then(function () { exportFrames(scene); });
    }

    global.__proteinDenoise = scene;
    return scene;
  };
})(window);
