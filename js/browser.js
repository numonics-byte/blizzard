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
      <form class="bb-url"><span class="lock">🔒</span><input spellcheck="false" autocomplete="off" placeholder="Search BlizBrowse or type a URL"></form>
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
  let tabs = [], cur = null, seq = 0, navToken = 0;
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
  }
  root.querySelector('.bb-newtab').onclick = () => newTab();
  btn('back').onclick = () => { if(cur.idx > 0){ cur.idx--; load(cur.hist[cur.idx], false); } };
  btn('fwd').onclick = () => { if(cur.idx < cur.hist.length-1){ cur.idx++; load(cur.hist[cur.idx], false); } };
  btn('reload').onclick = () => load(cur.hist[cur.idx], false);
  btn('home').onclick = () => nav('blizz://home');
  urlForm.onsubmit = e => { e.preventDefault(); nav(resolveInput(urlIn.value)); urlIn.blur(); };
  urlIn.addEventListener('focus', () => urlIn.select());

  function nav(url){
    cur.hist = cur.hist.slice(0, cur.idx+1); cur.hist.push(url); cur.idx++;
    load(url, true);
  }
  function setTitle(t){ cur.title = t; renderTabs(); }
  function busy(on){ loader.classList.toggle('on', on); }

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
    if(/^google\.|^bing\.com$|^duckduckgo\.com$|^search\.yahoo\.com$/.test(h)){
      const q = u.searchParams.get('q') || u.searchParams.get('p');
      return q ? 'blizz://search?q=' + encodeURIComponent(q) : 'blizz://home';
    }
    if(h === 'youtube.com' || h === 'youtu.be'){
      const id = h === 'youtu.be' ? u.pathname.slice(1) : (u.searchParams.get('v') || (u.pathname.match(/\/(shorts|embed)\/([\w-]{11})/)||[])[2]);
      return 'blizz://watch/youtube' + (id ? '/' + id : '');
    }
    if(h === 'tiktok.com') return 'blizz://watch/tiktok?u=' + encodeURIComponent(u.href);
    if(h === 'netflix.com') return 'blizz://watch/movies';
    return u.href;
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
      else if(url.startsWith('blizz://search')) await pageSearch(new URL(url.replace('blizz://','https://x/')).searchParams, live);
      else if(url.startsWith('blizz://wiki/')) await pageWiki(decodeURIComponent(url.slice(13)), live);
      else if(url.startsWith('blizz://weather')) await pageWeather(new URL(url.replace('blizz://','https://x/')).searchParams.get('q') || '', live);
      else if(url.startsWith('blizz://dictionary')) await pageDict(new URL(url.replace('blizz://','https://x/')).searchParams.get('w') || '', live);
      else if(url.startsWith('blizz://watch')) pageWatch(url);
      else if(url.startsWith('blizz://games')){ setTitle('Blizzard Games'); BLIZ.go('games'); }
      else pageExternal(url);
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
    f.onsubmit = e => { e.preventDefault(); if(inp.value.trim()) nav(resolveInput(inp.value)); };
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
      ['📖','Dictionary','blizz://dictionary'], ['🎮','Games','blizz://games'],
      ['▶️','YouTube','blizz://watch/youtube'], ['🎵','TikTok','blizz://watch/tiktok'],
      ['🎬','Movies','blizz://watch/movies'], ['📰','News','blizz://search?q=technology&t=news'],
    ];
    content.innerHTML = `<div class="bb-home bb-page">
      <div class="bb-logo">${LOGO}<small>POWERED BY BLIZZARD</small></div>
      ${searchBox()}
      <div class="bb-btns"><button data-k="search">BlizBrowse Search</button><button data-k="lucky">I'm Feeling Snowy</button></div>
      <div class="bb-shortcuts">${sc.map(s => `<div class="bb-sc" data-u="${s[2]}"><i>${s[0]}</i>${s[1]}</div>`).join('')}</div>
    </div>`;
    wireSearch(content);
    content.querySelector('[data-k=search]').onclick = () => content.querySelector('.bb-sbox').requestSubmit();
    content.querySelector('[data-k=lucky]').onclick = async () => {
      try{ const d = await getJSON(`${WIKI}/api/rest_v1/page/random/summary`); nav('blizz://wiki/' + encodeURIComponent(d.titles.canonical)); }
      catch(e){ BLIZ.toast('Could not reach the internet'); }
    };
    content.querySelectorAll('[data-u]').forEach(el => el.onclick = () => nav(el.dataset.u));
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
    const body = resultsShell(q, t);
    if(t === 'images') return searchImages(q, body, live);
    if(t === 'videos') return searchVideos(q, body);
    if(t === 'news') return searchNews(q, body, live);

    let html = '';
    const c = calc(q);
    if(c) html += `<div class="bb-card bb-calc"><small>${esc(c.expr)} =</small>${esc(c.v)}</div>`;
    const wx = q.match(/^(?:weather|forecast)(?:\s+(?:in|for))?\s+(.+)$/i) || q.match(/^(.+?)\s+weather$/i);
    const def = q.match(/^(?:define|definition of|meaning of|what does)\s+(\w[\w-]*)/i);
    html += `<div class="bb-ia"></div>`;
    body.innerHTML = `<div class="bb-results"><div class="bb-meta">Searching the web…</div></div>`;
    const t0 = performance.now();
    const enc = encodeURIComponent(q);
    // Ask many free sources at once; any that fail or are slow are simply skipped.
    const tm = (pr, ms=7000) => Promise.race([pr, new Promise((_, r) => setTimeout(() => r(new Error('timeout')), ms))]);
    const got = await Promise.allSettled([
      tm(getJSON(`${WIKI}/w/api.php?action=query&list=search&srsearch=${enc}&srlimit=10&srprop=snippet&format=json&origin=*`)),
      tm(getJSON(`https://api.duckduckgo.com/?q=${enc}&format=json&no_html=1&skip_disambig=1`)),
      tm(getJSON(`https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${enc}&site=stackoverflow&pagesize=5`)),
      tm(getJSON(`https://api.github.com/search/repositories?q=${enc}&per_page=5`)),
      tm(getJSON(`https://openlibrary.org/search.json?q=${enc}&limit=8&fields=key,title,author_name,first_publish_year,cover_i`)),
      tm(getJSON(`https://hn.algolia.com/api/v1/search?query=${enc}&tags=story&hitsPerPage=6`)),
      tm(getJSON(`${WIKI}/w/api.php?action=opensearch&search=${enc}&limit=9&namespace=0&format=json&origin=*`)),
    ]);
    if(!live()) return;
    const [wiki, ddg, so, gh, ol, hn, rel] = got.map(r => r.status === 'fulfilled' ? r.value : null);
    const unent = s => { const t = document.createElement('textarea'); t.innerHTML = s; return t.value; };
    const words = q.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    const relevant = text => { const t = (text || '').toLowerCase(); return words.length && words.every(w => t.includes(w)); };
    const hostOf = u => { try{ return new URL(u).hostname.replace(/^www\./,''); }catch(e){ return u; } };
    const crumb = u => { try{ const x = new URL(u); return esc(x.origin + (x.pathname.length > 1 ? ' › ' + x.pathname.split('/').filter(Boolean).slice(0,2).join(' › ') : '')); }catch(e){ return esc(u); } };
    const fav = u => `<img class="fav" src="https://icons.duckduckgo.com/ip3/${encodeURIComponent(hostOf(u))}.ico" alt="" loading="lazy" onerror="this.style.visibility='hidden'">`;
    const webResult = (url, title, site, snippet, extra='') => `<div class="bb-r"><div class="src">${fav(url)}<div>${esc(site)}<small>${crumb(url)}</small></div></div>
      <a data-u="${esc(url)}">${esc(title)}</a>${snippet ? `<p>${snippet}</p>` : ''}${extra}</div>`;

    const hits = wiki ? wiki.query.search : [];
    const total = (wiki ? wiki.query.searchinfo.totalhits : 0) + (gh ? gh.total_count : 0) + (ol ? ol.numFound : 0) + (hn ? hn.nbHits : 0);
    const out = [];

    // 1. Official website (like Google's top result)
    const official = ddg && (ddg.OfficialWebsite || (ddg.Results && ddg.Results[0] && ddg.Results[0].FirstURL));
    if(official) out.push(webResult(official, `${ddg.Heading || q} - Official Site`, hostOf(official),
      ddg.AbstractText ? esc(ddg.AbstractText.slice(0, 190)) + (ddg.AbstractText.length > 190 ? '…' : '') : ''));

    const wikiResult = h => {
      const slug = encodeURIComponent(h.title.replace(/ /g,'_'));
      return `<div class="bb-r"><div class="src"><i>W</i><div>Wikipedia<small>https://en.wikipedia.org › wiki › ${esc(h.title)}</small></div></div>
        <a data-u="blizz://wiki/${slug}">${esc(h.title)}</a><p>${h.snippet.replace(/<(?!\/?span[ >])[^>]*>/g,'')}…</p></div>`;
    };
    if(hits[0]) out.push(wikiResult(hits[0]));

    // 2. Top stories
    const stories = (hn ? hn.hits : []).filter(h => h.title).slice(0, 4);
    if(stories.length) out.push(`<div class="bb-h2">Top stories</div><div class="bb-news">${stories.map(h => {
      const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      return `<div class="bb-nc" data-u="${esc(url)}"><div class="src">${fav(url)} ${esc(hostOf(url))}</div><b>${esc(h.title)}</b><small>${new Date(h.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'})}</small></div>`;
    }).join('')}</div>`);

    hits.slice(1, 3).forEach(h => out.push(wikiResult(h)));

    // 3. Videos
    const vids = matchVideos(q).slice(0, 6);
    if(vids.length) out.push(videoRow(vids));

    // 4. Q&A and code
    (so ? so.items : []).filter(it => relevant(unent(it.title)) || it.score > 50).slice(0, 2).forEach(it =>
      out.push(webResult(it.link, unent(it.title), 'Stack Overflow', '', `<div class="bb-tags">${it.answer_count} answers · ${it.score} votes${it.is_answered ? ' · ✓ answered' : ''}</div>`)));
    (gh ? gh.items : []).filter(r => r.stargazers_count > 30 && (relevant(r.full_name + ' ' + r.description) || r.stargazers_count > 2000)).slice(0, 2).forEach(r =>
      out.push(webResult(r.html_url, `${r.full_name}: ${r.description ? unent(r.description).slice(0, 70) : 'GitHub repository'}`, 'GitHub',
        r.description ? esc(unent(r.description).slice(0, 180)) : '', `<div class="bb-tags">★ ${r.stargazers_count.toLocaleString()} stars${r.language ? ' · ' + esc(r.language) : ''}</div>`)));

    hits.slice(3).forEach(h => out.push(wikiResult(h)));

    // 5. Books
    const books = (ol ? ol.docs : []).filter(b => b.cover_i).slice(0, 6);
    if(books.length) out.push(`<div class="bb-h2">Books</div><div class="bb-books">${books.map(b =>
      `<div class="bb-book" data-u="https://openlibrary.org${esc(b.key)}"><img loading="lazy" src="https://covers.openlibrary.org/b/id/${b.cover_i}-M.jpg" alt=""><b>${esc(b.title)}</b><small>${esc((b.author_name || [''])[0])}${b.first_publish_year ? ' · ' + b.first_publish_year : ''}</small></div>`).join('')}</div>`);

    // 6. Related searches
    const related = (rel ? rel[1] : []).filter(r => r.toLowerCase() !== q.toLowerCase()).slice(0, 8);
    if(related.length) out.push(`<div class="bb-h2">Related searches</div><div class="bb-related">${related.map(r =>
      `<button data-u="blizz://search?q=${encodeURIComponent(r)}">🔍 ${esc(r)}</button>`).join('')}</div>`);

    if(!out.length) out.push(`<div class="bb-r"><p>Your search - <b>${esc(q)}</b> - did not match any documents. Try different words.</p></div>`);

    // Knowledge panel (right side), like Google's info box
    let panel = '';
    if(ddg && ddg.Heading && ddg.AbstractText){
      const img = ddg.Image ? (ddg.Image.startsWith('http') ? ddg.Image : 'https://duckduckgo.com' + ddg.Image) : '';
      const facts = ((ddg.Infobox && ddg.Infobox.content) || []).filter(f => typeof f.value === 'string' && f.value.length < 80).slice(0, 6);
      const wikiLink = /wikipedia\.org\/wiki\//.test(ddg.AbstractURL || '') ? 'blizz://wiki/' + ddg.AbstractURL.split('/wiki/')[1] : ddg.AbstractURL;
      panel = `<aside class="bb-kp">${img ? `<img src="${esc(img)}" alt="" onerror="this.remove()">` : ''}
        <h2>${esc(ddg.Heading)}</h2>${ddg.Entity ? `<div class="ent">${esc(ddg.Entity)}</div>` : ''}
        <p>${esc(ddg.AbstractText.slice(0, 420))}${ddg.AbstractText.length > 420 ? '…' : ''} ${wikiLink ? `<a data-u="${esc(wikiLink)}">${esc(ddg.AbstractSource || 'More')}</a>` : ''}</p>
        ${facts.length ? `<dl>${facts.map(f => `<div><dt>${esc(f.label)}:</dt> <dd>${esc(f.value)}</dd></div>`).join('')}</dl>` : ''}
        ${official ? `<button class="bb-kp-site" data-u="${esc(official)}">🌐 Website</button>` : ''}</aside>`;
    }
    const meta = `<div class="bb-meta">About ${total.toLocaleString()} results (${((performance.now()-t0)/1000).toFixed(2)} seconds)</div>`;
    body.innerHTML = `<div class="bb-serp"><div class="bb-results">${meta}${html}${out.join('')}</div>${panel}</div>`;
    wireLinks(body);
    const ia = body.querySelector('.bb-ia');
    if(wx) weatherCard(wx[1], ia).catch(()=>{});
    else if(def) dictCard(def[1], ia).catch(()=>{});
    else if(/^\w+$/.test(q) && !c && hits.length) dictCard(q, ia, true).catch(()=>{});
  }

  function videoRow(vids){
    return `<div class="bb-h2">Videos</div><div class="bb-vrow">${vids.map(v =>
      `<div class="bb-v" data-u="blizz://watch/youtube/${v.id}"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" alt=""><b>${esc(v.t)}</b></div>`).join('')}</div>`;
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

  function searchVideos(q, body){
    let vids = matchVideos(q);
    const note = vids.length ? '' : '<p class="bb-meta">No exact matches. Here are some popular videos:</p>';
    if(!vids.length) vids = BLIZ.videos.slice(0, 12);
    body.innerHTML = `<div class="bb-results">${note}${vids.map(v => `
      <div class="bb-r" style="display:flex;gap:16px;align-items:flex-start">
        <img data-u="blizz://watch/youtube/${v.id}" src="https://i.ytimg.com/vi/${v.id}/mqdefault.jpg" style="width:180px;border-radius:10px;cursor:pointer;flex:none" alt="">
        <div><div class="src"><div>YouTube<small>${esc(v.ch)}</small></div></div><a data-u="blizz://watch/youtube/${v.id}">${esc(v.t)}</a></div>
      </div>`).join('')}
      <button class="bb-more" data-u="blizz://watch/youtube">Open YouTube in Blizzard Watch →</button></div>`;
    wireLinks(body);
  }

  async function searchNews(q, body, live){
    const d = await getJSON(`https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(q)}&tags=story&hitsPerPage=20`);
    if(!live()) return;
    const hits = d.hits.filter(h => h.title);
    body.innerHTML = `<div class="bb-results">${hits.length ? hits.map(h => {
      const url = h.url || `https://news.ycombinator.com/item?id=${h.objectID}`;
      let host = ''; try{ host = new URL(url).hostname.replace(/^www\./,''); }catch(e){}
      return `<div class="bb-r"><div class="src"><i>📰</i><div>${esc(host)}<small>${new Date(h.created_at).toLocaleDateString()} · ${h.points||0} points</small></div></div>
        <a data-u="${esc(url)}">${esc(h.title)}</a></div>`;
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
  function pageExternal(url){
    let host = url; try{ host = new URL(url).hostname; }catch(e){}
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

  newTab();
})();
