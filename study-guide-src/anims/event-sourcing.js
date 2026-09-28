(function(){
/* top: command queue -> state machine -> state (balances); bottom: the append-only event log */
var SLOT = { x:179, y:66 };
var EVY = 208, EVX = [14, 124, 234];
function cmd(y, label){ return { type:'rect', x:18, y:y, w:112, h:40, fill:'blueL', stroke:'blue', label:label, lsize:12, lfont:'mono' }; }
function ev(x, y, label, op){ return { type:'rect', x:x, y:y, w:100, h:40, fill:'tint', label:label, lsize:13, lfont:'mono', opacity:op }; }
function bal(y, label){ return { type:'rect', x:340, y:y, w:128, h:36, fill:'white', label:label, lsize:14, lfont:'mono' }; }

var init = {
  hCmd: { type:'text', x:74, y:22, text:'commands (FIFO)', size:12, color:'soft' },
  hState: { type:'text', x:404, y:22, text:'state (balances)', size:12, color:'soft' },
  sm: { type:'rect', x:160, y:36, w:150, h:100, rx:10, fill:'card', stroke:'plum', sw:2 },
  smTitle: { type:'text', x:235, y:52, text:'state machine', size:13, weight:700, color:'plum' },
  smSub: { type:'text', x:235, y:124, text:'deterministic', size:12, italic:true, color:'soft' },
  balA: bal(40, 'A: $5'),
  balC: bal(84, 'C: $0'),
  snap: { type:'rect', x:340, y:136, w:128, h:40, fill:'goldL', stroke:'gold', sw:2, label:'snapshot @ #3\nA $4 · C $1', lsize:12, lfont:'mono', lweight:700, opacity:0 },
  check: { type:'text', x:235, y:156, text:'', size:12, font:'mono', weight:700, color:'oliveD' },
  hLog: { type:'text', x:240, y:190, text:'event log: append-only, immutable', size:13, weight:600 },
  next: { type:'rect', x:344, y:EVY, w:100, h:40, fill:'none', stroke:'line', dash:true, label:'next…', lsize:12, lcolor:'mute', lweight:400 },
  ev0: ev(EVX[0], EVY, '#1 A +$5', 1),
  ev1: ev(SLOT.x, SLOT.y, '#2 A −$1', 0),
  ev2: ev(SLOT.x, SLOT.y, '#3 C +$1', 0),
  c2: cmd(88, 'transfer\nA→C $9'),
  c1: cmd(40, 'transfer\nA→C $1'),
  cursor: { type:'arrow', x:64, y:292, x2:64, y2:256, stroke:'gold', sw:3, opacity:0 },
  replay: { type:'text', x:64, y:306, text:'replay', size:12, font:'mono', weight:700, opacity:0 }
};

SDAnim.register({
  id: 'event-sourcing', title: 'Event sourcing: commands, events, state and replay', w: 480, h: 326, init: init,
  steps: [
    { cap: 'The source of truth is the <b>event log</b>, an append-only list of facts. Balances are just <b>state</b> derived from it. So far one event: A was credited $5.', set: {} },
    { cap: 'A <b>command</b> leaves the FIFO queue (e.g. Kafka): transfer $1 from A to C. A command is only an intention; it can still fail.', set: {
      c1:{ x:SLOT.x, y:SLOT.y }, c2:{ y:40 } } },
    { cap: 'The state machine <b>validates</b> it against current state: A holds $5, enough to send $1. Valid.', set: {
      c1:{ fill:'oliveL', stroke:'olive' }, check:{ text:'A has $5 ≥ $1 ✓' }, balA:{ stroke:'olive', sw:2.5 } } },
    { cap: 'The valid command becomes two <b>events</b>, one per account: A −$1 and C +$1. They are appended to the log and never edited or deleted.', set: {
      c1:{ opacity:0 }, check:{ text:'' }, balA:{ stroke:'ink', sw:1.5 },
      ev1:{ x:EVX[1], y:EVY, opacity:1 }, ev2:{ x:EVX[2], y:EVY, opacity:1 } } },
    { cap: 'The state machine <b>applies</b> each event to state: A $5 &rarr; $4, C $0 &rarr; $1. State only ever changes by applying events.', set: {
      balA:{ label:'A: $4', fill:'oliveL' }, balC:{ label:'C: $1', fill:'oliveL' } } },
    { cap: 'Next command: transfer $9. A only has $4, so validation fails. A rejected command produces <b>zero events</b>; the log is untouched.', set: {
      balA:{ fill:'white' }, balC:{ fill:'white' },
      c2:{ x:SLOT.x, y:SLOT.y, fill:'rustL', stroke:'rust' }, check:{ text:'A has $4 < $9 ✕', color:'rust' } } },
    { cap: 'Audit time: throw the balances away and <b>replay</b> the log from event #1 through the same state machine.', set: {
      c2:{ opacity:0 }, check:{ text:'' },
      balA:{ label:'A: ?', fill:'paper', dash:true, lcolor:'mute' }, balC:{ label:'C: ?', fill:'paper', dash:true, lcolor:'mute' },
      cursor:{ opacity:1 }, replay:{ opacity:1 } } },
    { cap: 'Replaying #1, #2, #3 gives A $4, C $1: <b>exactly the same state</b>, because events are immutable and the machine uses no randomness or external IO.', set: {
      cursor:{ x:284, x2:284 }, replay:{ x:284 },
      balA:{ label:'A: $4', fill:'oliveL', dash:false, lcolor:'ink' }, balC:{ label:'C: $1', fill:'oliveL', dash:false, lcolor:'ink' } }, dur: 1400 },
    { cap: 'Replaying from #1 gets slow as the log grows, so state is saved periodically as a <b>snapshot</b> (e.g. in HDFS). Recovery loads it and replays only newer events.', set: {
      cursor:{ opacity:0 }, replay:{ opacity:0 }, balA:{ fill:'white' }, balC:{ fill:'white' }, snap:{ opacity:1 } } },
    { cap: 'State and snapshots can always be rebuilt from events; events cannot be rebuilt from non-deterministic commands. So the <b>event log</b> is what gets replicated (Raft).', set: {
      ev0:{ stroke:'olive', sw:2.5 }, ev1:{ stroke:'olive', sw:2.5 }, ev2:{ stroke:'olive', sw:2.5 } } }
  ]
});
})();
