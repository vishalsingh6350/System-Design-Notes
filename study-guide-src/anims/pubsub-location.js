(function(){
/* columns: phone -> WS-7 -> Redis channel -> friends' WS servers -> friends' phones */
var MY = 167, WSY = [62, 167, 272];
var SX = 358, PX = 412;
function pkt(x, y){ return { type:'circle', x:x, y:y, r:8, fill:'blue', stroke:'white', sw:1.5, opacity:0 }; }
function wsBox(y, label){ return { type:'rect', x:326, y:y - 22, w:64, h:44, fill:'tint', label:label, lsize:14 }; }
function phone(y, label){ return { type:'rect', x:PX, y:y - 22, w:56, h:44, rx:9, fill:'white', label:label, lsize:14 }; }
function sub(y){ return { type:'line', x:292, y:MY, x2:326, y2:y, stroke:'line', dash:true }; }
function dist(y){ return { type:'text', x:SX, y:y + 36, text:'', size:13, font:'mono', weight:700, color:'soft', opacity:0 }; }

var init = {
  hSubs: { type:'text', x:SX, y:22, text:'subscribers', size:12, color:'soft' },
  hFriends: { type:'text', x:440, y:22, text:'friends', size:12, color:'soft' },
  hRedis: { type:'text', x:250, y:112, text:'Redis pub/sub', size:13, weight:700 },
  wMaya: { type:'line', x:76, y:MY, x2:112, y2:MY, stroke:'line', sw:2 },
  s2: sub(WSY[0]), s4: sub(WSY[1]), s9: sub(WSY[2]),
  maya: { type:'rect', x:14, y:142, w:62, h:50, rx:9, fill:'blueL', label:'Maya', lsize:14 },
  mayaTxt: { type:'text', x:46, y:208, text:'every 30s', size:12, color:'soft' },
  ws7: { type:'rect', x:112, y:142, w:64, h:50, fill:'tint', label:'WS-7', lsize:14 },
  ws7Txt: { type:'text', x:144, y:208, text:'her server', size:12, color:'soft' },
  redis: { type:'rect', x:208, y:126, w:84, h:82, fill:'card', label:'channel\n"maya"', lsize:13, lfont:'mono', lweight:700 },
  ws2: wsBox(WSY[0], 'WS-2'), ws4: wsBox(WSY[1], 'WS-4'), ws9: wsBox(WSY[2], 'WS-9'),
  leo: phone(WSY[0], 'Leo'), sam: phone(WSY[1], 'Sam'), priya: phone(WSY[2], 'Priya'),
  d2: dist(WSY[0]), d4: dist(WSY[1]), d9: dist(WSY[2]),
  rule: { type:'text', x:140, y:262, text:'forward only if\ndistance ≤ 5 mi', size:12, font:'mono', color:'oliveD', opacity:0 },
  summary: { type:'text', x:140, y:304, text:'1 publish → 3 copies → 2 pushes', size:12, font:'mono', weight:700, opacity:0 },
  p0: pkt(45, MY),
  p1: pkt(144, MY),
  q2: pkt(250, MY), q4: pkt(250, MY), q9: pkt(250, MY),
  r2: pkt(SX, WSY[0]), r4: pkt(SX, WSY[1])
};

SDAnim.register({
  id: 'pubsub-location', title: 'One location update, fanned out through Redis pub/sub', w: 480, h: 330, init: init,
  steps: [
    { cap: 'Maya\'s phone holds a <b>WebSocket</b> to server WS-7. The servers of her online friends (WS-2, WS-4, WS-9) have each <b>subscribed</b> to Maya\'s channel in Redis pub/sub.', set: {} },
    { cap: 'Every 30 seconds her phone sends a <b>location update</b> (lat, long, timestamp) over the open WebSocket to WS-7.', set: { p0:{ x:112, opacity:1 } } },
    { cap: 'WS-7 saves the point (location history, location cache, its own memory), then <b>publishes</b> it once to Maya\'s channel.', set: { p0:{ opacity:0 }, ws7:{ fill:'blueL' }, p1:{ x:208, opacity:1 } } },
    { cap: 'Redis <b>fans out</b> a copy to every subscriber. It does no maths and knows nothing about distance; it just delivers.', set: {
      p1:{ opacity:0 }, ws7:{ fill:'tint' }, redis:{ fill:'blueL' },
      s2:{ stroke:'blue', dash:false }, s4:{ stroke:'blue', dash:false }, s9:{ stroke:'blue', dash:false },
      q2:{ x:326, y:WSY[0], opacity:1 }, q4:{ x:326, y:WSY[1], opacity:1 }, q9:{ x:326, y:WSY[2], opacity:1 } } },
    { cap: 'Each receiving server compares Maya\'s point with its own user\'s location, held <b>in memory</b>: Leo 1.8 mi, Sam 3.5 mi, Priya 11 mi.', set: {
      redis:{ fill:'card' }, s2:{ stroke:'line', dash:true }, s4:{ stroke:'line', dash:true }, s9:{ stroke:'line', dash:true },
      ws2:{ fill:'blueL' }, ws4:{ fill:'blueL' }, ws9:{ fill:'blueL' },
      d2:{ text:'1.8 mi', opacity:1 }, d4:{ text:'3.5 mi', opacity:1 }, d9:{ text:'11 mi', opacity:1 }, rule:{ opacity:1 } } },
    { cap: 'Leo and Sam are within the <b>5-mile</b> radius, so WS-2 and WS-4 push Maya\'s distance and timestamp to their phones.', set: {
      q2:{ opacity:0 }, q4:{ opacity:0 }, ws2:{ fill:'oliveL' }, ws4:{ fill:'oliveL' },
      d2:{ text:'1.8 mi ✓', color:'oliveD' }, d4:{ text:'3.5 mi ✓', color:'oliveD' },
      r2:{ x:PX, opacity:1 }, r4:{ x:PX, opacity:1 }, leo:{ fill:'oliveL' }, sam:{ fill:'oliveL' } } },
    { cap: 'Priya is 11 miles away, beyond the radius, so WS-9 <b>drops</b> the update silently. Her phone never hears about it.', set: {
      q9:{ fill:'rust', opacity:0, r:4 }, ws9:{ fill:'rustL', stroke:'rust' }, d9:{ text:'11 mi ✕', color:'rust' }, priya:{ opacity:.45 } } },
    { cap: 'One publish, many deliveries, filtered at the edge. With ~40 online friends each, 334k updates/s become ~14M pushes/s, which is why the pub/sub cluster is CPU-bound.', set: { summary:{ opacity:1 } } }
  ]
});
})();
