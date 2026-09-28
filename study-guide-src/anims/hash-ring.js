(function(){
var G = SDAnim.geo, CX = 240, CY = 178, R = 118, RI = R - 20, RL = R + 30;
var SERVERS = { s0:[30, 'olive'], s1:[120, 'blue'], s2:[210, 'rust'], s3:[300, 'plum'], s4:[355, 'gold'] };
var KEYS = { k0:[330, 's0'], k1:[80, 's1'], k2:[165, 's2'], k3:[255, 's3'] };

var init = {
  ring: { type:'circle', x:CX, y:CY, r:R, fill:'none', stroke:'line', sw:3 },
  hashTxt: { type:'text', x:CX, y:CY - 10, text:'hash ring', size:15, font:'serif', weight:700 },
  hashSub: { type:'text', x:CX, y:CY + 12, text:'0 … 2^160 − 1', size:12, font:'mono', color:'soft' },
  arcAdd: { type:'path', d:G.arc(CX, CY, R, 300, 355), stroke:'gold', sw:12, opacity:0 },
  arcDel: { type:'path', d:G.arc(CX, CY, R, 30, 120), stroke:'blue', sw:12, opacity:0 },
  moved: { type:'text', x:CX, y:CY + 38, text:'', size:13, font:'mono', color:'oliveD', weight:700 }
};
Object.keys(KEYS).forEach(function(k){
  var a = KEYS[k][0], srv = KEYS[k][1], sa = SERVERS[srv][0];
  init['a_' + k] = Object.assign({ type:'arrow', stroke:'mute', sw:2, opacity:0 }, G.ringArrow(CX, CY, RI, a + 5, sa - 6));
});
Object.keys(SERVERS).forEach(function(s){
  var p = G.polar(CX, CY, R, SERVERS[s][0]), lp = G.polar(CX, CY, RL, SERVERS[s][0]);
  init[s] = { type:'circle', x:p.x, y:p.y, r:17, fill:SERVERS[s][1], stroke:'ink', sw:1.5, label:s, lsize:12, opacity: s === 's4' ? 0 : 1 };
});
Object.keys(KEYS).forEach(function(k){
  var p = G.polar(CX, CY, R, KEYS[k][0]), lp = G.polar(CX, CY, RL - 4, KEYS[k][0]);
  init[k] = { type:'circle', x:p.x, y:p.y, r:8, fill:'white', stroke:'ink', sw:2 };
  init['l_' + k] = { type:'text', x:lp.x, y:lp.y, text:k, size:14, font:'mono', weight:700 };
});

function to(k, srv){
  var o = {}, a = KEYS[k][0], sa = SERVERS[srv][0];
  o['a_' + k] = Object.assign({ opacity:1, stroke:SERVERS[srv][1] }, G.ringArrow(CX, CY, RI, a + 5, sa - 6));
  o[k] = { fill:SERVERS[srv][1] };
  return o;
}
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'hash-ring', title: 'Adding and removing a server on the ring', w: 480, h: 356, init: init,
  steps: [
    { cap: 'Servers (big dots) and keys (small dots) are hashed onto the <b>same ring</b>: the hash space bent into a circle.', set: {} },
    { cap: 'Lookup rule: from a key, walk <b>clockwise</b> until you hit a server. k0 lands on <b>s0</b>.', set: to('k0', 's0') },
    { cap: 'Every key does the same walk: k1 &rarr; s1, k2 &rarr; s2, k3 &rarr; s3.', set: merge(to('k1', 's1'), to('k2', 's2'), to('k3', 's3')) },
    { cap: 'Now add a new server, <b>s4</b>, between s3 and s0.', set: { s4:{ opacity:1 } } },
    { cap: 'The affected range is the arc from s4 walking <b>anticlockwise</b> back to s3. Only keys in that arc can move.', set: { arcAdd:{ opacity:.45 } } },
    { cap: 'k0 now meets s4 first, so it moves to s4. k1, k2 and k3 are untouched: <b>1 of 4</b> keys moved, not most of them as with <code>hash % N</code>.', set: merge(to('k0', 's4'), { moved:{ text:'keys moved: 1 / 4' } }) },
    { cap: 'Now remove <b>s1</b>. Its arc runs anticlockwise from s1 back to s0.', set: { arcAdd:{ opacity:0 }, arcDel:{ opacity:.4 }, s1:{ opacity:.25 }, moved:{ text:'' } } },
    { cap: 'k1 keeps walking clockwise and lands on <b>s2</b>. Again only one arc of the ring was disturbed: that is the whole trick of consistent hashing.', set: merge(to('k1', 's2'), { moved:{ text:'keys moved: 1 / 4' } }) }
  ]
});
})();
