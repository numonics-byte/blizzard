/* Blizzard touch controls: on-screen buttons for keyboard-only games, shown only on touchscreens.
   Each game sets window.BLIZ_TOUCH = { dpad:'arrows'|'wasd', left:[...], right:[...], aim:true } before this runs.
   Buttons send the same key presses a keyboard would, so the game works unchanged. */
(function(){
  var cfg = window.BLIZ_TOUCH;
  if(!cfg) return;
  var touch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
  if(!touch) return;

  var K = {
    up:{key:'ArrowUp',code:'ArrowUp',keyCode:38}, down:{key:'ArrowDown',code:'ArrowDown',keyCode:40},
    left:{key:'ArrowLeft',code:'ArrowLeft',keyCode:37}, right:{key:'ArrowRight',code:'ArrowRight',keyCode:39},
    w:{key:'w',code:'KeyW',keyCode:87}, a:{key:'a',code:'KeyA',keyCode:65}, s:{key:'s',code:'KeyS',keyCode:83}, d:{key:'d',code:'KeyD',keyCode:68},
    q:{key:'q',code:'KeyQ',keyCode:81}, z:{key:'z',code:'KeyZ',keyCode:90}, x:{key:'x',code:'KeyX',keyCode:88}, c:{key:'c',code:'KeyC',keyCode:67},
    space:{key:' ',code:'Space',keyCode:32}, enter:{key:'Enter',code:'Enter',keyCode:13}, one:{key:'1',code:'Digit1',keyCode:49},
    p:{key:'p',code:'KeyP',keyCode:80}
  };
  function target(){ return document.querySelector('canvas') || document.body; }
  function key(type, k){
    var e = new KeyboardEvent(type, { key:k.key, code:k.code, bubbles:true, cancelable:true });
    try{
      Object.defineProperty(e, 'keyCode', { get:function(){ return k.keyCode; } });
      Object.defineProperty(e, 'which', { get:function(){ return k.keyCode; } });
    }catch(_){}
    target().dispatchEvent(e);
  }

  var css = document.createElement('style');
  css.textContent =
    '.bz-pad{position:fixed;bottom:18px;z-index:2147483640;display:flex;gap:10px;touch-action:none;user-select:none;-webkit-user-select:none}' +
    '.bz-pad.l{left:16px}.bz-pad.r{right:16px;flex-direction:column-reverse;align-items:flex-end}' +
    '.bz-pad.v{flex-direction:column}' +
    '.bz-b{width:64px;height:64px;border-radius:50%;border:2px solid rgba(255,255,255,.55);background:rgba(10,14,30,.45);color:#fff;' +
      'font:700 15px system-ui,sans-serif;display:grid;place-items:center;backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);touch-action:none}' +
    '.bz-b.on{background:rgba(0,229,255,.55);border-color:#fff;transform:scale(.94)}' +
    '.bz-b.wide{width:auto;min-width:76px;padding:0 14px;border-radius:32px}' +
    '.bz-dpad{position:relative;width:184px;height:184px}' +
    '.bz-dpad .bz-b{position:absolute}' +
    '.bz-dpad .u{left:60px;top:0}.bz-dpad .dn{left:60px;bottom:0}.bz-dpad .lf{left:0;top:60px}.bz-dpad .rt{right:0;top:60px}' +
    '@media (max-height:500px){.bz-b{width:54px;height:54px}.bz-dpad{width:156px;height:156px}.bz-dpad .u,.bz-dpad .dn{left:51px}.bz-dpad .lf,.bz-dpad .rt{top:51px}}';
  document.head.appendChild(css);

  // one button = one key, held while your finger is down (works with several fingers at once)
  function button(k, label, extra){
    var b = document.createElement('div');
    b.className = 'bz-b' + (extra ? ' ' + extra : '');
    b.textContent = label;
    var held = 0;
    function down(e){ e.preventDefault(); e.stopPropagation(); held++; if(held === 1){ b.classList.add('on'); key('keydown', K[k]); } }
    function up(e){ if(e) { e.preventDefault(); e.stopPropagation(); } if(!held) return; held = 0; b.classList.remove('on'); key('keyup', K[k]); }
    b.addEventListener('touchstart', down, { passive:false });
    b.addEventListener('touchend', up, { passive:false });
    b.addEventListener('touchcancel', up, { passive:false });
    b.addEventListener('mousedown', down); b.addEventListener('mouseup', up); b.addEventListener('mouseleave', function(){ up(); });
    return b;
  }
  // Tell the phone how wide the game is so it shrinks the whole game to fit the screen
  if(cfg.vw){
    var vm = document.querySelector('meta[name=viewport]');
    if(!vm){ vm = document.createElement('meta'); vm.name = 'viewport'; document.head.appendChild(vm); }
    vm.content = cfg.vw === 'device' ? 'width=device-width,initial-scale=1,user-scalable=no' : 'width=' + cfg.vw + ',user-scalable=no';
  }
  if(cfg.hide || cfg.css){ var hs = document.createElement('style'); hs.textContent = (cfg.hide ? cfg.hide + '{display:none!important}' : '') + (cfg.css || ''); document.head.appendChild(hs); }
  // ...then scale the buttons (and the exit bar) back up so they stay a comfortable size for fingers
  function rescale(){
    var vv = window.visualViewport, real = vv ? vv.width * vv.scale : window.innerWidth;
    var k = Math.max(1, Math.min(3, document.documentElement.clientWidth / (real || 1)));
    document.querySelectorAll('.bz-pad.l').forEach(function(p){ p.style.transform = 'scale(' + k + ')'; p.style.transformOrigin = 'bottom left'; });
    document.querySelectorAll('.bz-pad.r').forEach(function(p){ p.style.transform = 'scale(' + k + ')'; p.style.transformOrigin = 'bottom right'; });
    var ex = document.getElementById('blizExit'); if(ex){ ex.style.transform = 'scale(' + k + ')'; ex.style.transformOrigin = 'top left'; }
  }
  addEventListener('resize', rescale);
  if(window.visualViewport) visualViewport.addEventListener('resize', rescale);

  function mount(){
    setTimeout(rescale, 50); setTimeout(rescale, 600);
    var dirs = cfg.dpad === 'wasd' ? ['w','s','a','d'] : ['up','down','left','right'];
    if(cfg.dpad){
      var pad = document.createElement('div'); pad.className = 'bz-pad l';
      var dp = document.createElement('div'); dp.className = 'bz-dpad';
      dp.appendChild(button(dirs[0], '▲', 'u')); dp.appendChild(button(dirs[1], '▼', 'dn'));
      dp.appendChild(button(dirs[2], '◀', 'lf')); dp.appendChild(button(dirs[3], '▶', 'rt'));
      pad.appendChild(dp); document.body.appendChild(pad);
    }else if(cfg.left){
      var l = document.createElement('div'); l.className = 'bz-pad l' + (cfg.leftVertical ? ' v' : '');
      cfg.left.forEach(function(x){ l.appendChild(button(x.k, x.l, x.l.length > 2 ? 'wide' : '')); });
      document.body.appendChild(l);
    }
    if(cfg.right && cfg.right.length){
      var r = document.createElement('div'); r.className = 'bz-pad r';
      cfg.right.forEach(function(x){ r.appendChild(button(x.k, x.l, x.l.length > 2 ? 'wide' : '')); });
      document.body.appendChild(r);
    }
    // touch the game itself to aim and shoot (turned into mouse movement + clicks)
    if(cfg.aim){
      var mouse = function(type, t){
        target().dispatchEvent(new MouseEvent(type, { clientX:t.clientX, clientY:t.clientY, screenX:t.screenX, screenY:t.screenY, button:0, buttons:type === 'mouseup' ? 0 : 1, bubbles:true, cancelable:true }));
      };
      var onPad = function(el){ return el && el.closest && el.closest('.bz-pad, #blizExit, #blizMusicBtn'); };
      var aimId = null;
      document.addEventListener('touchstart', function(e){
        for(var i = 0; i < e.changedTouches.length; i++){
          var t = e.changedTouches[i];
          if(aimId === null && !onPad(t.target)){ aimId = t.identifier; mouse('mousemove', t); mouse('mousedown', t); e.preventDefault(); }
        }
      }, { passive:false });
      document.addEventListener('touchmove', function(e){
        for(var i = 0; i < e.changedTouches.length; i++){ var t = e.changedTouches[i]; if(t.identifier === aimId){ mouse('mousemove', t); e.preventDefault(); } }
      }, { passive:false });
      var end = function(e){
        for(var i = 0; i < e.changedTouches.length; i++){ var t = e.changedTouches[i]; if(t.identifier === aimId){ mouse('mouseup', t); mouse('click', t); aimId = null; } }
      };
      document.addEventListener('touchend', end, { passive:false });
      document.addEventListener('touchcancel', end, { passive:false });
    }
  }
  if(document.body) mount(); else addEventListener('DOMContentLoaded', mount);
})();
