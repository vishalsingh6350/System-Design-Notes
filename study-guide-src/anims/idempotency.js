(function(){
/* client (left) -> payment service (middle) -> payments table with UNIQUE(key) (right).
   Requests travel on a lane above the boxes, responses on a lane below. */
function pill(x, y, fill, label){ return { type:'rect', x:x, y:y, w:86, h:36, rx:18, fill:fill, stroke:'none', label:label, lsize:12, lfont:'mono', lcolor:'white', lweight:700, opacity:0 }; }
var UP = 64, DOWN = 166, CL = 17, SV = 197;

var init = {
  client: { type:'rect', x:14, y:106, w:92, h:52, fill:'white', label:'Client\nkey a1b2', lsize:13, lfont:'mono' },
  server: { type:'rect', x:190, y:106, w:100, h:52, fill:'tint', label:'Payment\nservice', lsize:14 },
  tTitle: { type:'text', x:408, y:56, text:'payments table', size:13, weight:700 },
  tSub: { type:'text', x:408, y:74, text:'UNIQUE(key)', size:12, font:'mono', color:'soft' },
  thead: { type:'rect', x:348, y:106, w:120, h:26, rx:3, fill:'tint', label:'key · status', lsize:12, lfont:'mono', lweight:700 },
  row0: { type:'rect', x:348, y:132, w:120, h:26, rx:3, fill:'white', stroke:'line', dash:true },
  row1: { type:'rect', x:348, y:132, w:120, h:26, rx:3, fill:'oliveL', label:'a1b2 · SUCCESS', lsize:12, lfont:'mono', lweight:400, opacity:0 },
  row2: { type:'rect', x:348, y:158, w:120, h:26, rx:3, fill:'rustL', stroke:'rust', dash:true, label:'a1b2 · dup ✕', lsize:12, lfont:'mono', lweight:400, lcolor:'rust', opacity:0 },
  conflict: { type:'text', x:408, y:200, text:'UNIQUE violation', size:12, font:'mono', weight:700, color:'rust', opacity:0 },
  timeout: { type:'text', x:60, y:218, text:'timeout', size:13, font:'mono', weight:700, color:'rust', opacity:0 },
  charged: { type:'text', x:240, y:250, text:'card charged: 0', size:14, font:'mono', weight:700 },
  req1: pill(CL, UP, 'blue', 'pay $3.15\nkey a1b2'),
  req2: pill(CL, UP, 'blue', 'retry\nkey a1b2'),
  resp1: pill(SV, DOWN, 'olive', '200 OK\nSUCCESS'),
  resp2: pill(SV, DOWN, 'olive', '200 OK\nSUCCESS')
};

SDAnim.register({
  id: 'idempotency', title: 'A lost response, a retry, and no double charge', w: 480, h: 272, init: init,
  steps: [
    { cap: 'Checkout sends <code>POST /v1/payments</code> with an <b>idempotency key</b> (a UUID, here a1b2) in the <code>idempotency-key</code> header. The table has a <b>unique key constraint</b> on it.', set: {} },
    { cap: 'Request #1 carries key a1b2 to the payment service. Nothing is stored for that key yet.', set: { req1:{ x:SV, opacity:1 } } },
    { cap: 'The server <b>inserts</b> a row for a1b2. The insert succeeds, so this is new work: the card is charged once and the row records SUCCESS.', set: {
      req1:{ x:364, y:126, opacity:0 }, row0:{ opacity:0 }, row1:{ opacity:1 }, charged:{ text:'card charged: 1' } } },
    { cap: 'The 200 OK is <b>lost</b> on the way back. The client only sees a <b>timeout</b>: it cannot tell whether the payment happened.', set: {
      resp1:{ x:110, opacity:.8, fill:'rust', label:'lost ✕' }, timeout:{ opacity:1 }, client:{ stroke:'rust' } } },
    { cap: 'So it <b>retries</b> (ideally with exponential back-off) using the <b>same key</b> a1b2. Without idempotency this would be a second charge.', set: {
      resp1:{ opacity:0 }, req2:{ x:SV, opacity:1 } } },
    { cap: 'The server tries to insert a1b2 again. The <b>unique key constraint</b> rejects the duplicate row.', set: {
      req2:{ x:364, y:152, opacity:0 }, row2:{ opacity:1 }, conflict:{ opacity:1 }, row1:{ stroke:'rust', sw:2.5 } } },
    { cap: 'The server catches that violation and <b>returns the existing result</b> (SUCCESS) instead of charging again. Card charged: still 1.', set: {
      row2:{ opacity:0 }, row1:{ stroke:'ink', sw:1.5 }, conflict:{ opacity:.5 },
      resp2:{ x:CL, opacity:1 }, timeout:{ opacity:0 }, client:{ stroke:'ink', fill:'oliveL' },
      charged:{ text:'card charged: 1, not 2', color:'oliveD' } } },
    { cap: 'Retries give <b>at-least-once</b>; the idempotency key gives <b>at-most-once</b>. Together: <b>exactly-once</b>. The PSP dedupes the same way on payment_order_id.', set: { conflict:{ opacity:0 } } }
  ]
});
})();
