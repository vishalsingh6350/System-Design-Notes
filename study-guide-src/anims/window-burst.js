(function(){
/* time axis: 1:00:00 at x=30, 1:02:00 at x=450 -> 3.5 px per second */
function X(sec){ return 30 + sec * 3.5; }
var DY = 141;
var B1 = [35, 40, 45, 50, 55], B2 = [65, 70, 75, 80, 85];
var init = {
  title: { type:'text', x:240, y:22, text:'limit: 5 requests per minute', size:14, font:'mono', weight:700 },
  mode: { type:'text', x:240, y:48, text:'fixed window counter', size:15, font:'serif', italic:true, color:'soft' },
  w1: { type:'rect', x:X(0), y:92, w:210, h:104, rx:0, fill:'card', stroke:'line' },
  w2: { type:'rect', x:X(60), y:92, w:210, h:104, rx:0, fill:'card', stroke:'line' },
  span: { type:'rect', x:X(30), y:114, w:210, h:54, rx:6, fill:'rustL', stroke:'rust', dash:true, opacity:0 },
  roll: { type:'rect', x:X(5), y:112, w:218, h:58, rx:6, fill:'plumL', stroke:'plum', sw:2, opacity:0 },
  bound: { type:'line', x:X(60), y:92, x2:X(60), y2:196, stroke:'line', sw:1.5 },
  c1: { type:'text', x:X(30), y:78, text:'window 1: 0 / 5', size:13, font:'mono', color:'soft' },
  c2: { type:'text', x:X(90), y:78, text:'window 2: 0 / 5', size:13, font:'mono', color:'soft' },
  tl0: { type:'text', x:X(0), y:212, text:'1:00:00', size:12, font:'mono', color:'soft', anchor:'start' },
  tl1: { type:'text', x:X(60), y:212, text:'1:01:00', size:12, font:'mono', color:'soft' },
  tl2: { type:'text', x:X(120), y:212, text:'1:02:00', size:12, font:'mono', color:'soft', anchor:'end' },
  note: { type:'text', x:240, y:240, text:'', size:13, font:'mono', weight:700, color:'rust' }
};
B1.concat(B2).forEach(function(t, i){
  init['q' + i] = { type:'circle', x:X(t), y:DY, r:2, fill:'blue', stroke:'white', sw:1.2, opacity:0, lsize:12 };
});
function burst(from, to, fill){ var s = {}; for(var i = from; i < to; i++) s['q' + i] = { r:7, opacity:1, fill:fill }; return s; }
function reject(from, to){ var s = {}; for(var i = from; i < to; i++) s['q' + i] = { fill:'rust', stroke:'rust', label:'✕', r:7 }; return s; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'window-burst', title: 'Fixed window edge burst vs a rolling window', w: 480, h: 260, init: init,
  steps: [
    { cap: 'Quota: <b>5 requests per minute</b>. A fixed window counter keeps one counter per clock minute and resets it at every boundary.', set: {} },
    { cap: 'A burst of 5 arrives <b>late</b> in the first minute (1:00:35&ndash;1:00:55). The counter reaches 5 / 5; all pass.', set: merge(burst(0, 5, 'olive'), { c1:{ text:'window 1: 5 / 5', color:'oliveD' } }) },
    { cap: 'At 1:01:00 a new window starts and its counter is back at <b>0</b>. The first window&rsquo;s count is simply forgotten.', set: { bound:{ stroke:'gold', sw:3 }, c1:{ color:'mute' }, c2:{ color:'ink' } } },
    { cap: 'Another burst of 5 arrives <b>early</b> in the new minute (1:01:05&ndash;1:01:25). Window 2 also reads 5 / 5, so all pass.', set: merge(burst(5, 10, 'olive'), { c2:{ text:'window 2: 5 / 5', color:'oliveD' } }) },
    { cap: 'But in the one minute from 1:00:30 to 1:01:30, <b>10 requests</b> got through: double the quota. Each window only saw its own 5.', set: { span:{ opacity:.55 }, note:{ text:'10 requests in 60 s (1:00:30-1:01:30)' } } },
    { cap: 'Replay the same traffic with a <b>rolling window</b>: for each request, count everything in the 60 s before it, wherever the minute boundary falls.', set: merge({ mode:{ text:'rolling window: always the last 60 s' }, span:{ opacity:0 }, w1:{ opacity:.35 }, w2:{ opacity:.35 }, bound:{ stroke:'line', sw:1.5 }, c1:{ opacity:0 }, c2:{ opacity:0 }, note:{ text:'' } }, (function(){ var s = {}; for(var i = 5; i < 10; i++) s['q' + i] = { fill:'white', stroke:'mute', sw:1.5 }; return s; })()) },
    { cap: 'The request at 1:01:05 looks back to 1:00:05 and finds the first burst: already 5. Quota used up, so it is <b>rejected</b>.', set: merge(reject(5, 6), { roll:{ opacity:.8 }, note:{ text:'1:00:05-1:01:05 holds 5: reject' } }) },
    { cap: 'The window slides with time, but the first burst is still inside it, so the rest of the second burst is rejected too.', set: merge(reject(6, 10), { roll:{ x:X(25) }, note:{ text:'1:00:25-1:01:25 still holds 5: reject' } }) },
    { cap: 'Takeaway: a fixed window forgets at the edge; a rolling window never lets more than <b>5</b> through in any 60 s. The price is tracking timestamps (sliding log) or an estimate (sliding counter).', set: { note:{ text:'passed 5, rejected 5', color:'oliveD' }, roll:{ opacity:.35 } } }
  ]
});
})();
