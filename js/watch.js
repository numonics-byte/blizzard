/* Blizzard Watch: YouTube, TikTok, BlizzardMovies — all played inside the site */
(function(){
  const root = document.getElementById('watch');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const store = BLIZ.store;
  const avColor = s => `hsl(${[...s].reduce((a,c) => a + c.charCodeAt(0), 0) * 37 % 360},65%,45%)`;

  root.innerHTML = `
    <div class="sec-head"><h1>BLIZZARD <em>WATCH</em></h1><p>No sign-in. Everything plays right here.</p></div>
    <div class="w-apps">
      <button class="w-app" data-app="youtube" style="--c:#ff0033"><i>▶</i>YouTube</button>
      <button class="w-app" data-app="tiktok" style="--c:#fe2c55"><i>♪</i>TikTok</button>
      <button class="w-app" data-app="movies" style="--c:#3aa8ff"><i>🎬</i>BlizzardMovies</button>
    </div>
    <div class="w-stage"></div>
    <div class="bm-modal"><div class="bm-box"><div class="bm-player"></div>
      <div class="bm-info"><div><h4></h4><p></p></div><button class="bm-close">✕</button></div></div></div>`;
  const stage = root.querySelector('.w-stage');
  const modal = root.querySelector('.bm-modal');
  let app = null;

  root.querySelectorAll('[data-app]').forEach(b => b.onclick = () => openApp(b.dataset.app));
  function openApp(name, payload){
    app = name;
    root.querySelectorAll('[data-app]').forEach(b => b.classList.toggle('on', b.dataset.app === name));
    store.set('watchApp', name);
    if(name === 'youtube') YT(payload);
    else if(name === 'tiktok') TT(payload);
    else MOVIES();
  }
  BLIZ.openWatch = (name, payload) => { BLIZ.go('watch'); openApp(name, payload); };

  // Stop any playing video when leaving the Watch page
  document.addEventListener('bliz:view', e => {
    if(e.detail !== 'watch'){ stage.querySelectorAll('iframe').forEach(f => f.src = 'about:blank'); closeModal(); app = null; }
    else if(!app) openApp(store.get('watchApp', 'youtube'));
  });

  const ytEmbed = id => `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1&modestbranding=1`;
  const ytFrame = id => `<iframe src="${ytEmbed(id)}" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
  const parseYT = s => {
    s = s.trim();
    if(/^[\w-]{11}$/.test(s) && /[A-Z0-9_-]/.test(s)) return s;
    const m = s.match(/(?:v=|youtu\.be\/|\/shorts\/|\/embed\/|\/live\/)([\w-]{11})/);
    return m ? m[1] : null;
  };

  /* ================= YouTube ================= */
  let ytState = { cat:'All', q:'', extra:{} };
  function YT(id){
    stage.innerHTML = `<div class="yt">
      <div class="yt-top">
        <div class="yt-logo" data-home><span>▶</span><b>YouTube</b></div>
        <form class="yt-search"><input placeholder="Search or paste a YouTube link" value="${esc(ytState.q)}"><button>🔍</button></form>
        <button class="yt-gear" title="Settings">⚙️</button>
      </div>
      <div class="yt-setbox"></div>
      <div class="yt-body"></div></div>`;
    const body = stage.querySelector('.yt-body');
    stage.querySelector('[data-home]').onclick = () => { ytState.q = ''; ytState.cat = 'All'; YT(); };
    stage.querySelector('.yt-search').onsubmit = e => {
      e.preventDefault();
      const v = e.target.querySelector('input').value;
      const vid = parseYT(v);
      if(vid) return ytPlay(vid, body);
      ytState.q = v.trim(); ytHome(body);
    };
    stage.querySelector('.yt-gear').onclick = () => ytSettings(stage.querySelector('.yt-setbox'));
    if(id) ytPlay(id, body); else ytHome(body);
  }
  function ytSettings(box){
    if(box.innerHTML){ box.innerHTML = ''; return; }
    box.innerHTML = `<div class="yt-set"><b style="color:#fff">Search all of YouTube (optional)</b><br>
      Blizzard comes with a hand-picked video library and plays <b>any</b> YouTube link you paste. To search every video on YouTube,
      add a free YouTube Data API key (made at console.cloud.google.com). It's saved only on this device.
      <input placeholder="Paste API key" value="${esc(store.get('ytKey',''))}"><button class="yt-pill sub">Save</button></div>`;
    box.querySelector('button').onclick = () => {
      store.set('ytKey', box.querySelector('input').value.trim()); box.innerHTML = ''; BLIZ.toast('Saved');
    };
  }
  async function ytHome(body){
    const cats = ['All', ...new Set(BLIZ.videos.map(v => v.cat))];
    const q = ytState.q.toLowerCase();
    let list = BLIZ.videos.filter(v => (ytState.cat === 'All' || v.cat === ytState.cat) && (!q || (v.t + ' ' + v.ch + ' ' + v.cat).toLowerCase().includes(q)));
    body.innerHTML = `<div class="yt-chips">${cats.map(c => `<button class="${c===ytState.cat?'on':''}" data-c="${c}">${c}</button>`).join('')}</div><div class="yt-grid"></div>`;
    body.querySelectorAll('[data-c]').forEach(b => b.onclick = () => { ytState.cat = b.dataset.c; ytHome(body); });
    const grid = body.querySelector('.yt-grid');
    const key = store.get('ytKey', '');
    if(q && key){
      grid.innerHTML = '<div class="yt-msg">Searching YouTube…</div>';
      try{
        const r = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&videoEmbeddable=true&safeSearch=moderate&maxResults=24&q=${encodeURIComponent(ytState.q)}&key=${encodeURIComponent(key)}`);
        const d = await r.json();
        if(d.error) throw new Error(d.error.message);
        list = d.items.map(it => ({ id:it.id.videoId, t:decodeEnt(it.snippet.title), ch:it.snippet.channelTitle, cat:'Search' }));
        list.forEach(v => ytState.extra[v.id] = v);
      }catch(e){ grid.innerHTML = `<div class="yt-msg">YouTube search failed: ${esc(e.message)}</div>`; return; }
    }
    if(!list.length){
      grid.innerHTML = `<div class="yt-msg" style="grid-column:1/-1">No videos in the Blizzard library match "<b>${esc(ytState.q)}</b>".<br>
        Paste any YouTube link in the search bar to play it here, or tap ⚙️ to turn on full YouTube search.</div>`;
      return;
    }
    grid.innerHTML = list.map(v => `<div class="yt-card" data-id="${v.id}">
      <div class="yt-thumb"><img loading="lazy" src="https://i.ytimg.com/vi/${v.id}/hqdefault.jpg" alt=""></div>
      <div class="yt-meta"><div class="yt-av" style="background:${avColor(v.ch)}">${esc(v.ch[0].toUpperCase())}</div>
      <div><h4>${esc(v.t)}</h4><p>${esc(v.ch)}</p></div></div></div>`).join('');
    grid.querySelectorAll('[data-id]').forEach(c => c.onclick = () => ytPlay(c.dataset.id, body));
  }
  function decodeEnt(s){ const t = document.createElement('textarea'); t.innerHTML = s; return t.value; }
  function ytPlay(id, body){
    const v = BLIZ.videos.find(x => x.id === id) || ytState.extra[id] || { id, t:'YouTube video', ch:'YouTube', cat:'' };
    const subs = store.get('subs', []);
    const next = BLIZ.videos.filter(x => x.id !== id).sort((a,b) => (b.cat === v.cat) - (a.cat === v.cat) || Math.random() - .5).slice(0, 12);
    body.innerHTML = `<div class="yt-watch"><div>
        <div class="w-backrow"><button class="w-back" data-yback>← Back to videos</button><button class="w-back" data-go="home">⌂ Main Menu</button></div>
        <div class="yt-player">${ytFrame(id)}</div>
        <h2 class="yt-title">${esc(v.t)}</h2>
        <div class="yt-chan"><div class="yt-av" style="background:${avColor(v.ch)}">${esc(v.ch[0].toUpperCase())}</div>
          <div><b>${esc(v.ch)}</b><small>${v.cat ? esc(v.cat) : 'YouTube'}</small></div>
          <button class="yt-pill sub ${subs.includes(v.ch)?'subbed':''}">${subs.includes(v.ch)?'Subscribed ✓':'Subscribe'}</button>
          <button class="yt-pill" data-like>👍 Like</button><button class="yt-pill" data-share>↗ Share</button>
        </div>
        <div class="yt-desc">Playing inside Blizzard Watch. No sign-in needed. Tap the ⛶ button in the player for full screen.</div>
      </div>
      <div class="yt-next">${next.map(n => `<div class="yt-mini" data-id="${n.id}"><img loading="lazy" src="https://i.ytimg.com/vi/${n.id}/mqdefault.jpg" alt="">
        <div><h5>${esc(n.t)}</h5><p>${esc(n.ch)}</p></div></div>`).join('')}</div></div>`;
    body.querySelectorAll('[data-id]').forEach(c => c.onclick = () => { ytPlay(c.dataset.id, body); stage.scrollIntoView({behavior:'smooth'}); });
    body.querySelector('[data-yback]').onclick = () => ytHome(body);
    const sb = body.querySelector('.sub');
    sb.onclick = () => {
      let s = store.get('subs', []);
      s = s.includes(v.ch) ? s.filter(x => x !== v.ch) : [...s, v.ch]; store.set('subs', s);
      sb.classList.toggle('subbed', s.includes(v.ch)); sb.textContent = s.includes(v.ch) ? 'Subscribed ✓' : 'Subscribe';
    };
    body.querySelector('[data-like]').onclick = e => { e.target.textContent = '👍 Liked'; };
    body.querySelector('[data-share]').onclick = () => {
      const link = 'https://youtu.be/' + id;
      (navigator.clipboard ? navigator.clipboard.writeText(link) : Promise.reject()).then(() => BLIZ.toast('Link copied'), () => BLIZ.toast(link));
    };
  }

  /* ================= TikTok ================= */
  function TT(link){
    const accs = BLIZ.tiktokers;
    stage.innerHTML = `<div class="tt">
      <div class="tt-top"><div class="tt-logo"><i>♪</i> TikTok</div>
        <form class="tt-paste"><input placeholder="Paste a TikTok video link or @username"><button>Play</button></form></div>
      <div class="tt-body">
        <div class="tt-side"><h6>Popular creators</h6>${accs.map(a => `<button class="tt-acc" data-u="${a.u}">
          <span class="av" style="background:${avColor(a.u)}">${a.n[0]}</span><div><b>${esc(a.n)}</b><small>@${a.u}</small></div></button>`).join('')}</div>
        <div class="tt-main"></div>
      </div></div>`;
    const main = stage.querySelector('.tt-main');
    stage.querySelectorAll('[data-u]').forEach(b => b.onclick = () => ttCreator(b.dataset.u, main));
    stage.querySelector('.tt-paste').onsubmit = e => {
      e.preventDefault(); ttLink(e.target.querySelector('input').value, main);
    };
    if(link) ttLink(link, main); else ttCreator(accs[0].u, main);
  }
  function ttLink(s, main){
    s = s.trim();
    const vid = (s.match(/\/video\/(\d{8,})/) || s.match(/^(\d{15,})$/) || [])[1];
    if(vid){
      stage.querySelectorAll('.tt-acc').forEach(b => b.classList.remove('on'));
      main.innerHTML = `<div style="display:flex;flex-direction:column;align-items:center;gap:10px;width:100%"><div class="w-backrow"><button class="w-back" data-ttback>✕ Close video</button></div><div class="tt-frame"><iframe src="https://www.tiktok.com/player/v1/${vid}?autoplay=1&loop=1&rel=0" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></div></div>`;
      main.querySelector('[data-ttback]').onclick = () => ttCreator(BLIZ.tiktokers[0].u, main);
      return;
    }
    const user = (s.match(/@([\w.]{2,24})/) || s.match(/^([\w.]{2,24})$/) || [])[1];
    if(user) return ttCreator(user, main);
    if(/vm\.tiktok\.com|tiktok\.com\/t\//.test(s)){
      BLIZ.toast('Short links can\'t be opened. Open the video in TikTok, copy the full link with /video/ in it, and paste that here.');
      return;
    }
    BLIZ.toast('That doesn\'t look like a TikTok link');
  }
  function ttCreator(u, main){
    stage.querySelectorAll('.tt-acc').forEach(b => b.classList.toggle('on', b.dataset.u === u));
    main.innerHTML = `<div style="width:100%;max-width:780px;display:flex;flex-direction:column;align-items:center">
      <div class="tt-creator"><iframe src="https://www.tiktok.com/embed/@${encodeURIComponent(u)}" allow="autoplay; fullscreen; encrypted-media" allowfullscreen></iframe></div>
      <p class="tt-hint">Tap any video to play it right here. You can also paste a TikTok video link above.</p></div>`;
  }

  /* ================= BlizzardMovies ================= */
  const poster = m => m.src === 'yt' ? `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg` : `https://archive.org/services/img/${m.id}`;
  function MOVIES(){
    const ms = BLIZ.movies;
    const feat = ms[Math.floor(Math.random() * 7)];
    const rows = [...new Set(ms.map(m => m.row))];
    stage.innerHTML = `<div class="bm">
      <div class="bm-top"><div class="bm-logo">BLIZZARD<b>MOVIES</b></div><input class="bm-search" placeholder="🔍 Search movies"></div>
      <div class="bm-hero" style="background-image:url('https://i.ytimg.com/vi/${feat.id}/maxresdefault.jpg')">
        <div><span class="bm-tag">★ FEATURED</span><h2>${esc(feat.title)}</h2><p>${esc(feat.d)} · ${feat.year} · ${feat.len}</p>
        <button class="bm-btn" data-play="${ms.indexOf(feat)}">▶ Play</button><button class="bm-btn alt" data-info="${ms.indexOf(feat)}">ⓘ More info</button></div>
      </div>
      <div class="bm-rows"></div></div>`;
    const rowsEl = stage.querySelector('.bm-rows');
    const continueIds = store.get('bmRecent', []);
    function draw(q){
      const f = ms.filter(m => !q || (m.title + ' ' + m.d + ' ' + m.row).toLowerCase().includes(q));
      let html = '';
      const recent = !q && continueIds.map(i => ms[i]).filter(Boolean);
      if(recent && recent.length) html += rowHTML('Continue watching', recent);
      if(q) html += rowHTML(`Results for "${esc(q)}"`, f);
      else rows.forEach(r => html += rowHTML(r === 'Classics' ? 'Golden-age classics' : r === 'Spooky' ? 'Spooky night' : r + ' movies', f.filter(m => m.row === r)));
      rowsEl.innerHTML = html || '<p style="padding:26px;color:#99a">No movies found.</p>';
    }
    function rowHTML(title, list){
      if(!list.length) return '';
      return `<div class="bm-row"><h3>${title}</h3><div class="bm-scroll">${list.map(m =>
        `<div class="bm-card" data-play="${ms.indexOf(m)}"><div class="img" style="background-image:url('${poster(m)}')"></div>
        <div class="cap"><b>${esc(m.title)}</b><small>${m.year} · ${m.len}</small></div></div>`).join('')}</div></div>`;
    }
    draw('');
    stage.querySelector('.bm-search').oninput = e => draw(e.target.value.toLowerCase().trim());
    stage.querySelector('.bm').addEventListener('click', e => {
      const p = e.target.closest('[data-play],[data-info]'); if(!p) return;
      playMovie(+(p.dataset.play ?? p.dataset.info));
    });
  }
  function playMovie(i){
    const m = BLIZ.movies[i];
    const recent = [i, ...store.get('bmRecent', []).filter(x => x !== i)].slice(0, 8); store.set('bmRecent', recent);
    const src = m.src === 'yt' ? ytEmbed(m.id) : `https://archive.org/embed/${m.id}?autoplay=1`;
    modal.querySelector('.bm-player').innerHTML = `<iframe src="${src}" allow="autoplay; encrypted-media; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`;
    modal.querySelector('h4').textContent = `${m.title} (${m.year})`;
    modal.querySelector('p').textContent = `${m.d} · ${m.len} · ${m.src === 'yt' ? 'Open movie by Blender Studio' : 'Public domain · Internet Archive'}`;
    modal.classList.add('open');
  }
  function closeModal(){ modal.classList.remove('open'); modal.querySelector('.bm-player').innerHTML = ''; }
  modal.querySelector('.bm-close').onclick = closeModal;
  modal.onclick = e => { if(e.target === modal) closeModal(); };
  addEventListener('keydown', e => { if(e.key === 'Escape') closeModal(); });
})();
