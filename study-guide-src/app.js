(function(){
'use strict';

var body = document.body;
var NS = 'http://www.w3.org/2000/svg';
var viewIndex = document.getElementById('view-index');
var viewTopic = document.getElementById('view-topic');
var sections = Array.prototype.slice.call(document.querySelectorAll('.topic-section'));
var dock = document.getElementById('dock');

/* =====================================================================
   Storage: IndexedDB key/value, falls back to memory if unavailable
   ===================================================================== */
var DB = (function(){
  var mem = {}, dbp = null;
  function open(){
    if(dbp) return dbp;
    dbp = new Promise(function(res){
      try{
        var r = indexedDB.open('sdg-notes', 1);
        r.onupgradeneeded = function(){ r.result.createObjectStore('kv'); };
        r.onsuccess = function(){ res(r.result); };
        r.onerror = function(){ res(null); };
      }catch(e){ res(null); }
    });
    return dbp;
  }
  function get(k){
    return open().then(function(db){
      if(!db) return mem[k];
      return new Promise(function(res){
        var r = db.transaction('kv').objectStore('kv').get(k);
        r.onsuccess = function(){ res(r.result); };
        r.onerror = function(){ res(undefined); };
      });
    });
  }
  function set(k, v){
    return open().then(function(db){
      if(!db){ mem[k] = v; return; }
      return new Promise(function(res){
        var t = db.transaction('kv', 'readwrite');
        t.objectStore('kv').put(v, k);
        t.oncomplete = res; t.onerror = res;
      });
    });
  }
  function all(){
    return open().then(function(db){
      if(!db) return Object.assign({}, mem);
      return new Promise(function(res){
        var out = {};
        var r = db.transaction('kv').objectStore('kv').openCursor();
        r.onsuccess = function(){ var c = r.result; if(c){ out[c.key] = c.value; c.continue(); } else res(out); };
        r.onerror = function(){ res(out); };
      });
    });
  }
  return { get:get, set:set, all:all };
})();

var persistAsked = false;
function askPersist(){
  if(persistAsked) return;
  persistAsked = true;
  try{ if(navigator.storage && navigator.storage.persist) navigator.storage.persist(); }catch(e){}
}

/* =====================================================================
   Preferences
   ===================================================================== */
var PEN_COLORS = ['#15160f', '#4d5720', '#b5462b', '#2c5d8a'];
var HL_COLORS  = ['#f3dc5a', '#bfd66f', '#f2a9bd', '#9fd0e8'];
var PEN_SIZES  = [1.6, 2.6, 4.2];
var HL_SIZES   = [12, 18, 26];

var prefs = { mode:'generated', penColor:PEN_COLORS[0], hlColor:HL_COLORS[0], penSize:PEN_SIZES[1], hlSize:HL_SIZES[1], finger:false, showInk:true };
try{ Object.assign(prefs, JSON.parse(localStorage.getItem('sdg-prefs') || '{}')); }catch(e){}
try{ var legacy = localStorage.getItem('sdg-mode'); if(legacy && !localStorage.getItem('sdg-prefs')) prefs.mode = legacy; }catch(e){}
function savePrefs(){ try{ localStorage.setItem('sdg-prefs', JSON.stringify(prefs)); }catch(e){} }

var tool = 'read';

/* =====================================================================
   Mode toggle (Rapid guide / Original)
   ===================================================================== */
body.setAttribute('data-mode', prefs.mode === 'original' ? 'original' : 'generated');
body.classList.toggle('ink-hidden', !prefs.showInk);
document.getElementById('modeBtn').addEventListener('click', function(){
  var next = body.getAttribute('data-mode') === 'generated' ? 'original' : 'generated';
  body.setAttribute('data-mode', next);
  prefs.mode = next; savePrefs();
  activateMainHost();
});

/* =====================================================================
   Routing: index <-> single topic
   ===================================================================== */
var activeSection = null;
var openedFromIndex = false;
var indexScrollY = 0;

function showIndex(){
  closeRecall(); closeNote(); closePops();
  sections.forEach(function(s){ s.hidden = true; });
  activeSection = null;
  viewTopic.hidden = true; dock.hidden = true;
  viewIndex.hidden = false;
  setTool('read');
  document.title = 'System Design — Rapid Study Guide';
  refreshIndex();
  window.scrollTo(0, indexScrollY);
}

function showTopic(id){
  var target = document.getElementById(id);
  if(!target){ showIndex(); return; }
  closeNote(); closePops();
  sections.forEach(function(s){ s.hidden = (s.id !== id); });
  activeSection = target;
  viewIndex.hidden = true;
  viewTopic.hidden = false; dock.hidden = false;
  window.scrollTo(0, 0);
  var t = target.querySelector('.topic-title');
  document.title = (t ? t.textContent : 'Topic') + ' — System Design Rapid Guide';
  touchMeta(id, { visited: Date.now() });
  activateMainHost();
  maybeHint();
}

function route(){
  var hash = location.hash.replace(/^#\/?/, '');
  if(hash && document.getElementById(hash) && document.getElementById(hash).classList.contains('topic-section')) showTopic(hash);
  else { openedFromIndex = false; showIndex(); }
}

document.getElementById('indexGrid').addEventListener('click', function(e){
  var card = e.target.closest('.topic-card');
  if(!card) return;
  openTopicFromIndex(card.getAttribute('data-target'));
});
function openTopicFromIndex(id){
  indexScrollY = window.scrollY;
  openedFromIndex = true;
  location.hash = '/' + id;
}
document.getElementById('backBtn').addEventListener('click', function(){
  if(openedFromIndex) history.back();
  else { history.replaceState(null, '', location.pathname + location.search); route(); }
});
window.addEventListener('hashchange', route);

/* ---- filter ---- */
var filterInput = document.getElementById('filterInput');
var cards = Array.prototype.slice.call(document.querySelectorAll('.topic-card'));
filterInput.addEventListener('input', function(){
  var q = filterInput.value.trim().toLowerCase(), visible = 0;
  cards.forEach(function(c){
    var m = c.getAttribute('data-search').indexOf(q) !== -1;
    c.hidden = !m; if(m) visible++;
  });
  document.getElementById('filterEmpty').hidden = visible !== 0;
});

/* =====================================================================
   Per-topic meta (visits, recall rating) + index progress
   ===================================================================== */
function touchMeta(id, patch){
  var k = 'meta:' + id;
  return DB.get(k).then(function(m){ return DB.set(k, Object.assign({}, m || {}, patch)); });
}

function ago(ts){
  var d = Math.floor((Date.now() - ts) / 86400000);
  if(d <= 0) return 'today';
  if(d === 1) return 'yesterday';
  return d + 'd ago';
}

function refreshIndex(){
  DB.all().then(function(all){
    var review = [];
    cards.forEach(function(card){
      var id = card.getAttribute('data-target');
      var meta = all['meta:' + id] || {};
      var marks = 0;
      ['generated', 'original'].forEach(function(m){
        var d = all['ink:' + id + ':' + m];
        if(d) marks += (d.strokes || []).length + (d.notes || []).length;
      });
      var el = card.querySelector('.tc-status');
      var html = '';
      if(meta.rating){
        html += '<span class="dots" title="Recall ' + meta.rating + '/5">';
        for(var i = 1; i <= 5; i++) html += '<i class="' + (i <= meta.rating ? 'on' : '') + '"></i>';
        html += '</span>';
      }
      if(marks) html += '<span>' + marks + ' mark' + (marks === 1 ? '' : 's') + '</span>';
      if(meta.visited) html += '<span>Studied ' + ago(meta.visited) + '</span>';
      el.innerHTML = html;
      if(meta.visited){
        var r = meta.rating || 0;
        var stale = (Date.now() - (meta.ratedAt || meta.visited)) / 86400000;
        if(r < 4 || stale > 5) review.push({ id:id, r:r, t:meta.ratedAt || meta.visited, card:card });
      }
    });
    review.sort(function(a, b){ return (a.r - b.r) || (a.t - b.t); });
    var strip = document.getElementById('reviewStrip');
    var chips = document.getElementById('reviewChips');
    chips.innerHTML = '';
    review.slice(0, 3).forEach(function(x){
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'rv-chip';
      var num = x.card.querySelector('.tc-num').textContent;
      var title = x.card.querySelector('.tc-title').textContent;
      b.innerHTML = '<b>' + num + '</b>';
      b.appendChild(document.createTextNode(title + (x.r ? ' · ' + x.r + '/5' : ' · not rated')));
      b.addEventListener('click', function(){ openTopicFromIndex(x.id); });
      chips.appendChild(b);
    });
    strip.hidden = review.length === 0;
  });
}

/* =====================================================================
   Ink engine
   A "host" is an element that carries ink. Strokes are stored relative
   to the nearest content block (paragraph, list item, figure...) and
   normalised by the host width, so ink stays next to the text it was
   written on when the tablet rotates or answers expand.
   ===================================================================== */
var BLOCK_SEL = 'h3,h4,p,li,figure,img,table,pre,blockquote,summary,.io-block,.beacon,.hook,.analogy,.pitfall,.journey,.tradeoff,.pro,.con,.anim';

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

function makeSvg(cls){ var s = document.createElementNS(NS, 'svg'); s.setAttribute('class', cls); return s; }

function hostFor(el){
  if(el._host) return el._host;
  var sec = el.closest('.topic-section');
  var mode = el.classList.contains('generated') ? 'generated' : 'original';
  var h = {
    el: el, key: 'ink:' + sec.id + ':' + mode, anchored: true,
    blocks: Array.prototype.slice.call(el.querySelectorAll(BLOCK_SEL)).filter(function(b){ var a = b.closest('.anim'); return !a || a === b; }),
    data: { strokes: [], notes: [] }, undo: [], loaded: false, abs: []
  };
  h.hl = makeSvg('ink-hl'); h.pen = makeSvg('ink-pen');
  h.notesEl = document.createElement('div'); h.notesEl.className = 'note-layer';
  el.appendChild(h.hl); el.appendChild(h.pen); el.appendChild(h.notesEl);
  el._host = h;
  return h;
}

function loadHost(h){
  if(h.loaded) { renderHost(h); return Promise.resolve(h); }
  return DB.get(h.key).then(function(d){
    if(d){ h.data.strokes = d.strokes || []; h.data.notes = d.notes || []; }
    h.loaded = true; renderHost(h); return h;
  });
}

function saveHost(h){
  askPersist();
  return DB.set(h.key, { strokes: h.data.strokes, notes: h.data.notes || [] });
}

function blockRects(h){
  var base = h.el.getBoundingClientRect();
  return h.blocks.map(function(b){
    var r = b.getBoundingClientRect();
    return (r.width || r.height) ? { x: r.left - base.left, y: r.top - base.top } : null;
  });
}

function origin(rects, a){
  if(a < 0 || !rects) return { x: 0, y: 0 };
  return rects[a] || null;
}

function pickAnchor(rects, y){
  var best = -1;
  for(var i = 0; i < rects.length; i++){ var r = rects[i]; if(r && r.y <= y + 2) best = i; }
  return best;
}

function fmt(n){ return Math.round(n * 10) / 10; }

function smooth(pts){
  if(pts.length < 3) return pts;
  var out = [pts[0]];
  for(var i = 1; i < pts.length - 1; i++){
    var a = pts[i - 1], b = pts[i], c = pts[i + 1];
    out.push([(a[0] + b[0] * 2 + c[0]) / 4, (a[1] + b[1] * 2 + c[1]) / 4, b[2]]);
  }
  out.push(pts[pts.length - 1]);
  return out;
}

function penPath(pts, size){
  var w = function(p){ return Math.max(.45, size * (.35 + p * .9) / 2); };
  if(pts.length === 1){
    var r = w(pts[0][2]), x = pts[0][0], y = pts[0][1];
    return 'M' + fmt(x - r) + ',' + fmt(y) + 'a' + fmt(r) + ',' + fmt(r) + ' 0 1,0 ' + fmt(r * 2) + ',0a' + fmt(r) + ',' + fmt(r) + ' 0 1,0 ' + fmt(-r * 2) + ',0Z';
  }
  var sm = smooth(pts), L = [], R = [];
  for(var i = 0; i < sm.length; i++){
    var a = sm[Math.max(0, i - 1)], b = sm[Math.min(sm.length - 1, i + 1)];
    var dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    var hw = w(sm[i][2]);
    L.push([sm[i][0] - dy * hw, sm[i][1] + dx * hw]);
    R.push([sm[i][0] + dy * hw, sm[i][1] - dx * hw]);
  }
  var d = 'M' + fmt(L[0][0]) + ',' + fmt(L[0][1]);
  for(i = 1; i < L.length; i++) d += 'L' + fmt(L[i][0]) + ',' + fmt(L[i][1]);
  var er = w(sm[sm.length - 1][2]);
  d += 'A' + fmt(er) + ',' + fmt(er) + ' 0 0,1 ' + fmt(R[R.length - 1][0]) + ',' + fmt(R[R.length - 1][1]);
  for(i = R.length - 2; i >= 0; i--) d += 'L' + fmt(R[i][0]) + ',' + fmt(R[i][1]);
  var sr = w(sm[0][2]);
  d += 'A' + fmt(sr) + ',' + fmt(sr) + ' 0 0,1 ' + fmt(L[0][0]) + ',' + fmt(L[0][1]) + 'Z';
  return d;
}

function polyline(pts){
  var d = 'M' + fmt(pts[0][0]) + ',' + fmt(pts[0][1]);
  if(pts.length === 1) d += 'l0.1,0';
  for(var i = 1; i < pts.length; i++) d += 'L' + fmt(pts[i][0]) + ',' + fmt(pts[i][1]);
  return d;
}

function straighten(pts, size){
  var minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, sy = 0;
  pts.forEach(function(p){ minX = Math.min(minX, p[0]); maxX = Math.max(maxX, p[0]); minY = Math.min(minY, p[1]); maxY = Math.max(maxY, p[1]); sy += p[1]; });
  if(maxY - minY < size * 1.1 && maxX - minX > size * 1.2){
    var y = sy / pts.length;
    return [[pts[0][0], y, .5], [pts[pts.length - 1][0], y, .5]];
  }
  return pts;
}

function strokeEl(s, pts, size){
  var p = document.createElementNS(NS, 'path');
  if(s.t === 'hl'){
    p.setAttribute('d', polyline(pts));
    p.setAttribute('fill', 'none'); p.setAttribute('stroke', s.c);
    p.setAttribute('stroke-width', fmt(size));
    p.setAttribute('stroke-linecap', 'round'); p.setAttribute('stroke-linejoin', 'round');
  } else {
    p.setAttribute('d', penPath(pts, size));
    p.setAttribute('fill', s.c);
  }
  return p;
}

function renderHost(h){
  var W = h.el.clientWidth;
  if(!W) return;
  var rects = h.anchored ? blockRects(h) : null;
  var hlFrag = document.createDocumentFragment(), penFrag = document.createDocumentFragment();
  h.abs = [];
  h.data.strokes.forEach(function(s){
    var o = origin(rects, s.a);
    if(!o) return;
    var pts = [];
    for(var i = 0; i < s.p.length; i += 3) pts.push([o.x + s.p[i] * W / 1e4, o.y + s.p[i + 1] * W / 1e4, s.p[i + 2] / 100]);
    var size = s.w * W / 1e4;
    h.abs.push({ id: s.id, pts: pts, size: size });
    (s.t === 'hl' ? hlFrag : penFrag).appendChild(strokeEl(s, pts, size));
  });
  h.hl.textContent = ''; h.pen.textContent = '';
  h.hl.appendChild(hlFrag); h.pen.appendChild(penFrag);
  if(h.notesEl){
    h.notesEl.textContent = '';
    (h.data.notes || []).forEach(function(n, i){
      var o = origin(rects, n.a);
      if(!o) return;
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'note-pin';
      b.textContent = n.text ? String(i + 1) : '+';
      b.title = n.text || 'Empty note';
      b.style.left = fmt(o.x + n.x * W / 1e4) + 'px';
      b.style.top = fmt(o.y + n.y * W / 1e4) + 'px';
      b.setAttribute('data-note', n.id);
      h.notesEl.appendChild(b);
    });
  }
}

var roTargets = new Map();
var ro = ('ResizeObserver' in window) ? new ResizeObserver(function(entries){
  entries.forEach(function(en){ var h = roTargets.get(en.target); if(h) scheduleRender(h); });
}) : null;
function observe(h){ if(ro && !roTargets.has(h.el)){ roTargets.set(h.el, h); ro.observe(h.el); } }
function scheduleRender(h){
  if(h._raf) return;
  h._raf = requestAnimationFrame(function(){ h._raf = 0; if(!stroke || stroke.host !== h) renderHost(h); });
}
window.addEventListener('resize', function(){ var h = currentMainHost(); if(h) scheduleRender(h); });

function currentMainHost(){
  if(viewTopic.hidden || !activeSection) return null;
  var el = activeSection.querySelector('.content.' + body.getAttribute('data-mode'));
  return el ? hostFor(el) : null;
}
function activateMainHost(){
  var h = currentMainHost();
  if(!h) return;
  loadHost(h); observe(h);
  Array.prototype.forEach.call(h.el.querySelectorAll('img'), function(img){
    if(!img.complete) img.addEventListener('load', function(){ scheduleRender(h); }, { once: true });
  });
}

/* ---- stroke lifecycle (shared by page ink and recall pad) ---- */
var stroke = null;

function localPt(h, e){
  var r = h.el.getBoundingClientRect();
  var p = e.pointerType === 'pen' ? Math.max(.12, e.pressure || .5) : .5;
  return [e.clientX - r.left, e.clientY - r.top, p];
}

function beginStroke(h, kind, pt, color, size){
  var a = { host: h, kind: kind, pts: [pt], color: color, size: size, removed: [] };
  if(kind === 'erase'){ eraseAt(a, pt); return a; }
  a.live = strokeEl({ t: kind, c: color }, a.pts, size);
  (kind === 'hl' ? h.hl : h.pen).appendChild(a.live);
  return a;
}

function extendStroke(a, pt){
  if(a.kind === 'erase'){ eraseAt(a, pt); return; }
  var l = a.pts[a.pts.length - 1];
  if(Math.hypot(pt[0] - l[0], pt[1] - l[1]) < .7) return;
  a.pts.push(pt);
  if(!a.raf) a.raf = requestAnimationFrame(function(){
    a.raf = 0;
    if(a.live) a.live.setAttribute('d', a.kind === 'hl' ? polyline(a.pts) : penPath(a.pts, a.size));
  });
}

function endStroke(a){
  var h = a.host;
  if(a.raf) cancelAnimationFrame(a.raf);
  if(a.kind === 'erase'){
    if(a.removed.length){ h.undo.push({ k: 'erase', items: a.removed }); saveHost(h); }
    return;
  }
  if(a.live) a.live.remove();
  var pts = a.pts;
  if(a.kind === 'hl'){
    if(pts.length < 2){ return; }
    pts = straighten(pts, a.size);
  }
  var W = h.el.clientWidth;
  var rects = h.anchored ? blockRects(h) : null;
  var minY = Infinity;
  pts.forEach(function(p){ minY = Math.min(minY, p[1]); });
  var ai = h.anchored ? pickAnchor(rects, minY) : -1;
  var o = origin(rects, ai) || { x: 0, y: 0 };
  var q = function(v){ return Math.round(v * 1e4 / W); };
  var flat = [];
  pts.forEach(function(p){ flat.push(q(p[0] - o.x), q(p[1] - o.y), Math.round(p[2] * 100)); });
  var s = { id: uid(), t: a.kind === 'hl' ? 'hl' : 'pen', c: a.color, w: Math.max(1, q(a.size)), a: ai, p: flat };
  h.data.strokes.push(s);
  h.undo.push({ k: 'add', id: s.id });
  saveHost(h);
  renderHost(h);
}

function eraseAt(a, pt){
  var h = a.host, hit = [];
  h.abs.forEach(function(s){
    var r = 12 + s.size / 2;
    for(var i = 0; i < s.pts.length; i++){
      if(Math.hypot(s.pts[i][0] - pt[0], s.pts[i][1] - pt[1]) < r){ hit.push(s.id); break; }
    }
  });
  if(!hit.length) return;
  h.data.strokes = h.data.strokes.filter(function(s){
    if(hit.indexOf(s.id) !== -1){ a.removed.push(s); return false; }
    return true;
  });
  renderHost(h);
}

function undoHost(h){
  if(!h) return;
  var u = h.undo.pop();
  if(!u) { toast('Nothing to undo on this page.'); return; }
  if(u.k === 'add') h.data.strokes = h.data.strokes.filter(function(s){ return s.id !== u.id; });
  else if(u.k === 'erase') h.data.strokes = h.data.strokes.concat(u.items);
  else if(u.k === 'note') h.data.notes = h.data.notes.filter(function(n){ return n.id !== u.id; });
  else if(u.k === 'clear') h.data = u.prev;
  saveHost(h); renderHost(h);
}

function clearHost(h){
  if(!h) return;
  h.undo.push({ k: 'clear', prev: JSON.parse(JSON.stringify(h.data)) });
  h.data = { strokes: [], notes: h.notesEl ? [] : undefined };
  saveHost(h); renderHost(h);
}

/* =====================================================================
   Page pointer handling: pen draws, finger scrolls, palm rejection
   ===================================================================== */
var lastPen = 0;
var pan = null, momentum = 0;
var suppressUntil = 0;

function uiTarget(t){ return t.closest && t.closest('.topbar,.dock,.pop,.sheet,.note-pin,.toast,.recall-sheet,.anim-controls'); }

document.addEventListener('pointerdown', function(e){
  if(e.pointerType === 'pen') lastPen = Date.now();
  cancelAnimationFrame(momentum);
  if(!recallSheet.hidden) return;
  if(tool === 'read' || viewTopic.hidden || uiTarget(e.target)) return;
  if(!e.target.closest('.topic-section')) return;
  var h = currentMainHost();
  if(!h || !h.loaded) return;

  var isTouch = e.pointerType === 'touch';
  if(isTouch && (!prefs.finger || tool === 'note')){
    if(stroke) return;
    startPan(e);
    return;
  }
  if(isTouch && (stroke || Date.now() - lastPen < 700)) return;
  if(pan){ pan = null; }
  e.preventDefault();

  var eraserButton = (e.buttons & 32) || e.button === 5;
  var kind = eraserButton ? 'erase' : tool;
  var pt = localPt(h, e);
  if(kind === 'note'){ createNote(h, pt); suppressUntil = Date.now() + 400; return; }
  var color = kind === 'hl' ? prefs.hlColor : prefs.penColor;
  var size = kind === 'hl' ? prefs.hlSize : prefs.penSize;
  stroke = beginStroke(h, kind, pt, color, size);
  stroke.pointerId = e.pointerId;
}, { passive: false });

window.addEventListener('pointermove', function(e){
  if(pan && e.pointerId === pan.id){
    var now = performance.now(), dy = pan.y - e.clientY;
    window.scrollBy(0, dy);
    pan.moved += Math.abs(dy) + Math.abs(pan.x - e.clientX);
    pan.v = pan.v * .6 + (dy / Math.max(1, now - pan.t)) * .4;
    pan.y = e.clientY; pan.x = e.clientX; pan.t = now;
    return;
  }
  if(stroke && e.pointerId === stroke.pointerId){
    if(e.pointerType === 'pen') lastPen = Date.now();
    var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
    if(!evs || !evs.length) evs = [e];
    for(var i = 0; i < evs.length; i++) extendStroke(stroke, localPt(stroke.host, evs[i]));
  }
}, { passive: true });

function endPointer(e){
  if(pan && e.pointerId === pan.id){
    var p = pan; pan = null;
    if(p.moved > 8){
      suppressUntil = Date.now() + 350;
      startMomentum(p.v);
    } else if(tool === 'note' && e.type === 'pointerup'){
      var h = currentMainHost();
      if(h && h.loaded && !e.target.closest('summary,a,button')){ createNote(h, localPt(h, e)); suppressUntil = Date.now() + 400; }
    }
    return;
  }
  if(stroke && e.pointerId === stroke.pointerId){
    if(e.pointerType === 'pen') lastPen = Date.now();
    var s = stroke; stroke = null;
    endStroke(s);
    suppressUntil = Date.now() + 350;
  }
}
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

function startPan(e){
  cancelAnimationFrame(momentum);
  pan = { id: e.pointerId, y: e.clientY, x: e.clientX, t: performance.now(), v: 0, moved: 0 };
}
function startMomentum(v){
  cancelAnimationFrame(momentum);
  var last = performance.now();
  (function step(now){
    var dt = Math.min(32, now - last); last = now;
    if(Math.abs(v) < .02) return;
    window.scrollBy(0, v * dt);
    v *= Math.pow(.95, dt / 16);
    momentum = requestAnimationFrame(step);
  })(last);
}

document.addEventListener('click', function(e){
  if(Date.now() < suppressUntil && !uiTarget(e.target)){ e.preventDefault(); e.stopPropagation(); }
}, true);

document.addEventListener('touchmove', function(e){
  if(!body.classList.contains('inking')) return;
  var t = e.touches && e.touches[0];
  if(t && t.touchType === 'stylus') e.preventDefault();
}, { passive: false });

/* =====================================================================
   Dock, colour/size popover, more menu
   ===================================================================== */
var dockTools = Array.prototype.slice.call(dock.querySelectorAll('[data-tool]'));
function setTool(t){
  tool = t;
  body.setAttribute('data-tool', t);
  body.classList.toggle('inking', t !== 'read');
  dockTools.forEach(function(b){ b.classList.toggle('active', b.getAttribute('data-tool') === t); });
  if(t !== 'read' && !prefs.showInk){ prefs.showInk = true; savePrefs(); body.classList.remove('ink-hidden'); syncMenu(); }
  updateSwatch();
}
dockTools.forEach(function(b){
  b.addEventListener('click', function(){ closePops(); setTool(b.getAttribute('data-tool')); });
});

var swatchPop = document.getElementById('swatchPop');
var morePop = document.getElementById('morePop');
function closePops(){ swatchPop.hidden = true; morePop.hidden = true; }

function updateSwatch(){
  document.getElementById('swatchDot').style.background = tool === 'hl' ? prefs.hlColor : prefs.penColor;
}
function buildSwatchPop(){
  var isHl = tool === 'hl';
  var colors = isHl ? HL_COLORS : PEN_COLORS, sizes = isHl ? HL_SIZES : PEN_SIZES;
  var curC = isHl ? prefs.hlColor : prefs.penColor, curS = isHl ? prefs.hlSize : prefs.penSize;
  var cRow = document.getElementById('swatchColors'), sRow = document.getElementById('swatchSizes');
  cRow.textContent = ''; sRow.textContent = '';
  colors.forEach(function(c){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'color-opt' + (c === curC ? ' active' : '');
    b.setAttribute('aria-label', 'Colour ' + c);
    var s = document.createElement('span'); s.style.background = c; b.appendChild(s);
    b.addEventListener('click', function(){
      if(isHl) prefs.hlColor = c; else prefs.penColor = c;
      savePrefs(); updateSwatch(); buildSwatchPop();
      if(tool === 'read' || tool === 'erase' || tool === 'note') setTool(isHl ? 'hl' : 'pen');
    });
    cRow.appendChild(b);
  });
  sizes.forEach(function(sz, i){
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'size-opt' + (sz === curS ? ' active' : '');
    b.setAttribute('aria-label', ['Fine', 'Medium', 'Bold'][i]);
    var d = document.createElement('span'); var px = isHl ? 6 + i * 5 : 4 + i * 4;
    d.style.width = px + 'px'; d.style.height = px + 'px';
    if(isHl){ d.style.borderRadius = '3px'; d.style.background = prefs.hlColor; d.style.border = '1px solid #15160f'; }
    b.appendChild(d);
    b.addEventListener('click', function(){
      if(isHl) prefs.hlSize = sz; else prefs.penSize = sz;
      savePrefs(); buildSwatchPop();
    });
    sRow.appendChild(b);
  });
}
document.getElementById('swatchBtn').addEventListener('click', function(){
  var open = swatchPop.hidden;
  closePops();
  if(open){ buildSwatchPop(); swatchPop.hidden = false; }
});
document.getElementById('undoBtn').addEventListener('click', function(){ undoHost(currentMainHost()); });
document.getElementById('moreBtn').addEventListener('click', function(){
  var open = morePop.hidden;
  closePops();
  if(open){ syncMenu(); morePop.hidden = false; }
});
function syncMenu(){
  document.getElementById('fingerState').textContent = prefs.finger ? 'On' : 'Off';
  document.getElementById('inkState').textContent = prefs.showInk ? 'On' : 'Off';
}
document.addEventListener('pointerdown', function(e){
  if(!e.target.closest('.pop,#swatchBtn,#moreBtn')) closePops();
});

document.addEventListener('click', function(e){
  var btn = e.target.closest('[data-action]');
  if(!btn) return;
  var act = btn.getAttribute('data-action');
  if(act === 'finger'){ prefs.finger = !prefs.finger; savePrefs(); syncMenu(); toast(prefs.finger ? 'Your finger now draws too. Switch to the hand tool to scroll freely.' : 'Finger scrolls again; only the stylus draws.'); }
  else if(act === 'toggle-ink'){ prefs.showInk = !prefs.showInk; savePrefs(); body.classList.toggle('ink-hidden', !prefs.showInk); if(!prefs.showInk) setTool('read'); syncMenu(); }
  else if(act === 'clear'){ closePops(); var h = currentMainHost(); if(h && confirm('Clear all ink and notes on this page? You can undo this.')) clearHost(h); }
  else if(act === 'export'){ closePops(); exportAll(); }
  else if(act === 'import'){ closePops(); document.getElementById('importInput').click(); }
});

/* =====================================================================
   Sticky notes
   ===================================================================== */
var noteSheet = document.getElementById('noteSheet');
var noteText = document.getElementById('noteText');
var editing = null;

function createNote(h, pt){
  var W = h.el.clientWidth, rects = blockRects(h);
  var ai = pickAnchor(rects, pt[1]);
  var o = origin(rects, ai) || { x: 0, y: 0 };
  var n = { id: uid(), a: ai, x: Math.round((pt[0] - o.x) * 1e4 / W), y: Math.round((pt[1] - o.y) * 1e4 / W), text: '', t: Date.now() };
  h.data.notes.push(n);
  h.undo.push({ k: 'note', id: n.id });
  renderHost(h);
  openNote(h, n.id, true);
}
function openNote(h, id, isNew){
  var n = (h.data.notes || []).filter(function(x){ return x.id === id; })[0];
  if(!n) return;
  editing = { host: h, note: n, isNew: !!isNew };
  document.getElementById('noteTitle').textContent = 'Note ' + (h.data.notes.indexOf(n) + 1);
  noteText.value = n.text || '';
  noteSheet.hidden = false;
  setTimeout(function(){ noteText.focus(); }, 60);
}
function closeNote(save){
  if(!editing) { noteSheet.hidden = true; return; }
  var e = editing; editing = null;
  if(save) e.note.text = noteText.value.trim();
  if(!e.note.text && e.isNew) e.host.data.notes = e.host.data.notes.filter(function(n){ return n !== e.note; });
  noteSheet.hidden = true;
  noteText.blur();
  saveHost(e.host); renderHost(e.host);
}
document.getElementById('noteSave').addEventListener('click', function(){ closeNote(true); });
document.getElementById('noteClose').addEventListener('click', function(){ closeNote(true); });
document.getElementById('noteDelete').addEventListener('click', function(){
  if(!editing) return;
  var e = editing;
  e.host.data.notes = e.host.data.notes.filter(function(n){ return n !== e.note; });
  editing = null; noteSheet.hidden = true;
  saveHost(e.host); renderHost(e.host);
});
document.addEventListener('click', function(e){
  var pin = e.target.closest('.note-pin');
  if(!pin) return;
  var host = pin.closest('.content');
  if(host && host._host) openNote(host._host, pin.getAttribute('data-note'), false);
});

/* =====================================================================
   Recall sketchpad
   ===================================================================== */
var recallSheet = document.getElementById('recallSheet');
var rsPad = document.getElementById('rsPad');
var rsReveal = document.getElementById('rsRevealPane');
var pad = null, padTool = 'pen', padColor = '#15160f', padStroke = null, recallTopic = null;

function openRecall(){
  if(!activeSection) return;
  recallTopic = activeSection.id;
  var title = activeSection.querySelector('.topic-title').textContent;
  document.getElementById('rsTitle').textContent = title;
  document.getElementById('rsPrompt').textContent =
    'Without looking: sketch ' + title + ' from memory. Boxes for the main components, arrows for how data flows, and circle the 2-3 hub ideas everything depends on. Then reveal the map, compare, and rate yourself.';
  rsReveal.textContent = '';
  var gen = activeSection.querySelector('.content.generated');
  Array.prototype.slice.call(gen.querySelectorAll(':scope > .phase')).slice(0, 2).forEach(function(p){
    var c = p.cloneNode(true);
    Array.prototype.forEach.call(c.querySelectorAll('.ink-hl,.ink-pen,.note-layer,.anim'), function(x){ x.remove(); });
    rsReveal.appendChild(c);
  });
  rsReveal.hidden = true;
  recallSheet.classList.remove('revealed');
  document.getElementById('rsReveal').textContent = 'Reveal map';
  recallSheet.hidden = false;
  body.style.overflow = 'hidden';
  closePops(); closeNote(true);

  rsPad.textContent = '';
  pad = { el: rsPad, key: 'recall:' + recallTopic, anchored: false, blocks: [], data: { strokes: [] }, undo: [], loaded: false, abs: [] };
  pad.hl = makeSvg('ink-hl'); pad.pen = makeSvg('ink-pen');
  rsPad.appendChild(pad.hl); rsPad.appendChild(pad.pen);
  loadHost(pad);
  observe(pad);
  DB.get('meta:' + recallTopic).then(function(m){ markRating(m && m.rating); });
}
function closeRecall(){
  if(recallSheet.hidden) return;
  recallSheet.hidden = true;
  body.style.overflow = '';
  if(pad && ro){ ro.unobserve(pad.el); roTargets.delete(pad.el); }
  pad = null;
}
function markRating(r){
  Array.prototype.forEach.call(document.querySelectorAll('.rate-btn'), function(b){ b.classList.toggle('active', +b.getAttribute('data-r') === r); });
}
document.getElementById('recallBtn').addEventListener('click', openRecall);
document.getElementById('rsClose').addEventListener('click', closeRecall);
document.getElementById('rsReveal').addEventListener('click', function(){
  var show = rsReveal.hidden;
  rsReveal.hidden = !show;
  recallSheet.classList.toggle('revealed', show);
  this.textContent = show ? 'Hide map' : 'Reveal map';
  if(pad) scheduleRender(pad);
});
document.getElementById('rsRate').addEventListener('click', function(e){
  var b = e.target.closest('.rate-btn');
  if(!b || !recallTopic) return;
  var r = +b.getAttribute('data-r');
  markRating(r);
  touchMeta(recallTopic, { rating: r, ratedAt: Date.now() });
  toast('Saved: ' + r + '/5. ' + (r < 4 ? 'This topic will show up in "Up next for review".' : 'Nice. It will come back for review in a few days.'));
});
Array.prototype.forEach.call(document.querySelectorAll('.rs-color'), function(b){ b.style.background = b.getAttribute('data-color'); });
document.getElementById('rsTools').addEventListener('click', function(e){
  var c = e.target.closest('.rs-color');
  if(c){
    padColor = c.getAttribute('data-color'); padTool = 'pen';
    Array.prototype.forEach.call(document.querySelectorAll('.rs-color'), function(x){ x.classList.toggle('active', x === c); });
    Array.prototype.forEach.call(document.querySelectorAll('.rs-tool'), function(x){ x.classList.remove('active'); });
    return;
  }
  var t = e.target.closest('[data-rstool]');
  if(!t || !pad) return;
  var k = t.getAttribute('data-rstool');
  if(k === 'erase'){
    padTool = padTool === 'erase' ? 'pen' : 'erase';
    t.classList.toggle('active', padTool === 'erase');
  } else if(k === 'undo') undoHost(pad);
  else if(k === 'clear'){ if(confirm('Clear this sketch? You can undo this.')) clearHost(pad); }
});

rsPad.addEventListener('pointerdown', function(e){
  if(!pad || !pad.loaded) return;
  if(e.pointerType === 'pen') lastPen = Date.now();
  if(e.pointerType === 'touch' && (padStroke || Date.now() - lastPen < 700)) return;
  e.preventDefault();
  var eraserButton = (e.buttons & 32) || e.button === 5;
  var kind = eraserButton ? 'erase' : padTool;
  padStroke = beginStroke(pad, kind, localPt(pad, e), padColor, 2.8);
  padStroke.pointerId = e.pointerId;
  try{ rsPad.setPointerCapture(e.pointerId); }catch(err){}
});
rsPad.addEventListener('pointermove', function(e){
  if(!padStroke || e.pointerId !== padStroke.pointerId) return;
  if(e.pointerType === 'pen') lastPen = Date.now();
  var evs = e.getCoalescedEvents ? e.getCoalescedEvents() : null;
  if(!evs || !evs.length) evs = [e];
  for(var i = 0; i < evs.length; i++) extendStroke(padStroke, localPt(pad, evs[i]));
});
function padUp(e){
  if(!padStroke || e.pointerId !== padStroke.pointerId) return;
  var s = padStroke; padStroke = null;
  endStroke(s);
}
rsPad.addEventListener('pointerup', padUp);
rsPad.addEventListener('pointercancel', padUp);

/* =====================================================================
   Backup: export / import everything stored on this device
   ===================================================================== */
function exportAll(){
  DB.all().then(function(data){
    var blob = new Blob([JSON.stringify({ app: 'sd-rapid-guide', v: 1, exported: new Date().toISOString(), data: data })], { type: 'application/json' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'system-design-notes-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 2000);
    toast('Backup saved. Keep it somewhere safe &mdash; import it on any device.');
  });
}
document.getElementById('importInput').addEventListener('change', function(){
  var f = this.files && this.files[0];
  this.value = '';
  if(!f) return;
  f.text().then(function(txt){
    var obj = JSON.parse(txt);
    if(!obj || obj.app !== 'sd-rapid-guide' || !obj.data) throw new Error('bad file');
    var keys = Object.keys(obj.data);
    if(!confirm('Import ' + keys.length + ' saved items? Matching pages on this device will be replaced.')) return;
    return Promise.all(keys.map(function(k){ return DB.set(k, obj.data[k]); })).then(function(){
      document.querySelectorAll('.content').forEach(function(el){ if(el._host){ el._host.loaded = false; el._host.undo = []; } });
      activateMainHost(); refreshIndex();
      toast('Backup imported.');
    });
  }).catch(function(){ toast('That file is not a Rapid Guide backup.'); });
});

/* =====================================================================
   Toast + first-use hint
   ===================================================================== */
var toastEl = document.getElementById('toast'), toastTimer = 0;
function toast(html, ms){
  toastEl.innerHTML = html;
  toastEl.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(function(){ toastEl.hidden = true; }, ms || 3200);
}
toastEl.addEventListener('click', function(){ toastEl.hidden = true; });
function maybeHint(){
  var seen = null;
  try{ seen = localStorage.getItem('sdg-hint-v1'); }catch(e){}
  if(seen) return;
  try{ localStorage.setItem('sdg-hint-v1', '1'); }catch(e){}
  setTimeout(function(){
    toast('<b>Stylus tip:</b> pick the pen or highlighter below &mdash; your stylus writes on the page while your finger keeps scrolling. Tap <b>Recall</b> to sketch the system from memory.', 7000);
  }, 500);
}

/* =====================================================================
   Keyboard shortcuts (desktop / keyboard covers)
   ===================================================================== */
document.addEventListener('keydown', function(e){
  if(e.target.closest && e.target.closest('input,textarea')) {
    if(e.key === 'Escape') closeNote(true);
    return;
  }
  if(e.key === 'Escape'){
    if(!recallSheet.hidden) closeRecall();
    else if(!noteSheet.hidden) closeNote(true);
    else { closePops(); setTool('read'); }
    return;
  }
  if(viewTopic.hidden || !recallSheet.hidden) return;
  if((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z'){ e.preventDefault(); undoHost(currentMainHost()); return; }
  if(e.ctrlKey || e.metaKey || e.altKey) return;
  var map = { v: 'read', p: 'pen', h: 'hl', e: 'erase', n: 'note' };
  var t = map[e.key.toLowerCase()];
  if(t) setTool(t);
});

setTool('read');
syncMenu();
route();

})();
