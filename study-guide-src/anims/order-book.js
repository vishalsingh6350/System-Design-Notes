(function(){
/* depth ladder: bids left, price centre, asks right; each level's queue has its head next to the price */
var ROW = { p102:70, p101:112, p100:154, p99:196 };
var HEAD_A = 272, TAIL_A = 342, HEAD_B = 144, TAIL_B = 74;
function price(y, label){ return { type:'rect', x:214, y:y - 17, w:52, h:34, rx:4, fill:'card', stroke:'line', label:label, lsize:14, lfont:'mono', lweight:700 }; }
function ask(x, y, q){ return { type:'rect', x:x, y:y - 15, w:64, h:30, rx:5, fill:'plumL', stroke:'plum', label:q, lsize:13, lfont:'mono' }; }
function bid(x, y, q){ return { type:'rect', x:x, y:y - 15, w:64, h:30, rx:5, fill:'tint', stroke:'oliveD', label:q, lsize:13, lfont:'mono' }; }
function fill(y){ return { type:'text', x:360, y:y, text:'', size:12, font:'mono', weight:700, color:'oliveD', opacity:0 }; }
function eat(){ return { x:222, w:36, fill:'gold', opacity:0 }; }

var init = {
  hBid: { type:'text', x:110, y:34, text:'BID (buy)', size:13, weight:700, color:'oliveD' },
  hPrice: { type:'text', x:240, y:34, text:'price', size:12, color:'soft' },
  hAsk: { type:'text', x:370, y:34, text:'ASK (sell)', size:13, weight:700, color:'plum' },
  spread: { type:'line', x:14, y:133, x2:410, y2:133, stroke:'mute', dash:true, sw:1.5 },
  spreadTxt: { type:'text', x:440, y:133, text:'spread', size:12, font:'mono', color:'soft' },
  pr102: price(ROW.p102, '$102'), pr101: price(ROW.p101, '$101'), pr100: price(ROW.p100, '$100'), pr99: price(ROW.p99, '$99'),
  a3: ask(HEAD_A, ROW.p102, '300'), a4: ask(TAIL_A, ROW.p102, '200'),
  a1: ask(HEAD_A, ROW.p101, '100'), a2: ask(TAIL_A, ROW.p101, '200'),
  b1: bid(HEAD_B, ROW.p100, '200'), b2: bid(TAIL_B, ROW.p100, '100'),
  b3: bid(HEAD_B, ROW.p99, '300'),
  lim: { type:'text', x:440, y:ROW.p102, text:'> limit', size:12, font:'mono', weight:700, color:'rust', opacity:0 },
  hIn: { type:'text', x:74, y:236, text:'incoming order', size:12, color:'soft' },
  hEx: { type:'text', x:360, y:236, text:'executions (fills)', size:13, weight:700 },
  f1: fill(262), f2: fill(284), f3: fill(310),
  inc: { type:'rect', x:14, y:248, w:120, h:44, fill:'blueL', stroke:'blue', sw:2, label:'BUY 500\nlimit $101', lsize:13, lfont:'mono', opacity:0 }
};

SDAnim.register({
  id: 'order-book', title: 'A limit order crossing the spread', w: 480, h: 330, init: init,
  steps: [
    { cap: 'A <b>limit order book</b> for one symbol: bids on the left, asks on the right, one row per price level. Best bid $100, best ask $101; the gap between them is the <b>spread</b>.', set: {} },
    { cap: 'Inside a level, orders queue <b>FIFO</b>. At $101 the 100-share sell arrived first, so it sits at the head next to the price; newer orders join the tail.', set: {
      a1:{ stroke:'gold', sw:3 } } },
    { cap: 'A new order arrives: <b>BUY 500, limit $101</b>. Its limit reaches the best ask, so it <b>crosses the spread</b> and can trade right away.', set: {
      a1:{ stroke:'plum', sw:1.5 }, inc:{ opacity:1 } } },
    { cap: 'Matching starts at the <b>best opposite price</b>, the $101 ask level, with the order at the head of its queue.', set: {
      inc:{ x:130, y:ROW.p101 - 15, w:78, h:30, label:'BUY 500' }, a1:{ fill:'goldL', stroke:'gold', sw:3 } } },
    { cap: '100 shares trade. Every match emits <b>two fills</b> (executions): one for the buyer, one for the seller. The head order leaves the queue in O(1).', set: {
      a1:eat(), a2:{ x:HEAD_A }, inc:{ label:'BUY 400' }, f1:{ text:'100 @ $101 → 2 fills', opacity:1 } } },
    { cap: 'The next order in line, 200 shares, fills too. The $101 ask level is now empty and the buyer still wants 200.', set: {
      a2:eat(), inc:{ label:'BUY 200' }, f2:{ text:'200 @ $101 → 2 fills', opacity:1 } } },
    { cap: 'The next ask level is $102, above the buyer\'s $101 limit. A limit order never pays more than its limit, so matching <b>stops</b>.', set: {
      a3:{ stroke:'rust', sw:3 }, lim:{ opacity:1 } } },
    { cap: 'The unfilled <b>200 shares rest</b> in the book as the new best bid at $101. Best ask is now $102: the big order pushed the price up.', set: {
      a3:{ stroke:'plum', sw:1.5 }, lim:{ opacity:0 },
      inc:{ fill:'tint', stroke:'oliveD', sw:1.5 }, spread:{ y:91, y2:91 }, spreadTxt:{ y:91 },
      f3:{ text:'rests: BUY 200 @ $101', color:'ink', opacity:1 } } },
    { cap: 'The whole rule: best price first, <b>FIFO</b> within a price, and whatever cannot match rests. The fills stream back to the order manager and out as market data.', set: {} }
  ]
});
})();
