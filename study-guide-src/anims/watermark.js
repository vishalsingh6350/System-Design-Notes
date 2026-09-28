(function(){
/* x axis: 00:00 at x=48, 128 px per minute. Event lane y=78, processing lane y=190. */
function tx(sec){ return 48 + 128 * sec / 60; }
var EV = { e1:[10, 22], e2:[30, 41], e3:[50, 68], e4:[40, 125] };   /* [event second, processing second] */
var TOP = 78, BOT = 190;

var init = {
  lblEvent: { type:'text', x:48, y:22, text:'event time: when the click happened', size:13, color:'soft', anchor:'start' },
  w1: { type:'rect', x:48, y:34, w:128, h:22, rx:0, fill:'tint', stroke:'line', sw:1.2, label:'00:00–00:01', lsize:12, lfont:'mono', lweight:700 },
  w2: { type:'rect', x:176, y:34, w:128, h:22, rx:0, fill:'card', stroke:'line', sw:1.2, label:'00:01–00:02', lsize:12, lfont:'mono', lweight:400, lcolor:'soft' },
  w3: { type:'rect', x:304, y:34, w:128, h:22, rx:0, fill:'card', stroke:'line', sw:1.2, label:'00:02–00:03', lsize:12, lfont:'mono', lweight:400, lcolor:'soft' },
  evLane: { type:'line', x:48, y:TOP, x2:432, y2:TOP, stroke:'line', sw:2 },
  wm: { type:'rect', x:176, y:180, w:0, h:20, rx:0, fill:'goldL', stroke:'gold', sw:1.5, opacity:0 },
  prLane: { type:'line', x:48, y:BOT, x2:432, y2:BOT, stroke:'ink', sw:2 },
  k0: { type:'text', x:48, y:212, text:'00:00', size:12, font:'mono', color:'soft' },
  k1: { type:'text', x:176, y:212, text:'00:01', size:12, font:'mono', color:'soft' },
  k2: { type:'text', x:304, y:212, text:'00:02', size:12, font:'mono', color:'soft' },
  k3: { type:'text', x:432, y:212, text:'00:03', size:12, font:'mono', color:'soft' },
  close: { type:'line', x:176, y:176, x2:176, y2:202, stroke:'rust', sw:3 },
  closeTxt: { type:'text', x:176, y:234, text:'W1 closes 00:01', size:12, font:'mono', weight:700, color:'rust' },
  lblProc: { type:'text', x:48, y:258, text:'processing time: when the aggregator sees it', size:13, color:'soft', anchor:'start' },
  count: { type:'text', x:48, y:279, text:'W1 count: 0', size:14, font:'mono', weight:700, anchor:'start' },
  lateTxt: { type:'text', x:206, y:170, text:'late!', size:12, font:'mono', weight:700, color:'rust', anchor:'start', opacity:0 },
  dropTxt: { type:'text', x:328, y:170, text:'too late', size:12, font:'mono', weight:700, color:'rust', anchor:'start', opacity:0 }
};
Object.keys(EV).forEach(function(k){
  var ex = tx(EV[k][0]);
  init['tr_' + k] = { type:'line', x:ex, y:TOP + 7, x2:ex, y2:TOP + 7, stroke:'mute', sw:1.6, dash:true, opacity:0 };
});
Object.keys(EV).forEach(function(k){
  init[k] = { type:'circle', x:tx(EV[k][0]), y:TOP, r:7, fill:'blue', stroke:'white', sw:1.5 };
});
function fall(k, fill){
  var o = {};
  o['tr_' + k] = { x2:tx(EV[k][1]), y2:BOT - 7, opacity:1 };
  o[k] = { x:tx(EV[k][1]), y:BOT, fill:fill };
  return o;
}
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'watermark', title: 'Late clicks, watermarks and reconciliation', w: 480, h: 300, init: init,
  steps: [
    { cap: 'Each click has an <b>event time</b> (top) and a <b>processing time</b> (bottom). The notes count by event time, in 1-minute <b>tumbling windows</b>, because billing needs accuracy.', set: {} },
    { cap: 'Most clicks arrive within seconds. The clicks from 00:00:10 and 00:00:30 reach the aggregator before 00:01, so both count in their window: <b>W1 = 2</b>.',
      set: merge(fall('e1', 'olive'), fall('e2', 'olive'), { count:{ text:'W1 count: 2' } }) },
    { cap: 'A click from <b>00:00:50</b> is held up by queues and the network and arrives at 00:01:08. W1 closed at 00:01, so the click is <b>missed</b>.',
      set: merge(fall('e3', 'rust'), { lateTxt:{ opacity:1 } }) },
    { cap: 'Fix: a <b>watermark</b> keeps each window open a little longer, 15 s here. W1 now closes at 00:01:15, and the late click counts in its true minute: <b>W1 = 3</b>.',
      set: { wm:{ w:32, opacity:1 }, close:{ x:208, x2:208 }, closeTxt:{ x:208, text:'W1 closes 00:01:15' }, e3:{ fill:'olive' }, lateTxt:{ opacity:0 }, count:{ text:'W1 count: 3' } } },
    { cap: 'A click from <b>00:00:40</b> shows up at 00:02:05, far beyond even the watermark. The real-time pipeline has already emitted W1, so this click is left out.',
      set: merge(fall('e4', 'rust'), { dropTxt:{ opacity:1 } }) },
    { cap: 'The notes don\'t chase such rare stragglers in real time. An <b>end-of-day reconciliation</b> batch job recounts from the raw data and corrects W1 to 4.',
      set: { e4:{ fill:'gold' }, dropTxt:{ text:'fixed in batch', color:'oliveD' }, count:{ text:'W1 count: 4 (reconciled)', color:'oliveD' } } },
    { cap: 'Takeaway: a short watermark gives low latency but misses more; a long one catches more but delays every result. No size catches everything, so reconcile.',
      set: { wm:{ fill:'gold', stroke:'goldL' }, tr_e1:{ opacity:.35 }, tr_e2:{ opacity:.35 } } }
  ]
});
})();
