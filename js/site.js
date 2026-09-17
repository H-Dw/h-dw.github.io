/* ===========================================================================
   site.js
   Renders the page from contents/site.<lang>.yml. Nothing here needs editing
   to change what the site says — edit the YAML.
   =========================================================================== */

(function () {
  "use strict";

  var LANGS = ["en", "zh"];
  var state = {
    lang: "zh",
    data: null,
    galleries: {},
    lightbox: { projectId: null, index: 0, opener: null }
  };

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
    download: '<path d="M12 3v12"/><path d="m7.5 10.5 4.5 4.5 4.5-4.5"/><path d="M4 20h16"/>',
    expand: '<path d="M8.5 3H3v5.5M15.5 3H21v5.5M21 15.5V21h-5.5M3 15.5V21h5.5"/>',
    // Chevron geometry follows Lucide Icons' 24 px grid (ISC License).
    chevronLeft: '<path d="m15 18-6-6 6-6"/>',
    chevronRight: '<path d="m9 18 6-6-6-6"/>',
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
    document.querySelectorAll("[data-bind-aria-label]").forEach(function (node) {
      var v = get(data, node.getAttribute("data-bind-aria-label"));
      node.setAttribute("aria-label", v == null ? "" : String(v).trim());
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

  function renderTracks(research) {
    var host = document.getElementById("tracks");
    host.innerHTML = "";
    var questionOpen = !window.matchMedia("(max-width: 760px)").matches;

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

        var caseResults = "";
        if (s.case_results && (s.case_results.items || []).length) {
          var caseItems = s.case_results.items.map(function (item, index) {
            return '<article class="case-result">' +
              '<header class="case-result-head"><span class="case-result-index">' +
                pad2(index + 1) + '</span><span class="case-result-task">' +
                esc(item.task) + "</span></header>" +
              '<h4 class="case-result-target">' + esc(item.target) + "</h4>" +
              '<p class="case-result-outcome">' + esc(item.outcome) + "</p>" +
              '<p class="case-result-evidence"><span aria-hidden="true"></span>' +
                esc(item.evidence) + "</p>" +
            "</article>";
          }).join("");

          caseResults = '<section class="case-results" aria-label="' +
            esc(s.case_results.label) + '">' +
              '<header class="case-results-head"><span class="case-results-label">' +
                esc(s.case_results.label) + '</span><span class="case-results-summary">' +
                esc(s.case_results.summary) + "</span></header>" +
              '<div class="case-results-grid">' + caseItems + "</div>" +
            "</section>";
        }

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
              '<details class="question-disclosure"' + (questionOpen ? " open" : "") + '>' +
                '<summary><span class="qi-label">' + esc(labelQuestion()) + "</span></summary>" +
                '<p class="qi-text question-text">' + md(s.question) + "</p>" +
              "</details>" +
              '<div class="qi-block qi-insight"><span class="qi-label">' + esc(labelInsight()) +
                '</span><p class="qi-text">' + md(s.insight) + "</p></div>" +
            "</div>" +
            (metrics ? '<div class="metrics">' + metrics + "</div>" : "") +
            caseResults +
            (contribs
              ? '<details class="contrib"><summary>' + esc(research.details_label) +
                '</summary><ul class="contrib-list">' + contribs + "</ul></details>"
              : "") +
          "</article>";
      }).join("");

      host.appendChild(el(
        '<section class="track track--' + esc(tr.id) + '" id="track-' + esc(tr.id) + '">' +
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

  function pad2(n) {
    return String(n).padStart(2, "0");
  }

  function renderProjects(projects) {
    var host = document.getElementById("project-cases");
    var ui = projects.ui || {};
    host.innerHTML = "";
    state.galleries = {};

    var dialog = document.getElementById("demo-lightbox");
    if (dialog && dialog.open) dialog.close();

    (projects.items || []).forEach(function (project) {
      var gallery = project.gallery || [];
      state.galleries[project.id] = {
        project: project,
        gallery: gallery,
        index: 0
      };

      var facts = (project.facts || []).map(function (fact) {
        return '<div class="project-fact"><dt>' + esc(fact.label) +
          '</dt><dd>' + md(fact.value) + "</dd></div>";
      }).join("");

      var tags = (project.tags || []).map(function (tag) {
        return '<span class="project-tag">' + esc(tag) + "</span>";
      }).join("");

      var download = "";
      if (project.download && project.download.href) {
        var href = project.download.href;
        var isExternal = /^https?:/i.test(href);
        var attrs = isExternal
          ? ' target="_blank" rel="noopener"'
          : " download" + (project.download.filename
            ? '="' + esc(project.download.filename) + '"'
            : "");
        download = '<a class="project-download" href="' + esc(href) + '"' + attrs + ">" +
          icon("download") + "<span>" + esc(project.download.label) + "</span></a>";
      }

      var thumbnails = gallery.map(function (image, index) {
        var portrait = Number(image.height) > Number(image.width) ? " is-portrait" : "";
        return '<button class="demo-thumb' + portrait + (index === 0 ? " is-active" : "") +
          '" type="button" data-gallery-select="' + esc(project.id) +
          '" data-index="' + index + '" aria-current="' + (index === 0 ? "true" : "false") +
          '" aria-label="' + esc((index + 1) + " / " + gallery.length + ": " + image.caption) + '">' +
            '<span class="demo-thumb-index">' + pad2(index + 1) + "</span>" +
            '<span class="demo-thumb-image"><img src="' + esc(image.src) + '" alt="" width="' +
              esc(image.width) + '" height="' + esc(image.height) +
              '" loading="lazy" decoding="async" /></span>' +
            '<span class="demo-thumb-caption">' + esc(image.caption) + "</span>" +
          "</button>";
      }).join("");

      var galleryMarkup = "";
      if (gallery.length) {
        var first = gallery[0];
        galleryMarkup = '<details class="demo-disclosure">' +
          '<summary class="demo-disclosure-summary">' +
            '<span class="demo-disclosure-copy">' +
              '<span class="demo-disclosure-closed">' +
                esc(ui.show_gallery || "Show result gallery") + "</span>" +
              '<span class="demo-disclosure-open">' +
                esc(ui.hide_gallery || "Hide result gallery") + "</span>" +
            "</span>" +
            '<span class="demo-disclosure-count">' + gallery.length + " " +
              esc(ui.screenshots_label || "screenshots") + "</span>" +
            '<span class="demo-disclosure-icon" aria-hidden="true"></span>' +
          "</summary>" +
          '<div class="demo-gallery" role="region" aria-roledescription="carousel" data-gallery-id="' + esc(project.id) +
            '" aria-label="' + esc(ui.gallery_label + " · " + project.name) + '">' +
            '<div class="demo-stage">' +
              '<button class="demo-stage-button" type="button" data-gallery-open="' +
                esc(project.id) + '" aria-label="' + esc(ui.expand + ": " + first.caption) + '">' +
                '<span class="demo-stage-image"><img class="demo-stage-img" src="' +
                  esc(first.src) + '" alt="' + esc(first.alt) + '" width="' + esc(first.width) +
                  '" height="' + esc(first.height) +
                  '" loading="lazy" decoding="async" /></span>' +
                '<span class="demo-expand">' + icon("expand") + "<span>" +
                  esc(ui.expand) + "</span></span>" +
              "</button>" +
              '<button class="demo-stage-nav demo-stage-prev" type="button" data-gallery-step="' +
                esc(project.id) + '" data-delta="-1" aria-label="' +
                esc((ui.previous || "Previous image") + ": " + project.name) + '">' +
                icon("chevronLeft") + "</button>" +
              '<button class="demo-stage-nav demo-stage-next" type="button" data-gallery-step="' +
                esc(project.id) + '" data-delta="1" aria-label="' +
                esc((ui.next || "Next image") + ": " + project.name) + '">' +
                icon("chevronRight") + "</button>" +
            "</div>" +
            '<div class="demo-stage-meta" aria-live="polite" aria-atomic="true"><span class="demo-stage-count">01 / ' +
              pad2(gallery.length) + '</span><p class="demo-stage-caption">' +
              esc(first.caption) + "</p></div>" +
            '<div class="demo-thumbs" role="group" aria-label="' + esc(ui.gallery_label) + '">' +
              thumbnails + "</div>" +
          "</div>" +
        "</details>";
      }

      host.appendChild(el(
        '<article class="project-case project-case--' + esc(project.id) + '" id="project-' +
          esc(project.id) + '">' +
          '<header class="project-case-head">' +
            '<div class="project-title-block">' +
              '<div class="project-kicker"><span class="project-number">' +
                esc(project.number) + '</span><span class="project-badge">' +
                esc(project.badge) + "</span></div>" +
              '<h3 class="project-name">' + esc(project.name) + "</h3>" +
              '<p class="project-subtitle">' + esc(project.subtitle) + "</p>" +
              '<p class="project-summary">' + md(project.summary) + "</p>" +
              '<div class="project-tags">' + tags + "</div>" +
              download +
            "</div>" +
            '<dl class="project-facts">' + facts + "</dl>" +
          "</header>" +
          galleryMarkup +
        "</article>"
      ));
    });

    var closeButton = document.getElementById("demo-lightbox-close");
    var prevButton = document.getElementById("demo-lightbox-prev");
    var nextButton = document.getElementById("demo-lightbox-next");
    closeButton.setAttribute("aria-label", ui.close || "Close");
    prevButton.setAttribute("aria-label", ui.previous || "Previous image");
    nextButton.setAttribute("aria-label", ui.next || "Next image");
    prevButton.innerHTML = icon("chevronLeft");
    nextButton.innerHTML = icon("chevronRight");
  }

  function selectGalleryImage(projectId, index) {
    var record = state.galleries[projectId];
    if (!record || !record.gallery.length) return;
    var length = record.gallery.length;
    var nextIndex = ((Number(index) % length) + length) % length;
    var image = record.gallery[nextIndex];
    var host = document.querySelector('[data-gallery-id="' + projectId + '"]');
    if (!host) return;

    record.index = nextIndex;
    var stageImage = host.querySelector(".demo-stage-img");
    stageImage.src = image.src;
    stageImage.alt = image.alt;
    stageImage.width = image.width;
    stageImage.height = image.height;
    host.querySelector(".demo-stage-button").setAttribute(
      "aria-label",
      (state.data.projects.ui.expand || "View full size") + ": " + image.caption
    );
    host.querySelector(".demo-stage-count").textContent =
      pad2(nextIndex + 1) + " / " + pad2(length);
    host.querySelector(".demo-stage-caption").textContent = image.caption;
    host.querySelectorAll(".demo-thumb").forEach(function (thumb, thumbIndex) {
      var active = thumbIndex === nextIndex;
      thumb.classList.toggle("is-active", active);
      thumb.setAttribute("aria-current", active ? "true" : "false");
    });
  }

  function syncLightbox() {
    var record = state.galleries[state.lightbox.projectId];
    if (!record || !record.gallery.length) return;
    var length = record.gallery.length;
    state.lightbox.index = ((state.lightbox.index % length) + length) % length;
    var image = record.gallery[state.lightbox.index];
    var lightboxImage = document.getElementById("demo-lightbox-image");

    lightboxImage.src = image.src;
    lightboxImage.alt = image.alt;
    lightboxImage.width = image.width;
    lightboxImage.height = image.height;
    document.getElementById("demo-lightbox-caption").textContent = image.caption;
    document.getElementById("demo-lightbox-count").textContent =
      pad2(state.lightbox.index + 1) + " / " + pad2(length) + " · " + record.project.name;
    document.getElementById("demo-lightbox-prev").hidden = length < 2;
    document.getElementById("demo-lightbox-next").hidden = length < 2;
  }

  function openLightbox(projectId, opener) {
    var record = state.galleries[projectId];
    if (!record || !record.gallery.length) return;
    var dialog = document.getElementById("demo-lightbox");
    if (typeof dialog.showModal !== "function") {
      window.open(record.gallery[record.index].src, "_blank", "noopener");
      return;
    }

    state.lightbox.projectId = projectId;
    state.lightbox.index = record.index;
    state.lightbox.opener = opener || null;
    dialog.setAttribute("aria-label", state.data.projects.ui.gallery_label + " · " +
      record.project.name);
    syncLightbox();
    dialog.showModal();
    document.getElementById("demo-lightbox-close").focus();
  }

  function stepLightbox(delta) {
    state.lightbox.index += delta;
    syncLightbox();
    selectGalleryImage(state.lightbox.projectId, state.lightbox.index);
  }

  function renderPubs(pubs) {
    var host = document.getElementById("pubs");
    host.innerHTML = "";

    (pubs.groups || []).forEach(function (g) {
      var items = (g.items || []).map(function (p) {
        var isOverview = !!p.summary;
        var heading = p.summary || p.title || "";
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
          (isOverview
            ? '<p class="pub-title-context"><span>' + esc(pubs.overview_label) + "</span></p>"
            : "") +
          '<p class="pub-title' + (isOverview ? " pub-title--overview" : "") + '">' +
            md(heading) + "</p>" +
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
          '<div class="pos-identity">' +
            '<h3 class="pos-org">' + esc(p.org) + "</h3>" +
            '<p class="pos-role">' + esc(p.role) + "</p>" +
            '<p class="pos-unit' + (p.unit_role_size ? " pos-unit--role-size" : "") +
              '">' + esc(p.unit) + "</p>" +
          "</div>" +
          '<div class="pos-details">' +
            (p.people ? '<p class="pos-people' +
              (p.people_unit_size ? " pos-people--unit-size" : "") + '">' +
              esc(p.people) + "</p>" : "") +
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

    var awards = (bg.awards.items || []).map(function (a) {
      return "<li><span class=\"award-text\">" + md(a.text) +
        '</span><span class="award-org">' + esc(a.org) + "</span></li>";
    }).join("");

    host.appendChild(el(
      '<div class="sidecard sidecard-awards">' +
        '<h3 class="card-label">' + esc(bg.awards.label) + "</h3>" +
        '<ul class="awardlist">' + awards + "</ul>" +
        '<h3 class="card-label" style="margin-top:32px">' + esc(bg.languages.label) + "</h3>" +
        '<p class="plain-text">' + md(bg.languages.text) + "</p>" +
      "</div>"
    ));

    host.appendChild(el(
      '<div class="sidecard sidecard-toolkit"><h3 class="card-label">' +
        esc(bg.toolkit.label) + "</h3>" + chipsets + "</div>"
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
    mail.innerHTML = '<span class="contact-mail-icon">' + icon("mail") +
      '</span><span class="contact-mail-label">' +
      esc(data.contact.email_label || "Email") + '</span><span class="contact-mail-address">' +
      esc(data.contact.email) + "</span>";

    document.getElementById("footer-copy").textContent =
      "© " + data.hero.name + " " + new Date().getFullYear();

    var toggle = document.getElementById("lang-toggle");
    toggle.setAttribute("aria-label", String(data.meta.switch_hint).trim());
    toggle.setAttribute("title", String(data.meta.switch_hint).trim());

    var navLabel = state.lang === "zh" ? "页面导航" : "Page navigation";
    document.querySelectorAll(".topnav, .mobile-nav").forEach(function (nav) {
      nav.setAttribute("aria-label", navLabel);
    });

    var menuToggle = document.getElementById("nav-toggle");
    var menuText = state.lang === "zh" ? "目录" : "Menu";
    menuToggle.querySelector(".nav-toggle-label").textContent = menuText;
    menuToggle.setAttribute("aria-label", menuText);
    menuToggle.setAttribute("title", menuText);
  }

  /* ── boot ──────────────────────────────────────────────────────────── */

  function render(data) {
    state.data = data;
    data.brand = data.hero.name;
    bindSimple(data);
    renderActions(data.hero.actions);
    renderTracks(data.research);
    renderProjects(data.projects || {});
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
    if (LANGS.indexOf(lang) === -1) lang = "zh";
    state.lang = lang;
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
    document.documentElement.setAttribute("data-lang", lang);

    return load(lang).then(render).catch(function (err) {
      if (window.console) {
        window.console.error("Could not load contents/site." + lang +
          ".yml (" + err.message + ")");
      }
    });
  }

  var navObserver = null;

  function watchSections() {
    if (navObserver) navObserver.disconnect();
    if (!("IntersectionObserver" in window)) return;

    var links = {};
    document.querySelectorAll(".topnav a, .mobile-nav a").forEach(function (a) {
      var id = a.getAttribute("href").slice(1);
      if (!links[id]) links[id] = [];
      links[id].push(a);
    });

    navObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var activeLinks = links[e.target.id];
        if (activeLinks && e.isIntersecting) {
          Object.keys(links).forEach(function (k) {
            links[k].forEach(function (a) { a.classList.remove("is-active"); });
          });
          activeLinks.forEach(function (a) { a.classList.add("is-active"); });
        }
      });
    }, { rootMargin: "-45% 0px -50% 0px" });

    Object.keys(links).forEach(function (id) {
      var s = document.getElementById(id);
      if (s) navObserver.observe(s);
    });
  }

  function setMenu(open, restoreFocus) {
    var toggle = document.getElementById("nav-toggle");
    var menu = document.getElementById("mobile-nav");
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    menu.hidden = !open;
    document.getElementById("topbar").classList.toggle("menu-open", open);
    if (!open && restoreFocus) toggle.focus();
  }

  function syncQuestionDisclosures() {
    var open = !window.matchMedia("(max-width: 760px)").matches;
    document.querySelectorAll(".question-disclosure").forEach(function (details) {
      details.open = open;
    });
  }

  function init() {
    var initial = "zh";

    setLang(initial);

    var projectHost = document.getElementById("project-cases");
    projectHost.addEventListener("click", function (event) {
      var selectButton = event.target.closest && event.target.closest("[data-gallery-select]");
      if (selectButton) {
        selectGalleryImage(
          selectButton.getAttribute("data-gallery-select"),
          selectButton.getAttribute("data-index")
        );
        return;
      }

      var stepButton = event.target.closest && event.target.closest("[data-gallery-step]");
      if (stepButton) {
        var projectId = stepButton.getAttribute("data-gallery-step");
        var record = state.galleries[projectId];
        if (record) {
          selectGalleryImage(projectId, record.index + Number(stepButton.getAttribute("data-delta")));
        }
        return;
      }

      var openButton = event.target.closest && event.target.closest("[data-gallery-open]");
      if (openButton) {
        openLightbox(openButton.getAttribute("data-gallery-open"), openButton);
      }
    });

    var lightbox = document.getElementById("demo-lightbox");
    document.getElementById("demo-lightbox-close").addEventListener("click", function () {
      lightbox.close();
    });
    document.getElementById("demo-lightbox-prev").addEventListener("click", function () {
      stepLightbox(-1);
    });
    document.getElementById("demo-lightbox-next").addEventListener("click", function () {
      stepLightbox(1);
    });
    lightbox.addEventListener("click", function (event) {
      if (event.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("keydown", function (event) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        stepLightbox(-1);
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        stepLightbox(1);
      }
    });
    lightbox.addEventListener("close", function () {
      var opener = state.lightbox.opener;
      state.lightbox.projectId = null;
      state.lightbox.opener = null;
      if (opener && opener.isConnected) opener.focus();
    });

    document.getElementById("lang-toggle").addEventListener("click", function () {
      setMenu(false, false);
      setLang(state.lang === "en" ? "zh" : "en");
    });

    document.getElementById("nav-toggle").addEventListener("click", function () {
      var open = this.getAttribute("aria-expanded") !== "true";
      setMenu(open, false);
      if (open) {
        var firstLink = document.querySelector("#mobile-nav a");
        if (firstLink) firstLink.focus();
      }
    });

    document.querySelectorAll("#mobile-nav a").forEach(function (link) {
      link.addEventListener("click", function () { setMenu(false, false); });
    });

    document.addEventListener("keydown", function (event) {
      if (event.key === "Escape" &&
          document.getElementById("nav-toggle").getAttribute("aria-expanded") === "true") {
        setMenu(false, true);
      }
    });

    window.addEventListener("resize", function () {
      if (window.innerWidth > 760) setMenu(false, false);
    }, { passive: true });

    var questionMedia = window.matchMedia("(max-width: 760px)");
    if (questionMedia.addEventListener) {
      questionMedia.addEventListener("change", syncQuestionDisclosures);
    } else if (questionMedia.addListener) {
      questionMedia.addListener(syncQuestionDisclosures);
    }

    var bar = document.getElementById("topbar");
    var onScroll = function () {
      bar.classList.toggle("is-scrolled", window.scrollY > 8);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();

    if (window.initProteinDenoise) {
      window.initProteinDenoise(document.getElementById("protein-denoise-canvas"));
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
