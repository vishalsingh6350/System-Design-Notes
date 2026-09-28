(function(){
/* world box 20..300 square; quadrant splits at x=160/y=160, NE splits at x=230/y=90, NE-sw splits at x=195/y=125 */
var DOTS = {
  d1:[95, 80], d2:[85, 225], d3:[205, 215], d4:[262, 258], d5:[190, 52], d6:[264, 126],
  d7:[171, 103], d8:[185, 116], d9:[220, 101], d10:[176, 146], d11:[214, 141]
};
var USER = { x:207, y:113 };

function split(cx, cy, x0, y0, x1, y1){
  return {
    v:{ type:'line', x:cx, y:cy, x2:cx, y2:cy, stroke:'ink', sw:1.6, opacity:0, _to:{ y:y0, y2:y1, opacity:1 } },
    h:{ type:'line', x:cx, y:cy, x2:cx, y2:cy, stroke:'ink', sw:1.6, opacity:0, _to:{ x:x0, x2:x1, opacity:1 } }
  };
}
var L1 = split(160, 160, 20, 20, 300, 300), L2 = split(230, 90, 160, 20, 300, 160), L3 = split(195, 125, 160, 90, 230, 160);
function strip(o){ var c = {}; for(var k in o) if(k !== '_to') c[k] = o[k]; return c; }

var init = {
  box: { type:'rect', x:20, y:20, w:280, h:280, rx:2, fill:'card', stroke:'ink', sw:2 },
  nbr: { type:'rect', x:160, y:90, w:70, h:70, rx:0, fill:'goldL', stroke:'gold', sw:2, dash:true, opacity:0 },
  leafHi: { type:'rect', x:20, y:20, w:280, h:280, rx:0, fill:'gold', stroke:'none', opacity:0 },
  hot: { type:'rect', x:20, y:20, w:280, h:280, rx:0, fill:'rustL', stroke:'rust', sw:2, dash:true, opacity:.6 },
  v1: strip(L1.v), h1: strip(L1.h), v2: strip(L2.v), h2: strip(L2.h), v3: strip(L3.v), h3: strip(L3.h)
};
Object.keys(DOTS).forEach(function(k){ init[k] = { type:'circle', x:DOTS[k][0], y:DOTS[k][1], r:5, fill:'ink' }; });
init.user = { type:'circle', x:USER.x, y:USER.y, r:0, fill:'blue', stroke:'white', sw:2.5, opacity:0 };
init.lNW = { type:'text', x:26, y:32, text:'NW', size:12, font:'mono', color:'soft', anchor:'start' };
init.lNE = { type:'text', x:294, y:32, text:'NE', size:12, font:'mono', color:'soft', anchor:'end' };
init.lSW = { type:'text', x:26, y:290, text:'SW', size:12, font:'mono', color:'soft', anchor:'start' };
init.lSE = { type:'text', x:294, y:290, text:'SE', size:12, font:'mono', color:'soft', anchor:'end' };
init.limit = { type:'text', x:390, y:52, text:'limit: 4 per leaf\n(notes use 100)', size:13, font:'mono', color:'soft' };
init.status = { type:'text', x:390, y:165, text:'root: 11\n11 > 4', size:14, font:'mono', weight:700, color:'rust' };

function grow(L){ return { v:L.v._to, h:L.h._to }; }
var g1 = grow(L1), g2 = grow(L2), g3 = grow(L3);

SDAnim.register({
  id: 'quadtree', title: 'Building and searching a quadtree', w: 480, h: 320, init: init,
  steps: [
    { cap: 'A quadtree starts as one node, the <b>root</b>, covering the whole map. It holds all 11 businesses, but a leaf may hold at most 4 here (the notes use 100).', set: {} },
    { cap: '11 &gt; 4, so the root splits into <b>exactly four children</b>. NW, SW and SE are now small enough and stop as leaves; <b>NE holds 7</b>, still too many.',
      set: { v1:g1.v, h1:g1.h, hot:{ x:160, y:20, w:140, h:140 }, status:{ text:'NW 1   NE 7\nSW 1   SE 2' } } },
    { cap: 'Only NE splits again. Its south-west child sits in the dense downtown and still holds 5, so it must split too.',
      set: { v2:g2.v, h2:g2.h, hot:{ x:160, y:90, w:70, h:70 }, status:{ text:'NE-sw: 5 > 4' } } },
    { cap: 'Now every leaf holds &le; 4. Crowded areas get deep, tiny leaves; empty areas keep big ones. The tree lives in memory and is built at server startup in O(n log n).',
      set: { v3:g3.v, h3:g3.h, hot:{ opacity:0 }, status:{ text:'all leaves ≤ 4', color:'oliveD' } } },
    { cap: 'A user (blue) wants the <b>3 nearest</b> businesses. Walk down from the root, always taking the quadrant that contains the user, until you reach a <b>leaf</b>.',
      set: { user:{ r:7, opacity:1 }, leafHi:{ x:195, y:90, w:35, h:35, opacity:.5 }, status:{ text:'root → NE →\nNE-sw → leaf', color:'blue' } } },
    { cap: 'That leaf holds only <b>1</b> business, fewer than the 3 we asked for.',
      set: { d9:{ fill:'gold', stroke:'ink', sw:1.5 }, status:{ text:'want 3\nleaf has 1', color:'rust' } } },
    { cap: 'Not enough, so also search the <b>neighbouring leaves</b>. Here the three adjacent sibling leaves add 4 more candidates.',
      set: { nbr:{ opacity:1 }, d7:{ fill:'gold', stroke:'ink', sw:1.5 }, d8:{ fill:'gold', stroke:'ink', sw:1.5 }, d10:{ fill:'gold', stroke:'ink', sw:1.5 }, d11:{ fill:'gold', stroke:'ink', sw:1.5 }, status:{ text:'+4 neighbours\n= 5 candidates', color:'ink' } } },
    { cap: 'Rank the candidates by distance and return the closest 3. Quadtrees adapt to density and handle <b>k-nearest</b> queries well, which a fixed-size geohash grid cannot.',
      set: { d9:{ fill:'olive', r:7 }, d8:{ fill:'olive', r:7 }, d11:{ fill:'olive', r:7 }, d7:{ fill:'mute', stroke:'none' }, d10:{ fill:'mute', stroke:'none' }, status:{ text:'3 nearest\nreturned', color:'oliveD' } } }
  ]
});
})();
