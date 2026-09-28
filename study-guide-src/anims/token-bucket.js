(function(){
var slots = [[217, 215], [263, 215], [217, 172], [263, 172]];
var gate = { x: 240, y: 118 };
var api = { x: 417, y: 150 };
function req(label, y){ return { type:'circle', x:10, y:y, r:17, fill:'blue', opacity:0, label:label, lsize:12 }; }
var init = {
  refillTxt: { type:'text', x:240, y:26, text:'refiller: +1 token per second', size:14, font:'mono', color:'soft' },
  refillArrow: { type:'arrow', x:240, y:42, x2:240, y2:96, stroke:'olive', dash:true },
  bucket: { type:'path', d:'M185 105 L185 230 Q185 242 197 242 L283 242 Q295 242 295 230 L295 105', stroke:'ink', sw:2.6 },
  bucketTxt: { type:'text', x:240, y:284, text:'bucket size = 4', size:13, font:'mono', color:'soft' },
  count: { type:'text', x:240, y:262, text:'tokens 4 / 4', size:15, font:'mono', weight:700 },
  api: { type:'rect', x:370, y:115, w:95, h:70, rx:8, fill:'tint', label:'API\nservers', lsize:14 },
  served: { type:'text', x:417, y:200, text:'served: 0', size:13, font:'mono', color:'oliveD' },
  dropTxt: { type:'text', x:417, y:282, text:'dropped (429)', size:13, font:'mono', color:'rust', opacity:0 },
  t1: { type:'circle', x:slots[0][0], y:slots[0][1], r:17, fill:'gold', stroke:'ink', sw:1.2 },
  t2: { type:'circle', x:slots[1][0], y:slots[1][1], r:17, fill:'gold', stroke:'ink', sw:1.2 },
  t3: { type:'circle', x:slots[2][0], y:slots[2][1], r:17, fill:'gold', stroke:'ink', sw:1.2 },
  t4: { type:'circle', x:slots[3][0], y:slots[3][1], r:17, fill:'gold', stroke:'ink', sw:1.2 },
  t5: { type:'circle', x:240, y:50, r:17, fill:'gold', stroke:'ink', sw:1.2, opacity:0 },
  r1: req('R1', 110), r2: req('R2', 160), r3: req('R3', 210),
  r4: req('R4', 135), r5: req('R5', 190), r6: req('R6', 160)
};
function pass(r, t){ var s = {}; s[r] = { x: api.x, y: api.y, opacity: 0, r: 10 }; s[t] = { x: gate.x, y: gate.y, opacity: 0, r: 6 }; return s; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'token-bucket', title: 'Token bucket, one request at a time', w: 480, h: 300, init: init,
  steps: [
    { cap: 'The bucket holds up to <b>4 tokens</b>. A refiller adds 1 token every second; when the bucket is already full, extra tokens spill away.', set: {} },
    { cap: 'A burst arrives: three requests at once. Every request must take one token to get through.', set: { r1:{ x:40, opacity:1 }, r2:{ x:40, opacity:1 }, r3:{ x:40, opacity:1 } } },
    { cap: '<b>R1</b> takes a token and continues to the API servers. 3 tokens left.', set: merge(pass('r1', 't4'), { count:{ text:'tokens 3 / 4' }, served:{ text:'served: 1' } }) },
    { cap: '<b>R2</b> and <b>R3</b> do the same. The whole burst passes instantly because tokens were saved up while traffic was quiet.', set: merge(pass('r2', 't3'), pass('r3', 't2'), { count:{ text:'tokens 1 / 4' }, served:{ text:'served: 3' } }) },
    { cap: 'Two more requests, <b>R4</b> and <b>R5</b>, arrive within the same second.', set: { r4:{ x:40, opacity:1 }, r5:{ x:40, opacity:1 } } },
    { cap: '<b>R4</b> spends the last token. The bucket is now empty.', set: merge(pass('r4', 't1'), { count:{ text:'tokens 0 / 4', color:'rust' }, served:{ text:'served: 4' } }) },
    { cap: '<b>R5</b> finds no token, so it is <b>dropped</b> with HTTP 429. The servers never see it.', set: { r5:{ x:417, y:252, fill:'rust', label:'✕' }, dropTxt:{ opacity:1 } } },
    { cap: 'One second later the refiller drops in a fresh token&hellip;', set: { t5:{ y:215, x:217, opacity:1 }, count:{ text:'tokens 1 / 4', color:'ink' } } },
    { cap: '&hellip;so the next request, <b>R6</b>, gets through. Two knobs rule everything: <b>bucket size</b> (how big a burst may pass) and <b>refill rate</b> (the sustained limit).', set: merge({ r6:{ x:40, opacity:1 } }, {}) , dur: 500 },
    { cap: 'R6 spends the new token and is served. Bursts are absorbed up to the bucket size; beyond that, only the refill rate gets through.', set: merge(pass('r6', 't5'), { count:{ text:'tokens 0 / 4' }, served:{ text:'served: 5' } }) }
  ]
});
})();
