(function(){
var ROWS = { raj:110, ana:180, li:250 };
var SLOT0 = 240, SLOT1 = 296;
function friend(name, cy){ return { type:'circle', x:438, y:cy, r:18, fill:'blue', stroke:'blue', sw:1.5, label:name, lsize:12 }; }
function cache(cy){ return { type:'rect', x:232, y:cy - 21, w:176, h:42, rx:6, fill:'white', stroke:'line' }; }
function chip(label, x, y, fill, stroke){ return { type:'rect', x:x, y:y, w:70, h:28, rx:5, fill:fill, stroke:stroke, sw:1.5, label:label, lfont:'mono', lsize:13, opacity:0 }; }
var init = {
  title: { type:'text', x:240, y:24, text:'Maya posts; her 3 friends read', size:16, font:'serif', weight:700 },
  db: { type:'rect', x:96, y:60, w:112, h:240, rx:8, fill:'card', stroke:'line' },
  dbTxt: { type:'text', x:152, y:80, text:'post DB', size:13, font:'mono', weight:700, color:'soft' },
  cacheTxt: { type:'text', x:320, y:66, text:'feed caches (post IDs)', size:12, font:'mono', color:'soft' },
  cR: cache(ROWS.raj), cA: cache(ROWS.ana), cL: cache(ROWS.li),
  raj: friend('Raj', ROWS.raj), ana: friend('Ana', ROWS.ana), li: friend('Li', ROWS.li),
  maya: { type:'circle', x:48, y:113, r:24, fill:'plum', label:'Maya', lsize:12 },
  mayaSub: { type:'text', x:48, y:150, text:'3 friends', size:12, font:'mono', color:'soft' },
  star: { type:'circle', x:48, y:243, r:24, fill:'gold', stroke:'ink', sw:1.2, label:'Star', lcolor:'ink', lsize:12, opacity:0 },
  starSub: { type:'text', x:52, y:280, text:'2M followers', size:12, color:'rust', weight:600, opacity:0 },
  arrA: { type:'arrow', x:230, y:176, x2:190, y2:124, stroke:'blue', opacity:0 },
  arrR: { type:'arrow', x:230, y:118, x2:190, y2:238, stroke:'blue', opacity:0 },
  p42: chip('#42', 13, 99, 'plumL', 'plum'),
  p77: chip('#77', 13, 229, 'goldL', 'gold'),
  c42r: chip('#42', 117, 99, 'plumL', 'plum'),
  c42a: chip('#42', 117, 99, 'plumL', 'plum'),
  c42l: chip('#42', 117, 99, 'plumL', 'plum'),
  a42: chip('#42', 117, 99, 'plumL', 'blue'),
  r77: chip('#77', 117, 229, 'goldL', 'blue'),
  stat: { type:'text', x:240, y:322, text:'', size:13, font:'mono' }
};
function land(cy, x){ return { x:x, y:cy - 14, w:50, opacity:1 }; }

SDAnim.register({
  id: 'fanout', title: 'Fanout on write, fanout on read, and the hybrid', w: 480, h: 344, init: init,
  steps: [
    { cap: 'Maya has 3 friends. Each friend has a <b>news feed cache</b> that holds only post IDs; the full post is stored once in the post DB. The question: when is each feed built?', set: {} },
    { cap: '<b>Fanout on write (push)</b>: Maya publishes post #42. The Post Service stores it once in the post DB&hellip;', set: { title:{ text:'fanout on write (push)' }, p42:{ x:117, opacity:1 }, stat:{ text:'publish: store post #42' } } },
    { cap: '&hellip;and right away fanout workers append the ID <code>#42</code> to every friend&rsquo;s feed cache. One post, three cache writes, all paid at publish time.', set: { c42r:land(ROWS.raj, SLOT0), c42a:land(ROWS.ana, SLOT0), c42l:land(ROWS.li, SLOT0), stat:{ text:'publish: 3 cache writes' } } },
    { cap: 'Raj opens the app. His feed is already assembled, so reading it is one cache lookup: <b>fast and real-time</b>.', set: { raj:{ stroke:'gold', sw:4 }, cR:{ stroke:'olive', sw:2.5 }, stat:{ text:'read: 1 cache lookup, instant', color:'oliveD' } } },
    { cap: 'Rewind and try <b>fanout on read (pull)</b>. Maya posts #42 and it is only stored in the post DB. Nothing is precomputed; no feed is touched.', set: { title:{ text:'fanout on read (pull)' }, c42r:{ opacity:0 }, c42a:{ opacity:0 }, c42l:{ opacity:0 }, raj:{ stroke:'blue', sw:1.5 }, cR:{ stroke:'line', sw:1.5 }, stat:{ text:'publish: 0 cache writes', color:'ink' } } },
    { cap: 'Ana opens the app. Only now are the recent posts of everyone she follows fetched and merged. Inactive Raj and Li cost nothing, but <b>every read pays</b>.', set: { ana:{ stroke:'gold', sw:4 }, arrA:{ opacity:1 }, a42:land(ROWS.ana, SLOT0), stat:{ text:'read: fetch + merge, every time' } } },
    { cap: '<b>Hybrid</b>: normal users like Maya keep push, so the caches fill as before. But Star is a celebrity with, say, 2M followers: one push would mean 2M cache writes.', set: { title:{ text:'hybrid: push most, pull celebrities' }, ana:{ stroke:'blue', sw:1.5 }, arrA:{ opacity:0 }, a42:{ opacity:0 }, c42r:{ opacity:1 }, c42a:{ opacity:1 }, c42l:{ opacity:1 }, star:{ opacity:1 }, starSub:{ opacity:1 }, stat:{ text:'push for Star = 2,000,000 writes', color:'rust' } } },
    { cap: 'So celebrity posts are <b>not fanned out</b>. Star publishes #77 and it is only stored in the post DB, exactly as in pull mode.', set: { p77:{ x:117, opacity:1 }, stat:{ text:'Star posts #77: 0 cache writes', color:'oliveD' } } },
    { cap: 'When Raj opens the app, his pushed IDs come straight from cache and Star&rsquo;s recent posts are <b>pulled</b> at read time, then merged newest first.', set: { raj:{ stroke:'gold', sw:4 }, arrR:{ opacity:1 }, r77:land(ROWS.raj, SLOT0), c42r:{ x:SLOT1 }, stat:{ text:'read: cached IDs + pulled celebrities', color:'ink' } } },
    { cap: 'Takeaway: <b>push</b> keeps reads fast for the many; <b>pull</b> avoids write storms for the few with huge audiences. The hybrid of both is the expected answer.', set: { raj:{ stroke:'blue', sw:1.5 }, arrR:{ opacity:0 }, stat:{ text:'push: most users | pull: celebrities', color:'oliveD' } } }
  ]
});
})();
