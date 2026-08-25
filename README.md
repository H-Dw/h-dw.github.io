# H-Dw

Personal research homepage for **Dawei Huang (黄达威)** — latent-based
generation and agent-system governance.

Once GitHub Pages is enabled, the site is available at
**https://h-dw.github.io/H-Dw/**.

---

## What is where

```
.
├── index.html              page shell — sections and their containers only
├── css/site.css            all styling; design tokens at the top
├── js/site.js              renders the page from the YAML below
├── js/protein-denoise.js   centered Noise-to-cartoon denoising loop (canvas)
├── js/brand-icons.js       inlined Simple Icons marks
├── js/vendor/              marked 5.1.0, js-yaml 4.1.0
├── contents/
│   ├── site.en.yml         ← all English content
│   └── site.zh.yml         ← all Chinese content
└── assets/
    ├── 1rop.pdb            deposited Rop coordinates used as the structure source
    ├── rop-cartoon.webp    transparent NGL cartoon of the 1ROP biological dimer
    ├── protein-denoising.webp  exported transparent Noise-to-cartoon loop
    ├── demos/              HackerChain and HePai product screenshots
    ├── portrait.jpg        hero portrait (4:5)
    ├── hero-bg.jpg         hero background, Jade Dragon Snow Mountain at dawn
    ├── hero-bg-alt.jpg     spare background (blue hour), swap in if preferred
    ├── scau.png / sustech-mark.png / tencent.png
    ├── favicon.svg / .ico
    └── cv/                 CV PDFs linked from the hero buttons
```

**To change what the site says, edit `contents/site.en.yml` and
`contents/site.zh.yml`.** You should never need to touch the HTML. The two files
must keep the same structure — the renderer reads the same keys from both.

Every text field accepts inline markdown: `**bold**`, `*italic*`, `` `code` ``
and `[text](url)`.

## Common edits

**Add a Google Scholar / ORCID / LinkedIn button.** Find the `hero.actions`
list and fill in the empty `href`. Buttons with an empty `href` stay hidden, so
nothing appears until the link is real. Do it in both language files.

**Add a paper.** Add an item under the right group in `publications.groups`.
Set `doi:` and the renderer builds the link.

**Add a research project.** Add an entry to the `stages` list of whichever
track it belongs to under `research.tracks`. Set `core: true` to give it the
accent border and the "core work" tag — only one project should have it.
Use the optional `case_results` block for compact paired evidence cards; each
item has `target`, `task`, `outcome`, and `evidence` fields.

**Add an Agent product case.** Add a matching entry under `projects.items` in
both language files. Each `gallery` image needs a local `src`, intrinsic
`width` / `height`, accessible `alt`, and a short `caption`. The first image is
the default stage inside a result gallery that starts collapsed. Visitors can
expand it, use the mid-image arrow buttons or thumbnails to switch screenshots,
and open the full-size viewer. The outer `.demo-stage` fixes the display pane at
`16 / 9.6` on desktop and `16 / 10` on mobile; every source image uses
`object-fit: contain` inside that pane, so portrait and landscape screenshots do
not change the page layout.

**Enable a product Demo download.** Put the downloadable file in the repository
(for example, under `assets/demos/files/`) and fill in `download.href` for that
project in both language files. Optionally set `download.filename`. An empty
`href` keeps the button hidden; a valid path makes it appear automatically.

**Add a track.** Add an entry to `research.tracks` with `numeral`, `label`,
`note` and its own `stages`.

**Swap the hero background.** Point the `<img>` in `.hero-photo` at
`assets/hero-bg-alt.jpg`. The image is mirrored in CSS so the summit lands on
the right where no type is set — if you change the photo, check
`.hero-photo img { object-position }` and the `transform: scaleX(-1)`.

**Update the CV.** Overwrite the PDFs in `assets/cv/`, keeping the filenames.
The download controls are currently commented out in `hero.actions`; uncomment
the matching entries in both language files when they are ready to publish.

## Previewing locally

The page fetches its content at runtime, so opening `index.html` straight from
the file system will not work — the browser blocks the fetch. Serve the folder
instead:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Publishing with GitHub Pages

This repository is configured as a GitHub Pages **project site**. It uses only
relative asset paths, so it works at `/H-Dw/` without a build step or base-path
rewrite. The included `.nojekyll` file keeps GitHub Pages from applying Jekyll
processing to the static assets.

After the first push, enable Pages under **Settings → Pages → Build and
deployment → Deploy from a branch → `main` / `(root)`**. GitHub will publish
the site at:

```
https://h-dw.github.io/H-Dw/
```

If the repository is later renamed to `H-Dw.github.io`, update the canonical
and Open Graph URLs in `index.html` to the root-domain address. For normal
content updates, commit and push:

```bash
git add -A
git commit -m "Update homepage"
git push
```

Changes are live in about a minute.

## Credits

Photographs taken at Jade Dragon Snow Mountain, Lijiang.

The protein cartoon is based on the deposited Rop homodimer structure
[PDB 1ROP](https://www.rcsb.org/structure/1ROP) and was rendered with
[NGL Viewer](https://nglviewer.org/).

Rebuilt in 2026 from a fork of
[Yixin Huang's personal homepage template](https://github.com/Yixin0313/personal-homepage-template),
itself based on [Sen Li's academic template](https://github.com/senli1073/senli1073.github.io).
The layout, styling and rendering code have been rewritten; the MIT licence from
the original template is retained.

Vendored libraries: [marked](https://github.com/markedjs/marked) (MIT),
[js-yaml](https://github.com/nodeca/js-yaml) (MIT). Toolkit marks from
[Simple Icons](https://simpleicons.org/) (CC0), inlined.
