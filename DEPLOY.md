# Putting Blizzard online at blizzardhub.snowfall.peakmountains.net

The site is plain HTML/CSS/JS, so any static host works. These steps use **GitHub Pages**, which is free. The `CNAME` file in this folder already contains the address.

## 1. You need the domain
`blizzardhub.snowfall.peakmountains.net` is a subdomain of **peakmountains.net**. You (or a parent) must own `peakmountains.net`, or buy it from a registrar such as Namecheap, Cloudflare or Porkbun. If someone else already owns it, this exact address can't be used. Pick a different name instead.

## 2. Upload the site to GitHub
1. Make a free account at github.com and create a new **public** repository (e.g. `blizzard`).
2. Click **Add file → Upload files** and drag in everything from this folder, including `CNAME`, `index.html`, and the `css`, `js` and `games` folders.
3. Go to **Settings → Pages**. Under "Branch", pick `main` and `/ (root)`, then click **Save**.

## 3. Point the address at GitHub
At the company where you bought `peakmountains.net`, open **DNS settings** and add this record:

| Type  | Name / Host           | Value / Target              |
|-------|-----------------------|-----------------------------|
| CNAME | `blizzardhub.snowfall` | `YOUR-GITHUB-USERNAME.github.io` |

## 4. Turn on HTTPS
Back in **Settings → Pages**, wait until the custom domain shows a green check. This can take from a few minutes to a few hours. Then tick **Enforce HTTPS**.

That's it: https://blizzardhub.snowfall.peakmountains.net will show Blizzard.

## Notes
- YouTube videos need the site to be served from a real web address, which this setup gives you. They may not play if you open `index.html` straight from your computer.
- To test on your computer, run `python3 -m http.server 8642` in this folder and open http://localhost:8642.
