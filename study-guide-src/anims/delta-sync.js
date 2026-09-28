(function(){
/* The notes' example: a file of 10 blocks (max 4 MB each); the user edits blocks 2 and 5. Hashes are illustrative. */
var HASH = ['3fa', '9c1', '07d', 'e52', 'b84', '1d9', 'c60', '5ae', '2f7', 'd13'];
function bx(i){ return 24 + (i % 5) * 44; }
function by(i){ return i < 5 ? 42 : 100; }
var init = {
  titleA: { type:'text', x:130, y:20, text:'Client A · 10 blocks of ≤ 4 MB', size:12, font:'mono', color:'soft' },
  clientA: { type:'rect', x:12, y:30, w:236, h:126, rx:8, fill:'card', stroke:'line' },
  bs: { type:'rect', x:272, y:30, w:92, h:126, rx:8, fill:'card', stroke:'line', label:'Block servers\ncompress\n+ encrypt', lsize:12, lcolor:'soft' },
  cloud: { type:'rect', x:376, y:30, w:92, h:126, rx:8, fill:'card', stroke:'line', label:'Cloud\nstorage', lsize:13, lcolor:'soft' },
  api: { type:'rect', x:40, y:196, w:180, h:56, rx:8, fill:'white', stroke:'ink', label:'API + metadata DB\nfile v1', lsize:12 },
  notif: { type:'rect', x:244, y:196, w:110, h:56, rx:8, fill:'white', stroke:'ink', label:'Notification\nservice', lsize:12 },
  clientB: { type:'rect', x:376, y:184, w:92, h:108, rx:8, fill:'card', stroke:'line', label:'Client B\nfile v1', lsize:13 },
  metaArr: { type:'arrow', x:130, y:158, x2:130, y2:194, stroke:'blue', opacity:0 },
  notifyArr: { type:'arrow', x:220, y:224, x2:242, y2:224, stroke:'gold', opacity:0 },
  pushArr: { type:'arrow', x:354, y:224, x2:374, y2:224, stroke:'gold', opacity:0 },
  stat: { type:'text', x:240, y:314, text:'40 MB file, v1 synced on both clients', size:13, font:'mono' }
};
HASH.forEach(function(h, i){
  init['b' + (i + 1)] = { type:'rect', x:bx(i), y:by(i), w:40, h:44, rx:4, fill:'white', stroke:'ink', sw:1.3, label:'B' + (i + 1) + '\n' + h, lfont:'mono', lsize:12 };
});
function chip(n, x, y, w, h, fill, stroke, lcolor){ return { type:'rect', x:x, y:y, w:w, h:h, rx:4, fill:fill, stroke:stroke, sw:1.5, label:'B' + n, lfont:'mono', lsize:12, lcolor:lcolor, opacity:0 }; }
init.u2 = chip(2, bx(1), by(1), 40, 44, 'goldL', 'gold', 'ink');
init.u5 = chip(5, bx(4), by(4), 40, 44, 'goldL', 'gold', 'ink');
init.d2 = chip(2, 384, 36, 34, 26, 'blue', 'blue', 'white');
init.d5 = chip(5, 426, 36, 34, 26, 'blue', 'blue', 'white');
var SEALED = { fill:'blue', stroke:'blue', lcolor:'white', w:34, h:26, y:36, opacity:1 };
function sealed(x){ return Object.assign({ x:x }, SEALED); }

SDAnim.register({
  id: 'delta-sync', title: 'Delta sync: only changed blocks travel', w: 480, h: 336, init: init,
  steps: [
    { cap: 'Block servers split every file into blocks of at most <b>4 MB</b>, each with its own hash. This file is 10 blocks, and version 1 is already synced to cloud storage and Client B.', set: {} },
    { cap: 'The user edits the file, touching only <b>blocks 2 and 5</b>. Re-hashing shows exactly those two hashes changed; the other eight still match.', set: { b2:{ fill:'goldL', stroke:'gold', label:'B2\n4d8' }, b5:{ fill:'goldL', stroke:'gold', label:'B5\nf27' }, stat:{ text:'hashes changed: 2 of 10 blocks' } } },
    { cap: 'The client sends the new metadata to the API servers: v2 = blocks 1, 2&prime;, 3, 4, 5&prime;, 6&ndash;10. It is stored with status <code>pending</code>.', set: { metaArr:{ opacity:1 }, api:{ label:'API + metadata DB\nv2: pending', stroke:'blue' }, stat:{ text:'metadata first: v2 pending' } } },
    { cap: '<b>Delta sync</b>: only blocks 2 and 5 are uploaded. The block servers <b>compress</b> and <b>encrypt</b> each one; the other eight blocks never leave the laptop.', set: { u2:sealed(280), u5:sealed(322), bs:{ stroke:'gold', sw:2.5 }, stat:{ text:'uploading ≤ 8 MB, not 40 MB' } } },
    { cap: 'The sealed blocks land in cloud storage, which calls back the API servers: file v2 flips to <code>uploaded</code>. The unchanged v1 blocks are simply reused.', set: { u2:{ x:384 }, u5:{ x:426 }, bs:{ stroke:'line', sw:1.5 }, metaArr:{ opacity:0 }, api:{ label:'API + metadata DB\nv2: uploaded', fill:'oliveL', stroke:'olive' }, stat:{ text:'v2 stored and marked uploaded' } } },
    { cap: 'The <b>notification service</b> tells Client B the file changed. The message only says that v2 exists; it carries no file data.', set: { notifyArr:{ opacity:1 }, pushArr:{ opacity:1 }, notif:{ fill:'goldL', stroke:'gold' }, clientB:{ stroke:'gold', sw:2.5 }, stat:{ text:'notify: "file changed"' } } },
    { cap: 'Client B fetches the new metadata, sees that only blocks 2 and 5 differ from its copy, downloads just those two and rebuilds the file.', set: { d2:{ x:386, y:194, fill:'goldL', stroke:'gold', lcolor:'ink', opacity:1 }, d5:{ x:428, y:194, fill:'goldL', stroke:'gold', lcolor:'ink', opacity:1 }, notif:{ fill:'white', stroke:'ink' }, notifyArr:{ opacity:0 }, pushArr:{ opacity:0 }, clientB:{ label:'Client B\nfile v2', fill:'oliveL', stroke:'olive', sw:2 }, stat:{ text:'download: 2 blocks' } } },
    { cap: 'Takeaway: blocks plus hashes turn every edit into a <b>delta</b>: 2 of 10 blocks up, 2 down. Less bandwidth, faster sync, and each block can be retried on its own.', set: { stat:{ text:'≤ 8 MB each way, not 40 MB', color:'oliveD' } } }
  ]
});
})();
