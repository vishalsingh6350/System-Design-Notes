(function(){
var NB = ' ';
function pad(s, n, left){ s = String(s); while(s.length < n) s = left ? NB + s : s + NB; return s; }
function lab(name, score){ return pad(name, 9) + pad(score, 3, true); }
var ROWY = [62, 104, 146, 188, 230];
function row(i, name, score){ return { type:'rect', x:44, y:ROWY[i], w:196, h:34, fill:'white', label:lab(name, score), lsize:14, lfont:'mono', lweight:400 }; }
function idx(i){ return { type:'text', x:26, y:ROWY[i] + 17, text:String(i), size:13, font:'mono', color:'soft' }; }
var KEY = 'leaderboard_feb_2021';

var init = {
  key: { type:'text', x:142, y:22, text:KEY, size:13, font:'mono', weight:700 },
  keySub: { type:'text', x:142, y:42, text:'sorted set, highest score first', size:12, color:'soft' },
  i0: idx(0), i1: idx(1), i2: idx(2), i3: idx(3), i4: idx(4),
  alice: row(0, 'alice', 15),
  bob: row(1, 'bob', 13),
  zoe: row(2, 'zoe', 10),
  mary: row(3, 'mary1934', 10),
  erin: row(4, 'erin', 7),
  bracket: { type:'path', d:'M243 63 H251 V179 H243', stroke:'gold', sw:3, opacity:0 },
  cmdHead: { type:'text', x:365, y:42, text:'command', size:12, color:'soft' },
  cmdBox: { type:'rect', x:262, y:56, w:206, h:78, fill:'card', stroke:'line' },
  cmd: { type:'text', x:365, y:95, text:'', size:12, font:'mono', weight:700 },
  cost: { type:'text', x:365, y:150, text:'', size:12, font:'mono', color:'oliveD' },
  repHead: { type:'text', x:365, y:172, text:'reply', size:12, color:'soft' },
  repBox: { type:'rect', x:262, y:182, w:206, h:82, fill:'white', stroke:'line' },
  reply: { type:'text', x:365, y:223, text:'', size:13, font:'mono', color:'blue', weight:700 }
};

SDAnim.register({
  id: 'sorted-set', title: 'A Redis sorted set as a live leaderboard', w: 480, h: 280, init: init,
  steps: [
    { cap: 'One Redis <b>sorted set</b> per month keeps every player ordered by score at all times: a hash map (member &rarr; score) plus a skip list for the order. Left numbers are 0-based positions.', set: {} },
    { cap: 'mary1934 wins a match. The game service validates the win, then the leaderboard service runs <code>ZINCRBY</code> to add 1 point.', set: {
      cmd:{ text:'ZINCRBY\n' + KEY + "\n1 'mary1934'" }, mary:{ fill:'blueL', stroke:'blue' } } },
    { cap: 'The hash map finds her entry directly and her score becomes 11 (a brand-new player would start from 0). She now outscores zoe.', set: {
      mary:{ label:lab('mary1934', 11) }, reply:{ text:'11' }, cost:{ text:'cost: O(log N)' } } },
    { cap: 'The skip list moves her to her new place in O(log N). The set is <b>re-sorted on every write</b>, so reads never have to sort anything.', set: {
      mary:{ y:ROWY[2] }, zoe:{ y:ROWY[3] } } },
    { cap: 'Top N: <code>ZREVRANGE ... 0 2 WITHSCORES</code> reads straight from the high end. Top 3 here; the real leaderboard page asks for <code>0 9</code>, the top 10.', set: {
      mary:{ fill:'white', stroke:'ink' }, bracket:{ opacity:1 },
      cmd:{ text:'ZREVRANGE\n' + KEY + '\n0 2 WITHSCORES' }, cost:{ text:'cost: O(log N + M)' },
      reply:{ text:lab('alice', 15) + '\n' + lab('bob', 13) + '\n' + lab('mary1934', 11) } } },
    { cap: 'One player\'s position: <code>ZREVRANK</code> returns 2, a 0-based index, so mary1934 is 3rd. No <code>COUNT(*)</code> over every higher score, as SQL would need.', set: {
      bracket:{ opacity:0 }, mary:{ fill:'blueL', stroke:'blue' }, i2:{ color:'blue', weight:700 },
      cmd:{ text:'ZREVRANK\n' + KEY + "\n'mary1934'" }, cost:{ text:'cost: O(log N)' }, reply:{ text:'2' } } },
    { cap: 'Pay O(log N) on each write to keep the set sorted, and top 10 plus any player\'s rank become cheap reads, even with 25M players in one month\'s set.', set: {
      mary:{ fill:'oliveL', stroke:'ink' }, i2:{ color:'soft', weight:400 },
      alice:{ fill:'oliveL' }, bob:{ fill:'oliveL' }, zoe:{ fill:'oliveL' }, erin:{ fill:'oliveL' } } }
  ]
});
})();
