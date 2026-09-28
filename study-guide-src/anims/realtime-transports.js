(function(){
/* Three lanes. In each lane the top edge is the client, the bottom edge the server; time runs left to right.
   Client edges: 72 / 172 / 272. Server edges: 118 / 218 / 318. A new message reaches every server at x = 330. */
function lane(top){ return { type:'rect', x:70, y:top + 22, w:398, h:46, rx:2, fill:'card', stroke:'soft', sw:1.5 }; }
function title(top, t){ return { type:'text', x:14, y:top - 6, text:t, size:15, font:'serif', weight:700, anchor:'start' }; }
function ends(top){ return { type:'text', x:14, y:top + 45, text:'client\n \n \nserver', size:12, font:'mono', color:'soft', anchor:'start' }; }
function poll(x, stroke){ return { type:'path', d:'M' + x + ',74 L' + (x + 12) + ',116 L' + (x + 24) + ',74', stroke:stroke, sw:2, opacity:0 }; }
function dot(y){ return { type:'circle', x:330, y:y, r:7, fill:'gold', stroke:'ink', sw:1, opacity:0 }; }
var init = {
  msgTxt: { type:'text', x:330, y:22, text:'message reaches server', size:12, font:'mono', color:'soft', opacity:0 },
  t1: title(50, 'Polling'), t2: title(150, 'Long polling'), t3: title(250, 'WebSocket'),
  e1: ends(50), e2: ends(150), e3: ends(250),
  l1: lane(50), l2: lane(150), l3: lane(250),
  wsBand: { type:'rect', x:110, y:276, w:356, h:38, rx:4, fill:'blueL', stroke:'none', opacity:0 },
  msgLine: { type:'line', x:330, y:36, x2:330, y2:326, stroke:'gold', sw:2, dash:true, opacity:0 },
  p1: poll(86, 'mute'), p2: poll(166, 'mute'), p3: poll(246, 'mute'), p4: poll(350, 'olive'),
  lp1: { type:'path', d:'M86,174 L98,212 L200,212 L212,174', stroke:'mute', sw:2, opacity:0 },
  lp2: { type:'path', d:'M222,174 L234,212 L330,212', stroke:'blue', sw:2, opacity:0 },
  lp3: { type:'path', d:'M352,174 L364,212 L462,212', stroke:'blue', sw:2, opacity:0 },
  wsUp: { type:'path', d:'M86,274 L98,316 L110,274', stroke:'blue', sw:2, opacity:0 },
  wsSend: { type:'arrow', x:200, y:276, x2:200, y2:276, stroke:'blue', sw:2, opacity:0 },
  wsPush: { type:'arrow', x:330, y:316, x2:330, y2:316, stroke:'olive', sw:2.2, opacity:0 },
  d1: dot(118), d2: dot(218), d3: dot(318)
};

SDAnim.register({
  id: 'realtime-transports', title: 'Polling vs long polling vs WebSocket', w: 480, h: 340, init: init,
  steps: [
    { cap: 'Three ways for a receiver to get new messages. In each lane the top edge is the <b>client</b>, the bottom edge the <b>server</b>, and time runs left to right.', set: {} },
    { cap: '<b>Polling</b>: the client asks every few seconds, &ldquo;anything new?&rdquo; Nothing has arrived yet, so every answer comes back empty. Wasted requests.', set: { p1:{ opacity:1 }, p2:{ opacity:1 }, p3:{ opacity:1 }, t1:{ text:'Polling: 3 asks, 3 empty' } } },
    { cap: 'At the gold line a new message reaches the server, the same moment in all three lanes. How soon does each client get it?', set: { msgLine:{ opacity:1 }, msgTxt:{ opacity:1 }, d1:{ opacity:1 }, d2:{ opacity:1 }, d3:{ opacity:1 } } },
    { cap: 'The message just missed a poll, so it <b>waits</b> at the server until the next one. Delivery is late by up to one interval, and most requests carried nothing.', set: { p4:{ opacity:1 }, d1:{ x:374, y:72 }, t1:{ text:'Polling: 4 asks, 3 empty' } } },
    { cap: '<b>Long polling</b>: the client asks once and the server <b>holds the request open</b>. Nothing arrives before the timeout, so it answers empty and the client asks again.', set: { lp1:{ opacity:1 }, lp2:{ opacity:1 } } },
    { cap: 'The message arrives while a request is held, so the server answers <b>immediately</b> and the client reconnects. Fast, but idle users keep connections open for nothing.', set: { lp2:{ d:'M222,174 L234,212 L330,212 L342,174', stroke:'olive' }, d2:{ x:342, y:172 }, lp3:{ opacity:1 }, t2:{ text:'Long polling: held open' } } },
    { cap: '<b>WebSocket</b>: one HTTP request is <b>upgraded</b> into a single persistent, bi-directional connection that simply stays open.', set: { wsUp:{ opacity:1 }, wsBand:{ opacity:.75 } } },
    { cap: 'Either side can send at any time. The client sends over it, and the moment the message arrives the server <b>pushes</b> it down. No asking, no waiting.', set: { wsSend:{ x2:210, y2:314, opacity:1 }, wsPush:{ x2:334, y2:276, opacity:1 }, d3:{ x:334, y:272 } } },
    { cap: 'Takeaway: the chat design uses <b>WebSocket</b> for both sending and receiving. The price is a live connection per client, which makes chat servers <b>stateful</b>.', set: { t1:{ text:'Polling: late, mostly empty', color:'rust' }, t2:{ text:'Long polling: idle holds', color:'soft' }, t3:{ text:'WebSocket: instant, both ways', color:'oliveD' } } }
  ]
});
})();
