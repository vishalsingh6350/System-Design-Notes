(function(){
/* 64-bit layout 1 | 41 | 5 | 5 | 12, drawn wider than proportional so every field is readable */
var F = [
  { k:'sg', x:20,  w:28,  name:'sign\n1 bit',         fill:'white',  v:'0' },
  { k:'ts', x:48,  w:212, name:'timestamp\n41 bits',  fill:'oliveL', v:'297616116568' },
  { k:'dc', x:260, w:62,  name:'datacenter\n5 bits',  fill:'plumL',  v:'10' },
  { k:'mc', x:322, w:62,  name:'machine\n5 bits',     fill:'goldL',  v:'12' },
  { k:'sq', x:384, w:76,  name:'sequence\n12 bits',   fill:'blueL',  v:'0' }
];
var ROW = [64, 140, 216], ID = [
  'ID #1 = 1248292468186988544',
  'ID #2 = 1248292468186988545',
  'ID #3 = 1248292468191182848'
];
var init = {};
F.forEach(function(f){
  init['h_' + f.k] = { type:'text', x:f.x + f.w / 2, y:44, text:f.name, size:12, color:'soft', opacity:0 };
});
F.forEach(function(f){
  init['a_' + f.k] = { type:'rect', x:f.x, y:ROW[0], w:f.w, h:36, rx:0, fill:'card', stroke:'line', label:'', lfont:'mono', lsize:13, lweight:700 };
});
init.id1 = { type:'text', x:240, y:114, text:'64 bits = one integer', size:13, font:'mono', color:'soft' };
/* rows 2 and 3 start stacked on the row above, hidden, and slide down into place */
F.forEach(function(f){
  init['b_' + f.k] = { type:'rect', x:f.x, y:ROW[0], w:f.w, h:36, rx:0, fill:f.fill, stroke:'ink', label:f.k === 'sq' ? '1' : f.v, lfont:'mono', lsize:13, lweight:700, opacity:0 };
  init['c_' + f.k] = { type:'rect', x:f.x, y:ROW[1], w:f.w, h:36, rx:0, fill:f.fill, stroke:'ink', label:f.k === 'ts' ? '297616116569' : f.v, lfont:'mono', lsize:13, lweight:700, opacity:0 };
});
init.id2 = { type:'text', x:240, y:114, text:ID[1], size:13, font:'mono', color:'soft', opacity:0 };
init.id3 = { type:'text', x:240, y:190, text:ID[2], size:13, font:'mono', color:'soft', opacity:0 };

function fill(){
  var s = {};
  Array.prototype.forEach.call(arguments, function(k){
    var f = F.filter(function(g){ return g.k === k; })[0];
    s['a_' + k] = { fill:f.fill, stroke:'ink', label:f.v };
    s['h_' + k] = { opacity:1 };
  });
  return s;
}
function row(p, y){ var s = {}; F.forEach(function(f){ s[p + f.k] = { y:y, opacity:1 }; }); return s; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'snowflake', title: 'Building a 64-bit Snowflake ID', w: 480, h: 290, init: init,
  steps: [
    { cap: 'A Snowflake ID is one <b>64-bit</b> integer split into five sections. Each machine fills them in locally, with no coordination.', set: {} },
    { cap: '<b>Sign bit</b> (1 bit): always 0, so the ID stays a positive number.', set: fill('sg') },
    { cap: '<b>Timestamp</b> (41 bits): milliseconds since a custom epoch (Twitter&rsquo;s default is Nov 04, 2010). Time takes the highest bits.', set: fill('ts') },
    { cap: '<b>Datacenter ID</b> (5 bits) and <b>machine ID</b> (5 bits): up to 32 of each, fixed when the generator starts. Here datacenter 10, machine 12.', set: fill('dc', 'mc') },
    { cap: '<b>Sequence</b> (12 bits): counts IDs made on this machine in this millisecond, up to 4096. The first gets 0. All 64 bits are set: that is ID #1.', set: merge(fill('sq'), { id1:{ text:ID[0], color:'ink' } }) },
    { cap: 'A second ID in the <b>same millisecond</b>: every section is identical except the sequence, which becomes 1. Still unique, still no coordination.', set: merge(row('b_', ROW[1]), { b_sq:{ y:ROW[1], opacity:1, stroke:'gold', sw:3.5 }, id2:{ y:190, opacity:1, color:'ink' } }) },
    { cap: 'The clock moves to the <b>next millisecond</b>: the timestamp grows by 1 and the <b>sequence resets to 0</b>.', set: merge(row('c_', ROW[2]), { c_ts:{ y:ROW[2], opacity:1, stroke:'gold', sw:3.5 }, c_sq:{ y:ROW[2], opacity:1, stroke:'gold', sw:3.5 }, b_sq:{ stroke:'ink', sw:1.5 }, id3:{ y:266, opacity:1, color:'ink' } }) },
    { cap: 'Time sits in the high bits, so a later millisecond always means a bigger number: #1 &lt; #2 &lt; #3. Snowflake IDs <b>sort by time</b>.', set: { id1:{ color:'oliveD', weight:700 }, id2:{ color:'oliveD', weight:700 }, id3:{ color:'oliveD', weight:700 }, c_sq:{ stroke:'ink', sw:1.5 }, a_ts:{ stroke:'gold', sw:3.5 }, b_ts:{ stroke:'gold', sw:3.5 } } }
  ]
});
})();
