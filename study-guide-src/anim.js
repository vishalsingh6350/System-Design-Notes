/* Step-based explainer animations.
   A scene is { id, title, w, h, init:{ objId:{type,...props} }, steps:[{ cap, set:{ objId:{props} }, dur?, hold? }] }.
   Step i shows the state after applying steps[0..i].set; numbers and colours tween between steps. */
(function(){
'use strict';

var NS = 'http://www.w3.org/2000/svg';
var C = {
  ink:'#15160f', soft:'#4a4b40', mute:'#9a9b8c', line:'#c9cbb8',
  olive:'#6f7d2e', oliveD:'#4d5720', oliveL:'#c9d98f', tint:'#e3e7cf',
  paper:'#fbfcf5', card:'#f7f8ee', white:'#ffffff',
  rust:'#b5462b', rustL:'#f1d6cc', blue:'#2c5d8a', blueL:'#d5e3ef',
  gold:'#e0b92f', goldL:'#f6eab0', plum:'#7a4d7e', plumL:'#eadcec'
};
var FONTS = { sans:'Inter, system-ui, sans-serif', mono:"'Space Mono', ui-monospace, monospace", serif:'Fraunces, Georgia, serif' };
var DEFAULTS = {
  rect:   { x:0, y:0, w:80, h:40, rx:6, fill:'white', stroke:'ink', sw:1.5, opacity:1, dash:false, label:'', lsize:15, lcolor:'ink', lweight:600, lfont:'sans' },
  circle: { x:0, y:0, r:12, fill:'olive', stroke:'none', sw:1.5, opacity:1, dash:false, label:'', lsize:12, lcolor:'white', lweight:700, lfont:'mono' },
  text:   { x:0, y:0, text:'', size:15, color:'ink', weight:400, anchor:'middle', font:'sans', italic:false, opacity:1 },
  line:   { x:0, y:0, x2:100, y2:0, stroke:'ink', sw:1.8, opacity:1, dash:false, bend:0 },
  arrow:  { x:0, y:0, x2:100, y2:0, stroke:'ink', sw:1.8, opacity:1, dash:false, bend:0 },
  path:   { d:'', fill:'none', stroke:'ink', sw:1.8, opacity:1, dash:false }
};
var NUM = { x:1, y:1, x2:1, y2:1, w:1, h:1, r:1, rx:1, opacity:1, size:1, lsize:1, sw:1, bend:1 };
var COLOR = { fill:1, stroke:1, color:1, lcolor:1 };
var REG = {};
var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

function col(v){ return (v && C[v]) || v; }
function rgb(h){
  h = col(h);
  if(typeof h !== 'string' || h[0] !== '#') return null;
  if(h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3];
  var n = parseInt(h.slice(1), 16);
  return [n >> 16 & 255, n >> 8 & 255, n & 255];
}
function mix(a, b, t){
  if(a === b) return col(a);
  var A = rgb(a), B = rgb(b);
  if(!A || !B) return col(t < .5 ? a : b);
  return 'rgb(' + Math.round(A[0] + (B[0] - A[0]) * t) + ',' + Math.round(A[1] + (B[1] - A[1]) * t) + ',' + Math.round(A[2] + (B[2] - A[2]) * t) + ')';
}
function ease(t){ return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
function el(tag, attrs){ var e = document.createElementNS(NS, tag); for(var k in attrs) e.setAttribute(k, attrs[k]); return e; }

function lerpObj(a, b, t){
  var o = {};
  for(var k in b){
    var va = a[k], vb = b[k];
    if(NUM[k] && typeof va === 'number' && typeof vb === 'number') o[k] = va + (vb - va) * t;
    else if(COLOR[k]) o[k] = mix(va, vb, t);
    else o[k] = t < .5 ? va : vb;
  }
  return o;
}

function setLines(textEl, str){
  if(textEl._str === str) return;
  textEl._str = str;
  textEl.textContent = '';
  var lines = String(str).split('\n');
  lines.forEach(function(line, i){
    var ts = el('tspan', { x: textEl.getAttribute('x') || 0, dy: i === 0 ? (-(lines.length - 1) * .6) + 'em' : '1.2em' });
    ts.textContent = line;
    textEl.appendChild(ts);
  });
}
function placeLines(textEl, x){
  Array.prototype.forEach.call(textEl.childNodes, function(ts){ ts.setAttribute('x', x); });
}

function curve(o){
  if(!o.bend) return 'M' + o.x + ',' + o.y + 'L' + o.x2 + ',' + o.y2;
  var dx = o.x2 - o.x, dy = o.y2 - o.y, len = Math.hypot(dx, dy) || 1;
  var cx = (o.x + o.x2) / 2 - dy / len * o.bend, cy = (o.y + o.y2) / 2 + dx / len * o.bend;
  return 'M' + o.x + ',' + o.y + 'Q' + cx + ',' + cy + ' ' + o.x2 + ',' + o.y2;
}

function makeNode(type){
  var g = el('g'), n = { type: type, g: g };
  if(type === 'rect'){ n.shape = el('rect'); n.label = el('text', { 'text-anchor':'middle', 'dominant-baseline':'central' }); g.appendChild(n.shape); g.appendChild(n.label); }
  else if(type === 'circle'){ n.shape = el('circle'); n.label = el('text', { 'text-anchor':'middle', 'dominant-baseline':'central' }); g.appendChild(n.shape); g.appendChild(n.label); }
  else if(type === 'text'){ n.shape = el('text', { 'dominant-baseline':'central' }); g.appendChild(n.shape); }
  else if(type === 'arrow'){ n.shape = el('path', { fill:'none', 'stroke-linecap':'round' }); n.head = el('polygon'); g.appendChild(n.shape); g.appendChild(n.head); }
  else { n.shape = el('path', { 'stroke-linecap':'round', 'stroke-linejoin':'round' }); if(type === 'line') n.shape.setAttribute('fill', 'none'); g.appendChild(n.shape); }
  return n;
}

function paint(n, o){
  var s = n.shape;
  n.g.setAttribute('opacity', Math.max(0, Math.min(1, o.opacity)));
  n.g.style.display = o.opacity <= .001 ? 'none' : '';
  var dash = o.dash ? '6 5' : 'none';
  if(n.type === 'rect'){
    s.setAttribute('x', o.x); s.setAttribute('y', o.y); s.setAttribute('width', Math.max(0, o.w)); s.setAttribute('height', Math.max(0, o.h));
    s.setAttribute('rx', o.rx); s.setAttribute('fill', col(o.fill)); s.setAttribute('stroke', col(o.stroke)); s.setAttribute('stroke-width', o.sw); s.setAttribute('stroke-dasharray', dash);
  } else if(n.type === 'circle'){
    s.setAttribute('cx', o.x); s.setAttribute('cy', o.y); s.setAttribute('r', Math.max(0, o.r));
    s.setAttribute('fill', col(o.fill)); s.setAttribute('stroke', col(o.stroke)); s.setAttribute('stroke-width', o.sw); s.setAttribute('stroke-dasharray', dash);
  } else if(n.type === 'text'){
    s.setAttribute('x', o.x); s.setAttribute('y', o.y); s.setAttribute('font-size', o.size); s.setAttribute('fill', col(o.color));
    s.setAttribute('font-weight', o.weight); s.setAttribute('text-anchor', o.anchor); s.setAttribute('font-family', FONTS[o.font] || o.font);
    s.setAttribute('font-style', o.italic ? 'italic' : 'normal');
    setLines(s, o.text); placeLines(s, o.x);
  } else if(n.type === 'arrow'){
    var hl = 7 + o.sw * 1.6;
    var cx = o.x, cy = o.y;
    if(o.bend){
      var dx = o.x2 - o.x, dy = o.y2 - o.y, len = Math.hypot(dx, dy) || 1;
      cx = (o.x + o.x2) / 2 - dy / len * o.bend; cy = (o.y + o.y2) / 2 + dx / len * o.bend;
    }
    var ang = Math.atan2(o.y2 - cy, o.x2 - cx);
    var ex = o.x2 - Math.cos(ang) * hl * .7, ey = o.y2 - Math.sin(ang) * hl * .7;
    s.setAttribute('d', curve({ x:o.x, y:o.y, x2:ex, y2:ey, bend:o.bend }));
    s.setAttribute('stroke', col(o.stroke)); s.setAttribute('stroke-width', o.sw); s.setAttribute('stroke-dasharray', dash);
    var a1 = ang + 2.7, a2 = ang - 2.7;
    n.head.setAttribute('points', o.x2 + ',' + o.y2 + ' ' + (o.x2 + Math.cos(a1) * hl) + ',' + (o.y2 + Math.sin(a1) * hl) + ' ' + (o.x2 + Math.cos(a2) * hl) + ',' + (o.y2 + Math.sin(a2) * hl));
    n.head.setAttribute('fill', col(o.stroke));
  } else if(n.type === 'line'){
    s.setAttribute('d', curve(o)); s.setAttribute('stroke', col(o.stroke)); s.setAttribute('stroke-width', o.sw); s.setAttribute('stroke-dasharray', dash);
  } else {
    s.setAttribute('d', o.d); s.setAttribute('fill', col(o.fill)); s.setAttribute('stroke', col(o.stroke)); s.setAttribute('stroke-width', o.sw); s.setAttribute('stroke-dasharray', dash);
  }
  if(n.label){
    var lx = n.type === 'rect' ? o.x + o.w / 2 : o.x, ly = n.type === 'rect' ? o.y + o.h / 2 : o.y;
    n.label.setAttribute('x', lx); n.label.setAttribute('y', ly);
    n.label.setAttribute('font-size', o.lsize); n.label.setAttribute('fill', col(o.lcolor));
    n.label.setAttribute('font-weight', o.lweight); n.label.setAttribute('font-family', FONTS[o.lfont] || o.lfont);
    setLines(n.label, o.label || ''); placeLines(n.label, lx);
  }
}

var ICON = {
  replay: '<svg viewBox="0 0 24 24"><path d="M4 12a8 8 0 1 0 2.4-5.7"/><path d="M4 4v4.5h4.5"/></svg>',
  prev:   '<svg viewBox="0 0 24 24"><path d="M15 5l-7 7 7 7"/></svg>',
  next:   '<svg viewBox="0 0 24 24"><path d="M9 5l7 7-7 7"/></svg>',
  play:   '<svg viewBox="0 0 24 24"><path class="fill" d="M8 5.5v13l11-6.5z"/></svg>',
  pause:  '<svg viewBox="0 0 24 24"><path class="fill" d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z"/></svg>'
};

function Player(root, def){
  var self = this;
  this.root = root; this.def = def;
  var order = Object.keys(def.init);
  var base = {};
  order.forEach(function(id){
    var o = def.init[id], t = o.type || 'rect';
    if(!DEFAULTS[t]) console.warn('[anim ' + def.id + '] unknown type ' + t + ' for ' + id);
    base[id] = Object.assign({ type: t }, DEFAULTS[t] || DEFAULTS.rect, o);
  });
  this.states = [];
  var prev = base;
  def.steps.forEach(function(st, i){
    var next = {};
    for(var id in prev) next[id] = prev[id];
    for(id in (st.set || {})){
      if(!prev[id]){ console.warn('[anim ' + def.id + '] step ' + (i + 1) + ' sets unknown object "' + id + '"'); continue; }
      next[id] = Object.assign({}, prev[id], st.set[id]);
    }
    self.states.push(next);
    prev = next;
  });

  root.classList.add('anim-ready');
  root.innerHTML =
    '<div class="anim-head"><span class="anim-label">Animation</span><span class="anim-title"></span></div>' +
    '<div class="anim-stage" role="img"></div>' +
    '<div class="anim-caps"></div>' +
    '<div class="anim-controls">' +
      '<button type="button" class="anim-btn" data-a="replay" aria-label="Replay from start">' + ICON.replay + '</button>' +
      '<button type="button" class="anim-btn" data-a="prev" aria-label="Previous step">' + ICON.prev + '</button>' +
      '<button type="button" class="anim-btn anim-play" data-a="play" aria-label="Play">' + ICON.play + '</button>' +
      '<button type="button" class="anim-btn" data-a="next" aria-label="Next step">' + ICON.next + '</button>' +
      '<span class="anim-count"></span>' +
      '<span class="anim-dots"></span>' +
    '</div>';
  root.querySelector('.anim-title').textContent = def.title;
  var stage = root.querySelector('.anim-stage');
  stage.setAttribute('aria-label', def.title);
  var svg = el('svg', { viewBox: '0 0 ' + def.w + ' ' + def.h, preserveAspectRatio: 'xMidYMid meet' });
  stage.appendChild(svg);
  this.nodes = {};
  order.forEach(function(id){ var n = makeNode(base[id].type); self.nodes[id] = n; svg.appendChild(n.g); });

  var caps = root.querySelector('.anim-caps'), dots = root.querySelector('.anim-dots');
  this.caps = def.steps.map(function(st, i){
    var p = document.createElement('p');
    p.innerHTML = '<b>' + (i + 1) + '.</b> ' + st.cap;
    p.setAttribute('aria-hidden', 'true');
    caps.appendChild(p);
    return p;
  });
  this.dots = def.steps.map(function(st, i){
    var d = document.createElement('button');
    d.type = 'button'; d.className = 'anim-dot'; d.setAttribute('aria-label', 'Step ' + (i + 1));
    d.addEventListener('click', function(){ self.pause(); self.go(i, 380); });
    dots.appendChild(d);
    return d;
  });
  this.count = root.querySelector('.anim-count');
  this.playBtn = root.querySelector('.anim-play');

  root.querySelector('.anim-controls').addEventListener('click', function(e){
    var b = e.target.closest('[data-a]');
    if(!b) return;
    var a = b.getAttribute('data-a');
    if(a === 'play') self.playing ? self.pause() : self.play();
    else if(a === 'prev'){ self.pause(); self.go(Math.max(0, self.idx - 1), 380); }
    else if(a === 'next'){ self.pause(); self.go(Math.min(self.states.length - 1, self.idx + 1), 380); }
    else if(a === 'replay'){ self.go(0, 380); self.play(true); }
  });
  stage.addEventListener('click', function(){
    if(document.body.classList.contains('inking')) return;
    self.playing ? self.pause() : self.play();
  });

  this.idx = 0; this.cur = this.states[0]; this.playing = false; this.timer = 0; this.raf = 0;
  this.render(this.cur); this.mark();

  if('IntersectionObserver' in window){
    new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if(en.isIntersecting && en.intersectionRatio >= .55){
          if(!self.started && !reduce){ self.started = true; self.play(true); }
          else if(self.viewPaused){ self.viewPaused = false; self.play(); }
        } else if(self.playing){ self.pause(); self.viewPaused = true; }
      });
    }, { threshold: [0, .55] }).observe(root);
  }
}

