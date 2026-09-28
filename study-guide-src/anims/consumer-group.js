(function(){
var X0 = 118, CW = 30, ROW = { p0:56, p1:136 };
function cx(i){ return X0 + CW * i; }
function cell(p, i, vis){ return { type:'rect', x:cx(i), y:ROW[p], w:28, h:30, rx:4, fill:'white', stroke:'ink', sw:1.2, label:String(i), lsize:13, lfont:'mono', lweight:700, opacity: vis ? 1 : 0 }; }
/* committed-offset tags: group 1 below the row, group 2 above it; x points at the next offset to read */
function tag(g, p, i, vis){
  var y = g === 1 ? ROW[p] + 34 : ROW[p] - 20;
  return { type:'rect', x:cx(i) + 1, y:y, w:26, h:16, rx:3, fill: g === 1 ? 'olive' : 'plum', stroke:'none', label:'g' + g, lsize:12, lcolor:'white', lfont:'mono', lweight:700, opacity: vis ? 1 : 0 };
}
function at(i){ return { x:cx(i) + 1 }; }

var init = {
  topic: { type:'text', x:192, y:22, text:'topic A', size:14, font:'serif', weight:700 },
  lp0: { type:'text', x:100, y:71, text:'P0', size:13, font:'mono', weight:700 },
  lp1: { type:'text', x:100, y:151, text:'P1', size:13, font:'mono', weight:700 },
  producer: { type:'rect', x:12, y:89, w:68, h:44, rx:8, fill:'blueL', stroke:'blue', label:'producer', lsize:12 },
  ap0: { type:'arrow', x:82, y:104, x2:252, y2:90, stroke:'blue', sw:2, opacity:0 },
  ap1: { type:'arrow', x:82, y:118, x2:252, y2:132, stroke:'blue', sw:2, opacity:0 },
  g1box: { type:'rect', x:334, y:28, w:134, h:160, rx:10, fill:'card', stroke:'olive', sw:1.5, dash:true },
  g1lbl: { type:'text', x:401, y:42, text:'group 1', size:12, font:'mono', weight:700, color:'oliveD' },
  c1: { type:'rect', x:350, y:56, w:102, h:30, rx:6, fill:'oliveL', stroke:'oliveD', label:'C1', lsize:14 },
  c2: { type:'rect', x:350, y:136, w:102, h:30, rx:6, fill:'oliveL', stroke:'oliveD', label:'C2', lsize:14 },
  g2box: { type:'rect', x:334, y:208, w:134, h:72, rx:10, fill:'card', stroke:'plum', sw:1.5, dash:true, opacity:0 },
  g2lbl: { type:'text', x:401, y:222, text:'group 2', size:12, font:'mono', weight:700, color:'plum', opacity:0 },
  c3: { type:'rect', x:350, y:238, w:102, h:30, rx:6, fill:'plumL', stroke:'plum', label:'C3', lsize:14, opacity:0 },
  a1: { type:'arrow', x:272, y:71, x2:346, y2:71, stroke:'olive', sw:2, opacity:0 },
  a2: { type:'arrow', x:272, y:151, x2:346, y2:151, stroke:'olive', sw:2, opacity:0 },
  a3: { type:'arrow', x:272, y:80, x2:346, y2:248, stroke:'plum', sw:2, opacity:0 },
  a4: { type:'arrow', x:272, y:160, x2:346, y2:258, stroke:'plum', sw:2, opacity:0 }
};
[0, 1, 2, 3, 4].forEach(function(i){ init['p0c' + i] = cell('p0', i, i < 4); });
[0, 1, 2, 3, 4].forEach(function(i){ init['p1c' + i] = cell('p1', i, i < 3); });
init.t1p0 = tag(1, 'p0', 0, false); init.t1p1 = tag(1, 'p1', 0, false);
init.t2p0 = tag(2, 'p0', 0, false); init.t2p1 = tag(2, 'p1', 0, false);

var fresh = { opacity:1, fill:'blueL', stroke:'blue' }, settled = { fill:'white', stroke:'ink' };

SDAnim.register({
  id: 'consumer-group', title: 'Partitions, offsets and consumer groups', w: 480, h: 296, init: init,
  steps: [
    { cap: 'Topic A is split into two <b>partitions</b>. Each is an append-only log, and a message\'s position in it is its <b>offset</b>.', set: {} },
    { cap: 'The producer appends new messages at the tail. <code>hash(key) % 2</code> picks the partition, so order is kept within each partition.',
      set: { ap0:{ opacity:1 }, ap1:{ opacity:1 }, p0c4:fresh, p1c3:fresh, p1c4:fresh } },
    { cap: 'Consumer group 1 splits the work: <b>C1 owns P0, C2 owns P1</b>. Inside a group each partition has exactly one consumer, which protects ordering.',
      set: { ap0:{ opacity:0 }, ap1:{ opacity:0 }, p0c4:settled, p1c3:settled, p1c4:settled, a1:{ opacity:1 }, a2:{ opacity:1 }, t1p0:{ opacity:1 }, t1p1:{ opacity:1 } } },
    { cap: 'Each consumer <b>pulls</b> a batch from its offset, processes it, then <b>commits</b> the new offset. The green tags mark group 1\'s next message: P0 at 3, P1 at 2.',
      set: { t1p0:at(3), t1p1:at(2) } },
    { cap: 'A second group subscribes to the same topic. Messages are delivered once <b>per group</b> and never deleted on read, so group 2 starts at its own offset 0.',
      set: { g2box:{ opacity:1 }, g2lbl:{ opacity:1 }, c3:{ opacity:1 }, a3:{ opacity:1 }, a4:{ opacity:1 }, t2p0:{ opacity:1 }, t2p1:{ opacity:1 } } },
    { cap: 'Group 2 reads at its own pace (P0 at 2, P1 at 1). Its offsets live separately in state storage and never move group 1\'s.',
      set: { t2p0:at(2), t2p1:at(1) } },
    { cap: '<b>C2 leaves</b> group 1 (or stops sending heartbeats). The coordinator notices and triggers a <b>rebalance</b>.',
      set: { c2:{ fill:'rustL', stroke:'rust', label:'C2 ✕' }, a2:{ stroke:'rust', dash:true } } },
    { cap: 'The group leader makes a new plan: <b>C1 now owns P0 and P1</b>. It resumes P1 from group 1\'s committed offset, 2, so nothing is skipped.',
      set: { c2:{ opacity:0 }, a2:{ x:272, y:151, x2:372, y2:90, stroke:'olive', dash:false } } },
    { cap: 'C1 carries on through P1. Takeaway: partitions set the maximum parallelism (no more consumers than partitions per group), and groups are fully independent.',
      set: { t1p1:at(4) } }
  ]
});
})();
