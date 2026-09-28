(function(){
/* request dots start hidden inside the Users box, queue inside the LB, then land on a server */
var Q = [207, 229, 251, 273], QY = 144, LY = 218;
function dot(){ return { type:'circle', x:240, y:30, r:8, fill:'blue', opacity:0 }; }
var init = {
  users: { type:'rect', x:190, y:12, w:100, h:40, fill:'blueL', stroke:'blue', label:'Users' },
  pubArrow: { type:'arrow', x:240, y:54, x2:240, y2:98, stroke:'ink' },
  pubTxt: { type:'text', x:300, y:76, text:'public IP 88.88.88.1', size:13, font:'mono', color:'soft', anchor:'start' },
  lb: { type:'rect', x:150, y:100, w:180, h:62, fill:'tint', stroke:'olive', sw:2 },
  lbTxt: { type:'text', x:240, y:117, text:'Load balancer', size:14, weight:600 },
  a1: { type:'arrow', x:200, y:162, x2:100, y2:232, stroke:'line', sw:2 },
  a2: { type:'arrow', x:280, y:162, x2:380, y2:232, stroke:'line', sw:2 },
  a3: { type:'arrow', x:240, y:162, x2:240, y2:232, stroke:'line', sw:2, opacity:0 },
  s1: { type:'rect', x:28, y:236, w:120, h:50, label:'Server 1', lsize:14 },
  s2: { type:'rect', x:332, y:236, w:120, h:50, label:'Server 2', lsize:14 },
  s3: { type:'rect', x:180, y:236, w:120, h:50, fill:'oliveL', stroke:'olive', label:'Server 3', lsize:14, opacity:0 },
  ip1: { type:'text', x:88, y:302, text:'10.0.0.1', size:13, font:'mono', color:'soft' },
  ip2: { type:'text', x:392, y:302, text:'10.0.0.2', size:13, font:'mono', color:'soft' },
  ip3: { type:'text', x:240, y:302, text:'10.0.0.3', size:13, font:'mono', color:'soft', opacity:0 }
};
['A', 'B', 'C'].forEach(function(b){ for(var i = 1; i <= 4; i++) init[b + i] = dot(); });

function arrive(b){ var s = {}; for(var i = 1; i <= 4; i++) s[b + i] = { x:Q[i - 1], y:QY, opacity:1 }; return s; }
function land(b, xs){ var s = {}; xs.forEach(function(x, i){ s[b + (i + 1)] = { x:x, y:LY }; }); return s; }
function absorb(b){ var s = {}; for(var i = 1; i <= 4; i++) s[b + i] = { y:246, r:4, opacity:0 }; return s; }
function merge(){ var o = {}; for(var i = 0; i < arguments.length; i++) for(var k in arguments[i]) o[k] = arguments[i][k]; return o; }

SDAnim.register({
  id: 'lb-failover', title: 'Load balancer: failover and scaling out', w: 480, h: 320, init: init,
  steps: [
    { cap: 'Users never reach a web server directly. They talk only to the load balancer&rsquo;s <b>public IP</b>; the servers sit behind it on <b>private IPs</b>.', set: {} },
    { cap: 'Four requests arrive, all addressed to the same public IP. The load balancer receives every one of them.', set: merge(arrive('A'), { pubArrow:{ stroke:'blue' } }) },
    { cap: 'The balancer <b>spreads</b> them across the pool over the private network: two to Server 1, two to Server 2.', set: merge(land('A', [70, 92, 388, 410]), { a1:{ stroke:'blue' }, a2:{ stroke:'blue' }, pubArrow:{ stroke:'ink' } }) },
    { cap: 'Server 1 goes <b>offline</b>. The load balancer stops routing to it.', set: merge(absorb('A'), { s1:{ fill:'rustL', stroke:'rust', label:'Server 1\noffline', lcolor:'rust' }, ip1:{ color:'mute' }, a1:{ stroke:'rust', dash:true, opacity:.35 }, a2:{ stroke:'line' } }) },
    { cap: 'The next four requests hit the same public IP. Users see no change, because the address they use never changed.', set: merge(arrive('B'), { pubArrow:{ stroke:'blue' } }) },
    { cap: '<b>Redundancy</b>: all traffic is routed to Server 2. The site stays up, but one server now carries the whole load.', set: merge(land('B', [388, 410, 432, 454]), { a2:{ stroke:'blue', sw:3 }, s2:{ fill:'goldL', stroke:'gold' }, pubArrow:{ stroke:'ink' } }) },
    { cap: '<b>Scalability</b>: a new healthy Server 3 joins the pool on its own private IP. Nothing changes for clients.', set: merge(absorb('B'), { s3:{ opacity:1 }, ip3:{ opacity:1 }, a3:{ opacity:1 }, a2:{ stroke:'line', sw:2 }, s2:{ fill:'white', stroke:'ink' } }) },
    { cap: 'More requests arrive at the balancer&hellip;', set: merge(arrive('C'), { pubArrow:{ stroke:'blue' } }) },
    { cap: '&hellip;and load is balanced again across Servers 2 and 3. Clients only know the LB&rsquo;s address, so servers can fail or join behind it freely.', set: merge(land('C', [224, 256, 388, 410]), { a2:{ stroke:'blue' }, a3:{ stroke:'blue' }, pubArrow:{ stroke:'ink' } }) }
  ]
});
})();