Player.prototype.render = function(state){
  for(var id in this.nodes) paint(this.nodes[id], state[id]);
};
Player.prototype.mark = function(){
  var i = this.idx, n = this.states.length;
  this.caps.forEach(function(p, k){ p.classList.toggle('on', k === i); p.setAttribute('aria-hidden', k === i ? 'false' : 'true'); });
  this.dots.forEach(function(d, k){ d.classList.toggle('on', k === i); d.classList.toggle('done', k < i); });
  this.count.textContent = (i + 1) + ' / ' + n;
};
Player.prototype.go = function(i, dur){
  var self = this;
  cancelAnimationFrame(this.raf);
  var from = this.cur, to = this.states[i];
  this.idx = i; this.mark();
  if(dur === undefined) dur = this.def.steps[i].dur || 750;
  if(reduce || dur <= 0){ this.cur = to; this.render(to); return Promise.resolve(); }
  return new Promise(function(done){
    var t0 = performance.now();
    (function frame(now){
      var t = Math.min(1, (now - t0) / dur), e = ease(t), snap = {};
      for(var id in to) snap[id] = lerpObj(from[id], to[id], e);
      self.cur = snap;
      self.render(snap);
      if(t < 1) self.raf = requestAnimationFrame(frame);
      else { self.cur = to; done(); }
    })(t0);
  });
};
Player.prototype.hold = function(i){
  var st = this.def.steps[i];
  if(st.hold) return st.hold;
  var len = st.cap.replace(/<[^>]+>/g, '').length;
  return Math.max(2400, Math.min(7500, 1000 + len * 40));
};
Player.prototype.play = function(fromStart){
  var self = this;
  if(this.playing) return;
  if(!fromStart && this.idx >= this.states.length - 1){ this.go(0, 380); }
  this.playing = true;
  this.playBtn.innerHTML = ICON.pause; this.playBtn.setAttribute('aria-label', 'Pause');
  this.root.classList.add('is-playing');
  (function tick(){
    if(!self.playing) return;
    self.timer = setTimeout(function(){
      if(!self.playing) return;
      if(self.idx >= self.states.length - 1){ self.pause(); return; }
      self.go(self.idx + 1).then(tick);
    }, self.hold(self.idx));
  })();
};
Player.prototype.pause = function(){
  this.playing = false;
  clearTimeout(this.timer);
  this.playBtn.innerHTML = ICON.play; this.playBtn.setAttribute('aria-label', 'Play');
  this.root.classList.remove('is-playing');
};

