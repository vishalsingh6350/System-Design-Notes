(function(){
function replica(x, name){ return { type:'rect', x:x, y:210, w:112, h:58, label:name + '\nkey1 = v1', lfont:'mono', lsize:13 }; }
function msg(x, y, label, fill){ return { type:'rect', x:x, y:y, w:70, h:22, rx:5, fill:fill, stroke:'none', label:label, lfont:'mono', lsize:12, lcolor:'white', lweight:700, opacity:0 }; }
function pkt(x, y, label, fill){ return { type:'circle', x:x, y:y, r:13, fill:fill, label:label, opacity:0 }; }
function ack(cx, cy){ return { type:'rect', x:cx - 20, y:cy - 11, w:40, h:22, rx:5, fill:'olive', stroke:'none', label:'ACK', lfont:'mono', lsize:12, lcolor:'white', lweight:700, opacity:0 }; }

var init = {
  title: { type:'text', x:240, y:22, text:'N = 3 · W = 2 · R = 2', size:15, font:'mono', weight:700 },
  l0: { type:'line', x:220, y:112, x2:100, y2:210, stroke:'line', sw:1.5 },
  l1: { type:'line', x:240, y:112, x2:240, y2:210, stroke:'line', sw:1.5 },
  l2: { type:'line', x:260, y:112, x2:380, y2:210, stroke:'line', sw:1.5 },
  client: { type:'rect', x:16, y:60, w:86, h:48, fill:'blueL', stroke:'blue', label:'Client' },
  coord: { type:'rect', x:176, y:56, w:128, h:56, fill:'tint', stroke:'olive', sw:2, label:'Coordinator', lsize:14 },
  ackTxt: { type:'text', x:316, y:84, text:'', size:13, font:'mono', color:'soft', anchor:'start' },
  s0: replica(44, 's0'), s1: replica(184, 's1'), s2: replica(324, 's2'),
  msgA: msg(40, 58, 'put v2', 'blue'),
  msgB: msg(176, 86, 'OK', 'olive'),
  m0: pkt(220, 112, 'v2', 'blue'), m1: pkt(240, 112, 'v2', 'blue'), m2: pkt(260, 112, 'v2', 'blue'),
  k0: ack(122, 192), k1: ack(240, 192),
  rsp1: { type:'circle', x:240, y:204, r:12, fill:'blue', label:'v2', opacity:0 },
  rsp2: { type:'circle', x:326, y:208, r:12, fill:'mute', label:'v1', opacity:0 },
  wBar: { type:'line', x:44, y:282, x2:296, y2:282, stroke:'olive', sw:4, opacity:0 },
  wLbl: { type:'text', x:170, y:296, text:'write set: W = 2', size:13, font:'mono', weight:700, color:'oliveD', opacity:0 },
  rBar: { type:'line', x:184, y:310, x2:436, y2:310, stroke:'blue', sw:4, opacity:0 },
  rLbl: { type:'text', x:310, y:324, text:'read set: R = 2', size:13, font:'mono', weight:700, color:'blue', opacity:0 }
};

SDAnim.register({
  id: 'quorum', title: 'Quorum consensus with N = 3, W = 2, R = 2', w: 480, h: 340, init: init,
  steps: [
    { cap: 'Key <code>key1</code> is replicated on <b>N = 3</b> nodes, all holding v1. The <b>coordinator</b> is the proxy between client and replicas. Here <b>W = 2</b> and <b>R = 2</b>.', set: {} },
    { cap: 'The client calls <code>put(key1, v2)</code>. The request goes to the coordinator, not to a replica.', set: { msgA:{ x:104, opacity:1 } } },
    { cap: 'The coordinator sends the write to <b>all three</b> replicas. s0 and s1 store v2 at once; the copy to s2 is delayed on the network.', set: {
      msgA:{ x:176, opacity:0 },
      m0:{ x:122, y:192, opacity:1 }, m1:{ x:240, y:192, opacity:1 }, m2:{ x:344, y:180, opacity:1 },
      s0:{ fill:'oliveL', stroke:'olive', label:'s0\nkey1 = v2' }, s1:{ fill:'oliveL', stroke:'olive', label:'s1\nkey1 = v2' },
      l2:{ dash:true } } },
    { cap: 's0 and s1 acknowledge. With <b>W = 2</b> ACKs the write counts as successful and the client gets OK, even though s2 still holds v1.', set: {
      m0:{ y:204, r:5, opacity:0 }, m1:{ y:204, r:5, opacity:0 },
      k0:{ x:192, y:119, opacity:1 }, k1:{ x:242, y:119, opacity:1 },
      ackTxt:{ text:'ACKs: 2 / W = 2', color:'oliveD' },
      msgB:{ x:104, opacity:1 }, msgA:{ x:40 } } },
    { cap: 'Next the client calls <code>get(key1)</code>. The coordinator asks the replicas and waits for <b>R = 2</b> responses.', set: {
      k0:{ y:100, opacity:0 }, k1:{ y:100, opacity:0 },
      msgB:{ x:40, opacity:0 }, msgA:{ x:104, opacity:1, label:'get key1' },
      ackTxt:{ text:'replies: 0 / R = 2', color:'soft' },
      l0:{ stroke:'blue' }, l1:{ stroke:'blue' }, l2:{ stroke:'blue' } } },
    { cap: 's1 and s2 answer first, which meets R = 2, so s0 is not needed. But they disagree: s1 says <b>v2</b>, s2 still says stale <b>v1</b>.', set: {
      msgA:{ x:176, opacity:0 }, msgB:{ x:176 },
      rsp1:{ x:224, y:134, opacity:1 }, rsp2:{ x:262, y:134, opacity:1 },
      ackTxt:{ text:'replies: 2 / R = 2', color:'oliveD' },
      l0:{ stroke:'line' }, l1:{ stroke:'line' }, l2:{ stroke:'line' } } },
    { cap: 'The coordinator keeps the <b>newest version</b>, v2, and returns it. The stale copy on s2 cannot win, because s1 answered too.', set: {
      rsp1:{ y:112, r:6, opacity:0 }, rsp2:{ fill:'rust', r:6, opacity:0 },
      msgB:{ x:104, opacity:1, label:'v2', fill:'olive' } } },
    { cap: 'Why it always works: write set {s0, s1} and read set {s1, s2} must share a replica, because <b>W + R = 4 &gt; N = 3</b>. That shared node holds the latest write.', set: {
      wBar:{ opacity:1 }, wLbl:{ opacity:1 }, rBar:{ opacity:1 }, rLbl:{ opacity:1 },
      s1:{ stroke:'gold', sw:3.5 }, title:{ text:'W + R = 4 > N = 3', color:'oliveD' }, ackTxt:{ text:'' } } },
    { cap: 'With <b>W = R = 1</b>, W + R = 2 &le; 3: the write is only guaranteed on s0 and a read may ask only s2, returning stale v1. Faster, but no strong consistency.', set: {
      wBar:{ x2:156 }, wLbl:{ x:100, text:'write set: W = 1' }, rBar:{ x:324 }, rLbl:{ x:380, text:'read set: R = 1' },
      s1:{ stroke:'olive', sw:1.5 }, title:{ text:'W + R = 2 ≤ N = 3', color:'rust' },
      msgB:{ label:'v1', fill:'rust' } } }
  ]
});
})();
