/* ===========================================================================
   site.js
   Renders the page from contents/site.<lang>.yml. Nothing here needs editing
   to change what the site says — edit the YAML.
   =========================================================================== */

(function () {
  "use strict";

  var LANGS = ["en", "zh"];
  var STORE_KEY = "dh-lang";
  var state = { lang: "en", data: null };

  /* ── helpers ───────────────────────────────────────────────────────── */

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  /* inline markdown only: **bold**, *em*, `code`, [text](url) */
  if (window.marked && window.marked.use) {
    window.marked.use({ mangle: false, headerIds: false });
  }

  function md(s) {
    if (s == null) return "";
    if (window.marked && window.marked.parseInline) {
      return window.marked.parseInline(String(s).trim());
    }
    return esc(s);
  }

  function get(obj, path) {
    return path.split(".").reduce(function (o, k) {
      return o == null ? undefined : o[k];
    }, obj);
  }

  function el(html) {
    var t = document.createElement("template");
    t.innerHTML = html.trim();
    return t.content;
  }

  var ICONS = {
    mail: '<path d="M2 5h20v14H2z"/><path d="m2.6 6 9.4 6.6L21.4 6"/>',
    doc: '<path d="M6 2.5h8l4.5 4.5v14.5H6z"/><path d="M14 2.5V7h4.5"/><path d="M9 12.5h6M9 16h6"/>',
    github:
      '<path fill="currentColor" stroke="none" d="M12 .5C5.73.5.9 5.33.9 11.6c0 4.9 3.18 9.06 7.6 10.53.56.1.76-.24.76-.53 0-.26-.01-1.13-.02-2.05-3.09.67-3.74-1.31-3.74-1.31-.5-1.29-1.23-1.63-1.23-1.63-1.01-.69.08-.67.08-.67 1.12.08 1.7 1.15 1.7 1.15.99 1.7 2.6 1.21 3.24.93.1-.72.39-1.21.7-1.49-2.47-.28-5.06-1.24-5.06-5.5 0-1.22.43-2.21 1.14-2.99-.11-.28-.5-1.41.11-2.94 0 0 .93-.3 3.05 1.14a10.5 10.5 0 0 1 5.56 0c2.12-1.44 3.05-1.14 3.05-1.14.61 1.53.22 2.66.11 2.94.71.78 1.14 1.77 1.14 2.99 0 4.27-2.6 5.21-5.08 5.49.4.35.76 1.03.76 2.08 0 1.5-.01 2.71-.01 3.08 0 .29.2.64.77.53 4.41-1.48 7.59-5.63 7.59-10.53C23.1 5.33 18.27.5 12 .5Z"/>',
    scholar:
      '<path fill="currentColor" stroke="none" d="M12 13.6 3 7.1 12 .8l9 6.3-9 6.5Z"/><path d="M6.2 11.4v4.3c0 2.1 2.6 3.8 5.8 3.8s5.8-1.7 5.8-3.8v-4.3"/>',
    link: '<path d="M9.5 14.5a4 4 0 0 0 5.7 0l3-3a4 4 0 1 0-5.7-5.7l-1 1"/><path d="M14.5 9.5a4 4 0 0 0-5.7 0l-3 3a4 4 0 1 0 5.7 5.7l1-1"/>',
    linkedin:
      '<path fill="currentColor" stroke="none" d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.86-3.04-1.85 0-2.13 1.45-2.13 2.94v5.67H9.35V9h3.42v1.56h.04c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28ZM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.02H3.56V9h3.56v11.45ZM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0Z"/>'
  };

  function icon(name) {
    var d = ICONS[name] || ICONS.link;
    return (
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
      'stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ' +
      'aria-hidden="true">' + d + "</svg>"
    );
  }

  /* ── renderers ─────────────────────────────────────────────────────── */

  function bindSimple(data) {
    document.querySelectorAll("[data-bind]").forEach(function (node) {
      var v = get(data, node.getAttribute("data-bind"));
      node.textContent = v == null ? "" : String(v).trim();
    });
    document.querySelectorAll("[data-bind-md]").forEach(function (node) {
      node.innerHTML = md(get(data, node.getAttribute("data-bind-md")));
    });
  }

  function renderActions(actions) {
    var host = document.getElementById("hero-actions");
    host.innerHTML = "";
    (actions || []).forEach(function (a) {
      if (!a.href) return; // an empty url means "not set up yet" — stay hidden
      var cls = "act" + (a.primary ? " act-primary" : "");
      var ext = /^https?:/.test(a.href) ? ' target="_blank" rel="noopener"' : "";
      host.appendChild(
        el('<a class="' + cls + '" href="' + esc(a.href) + '"' + ext + ">" +
          icon(a.icon) + "<span>" + esc(a.text) + "</span></a>")
      );
    });
  }

  function renderLedger(rows) {
    var host = document.getElementById("ledger");
    host.innerHTML = "";
    (rows || []).forEach(function (r) {
      host.appendChild(
        el('<div class="ledger-row"><dt class="ledger-key">' + esc(r.key) +
          '</dt><dd class="ledger-val">' + md(r.value) + "</dd></div>")
      );
    });
  }

  function renderLoopLegend(process) {
    var host = document.getElementById("loop-legend");
    host.innerHTML = "";
    (process.stages || []).forEach(function (s) {
      host.appendChild(
        el('<li><span class="loop-step">' + esc(s.label) +
          '</span><span class="loop-note">' + esc(s.note) + "</span></li>")
      );
    });
  }

  function renderTracks(research) {
    var host = document.getElementById("tracks");
    host.innerHTML = "";

    (research.tracks || []).forEach(function (tr) {
      var cards = (tr.stages || []).map(function (s) {
        var tags = (s.tags || []).map(function (t) {
          return '<span class="tag' + (t.kind === "accent" ? " tag-accent" : "") +
            '">' + esc(t.text) + "</span>";
        });
        if (s.core) {
          tags.unshift('<span class="tag tag-core">' + esc(research.core_label) + "</span>");
        }

        var metrics = (s.metrics || []).map(function (m) {
          return '<div class="metric"><span class="metric-val">' + esc(m.value) +
            '</span><span class="metric-label">' + esc(m.label) + "</span></div>";
        }).join("");

        var contribs = (s.contributions || []).map(function (c) {
          return '<li class="contrib-item"><h4>' + md(c.title) + "</h4><p>" +
            md(c.text) + "</p></li>";
        }).join("");

        return '<article class="pcard' + (s.core ? " pcard-core" : "") +
          '" id="p-' + esc(s.id) + '">' +
            '<h3 class="pcard-title">' + md(s.title) + "</h3>" +
            '<p class="pcard-sub">' + esc(s.subtitle) + "</p>" +
            '<div class="pcard-tags">' + tags.join("") + "</div>" +
            '<div class="qi">' +
              '<div class="qi-block"><span class="qi-label">' + esc(labelQuestion()) +
                '</span><p class="qi-text">' + md(s.question) + "</p></div>" +
              '<div class="qi-block qi-insight"><span class="qi-label">' + esc(labelInsight()) +
                '</span><p class="qi-text">' + md(s.insight) + "</p></div>" +
            "</div>" +
            (metrics ? '<div class="metrics">' + metrics + "</div>" : "") +
            (contribs
              ? '<details class="contrib"><summary>' + esc(research.details_label) +
                '</summary><ul class="contrib-list">' + contribs + "</ul></details>"
              : "") +
          "</article>";
      }).join("");

      host.appendChild(el(
        '<section class="track" id="track-' + esc(tr.id) + '">' +
          '<header class="track-head">' +
            '<span class="track-numeral">' + esc(tr.numeral) + "</span>" +
            '<h3 class="track-label">' + esc(tr.label) + "</h3>" +
            '<p class="track-note">' + md(tr.note) + "</p>" +
          "</header>" +
          '<div class="track-cards">' + cards + "</div>" +
        "</section>"
      ));
    });
  }

  function labelQuestion() { return state.lang === "zh" ? "科学问题" : "Question"; }
  function labelInsight() { return state.lang === "zh" ? "核心洞见" : "Insight"; }

  function renderPubs(pubs) {
    var host = document.getElementById("pubs");
    host.innerHTML = "";

    (pubs.groups || []).forEach(function (g) {
      var items = (g.items || []).map(function (p) {
        var flags = [];
        if (p.status) {
          flags.push('<span class="flag' + (g.kind === "review" ? " flag-review" : "") +
            '">' + esc(p.status) + "</span>");
        }
        if (p.role) {
          var first = /first|第一/i.test(p.role);
          flags.push('<span class="flag' + (first ? " flag-first" : "") + '">' +
            esc(p.role) + "</span>");
        }
        if (p.doi) {
          flags.push('<a class="doi" href="https://doi.org/' + esc(p.doi) +
            '" target="_blank" rel="noopener">doi:' + esc(p.doi) + "</a>");
        }
        return '<li class="pub"><div class="pub-body">' +
          '<p class="pub-title">' + md(p.title) + "</p>" +
          '<p class="pub-meta">' + md(p.authors) +
            (p.venue ? " · " + md(p.venue) : "") + "</p>" +
          (flags.length ? '<div class="pub-flags">' + flags.join("") + "</div>" : "") +
          "</div></li>";
      }).join("");

      host.appendChild(el(
        "<div><h3 class=\"pubgroup-label\">" + esc(g.label) + "</h3>" +
        '<ol class="publist">' + items + "</ol></div>"
      ));
    });
  }

  function renderPositions(list) {
    var host = document.getElementById("positions");
    host.innerHTML = "";

    (list || []).forEach(function (p) {
      var logo = p.logo_image
        ? '<img src="' + esc(p.logo_image) + '" alt="" />'
        : p.logo_text
          ? '<span class="logo-word" style="color:' + esc(p.logo_color || "#5b6763") + '">' +
            esc(p.logo_text) + "</span>"
          : "";

      var bullets = (p.bullets || []).map(function (b) {
        return "<li>" + md(b) + "</li>";
      }).join("");

      host.appendChild(el(
        '<article class="pos">' +
          '<div class="pos-period">' + esc(p.period) + "</div>" +
          '<div class="pos-logo">' + logo + "</div>" +
          "<div>" +
            '<h3 class="pos-org">' + esc(p.org) + "</h3>" +
            '<p class="pos-role">' + esc(p.role) + "</p>" +
            '<p class="pos-unit">' + esc(p.unit) + "</p>" +
            (p.people ? '<p class="pos-people">' + esc(p.people) + "</p>" : "") +
            (bullets ? '<ul class="pos-bullets">' + bullets + "</ul>" : "") +
          "</div>" +
        "</article>"
      ));
    });
  }

  function renderSidecards(bg) {
    var host = document.getElementById("sidecards");
    host.innerHTML = "";

    var chipsets = (bg.toolkit.groups || []).map(function (g) {
      var chips = (g.items || []).map(function (it) {
        var text = typeof it === "string" ? it : it.text;
        var ic = typeof it === "string" ? "" : it.icon;
        var mark = (ic && window.BRAND_ICONS && window.BRAND_ICONS[ic]) || "";
        return '<span class="chip">' + mark + esc(text) + "</span>";
      }).join("");
      return '<div class="chipset"><span class="chipset-label">' + esc(g.label) +
        '</span><div class="chips">' + chips + "</div></div>";
    }).join("");

    host.appendChild(el(
      '<div><h3 class="card-label">' + esc(bg.toolkit.label) + "</h3>" + chipsets + "</div>"
    ));

    var awards = (bg.awards.items || []).map(function (a) {
      return "<li><span class=\"award-text\">" + md(a.text) +
        '</span><span class="award-org">' + esc(a.org) + "</span></li>";
    }).join("");

    host.appendChild(el(
      "<div>" +
        '<h3 class="card-label">' + esc(bg.awards.label) + "</h3>" +
        '<ul class="awardlist">' + awards + "</ul>" +
        '<h3 class="card-label" style="margin-top:32px">' + esc(bg.languages.label) + "</h3>" +
        '<p class="plain-text">' + md(bg.languages.text) + "</p>" +
      "</div>"
    ));
  }

  function renderMisc(data) {
    document.title = data.meta.title;
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", String(data.meta.description).trim());

    var portrait = document.getElementById("portrait");
    if (portrait) portrait.alt = String(data.hero.portrait_alt || data.hero.name).trim();

    var mail = document.getElementById("contact-mail");
    mail.href = "mailto:" + data.contact.email;
    mail.textContent = data.contact.email;

    document.getElementById("footer-copy").textContent =
      "© " + data.hero.name + " " + new Date().getFullYear();

    var toggle = document.getElementById("lang-toggle");
    toggle.setAttribute("aria-label", String(data.meta.switch_hint).trim());
    toggle.setAttribute("title", String(data.meta.switch_hint).trim());
  }

  /* ── boot ──────────────────────────────────────────────────────────── */

  function render(data) {
    state.data = data;
    data.brand = data.hero.name;
    bindSimple(data);
    renderActions(data.hero.actions);
    renderLoopLegend(data.process);
    renderLedger(data.ledger);
    renderTracks(data.research);
    renderPubs(data.publications);
    renderPositions(data.background.positions);
    renderSidecards(data.background);
    renderMisc(data);
    watchSections();
  }

  function load(lang) {
    return fetch("contents/site." + lang + ".yml", { cache: "no-cache" })
      .then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
      })
      .then(function (text) {
        return window.jsyaml.load(text);
      });
  }

  function setLang(lang, push) {
    if (LANGS.indexOf(lang) === -1) lang = "en";
    state.lang = lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.documentElement.setAttribute("data-lang", lang);
    try { localStorage.setItem(STORE_KEY, lang); } catch (e) { /* private mode */ }

    return load(lang).then(render).catch(function (err) {
      document.getElementById("ledger").innerHTML =
        '<p class="ledger-val">Could not load <code>contents/site.' + lang +
        '.yml</code> (' + esc(err.message) + '). Serve this folder over HTTP — ' +
        'opening index.html directly from disk blocks the fetch.</p>';
    });
  }

  var navObserver = null;

  function watchSections() {
    if (navObserver) navObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;

    var links = {};
    document.querySelectorAll(".topnav a").forEach(function (a) {
      links[a.getAttribute("href").slice(1)] = a;
    });

    navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var a = links[e.target.id];
        if (a && e.isIntersecting) {
          Object.keys(links).forEach(function (k) { links[k].classList.remove("is-active"); });
          a.classList.add("is-active");
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Object.keys(links).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navObserver.observe(s);
    });
  }

  function init() {
    var stored = null;
    try { stored = localStorage.getItem(STORE_KEY); } catch (e) { /* ignore */ }
    var initial = stored ||
      (/^zh/i.test(navigator.language || "") ? "zh" : "en");

    setLang(initial);

    document.getElementById("lang-toggle").addEventListener("click", function () {
      setLang(state.lang === "en" ? "zh" : "en");
    });

    var bar = document.getElementById("topbar");
    var onScroll = function () {
      bar.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (window.initLatentSearch) {
      window.initLatentSearch(document.getElementById("loop-canvas"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
