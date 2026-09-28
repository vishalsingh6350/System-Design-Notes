(function(){
/* Trie from the notes' cached-trie example: best 35, bet 29, bee 20, be 15, buy 14, beer 10. */
var N = {
  root:[196, 34, 'root'], b:[196, 92, 'b'],
  be:[124, 150, 'be:15'], bu:[268, 150, 'bu'],
  bee:[52, 208, 'bee:20'], bes:[124, 208, 'bes'], bet:[196, 208, 'bet:29'], buy:[268, 208, 'buy:14'],
  beer:[52, 266, 'beer:10'], best:[124, 266, 'best:35']
};
var QUERY = { be:1, bee:1, bet:1, buy:1, beer:1, best:1 };
var EDGES = [['root','b'], ['b','be'], ['b','bu'], ['be','bee'], ['be','bes'], ['be','bet'], ['bu','buy'], ['bee','beer'], ['bes','best']];
var SUB_B = ['be','bu','bee','bes','bet','buy','beer','best'];
/* padded with no-break spaces so the mono columns line up (SVG collapses normal spaces) */
function list(rows){ return rows.map(function(r){ var w = r.split(' '); return w[0] + new Array(7 - w[0].length).join(' ') + w[1]; }).join('\n'); }
var LIST_B = list(['best 35', 'bet 29', 'bee 20', 'be 15', 'buy 14']);
var LIST_BE = list(['best 35', 'bet 29', 'bee 20', 'be 15', 'beer 10']);

var init = {};
EDGES.forEach(function(e){
  var p = N[e[0]], c = N[e[1]];
  init['e_' + e[1]] = { type:'line', x:p[0], y:p[1] + 14, x2:c[0], y2:c[1] - 14, stroke:'mute', sw:1.8 };
});
Object.keys(N).forEach(function(k){
  var n = N[k];
  init[k] = { type:'rect', x:n[0] - 32, y:n[1] - 14, w:64, h:28, rx:6, fill:'white', stroke: QUERY[k] ? 'olive' : 'ink', sw: QUERY[k] ? 2.2 : 1.5,
    label:n[2], lfont:'mono', lsize:12, lweight:600, lcolor: k === 'root' ? 'mute' : 'ink' };
});
init.ring = { type:'rect', x:N.root[0] - 38, y:N.root[1] - 20, w:76, h:40, rx:10, fill:'none', stroke:'gold', sw:2.5, dash:true, opacity:0 };
init.search = { type:'rect', x:316, y:20, w:152, h:34, rx:6, fill:'white', stroke:'ink', label:'|', lfont:'mono', lsize:16, lweight:400 };
init.listTxt = { type:'text', x:392, y:76, text:'cached at node "b"', size:12, font:'mono', color:'soft', opacity:0 };
init.panel = { type:'rect', x:316, y:88, w:152, h:124, rx:8, fill:'paper', stroke:'gold', sw:2, dash:true, label:LIST_B, lfont:'mono', lsize:14, lweight:400, opacity:0 };
init.stat = { type:'text', x:392, y:250, text:'', size:13, font:'mono' };

function path(){ var o = {}; for(var i = 0; i < arguments.length; i++){ var k = arguments[i]; o[k] = { fill:'goldL', stroke:'gold' }; o['e_' + k] = { stroke:'gold', sw:3 }; } return o; }
function ringAt(k){ return { x:N[k][0] - 38, y:N[k][1] - 20, opacity:1 }; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }
function subtree(fill, stroke){ var o = {}; SUB_B.forEach(function(k){ o[k] = { fill:fill }; o['e_' + k] = { stroke:stroke }; }); return o; }

SDAnim.register({
  id: 'trie-topk', title: 'Typing a prefix into a trie with cached top-k', w: 480, h: 296, init: init,
  steps: [
    { cap: 'A trie built from last week&rsquo;s query counts. Each node is a prefix; green-edged nodes are complete queries with their frequency, e.g. <code>best:35</code>.', set: {} },
    { cap: 'The user types <b>b</b>. Step one of any lookup: walk from the root, one edge per letter, to the <b>prefix node</b>.', set: merge(path('b'), { root:{ fill:'goldL', stroke:'gold' }, ring:ringAt('b'), search:{ label:'b|' }, stat:{ text:'find node "b":\n1 hop' } }) },
    { cap: 'A plain trie would now <b>traverse the whole subtree</b> under b, collect every query and sort by frequency. For a popular prefix that is millions of nodes, per keystroke.', set: merge(subtree('blueL', 'blue'), { stat:{ text:'naive: visit 8\nnodes, then sort', color:'rust' } }) },
    { cap: 'The fix: at build time, <b>cache the top-k list in every node</b>. Node b already holds its top 5, so the answer is read, not computed.', set: merge(subtree('white', 'mute'), { panel:{ opacity:1 }, listTxt:{ opacity:1 }, stat:{ text:'cached: read 1\nlist, no walk', color:'oliveD' } }) },
    { cap: 'Types <b>e</b>: one more edge to be, read its list. <code>buy</code> drops out and <code>beer</code> comes in, because each list covers only that node&rsquo;s subtree.', set: merge(path('be'), { ring:ringAt('be'), search:{ label:'be|' }, listTxt:{ text:'cached at node "be"' }, panel:{ label:LIST_BE }, stat:{ text:'2 hops + 1 read', color:'oliveD' } }) },
    { cap: 'Types <b>s</b>: node bes has a single completion, <code>best: 35</code>. The cost grows with prefix length (capped around 50 characters), not with how many queries share it.', set: merge(path('bes'), { ring:ringAt('bes'), search:{ label:'bes|' }, listTxt:{ text:'cached at node "bes"' }, panel:{ label:list(['best 35']) }, stat:{ text:'3 hops + 1 read' } }) },
    { cap: 'The price is memory and update cost: <code>best: 35</code> is copied into the lists of b, be and bes. Changing one count touches every ancestor, so the trie is rebuilt weekly.', set: { ring:{ opacity:0 }, best:{ fill:'goldL', stroke:'gold', sw:2.5 }, e_best:{ stroke:'gold', sw:3 }, stat:{ text:'best:35 is copied\ninto 3 lists', color:'ink' } } },
    { cap: 'Takeaway: find the prefix node, return its <b>cached top-k</b>. No subtree walk, no sort, so each keystroke is a quick lookup well inside the 100 ms budget.', set: { ring:ringAt('bes'), best:{ fill:'white', stroke:'olive', sw:2.2 }, e_best:{ stroke:'mute', sw:1.8 }, stat:{ text:'a lookup,\nnot a search', color:'oliveD' } } }
  ]
});
})();
