(function(){
/* The DAG from the notes: original -> video / audio / metadata (stage 1);
   video -> GOP chunks + thumbnail + watermark, audio -> audio encoding (stage 2); then assemble. */
var FADE = .3;
function box(x, y, w, h, label, lsize){ return { type:'rect', x:x, y:y, w:w, h:h, rx:6, fill:'white', stroke:'ink', label:label, lsize:lsize || 14, opacity:FADE }; }
function edge(x, y, x2, y2){ return { type:'arrow', x:x, y:y, x2:x2, y2:y2, stroke:'mute', sw:1.8, opacity:FADE }; }
var GX = [218, 250, 282, 314];
var init = {
  st1: { type:'text', x:151, y:22, text:'stage 1', size:12, font:'mono', color:'soft' },
  st2: { type:'text', x:280, y:22, text:'stage 2', size:12, font:'mono', color:'soft' },
  aOV: edge(84, 140, 116, 78), aOA: edge(84, 166, 116, 220), aOM: edge(84, 172, 116, 286),
  aVB: edge(184, 73, 210, 73), aAE: edge(184, 223, 210, 223),
  aBA: edge(348, 113, 374, 142), aEA: edge(348, 223, 374, 166), aAO: edge(422, 176, 422, 234),
  orig: { type:'rect', x:14, y:128, w:70, h:48, rx:6, fill:'white', stroke:'ink', label:'Original\nvideo', lsize:13 },
  video: box(118, 56, 66, 34, 'Video'),
  audio: box(118, 206, 66, 34, 'Audio'),
  meta: box(118, 272, 66, 34, 'Metadata', 12),
  tasks: { type:'rect', x:212, y:40, w:136, h:146, rx:10, fill:'paper', stroke:'mute', dash:true, opacity:FADE },
  thumb: box(218, 96, 124, 34, 'Thumbnail', 13),
  wmark: box(218, 142, 124, 34, 'Watermark', 13),
  aenc: box(212, 206, 136, 34, 'Audio encoding', 13),
  asm: box(376, 128, 92, 48, 'Assemble'),
  enc: { type:'rect', x:376, y:236, w:92, h:56, rx:6, fill:'oliveL', stroke:'olive', label:'Encoded\nvideos', lsize:13, opacity:0 }
};
GX.forEach(function(x, i){
  init['g' + i] = { type:'rect', x:137, y:59, w:28, h:28, rx:4, fill:'white', stroke:'ink', sw:1.5, label:'G' + (i + 1), lfont:'mono', lsize:12, opacity:0 };
});
function each(fn){ var o = {}; GX.forEach(function(x, i){ o['g' + i] = fn(x, i); }); return o; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }
var RUN = { fill:'blueL', stroke:'blue', opacity:1 }, DONE = { fill:'oliveL', stroke:'olive', opacity:1 };
var ON = { stroke:'blue', opacity:1 };

SDAnim.register({
  id: 'transcode-dag', title: 'Transcoding one upload as a DAG', w: 480, h: 320, init: init,
  steps: [
    { cap: 'The preprocessor turns config files into a <b>DAG</b>: tasks plus the dependencies between them. The faded boxes are the plan; nothing has run yet.', set: {} },
    { cap: '<b>Stage 1</b>: the original video is split into its <b>video</b>, <b>audio</b> and <b>metadata</b>. From here the three branches are independent.', set: { st1:{ color:'blue', weight:700 }, video:RUN, audio:RUN, meta:RUN, aOV:ON, aOA:ON, aOM:ON } },
    { cap: 'The video stream is cut further into <b>GOP-aligned chunks</b> (Groups of Pictures). Each chunk can be encoded on its own, and copies are kept in temporary storage for retries.', set: merge(each(function(x){ return { x:x, y:50, opacity:1 }; }), { video:DONE, audio:DONE, meta:DONE, aVB:ON, tasks:{ opacity:1 } }) },
    { cap: '<b>Stage 2</b> runs in parallel: every chunk is encoded at once on different workers, next to the <b>thumbnail</b> and <b>watermark</b> tasks and <b>audio encoding</b>.', set: merge(each(function(){ return { fill:'blueL', stroke:'blue' }; }), { st1:{ color:'soft', weight:400 }, st2:{ color:'blue', weight:700 }, thumb:RUN, wmark:RUN, aenc:RUN, aAE:ON }) },
    { cap: 'Tasks finish independently. Suppose the worker encoding chunk <b>G3</b> crashes: only that one task fails, not the whole video.', set: merge(each(function(x, i){ return i === 2 ? { fill:'rustL', stroke:'rust' } : { fill:'oliveL', stroke:'olive' }; }), { thumb:DONE, wmark:DONE, aenc:DONE }) },
    { cap: 'G3 is simply <b>retried</b> from the chunk saved in temporary storage. Nothing else is redone.', set: { g2:{ fill:'oliveL', stroke:'olive' } } },
    { cap: 'With all its inputs done, <b>Assemble</b> runs: the encoded chunks, thumbnail, watermark and encoded audio are stitched back together.', set: merge(each(function(){ return { x:408, y:138, opacity:0 }; }), { st2:{ color:'soft', weight:400 }, asm:RUN, aBA:ON, aEA:ON }) },
    { cap: 'Out come the <b>encoded videos</b>: several resolutions, codecs and bitrates, ready for transcoded storage and the CDN.', set: { asm:DONE, aAO:{ stroke:'olive', opacity:1 }, enc:{ opacity:1 } } },
    { cap: 'Takeaway: the DAG makes dependencies explicit, so independent work (chunks, thumbnail, watermark, audio) runs <b>in parallel</b> and a failure retries only its own task.', set: { tasks:{ stroke:'gold', sw:2.5 } } }
  ]
});
})();
