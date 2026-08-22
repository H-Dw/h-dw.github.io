# h-dw.github.io

Personal research homepage for **Dawei Huang (黄达威)** — latent generative
structure design and self-improving agents.

Live at **https://h-dw.github.io/**

---

## What is where

```
.
├── index.html              page shell — sections and their containers only
├── css/site.css            all styling; design tokens at the top
├── js/site.js              renders the page from the YAML below
├── js/latent-search.js     the hero-strip diagram (canvas)
├── js/brand-icons.js       inlined Simple Icons marks
├── js/vendor/              marked 5.1.0, js-yaml 4.1.0
├── contents/
│   ├── site.en.yml         ← all English content
│   └── site.zh.yml         ← all Chinese content
└── assets/
    ├── portrait.jpg        hero portrait (4:5)
    ├── hero-bg.jpg         hero background, Jade Dragon Snow Mountain at dawn
    ├── hero-bg-alt.jpg     spare background (blue hour), swap in if preferred
    ├── sustech.png
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

**Add a project.** Add an entry to the `stages` list of whichever track it
belongs to under `research.tracks`. Set `core: true` to give it the accent
border and the "core work" tag — only one project should have it.

**Add a track.** Add an entry to `research.tracks` with `numeral`, `label`,
`note` and its own `stages`.

**Swap the hero background.** Point the `<img>` in `.hero-photo` at
`assets/hero-bg-alt.jpg`. The image is mirrored in CSS so the summit lands on
the right where no type is set — if you change the photo, check
`.hero-photo img { object-position }` and the `transform: scaleX(-1)`.

**Update the CV.** Overwrite the PDFs in `assets/cv/`, keeping the filenames.

## Previewing locally

The page fetches its content at runtime, so opening `index.html` straight from
the file system will not work — the browser blocks the fetch. Serve the folder
instead:

```bash
python -m http.server 8000
# then open http://localhost:8000
```

## Publishing

The repository must be named `<your-username>.github.io` for the site to be
served at the root domain. Enable Pages under **Settings → Pages → Build and
deployment → Deploy from a branch → `main` / `(root)`**, then push:

```bash
git add -A
git commit -m "Update homepage"
git push
```

Changes are live in about a minute.

## Credits

Photographs taken at Jade Dragon Snow Mountain, Lijiang.

Rebuilt in 2026 from a fork of
[Yixin Huang's personal homepage template](https://github.com/Yixin0313/personal-homepage-template),
itself based on [Sen Li's academic template](https://github.com/senli1073/senli1073.github.io).
The layout, styling and rendering code have been rewritten; the MIT licence from
the original template is retained.

Vendored libraries: [marked](https://github.com/markedjs/marked) (MIT),
[js-yaml](https://github.com/nodeca/js-yaml) (MIT). Toolkit marks from
[Simple Icons](https://simpleicons.org/) (CC0), inlined.
