# knoxdl — Setup Guide

## What you're deploying

A static website (HTML/CSS/JS) + a Cloudflare Pages Function (serverless backend)
that fetches X video download links. No database, no server, no ongoing hosting cost.

---

## File structure

```
knoxdl/
├── index.html            ← Main page
├── privacy.html          ← Privacy Policy
├── terms.html            ← Terms of Service
├── style.css             ← All styles
├── app.js                ← Frontend JS (downloader logic)
├── functions/
│   └── api/
│       └── fetch.js      ← Cloudflare Worker (backend API)
└── README.md
```

---

## Step 1 — Create a GitHub repository

1. Go to https://github.com and sign in (or create an account).
2. Click **New repository**.
3. Name it `knoxdl` (or anything you like — it won't affect your domain).
4. Set it to **Private** (recommended) or Public.
5. Click **Create repository**.
6. Upload all the files from this folder into the repo:
   - Drag and drop them in the GitHub web interface, or
   - Use Git on your computer:
     ```bash
     git init
     git add .
     git commit -m "Initial commit"
     git remote add origin https://github.com/YOUR_USERNAME/knoxdl.git
     git push -u origin main
     ```

---

## Step 2 — Deploy to Cloudflare Pages

1. Go to https://dash.cloudflare.com and sign in (create a free account if needed).
2. In the left sidebar go to **Workers & Pages** → **Pages**.
3. Click **Create a project** → **Connect to Git**.
4. Authorise Cloudflare to access your GitHub account and select your `knoxdl` repo.
5. Configure the build:
   - **Framework preset**: None
   - **Build command**: *(leave empty)*
   - **Build output directory**: `/` (or leave as `.`)
6. Click **Save and Deploy**.

Cloudflare will deploy your site to a `.pages.dev` URL within a minute.

---

## Step 3 — Connect your custom domain (knoxdl.com)

### 3a — Register the domain
Buy `knoxdl.com` from any registrar (Cloudflare Registrar, Namecheap, GoDaddy, etc.).

### 3b — Add domain to Cloudflare Pages
1. In your Pages project, go to **Custom domains** tab.
2. Click **Set up a custom domain**.
3. Type `knoxdl.com` and click Continue.
4. Cloudflare will give you DNS records to add.

### 3c — Point your domain to Cloudflare
If you registered the domain **at Cloudflare Registrar**: it's already connected, nothing to do.

If you registered elsewhere (e.g. Namecheap):
1. Log into your registrar's control panel.
2. Find the **Nameservers** setting for `knoxdl.com`.
3. Replace them with Cloudflare's nameservers (shown in your Cloudflare dashboard, e.g. `ada.ns.cloudflare.com` and `buck.ns.cloudflare.com`).
4. Save. DNS propagation takes 1–24 hours.

Once propagated, `https://knoxdl.com` will serve your site with a free SSL certificate.

---

## Step 4 — Verify the backend API is working

The file `functions/api/fetch.js` is automatically deployed as a Cloudflare Pages Function.
It becomes available at `https://knoxdl.com/api/fetch?url=...` with no extra configuration needed.

To test it, visit:
```
https://knoxdl.com/api/fetch?url=https://x.com/Twitter/status/1445078208190291973
```
You should get a JSON response with video variants.

---

## Step 5 — Add Google AdSense

1. Go to https://adsense.google.com and sign up with your Google account.
2. Add your site (`knoxdl.com`) and follow verification steps.
3. Once approved, get your **Publisher ID** (looks like `ca-pub-XXXXXXXXXXXXXXXX`).
4. In `index.html`, replace every `ca-pub-XXXXXXXXXXXXXXXX` with your actual Publisher ID.
5. Replace `data-ad-slot="XXXXXXXXXX"` values with your actual ad slot IDs.
6. Add the AdSense script tag Google gives you to the `<head>` of each page.

**Note**: Google AdSense typically requires:
- A Privacy Policy page ✅ (included)
- Terms of Service page ✅ (included)
- The site to have real content ✅ (included)
- A working, navigable website ✅

---

## Step 6 — Update Google Analytics

In `index.html`, replace `G-XXXXXXXXXX` with your actual Google Analytics 4 Measurement ID.
Create one at https://analytics.google.com if you haven't already.

---

## Step 7 — Submit to Google Search Console

1. Go to https://search.google.com/search-console
2. Add your property (`https://knoxdl.com`).
3. Verify ownership (easiest via HTML tag in `<head>` or DNS record).
4. Submit your sitemap at `https://knoxdl.com/sitemap.xml` (create one — see below).

### Optional: create a sitemap.xml

Create `sitemap.xml` in your project root:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url><loc>https://knoxdl.com/</loc><changefreq>weekly</changefreq><priority>1.0</priority></url>
  <url><loc>https://knoxdl.com/privacy.html</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
  <url><loc>https://knoxdl.com/terms.html</loc><changefreq>monthly</changefreq><priority>0.3</priority></url>
</urlset>
```

---

## Updating the site

Whenever you push changes to your GitHub repo, Cloudflare Pages automatically re-deploys within ~30 seconds. No manual deploy needed.

---

## Troubleshooting

| Problem | Solution |
|---|---|
| `/api/fetch` returns 404 | Make sure `functions/api/fetch.js` exists in your repo and was pushed to GitHub |
| Videos not downloading | X's syndication API sometimes changes — check the Worker logs in Cloudflare Dashboard → Workers & Pages → your project → Functions tab |
| Domain not working | Check nameservers are set correctly and wait for DNS propagation (up to 24h) |
| AdSense not approved | Make sure Privacy Policy and Terms pages are live and linked from the footer |

---

## Cost

- **Cloudflare Pages**: Free (100,000 requests/day on free plan)
- **Cloudflare Workers (Functions)**: Free (100,000 requests/day)
- **Domain**: ~$10–12/year
- **Hosting**: $0

Total ongoing cost: ~$10/year for the domain only.
