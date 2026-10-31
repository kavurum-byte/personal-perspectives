# Perspectives & Reflections — free static website

## Privacy first
`private-posts.json` contains your Facebook archive and **must never be uploaded to a public host**. It is included in the private review package only. `posts.json` is empty until you approve posts.

## Publish for free
1. Create a new GitHub repository for this project (separate from the aviation project).
2. Upload only `index.html`, `styles.css`, `app.js`, and `posts.json`. **Never upload `private-posts.json`.**
3. In Cloudflare Pages, connect the repository; framework preset None, build command blank, output directory `/`.
4. Your free pages.dev URL will be available after deployment.

## Add a post
Open `editor.html` locally, fill the form and click Download updated posts.json. Replace the public `posts.json` in GitHub, commit, and Cloudflare Pages deploys automatically. The editor reads your existing posts.json when you select it. No account or paid CMS is needed.

## Review
`review.html` can open the private JSON file **locally** for searching and triage. Do not publish the private archive.
