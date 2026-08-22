# h-dw.github.io

Personal research homepage for **Dawei Huang (黄达威)** — generative modeling
and inference-time search for protein design.

Live at **https://h-dw.github.io/**

---

## What is where

```
.
├── index.html              page shell — sections and their containers only
├── css/site.css            all styling, design tokens at the top
├── js/site.js              renders the page from the YAML below
├── js/contact-map.js       the hero figure (canvas contact map)
├── js/vendor/              marked 5.1.0, js-yaml 4.1.0
├── contents/
│   ├── site.en.yml         ← all English content
│   └── site.zh.yml         ← all Chinese content
└── assets/
    ├── avatar.jpg          portrait used in the hero
    ├── avatar-formal.jpg   spare formal portrait, swap in if preferred
    ├── sustech.png
    ├── favicon.svg / .ico
    └── cv/                 CV PDFs linked from the hero buttons
```

**To change what the site says, edit `contents/site.en.yml` and
`contents/site.zh.yml`.** You should never need to touch the HTML. The two
files must keep the same structure — the renderer reads the same keys from
both.

Every text field accepts inline markdown: `**bold**`, `*italic*`, `` `code` ``
and `[text](url)`.

## Common edits

**Add a Google Scholar / ORCID / LinkedIn button.** Find the `hero.actions`
list and fill in the empty `href`. Buttons with an empty `href` stay hidden, so
nothing appears until the link is real.

**Add a paper.** Add an item under the right group in `publications.groups`.
Set `doi:` and the renderer builds the link.

**Add a project.** Add an entry to `research.stages`. Reuse an existing `stage`
value to group it under the same rail heading; give it a new one to start a new
stage.

**Swap the portrait.** Replace `assets/avatar.jpg`, or point the `src` in
`index.html` at `assets/avatar-formal.jpg`.

**Update the CV.** Overwrite the PDFs in `assets/cv/` keeping the same
filenames.

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

Rebuilt in 2026 from a fork of
[Yixin Huang's personal homepage template](https://github.com/Yixin0313/personal-homepage-template),
itself based on [Sen Li's academic template](https://github.com/senli1073/senli1073.github.io).
The layout, styling and rendering code have been rewritten; the MIT licence
from the original template is retained.

Vendored libraries: [marked](https://github.com/markedjs/marked) (MIT),
[js-yaml](https://github.com/nodeca/js-yaml) (MIT). Toolkit icons are served
from [Simple Icons](https://simpleicons.org/) (CC0).
