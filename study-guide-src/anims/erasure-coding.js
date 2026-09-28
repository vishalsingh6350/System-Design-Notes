(function(){
/* Chunk slot i sits at x = 35 + 70i on the top row (y 24) and inside node i below (y 136). */
var CH = [['d1', 'blue'], ['d2', 'blue'], ['d3', 'blue'], ['d4', 'blue'], ['p1', 'gold'], ['p2', 'gold']];
function sx(i){ return 35 + 70 * i; }
var TOPY = 24, NODEY = 136;

var init = {
  obj: { type:'rect', x:35, y:TOPY, w:270, h:30, rx:6, fill:'blueL', stroke:'blue', label:'object · 4 MB', lsize:14, lfont:'mono' }
};
CH.forEach(function(c, i){
  init['n' + i] = { type:'rect', x:33 + 70 * i, y:130, w:64, h:96, rx:8, fill:'card', stroke:'ink', sw:1.4, label:'rack ' + (i + 1), lsize:13, lcolor:'soft', lfont:'mono', lweight:600 };
});
CH.forEach(function(c, i){
  var parity = c[1] === 'gold';
  init[c[0]] = { type:'rect', x:sx(i), y: parity ? TOPY + 40 : TOPY, w:60, h:30, rx:5, fill:c[1], stroke:'ink', sw:1.2, label:c[0], lsize:14, lfont:'mono', lcolor: parity ? 'ink' : 'white', opacity:0 };
});
var SURV = { d1:[65, 80], d3:[205, 180], d4:[275, 245], p2:[415, 295] };
Object.keys(SURV).forEach(function(k){
  init['r_' + k] = { type:'arrow', x:SURV[k][0], y:NODEY - 4, x2:SURV[k][1], y2:TOPY + 36, stroke:'olive', sw:2, opacity:0 };
});
/* storage bars: 1 MB = 22 px, for 4 MB of data */
init.repLbl = { type:'text', x:16, y:256, text:'3 copies', size:13, font:'mono', weight:700, anchor:'start', opacity:0 };
init.repData = { type:'rect', x:100, y:246, w:0, h:20, rx:0, fill:'blue', stroke:'none', label:'data', lsize:12, lcolor:'white', opacity:0 };
init.repExtra = { type:'rect', x:188, y:246, w:0, h:20, rx:0, fill:'rustL', stroke:'rust', sw:1, label:'2 more copies', lsize:12, lcolor:'rust', opacity:0 };
init.repPct = { type:'text', x:372, y:256, text:'+200%', size:14, font:'mono', weight:700, color:'rust', anchor:'start', opacity:0 };
init.ecLbl = { type:'text', x:16, y:292, text:'EC 4+2', size:13, font:'mono', weight:700, anchor:'start', opacity:0 };
init.ecData = { type:'rect', x:100, y:282, w:0, h:20, rx:0, fill:'blue', stroke:'none', label:'data', lsize:12, lcolor:'white', opacity:0 };
init.ecExtra = { type:'rect', x:188, y:282, w:0, h:20, rx:0, fill:'gold', stroke:'none', opacity:0 };
init.ecPct = { type:'text', x:240, y:292, text:'+50%', size:14, font:'mono', weight:700, color:'oliveD', anchor:'start', opacity:0 };

function each(fn){ var o = {}; CH.forEach(function(c, i){ var v = fn(c[0], i); if(v) o[c[0]] = v; }); return o; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }
var down = { fill:'rustL', stroke:'rust', label:'✕ down', lcolor:'rust', lweight:700 };

SDAnim.register({
  id: 'erasure-coding', title: 'Erasure coding: rebuild from any four', w: 480, h: 316, init: init,
  steps: [
    { cap: 'An object has to survive disk, rack and even data-centre failures. <b>Erasure coding</b> protects it with pieces plus parity instead of whole copies.', set: {} },
    { cap: 'Split the object into <b>4 data chunks</b>, d1 to d4 (1 MB each in this example).',
      set: merge({ obj:{ opacity:0 } }, each(function(k, i){ return i < 4 ? { opacity:1 } : null; })) },
    { cap: 'Compute <b>2 parity chunks</b>, p1 and p2, from the data. This 4+2 layout is the notes\' first example: lose any two of the six and the other four rebuild the rest.',
      set: { p1:{ y:TOPY, opacity:1 }, p2:{ y:TOPY, opacity:1 } } },
    { cap: 'Place each chunk on a node in a different <b>failure domain</b> (rack, data centre), so one disaster costs at most one chunk.',
      set: each(function(k, i){ return { y:NODEY }; }) },
    { cap: 'Two racks fail and <b>d2</b> and <b>p1</b> are gone. With 4+2 that is exactly the most we can lose.',
      set: { n1:down, n4:down, d2:{ opacity:0 }, p1:{ opacity:0 } } },
    { cap: 'To read, the routing service gathers the <b>4 survivors</b> (d1, d3, d4, p2) and decodes the missing data. The object is back intact, but a read now touches many nodes.',
      set: { r_d1:{ opacity:1 }, r_d3:{ opacity:1 }, r_d4:{ opacity:1 }, r_p2:{ opacity:1 }, obj:{ opacity:1, label:'object rebuilt ✓', fill:'oliveL', stroke:'olive' } } },
    { cap: 'The cost for 4 MB of data: <b>3-copy replication</b> stores 12 MB (200% overhead); 4+2 erasure coding stores 6 MB (<b>50%</b>).',
      set: { r_d1:{ opacity:0 }, r_d3:{ opacity:0 }, r_d4:{ opacity:0 }, r_p2:{ opacity:0 },
             repLbl:{ opacity:1 }, repData:{ w:88, opacity:1 }, repExtra:{ w:176, opacity:1 }, repPct:{ opacity:1 },
             ecLbl:{ opacity:1 }, ecData:{ w:88, opacity:1 }, ecExtra:{ w:44, opacity:1 }, ecPct:{ opacity:1 } } },
    { cap: 'The notes\' design uses <b>8+4</b>: the same 50% overhead and 11 nines of durability (vs 6), paid for with parity maths and slower reads. Replication suits latency-sensitive data.',
      set: { ecLbl:{ text:'EC 8+4' } } }
  ]
});
})();
