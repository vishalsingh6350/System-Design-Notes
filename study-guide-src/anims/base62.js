(function(){
/* 2009215674938 in base 62 (0-9, a-z = 10-35, A-Z = 36-61) = zn9edcu, the notes' example */
var NB = ' ';
var DIV = [
  ['2009215674938', '32406704434', 30, 'u'],
  ['32406704434', '522688781', 12, 'c'],
  ['522688781', '8430464', 13, 'd'],
  ['8430464', '135975', 14, 'e'],
  ['135975', '2193', 9, '9'],
  ['2193', '35', 23, 'n'],
  ['35', '0', 35, 'z']
];
function rowY(i){ return 76 + i * 24; }
var init = {
  header: { type:'text', x:240, y:22, text:'ID = 2009215674938', size:15, font:'mono', weight:700 },
  key: { type:'text', x:240, y:46, text:'0-9 → 0-9 · a-z → 10-35 · A-Z → 36-61', size:12, font:'mono', color:'soft' },
  prefix: { type:'text', x:200, y:24, text:'tinyurl.com/', size:15, font:'mono', weight:700, anchor:'end', opacity:0 },
  upArrow: { type:'arrow', x:388, y:228, x2:388, y2:66, stroke:'plum', sw:2, opacity:0 },
  browser: { type:'rect', x:16, y:72, w:104, h:56, fill:'blueL', stroke:'blue', label:'Browser', opacity:0 },
  server: { type:'rect', x:188, y:72, w:112, h:56, fill:'tint', stroke:'olive', label:'Web server', lsize:14, opacity:0 },
  cache: { type:'rect', x:368, y:52, w:96, h:40, label:'Cache', lsize:13, opacity:0 },
  db: { type:'rect', x:368, y:132, w:96, h:40, label:'Database', lsize:13, opacity:0 },
  click: { type:'arrow', x:110, y:40, x2:78, y2:70, stroke:'blue', dash:true, opacity:0 },
  getTxt: { type:'text', x:154, y:58, text:'GET /zn9edcu', size:12, font:'mono', color:'blue', weight:700, opacity:0 },
  getArrow: { type:'arrow', x:120, y:90, x2:186, y2:90, stroke:'blue', opacity:0 },
  lookArrow: { type:'arrow', x:300, y:84, x2:366, y2:72, stroke:'blue', opacity:0 },
  dbArrow: { type:'arrow', x:300, y:112, x2:366, y2:152, stroke:'blue', opacity:0 },
  respArrow: { type:'arrow', x:188, y:112, x2:122, y2:112, stroke:'olive', sw:2.2, opacity:0 },
  respTxt: { type:'text', x:154, y:152, text:'301 / 302\nLocation: long URL', size:12, font:'mono', color:'oliveD', weight:700, opacity:0 },
  goArrow: { type:'arrow', x:68, y:128, x2:68, y2:194, stroke:'olive', sw:2.2, opacity:0 },
  long: { type:'rect', x:16, y:196, w:448, h:40, fill:'oliveL', stroke:'olive', label:'https://en.wikipedia.org/wiki/Systems_design', lfont:'mono', lsize:13, lweight:700, opacity:0 }
};
DIV.forEach(function(d, i){
  var rem = (d[2] < 10 ? NB : '') + d[2];
  init['r' + i] = { type:'text', x:356, y:rowY(i), text:d[0] + ' ÷ 62 = ' + d[1] + NB + NB + NB + 'r ' + rem, size:13, font:'mono', anchor:'end', opacity:0 };
});
DIV.forEach(function(d, i){
  init['t' + i] = { type:'rect', x:376, y:rowY(i) - 12, w:24, h:24, rx:4, fill:'goldL', stroke:'gold', label:d[3], lfont:'mono', lsize:15, lweight:700, opacity:0 };
});

function show(from, to){ var s = {}; for(var i = from; i < to; i++){ s['r' + i] = { opacity:1 }; s['t' + i] = { opacity:1 }; } return s; }
function gather(){ var s = {}; for(var i = 0; i < 7; i++) s['t' + i] = { x:204 + (6 - i) * 26, y:12 }; return s; }
function hide(){ var s = {}; for(var i = 0; i < arguments.length; i++) s[arguments[i]] = { opacity:0 }; return s; }
function appear(){ var s = {}; for(var i = 0; i < arguments.length; i++) s[arguments[i]] = { opacity:1 }; return s; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'base62', title: 'Base 62 conversion, then the redirect', w: 480, h: 260, init: init,
  steps: [
    { cap: 'Every new long URL gets a unique numeric <b>ID</b>, here 2009215674938. Base 62 rewrites that number with 62 symbols: 0-9, a-z, A-Z.', set: {} },
    { cap: 'Divide by 62. The <b>remainder</b>, 30, is one base-62 digit: 30 &rarr; <b>u</b>. The quotient carries on to the next line.', set: show(0, 1) },
    { cap: 'Repeat with each quotient. Remainders 12, 13 and 14 become <b>c</b>, <b>d</b> and <b>e</b>.', set: show(1, 4) },
    { cap: '&hellip;then 9 &rarr; <b>9</b>, 23 &rarr; <b>n</b>, 35 &rarr; <b>z</b>. The quotient reaches 0, so we stop after 7 digits.', set: show(4, 7) },
    { cap: 'Read the remainders <b>bottom-up</b>: z n 9 e d c u. A unique ID always yields a unique code, so collisions are impossible.', set: merge(gather(), appear('upArrow', 'prefix'), hide('header')) },
    { cap: 'Redirect: a user clicks <code>tinyurl.com/zn9edcu</code>, and the browser sends <code>GET /zn9edcu</code> to the shortener&rsquo;s web server.', set: merge(hide('key', 'upArrow', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'), appear('browser', 'server', 'cache', 'db', 'click', 'getTxt', 'getArrow')) },
    { cap: 'The server looks up <code>zn9edcu</code>: <b>cache first</b>; on a miss it queries the database, which stores the &lt;shortURL, longURL&gt; mapping.', set: merge(appear('lookArrow', 'dbArrow'), {
      cache:{ fill:'rustL', stroke:'rust', label:'Cache\nmiss', lcolor:'rust' },
      db:{ fill:'oliveL', stroke:'olive', label:'Database\nfound', lcolor:'oliveD' },
      click:{ opacity:.3 }, getArrow:{ opacity:.3 }, getTxt:{ opacity:.4 } }) },
    { cap: 'It answers with an HTTP <b>301</b> or <b>302</b> redirect; the Location header carries the long URL.', set: merge(appear('respArrow', 'respTxt'), { lookArrow:{ opacity:.3 }, dbArrow:{ opacity:.3 } }) },
    { cap: 'The browser follows it to the long URL. <b>301</b> (permanent) is cached by the browser, easing load; <b>302</b> (temporary) sends every click back, good for analytics.', set: appear('goArrow', 'long') }
  ]
});
})();
