# Personal Portfolio Website

A static portfolio site for Caio Di Felice Cunha (Data Analyst and Back-end Software Engineer). It presents work experience, education, and a projects section that is populated live from the GitHub REST API. Built with plain HTML, CSS, and vanilla JavaScript, no build step.

**Live demo:** https://caio-felice-cunha.github.io/CaioFeliceCunha.github.io/

## What it does

- Fetches the owner's public repositories from the GitHub API on page load and renders them as project cards.
- Sorts projects into tabs (Data Analysis/Science, Back-end Software Engineering) and language subtabs (Python, R, SQL, Power BI, Go) based on each repository's GitHub topics.
- Provides client-side search across project name, description, and topics, with match highlighting.
- Shows a "Latest Projects" strip, an education section (degrees, courses, certifications), and a work-experience timeline.

## How project cards are driven

Cards are not hand-written. Each card comes from a public GitHub repository and is categorized by that repository's topics:

- A main category requires the topic `data-analysis` (or `data`) or `backend`.
- A language subtab requires a matching language topic: `python`, `r`, `sql`, `powerbi`, or `go`.
- A repository tagged with a main category but no language topic still appears under All Projects (it is not hidden by the active subtab).

To make a repository show up on the site, add the relevant topics to it on GitHub. No code change is needed.

## Run locally

No build step. Serve the folder with any static server, for example:

```bash
# Python 3
python -m http.server 8000
# then open http://localhost:8000
```

The projects section calls the public GitHub API with no authentication. Unauthenticated requests are rate limited (currently 60 per hour per IP); if you hit the limit the section shows a retry message.

## Tests

A small Node test suite covers the project-categorization logic and the search-input handling (including the fix for searching terms with regex characters such as `c++`).

```bash
npm test
```

Requires Node 18+ (uses the built-in `node --test` runner; no dependencies to install).

## Project structure

```
index.html              Page markup and content (experience, education, contact)
assets/css/styles.css   Styling
assets/js/script.js     GitHub fetch, categorization, search, UI behavior
images/minha-foto.jpg   Profile photo
test/script.test.js     Node tests for the categorization and search logic
```

## Technologies Used

- HTML5
- CSS3 (custom properties, Flexbox, Grid, animations)
- JavaScript (ES6+, vanilla)
- GitHub REST API (client-side fetch)
- Font Awesome 6 (cdnjs)
- Google Fonts (Inter)

## License

MIT.
