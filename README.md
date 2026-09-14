# Equip Group — website (HTML/CSS/JS build)

A static rebuild of equipgroup.co, structured so **content lives in plain
JSON files** and the HTML/CSS/JS is the "template." Anyone comfortable
editing a spreadsheet can publish a new testimonial, dataset, or blog post
without touching code. When you're ready for the React version, this same
JSON can be fetched by (or copied into) that app — nothing here is thrown away.

## Folder map

```
/index.html                  Home
/about.html                  About
/contact.html                 Contact
/services/
  business-development.html
  research-project-management.html
  data-division.html          The data.gov-style data portal
/updates/
  index.html                  Articles, announcements, opportunities, podcasts, webinars
/partials/
  header.html                 Shared site header (edit once, changes everywhere)
  footer.html                 Shared site footer
/css/style.css                 The entire design system (colors, type, layout)
/js/
  main.js                      Loads header/footer, builds the Services dropdown, header show/hide
  carousel.js                  Testimonial + logo carousels (manual arrows/dots/drag)
  data-division.js             Renders the Data Division catalogue + charts
  updates.js                   Renders the Updates hub
/data/                          <-- YOU EDIT THESE, not the HTML, for day-to-day content
  nav.json                      Services dropdown (departments)
  testimonials.json
  logos.json                    "Trusted by the Best" strip
  team.json                     About page team grid
  updates.json                  Articles / announcements / opportunities / podcasts / webinars
  data-division.json            Datasets, charts, dashboards, HD visuals, articles
/assets/                        Put your real images, logos, team photos, HD graphics here
```

## Running it locally

Because pages load the header/footer and JSON with `fetch()`, opening the
HTML file directly (double-click) won't work — browsers block `fetch` on
`file://`. Run a tiny local server from the project folder instead:

```bash
# any one of these works
npx serve .
python3 -m http.server 5500
```

Then visit `http://localhost:5500` (or whatever port it prints).

## Editing content (no code required)

Every `data/*.json` file starts with an `"_instructions"` field explaining
exactly what to copy and edit. The general pattern everywhere is the same:

1. Open the relevant JSON file in a text editor (even GitHub's web editor works).
2. Copy one existing entry (one `{ ... }` block).
3. Change the text/paths inside it.
4. Add a comma after the previous entry, paste your new one, save.

**Adding a department** (e.g. a new sister company): edit `data/nav.json`.
Set `"external": true` and a full `"url"` for a site that lives elsewhere —
it opens in a new tab automatically, exactly like "Clickbait Marketing" does.

**Adding a testimonial or a trusted-by logo**: edit `data/testimonials.json`
or `data/logos.json`. They show up in the carousel immediately — visitors
control them with the arrow buttons, the dots, or by dragging/swiping.

**Publishing on the Data Division page** — three ways, no design tool required
for two of them:
- *An interactive chart*: add a `"type": "chart"` block with your labels and
  numbers. It draws itself with Chart.js — no image to make or upload.
- *An HD graphic* (from PowerPoint, Canva, Excel, etc.): export it as a PNG/JPG,
  drop the file in `/assets/data-division/`, add a `"type": "image"` block
  pointing to it. Click-to-enlarge (lightbox) is automatic.
- *A live dashboard* (Power BI, Tableau Public, Looker Studio): get the
  embed/publish-to-web link from that tool and paste it into a `"type":
  "dashboard"` block's `"embedUrl"`.

**Publishing an update** (article, announcement, opportunity, podcast,
webinar): edit `data/updates.json`. Podcasts and webinars are never hosted
on this site — put the real YouTube/Spotify/Zoom links in `"links"`, and
optionally an `"embedUrl"` if you want an inline preview player.

## Deploying

### Vercel (recommended, matches the eventual React version)
1. Push this folder to a GitHub repo.
2. In Vercel, "Import Project" → select the repo → Framework preset:
   **Other** (static) → Deploy. No build step needed.
3. Vercel serves the site from the domain root, so every link and image
   path in this project (they start with `/`, e.g. `/assets/...`) works
   as-is.

### GitHub Pages
- **User/organization site** (`yourname.github.io`) or a **custom domain**
  attached to Pages: works as-is, same reasoning as Vercel above.
- **Project site** (`yourname.github.io/repo-name`, no custom domain):
  GitHub serves it from a *sub-path*, not the root, so the root-relative
  paths (`/assets/...`, `/services/...`) used throughout this project will
  break. Fix by either (a) attaching a custom domain in the repo's Pages
  settings — one line in DNS, GitHub's docs walk through it — or
  (b) find-and-replace the leading `/` in `partials/header.html`,
  `partials/footer.html`, and `data/nav.json` with `/repo-name/`. Vercel or
  a custom domain avoids this step entirely, which is why it's the
  recommended path.

## What's already wired up vs. what you'll add locally

Wired up: page structure, design system, header/footer includes, the
Services dropdown (incl. the Clickbait Marketing external link), the
full-viewport hero on Home/About/Updates with the header that hides outside
it, the manual testimonial/logo carousels, the Data Division catalogue with
working example charts, and the Updates hub with type filters.

You'll drop in locally: real photography (`/assets/images/`), real logos
(`/assets/logos/`), real team headshots (`/assets/team/`), the real
Clickbait Marketing URL (`data/nav.json`), real Power BI/Tableau embed
links (`data/data-division.json`), real podcast/webinar platform links
(`data/updates.json`), and a real form backend for `contact.html` (currently
shows a placeholder message — wire it to Formspree, Netlify Forms, or your
own endpoint in the `<script>` at the bottom of that file).

## Design notes

Typefaces: **Fraunces** (display serif, for headlines) paired with
**Public Sans** — the official U.S. Web Design System / data.gov typeface —
for body and UI text. That pairing was chosen deliberately: it's what gives
the Data Division page its "national data portal" credibility, and it ties
the rest of the site to the same institutional register you asked for.
Palette keeps your existing navy/gold/maroon/olive/teal system, refined for
contrast and consistency across pages.
