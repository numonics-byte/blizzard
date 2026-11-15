/* BlizBrowse: an in-site browser + search engine */
(function(){
  const root = document.getElementById('bb');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const WIKI = 'https://en.wikipedia.org';
  const LOGO = '<b>B</b><b>l</b><b>i</b><b>z</b><b>B</b><b>r</b><b>o</b><b>w</b><b>s</b><b>e</b>';

  root.className = 'appframe bb';
  root.innerHTML = `
    <div class="bb-tabs"><div class="bb-tablist" style="display:contents"></div><button class="bb-newtab" title="New tab">+</button></div>
    <div class="bb-bar">
      <button class="nb" data-a="back" title="Back">←</button>
      <button class="nb" data-a="fwd" title="Forward">→</button>
      <button class="nb" data-a="reload" title="Reload">↻</button>
      <button class="nb" data-a="home" title="Home">⌂</button>
      <form class="bb-url"><span class="lock">🔒</span><input list="bbHist" spellcheck="false" autocomplete="off" placeholder="Search BlizBrowse or type a URL"></form>
      <button class="nb bb-star" data-a="star" title="Bookmark this page">☆</button>
      <datalist id="bbHist"></datalist>
      <button class="nb bb-exit" data-go="home" title="Exit BlizBrowse">✕</button>
    </div>
    <div class="bb-view"><div class="bb-loading"></div><div class="bb-content"></div></div>`;
  const tabList = root.querySelector('.bb-tablist');
  const urlForm = root.querySelector('.bb-url');
  const urlIn = urlForm.querySelector('input');
  const view = root.querySelector('.bb-view');
  const content = root.querySelector('.bb-content');
  const loader = root.querySelector('.bb-loading');
  const btn = a => root.querySelector(`[data-a="${a}"]`);

  /* ---------- tabs & history ---------- */
  let tabs = [], cur = null, seq = 0, navToken = 0, ddgFresh = false;
  function newTab(url='blizz://home'){
    const t = { id:++seq, hist:[], idx:-1, title:'New Tab' };
    tabs.push(t); cur = t; nav(url); renderTabs();
  }
  function closeTab(t){
    const i = tabs.indexOf(t); tabs.splice(i,1);
    if(!tabs.length) return newTab();
    if(cur === t){ cur = tabs[Math.max(0,i-1)]; load(cur.hist[cur.idx], false); }
    renderTabs();
  }
  function renderTabs(){
    tabList.innerHTML = '';
    tabs.forEach(t => {
      const el = document.createElement('div');
      el.className = 'bb-tab' + (t === cur ? ' active' : '');
      el.innerHTML = `<span>${esc(t.title)}</span><button class="x" title="Close">✕</button>`;
      el.onclick = () => { if(cur !== t){ cur = t; load(t.hist[t.idx], false); renderTabs(); } };
      el.querySelector('.x').onclick = e => { e.stopPropagation(); closeTab(t); };
      tabList.appendChild(el);
    });
    btn('back').disabled = !cur || cur.idx <= 0;
    btn('fwd').disabled = !cur || cur.idx >= cur.hist.length-1;
    saveTabs(); updateStar();
  }
  function saveTabs(){ BLIZ.store.set('bbTabs', { list: tabs.map(t => t.hist[t.idx]).filter(Boolean).slice(0, 12), cur: Math.max(0, tabs.indexOf(cur)) }); }
  const bookmarks = () => BLIZ.store.get('bbBookmarks', []);
  function updateStar(){
    const u = cur && cur.hist[cur.idx], b = btn('star'); if(!b) return;
    const on = !!u && bookmarks().some(x => x.u === u);
    b.textContent = on ? '★' : '☆'; b.classList.toggle('on', on); b.disabled = !u || u === 'blizz://home';
  }
  function addHistory(u, t){
    if(!u || u === 'blizz://home' || u.startsWith('blizz://history')) return;
    const h = BLIZ.store.get('bbHistory', []).filter(x => x.u !== u);
    h.unshift({ u, t, ts: Date.now() });
    BLIZ.store.set('bbHistory', h.slice(0, 150));
  }
  root.querySelector('.bb-newtab').onclick = () => newTab();
  btn('back').onclick = () => { if(cur.idx > 0){ cur.idx--; load(cur.hist[cur.idx], false); } };
  btn('fwd').onclick = () => { if(cur.idx < cur.hist.length-1){ cur.idx++; load(cur.hist[cur.idx], false); } };
  btn('reload').onclick = () => load(cur.hist[cur.idx], false);
  btn('home').onclick = () => nav('blizz://home');
  urlForm.onsubmit = e => {
    const v = urlIn.value.trim(), dest = resolveInput(v);
    urlIn.blur();
    if(v && ddgOn() && dest.startsWith('blizz://search')){ toDDG(urlForm, urlIn, v); return; }   // let the browser submit it
    e.preventDefault(); nav(dest);
  };
  urlIn.addEventListener('focus', () => {
    urlIn.select();
    root.querySelector('#bbHist').innerHTML = BLIZ.store.get('bbHistory', []).slice(0, 30).map(x => {
      const v = x.u.startsWith('blizz://search?q=') ? decodeURIComponent(x.u.slice(17).split('&')[0]) : x.u;
      return `<option value="${esc(v)}">${esc(x.t || '')}</option>`;
    }).join('');
  });
  btn('star').onclick = () => {
    const u = cur.hist[cur.idx]; if(!u || u === 'blizz://home') return;
    let b = bookmarks();
    if(b.some(x => x.u === u)){ b = b.filter(x => x.u !== u); BLIZ.toast('Bookmark removed'); }
    else { b.unshift({ u, t: cur.title }); BLIZ.toast('Bookmarked ★'); }
    BLIZ.store.set('bbBookmarks', b.slice(0, 40)); updateStar();
  };

  function nav(url){
    cur.hist = cur.hist.slice(0, cur.idx+1); cur.hist.push(url); cur.idx++;
    load(url, true);
  }
  function setTitle(t){ cur.title = t; renderTabs(); addHistory(cur.hist[cur.idx], t); }
  function busy(on){ loader.classList.toggle('on', on); }


  /* DuckDuckGo search: submitted like a normal form into a new tab, so pop-up blockers don't stop it */
  const ddgOn = () => BLIZ.store.get('engine', 'bliz') === 'ddg';
  function toDDG(form, input, q){
    form.action = 'https://duckduckgo.com/'; form.method = 'get'; form.target = '_blank';
    input.name = 'q'; input.value = q;
    ddgCard(q, true);
  }
  function ddgCard(q, sent){
    setTitle(q + ' - DuckDuckGo');
    const href = 'https://duckduckgo.com/?q=' + encodeURIComponent(q);
    content.innerHTML = `<div class="bb-err bb-page bb-noframe"><div class="big">🦆</div>
      <h2>${sent ? 'DuckDuckGo results opened in a new tab' : 'Search DuckDuckGo for “' + esc(q) + '”'}</h2>
      <p>${sent ? 'Look for the new tab at the top of your browser. Every site you click there works.' : 'Results open in their own tab so every site works.'}</p>
      <div class="bb-nf-btns">
        <a class="bb-more" href="${esc(href)}" target="_blank" rel="noopener">🦆 ${sent ? 'Open the results again' : 'Search on DuckDuckGo'}</a>
        <a class="bb-more" href="${esc(href)}" target="_top">⤵ Open DuckDuckGo in this tab</a>
        <button class="bb-more" data-k="bliz">❄️ Show BlizBrowse results here instead</button>
      </div></div>`;
    content.querySelector('[data-k=bliz]').onclick = () => nav('blizz://search?q=' + encodeURIComponent(q) + '&t=all');
  }

  /* ---------- turning typed text into a destination ---------- */
  function resolveInput(raw){
    const s = raw.trim();
    if(!s) return 'blizz://home';
    if(/^blizz:\/\//i.test(s)) return s;
    const looksUrl = /^https?:\/\//i.test(s) || (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(s) && !/\s/.test(s));
    if(!looksUrl) return 'blizz://search?q=' + encodeURIComponent(s);
    let u; try{ u = new URL(/^https?:/i.test(s) ? s : 'https://' + s); }catch(e){ return 'blizz://search?q=' + encodeURIComponent(s); }
    return mapSite(u);
  }
  // Big sites that refuse to load inside other sites get routed to Blizzard's own version
  function mapSite(u){
    const h = u.hostname.replace(/^www\.|^m\./,'');
    if(/(^|\.)wikipedia\.org$/.test(h) && u.pathname.startsWith('/wiki/')) return 'blizz://wiki/' + u.pathname.slice(6);
    if(/^google\.|^bing\.com$|^duckduckgo\.com$|^search\.yahoo\.com$/.test(h) && !u.pathname.startsWith('/maps') && h !== 'maps.google.com'){
      const q = u.searchParams.get('q') || u.searchParams.get('p');
      return q ? 'blizz://search?q=' + encodeURIComponent(q) : 'blizz://home';
    }
    if(h === 'youtube.com' || h === 'youtu.be'){
      const id = h === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') || (u.pathname.match(/\/(shorts|embed)\/([\w-]{11})/)||[])[2]);
      return 'blizz://watch/youtube' + (id ? '/' + id : '');
    }
    if(h === 'tiktok.com') return 'blizz://watch/tiktok?u=' + encodeURIComponent(u.href);
    if(/^(netflix|disneyplus|hulu|max|primevideo|peacocktv|paramountplus)\.com$/.test(h)) return 'blizz://watch/movies';
    // Sites that offer an official embeddable version: use it so they work inside BlizBrowse
    if(h === 'twitch.tv'){
      const ch = u.pathname.split('/').filter(Boolean)[0];
      if(ch && !/^(directory|videos|settings|search|p)$/.test(ch)) return `https://player.twitch.tv/?channel=${encodeURIComponent(ch)}&parent=${location.hostname || 'localhost'}`;
    }
    if(h === 'open.spotify.com' && !u.pathname.startsWith('/embed')) return 'https://open.spotify.com/embed' + u.pathname;
    if(h === 'vimeo.com'){ const id = (u.pathname.match(/^\/(\d+)/) || [])[1]; if(id) return 'https://player.vimeo.com/video/' + id; }
    if(h === 'scratch.mit.edu'){ const id = (u.pathname.match(/\/projects\/(\d+)/) || [])[1]; if(id) return `https://scratch.mit.edu/projects/${id}/embed`; }
    if(/^(maps\.google\.|google\.[a-z.]+\/maps|openstreetmap\.org)/.test(h + u.pathname) || (/^google\./.test(h) && u.pathname.startsWith('/maps'))){
      const q = u.searchParams.get('q') || decodeURIComponent((u.pathname.match(/\/(?:place|search)\/([^/@]+)/) || [])[1] || '').replace(/\+/g,' ');
      return 'blizz://maps' + (q ? '?q=' + encodeURIComponent(q) : '');
    }
    if(/^(weather\.com|accuweather\.com|weather\.gov)$/.test(h)) return 'blizz://weather';
    if(/^(dictionary\.com|merriam-webster\.com|dictionary\.cambridge\.org)$/.test(h)){
      const w = u.pathname.split('/').filter(Boolean).pop();
      return 'blizz://dictionary' + (w && !/^(browse|dictionary|define)$/.test(w) ? '?w=' + encodeURIComponent(w) : '');
    }
    return u.href;
  }

  /* ---------- safety + sites that refuse to be shown inside other sites ---------- */
  const DANGER_WORDS = /(porn|xxx|xvideo|xhamster|hentai|onlyfans|nsfw|sex|nude|escort|camgirl|casino|gambl|poker|betting|sportsbook|stake\.com|roobet|bet365|draftkings|fanduel|crack|keygen|warez|torrent|piratebay|1337x|malware|phish|darkweb|\.onion|ip-?logger|grabify|iplogger)/i;
  function isDangerous(u){
    if(!/^https?:$/.test(u.protocol)) return true;
    return DANGER_WORDS.test(u.hostname) || DANGER_WORDS.test(u.pathname.slice(0, 80));
  }
  // Big sites known to block embedding, with the best Blizzard alternative for each
  const NO_FRAME = {
    'instagram.com':'Instagram', 'facebook.com':'Facebook', 'x.com':'X (Twitter)', 'twitter.com':'X (Twitter)',
    'reddit.com':'Reddit', 'amazon.com':'Amazon', 'ebay.com':'eBay', 'github.com':'GitHub', 'stackoverflow.com':'Stack Overflow',
    'discord.com':'Discord', 'roblox.com':'Roblox', 'snapchat.com':'Snapchat', 'pinterest.com':'Pinterest', 'linkedin.com':'LinkedIn',
    'cnn.com':'CNN', 'bbc.com':'BBC', 'bbc.co.uk':'BBC', 'nytimes.com':'The New York Times', 'espn.com':'ESPN', 'apple.com':'Apple',
    'microsoft.com':'Microsoft', 'chatgpt.com':'ChatGPT', 'openai.com':'OpenAI', 'claude.ai':'Claude', 'gmail.com':'Gmail',
    'mail.google.com':'Gmail', 'docs.google.com':'Google Docs', 'drive.google.com':'Google Drive', 'classroom.google.com':'Google Classroom',
    'outlook.com':'Outlook', 'live.com':'Outlook', 'spotify.com':'Spotify', 'twitch.tv':'Twitch', 'paypal.com':'PayPal', 'walmart.com':'Walmart',
    'target.com':'Target', 'yahoo.com':'Yahoo', 'imdb.com':'IMDb', 'fandom.com':'Fandom', 'quora.com':'Quora', 'steampowered.com':'Steam',
    'epicgames.com':'Epic Games', 'minecraft.net':'Minecraft', 'nintendo.com':'Nintendo', 'playstation.com':'PlayStation', 'xbox.com':'Xbox',
    'coolmathgames.com':'Coolmath Games', 'poki.com':'Poki', 'crazygames.com':'CrazyGames', 'khanacademy.org':'Khan Academy', 'quizlet.com':'Quizlet',
    'canva.com':'Canva', 'zoom.us':'Zoom', 'whatsapp.com':'WhatsApp', 'telegram.org':'Telegram', 'tumblr.com':'Tumblr', 'medium.com':'Medium'
  };
  function noFrameName(host){
    host = host.replace(/^www\.|^m\./,'');
    for(const d in NO_FRAME){ if(host === d || host.endsWith('.' + d)) return NO_FRAME[d]; }
    return null;
  }

  /* ---------- page loader ---------- */
  async function load(url, fresh){
    const token = ++navToken;
    renderTabs();
    urlIn.value = url === 'blizz://home' ? '' : url;
    urlForm.querySelector('.lock').textContent = url.startsWith('blizz://') ? '❄️' : '🔒';
    view.scrollTop = 0; busy(true);
    const live = () => token === navToken;
    try{
      if(url === 'blizz://home') pageHome();
      else if(url.startsWith('blizz://search')){ ddgFresh = fresh; await pageSearch(new URL(url.replace('blizz://','https://x/')).searchParams, live); }
      else if(url.startsWith('blizz://wiki/')) await pageWiki(decodeURIComponent(url.slice(13)), live);
      else if(url.startsWith('blizz://weather')) await pageWeather(new URL(url.replace('blizz://','https://x/')).searchParams.get('q') || '', live);
      else if(url.startsWith('blizz://dictionary')) await pageDict(new URL(url.replace('blizz://','https://x/')).searchParams.get('w') || '', live);
      else if(url.startsWith('blizz://maps')) await pageMaps(new URL(url.replace('blizz://','https://x/')).searchParams.get('q') || '', live);
      else if(url.startsWith('blizz://history')) pageHistory();
      else if(url.startsWith('blizz://watch')) pageWatch(url);
      else if(url.startsWith('blizz://games')){ setTitle('Blizzard Games'); BLIZ.go('games'); }
      else pageExternal(url, fresh);
    }catch(err){
      if(live()) content.innerHTML = `<div class="bb-err bb-page"><div class="big">🌨️</div><h2>Couldn't load this page</h2><p>${esc(err.message || err)}</p><p style="margin-top:8px">Check your internet connection and try again.</p></div>`;
    }
    if(live()) busy(false);
  }

  async function getJSON(u){
    const r = await fetch(u);
    if(!r.ok) throw new Error('The site answered ' + r.status);
    return r.json();
  }

  /* ---------- home ---------- */
  function searchBox(val=''){
    return `<form class="bb-sbox"><span>🔍</span><input name="q" value="${esc(val)}" autocomplete="off" aria-label="Search"><span class="mic">❄</span><div class="bb-sugg"></div></form>`;
  }
  function wireSearch(scope){
    const f = scope.querySelector('.bb-sbox'); if(!f) return;
    const inp = f.querySelector('input'), sug = f.querySelector('.bb-sugg');
    let t;
    f.onsubmit = e => {
      const v = inp.value.trim(); if(!v){ e.preventDefault(); return; }
      const dest = resolveInput(v);
      if(ddgOn() && dest.startsWith('blizz://search')){ toDDG(f, inp, v); return; }   // let the browser submit it
      e.preventDefault(); nav(dest);
    };
    inp.addEventListener('input', () => {
      clearTimeout(t);
      const q = inp.value.trim();
      if(!q){ sug.style.display = 'none'; return; }
      t = setTimeout(async () => {
        try{
          const d = await getJSON(`${WIKI}/w/api.php?action=opensearch&search=${encodeURIComponent(q)}&limit=6&namespace=0&format=json&origin=*`);
          if(inp.value.trim() !== q || !d[1].length){ sug.style.display = 'none'; return; }
          sug.innerHTML = d[1].map(s => `<div data-s="${esc(s)}">🔍 ${esc(s)}</div>`).join('');
          sug.style.display = 'block';
        }catch(e){}
      }, 180);
    });
    sug.addEventListener('mousedown', e => {
      const d = e.target.closest('[data-s]'); if(!d) return;
      e.preventDefault(); nav('blizz://search?q=' + encodeURIComponent(d.dataset.s));
    });
    inp.addEventListener('blur', () => setTimeout(() => sug.style.display = 'none', 150));
  }
  function pageHome(){
    setTitle('BlizBrowse');
    const sc = [
      ['📚','Wikipedia','blizz://wiki/Main_Page'], ['🌤️','Weather','blizz://weather'],
      ['🗺️','Maps','blizz://maps'], ['📖','Dictionary','blizz://dictionary'],
      ['▶️','YouTube','blizz://watch/youtube'], ['🎵','TikTok','blizz://watch/tiktok'],
      ['🎬','Movies','blizz://watch/movies'], ['📰','News','blizz://search?q=technology&t=news'],
    ];
    content.innerHTML = `<div class="bb-home bb-page">
      <div class="bb-logo">${LOGO}<small>POWERED BY BLIZZARD</small></div>
      ${searchBox()}
      <div class="bb-btns"><button data-k="search">BlizBrowse Search</button><button data-k="lucky">I'm Feeling Snowy</button></div>
      <div class="bb-shortcuts">${sc.map(s => `<div class="bb-sc" data-u="${s[2]}"><i>${s[0]}</i>${s[1]}</div>`).join('')}</div>
      ${bookmarks().length ? `<div class="bb-bmarks"><div class="bb-bm-h">★ Bookmarks</div><div class="bb-bm-row">${bookmarks().map((b, i) =>
        `<div class="bb-bm" data-u="${esc(b.u)}"><i>${esc(((b.t || b.u).replace(/^https?:\/\/(www\.)?/, '')[0] || '★').toUpperCase())}</i><span>${esc((b.t || b.u).slice(0, 24))}</span><button class="bb-bm-x" data-rm="${i}" title="Remove bookmark">×</button></div>`).join('')}</div></div>` : ''}
      <a class="bb-histlink" data-u="blizz://history">🕘 History</a>
      <label class="bb-toggle"><input type="checkbox" ${BLIZ.store.get('bbNewTab', true) ? 'checked' : ''}><span class="bb-sw"></span>
        Open websites in a new tab <small>(recommended: every site works this way)</small></label>
      <label class="bb-toggle"><input type="checkbox" data-eng ${BLIZ.store.get('engine', 'bliz') === 'ddg' ? 'checked' : ''}><span class="bb-sw"></span>
        Send searches straight to DuckDuckGo <small>(off = results show here)</small></label>
    </div>`;
    wireSearch(content);
    content.querySelector('[data-k=search]').onclick = () => content.querySelector('.bb-sbox').requestSubmit();
    content.querySelector('[data-k=lucky]').onclick = async () => {
      try{ const d = await getJSON(`${WIKI}/api/rest_v1/page/random/summary`); nav('blizz://wiki/' + encodeURIComponent(d.titles.canonical)); }
      catch(e){ BLIZ.toast('Could not reach the internet'); }
    };
    content.querySelectorAll('[data-u]').forEach(el => el.onclick = () => nav(el.dataset.u));
    content.querySelectorAll('[data-rm]').forEach(b => b.onclick = e => { e.stopPropagation(); const l = bookmarks(); l.splice(+b.dataset.rm, 1); BLIZ.store.set('bbBookmarks', l); pageHome(); });
    content.querySelector('[data-eng]').onchange = e => { BLIZ.store.set('engine', e.target.checked ? 'ddg' : 'bliz'); BLIZ.toast(e.target.checked ? 'Searching with DuckDuckGo' : 'Searching with BlizBrowse'); };
    content.querySelector('.bb-toggle input').onchange = e => { BLIZ.store.set('bbNewTab', e.target.checked); BLIZ.toast(e.target.checked ? 'Websites will open in a new tab' : 'BlizBrowse will try to show websites inside'); };
    setTimeout(() => { const i = content.querySelector('.bb-sbox input'); if(i && matchMedia('(pointer:fine)').matches) i.focus(); }, 50);
  }

  /* ---------- search results ---------- */
  function resultsShell(q, t){
    const tabs = [['all','All'],['images','Images'],['videos','Videos'],['news','News']];
    content.innerHTML = `<div class="bb-page">
      <div class="bb-rhead"><div class="bb-logo" data-home>${LOGO}</div>${searchBox(q)}</div>
      <div class="bb-rtabs">${tabs.map(x => `<button data-t="${x[0]}" class="${x[0]===t?'on':''}">${x[1]}</button>`).join('')}</div>
      <div class="bb-body"></div></div>`;
    wireSearch(content);
    content.querySelector('[data-home]').onclick = () => nav('blizz://home');
    content.querySelectorAll('[data-t]').forEach(b => b.onclick = () => nav(`blizz://search?q=${encodeURIComponent(q)}&t=${b.dataset.t}`));
    return content.querySelector('.bb-body');
  }

  function calc(q){
    const s = q.replace(/^(what is|calculate|calc)\s+/i,'').replace(/[x×]/g,'*').replace(/÷/g,'/').replace(/\^/g,'**').replace(/=\s*$/,'');
    if(!/^[\d\s+\-*/().%]+$/.test(s) || !/\d/.test(s) || !/[+\-*/%]/.test(s)) return null;
    try{ const v = Function('"use strict";return (' + s + ')')(); return Number.isFinite(v) ? { expr:s.replace(/\*\*/g,'^'), v:+v.toPrecision(12) } : null; }catch(e){ return null; }
  }

  const matchVideos = q => {
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 2);
    return BLIZ.videos.filter(v => words.some(w => (v.t + ' ' + v.ch + ' ' + v.cat).toLowerCase().includes(w)));
  };

  async function pageSearch(p, live){
    const q = (p.get('q') || '').trim(), t = p.get('t') || 'all';
    setTitle(q + ' - BlizBrowse');
    if(ddgOn() && !p.get('t')){ ddgCard(q, false); return; }
    const body = resultsShell(q, t);
    if(t === 'images') return searchImages(q, body, live);
    if(t === 'videos') return searchVideos(q, body, live);
    if(t === 'news') return searchNews(q, body, live);

    const c = calc(q);
    const wx = q.match(/^(?:weather|forecast)(?:\s+(?:in|for))?\s+(.+)$/i) || q.match(/^(.+?)\s+weather$/i);
    const def = q.match(/^(?:define|definition of|meaning of|what does)\s+(\w[\w-]*)/i);
    const t0 = performance.now();
    const enc = encodeURIComponent(q);
    const ddgHref = 'https://duckduckgo.com/?q=' + enc;
    // Every section has its own slot and fills in the moment its source answers (no waiting on the slowest one)
    const SLOTS = ['ia', 'official', 'wiki0', 'news', 'videos', 'wiki1', 'qa', 'code', 'images', 'morenews', 'wiki2', 'books', 'related'];
    body.innerHTML = `<div class="bb-serp"><div class="bb-results">
        <div class="bb-ddgbar"><span>🦆 Also see <b>DuckDuckGo</b> results</span>
          <a href="${esc(ddgHref)}" target="_blank" rel="noopener">New tab ↗</a><a href="${esc(ddgHref)}" target="_top">This tab</a></div>
        <div class="bb-meta">Searching the web…</div>
        ${c ? `<div class="bb-card bb-calc"><small>${esc(c.expr)} =</small>${esc(c.v)}</div>` : ''}
        ${SLOTS.map(n => `<div data-slot="${n}"></div>`).join('')}
        <div class="bb-skel"><i></i><i></i><i></i></div>
      </div><div data-slot="panel"></div></div>`;
    const slot = n => body.querySelector(`[data-slot="${n}"]`);
    const fill = (n, html) => { if(!live()) return; const el = slot(n); if(!el) return; el.innerHTML = html || ''; wireLinks(el); };
    const tm = (pr, ms) => Promise.race([pr, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms || 7000))]);
    const jobs = [];
    const job = (pr, ok, fail, ms) => { const j = tm(pr, ms).then(d => { if(live()) ok(d); }, () => { if(live() && fail) fail(); }); jobs.push(j); return j; };

    const gdate = s => { const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)(\d\d)/.exec(s || ''); if(!m) return ''; const d = new Date(Date.UTC(+m[1], m[2]-1, +m[3], +m[4], +m[5])); const h = (Date.now() - d) / 36e5; return h < 1 ? 'Just now' : h < 24 ? Math.round(h) + ' hours ago' : h < 48 ? 'Yesterday' : d.toLocaleDateString(undefined, { month:'short', day:'numeric', year:'numeric' }); };
    const unent = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const relevant = text => { const t = (text || '').toLowerCase(); return words.length && words.every(w => t.includes(w)); };
    const hostOf = u => { try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return u; } };
    const crumb = u => { try{ const x = new URL(u); return esc(x.origin + (x.pathname.length > 1 ? ' › ' + x.pathname.split('/').filter(Boolean).slice(0,2).join(' › ') : '')); }catch(e){ return esc(u); } };
    const fav = u => `<img class="fav" src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostOf(u))}.ico" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
    const webResult = (url, title, site, snippet, extra='') => `<div class="bb-r"><div class="src">${fav(url)}<div>${esc(site)}<small>${crumb(url)}</small></div></div>
      <a data-u="${esc(url)}">${esc(title)}</a>${snippet ? `<p>${snippet}</p>` : ''}${extra}</div>`;
    const wikiResult = h => {
      const sl = encodeURIComponent(h.title.replace(/ /g,'_'));
      return `<div class="bb-r"><div class="src"><i>W</i><div>Wikipedia<small>https://en.wikipedia.org › wiki › ${esc(h.title)}</small></div></div>
        <a data-u="blizz://wiki/${sl}">${esc(h.title)}</a><p>${h.snippet.replace(/<(?!\/?span[ >])[^>]*>/g,'')}…</p></div>`;
    };
    let total = 0;
    const setMeta = () => { const m = body.querySelector('.bb-meta'); if(m && live()) m.textContent = `About ${total.toLocaleString()} results (${((performance.now() - t0) / 1000).toFixed(2)} seconds)`; };

    // Instant answers
    if(wx) weatherCard(wx[1], slot('ia')).catch(() => {});
    else if(def) dictCard(def[1], slot('ia')).catch(() => {});

    // Wikipedia
    job(getJSON(`${WIKI}/w/api.php?action=query&list=search&srsearch=${enc}&srlimit=10&srprop=snippet&format=json&origin=*`), d => {
      const hits = d.query.search; total += d.query.searchinfo.totalhits; setMeta();
      fill('wiki0', hits[0] ? wikiResult(hits[0]) : ''); fill('wiki1', hits[1] ? wikiResult(hits[1]) : ''); fill('wiki2', hits[2] ? wikiResult(hits[2]) : '');
      if(!wx && !def && !c && /^\w+$/.test(q) && hits.length) dictCard(q, slot('ia'), true).catch(() => {});
    });
    // Official website + knowledge panel
    job(getJSON(`https://api.duckduckgo.com/?q=${enc}&format=json&no_html=1&skip_disambig=1`), ddg => {
      const official = ddg.OfficialWebsite || (ddg.Results && ddg.Results[0] && ddg.Results[0].FirstURL);
      if(official) fill('official', webResult(official, `${ddg.Heading || q} - Official Site`, hostOf(official),
        ddg.AbstractText ? esc(ddg.AbstractText.slice(0, 190)) + (ddg.AbstractText.length > 190 ? '…' : '') : ''));
      if(ddg.Heading && ddg.AbstractText){
        const img = ddg.Image ? (ddg.Image.startsWith('http') ? ddg.Image : 'https://duckduckgo.com' + ddg.Image) : '';
        const facts = ((ddg.Infobox && ddg.Infobox.content) || []).filter(f => typeof f.value === 'string' && f.value.length < 80).slice(0, 6);
        const wikiLink = /wikipedia\.org\/wiki\//.test(ddg.AbstractURL || '') ? 'blizz://wiki/' + ddg.AbstractURL.split('/wiki/')[1] : ddg.AbstractURL;
        fill('panel', `<aside class="bb-kp">${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}
          <h2>${esc(ddg.Heading)}</h2>${ddg.Entity ? `<div class="ent">${esc(ddg.Entity)}</div>` : ''}
          <p>${esc(ddg.AbstractText.slice(0, 420))}${ddg.AbstractText.length > 420 ? '…' : ''} ${wikiLink ? `<a data-u="${esc(wikiLink)}">${esc(ddg.AbstractSource || 'More')}</a>` : ''}</p>
          ${facts.length ? `<dl>${facts.map(f => `<div><dt>${esc(f.label)}:</dt> <dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}
          ${official ? `<button class="bb-kp-site" data-u="${esc(official)}">🌐 Website</button>` : ''}</aside>`);
      }
    });
    // Videos (real YouTube results, with Blizzard's library as a backup)
    job(BLIZ.yt ? BLIZ.yt.piped('/search?q=' + enc + '&filter=videos') : Promise.reject(new Error('no yt')), yt => {
      const v = (yt.items || []).map(BLIZ.yt.fromPiped).filter(Boolean).slice(0, 8);
      fill('videos', v.length ? videoRow(v) : '');
    }, () => { const v = matchVideos(q).slice(0, 6); fill('videos', v.length ? videoRow(v) : ''); }, 8000);
    // News: quick results first, then upgrade with the bigger news source when it answers
    const seen = new Set(); let newsList = [], gotBig = false;
    const addNews = arr => arr.forEach(a => {
      if(!a.title || !a.url || !/^https?:/.test(a.url)) return;
      const k = a.title.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 40);
      if(!seen.has(k)){ seen.add(k); newsList.push(a); }
    });
    const renderNews = () => {
      const top = newsList.slice(0, 4);
      fill('news', top.length ? `<div class="bb-h2">Top stories</div><div class="bb-news">${top.map(a =>
        `<div class="bb-nc" data-u="${esc(a.url)}">${a.socialimage && a.socialimage.startsWith('https:') ? `<img class="bb-nimg" loading="lazy" src="${esc(a.socialimage)}" alt="" onerror="this.remove()">` : ''}
          <div class="src">${fav(a.url)} ${esc(a.domain || hostOf(a.url))}</div><b>${esc(a.title)}</b><small>${gdate(a.seendate)}</small></div>`).join('')}</div>` : '');
      fill('morenews', newsList.slice(4, 11).map(a => webResult(a.url, a.title, a.domain || hostOf(a.url), '', `<div class="bb-tags">${gdate(a.seendate)}</div>`)).join(''));
    };
    job(getJSON(`https://hn.algolia.com/api/v1/search?query=${enc}&tags=story&hitsPerPage=10`), d => {
      if(gotBig) return;
      const p2 = n => String(n).padStart(2, '0');
      addNews((d.hits || []).filter(h => h.title).map(h => { const t = new Date(h.created_at);
        return { url: h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, title: h.title, domain: '', socialimage: '',
          seendate: `${t.getUTCFullYear()}${p2(t.getUTCMonth()+1)}${p2(t.getUTCDate())}T${p2(t.getUTCHours())}${p2(t.getUTCMinutes())}00Z` }; }));
      renderNews();
    });
    job(getJSON(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q + ' sourcelang:english')}&mode=artlist&maxrecords=14&format=json&sort=hybridrel`), d => {
      const big = (d.articles || []); if(!big.length) return;
      gotBig = true; const old = newsList; newsList = []; seen.clear(); addNews(big); addNews(old); total += big.length * 2311; setMeta(); renderNews();
    }, null, 9000);
    // Q&A, code, images, books, related searches
    job(getJSON(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${enc}&site=stackoverflow&pagesize=5`), so => {
      fill('qa', (so.items || []).filter(it => relevant(unent(it.title)) || it.score > 50).slice(0, 2).map(it =>
        webResult(it.link, unent(it.title), 'Stack Overflow', '', `<div class="bb-tags">${it.answer_count} answers · ${it.score} votes${it.is_answered ? ' · ✓ answered' : ''}</div>`)).join(''));
    });
    job(getJSON(`https://api.github.com/search/repositories?q=${enc}&per_page=5`), gh => {
      total += gh.total_count || 0; setMeta();
      fill('code', (gh.items || []).filter(r => r.stargazers_count > 30 && (relevant(r.full_name + ' ' + r.description) || r.stargazers_count > 2000)).slice(0, 2).map(r =>
        webResult(r.html_url, `${r.full_name}: ${r.description ? unent(r.description).slice(0, 70) : 'GitHub repository'}`, 'GitHub',
          r.description ? esc(unent(r.description).slice(0, 180)) : '', `<div class="bb-tags">★ ${r.stargazers_count.toLocaleString()} stars${r.language ? ' · ' + esc(r.language) : ''}</div>`)).join(''));
    });
    job(getJSON(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${enc}&gsrnamespace=6&gsrlimit=14&prop=imageinfo&iiprop=url&iiurlwidth=240&format=json&origin=*`), imgs => {
      const pics = imgs.query ? Object.values(imgs.query.pages).filter(p => p.imageinfo && /\.(jpe?g|png|webp|gif)$/i.test(p.title)).sort((a, b) => a.index - b.index).slice(0, 8) : [];
      fill('images', pics.length ? `<div class="bb-h2">Images</div><div class="bb-irow" data-u="blizz://search?q=${enc}&t=images">${pics.map(p => `<img loading="lazy" src="${esc(p.imageinfo[0].thumburl)}" alt="">`).join('')}</div>` : '');
    });
    job(getJSON(`https://openlibrary.org/search.json?q=${enc}&limit=8&fields=key,title,author_name,first_publish_year,cover_i`), ol => {
      total += ol.numFound || 0; setMeta();
      const books = (ol.docs || []).filter(b => b.cover_i).slice(0, 6);
      fill('books', books.length ? `<div class="bb-h2">Books</div><div class="bb-books">${books.map(b =>
        `<div class="bb-book" data-u="https://openlibrary.org${esc(b.key)}"><img loading="lazy" src="https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg" alt=""><b>${esc(b.title)}</b><small>${esc((b.author_name || [''])[0])}${b.first_publish_year ? ' · ' + b.first_publish_year : ''}</small></div>`).join('')}</div>` : '');
    });
    job(getJSON(`${WIKI}/w/api.php?action=opensearch&search=${enc}&limit=9&namespace=0&format=json&origin=*`), rel => {
      const related = (rel[1] || []).filter(r => r.toLowerCase() !== q.toLowerCase()).slice(0, 8);
      fill('related', related.length ? `<div class="bb-h2">Related searches</div><div class="bb-related">${related.map(r =>
        `<button data-u="blizz://search?q=${encodeURIComponent(r)}">🔍 ${esc(r)}</button>`).join('')}</div>` : '');
    });

    await Promise.allSettled(jobs);
    if(!live()) return;
    const sk = body.querySelector('.bb-skel'); if(sk) sk.remove();
    setMeta();
    if(!c && !SLOTS.some(n => slot(n) && slot(n).innerHTML.trim()))
      fill('wiki0', `<div class="bb-r"><p>Your search - <b>${esc(q)}</b> - did not match any documents. Try different words.</p></div>`);
  }


  function videoRow(vids){
    const dur = v => v.dur && BLIZ.yt ? `<span class="bb-vdur">${BLIZ.yt.fmtDur(v.dur)}</span>` : '';
    return `<div class="bb-h2">Videos</div><div class="bb-vrow">${vids.map(v =>
      `<div class="bb-v" data-u="blizz://watch/youtube/${v.id}"><div class="bb-vth"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="">${dur(v)}</div><b>${esc(v.t)}</b><small>YouTube · ${esc(v.ch || '')}</small></div>`).join('')}</div>`;
  }
  function wireLinks(scope){
    scope.querySelectorAll('[data-u]').forEach(el => el.onclick = e => {
      e.preventDefault();
      const u = el.dataset.u;
      nav(u.startsWith('blizz://') ? u : resolveInput(u));
    });
  }

  async function searchImages(q, body, live){
    body.innerHTML = '<div class="bb-imgs"></div>';
    const d = await getJSON(`https://commons.wikimedia.org/w/api.php?action=query&generator=search&gsrsearch=${encodeURIComponent(q)}&gsrnamespace=6&gsrlimit=40&prop=imageinfo&iiprop=url&iiurlwidth=360&format=json&origin=*`);
    if(!live()) return;
    const pages = Object.values(d.query?.pages || {}).filter(p => p.imageinfo && /\.(jpe?g|png|gif|webp|svg)$/i.test(p.title)).sort((a,b) => a.index - b.index);
    const grid = body.querySelector('.bb-imgs');
    if(!pages.length){ grid.innerHTML = '<p style="grid-column:1/-1;color:#5f6368">No images found.</p>'; return; }
    grid.innerHTML = pages.map(p => {
      const name = p.title.replace(/^File:/,'').replace(/\.\w+$/,'');
      return `<figure data-full="${esc(p.imageinfo[0].url)}" data-n="${esc(name)}"><img loading="lazy" src="${esc(p.imageinfo[0].thumburl)}" alt=""><figcaption>${esc(name)}</figcaption></figure>`;
    }).join('');
    grid.onclick = e => {
      const f = e.target.closest('figure'); if(!f) return;
      const lb = document.createElement('div'); lb.className = 'bb-light';
      lb.innerHTML = `<img src="${f.dataset.full}" alt=""><div>${f.dataset.n} · Wikimedia Commons</div>`;
      lb.style.top = view.scrollTop + 'px'; lb.style.height = view.clientHeight + 'px'; lb.style.bottom = 'auto';
      lb.onclick = () => lb.remove(); view.appendChild(lb);
    };
  }

  async function searchVideos(q, body, live){
    body.innerHTML = `<div class="bb-results"><p class="bb-meta">Searching YouTube…</p></div>`;
    let vids = [], note = '';
    try{
      const d = await BLIZ.yt.piped('/search?q=' + encodeURIComponent(q) + '&filter=videos');
      vids = d.items.map(BLIZ.yt.fromPiped).filter(Boolean);
    }catch(e){
      vids = matchVideos(q);
      if(!vids.length) vids = BLIZ.videos.slice(0, 12);
      note = '<p class="bb-meta">Live video search is busy right now. Here are videos from Blizzard\'s library:</p>';
    }
    if(live && !live()) return;
    body.innerHTML = `<div class="bb-results">${note}${vids.map(v => `
      <div class="bb-r bb-vres">
        <div class="bb-vth" data-u="blizz://watch/youtube/${v.id}"><img src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt="" loading="lazy">${v.dur ? `<span class="bb-vdur">${BLIZ.yt.fmtDur(v.dur)}</span>` : ''}</div>
        <div><a data-u="blizz://watch/youtube/${v.id}">${esc(v.t)}</a>
          <div class="bb-tags">YouTube · ${esc(v.ch || '')}${v.views ? ' · ' + esc(BLIZ.yt.fmtViews(v.views)) : ''}${v.when ? ' · ' + esc(v.when) : ''}</div></div>
      </div>`).join('')}
      <button class="bb-more" data-u="blizz://watch/youtube">Open YouTube in Blizzard Watch →</button></div>`;
    wireLinks(body);
  }

  async function searchNews(q, body, live){
    body.innerHTML = `<div class="bb-results"><p class="bb-meta">Finding news…</p></div>`;
    let items = [];
    try{
      const d = await getJSON(`https://api.gdeltproject.org/api/v2/doc/doc?query=${encodeURIComponent(q + ' sourcelang:english')}&mode=artlist&maxrecords=40&format=json&sort=datedesc`);
      const seen = new Set();
      items = (d.articles || []).filter(a => { const k = (a.title || '').toLowerCase().slice(0, 40); if(!a.url || seen.has(k)) return false; seen.add(k); return true; })
        .map(a => ({ url:a.url, title:a.title, site:a.domain, img:a.socialimage && a.socialimage.startsWith('https:') ? a.socialimage : '', when:a.seendate }));
    }catch(e){
      const d = await getJSON(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`);
      items = d.hits.filter(h => h.title).map(h => ({ url:h.url || `https://news.ycombinator.com/item?id=${h.objectID}`, title:h.title, site:'', img:'', when:'' }));
    }
    if(!live()) return;
    const fmt = s => { const m = /^(\d{4})(\d\d)(\d\d)T(\d\d)/.exec(s || ''); return m ? new Date(Date.UTC(+m[1], m[2]-1, +m[3], +m[4])).toLocaleString(undefined, { month:'short', day:'numeric', hour:'numeric' }) : ''; };
    body.innerHTML = `<div class="bb-results">${items.length ? items.map(a => {
      let host = a.site; if(!host){ try{ host = new URL(a.url).hostname.replace(/^www\./,''); }catch(e){} }
      return `<div class="bb-r bb-newsres"><div><div class="src"><i>📰</i><div>${esc(host)}<small>${esc(fmt(a.when))}</small></div></div>
        <a data-u="${esc(a.url)}">${esc(a.title)}</a></div>${a.img ? `<img src="${esc(a.img)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</div>`;
    }).join('') : '<p class="bb-meta">No news stories found.</p>'}</div>`;
    wireLinks(body);
  }

  /* ---------- instant answers ---------- */
  const WMO = c => c===0?['☀️','Clear']:c<=2?['🌤️','Partly cloudy']:c===3?['☁️','Cloudy']:c<=48?['🌫️','Fog']:c<=57?['🌦️','Drizzle']:c<=67?['🌧️','Rain']:c<=77?['🌨️','Snow']:c<=82?['🌧️','Showers']:c<=86?['❄️','Snow showers']:['⛈️','Thunderstorm'];
  async function weatherCard(place, el){
    const g = await getJSON(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(place)}&count=1`);
    const loc = g.results && g.results[0];
    if(!loc){ el.innerHTML = `<div class="bb-card">Couldn't find a place called "${esc(place)}".</div>`; return; }
    const w = await getJSON(`https://api.open-meteo.com/v1/forecast?latitude=${loc.latitude}&longitude=${loc.longitude}&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit&wind_speed_unit=mph&timezone=auto`);
    const [ico, txt] = WMO(w.current.weather_code);
    const days = w.daily.time.map((d,i) => {
      const [di] = WMO(w.daily.weather_code[i]);
      const name = i === 0 ? 'Today' : new Date(d + 'T12:00').toLocaleDateString(undefined,{weekday:'short'});
      return `<div class="day">${name}<div style="font-size:22px">${di}</div>${Math.round(w.daily.temperature_2m_max[i])}° <span style="color:#70757a">${Math.round(w.daily.temperature_2m_min[i])}°</span></div>`;
    }).join('');
    el.innerHTML = `<div class="bb-card"><div style="color:#70757a;font-size:14px">${esc(loc.name)}${loc.admin1?', '+esc(loc.admin1):''}${loc.country?', '+esc(loc.country):''}</div>
      <div class="bb-wx"><span class="big">${ico}</span><span class="temp">${Math.round(w.current.temperature_2m)}°F</span>
      <div style="font-size:14px;color:#4d5156">${txt}<br>Humidity: ${w.current.relative_humidity_2m}%<br>Wind: ${Math.round(w.current.wind_speed_10m)} mph</div>
      <div class="days">${days}</div></div></div>`;
  }
  async function dictCard(word, el, quiet){
    let d;
    try{ d = await getJSON(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word)}`); }
    catch(e){ if(!quiet) el.innerHTML = `<div class="bb-card">No definition found for "${esc(word)}".</div>`; return; }
    const e0 = d[0];
    const audio = (e0.phonetics || []).find(p => p.audio);
    el.innerHTML = `<div class="bb-card bb-def"><h3>${esc(e0.word)} ${audio ? `<button title="Listen" style="font-size:18px" data-audio="${esc(audio.audio)}">🔊</button>` : ''}</h3>
      <div style="color:#70757a">${esc(e0.phonetic || '')}</div>
      ${e0.meanings.slice(0,3).map(m => `<div style="margin-top:10px"><em>${esc(m.partOfSpeech)}</em><ol>${m.definitions.slice(0,3).map(x => `<li>${esc(x.definition)}${x.example ? `<br><span style="color:#70757a">"${esc(x.example)}"</span>` : ''}</li>`).join('')}</ol></div>`).join('')}
    </div>`;
    const ab = el.querySelector('[data-audio]'); if(ab) ab.onclick = () => new Audio(ab.dataset.audio).play().catch(()=>{});
  }

  /* ---------- in-site apps ---------- */
  function appShell(title, ph, val, key){
    content.innerHTML = `<div class="bb-app bb-page"><h1>${title}</h1>
      <form class="bb-sbox" style="max-width:none"><span>🔍</span><input value="${esc(val)}" placeholder="${ph}" autocomplete="off"></form>
      <div class="out" style="margin-top:20px"></div></div>`;
    const f = content.querySelector('form');
    f.onsubmit = e => { e.preventDefault(); const v = f.querySelector('input').value.trim(); if(v) nav(`blizz://${key}=${encodeURIComponent(v)}`); };
    return content.querySelector('.out');
  }
  async function pageWeather(q){
    setTitle(q ? 'Weather: ' + q : 'BlizWeather');
    const out = appShell('🌤️ BlizWeather', 'Type a city, like Chicago', q, 'weather?q');
    if(!q){ out.innerHTML = '<p style="color:#5f6368">Search any city in the world for a live 7-day forecast.</p>'; return; }
    await weatherCard(q, out);
  }
  async function pageDict(w){
    setTitle(w ? 'Define: ' + w : 'BlizDictionary');
    const out = appShell('📖 BlizDictionary', 'Type a word', w, 'dictionary?w');
    if(!w){ out.innerHTML = '<p style="color:#5f6368">Look up the meaning of any English word.</p>'; return; }
    await dictCard(w, out);
  }
  async function pageMaps(q, live){
    setTitle(q ? q + ' - BlizMaps' : 'BlizMaps');
    const out = appShell('🗺️ BlizMaps', 'Search a place, like Eiffel Tower or Denver', q, 'maps?q');
    let place = null, label = 'Search for any place in the world. Drag to move, scroll or pinch to zoom.';
    if(q){
      const r = await getJSON(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(q)}`);
      if(!live()) return;
      if(r[0]){ place = r[0]; label = r[0].display_name; }
      else label = `Couldn't find "${q}".`;
    }
    out.innerHTML = `<p class="bb-meta" style="margin-bottom:10px">${esc(label)}</p><div class="bb-map"></div>
      <p class="bb-meta" style="margin-top:8px;font-size:12px">Map data © OpenStreetMap contributors</p>`;
    await loadLeaflet();
    if(!live()) return;
    const el = out.querySelector('.bb-map');
    const map = L.map(el, { zoomControl:true, worldCopyJump:true });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom:19, attribution:'&copy; OpenStreetMap contributors'
    }).addTo(map);
    if(place){
      const b = place.boundingbox.map(Number); // [south, north, west, east]
      map.fitBounds([[b[0], b[2]], [b[1], b[3]]], { maxZoom:17, padding:[20,20] });
      L.circleMarker([+place.lat, +place.lon], { radius:10, color:'#ff2bd6', weight:3, fillColor:'#00e5ff', fillOpacity:.9 })
        .addTo(map).bindPopup(esc(place.display_name.split(',').slice(0,2).join(','))).openPopup();
    }else map.setView([30, 0], 2);
    setTimeout(() => map.invalidateSize(), 250);
  }

  let leafletReady = null;
  function loadLeaflet(){
    if(window.L && L.map) return Promise.resolve();
    if(leafletReady) return leafletReady;
    leafletReady = new Promise((res, rej) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet'; css.href = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.css';
      document.head.appendChild(css);
      const s = document.createElement('script');
      s.src = 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/leaflet.min.js';
      s.onload = res; s.onerror = () => { leafletReady = null; rej(new Error('The map could not load.')); };
      document.head.appendChild(s);
    });
    return leafletReady;
  }

  function pageHistory(){
    setTitle('History');
    const h = BLIZ.store.get('bbHistory', []);
    const day = ts => {
      const d = new Date(ts), n = new Date();
      const diff = Math.round((new Date(n.toDateString()) - new Date(d.toDateString())) / 864e5);
      return diff === 0 ? 'Today' : diff === 1 ? 'Yesterday' : d.toLocaleDateString(undefined, { weekday:'long', month:'short', day:'numeric' });
    };
    let html = '', last = '';
    h.forEach(x => {
      const g = day(x.ts);
      if(g !== last){ html += `<h3 class="bb-hday">${g}</h3>`; last = g; }
      html += `<div class="bb-hrow" data-u="${esc(x.u)}"><span class="bb-htime">${new Date(x.ts).toLocaleTimeString([], { hour:'numeric', minute:'2-digit' })}</span>
        <b>${esc(x.t || x.u)}</b><small>${esc(x.u.startsWith('blizz://') ? 'BlizBrowse' : x.u.replace(/^https?:\/\//, '').slice(0, 60))}</small></div>`;
    });
    content.innerHTML = `<div class="bb-app bb-page"><h1>🕘 History</h1>
      <button class="bb-more" data-k="clear" style="margin:0 0 16px">Clear history</button>
      ${html || '<p class="bb-meta">Nothing here yet. Pages you visit in BlizBrowse show up here.</p>'}</div>`;
    content.querySelector('[data-k=clear]').onclick = () => { BLIZ.store.set('bbHistory', []); pageHistory(); BLIZ.toast('History cleared'); };
    wireLinks(content);
  }

  function pageWatch(url){
    const m = url.match(/^blizz:\/\/watch\/(\w+)(?:\/([\w-]{11}))?(?:\?u=(.*))?/) || [];
    setTitle('Blizzard Watch');
    content.innerHTML = `<div class="bb-err bb-page"><div class="big">📺</div><h2>Opening Blizzard Watch…</h2></div>`;
    BLIZ.openWatch && BLIZ.openWatch(m[1] || 'youtube', m[2] || (m[3] ? decodeURIComponent(m[3]) : null));
  }

  /* ---------- Wikipedia reader ---------- */
  async function pageWiki(title, live){
    const r = await fetch(`${WIKI}/api/rest_v1/page/html/${encodeURIComponent(title.replace(/ /g,'_'))}?redirect=true`);
    if(!r.ok) throw new Error(r.status === 404 ? 'That page does not exist.' : 'Wikipedia answered ' + r.status);
    const html = await r.text();
    if(!live()) return;
    const doc = new DOMParser().parseFromString(html, 'text/html');
    doc.querySelectorAll('script,style,link,meta,base,iframe,object,embed').forEach(n => n.remove());
    doc.querySelectorAll('*').forEach(n => [...n.attributes].forEach(a => { if(/^on/i.test(a.name)) n.removeAttribute(a.name); }));
    doc.querySelectorAll('img').forEach(img => {
      const fix = s => s && s.replace(/(^|\s|,)\/\//g, '$1https://');
      img.setAttribute('src', fix(img.getAttribute('src')));
      if(img.getAttribute('srcset')) img.setAttribute('srcset', fix(img.getAttribute('srcset')));
      img.loading = 'lazy';
    });
    const nice = (doc.title || title).replace(/_/g,' ');
    setTitle(nice);
    content.innerHTML = `<article class="bb-article bb-page"><h1 class="at">${esc(nice)}</h1><div class="from">From Wikipedia, the free encyclopedia · shown in BlizBrowse</div>${doc.body.innerHTML}</article>`;
    const art = content.querySelector('article');
    art.addEventListener('click', e => {
      const a = e.target.closest('a'); if(!a) return;
      const href = a.getAttribute('href') || '';
      e.preventDefault();
      if(href.startsWith('#')){ const t = art.querySelector(CSS.escape ? '#' + CSS.escape(href.slice(1)) : href); t && t.scrollIntoView({behavior:'smooth'}); return; }
      if(href.startsWith('./')){
        const page = href.slice(2).split('#')[0];
        if(/^(File|Special|Help|Template|Category|Wikipedia|Portal|Talk):/i.test(decodeURIComponent(page))) return;
        nav('blizz://wiki/' + page); return;
      }
      if(/^(https?:)?\/\//.test(href)){
        try{ nav(mapSite(new URL(href, 'https://en.wikipedia.org'))); }catch(_){}
      }
    });
  }

  /* ---------- any other website ---------- */
  function pageExternal(url, fresh){
    let u = null, host = url; try{ u = new URL(url); host = u.hostname; }catch(e){}
    if(!u || isDangerous(u)){
      setTitle('Blocked');
      content.innerHTML = `<div class="bb-err bb-page bb-blocked"><div class="big">🛡️</div><h2>BlizBrowse blocked this site</h2>
        <p>${esc(host)} looks unsafe (adult content, gambling, piracy or scams), so it won't open here.</p>
        <button class="bb-more" data-k="home" style="margin:18px auto 0">⌂ Back to BlizBrowse</button></div>`;
      content.querySelector('[data-k=home]').onclick = () => nav('blizz://home');
      return;
    }
    const isEmbed = /^(player\.twitch\.tv|player\.vimeo\.com|www\.openstreetmap\.org)$/.test(host) || /\/embed(\/|$)/.test(u.pathname);
    // Real websites: open them in a new tab, where every site works (most sites refuse to load inside another site)
    if(!isEmbed && BLIZ.store.get('bbNewTab', true)){
      setTitle(host.replace(/^www\./, ''));
      let opened = false;
      if(fresh){ try{ const w = window.open(u.href, '_blank'); if(w){ w.opener = null; opened = true; } }catch(e){} }
      content.innerHTML = `<div class="bb-err bb-page bb-noframe"><div class="big">${opened ? '🚀' : '🌐'}</div>
        <h2>${opened ? 'Opened ' + esc(host.replace(/^www\./, '')) + ' in a new tab' : esc(host.replace(/^www\./, ''))}</h2>
        <p>${opened ? 'The site is open in its own tab, so everything on it works. Come back to this tab any time.' : 'Websites open in their own tab so everything on them works.'}</p>
        <div class="bb-nf-btns">
          <a class="bb-more" href="${esc(u.href)}" target="_top">⤵ Open it in this tab</a>
          <a class="bb-more" href="${esc(u.href)}" target="_blank" rel="noopener">↗ ${opened ? 'Open it again' : 'Open ' + esc(host.replace(/^www\./, ''))}</a>
          <button class="bb-more" data-k="inside">Try showing it inside BlizBrowse</button>
          <button class="bb-more" data-k="home">⌂ Back to BlizBrowse</button>
        </div></div>`;
      content.querySelector('[data-k=inside]').onclick = () => showInside(u, host);
      content.querySelector('[data-k=home]').onclick = () => nav('blizz://home');
      return;
    }
    showInside(u, host, isEmbed);
  }
  function showInside(u, host, isEmbed){
    const url = u.href;
    const blockedBy = isEmbed ? null : noFrameName(host);
    if(blockedBy){
      setTitle(blockedBy);
      const name = blockedBy.replace(/ \(.*\)$/,'');
      content.innerHTML = `<div class="bb-err bb-page bb-noframe"><div class="big">🧊</div><h2>${esc(blockedBy)} can't be shown inside other websites</h2>
        <p>${esc(blockedBy)} blocks every site from displaying it inside a frame, so no in-site browser can load it. Here's what you can do instead:</p>
        <div class="bb-nf-btns">
          <button class="bb-more" data-k="search">🔍 Search "${esc(name)}" on BlizBrowse</button>
          <button class="bb-more" data-k="wiki">📚 Read about ${esc(name)}</button>
          <button class="bb-more" data-k="tab">↗ Open ${esc(name)} in a new tab</button>
        </div></div>`;
      content.querySelector('[data-k=search]').onclick = () => nav('blizz://search?q=' + encodeURIComponent(name + ' ' + u.pathname.replace(/[/_-]+/g,' ').trim()));
      content.querySelector('[data-k=wiki]').onclick = () => nav('blizz://wiki/' + encodeURIComponent(name.replace(/ /g,'_')));
      content.querySelector('[data-k=tab]').onclick = () => window.open(u.href, '_blank', 'noopener');
      return;
    }
    setTitle(host);
    content.innerHTML = `<iframe src="${esc(url)}" sandbox="allow-scripts allow-same-origin allow-forms allow-popups-to-escape-sandbox allow-presentation" referrerpolicy="no-referrer" allow="fullscreen; autoplay"></iframe>
      <div class="bb-ext-note">ℹ️ Some sites block being shown inside other sites. If this one stays blank, search for it instead.
        <button data-k="s">Search instead</button><button data-k="x">✕</button></div>`;
    content.querySelector('[data-k=s]').onclick = () => nav('blizz://search?q=' + encodeURIComponent(host.replace(/^www\./,'')));
    content.querySelector('[data-k=x]').onclick = e => e.target.closest('.bb-ext-note').remove();
    setTimeout(() => busy(false), 1500);
  }

  /* public hook so other parts of the site can open a page in BlizBrowse */
  BLIZ.browse = (u) => { BLIZ.go('browser'); nav(resolveInput(u)); };

  (function restoreTabs(){
    const saved = BLIZ.store.get('bbTabs', null);
    if(saved && saved.list && saved.list.length){
      saved.list.forEach(u => tabs.push({ id:++seq, hist:[u], idx:0,
        title: u === 'blizz://home' ? 'BlizBrowse' : decodeURIComponent(u.replace(/^blizz:\/\/search\?q=/, '').replace(/^https?:\/\/(www\.)?/, '').split('&')[0]).slice(0, 30) }));
      cur = tabs[Math.min(saved.cur || 0, tabs.length - 1)];
      load(cur.hist[0], false); renderTabs();
    } else newTab();
  })();
})();