/* geometry helpers shared by scenes */
var geo = {
  polar: function(cx, cy, r, deg){ var a = deg * Math.PI / 180; return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) }; },
  arc: function(cx, cy, r, fromDeg, toDeg){
    var a = geo.polar(cx, cy, r, fromDeg), b = geo.polar(cx, cy, r, toDeg);
    var sweep = ((toDeg - fromDeg) % 360 + 360) % 360;
    return 'M' + a.x + ',' + a.y + 'A' + r + ',' + r + ' 0 ' + (sweep > 180 ? 1 : 0) + ',1 ' + b.x + ',' + b.y;
  },
  ringArrow: function(cx, cy, r, fromDeg, toDeg){
    var sweep = ((toDeg - fromDeg) % 360 + 360) % 360;
    var a = geo.polar(cx, cy, r, fromDeg), b = geo.polar(cx, cy, r, fromDeg + sweep);
    var chord = Math.hypot(b.x - a.x, b.y - a.y);
    var sag = r - Math.sqrt(Math.max(0, r * r - chord * chord / 4));
    return { x: a.x, y: a.y, x2: b.x, y2: b.y, bend: -2 * sag };
  }
};

window.SDAnim = {
  register: function(def){ REG[def.id] = def; },
  colors: C,
  geo: geo,
  mountAll: function(){
    Array.prototype.forEach.call(document.querySelectorAll('.anim[data-anim]'), function(root){
      var def = REG[root.getAttribute('data-anim')];
      if(!def){ console.warn('[anim] no scene registered for ' + root.getAttribute('data-anim')); root.remove(); return; }
      try{ root._player = new Player(root, def); }
      catch(err){ console.error('[anim ' + def.id + ']', err); root.remove(); }
    });
    document.addEventListener('visibilitychange', function(){
      if(document.hidden) Array.prototype.forEach.call(document.querySelectorAll('.anim'), function(r){ if(r._player && r._player.playing){ r._player.pause(); r._player.viewPaused = true; } });
    });
  }
};
})();
