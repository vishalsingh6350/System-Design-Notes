(function(){
/* Users on the left, the room_type_inventory row on the right. Pills are the UPDATE statements travelling to the DB. */
var P1_HOME = { x:19, y:67 }, P2_HOME = { x:19, y:225 };
var P1_DB = { x:200, y:108 }, P2_DB = { x:200, y:166 };
function pill(home, fill){ return { type:'rect', x:home.x, y:home.y, w:84, h:22, rx:11, fill:fill, stroke:'none', label:'UPDATE +1', lsize:12, lfont:'mono', lcolor:'white', lweight:700, opacity:0 }; }

var init = {
  header: { type:'text', x:240, y:22, text:'Without concurrency control', size:16, font:'serif', weight:700 },
  tbl: { type:'text', x:378, y:102, text:'room_type_inventory', size:12, font:'mono', color:'soft' },
  db: { type:'rect', x:290, y:114, w:176, h:72, rx:8, fill:'white', stroke:'ink', sw:1.8, label:'reserved 99 / 100', lsize:15, lfont:'mono', lweight:700 },
  dbl: { type:'text', x:378, y:206, text:'double booking!', size:14, font:'mono', weight:700, color:'rust', opacity:0 },
  u1: { type:'rect', x:16, y:56, w:90, h:44, rx:8, fill:'blueL', stroke:'blue', label:'User 1', lsize:14 },
  u2: { type:'rect', x:16, y:214, w:90, h:44, rx:8, fill:'plumL', stroke:'plum', label:'User 2', lsize:14 },
  rd1: { type:'arrow', x:288, y:134, x2:110, y2:82, stroke:'blue', sw:1.8, dash:true, opacity:0 },
  rd2: { type:'arrow', x:288, y:166, x2:110, y2:232, stroke:'plum', sw:1.8, dash:true, opacity:0 },
  t1: { type:'text', x:16, y:126, text:'', size:13, font:'mono', color:'blue', anchor:'start' },
  t2: { type:'text', x:16, y:190, text:'', size:13, font:'mono', color:'plum', anchor:'start' },
  pill1: pill(P1_HOME, 'blue'),
  pill2: pill(P2_HOME, 'plum'),
  sql: { type:'text', x:240, y:296, text:'', size:12, font:'mono', color:'soft' }
};
function to(p, extra){ var o = { x:p.x, y:p.y, opacity:1 }; for(var k in extra) o[k] = extra[k]; return o; }

SDAnim.register({
  id: 'optimistic-lock', title: 'Two guests, one last room', w: 480, h: 316, init: init,
  steps: [
    { cap: 'Two guests try to book the <b>last room</b> at the same moment: 99 of 100 are reserved. Each booking reads availability, then adds 1 to <code>total_reserved</code>.', set: {} },
    { cap: 'The isolation level is not serializable. Both transactions read at once and both see <b>99</b>, so each concludes a room is free.',
      set: { rd1:{ opacity:1 }, rd2:{ opacity:1 }, t1:{ text:'read 99\n→ room free' }, t2:{ text:'read 99\n→ room free' } } },
    { cap: 'User 2 writes first: <code>total_reserved</code> becomes 100 and the transaction commits.',
      set: { rd2:{ opacity:0 }, pill2:to(P2_DB), db:{ label:'reserved 100 / 100' }, t2:{ text:'booked ✓', color:'oliveD' } } },
    { cap: 'User 1 still trusts its stale read and commits too: <b>101 bookings for 100 rooms</b>. Both reads happened before either write, the classic check-then-act race.',
      set: { rd1:{ opacity:0 }, pill2:{ opacity:0 }, pill1:to(P1_DB), db:{ label:'reserved 101 / 100', fill:'rustL', stroke:'rust' }, dbl:{ opacity:1 }, t1:{ text:'booked ✓ (!)', color:'rust' } } },
    { cap: 'Replay with <b>optimistic locking</b>. The row gets a <code>version</code> column. No lock is taken; the version is checked only at write time.',
      set: { header:{ text:'Optimistic locking (version number)' }, db:{ label:'reserved 99 / 100\nversion 1', fill:'white', stroke:'ink' }, dbl:{ opacity:0 },
             pill1:{ x:P1_HOME.x, y:P1_HOME.y, opacity:0, label:'+1 if v=1' }, pill2:{ x:P2_HOME.x, y:P2_HOME.y, opacity:0, label:'+1 if v=1' },
             t1:{ text:'', color:'blue' }, t2:{ text:'', color:'plum' } } },
    { cap: 'Both read again and each remembers the version it saw: <b>version 1</b>.',
      set: { rd1:{ opacity:1 }, rd2:{ opacity:1 }, t1:{ text:'read 99, v1' }, t2:{ text:'read 99, v1' } } },
    { cap: 'User 2\'s update says <code>WHERE version = 1</code>. It matches, so the row becomes 100 reserved and the version is bumped to <b>2</b>.',
      set: { rd2:{ opacity:0 }, pill2:to(P2_DB), db:{ label:'reserved 100 / 100\nversion 2', fill:'oliveL', stroke:'olive' }, t2:{ text:'booked ✓', color:'oliveD' },
             sql:{ text:'UPDATE … version = 2 WHERE … version = 1 → 1 row' } } },
    { cap: 'User 1\'s update also says <code>version = 1</code>, but the row is now version 2. <b>Zero rows match</b>, so the update fails and the transaction rolls back.',
      set: { rd1:{ opacity:0 }, pill2:{ opacity:0 }, pill1:to(P1_DB, { fill:'rust' }), t1:{ text:'v1 is stale\n→ rollback', color:'rust' },
             sql:{ text:'UPDATE … version = 2 WHERE … version = 1 → 0 rows', color:'rust' } } },
    { cap: 'User 1 retries: a fresh read shows 100 / 100, so it cleanly reports no room. Cheap while conflicts are rare, as here; the notes\' other good option is a DB <code>CHECK</code> constraint.',
      set: { pill1:{ opacity:0 }, rd1:{ opacity:1 }, t1:{ text:'re-read 100, v2\n→ sold out', color:'blue' }, sql:{ opacity:0 } } }
  ]
});
})();
