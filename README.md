# SE London Culture Scout

An independent cultural field guide for Honor Oak Park and southeast London.

## Current status
- Responsive website: `index.html`
- Sourced launch edition: `events.json`
- Sunday publishing workflow: `.github/workflows/refresh-events.yml`
- Research script: `scripts/update_events.py`
- Original poster artwork: **not yet uploaded**; the website currently displays its custom illustrated SVG skyline.

## Make the website public
In **Settings → Pages**, choose **Deploy from a branch**, branch **main**, folder **/(root)**, and save. Expected URL:
https://favour-moon.github.io/se-london-culture-scout/

## Enable automatic weekly research and publishing
1. Create an OpenAI API key in your own OpenAI API account. This is a separate billed service from ChatGPT subscriptions. Set a spending limit.
2. In this repository, go to **Settings → Secrets and variables → Actions → New repository secret**.
3. Name the secret **OPENAI_API_KEY** and paste the key. Never put keys in code, README or `events.json`.
4. In **Settings → Actions → General → Workflow permissions**, allow **Read and write permissions** for GitHub Actions.
5. Open **Actions → Refresh Culture Scout events → Run workflow** for a test.
6. Check the job output and confirm the site updates. The job is scheduled for **09:15 UTC each Sunday**, and can be delayed by GitHub Actions.

The script researches using OpenAI's Responses API with web search, validates fields and dates, and refuses to replace the existing edition if fewer than five valid entries are returned. **This is a separate GitHub-based research job, not a direct export of the ChatGPT Sunday 8am automation.** Both can operate, but their results are not automatically merged.

## Editorial caution
The launch edition includes source links and organiser pages but is **not a live ticket inventory**. Dates and ages should be checked before booking. AI-assisted research can make mistakes, even when sourced.

## Data structure
The site fetches `events.json`. Each event contains `date`, `title`, `venue`, `area`, `category`, `price`, `url`, `description`, `note`, `family`, `featured`, and `sourceUrl`.

## Event images
All event surfaces use `event-media.js` and `event-media.css`: listings, weekly Top Ten, map listings/popups, After Dark, outing suggestions and archive. `node scripts/build-static.js` refreshes the saved cards and Top Ten, including when JavaScript or the feed is unavailable. The weekly workflow rebuilds that snapshot.

Reviewed photos use `imageUrl`, `imageAlt`, `imageKind` (`event` or `venue`), `imageCaption`, `imageCredit`, `imageSourceUrl`, and `imageVerifiedAt`. Only select artwork linked to the exact event on the organiser page; never use a programme page’s default social image or an unrelated stock photo. Captions distinguish archive photography. Preserve photographer credits supplied by the organiser. External images remain hosted by their publishers.

Missing, rejected or failed photos reveal a labelled, inline category illustration. It has no external dependency and also works in the saved HTML without JavaScript. Newly researched events receive that illustration until imagery has been checked; weekly refreshes preserve reviewed images for matching event titles and venues.
