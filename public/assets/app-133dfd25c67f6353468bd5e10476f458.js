
if(parent.document.getElementsByTagName("iframe")[0]) {
	 parent.document.getElementsByTagName("iframe")[0].setAttribute('style', 'height: 700px !important');
 }

var margin = {top: 20, right: 0, bottom: 0, left: 0},
width = 880,
height = 580 - margin.top - margin.bottom,
formatNumber = d3.format(",d"),
transitioning;

/* create x and y scales */
var x = d3.scale.linear()
.domain([0, width])
.range([0, width]);

var y = d3.scale.linear()
.domain([0, height])
.range([0, height]);

var treemap = d3.layout.treemap()
.children(function(d, depth) { return depth ? null : d.children; })
.sort(function(a, b) { return a.value - b.value; })
.ratio(height / width * 0.5 * (1 + Math.sqrt(5)))
.round(false);

/* create svg */
var svg = d3.select("#chart").append("svg")
.attr("width", width + margin.left + margin.right)
.attr("height", height + margin.bottom + margin.top)
.style("margin-left", -margin.left + "px")
.style("margin.right", -margin.right + "px")
.append("g")
.attr("transform", "translate(" + margin.left + "," + margin.top + ")")
.style("shape-rendering", "crispEdges");

var color = d3.scale.category20c();

var grandparent = svg.append("g")
.attr("class", "grandparent");

grandparent.append("rect")
.attr("y", -margin.top)
.attr("width", width)
.attr("height", margin.top);

grandparent.append("text")
.attr("x", 6)
.attr("y", 6 - margin.top)
.attr("dy", ".75em");

/* load in data, display root */
d3.json("/visu.json", function(root) {

initialize(root);
accumulate(root);
layout(root);
display(root);

function initialize(root) {
	root.x = root.y = 0;
	root.dx = width;
	root.dy = height;
	root.depth = 0;
}

// Aggregate the values for internal nodes. This is normally done by the
// treemap layout, but not here because of the custom implementation.
function accumulate(d) {
	return d.children
	? d.value = d.children.reduce(function(p, v) { return p + accumulate(v); }, 0)
	: d.value;
	}

// Compute the treemap layout recursively such that each group of siblings
// uses the same size (1×1) rather than the dimensions of the parent cell.
// This optimizes the layout for the current zoom state. Note that a wrapper
// object is created for the parent node for each group of siblings so that
// the parent’s dimensions are not discarded as we recurse. Since each group
// of sibling was laid out in 1×1, we must rescale to fit using absolute
// coordinates. This lets us use a viewport to zoom.
function layout(d) {
	if (d.children) {
	treemap.nodes({children: d.children});
	d.children.forEach(function(c) {
	c.x = d.x + c.x * d.dx;
	c.y = d.y + c.y * d.dy;
	c.dx *= d.dx;
	c.dy *= d.dy;
	c.parent = d;
	layout(c);
	});
	}
}

/* display shows the treemap and writes the embedded transition function */
function display(d) {
	/* create grandparent bar at top */
	grandparent
		.datum(d.parent)
		.on("click", transition)
		.select("text")
		.text(name(d));

	var g1 = svg.insert("g", ".grandparent")
		.datum(d)
		.attr("class", "depth");

	/* add in data */
	var g = g1.selectAll("g")
		.data(d.children)
		.enter().append("g");
		
	/* transition on child click */
	g.filter(function(d) { return d.children; })
		.classed("children", true)
		.on("click", transition);

	/* write children rectangles */
	g.selectAll(".child")
		.data(function(d) { return d.children || [d]; })
		.enter().append("rect")
		   .attr("class", "child")
		   .call(rect)
		   .append("title")
		   .text(function(d) { return d.name + " " + formatNumber(d.size); });
		   

	/* write parent rectangle */
	g.append("rect")
		.attr("class", "parent")
		.call(rect)
		/* open new window based on the json's URL value for leaf nodes */
		/* Chrome displays this on top */
		.on("click", function(d) { 
			if(!d.children){
				window.open(d.url); 
			}
		})
		.append("title")
		.text(function(d) { return d.name + " " + formatNumber(d.size); }); /*should be d.value*/
		

	/* Adding a foreign object instead of a text object, allows for text wrapping */
	g.append("foreignObject")
		.call(rect)
		/* open new window based on the json's URL value for leaf nodes */
		/* Firefox displays this on top */
		.on("click", function(d) { 
			if(!d.children){
				window.open(d.url); 
		}
	})
		.attr("class","foreignobj")
		.append("xhtml:div") 
		.attr("dy", ".75em")
		.html(function(d) { return d.name; 
		})
		.attr("class","textdiv"); //textdiv class allows us to style the text easily with CSS

	/* create transition function for transitions */
	function transition(d) {
		if (transitioning || !d) return;
		transitioning = true;

		var g2 = display(d),
		t1 = g1.transition().duration(750),
		t2 = g2.transition().duration(750);

		// Update the domain only after entering new elements.
		x.domain([d.x, d.x + d.dx]);
		y.domain([d.y, d.y + d.dy]);

		// Enable anti-aliasing during the transition.
		svg.style("shape-rendering", null);

		// Draw child nodes on top of parent nodes.
		svg.selectAll(".depth").sort(function(a, b) { return a.depth - b.depth; });

		// Fade-in entering text.
		g2.selectAll("text").style("fill-opacity", 0);
		g2.selectAll("foreignObject div").style("display", "none"); /*added*/

		// Transition to the new view.
		t1.selectAll("text").call(text).style("fill-opacity", 0);
		t2.selectAll("text").call(text).style("fill-opacity", 1);
		t1.selectAll("rect").call(rect);
		t2.selectAll("rect").call(rect);

		t1.selectAll(".textdiv").style("display", "none"); /* added */
		t1.selectAll(".foreignobj").call(foreign); /* added */
		t2.selectAll(".textdiv").style("display", "block"); /* added */
		t2.selectAll(".foreignobj").call(foreign); /* added */ 

		// Remove the old node when the transition is finished.
		t1.remove().each("end", function() {
		svg.style("shape-rendering", "crispEdges");
		transitioning = false;
		});

	}//endfunc transition

	return g;
}//endfunc display

function text(text) {
	text.attr("x", function(d) { return x(d.x) + 6; })
	.attr("y", function(d) { return y(d.y) + 6; });
}



function rect(rect) {
	rect.attr("x", function(d) { return x(d.x); })
	.attr("y", function(d) { return y(d.y); })
	.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
	.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); })
	.style("background", function(d) { return d.parent ? color(d.name) : null; });
}

function foreign(foreign){ /* added */
	foreign.attr("x", function(d) { return x(d.x); })
	.attr("y", function(d) { return y(d.y); })
	.attr("width", function(d) { return x(d.x + d.dx) - x(d.x); })
	.attr("height", function(d) { return y(d.y + d.dy) - y(d.y); });
}

function name(d) {
	return d.parent
	? name(d.parent) + " > " + d.name
	: d.name;
	}
});
(function() {
  $(document).ready(function() {
    var selected;
    $('.logo').click(function() {
      return location.href = '/';
    });
    $(document).ajaxStart(function() {
      return $(".loading").fadeIn(250);
    });
    $(document).ajaxComplete(function() {
      return $(".loading").fadeOut(250);
    });
    selected = $("li>a[href='" + location.pathname + "']")[0];
    return $(selected).parent().addClass('active');
  });

}).call(this);
(function(){function Jd(a){for(var b=-1,c=a.length,d=[];++b<c;)d.push(a[b]);return d}function S(){}function T(a){return a}function Kd(){return this}function Rb(){return!0}function C(a){return"function"===typeof a?a:function(){return a}}function Ld(a,b,c){return function(){var d=c.apply(b,arguments);return arguments.length?a:d}}function Va(a){return null!=a&&!isNaN(a)}function Md(a){return a.length}function Nd(a){return null==a}function Wa(){}function Sb(a){function b(){for(var b=c,d=-1,g=b.length,
h;++d<g;)(h=b[d].on)&&h.apply(this,arguments);return a}var c=[],d=new S;b.on=function(b,f){var g=d.get(b),h;if(2>arguments.length)return g&&g.on;g&&(g.on=null,c=c.slice(0,h=c.indexOf(g)).concat(c.slice(h+1)),d.remove(b));f&&c.push(d.set(b,{on:f}));return a};return b}function Tb(a,b){return b-(a?1+Math.floor(Math.log(a+Math.pow(10,1+Math.floor(Math.log(a)/Math.LN10)-b))/Math.LN10):1)}function Od(a){return a+""}function Ub(a){for(var b=a.lastIndexOf("."),c=0<=b?a.substring(b):(b=a.length,""),d=[];0<
b;)d.push(a.substring(b-=3,b+3));return d.reverse().join(",")+c}function Pd(a){return function(b){return 0>=b?0:1<=b?1:a(b)}}function Vb(a){return function(b){return 1-a(1-b)}}function Wb(a){return function(b){return 0.5*(0.5>b?a(2*b):2-a(2-2*b))}}function Xa(a){return a}function Ya(a){return function(b){return Math.pow(b,a)}}function Qd(a){return 1-Math.cos(a*Math.PI/2)}function Rd(a){return Math.pow(2,10*(a-1))}function Sd(a){return 1-Math.sqrt(1-a*a)}function Td(a){return a<1/2.75?7.5625*a*a:a<
2/2.75?7.5625*(a-=1.5/2.75)*a+0.75:a<2.5/2.75?7.5625*(a-=2.25/2.75)*a+0.9375:7.5625*(a-=2.625/2.75)*a+0.984375}function J(){d3.event.stopPropagation();d3.event.preventDefault()}function Xb(){for(var a=d3.event,b;b=a.sourceEvent;)a=b;return a}function Za(a){for(var b=new Wa,c=0,d=arguments.length;++c<d;)b[arguments[c]]=Sb(b);b.of=function(c,d){return function(g){try{var h=g.sourceEvent=d3.event;g.target=a;d3.event=g;b[g.type].apply(c,d)}finally{d3.event=h}}};return b}function Yb(a){var b=[a.a,a.b],
c=[a.c,a.d],d=Zb(b),e=b[0]*c[0]+b[1]*c[1],f=-e;c[0]+=f*b[0];c[1]+=f*b[1];f=Zb(c)||0;b[0]*c[1]<c[0]*b[1]&&(b[0]*=-1,b[1]*=-1,d*=-1,e*=-1);this.rotate=(d?Math.atan2(b[1],b[0]):Math.atan2(-c[0],c[1]))*$b;this.translate=[a.e,a.f];this.scale=[d,f];this.skew=f?Math.atan2(e,f)*$b:0}function Zb(a){var b=Math.sqrt(a[0]*a[0]+a[1]*a[1]);b&&(a[0]/=b,a[1]/=b);return b}function fa(a){return"transform"==a?d3.interpolateTransform:d3.interpolate}function Ud(a,b){b=b-(a=+a)?1/(b-a):0;return function(c){return(c-a)*
b}}function Vd(a,b){b=b-(a=+a)?1/(b-a):0;return function(c){return Math.max(0,Math.min(1,(c-a)*b))}}function Z(){}function O(a,b,c){return new $a(a,b,c)}function $a(a,b,c){this.r=a;this.g=b;this.b=c}function $(a){return 16>a?"0"+Math.max(0,a).toString(16):Math.min(255,a).toString(16)}function ab(a,b,c){var d=0,e=0,f=0,g,h;if(g=/([a-z]+)\((.*)\)/i.exec(a))switch(h=g[2].split(","),g[1]){case "hsl":return c(parseFloat(h[0]),parseFloat(h[1])/100,parseFloat(h[2])/100);case "rgb":return b(bb(h[0]),bb(h[1]),
bb(h[2]))}if(c=ra.get(a))return b(c.r,c.g,c.b);null!=a&&"#"===a.charAt(0)&&(4===a.length?(d=a.charAt(1),d+=d,e=a.charAt(2),e+=e,f=a.charAt(3),f+=f):7===a.length&&(d=a.substring(1,3),e=a.substring(3,5),f=a.substring(5,7)),d=parseInt(d,16),e=parseInt(e,16),f=parseInt(f,16));return b(d,e,f)}function ac(a,b,c){var d=Math.min(a/=255,b/=255,c/=255),e=Math.max(a,b,c),f=e-d,g=(e+d)/2;f?(d=0.5>g?f/(e+d):f/(2-e-d),a=60*(a==e?(b-c)/f+(b<c?6:0):b==e?(c-a)/f+2:(a-b)/f+4)):d=a=0;return aa(a,d,g)}function bc(a,
b,c){a=cb(a);b=cb(b);c=cb(c);var d=db((0.4124564*a+0.3575761*b+0.1804375*c)/cc),e=db((0.2126729*a+0.7151522*b+0.072175*c)/dc);a=db((0.0193339*a+0.119192*b+0.9503041*c)/ec);return ba(116*e-16,500*(d-e),200*(e-a))}function cb(a){return 0.04045>=(a/=255)?a/12.92:Math.pow((a+0.055)/1.055,2.4)}function bb(a){var b=parseFloat(a);return"%"===a.charAt(a.length-1)?Math.round(2.55*b):b}function aa(a,b,c){return new eb(a,b,c)}function eb(a,b,c){this.h=a;this.s=b;this.l=c}function sa(a,b,c){function d(a){360<
a?a-=360:0>a&&(a+=360);return 60>a?e+(f-e)*a/60:180>a?f:240>a?e+(f-e)*(240-a)/60:e}var e,f;a%=360;0>a&&(a+=360);b=0>b?0:1<b?1:b;c=0>c?0:1<c?1:c;f=0.5>=c?c*(1+b):c+b-c*b;e=2*c-f;return O(Math.round(255*d(a+120)),Math.round(255*d(a)),Math.round(255*d(a-120)))}function ga(a,b,c){return new ta(a,b,c)}function ta(a,b,c){this.h=a;this.c=b;this.l=c}function fb(a,b,c){return ba(c,Math.cos(a*=Math.PI/180)*b,Math.sin(a)*b)}function ba(a,b,c){return new ua(a,b,c)}function ua(a,b,c){this.l=a;this.a=b;this.b=
c}function fc(a,b,c){a=(a+16)/116;c=a-c/200;b=gb(a+b/500)*cc;a=gb(a)*dc;c=gb(c)*ec;return O(hb(3.2404542*b-1.5371385*a-0.4985314*c),hb(-0.969266*b+1.8760108*a+0.041556*c),hb(0.0556434*b-0.2040259*a+1.0572252*c))}function gc(a,b,c){return ga(Math.atan2(c,b)/Math.PI*180,Math.sqrt(b*b+c*c),a)}function gb(a){return 0.206893034<a?a*a*a:(a-4/29)/7.787037}function db(a){return 0.008856<a?Math.pow(a,1/3):7.787037*a+4/29}function hb(a){return Math.round(255*(0.00304>=a?12.92*a:1.055*Math.pow(a,1/2.4)-0.055))}
function P(a){ib(a,z);return a}function hc(a){return function(){return va(a,this)}}function ic(a){return function(){return jc(a,this)}}function kc(a,b){function c(){this.removeAttribute(a)}function d(){this.removeAttributeNS(a.space,a.local)}function e(){this.setAttribute(a,b)}function f(){this.setAttributeNS(a.space,a.local,b)}function g(){var c=b.apply(this,arguments);null==c?this.removeAttribute(a):this.setAttribute(a,c)}function h(){var c=b.apply(this,arguments);null==c?this.removeAttributeNS(a.space,
a.local):this.setAttributeNS(a.space,a.local,c)}a=d3.ns.qualify(a);return null==b?a.local?d:c:"function"===typeof b?a.local?h:g:a.local?f:e}function lc(a){return RegExp("(?:^|\\s+)"+d3.requote(a)+"(?:\\s+|$)","g")}function mc(a,b){function c(){for(var c=-1;++c<e;)a[c](this,b)}function d(){for(var c=-1,d=b.apply(this,arguments);++c<e;)a[c](this,d)}a=a.trim().split(/\s+/).map(Wd);var e=a.length;return"function"===typeof b?d:c}function Wd(a){var b=lc(a);return function(c,d){if(e=c.classList)return d?
e.add(a):e.remove(a);var e=c.className,f=null!=e.baseVal,g=f?e.baseVal:e;d?(b.lastIndex=0,b.test(g)||(g=(g+" "+a).trim().replace(/\s+/g," "),f?e.baseVal=g:c.className=g)):g&&(g=g.replace(b," ").trim().replace(/\s+/g," "),f?e.baseVal=g:c.className=g)}}function nc(a,b,c){function d(){this.style.removeProperty(a)}function e(){this.style.setProperty(a,b,c)}function f(){var d=b.apply(this,arguments);null==d?this.style.removeProperty(a):this.style.setProperty(a,d,c)}return null==b?d:"function"===typeof b?
f:e}function oc(a,b){function c(){delete this[a]}function d(){this[a]=b}function e(){var c=b.apply(this,arguments);null==c?delete this[a]:this[a]=c}return null==b?c:"function"===typeof b?e:d}function pc(a){return function(){return qc(this,a)}}function Xd(a){arguments.length||(a=d3.ascending);return function(b,c){return a(b&&b.__data__,c&&c.__data__)}}function rc(a,b,c){function d(){var b=this[f];b&&(this.removeEventListener(a,b,b.$),delete this[f])}function e(){function e(a){var c=d3.event;d3.event=
a;l[0]=g.__data__;try{b.apply(g,l)}finally{d3.event=c}}var g=this,l=arguments;d.call(this);this.addEventListener(a,this[f]=e,e.$=c);e._=b}var f="__on"+a,g=a.indexOf(".");0<g&&(a=a.substring(0,g));return b?e:d}function ha(a,b){for(var c=0,d=a.length;c<d;c++)for(var e=a[c],f=0,g=e.length,h;f<g;f++)(h=e[f])&&b(h,f,c);return a}function sc(a){ib(a,U);return a}function wa(a,b,c){ib(a,H);var d=new S,e=d3.dispatch("start","end"),f=xa;a.id=b;a.time=c;a.tween=function(b,c){if(2>arguments.length)return d.get(b);
null==c?d.remove(b):d.set(b,c);return a};a.ease=function(b){if(!arguments.length)return f;f="function"===typeof b?b:d3.ease.apply(d3,arguments);return a};a.each=function(b,c){if(2>arguments.length)return Yd.call(a,b);e.on(b,c);return a};d3.timer(function(g){return ha(a,function(a,k,l){function m(f){if(u.active>b)return q();u.active=b;d.forEach(function(b,c){(c=c.call(a,w,k))&&p.push(c)});e.start.call(a,w,k);n(f)||d3.timer(n,0,c);return 1}function n(c){if(u.active!==b)return q();c=(c-r)/t;for(var d=
f(c),g=p.length;0<g;)p[--g].call(a,d);if(1<=c)return q(),V=b,e.end.call(a,w,k),V=0,1}function q(){--u.count||delete a.__transition__;return 1}var p=[],r=a.delay,t=a.duration,u=(a=a.node).__transition__||(a.__transition__={active:0,count:0}),w=a.__data__;++u.count;r<=g?m(g):d3.timer(m,r,c)})},0,c);return a}function Yd(a){var b=V,c=xa,d=ya,e=za;V=this.id;xa=this.ease();ha(this,function(b,c,d){ya=b.delay;za=b.duration;a.call(b=b.node,b.__data__,c,d)});V=b;xa=c;ya=d;za=e;return this}function Zd(a,b,c){return""!=
c&&ia}function jb(){for(var a,b=Date.now(),c=ca;c;)a=b-c.then,a>=c.delay&&(c.flush=c.callback(a)),c=c.next;a=tc()-b;24<a?(isFinite(a)&&(clearTimeout(Aa),Aa=setTimeout(jb,a)),Ba=0):(Ba=1,uc(jb))}function tc(){for(var a=null,b=ca,c=Infinity;b;)b.flush?(delete kb[b.callback.id],b=a?a.next=b.next:ca=b.next):(c=Math.min(c,b.then+b.delay),b=(a=b).next);return c}function vc(a,b){var c=a.ownerSVGElement||a;if(c.createSVGPoint){var d=c.createSVGPoint();if(0>lb&&(window.scrollX||window.scrollY)){var c=d3.select(document.body).append("svg").style("position",
"absolute").style("top",0).style("left",0),e=c[0][0].getScreenCTM();lb=!(e.f||e.e);c.remove()}lb?(d.x=b.pageX,d.y=b.pageY):(d.x=b.clientX,d.y=b.clientY);d=d.matrixTransform(a.getScreenCTM().inverse());return[d.x,d.y]}c=a.getBoundingClientRect();return[b.clientX-c.left-a.clientLeft,b.clientY-c.top-a.clientTop]}function ja(a){var b=a[0];a=a[a.length-1];return b<a?[b,a]:[a,b]}function Ca(a){return a.rangeExtent?a.rangeExtent():ja(a.range())}function Da(a,b){var c=0,d=a.length-1,e=a[c],f=a[d],g;f<e&&
(g=c,c=d,d=g,g=e,e=f,f=g);if(b=b(f-e))a[c]=b.floor(e),a[d]=b.ceil(f);return a}function $d(){return Math}function wc(a,b,c,d){function e(){var e=2<Math.min(a.length,b.length)?ae:be,l=d?Vd:Ud;g=e(a,b,l,c);h=e(b,a,l,d3.interpolate);return f}function f(a){return g(a)}var g,h;f.invert=function(a){return h(a)};f.domain=function(b){if(!arguments.length)return a;a=b.map(Number);return e()};f.range=function(a){if(!arguments.length)return b;b=a;return e()};f.rangeRound=function(a){return f.range(a).interpolate(d3.interpolateRound)};
f.clamp=function(a){if(!arguments.length)return d;d=a;return e()};f.interpolate=function(a){if(!arguments.length)return c;c=a;return e()};f.ticks=function(b){return mb(a,b)};f.tickFormat=function(b){return nb(a,b)};f.nice=function(){Da(a,xc);return e()};f.copy=function(){return wc(a,b,c,d)};return e()}function yc(a,b){return d3.rebind(a,b,"range","rangeRound","interpolate","clamp")}function xc(a){return(a=Math.pow(10,Math.round(Math.log(a)/Math.LN10)-1))&&{floor:function(b){return Math.floor(b/a)*
a},ceil:function(b){return Math.ceil(b/a)*a}}}function zc(a,b){var c=ja(a),d=c[1]-c[0],e=Math.pow(10,Math.floor(Math.log(d/b)/Math.LN10)),d=b/d*e;0.15>=d?e*=10:0.35>=d?e*=5:0.75>=d&&(e*=2);c[0]=Math.ceil(c[0]/e)*e;c[1]=Math.floor(c[1]/e)*e+0.5*e;c[2]=e;return c}function mb(a,b){return d3.range.apply(d3,zc(a,b))}function nb(a,b){return d3.format(",."+Math.max(0,-Math.floor(Math.log(zc(a,b)[2])/Math.LN10+0.01))+"f")}function be(a,b,c,d){var e=c(a[0],a[1]),f=d(b[0],b[1]);return function(a){return f(e(a))}}
function ae(a,b,c,d){var e=[],f=[],g=0,h=Math.min(a.length,b.length)-1;a[h]<a[0]&&(a=a.slice().reverse(),b=b.slice().reverse());for(;++g<=h;)e.push(c(a[g-1],a[g])),f.push(d(b[g-1],b[g]));return function(b){var c=d3.bisect(a,b,1,h)-1;return f[c](e[c](b))}}function Ac(a,b){function c(c){return a(b(c))}var d=b.pow;c.invert=function(b){return d(a.invert(b))};c.domain=function(e){if(!arguments.length)return a.domain().map(d);b=0>e[0]?Ea:ob;d=b.pow;a.domain(e.map(b));return c};c.nice=function(){a.domain(Da(a.domain(),
$d));return c};c.ticks=function(){var c=ja(a.domain()),f=[];if(c.every(isFinite)){var g=Math.floor(c[0]),h=Math.ceil(c[1]),k=d(c[0]),c=d(c[1]);if(b===Ea)for(f.push(d(g));g++<h;)for(var l=9;0<l;l--)f.push(d(g)*l);else{for(;g<h;g++)for(l=1;10>l;l++)f.push(d(g)*l);f.push(d(g))}for(g=0;f[g]<k;g++);for(h=f.length;f[h-1]>c;h--);f=f.slice(g,h)}return f};c.tickFormat=function(a,f){2>arguments.length&&(f=ce);if(1>arguments.length)return f;var g=Math.max(0.1,a/c.ticks().length),h=b===Ea?(k=-1E-12,Math.floor):
(k=1E-12,Math.ceil),k;return function(a){return a/d(h(b(a)+k))<=g?f(a):""}};c.copy=function(){return Ac(a.copy(),b)};return yc(c,a)}function ob(a){return Math.log(0>a?0:a)/Math.LN10}function Ea(a){return-Math.log(0<a?0:-a)/Math.LN10}function Bc(a,b){function c(b){return a(d(b))}var d=Fa(b),e=Fa(1/b);c.invert=function(b){return e(a.invert(b))};c.domain=function(b){if(!arguments.length)return a.domain().map(e);a.domain(b.map(d));return c};c.ticks=function(a){return mb(c.domain(),a)};c.tickFormat=function(a){return nb(c.domain(),
a)};c.nice=function(){return c.domain(Da(c.domain(),xc))};c.exponent=function(a){if(!arguments.length)return b;var g=c.domain();d=Fa(b=a);e=Fa(1/b);return c.domain(g)};c.copy=function(){return Bc(a.copy(),b)};return yc(c,a)}function Fa(a){return function(b){return 0>b?-Math.pow(-b,a):Math.pow(b,a)}}function Cc(a,b){function c(b){return f[((e.get(b)||e.set(b,a.push(b)))-1)%f.length]}function d(b,c){return d3.range(a.length).map(function(a){return b+c*a})}var e,f,g;c.domain=function(d){if(!arguments.length)return a;
a=[];e=new S;for(var f=-1,g=d.length,m;++f<g;)e.has(m=d[f])||e.set(m,a.push(m));return c[b.t].apply(c,b.a)};c.range=function(a){if(!arguments.length)return f;f=a;g=0;b={t:"range",a:arguments};return c};c.rangePoints=function(e,k){2>arguments.length&&(k=0);var l=e[0],m=e[1],n=(m-l)/(Math.max(1,a.length-1)+k);f=d(2>a.length?(l+m)/2:l+n*k/2,n);g=0;b={t:"rangePoints",a:arguments};return c};c.rangeBands=function(e,k,l){2>arguments.length&&(k=0);3>arguments.length&&(l=k);var m=e[1]<e[0],n=e[m-0],q=(e[1-
m]-n)/(a.length-k+2*l);f=d(n+q*l,q);m&&f.reverse();g=q*(1-k);b={t:"rangeBands",a:arguments};return c};c.rangeRoundBands=function(e,k,l){2>arguments.length&&(k=0);3>arguments.length&&(l=k);var m=e[1]<e[0],n=e[m-0],q=e[1-m],p=Math.floor((q-n)/(a.length-k+2*l));f=d(n+Math.round((q-n-(a.length-k)*p)/2),p);m&&f.reverse();g=Math.round(p*(1-k));b={t:"rangeRoundBands",a:arguments};return c};c.rangeBand=function(){return g};c.rangeExtent=function(){return ja(b.a[0])};c.copy=function(){return Cc(a,b)};return c.domain(a)}
function Dc(a,b){function c(){var c=0,g=b.length;for(e=[];++c<g;)e[c-1]=d3.quantile(a,c/g);return d}function d(a){return isNaN(a=+a)?NaN:b[d3.bisect(e,a)]}var e;d.domain=function(b){if(!arguments.length)return a;a=b.filter(function(a){return!isNaN(a)}).sort(d3.ascending);return c()};d.range=function(a){if(!arguments.length)return b;b=a;return c()};d.quantiles=function(){return e};d.copy=function(){return Dc(a,b)};return c()}function Ec(a,b,c){function d(b){return c[Math.max(0,Math.min(g,Math.floor(f*
(b-a))))]}function e(){f=c.length/(b-a);g=c.length-1;return d}var f,g;d.domain=function(c){if(!arguments.length)return[a,b];a=+c[0];b=+c[c.length-1];return e()};d.range=function(a){if(!arguments.length)return c;c=a;return e()};d.copy=function(){return Ec(a,b,c)};return e()}function Fc(a,b){function c(c){return b[d3.bisect(a,c)]}c.domain=function(b){if(!arguments.length)return a;a=b;return c};c.range=function(a){if(!arguments.length)return b;b=a;return c};c.copy=function(){return Fc(a,b)};return c}
function Gc(a){function b(a){return+a}b.invert=b;b.domain=b.range=function(c){if(!arguments.length)return a;a=c.map(b);return b};b.ticks=function(b){return mb(a,b)};b.tickFormat=function(b){return nb(a,b)};b.copy=function(){return Gc(a)};return b}function de(a){return a.innerRadius}function ee(a){return a.outerRadius}function Hc(a){return a.startAngle}function Ic(a){return a.endAngle}function Jc(a){function b(b){function g(){m.push("M",f(a(n),h))}for(var m=[],n=[],q=-1,p=b.length,r,t=C(c),u=C(d);++q<
p;)e.call(this,r=b[q],q)?n.push([+t.call(this,r,q),+u.call(this,r,q)]):n.length&&(g(),n=[]);n.length&&g();return m.length?m.join(""):null}var c=pb,d=Kc,e=Rb,f=E,g=f.key,h=0.7;b.x=function(a){if(!arguments.length)return c;c=a;return b};b.y=function(a){if(!arguments.length)return d;d=a;return b};b.defined=function(a){if(!arguments.length)return e;e=a;return b};b.interpolate=function(a){if(!arguments.length)return g;g="function"===typeof a?f=a:(f=qb.get(a)||E).key;return b};b.tension=function(a){if(!arguments.length)return h;
h=a;return b};return b}function pb(a){return a[0]}function Kc(a){return a[1]}function E(a){return a.join("L")}function rb(a){for(var b=0,c=a.length,d=a[0],e=[d[0],",",d[1]];++b<c;)e.push("V",(d=a[b])[1],"H",d[0]);return e.join("")}function sb(a){for(var b=0,c=a.length,d=a[0],e=[d[0],",",d[1]];++b<c;)e.push("H",(d=a[b])[0],"V",d[1]);return e.join("")}function Ga(a,b){if(1>b.length||a.length!=b.length&&a.length!=b.length+2)return E(a);var c=a.length!=b.length,d="",e=a[0],f=a[1],g=b[0],h=g,k=1;c&&(d+=
"Q"+(f[0]-2*g[0]/3)+","+(f[1]-2*g[1]/3)+","+f[0]+","+f[1],e=a[1],k=2);if(1<b.length)for(h=b[1],f=a[k],k++,d+="C"+(e[0]+g[0])+","+(e[1]+g[1])+","+(f[0]-h[0])+","+(f[1]-h[1])+","+f[0]+","+f[1],e=2;e<b.length;e++,k++)f=a[k],h=b[e],d+="S"+(f[0]-h[0])+","+(f[1]-h[1])+","+f[0]+","+f[1];c&&(c=a[k],d+="Q"+(f[0]+2*h[0]/3)+","+(f[1]+2*h[1]/3)+","+c[0]+","+c[1]);return d}function tb(a,b){for(var c=[],d=(1-b)/2,e,f=a[0],g=a[1],h=1,k=a.length;++h<k;)e=f,f=g,g=a[h],c.push([d*(g[0]-e[0]),d*(g[1]-e[1])]);return c}
function Lc(a){if(3>a.length)return E(a);var b=1,c=a.length,d=a[0],e=d[0],f=d[1],g=[e,e,e,(d=a[1])[0]],h=[f,f,f,d[1]],e=[e,",",f];for(ka(e,g,h);++b<c;)d=a[b],g.shift(),g.push(d[0]),h.shift(),h.push(d[1]),ka(e,g,h);for(b=-1;2>++b;)g.shift(),g.push(d[0]),h.shift(),h.push(d[1]),ka(e,g,h);return e.join("")}function N(a,b){return a[0]*b[0]+a[1]*b[1]+a[2]*b[2]+a[3]*b[3]}function ka(a,b,c){a.push("C",N(Mc,b),",",N(Mc,c),",",N(Nc,b),",",N(Nc,c),",",N(da,b),",",N(da,c))}function ub(a,b){return(b[1]-a[1])/
(b[0]-a[0])}function Oc(a){for(var b,c=-1,d=a.length,e,f;++c<d;)b=a[c],e=b[0],f=b[1]+W,b[0]=e*Math.cos(f),b[1]=e*Math.sin(f);return a}function Pc(a){function b(b){function k(){r.push("M",h(a(u),n),m,l(a(t.reverse()),n),"Z")}for(var r=[],t=[],u=[],w=-1,x=b.length,y,D=C(c),B=C(e),A=c===d?function(){return v}:C(d),F=e===f?function(){return M}:C(f),v,M;++w<x;)g.call(this,y=b[w],w)?(t.push([v=+D.call(this,y,w),M=+B.call(this,y,w)]),u.push([+A.call(this,y,w),+F.call(this,y,w)])):t.length&&(k(),t=[],u=[]);
t.length&&k();return r.length?r.join(""):null}var c=pb,d=pb,e=0,f=Kc,g=Rb,h=E,k=h.key,l=h,m="L",n=0.7;b.x=function(a){if(!arguments.length)return d;c=d=a;return b};b.x0=function(a){if(!arguments.length)return c;c=a;return b};b.x1=function(a){if(!arguments.length)return d;d=a;return b};b.y=function(a){if(!arguments.length)return f;e=f=a;return b};b.y0=function(a){if(!arguments.length)return e;e=a;return b};b.y1=function(a){if(!arguments.length)return f;f=a;return b};b.defined=function(a){if(!arguments.length)return g;
g=a;return b};b.interpolate=function(a){if(!arguments.length)return k;k="function"===typeof a?h=a:(h=qb.get(a)||E).key;l=h.reverse||h;m=h.closed?"M":"L";return b};b.tension=function(a){if(!arguments.length)return n;n=a;return b};return b}function Qc(a){return a.source}function Rc(a){return a.target}function fe(a){return a.radius}function Sc(a){return[a.x,a.y]}function ge(a){return function(){var b=a.apply(this,arguments),c=b[0],b=b[1]+W;return[c*Math.cos(b),c*Math.sin(b)]}}function he(){return 64}
function ie(){return"circle"}function Tc(a){a=Math.sqrt(a/Math.PI);return"M0,"+a+"A"+a+","+a+" 0 1,1 0,"+-a+"A"+a+","+a+" 0 1,1 0,"+a+"Z"}function Uc(a,b){a.attr("transform",function(a){return"translate("+b(a)+",0)"})}function Vc(a,b){a.attr("transform",function(a){return"translate(0,"+b(a)+")"})}function je(a,b,c){d=[];if(c&&1<b.length){a=ja(a.domain());for(var d,e=-1,f=b.length,g=(b[1]-b[0])/++c,h,k;++e<f;)for(h=c;0<--h;)(k=+b[e]-h*g)>=a[0]&&d.push(k);--e;for(h=0;++h<c&&(k=+b[e]+h*g)<a[1];)d.push(k)}return d}
function ke(){la||(la=d3.select("body").append("div").style("visibility","hidden").style("top",0).style("height",0).style("width",0).style("overflow-y","scroll").append("div").style("height","2000px").node().parentNode);var a=d3.event,b;try{la.scrollTop=1E3,la.dispatchEvent(a),b=1E3-la.scrollTop}catch(c){b=a.wheelDelta||5*-a.detail}return b}function le(a){var b=a.source;a=a.target;var c;var d=a;if(b===d)c=b;else{c=Wc(b);for(var d=Wc(d),e=c.pop(),f=d.pop(),g=null;e===f;)g=e,e=c.pop(),f=d.pop();c=g}for(d=
[b];b!==c;)b=b.parent,d.push(b);for(b=d.length;a!==c;)d.splice(b,0,a),a=a.parent;return d}function Wc(a){for(var b=[],c=a.parent;null!=c;)b.push(a),a=c,c=c.parent;b.push(a);return b}function me(a){a.fixed|=2}function ne(a){a.fixed&=1}function oe(a){a.fixed|=4}function pe(a){a.fixed&=3}function Xc(a,b,c){var d=0,e=0;a.charge=0;if(!a.leaf)for(var f=a.nodes,g=f.length,h=-1,k;++h<g;)k=f[h],null!=k&&(Xc(k,b,c),a.charge+=k.charge,d+=k.charge*k.cx,e+=k.charge*k.cy);a.point&&(a.leaf||(a.point.x+=Math.random()-
0.5,a.point.y+=Math.random()-0.5),b*=c[a.point.index],a.charge+=a.pointCharge=b,d+=b*a.point.x,e+=b*a.point.y);a.cx=d/a.charge;a.cy=e/a.charge}function qe(a){return 20}function re(a){return 1}function se(a){return a.x}function te(a){return a.y}function ue(a,b,c){a.y0=b;a.y=c}function vb(a){return d3.range(a.length)}function wb(a){var b=-1;a=a[0].length;for(var c=[];++b<a;)c[b]=0;return c}function ve(a){for(var b=1,c=0,d=a[0][1],e,f=a.length;b<f;++b)(e=a[b][1])>d&&(c=b,d=e);return c}function we(a){return a.reduce(xe,
0)}function xe(a,b){return a+b[1]}function ye(a,b){return Yc(a,Math.ceil(Math.log(b.length)/Math.LN2+1))}function Yc(a,b){for(var c=-1,d=+a[0],e=(a[1]-d)/b,f=[];++c<=b;)f[c]=e*c+d;return f}function ze(a){return[d3.min(a),d3.max(a)]}function ma(a,b){d3.rebind(a,b,"sort","children","value");a.links=Ae;a.nodes=function(b){xb=!0;return(a.nodes=a)(b)};return a}function Be(a){return a.children}function Ce(a){return a.value}function De(a,b){return b.value-a.value}function Ae(a){return d3.merge(a.map(function(a){return(a.children||
[]).map(function(c){return{source:a,target:c}})}))}function Ee(a,b){return a.value-b.value}function yb(a,b){var c=a._pack_next;a._pack_next=b;b._pack_prev=a;b._pack_next=c;c._pack_prev=b}function Zc(a,b){a._pack_next=b;b._pack_prev=a}function $c(a,b){var c=b.x-a.x,d=b.y-a.y,e=a.r+b.r;return 0.001<e*e-c*c-d*d}function ad(a){function b(a){d=Math.min(a.x-a.r,d);e=Math.max(a.x+a.r,e);f=Math.min(a.y-a.r,f);g=Math.max(a.y+a.r,g)}if((c=a.children)&&(p=c.length)){var c,d=Infinity,e=-Infinity,f=Infinity,g=
-Infinity,h,k,l,m,n,q,p;c.forEach(Fe);h=c[0];h.x=-h.r;h.y=0;b(h);if(1<p&&(k=c[1],k.x=k.r,k.y=0,b(k),2<p))for(l=c[2],bd(h,k,l),b(l),yb(h,l),h._pack_prev=l,yb(l,k),k=h._pack_next,m=3;m<p;m++){bd(h,k,l=c[m]);var r=0,t=1,u=1;for(n=k._pack_next;n!==k;n=n._pack_next,t++)if($c(n,l)){r=1;break}if(1==r)for(q=h._pack_prev;q!==n._pack_prev&&!$c(q,l);q=q._pack_prev,u++);r?(t<u||t==u&&k.r<h.r?Zc(h,k=n):Zc(h=q,k),m--):(yb(h,l),k=l,b(l))}h=(d+e)/2;k=(f+g)/2;for(m=n=0;m<p;m++)l=c[m],l.x-=h,l.y-=k,n=Math.max(n,l.r+
Math.sqrt(l.x*l.x+l.y*l.y));a.r=n;c.forEach(Ge)}}function Fe(a){a._pack_next=a._pack_prev=a}function Ge(a){delete a._pack_next;delete a._pack_prev}function cd(a,b,c,d){var e=a.children;a.x=b+=d*a.x;a.y=c+=d*a.y;a.r*=d;if(e){a=-1;for(var f=e.length;++a<f;)cd(e[a],b,c,d)}}function bd(a,b,c){var d=a.r+c.r,e=b.x-a.x,f=b.y-a.y;if(d&&(e||f)){var g=b.r+c.r,h=e*e+f*f,g=g*g,d=d*d;b=0.5+(d-g)/(2*h);g=Math.sqrt(Math.max(0,2*g*(d+h)-(d-=h)*d-g*g))/(2*h);c.x=a.x+b*e+g*f;c.y=a.y+b*f-g*e}else c.x=a.x+d,c.y=a.y}
function He(a){return 1+d3.max(a,function(a){return a.y})}function Ie(a){return a.reduce(function(a,c){return a+c.x},0)/a.length}function dd(a){var b=a.children;return b&&b.length?dd(b[0]):a}function ed(a){var b=a.children,c;return b&&(c=b.length)?ed(b[c-1]):a}function fd(a,b){return a.parent==b.parent?1:2}function zb(a){var b=a.children;return b&&b.length?b[0]:a._tree.thread}function Ab(a){var b=a.children,c;return b&&(c=b.length)?b[c-1]:a._tree.thread}function Ha(a,b){var c=a.children;if(c&&(e=
c.length))for(var d,e,f=-1;++f<e;)0<b(d=Ha(c[f],b),a)&&(a=d);return a}function Je(a,b){return a.x-b.x}function Ke(a,b){return b.x-a.x}function Le(a,b){return a.depth-b.depth}function Q(a,b){function c(a,e){var f=a.children;if(f&&(l=f.length))for(var g,h=null,k=-1,l;++k<l;)g=f[k],c(g,h),h=g;b(a,e)}c(a,null)}function Bb(a){return{x:a.x,y:a.y,dx:a.dx,dy:a.dy}}function gd(a,b){var c=a.x+b[3],d=a.y+b[0],e=a.dx-b[1]-b[3],f=a.dy-b[0]-b[2];0>e&&(c+=e/2,e=0);0>f&&(d+=f/2,f=0);return{x:c,y:d,dx:e,dy:f}}function hd(a,
b){function c(a,d){d3.text(a,b,function(a){d(a&&c.parse(a))})}function d(b){return b.map(e).join(a)}function e(a){return g.test(a)?'"'+a.replace(/\"/g,'""')+'"':a}var f=RegExp("\r\n|["+a+"\r\n]","g"),g=RegExp('["'+a+"\n]"),h=a.charCodeAt(0);c.parse=function(a){var b;return c.parseRows(a,function(a,c){if(c){for(var d={},e=-1,f=b.length;++e<f;)d[b[e]]=a[e];return d}b=a;return null})};c.parseRows=function(a,b){function c(){if(f.lastIndex>=a.length)return e;if(u)return u=!1,d;var b=f.lastIndex;if(34===
a.charCodeAt(b)){for(var g=b;g++<a.length;)if(34===a.charCodeAt(g)){if(34!==a.charCodeAt(g+1))break;g++}f.lastIndex=g+2;var l=a.charCodeAt(g+1);13===l?(u=!0,10===a.charCodeAt(g+2)&&f.lastIndex++):10===l&&(u=!0);return a.substring(b+1,g).replace(/""/g,'"')}if(g=f.exec(a))return u=g[0].charCodeAt(0)!==h,a.substring(b,g.index);f.lastIndex=a.length;return a.substring(b)}var d={},e={},g=[],r=0,t,u;for(f.lastIndex=0;(t=c())!==e;){for(var w=[];t!==d&&t!==e;)w.push(t),t=c();b&&!(w=b(w,r++))||g.push(w)}return g};
c.format=function(a){return a.map(d).join("\n")};return c}function Ia(a,b){return function(c){return c&&a.hasOwnProperty(c.type)?a[c.type](c):b}}function Cb(a){return"m0,"+a+"a"+a+","+a+" 0 1,1 0,"+-2*a+"a"+a+","+a+" 0 1,1 0,"+2*a+"z"}function Ja(a,b){if(id.hasOwnProperty(a.type))id[a.type](a,b)}function jd(a,b){for(var c=a.coordinates,d=0,e=c.length;d<e;d++)b.apply(null,c[d])}function Me(a){return a.source}function Ne(a){return a.target}function kd(){function a(a){var b=Math.sin(a*=p)*r,c=Math.sin(p-
a)*r;a=c*f+b*n;var d=c*g+b*q,b=c*e+b*m;return[Math.atan2(d,a)/s,Math.atan2(b,Math.sqrt(a*a+d*d))/s]}var b,c,d,e,f,g,h,k,l,m,n,q,p,r;a.distance=function(){null==p&&(r=1/Math.sin(p=Math.acos(Math.max(-1,Math.min(1,e*m+d*l*Math.cos(h-b))))));return p};a.source=function(h){var k=Math.cos(b=h[0]*s),n=Math.sin(b);d=Math.cos(c=h[1]*s);e=Math.sin(c);f=d*k;g=d*n;p=null;return a};a.target=function(b){var c=Math.cos(h=b[0]*s),d=Math.sin(h);l=Math.cos(k=b[1]*s);m=Math.sin(k);n=l*c;q=l*d;p=null;return a};return a}
function ld(a,b){var c=kd().source(a).target(b);c.distance();return c}function Oe(a,b,c,d){var e,f,g;a=d[a];e=a[0];f=a[1];a=d[b];b=a[0];g=a[1];a=d[c];return 0<(a[1]-f)*(b-e)-(g-f)*(a[0]-e)}function Db(a,b,c){return(c[0]-b[0])*(a[1]-b[1])<(c[1]-b[1])*(a[0]-b[0])}function md(a,b,c,d){var e=a[0],f=c[0];a=a[1];var g=c[1];c=b[0]-e;var h=d[0]-f;b=b[1]-a;d=d[1]-g;f=(h*(a-g)-d*(e-f))/(d*c-h*b);return[e+f*c,a+f*b]}function nd(a,b){var c=a.map(function(a,b){return{index:b,x:a[0],y:a[1]}}).sort(function(a,b){return a.y<
b.y?-1:a.y>b.y?1:a.x<b.x?-1:a.x>b.x?1:0}),d=null,e={list:[],leftEnd:null,rightEnd:null,init:function(){e.leftEnd=e.createHalfEdge(null,"l");e.rightEnd=e.createHalfEdge(null,"l");e.leftEnd.r=e.rightEnd;e.rightEnd.l=e.leftEnd;e.list.unshift(e.leftEnd,e.rightEnd)},createHalfEdge:function(a,b){return{edge:a,side:b,vertex:null,l:null,r:null}},insert:function(a,b){b.l=a;b.r=a.r;a.r.l=b;a.r=b},leftBound:function(a){var b=e.leftEnd;do b=b.r;while(b!=e.rightEnd&&f.rightOf(b,a));return b=b.l},del:function(a){a.l.r=
a.r;a.r.l=a.l;a.edge=null},right:function(a){return a.r},left:function(a){return a.l},leftRegion:function(a){return null==a.edge?d:a.edge.region[a.side]},rightRegion:function(a){return null==a.edge?d:a.edge.region[Eb[a.side]]}},f={bisect:function(a,b){var c={region:{l:a,r:b},ep:{l:null,r:null}},d=b.x-a.x,e=b.y-a.y;c.c=a.x*d+a.y*e+0.5*(d*d+e*e);(0<d?d:-d)>(0<e?e:-e)?(c.a=1,c.b=e/d,c.c/=d):(c.b=1,c.a=d/e,c.c/=e);return c},intersect:function(a,b){var c=a.edge,d=b.edge;if(!c||!d||c.region.r==d.region.r)return null;
var e=c.a*d.b-c.b*d.a;if(1E-10>Math.abs(e))return null;var f=(c.c*d.b-d.c*c.b)/e,e=(d.c*c.a-c.c*d.a)/e,g=c.region.r,h=d.region.r;g.y<h.y||g.y==h.y&&g.x<h.x?g=a:(g=b,c=d);return(c=f>=c.region.r.x)&&"l"===g.side||!c&&"r"===g.side?null:{x:f,y:e}},rightOf:function(a,b){var c=a.edge,d=c.region.r,e=b.x>d.x;if(e&&"l"===a.side)return 1;if(!e&&"r"===a.side)return 0;if(1===c.a){var f=b.y-d.y,g=b.x-d.x,h=0,k=0;!e&&0>c.b||e&&0<=c.b?k=h=f>=c.b*g:(k=b.x+b.y*c.b>c.c,0>c.b&&(k=!k),k||(h=1));h||(d=d.x-c.region.l.x,
k=c.b*(g*g-f*f)<d*f*(1+2*g/d+c.b*c.b),0>c.b&&(k=!k))}else g=c.c-c.a*b.x,c=b.y-g,f=b.x-d.x,d=g-d.y,k=c*c>f*f+d*d;return"l"===a.side?k:!k},endPoint:function(a,c,d){a.ep[c]=d;a.ep[Eb[c]]&&b(a)},distance:function(a,b){var c=a.x-b.x,d=a.y-b.y;return Math.sqrt(c*c+d*d)}},g={list:[],insert:function(a,b,c){a.vertex=b;a.ystar=b.y+c;c=0;for(var d=g.list,e=d.length;c<e;c++){var f=d[c];if(!(a.ystar>f.ystar||a.ystar==f.ystar&&b.x>f.vertex.x))break}d.splice(c,0,a)},del:function(a){for(var b=0,c=g.list,d=c.length;b<
d&&c[b]!=a;++b);c.splice(b,1)},empty:function(){return 0===g.list.length},nextEvent:function(a){for(var b=0,c=g.list,d=c.length;b<d;++b)if(c[b]==a)return c[b+1];return null},min:function(){var a=g.list[0];return{x:a.vertex.x,y:a.ystar}},extractMin:function(){return g.list.shift()}};e.init();for(var d=c.shift(),h=c.shift(),k,l,m,n,q,p,r,t,u;;)if(g.empty()||(k=g.min()),h&&(g.empty()||h.y<k.y||h.y==k.y&&h.x<k.x)){l=e.leftBound(h);m=e.right(l);r=e.rightRegion(l);u=f.bisect(r,h);p=e.createHalfEdge(u,"l");
e.insert(l,p);if(t=f.intersect(l,p))g.del(l),g.insert(l,t,f.distance(t,h));l=p;p=e.createHalfEdge(u,"r");e.insert(l,p);(t=f.intersect(p,m))&&g.insert(p,t,f.distance(t,h));h=c.shift()}else if(g.empty())break;else{l=g.extractMin();n=e.left(l);m=e.right(l);q=e.right(m);r=e.leftRegion(l);p=e.rightRegion(m);t=l.vertex;f.endPoint(l.edge,l.side,t);f.endPoint(m.edge,m.side,t);e.del(l);g.del(m);e.del(m);l="l";r.y>p.y&&(l=r,r=p,p=l,l="r");u=f.bisect(r,p);p=e.createHalfEdge(u,l);e.insert(n,p);f.endPoint(u,Eb[l],
t);if(t=f.intersect(n,p))g.del(n),g.insert(n,t,f.distance(t,r));(t=f.intersect(p,q))&&g.insert(p,t,f.distance(t,r))}for(l=e.right(e.leftEnd);l!=e.rightEnd;l=e.right(l))b(l.edge)}function na(a,b,c,d,e,f){if(!a(b,c,d,e,f)){var g=0.5*(c+e),h=0.5*(d+f);b=b.nodes;b[0]&&na(a,b[0],c,d,g,h);b[1]&&na(a,b[1],g,d,e,h);b[2]&&na(a,b[2],c,h,g,f);b[3]&&na(a,b[3],g,h,e,f)}}function Pe(a){return{x:a[0],y:a[1]}}function X(){this._=new Date(1<arguments.length?Date.UTC.apply(this,arguments):arguments[0])}function od(a){return a.substring(0,
3)}function Ka(a,b,c,d){for(var e,f=0,g=b.length,h=c.length;f<g;){if(d>=h)return-1;e=b.charCodeAt(f++);if(37==e){if(e=Qe[b.charAt(f++)],!e||0>(d=e(a,c,d)))return-1}else if(e!=c.charCodeAt(d++))return-1}return d}function La(a){return RegExp("^(?:"+a.map(d3.requote).join("|")+")","i")}function pd(a){for(var b=new S,c=-1,d=a.length;++c<d;)b.set(a[c].toLowerCase(),c);return b}function qd(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+2)))?(a.d=+b[0],c+b[0].length):-1}function rd(a,b,c){I.lastIndex=
0;return(b=I.exec(b.substring(c,c+2)))?(a.H=+b[0],c+b[0].length):-1}function Fb(a){return a.toISOString()}function Y(a,b,c){function d(b){var c=a(b),d=f(c,1);return b-c<d-b?c:d}function e(c){b(c=a(new G(c-1)),1);return c}function f(a,c){b(a=new G(+a),c);return a}function g(a,d,f){a=e(a);var g=[];if(1<f)for(;a<d;)c(a)%f||g.push(new Date(+a)),b(a,1);else for(;a<d;)g.push(new Date(+a)),b(a,1);return g}a.floor=a;a.round=d;a.ceil=e;a.offset=f;a.range=g;var h=a.utc=Ma(a);h.floor=h;h.round=Ma(d);h.ceil=
Ma(e);h.offset=Ma(f);h.range=function(a,b,c){try{G=X;var d=new X;d._=a;return g(d,b,c)}finally{G=Date}};return a}function Ma(a){return function(b,c){try{G=X;var d=new X;d._=b;return a(d,c)._}finally{G=Date}}}function Gb(a,b,c){function d(b){return a(b)}d.invert=function(b){return Hb(a.invert(b))};d.domain=function(b){if(!arguments.length)return a.domain().map(Hb);a.domain(b);return d};d.nice=function(a){return d.domain(Da(d.domain(),function(){return a}))};d.ticks=function(c,f){var g,h=d.domain();
g=h[0];h=h[h.length-1];g=g<h?[g,h]:[h,g];if("function"!==typeof c){var h=(g[1]-g[0])/c,k=d3.bisect(Na,h);if(k==Na.length)return b.year(g,c);if(!k)return a.ticks(c).map(Hb);Math.log(h/Na[k-1])<Math.log(Na[k]/h)&&--k;c=b[k];f=c[1];c=c[0].range}return c(g[0],new Date(+g[1]+1),f)};d.tickFormat=function(){return c};d.copy=function(){return Gb(a.copy(),b,c)};return d3.rebind(d,a,"range","rangeRound","interpolate","clamp")}function Hb(a){return new Date(a)}function sd(a){return function(b){for(var c=a.length-
1,d=a[c];!d[1](b);)d=a[--c];return d[0](b)}}function Ib(a){var b=new Date(a,0,1);b.setFullYear(a);return b}function Re(a){var b=a.getFullYear(),c=Ib(b),d=Ib(b+1);return b+(a-c)/(d-c)}function Jb(a){var b=new Date(Date.UTC(a,0,1));b.setUTCFullYear(a);return b}function Se(a){var b=a.getUTCFullYear(),c=Jb(b),d=Jb(b+1);return b+(a-c)/(d-c)}Date.now||(Date.now=function(){return+new Date});try{document.createElement("div").style.setProperty("opacity",0,"")}catch(Bf){var td=CSSStyleDeclaration.prototype,
Te=td.setProperty;td.setProperty=function(a,b,c){Te.call(this,a,b+"",c)}}d3={version:"2.10.3"};var oa=function(a){return Array.prototype.slice.call(a)};try{oa(document.documentElement.childNodes)[0].nodeType}catch(Cf){oa=Jd}var ib=[].__proto__?function(a,b){a.__proto__=b}:function(a,b){for(var c in b)a[c]=b[c]};d3.map=function(a){var b=new S,c;for(c in a)b.set(c,a[c]);return b};(function(a,b){try{for(var c in b)Object.defineProperty(a.prototype,c,{value:b[c],enumerable:!1})}catch(d){a.prototype=b}})(S,
{has:function(a){return pa+a in this},get:function(a){return this[pa+a]},set:function(a,b){return this[pa+a]=b},remove:function(a){a=pa+a;return a in this&&delete this[a]},keys:function(){var a=[];this.forEach(function(b){a.push(b)});return a},values:function(){var a=[];this.forEach(function(b,c){a.push(c)});return a},entries:function(){var a=[];this.forEach(function(b,c){a.push({key:b,value:c})});return a},forEach:function(a){for(var b in this)b.charCodeAt(0)===Ue&&a.call(this,b.substring(1),this[b])}});
var pa="\x00",Ue=pa.charCodeAt(0);d3.functor=C;d3.rebind=function(a,b){for(var c=1,d=arguments.length,e;++c<d;)a[e=arguments[c]]=Ld(a,b,b[e]);return a};d3.ascending=function(a,b){return a<b?-1:a>b?1:a>=b?0:NaN};d3.descending=function(a,b){return b<a?-1:b>a?1:b>=a?0:NaN};d3.mean=function(a,b){var c=a.length,d,e=0,f=-1,g=0;if(1===arguments.length)for(;++f<c;)Va(d=a[f])&&(e+=(d-e)/++g);else for(;++f<c;)Va(d=b.call(a,a[f],f))&&(e+=(d-e)/++g);return g?e:void 0};d3.median=function(a,b){1<arguments.length&&
(a=a.map(b));a=a.filter(Va);return a.length?d3.quantile(a.sort(d3.ascending),0.5):void 0};d3.min=function(a,b){var c=-1,d=a.length,e,f;if(1===arguments.length){for(;++c<d&&(null==(e=a[c])||e!=e);)e=void 0;for(;++c<d;)null!=(f=a[c])&&e>f&&(e=f)}else{for(;++c<d&&(null==(e=b.call(a,a[c],c))||e!=e);)e=void 0;for(;++c<d;)null!=(f=b.call(a,a[c],c))&&e>f&&(e=f)}return e};d3.max=function(a,b){var c=-1,d=a.length,e,f;if(1===arguments.length){for(;++c<d&&(null==(e=a[c])||e!=e);)e=void 0;for(;++c<d;)null!=(f=
a[c])&&f>e&&(e=f)}else{for(;++c<d&&(null==(e=b.call(a,a[c],c))||e!=e);)e=void 0;for(;++c<d;)null!=(f=b.call(a,a[c],c))&&f>e&&(e=f)}return e};d3.extent=function(a,b){var c=-1,d=a.length,e,f,g;if(1===arguments.length){for(;++c<d&&(null==(e=g=a[c])||e!=e);)e=g=void 0;for(;++c<d;)null!=(f=a[c])&&(e>f&&(e=f),g<f&&(g=f))}else{for(;++c<d&&(null==(e=g=b.call(a,a[c],c))||e!=e);)e=void 0;for(;++c<d;)null!=(f=b.call(a,a[c],c))&&(e>f&&(e=f),g<f&&(g=f))}return[e,g]};d3.random={normal:function(a,b){var c=arguments.length;
2>c&&(b=1);1>c&&(a=0);return function(){var c,e;do c=2*Math.random()-1,e=2*Math.random()-1,e=c*c+e*e;while(!e||1<e);return a+b*c*Math.sqrt(-2*Math.log(e)/e)}},logNormal:function(a,b){var c=arguments.length;2>c&&(b=1);1>c&&(a=0);var d=d3.random.normal();return function(){return Math.exp(a+b*d())}},irwinHall:function(a){return function(){for(var b=0,c=0;c<a;c++)b+=Math.random();return b/a}}};d3.sum=function(a,b){var c=0,d=a.length,e,f=-1;if(1===arguments.length)for(;++f<d;)isNaN(e=+a[f])||(c+=e);else for(;++f<
d;)isNaN(e=+b.call(a,a[f],f))||(c+=e);return c};d3.quantile=function(a,b){var c=(a.length-1)*b+1,d=Math.floor(c),e=a[d-1];return(c-=d)?e+c*(a[d]-e):e};d3.transpose=function(a){return d3.zip.apply(d3,a)};d3.zip=function(){if(!(e=arguments.length))return[];for(var a=-1,b=d3.min(arguments,Md),c=Array(b);++a<b;)for(var d=-1,e,f=c[a]=Array(e);++d<e;)f[d]=arguments[d][a];return c};d3.bisector=function(a){return{left:function(b,c,d,e){3>arguments.length&&(d=0);4>arguments.length&&(e=b.length);for(;d<e;){var f=
d+e>>>1;a.call(b,b[f],f)<c?d=f+1:e=f}return d},right:function(b,c,d,e){3>arguments.length&&(d=0);4>arguments.length&&(e=b.length);for(;d<e;){var f=d+e>>>1;c<a.call(b,b[f],f)?e=f:d=f+1}return d}}};var ud=d3.bisector(function(a){return a});d3.bisectLeft=ud.left;d3.bisect=d3.bisectRight=ud.right;d3.first=function(a,b){var c=0,d=a.length,e=a[0],f;1===arguments.length&&(b=d3.ascending);for(;++c<d;)0<b.call(a,e,f=a[c])&&(e=f);return e};d3.last=function(a,b){var c=0,d=a.length,e=a[0],f;1===arguments.length&&
(b=d3.ascending);for(;++c<d;)0>=b.call(a,e,f=a[c])&&(e=f);return e};d3.nest=function(){function a(b,e){if(e>=d.length)return g?g.call(c,b):f?b.sort(f):b;for(var l=-1,m=b.length,n=d[e++],q,p,r=new S,t,u={};++l<m;)(t=r.get(q=n(p=b[l])))?t.push(p):r.set(q,[p]);r.forEach(function(b,c){u[b]=a(c,e)});return u}function b(a,c){if(c>=d.length)return a;var f=[],g=e[c++],n;for(n in a)f.push({key:n,values:b(a[n],c)});g&&f.sort(function(a,b){return g(a.key,b.key)});return f}var c={},d=[],e=[],f,g;c.map=function(b){return a(b,
0)};c.entries=function(c){return b(a(c,0),0)};c.key=function(a){d.push(a);return c};c.sortKeys=function(a){e[d.length-1]=a;return c};c.sortValues=function(a){f=a;return c};c.rollup=function(a){g=a;return c};return c};d3.keys=function(a){var b=[],c;for(c in a)b.push(c);return b};d3.values=function(a){var b=[],c;for(c in a)b.push(a[c]);return b};d3.entries=function(a){var b=[],c;for(c in a)b.push({key:c,value:a[c]});return b};d3.permute=function(a,b){for(var c=[],d=-1,e=b.length;++d<e;)c[d]=a[b[d]];
return c};d3.merge=function(a){return Array.prototype.concat.apply([],a)};d3.split=function(a,b){var c=[],d=[],e,f=-1,g=a.length;for(2>arguments.length&&(b=Nd);++f<g;)b.call(d,e=a[f],f)?d=[]:(d.length||c.push(d),d.push(e));return c};d3.range=function(a,b,c){3>arguments.length&&(c=1,2>arguments.length&&(b=a,a=0));if(Infinity===(b-a)/c)throw Error("infinite range");var d=[],e;e=Math.abs(c);for(var f=1;e*f%1;)f*=10;e=f;var f=-1,g;a*=e;b*=e;c*=e;if(0>c)for(;(g=a+c*++f)>b;)d.push(g/e);else for(;(g=a+c*
++f)<b;)d.push(g/e);return d};d3.requote=function(a){return a.replace(Ve,"\\$&")};var Ve=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;d3.round=function(a,b){return b?Math.round(a*(b=Math.pow(10,b)))/b:Math.round(a)};d3.xhr=function(a,b,c){var d=new XMLHttpRequest;3>arguments.length?(c=b,b=null):b&&d.overrideMimeType&&d.overrideMimeType(b);d.open("GET",a,!0);b&&d.setRequestHeader("Accept",b);d.onreadystatechange=function(){if(4===d.readyState){var a=d.status;c(!a&&d.response||200<=a&&300>a||304===a?d:null)}};
d.send(null)};d3.text=function(a,b,c){3>arguments.length&&(c=b,b=null);d3.xhr(a,b,function(a){c(a&&a.responseText)})};d3.json=function(a,b){d3.text(a,"application/json",function(a){b(a?JSON.parse(a):null)})};d3.html=function(a,b){d3.text(a,"text/html",function(a){if(null!=a){var d=document.createRange();d.selectNode(document.body);a=d.createContextualFragment(a)}b(a)})};d3.xml=function(a,b,c){3>arguments.length&&(c=b,b=null);d3.xhr(a,b,function(a){c(a&&a.responseXML)})};var Kb={svg:"http://www.w3.org/2000/svg",
xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};d3.ns={prefix:Kb,qualify:function(a){var b=a.indexOf(":"),c=a;0<=b&&(c=a.substring(0,b),a=a.substring(b+1));return Kb.hasOwnProperty(c)?{space:Kb[c],local:a}:a}};d3.dispatch=function(){for(var a=new Wa,b=-1,c=arguments.length;++b<c;)a[arguments[b]]=Sb(a);return a};Wa.prototype.on=function(a,b){var c=a.indexOf("."),d="";0<c&&(d=a.substring(c+1),
a=a.substring(0,c));return 2>arguments.length?this[a].on(d):this[a].on(d,b)};d3.format=function(a){a=We.exec(a);var b=a[1]||" ",c=a[3]||"",d=a[5],e=+a[6],f=a[7],g=a[8],h=a[9],k=1,l="",m=!1;g&&(g=+g.substring(1));d&&(b="0",f&&(e-=Math.floor((e-1)/4)));switch(h){case "n":f=!0;h="g";break;case "%":k=100;l="%";h="f";break;case "p":k=100;l="%";h="r";break;case "d":m=!0;g=0;break;case "s":k=-1,h="r"}"r"!=h||g||(h="g");h=Xe.get(h)||Od;return function(a){if(m&&a%1)return"";var q=0>a&&(a=-a)?"-":c;if(0>k){var p=
d3.formatPrefix(a,g);a=p.scale(a);l=p.symbol}else a*=k;a=h(a,g);d?(p=a.length+q.length,p<e&&(a=Array(e-p+1).join(b)+a),f&&(a=Ub(a)),a=q+a):(f&&(a=Ub(a)),a=q+a,p=a.length,p<e&&(a=Array(e-p+1).join(b)+a));return a+l}};var We=/(?:([^{])?([<>=^]))?([+\- ])?(#)?(0)?([0-9]+)?(,)?(\.[0-9]+)?([a-zA-Z%])?/,Xe=d3.map({g:function(a,b){return a.toPrecision(b)},e:function(a,b){return a.toExponential(b)},f:function(a,b){return a.toFixed(b)},r:function(a,b){return d3.round(a,b=Tb(a,b)).toFixed(Math.max(0,Math.min(20,
b)))}}),Ye="y z a f p n \u00ce\u00bc m  k M G T P E Z Y".split(" ").map(function(a,b){var c=Math.pow(10,3*Math.abs(8-b));return{scale:8<b?function(a){return a/c}:function(a){return a*c},symbol:a}});d3.formatPrefix=function(a,b){var c=0;a&&(0>a&&(a*=-1),b&&(a=d3.round(a,Tb(a,b))),c=1+Math.floor(1E-12+Math.log(a)/Math.LN10),c=Math.max(-24,Math.min(24,3*Math.floor((0>=c?c+1:c-1)/3))));return Ye[8+c/3]};var Ze=Ya(2),$e=Ya(3),vd=function(){return Xa},af=d3.map({linear:vd,poly:Ya,quad:function(){return Ze},
cubic:function(){return $e},sin:function(){return Qd},exp:function(){return Rd},circle:function(){return Sd},elastic:function(a,b){var c;2>arguments.length&&(b=0.45);1>arguments.length?(a=1,c=b/4):c=b/(2*Math.PI)*Math.asin(1/a);return function(d){return 1+a*Math.pow(2,10*-d)*Math.sin(2*(d-c)*Math.PI/b)}},back:function(a){a||(a=1.70158);return function(b){return b*b*((a+1)*b-a)}},bounce:function(){return Td}}),bf=d3.map({"in":Xa,out:Vb,"in-out":Wb,"out-in":function(a){return Wb(Vb(a))}});d3.ease=function(a){var b=
a.indexOf("-"),c=0<=b?a.substring(0,b):a,b=0<=b?a.substring(b+1):"in",c=af.get(c)||vd,b=bf.get(b)||Xa;return Pd(b(c.apply(null,Array.prototype.slice.call(arguments,1))))};d3.event=null;d3.transform=function(a){var b=document.createElementNS(d3.ns.prefix.svg,"g");return(d3.transform=function(a){b.setAttribute("transform",a);a=b.transform.baseVal.consolidate();return new Yb(a?a.matrix:cf)})(a)};Yb.prototype.toString=function(){return"translate("+this.translate+")rotate("+this.rotate+")skewX("+this.skew+
")scale("+this.scale+")"};var $b=180/Math.PI,cf={a:1,b:0,c:0,d:1,e:0,f:0};d3.interpolate=function(a,b){for(var c=d3.interpolators.length,d;0<=--c&&!(d=d3.interpolators[c](a,b)););return d};d3.interpolateNumber=function(a,b){b-=a;return function(c){return a+b*c}};d3.interpolateRound=function(a,b){b-=a;return function(c){return Math.round(a+b*c)}};d3.interpolateString=function(a,b){var c,d,e=0,f=[],g=[],h,k;for(d=Oa.lastIndex=0;c=Oa.exec(b);++d)c.index&&f.push(b.substring(e,c.index)),g.push({i:f.length,
x:c[0]}),f.push(null),e=Oa.lastIndex;e<b.length&&f.push(b.substring(e));d=0;for(h=g.length;(c=Oa.exec(a))&&d<h;++d)if(k=g[d],k.x==c[0]){if(k.i)if(null==f[k.i+1])for(f[k.i-1]+=k.x,f.splice(k.i,1),c=d+1;c<h;++c)g[c].i--;else for(f[k.i-1]+=k.x+f[k.i+1],f.splice(k.i,2),c=d+1;c<h;++c)g[c].i-=2;else if(null==f[k.i+1])f[k.i]=k.x;else for(f[k.i]=k.x+f[k.i+1],f.splice(k.i+1,1),c=d+1;c<h;++c)g[c].i--;g.splice(d,1);h--;d--}else k.x=d3.interpolateNumber(parseFloat(c[0]),parseFloat(k.x));for(;d<h;)k=g.pop(),null==
f[k.i+1]?f[k.i]=k.x:(f[k.i]=k.x+f[k.i+1],f.splice(k.i+1,1)),h--;return 1===f.length?null==f[0]?g[0].x:function(){return b}:function(a){for(d=0;d<h;++d)f[(k=g[d]).i]=k.x(a);return f.join("")}};d3.interpolateTransform=function(a,b){var c=[],d=[],e,f=d3.transform(a),g=d3.transform(b),h=f.translate,k=g.translate,l=f.rotate,m=g.rotate,n=f.skew,q=g.skew,f=f.scale,g=g.scale;h[0]!=k[0]||h[1]!=k[1]?(c.push("translate(",null,",",null,")"),d.push({i:1,x:d3.interpolateNumber(h[0],k[0])},{i:3,x:d3.interpolateNumber(h[1],
k[1])})):k[0]||k[1]?c.push("translate("+k+")"):c.push("");l!=m?(180<l-m?m+=360:180<m-l&&(l+=360),d.push({i:c.push(c.pop()+"rotate(",null,")")-2,x:d3.interpolateNumber(l,m)})):m&&c.push(c.pop()+"rotate("+m+")");n!=q?d.push({i:c.push(c.pop()+"skewX(",null,")")-2,x:d3.interpolateNumber(n,q)}):q&&c.push(c.pop()+"skewX("+q+")");f[0]!=g[0]||f[1]!=g[1]?(e=c.push(c.pop()+"scale(",null,",",null,")"),d.push({i:e-4,x:d3.interpolateNumber(f[0],g[0])},{i:e-2,x:d3.interpolateNumber(f[1],g[1])})):1==g[0]&&1==g[1]||
c.push(c.pop()+"scale("+g+")");e=d.length;return function(a){for(var b=-1,f;++b<e;)c[(f=d[b]).i]=f.x(a);return c.join("")}};d3.interpolateRgb=function(a,b){a=d3.rgb(a);b=d3.rgb(b);var c=a.r,d=a.g,e=a.b,f=b.r-c,g=b.g-d,h=b.b-e;return function(a){return"#"+$(Math.round(c+f*a))+$(Math.round(d+g*a))+$(Math.round(e+h*a))}};d3.interpolateHsl=function(a,b){a=d3.hsl(a);b=d3.hsl(b);var c=a.h,d=a.s,e=a.l,f=b.h-c,g=b.s-d,h=b.l-e;180<f?f-=360:-180>f&&(f+=360);return function(a){return sa(c+f*a,d+g*a,e+h*a)+""}};
d3.interpolateLab=function(a,b){a=d3.lab(a);b=d3.lab(b);var c=a.l,d=a.a,e=a.b,f=b.l-c,g=b.a-d,h=b.b-e;return function(a){return fc(c+f*a,d+g*a,e+h*a)+""}};d3.interpolateHcl=function(a,b){a=d3.hcl(a);b=d3.hcl(b);var c=a.h,d=a.c,e=a.l,f=b.h-c,g=b.c-d,h=b.l-e;180<f?f-=360:-180>f&&(f+=360);return function(a){return fb(c+f*a,d+g*a,e+h*a)+""}};d3.interpolateArray=function(a,b){var c=[],d=[],e=a.length,f=b.length,g=Math.min(a.length,b.length),h;for(h=0;h<g;++h)c.push(d3.interpolate(a[h],b[h]));for(;h<e;++h)d[h]=
a[h];for(;h<f;++h)d[h]=b[h];return function(a){for(h=0;h<g;++h)d[h]=c[h](a);return d}};d3.interpolateObject=function(a,b){var c={},d={},e;for(e in a)e in b?c[e]=fa(e)(a[e],b[e]):d[e]=a[e];for(e in b)e in a||(d[e]=b[e]);return function(a){for(e in c)d[e]=c[e](a);return d}};var Oa=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;d3.interpolators=[d3.interpolateObject,function(a,b){return b instanceof Array&&d3.interpolateArray(a,b)},function(a,b){return("string"===typeof a||"string"===typeof b)&&d3.interpolateString(a+
"",b+"")},function(a,b){return("string"===typeof b?ra.has(b)||/^(#|rgb\(|hsl\()/.test(b):b instanceof Z)&&d3.interpolateRgb(a,b)},function(a,b){return!isNaN(a=+a)&&!isNaN(b=+b)&&d3.interpolateNumber(a,b)}];Z.prototype.toString=function(){return this.rgb()+""};d3.rgb=function(a,b,c){return 1===arguments.length?a instanceof $a?O(a.r,a.g,a.b):ab(""+a,O,sa):O(~~a,~~b,~~c)};var Pa=$a.prototype=new Z;Pa.brighter=function(a){a=Math.pow(0.7,arguments.length?a:1);var b=this.r,c=this.g,d=this.b;if(!b&&!c&&
!d)return O(30,30,30);b&&30>b&&(b=30);c&&30>c&&(c=30);d&&30>d&&(d=30);return O(Math.min(255,Math.floor(b/a)),Math.min(255,Math.floor(c/a)),Math.min(255,Math.floor(d/a)))};Pa.darker=function(a){a=Math.pow(0.7,arguments.length?a:1);return O(Math.floor(a*this.r),Math.floor(a*this.g),Math.floor(a*this.b))};Pa.hsl=function(){return ac(this.r,this.g,this.b)};Pa.toString=function(){return"#"+$(this.r)+$(this.g)+$(this.b)};var ra=d3.map({aliceblue:"#f0f8ff",antiquewhite:"#faebd7",aqua:"#00ffff",aquamarine:"#7fffd4",
azure:"#f0ffff",beige:"#f5f5dc",bisque:"#ffe4c4",black:"#000000",blanchedalmond:"#ffebcd",blue:"#0000ff",blueviolet:"#8a2be2",brown:"#a52a2a",burlywood:"#deb887",cadetblue:"#5f9ea0",chartreuse:"#7fff00",chocolate:"#d2691e",coral:"#ff7f50",cornflowerblue:"#6495ed",cornsilk:"#fff8dc",crimson:"#dc143c",cyan:"#00ffff",darkblue:"#00008b",darkcyan:"#008b8b",darkgoldenrod:"#b8860b",darkgray:"#a9a9a9",darkgreen:"#006400",darkgrey:"#a9a9a9",darkkhaki:"#bdb76b",darkmagenta:"#8b008b",darkolivegreen:"#556b2f",
darkorange:"#ff8c00",darkorchid:"#9932cc",darkred:"#8b0000",darksalmon:"#e9967a",darkseagreen:"#8fbc8f",darkslateblue:"#483d8b",darkslategray:"#2f4f4f",darkslategrey:"#2f4f4f",darkturquoise:"#00ced1",darkviolet:"#9400d3",deeppink:"#ff1493",deepskyblue:"#00bfff",dimgray:"#696969",dimgrey:"#696969",dodgerblue:"#1e90ff",firebrick:"#b22222",floralwhite:"#fffaf0",forestgreen:"#228b22",fuchsia:"#ff00ff",gainsboro:"#dcdcdc",ghostwhite:"#f8f8ff",gold:"#ffd700",goldenrod:"#daa520",gray:"#808080",green:"#008000",
greenyellow:"#adff2f",grey:"#808080",honeydew:"#f0fff0",hotpink:"#ff69b4",indianred:"#cd5c5c",indigo:"#4b0082",ivory:"#fffff0",khaki:"#f0e68c",lavender:"#e6e6fa",lavenderblush:"#fff0f5",lawngreen:"#7cfc00",lemonchiffon:"#fffacd",lightblue:"#add8e6",lightcoral:"#f08080",lightcyan:"#e0ffff",lightgoldenrodyellow:"#fafad2",lightgray:"#d3d3d3",lightgreen:"#90ee90",lightgrey:"#d3d3d3",lightpink:"#ffb6c1",lightsalmon:"#ffa07a",lightseagreen:"#20b2aa",lightskyblue:"#87cefa",lightslategray:"#778899",lightslategrey:"#778899",
lightsteelblue:"#b0c4de",lightyellow:"#ffffe0",lime:"#00ff00",limegreen:"#32cd32",linen:"#faf0e6",magenta:"#ff00ff",maroon:"#800000",mediumaquamarine:"#66cdaa",mediumblue:"#0000cd",mediumorchid:"#ba55d3",mediumpurple:"#9370db",mediumseagreen:"#3cb371",mediumslateblue:"#7b68ee",mediumspringgreen:"#00fa9a",mediumturquoise:"#48d1cc",mediumvioletred:"#c71585",midnightblue:"#191970",mintcream:"#f5fffa",mistyrose:"#ffe4e1",moccasin:"#ffe4b5",navajowhite:"#ffdead",navy:"#000080",oldlace:"#fdf5e6",olive:"#808000",
olivedrab:"#6b8e23",orange:"#ffa500",orangered:"#ff4500",orchid:"#da70d6",palegoldenrod:"#eee8aa",palegreen:"#98fb98",paleturquoise:"#afeeee",palevioletred:"#db7093",papayawhip:"#ffefd5",peachpuff:"#ffdab9",peru:"#cd853f",pink:"#ffc0cb",plum:"#dda0dd",powderblue:"#b0e0e6",purple:"#800080",red:"#ff0000",rosybrown:"#bc8f8f",royalblue:"#4169e1",saddlebrown:"#8b4513",salmon:"#fa8072",sandybrown:"#f4a460",seagreen:"#2e8b57",seashell:"#fff5ee",sienna:"#a0522d",silver:"#c0c0c0",skyblue:"#87ceeb",slateblue:"#6a5acd",
slategray:"#708090",slategrey:"#708090",snow:"#fffafa",springgreen:"#00ff7f",steelblue:"#4682b4",tan:"#d2b48c",teal:"#008080",thistle:"#d8bfd8",tomato:"#ff6347",turquoise:"#40e0d0",violet:"#ee82ee",wheat:"#f5deb3",white:"#ffffff",whitesmoke:"#f5f5f5",yellow:"#ffff00",yellowgreen:"#9acd32"});ra.forEach(function(a,b){ra.set(a,ab(b,O,sa))});d3.hsl=function(a,b,c){return 1===arguments.length?a instanceof eb?aa(a.h,a.s,a.l):ab(""+a,ac,aa):aa(+a,+b,+c)};var Lb=eb.prototype=new Z;Lb.brighter=function(a){a=
Math.pow(0.7,arguments.length?a:1);return aa(this.h,this.s,this.l/a)};Lb.darker=function(a){a=Math.pow(0.7,arguments.length?a:1);return aa(this.h,this.s,a*this.l)};Lb.rgb=function(){return sa(this.h,this.s,this.l)};d3.hcl=function(a,b,c){return 1===arguments.length?a instanceof ta?ga(a.h,a.c,a.l):a instanceof ua?gc(a.l,a.a,a.b):gc((a=bc((a=d3.rgb(a)).r,a.g,a.b)).l,a.a,a.b):ga(+a,+b,+c)};var Mb=ta.prototype=new Z;Mb.brighter=function(a){return ga(this.h,this.c,Math.min(100,this.l+Qa*(arguments.length?
a:1)))};Mb.darker=function(a){return ga(this.h,this.c,Math.max(0,this.l-Qa*(arguments.length?a:1)))};Mb.rgb=function(){return fb(this.h,this.c,this.l).rgb()};d3.lab=function(a,b,c){return 1===arguments.length?a instanceof ua?ba(a.l,a.a,a.b):a instanceof ta?fb(a.l,a.c,a.h):bc((a=d3.rgb(a)).r,a.g,a.b):ba(+a,+b,+c)};var Qa=18,cc=0.95047,dc=1,ec=1.08883,Nb=ua.prototype=new Z;Nb.brighter=function(a){return ba(Math.min(100,this.l+Qa*(arguments.length?a:1)),this.a,this.b)};Nb.darker=function(a){return ba(Math.max(0,
this.l-Qa*(arguments.length?a:1)),this.a,this.b)};Nb.rgb=function(){return fc(this.l,this.a,this.b)};var va=function(a,b){return b.querySelector(a)},jc=function(a,b){return b.querySelectorAll(a)},ea=document.documentElement,df=ea.matchesSelector||ea.webkitMatchesSelector||ea.mozMatchesSelector||ea.msMatchesSelector||ea.oMatchesSelector,qc=function(a,b){return df.call(a,b)};"function"===typeof Sizzle&&(va=function(a,b){return Sizzle(a,b)[0]||null},jc=function(a,b){return Sizzle.uniqueSort(Sizzle(a,
b))},qc=Sizzle.matchesSelector);var z=[];d3.selection=function(){return qa};d3.selection.prototype=z;z.select=function(a){var b=[],c,d,e,f;"function"!==typeof a&&(a=hc(a));for(var g=-1,h=this.length;++g<h;){b.push(c=[]);c.parentNode=(e=this[g]).parentNode;for(var k=-1,l=e.length;++k<l;)(f=e[k])?(c.push(d=a.call(f,f.__data__,k)),d&&"__data__"in f&&(d.__data__=f.__data__)):c.push(null)}return P(b)};z.selectAll=function(a){var b=[],c,d;"function"!==typeof a&&(a=ic(a));for(var e=-1,f=this.length;++e<
f;)for(var g=this[e],h=-1,k=g.length;++h<k;)if(d=g[h])b.push(c=oa(a.call(d,d.__data__,h))),c.parentNode=d;return P(b)};z.attr=function(a,b){if(2>arguments.length){if("string"===typeof a){var c=this.node();a=d3.ns.qualify(a);return a.local?c.getAttributeNS(a.space,a.local):c.getAttribute(a)}for(b in a)this.each(kc(b,a[b]));return this}return this.each(kc(a,b))};z.classed=function(a,b){if(2>arguments.length){if("string"===typeof a){var c=this.node(),d=(a=a.trim().split(/^|\s+/g)).length,e=-1;if(b=c.classList)for(;++e<
d;){if(!b.contains(a[e]))return!1}else for(b=c.className,null!=b.baseVal&&(b=b.baseVal);++e<d;)if(!lc(a[e]).test(b))return!1;return!0}for(b in a)this.each(mc(b,a[b]));return this}return this.each(mc(a,b))};z.style=function(a,b,c){var d=arguments.length;if(3>d){if("string"!==typeof a){2>d&&(b="");for(c in a)this.each(nc(c,a[c],b));return this}if(2>d)return window.getComputedStyle(this.node(),null).getPropertyValue(a);c=""}return this.each(nc(a,b,c))};z.property=function(a,b){if(2>arguments.length){if("string"===
typeof a)return this.node()[a];for(b in a)this.each(oc(b,a[b]));return this}return this.each(oc(a,b))};z.text=function(a){return 1>arguments.length?this.node().textContent:this.each("function"===typeof a?function(){var b=a.apply(this,arguments);this.textContent=null==b?"":b}:null==a?function(){this.textContent=""}:function(){this.textContent=a})};z.html=function(a){return 1>arguments.length?this.node().innerHTML:this.each("function"===typeof a?function(){var b=a.apply(this,arguments);this.innerHTML=
null==b?"":b}:null==a?function(){this.innerHTML=""}:function(){this.innerHTML=a})};z.append=function(a){function b(){return this.appendChild(document.createElementNS(this.namespaceURI,a))}function c(){return this.appendChild(document.createElementNS(a.space,a.local))}a=d3.ns.qualify(a);return this.select(a.local?c:b)};z.insert=function(a,b){function c(){return this.insertBefore(document.createElementNS(this.namespaceURI,a),va(b,this))}function d(){return this.insertBefore(document.createElementNS(a.space,
a.local),va(b,this))}a=d3.ns.qualify(a);return this.select(a.local?d:c)};z.remove=function(){return this.each(function(){var a=this.parentNode;a&&a.removeChild(this)})};z.data=function(a,b){function c(a,c){var d,e=a.length,f=c.length,g=Math.min(e,f),u=Math.max(e,f),w=[],x=[],y=[],D,B;if(b){var g=new S,u=[],A;B=c.length;for(d=-1;++d<e;)A=b.call(D=a[d],D.__data__,d),g.has(A)?y[B++]=D:g.set(A,D),u.push(A);for(d=-1;++d<f;)A=b.call(c,B=c[d],d),g.has(A)?(w[d]=D=g.get(A),D.__data__=B,x[d]=y[d]=null):(x[d]=
{__data__:B},w[d]=y[d]=null),g.remove(A);for(d=-1;++d<e;)g.has(u[d])&&(y[d]=a[d])}else{for(d=-1;++d<g;)D=a[d],B=c[d],D?(D.__data__=B,w[d]=D,x[d]=y[d]=null):(x[d]={__data__:B},w[d]=y[d]=null);for(;d<f;++d)x[d]={__data__:c[d]},w[d]=y[d]=null;for(;d<u;++d)y[d]=a[d],x[d]=w[d]=null}x.update=w;x.parentNode=w.parentNode=y.parentNode=a.parentNode;h.push(x);k.push(w);l.push(y)}var d=-1,e=this.length,f,g;if(!arguments.length){for(a=Array(e=(f=this[0]).length);++d<e;)if(g=f[d])a[d]=g.__data__;return a}var h=
sc([]),k=P([]),l=P([]);if("function"===typeof a)for(;++d<e;)c(f=this[d],a.call(f,f.parentNode.__data__,d));else for(;++d<e;)c(f=this[d],a);k.enter=function(){return h};k.exit=function(){return l};return k};z.datum=z.map=function(a){return 1>arguments.length?this.property("__data__"):this.property("__data__",a)};z.filter=function(a){var b=[],c,d,e;"function"!==typeof a&&(a=pc(a));for(var f=0,g=this.length;f<g;f++){b.push(c=[]);c.parentNode=(d=this[f]).parentNode;for(var h=0,k=d.length;h<k;h++)(e=d[h])&&
a.call(e,e.__data__,h)&&c.push(e)}return P(b)};z.order=function(){for(var a=-1,b=this.length;++a<b;)for(var c=this[a],d=c.length-1,e=c[d],f;0<=--d;)if(f=c[d])e&&e!==f.nextSibling&&e.parentNode.insertBefore(f,e),e=f;return this};z.sort=function(a){a=Xd.apply(this,arguments);for(var b=-1,c=this.length;++b<c;)this[b].sort(a);return this.order()};z.on=function(a,b,c){var d=arguments.length;if(3>d){if("string"!==typeof a){2>d&&(b=!1);for(c in a)this.each(rc(c,a[c],b));return this}if(2>d)return(d=this.node()["__on"+
a])&&d._;c=!1}return this.each(rc(a,b,c))};z.each=function(a){return ha(this,function(b,c,d){a.call(b,b.__data__,c,d)})};z.call=function(a){a.apply(this,(arguments[0]=this,arguments));return this};z.empty=function(){return!this.node()};z.node=function(a){a=0;for(var b=this.length;a<b;a++)for(var c=this[a],d=0,e=c.length;d<e;d++){var f=c[d];if(f)return f}return null};z.transition=function(){for(var a=[],b,c,d=-1,e=this.length;++d<e;){a.push(b=[]);for(var f=this[d],g=-1,h=f.length;++g<h;)b.push((c=
f[g])?{node:c,delay:ya,duration:za}:null)}return wa(a,V||++ef,Date.now())};var qa=P([[document]]);qa[0].parentNode=ea;d3.select=function(a){return"string"===typeof a?qa.select(a):P([[a]])};d3.selectAll=function(a){return"string"===typeof a?qa.selectAll(a):P([oa(a)])};var U=[];d3.selection.enter=sc;d3.selection.enter.prototype=U;U.append=z.append;U.insert=z.insert;U.empty=z.empty;U.node=z.node;U.select=function(a){for(var b=[],c,d,e,f,g,h=-1,k=this.length;++h<k;){e=(f=this[h]).update;b.push(c=[]);
c.parentNode=f.parentNode;for(var l=-1,m=f.length;++l<m;)(g=f[l])?(c.push(e[l]=d=a.call(f.parentNode,g.__data__,l)),d.__data__=g.__data__):c.push(null)}return P(b)};var H=[],ef=0,V=0,ya=0,za=250,xa=d3.ease("cubic-in-out");H.call=z.call;d3.transition=function(a){return arguments.length?V?a.transition():a:qa.transition()};d3.transition.prototype=H;H.select=function(a){var b=[],c,d,e;"function"!==typeof a&&(a=hc(a));for(var f=-1,g=this.length;++f<g;){b.push(c=[]);for(var h=this[f],k=-1,l=h.length;++k<
l;)(e=h[k])&&(d=a.call(e.node,e.node.__data__,k))?("__data__"in e.node&&(d.__data__=e.node.__data__),c.push({node:d,delay:e.delay,duration:e.duration})):c.push(null)}return wa(b,this.id,this.time).ease(this.ease())};H.selectAll=function(a){var b=[],c,d,e;"function"!==typeof a&&(a=ic(a));for(var f=-1,g=this.length;++f<g;)for(var h=this[f],k=-1,l=h.length;++k<l;)if(e=h[k]){d=a.call(e.node,e.node.__data__,k);b.push(c=[]);for(var m=-1,n=d.length;++m<n;)c.push({node:d[m],delay:e.delay,duration:e.duration})}return wa(b,
this.id,this.time).ease(this.ease())};H.filter=function(a){var b=[],c,d,e;"function"!==typeof a&&(a=pc(a));for(var f=0,g=this.length;f<g;f++){b.push(c=[]);d=this[f];for(var h=0,k=d.length;h<k;h++)(e=d[h])&&a.call(e.node,e.node.__data__,h)&&c.push(e)}return wa(b,this.id,this.time).ease(this.ease())};H.attr=function(a,b){if(2>arguments.length){for(b in a)this.attrTween(b,d3.tween(a[b],fa(b)));return this}return this.attrTween(a,d3.tween(b,fa(a)))};H.attrTween=function(a,b){function c(a,c){var d=b.call(this,
a,c,this.getAttribute(e));return d===ia?(this.removeAttribute(e),null):d&&function(a){this.setAttribute(e,d(a))}}function d(a,c){var d=b.call(this,a,c,this.getAttributeNS(e.space,e.local));return d===ia?(this.removeAttributeNS(e.space,e.local),null):d&&function(a){this.setAttributeNS(e.space,e.local,d(a))}}var e=d3.ns.qualify(a);return this.tween("attr."+a,e.local?d:c)};H.style=function(a,b,c){var d=arguments.length;if(3>d){if("string"!==typeof a){2>d&&(b="");for(c in a)this.styleTween(c,d3.tween(a[c],
fa(c)),b);return this}c=""}return this.styleTween(a,d3.tween(b,fa(a)),c)};H.styleTween=function(a,b,c){3>arguments.length&&(c="");return this.tween("style."+a,function(d,e){var f=b.call(this,d,e,window.getComputedStyle(this,null).getPropertyValue(a));return f===ia?(this.style.removeProperty(a),null):f&&function(b){this.style.setProperty(a,f(b),c)}})};H.text=function(a){return this.tween("text",function(b,c){this.textContent="function"===typeof a?a.call(this,b,c):a})};H.remove=function(){return this.each("end.transition",
function(){var a;!this.__transition__&&(a=this.parentNode)&&a.removeChild(this)})};H.delay=function(a){return ha(this,"function"===typeof a?function(b,c,d){b.delay=a.call(b=b.node,b.__data__,c,d)|0}:(a|=0,function(b){b.delay=a}))};H.duration=function(a){return ha(this,"function"===typeof a?function(b,c,d){b.duration=Math.max(1,a.call(b=b.node,b.__data__,c,d)|0)}:(a=Math.max(1,a|0),function(b){b.duration=a}))};H.transition=function(){return this.select(Kd)};d3.tween=function(a,b){function c(c,d,g){c=
a.call(this,c,d);return null==c?""!=g&&ia:g!=c&&b(g,c+"")}function d(c,d,g){return g!=a&&b(g,a)}return"function"===typeof a?c:null==a?Zd:(a+="",d)};var ia={},ff=0,kb={},ca=null,Ba,Aa;d3.timer=function(a,b,c){if(3>arguments.length){if(2>arguments.length)b=0;else if(!isFinite(b))return;c=Date.now()}var d=kb[a.id];d&&d.callback===a?(d.then=c,d.delay=b):kb[a.id=++ff]=ca={callback:a,then:c,delay:b,next:ca};Ba||(Aa=clearTimeout(Aa),Ba=1,uc(jb))};d3.timer.flush=function(){for(var a,b=Date.now(),c=ca;c;)a=
b-c.then,c.delay||(c.flush=c.callback(a)),c=c.next;tc()};var uc=window.requestAnimationFrame||window.webkitRequestAnimationFrame||window.mozRequestAnimationFrame||window.oRequestAnimationFrame||window.msRequestAnimationFrame||function(a){setTimeout(a,17)};d3.mouse=function(a){return vc(a,Xb())};var lb=/WebKit/.test(navigator.userAgent)?-1:0;d3.touches=function(a,b){2>arguments.length&&(b=Xb().touches);return b?oa(b).map(function(b){var d=vc(a,b);d.identifier=b.identifier;return d}):[]};d3.scale={};
d3.scale.linear=function(){return wc([0,1],[0,1],d3.interpolate,!1)};d3.scale.log=function(){return Ac(d3.scale.linear(),ob)};var ce=d3.format(".0e");ob.pow=function(a){return Math.pow(10,a)};Ea.pow=function(a){return-Math.pow(10,-a)};d3.scale.pow=function(){return Bc(d3.scale.linear(),1)};d3.scale.sqrt=function(){return d3.scale.pow().exponent(0.5)};d3.scale.ordinal=function(){return Cc([],{t:"range",a:[[]]})};d3.scale.category10=function(){return d3.scale.ordinal().range(gf)};d3.scale.category20=
function(){return d3.scale.ordinal().range(hf)};d3.scale.category20b=function(){return d3.scale.ordinal().range(jf)};d3.scale.category20c=function(){return d3.scale.ordinal().range(kf)};var gf="#1f77b4 #ff7f0e #2ca02c #d62728 #9467bd #8c564b #e377c2 #7f7f7f #bcbd22 #17becf".split(" "),hf="#1f77b4 #aec7e8 #ff7f0e #ffbb78 #2ca02c #98df8a #d62728 #ff9896 #9467bd #c5b0d5 #8c564b #c49c94 #e377c2 #f7b6d2 #7f7f7f #c7c7c7 #bcbd22 #dbdb8d #17becf #9edae5".split(" "),jf="#393b79 #5254a3 #6b6ecf #9c9ede #637939 #8ca252 #b5cf6b #cedb9c #8c6d31 #bd9e39 #e7ba52 #e7cb94 #843c39 #ad494a #d6616b #e7969c #7b4173 #a55194 #ce6dbd #de9ed6".split(" "),
kf="#3182bd #6baed6 #9ecae1 #c6dbef #e6550d #fd8d3c #fdae6b #fdd0a2 #31a354 #74c476 #a1d99b #c7e9c0 #756bb1 #9e9ac8 #bcbddc #dadaeb #636363 #969696 #bdbdbd #d9d9d9".split(" ");d3.scale.quantile=function(){return Dc([],[])};d3.scale.quantize=function(){return Ec(0,1,[0,1])};d3.scale.threshold=function(){return Fc([0.5],[0,1])};d3.scale.identity=function(){return Gc([0,1])};d3.svg={};d3.svg.arc=function(){function a(){var a=b.apply(this,arguments),g=c.apply(this,arguments),h=d.apply(this,arguments)+
W,k=e.apply(this,arguments)+W,l=(k<h&&(l=h,h=k,k=l),k-h),m=l<Math.PI?"0":"1",n=Math.cos(h),h=Math.sin(h),q=Math.cos(k),k=Math.sin(k);return l>=lf?a?"M0,"+g+"A"+g+","+g+" 0 1,1 0,"+-g+"A"+g+","+g+" 0 1,1 0,"+g+"M0,"+a+"A"+a+","+a+" 0 1,0 0,"+-a+"A"+a+","+a+" 0 1,0 0,"+a+"Z":"M0,"+g+"A"+g+","+g+" 0 1,1 0,"+-g+"A"+g+","+g+" 0 1,1 0,"+g+"Z":a?"M"+g*n+","+g*h+"A"+g+","+g+" 0 "+m+",1 "+g*q+","+g*k+"L"+a*q+","+a*k+"A"+a+","+a+" 0 "+m+",0 "+a*n+","+a*h+"Z":"M"+g*n+","+g*h+"A"+g+","+g+" 0 "+m+",1 "+g*q+","+
g*k+"L0,0Z"}var b=de,c=ee,d=Hc,e=Ic;a.innerRadius=function(c){if(!arguments.length)return b;b=C(c);return a};a.outerRadius=function(b){if(!arguments.length)return c;c=C(b);return a};a.startAngle=function(b){if(!arguments.length)return d;d=C(b);return a};a.endAngle=function(b){if(!arguments.length)return e;e=C(b);return a};a.centroid=function(){var a=(b.apply(this,arguments)+c.apply(this,arguments))/2,g=(d.apply(this,arguments)+e.apply(this,arguments))/2+W;return[Math.cos(g)*a,Math.sin(g)*a]};return a};
var W=-Math.PI/2,lf=2*Math.PI-1E-6;d3.svg.line=function(){return Jc(T)};var qb=d3.map({linear:E,"linear-closed":function(a){return E(a)+"Z"},"step-before":rb,"step-after":sb,basis:Lc,"basis-open":function(a){if(4>a.length)return E(a);for(var b=[],c=-1,d=a.length,e,f=[0],g=[0];3>++c;)e=a[c],f.push(e[0]),g.push(e[1]);b.push(N(da,f)+","+N(da,g));for(--c;++c<d;)e=a[c],f.shift(),f.push(e[0]),g.shift(),g.push(e[1]),ka(b,f,g);return b.join("")},"basis-closed":function(a){for(var b,c=-1,d=a.length,e=d+4,
f,g=[],h=[];4>++c;)f=a[c%d],g.push(f[0]),h.push(f[1]);b=[N(da,g),",",N(da,h)];for(--c;++c<e;)f=a[c%d],g.shift(),g.push(f[0]),h.shift(),h.push(f[1]),ka(b,g,h);return b.join("")},bundle:function(a,b){var c=a.length-1;if(c)for(var d=a[0][0],e=a[0][1],f=a[c][0]-d,g=a[c][1]-e,h=-1,k,l;++h<=c;)k=a[h],l=h/c,k[0]=b*k[0]+(1-b)*(d+l*f),k[1]=b*k[1]+(1-b)*(e+l*g);return Lc(a)},cardinal:function(a,b,c){return 3>a.length?E(a):a[0]+Ga(a,tb(a,b))},"cardinal-open":function(a,b){return 4>a.length?E(a):a[1]+Ga(a.slice(1,
a.length-1),tb(a,b))},"cardinal-closed":function(a,b){return 3>a.length?E(a):a[0]+Ga((a.push(a[0]),a),tb([a[a.length-2]].concat(a,[a[1]]),b))},monotone:function(a){if(3>a.length)a=E(a);else{var b=a[0],c=[],d,e,f,g;d=0;e=a.length-1;var h=[];f=a[1];for(g=h[0]=ub(a[0],f);++d<e;)h[d]=(g+(g=ub(f,f=a[d+1])))/2;h[d]=g;for(var k=-1,l=a.length-1;++k<l;)d=ub(a[k],a[k+1]),1E-6>Math.abs(d)?h[k]=h[k+1]=0:(e=h[k]/d,f=h[k+1]/d,g=e*e+f*f,9<g&&(g=3*d/Math.sqrt(g),h[k]=g*e,h[k+1]=g*f));for(k=-1;++k<=l;)g=(a[Math.min(l,
k+1)][0]-a[Math.max(0,k-1)][0])/(6*(1+h[k]*h[k])),c.push([g||0,h[k]*g||0]);a=b+Ga(a,c)}return a}});qb.forEach(function(a,b){b.key=a;b.closed=/-closed$/.test(a)});var Mc=[0,2/3,1/3,0],Nc=[0,1/3,2/3,0],da=[0,1/6,2/3,1/6];d3.svg.line.radial=function(){var a=Jc(Oc);a.radius=a.x;delete a.x;a.angle=a.y;delete a.y;return a};rb.reverse=sb;sb.reverse=rb;d3.svg.area=function(){return Pc(T)};d3.svg.area.radial=function(){var a=Pc(Oc);a.radius=a.x;delete a.x;a.innerRadius=a.x0;delete a.x0;a.outerRadius=a.x1;
delete a.x1;a.angle=a.y;delete a.y;a.startAngle=a.y0;delete a.y0;a.endAngle=a.y1;delete a.y1;return a};d3.svg.chord=function(){function a(a,e){var f=b(this,c,a,e),g=b(this,d,a,e);return"M"+f.p0+("A"+f.r+","+f.r+" 0 "+ +(f.a1-f.a0>Math.PI)+",1 "+f.p1)+(f.a0==g.a0&&f.a1==g.a1?"Q 0,0 "+f.p0:"Q 0,0 "+g.p0+("A"+g.r+","+g.r+" 0 "+ +(g.a1-g.a0>Math.PI)+",1 "+g.p1)+("Q 0,0 "+f.p0))+"Z"}function b(a,b,c,d){var n=b.call(a,c,d);b=e.call(a,n,d);c=f.call(a,n,d)+W;a=g.call(a,n,d)+W;return{r:b,a0:c,a1:a,p0:[b*Math.cos(c),
b*Math.sin(c)],p1:[b*Math.cos(a),b*Math.sin(a)]}}var c=Qc,d=Rc,e=fe,f=Hc,g=Ic;a.radius=function(b){if(!arguments.length)return e;e=C(b);return a};a.source=function(b){if(!arguments.length)return c;c=C(b);return a};a.target=function(b){if(!arguments.length)return d;d=C(b);return a};a.startAngle=function(b){if(!arguments.length)return f;f=C(b);return a};a.endAngle=function(b){if(!arguments.length)return g;g=C(b);return a};return a};d3.svg.diagonal=function(){function a(a,f){var g=b.call(this,a,f),h=
c.call(this,a,f),k=(g.y+h.y)/2,g=[g,{x:g.x,y:k},{x:h.x,y:k},h],g=g.map(d);return"M"+g[0]+"C"+g[1]+" "+g[2]+" "+g[3]}var b=Qc,c=Rc,d=Sc;a.source=function(c){if(!arguments.length)return b;b=C(c);return a};a.target=function(b){if(!arguments.length)return c;c=C(b);return a};a.projection=function(b){if(!arguments.length)return d;d=b;return a};return a};d3.svg.diagonal.radial=function(){var a=d3.svg.diagonal(),b=Sc,c=a.projection;a.projection=function(a){return arguments.length?c(ge(b=a)):b};return a};
d3.svg.mouse=d3.mouse;d3.svg.touches=d3.touches;d3.svg.symbol=function(){function a(a,e){return(wd.get(b.call(this,a,e))||Tc)(c.call(this,a,e))}var b=ie,c=he;a.type=function(c){if(!arguments.length)return b;b=C(c);return a};a.size=function(b){if(!arguments.length)return c;c=C(b);return a};return a};var wd=d3.map({circle:Tc,cross:function(a){a=Math.sqrt(a/5)/2;return"M"+-3*a+","+-a+"H"+-a+"V"+-3*a+"H"+a+"V"+-a+"H"+3*a+"V"+a+"H"+a+"V"+3*a+"H"+-a+"V"+a+"H"+-3*a+"Z"},diamond:function(a){a=Math.sqrt(a/
(2*xd));var b=a*xd;return"M0,"+-a+"L"+b+",0 0,"+a+" "+-b+",0Z"},square:function(a){a=Math.sqrt(a)/2;return"M"+-a+","+-a+"L"+a+","+-a+" "+a+","+a+" "+-a+","+a+"Z"},"triangle-down":function(a){a=Math.sqrt(a/Ra);var b=a*Ra/2;return"M0,"+b+"L"+a+","+-b+" "+-a+","+-b+"Z"},"triangle-up":function(a){a=Math.sqrt(a/Ra);var b=a*Ra/2;return"M0,"+-b+"L"+a+","+b+" "+-a+","+b+"Z"}});d3.svg.symbolTypes=wd.keys();var Ra=Math.sqrt(3),xd=Math.tan(30*Math.PI/180);d3.svg.axis=function(){function a(a){a.each(function(){var a=
d3.select(this),n=null==k?b.ticks?b.ticks.apply(b,h):b.domain():k,r=null==l?b.tickFormat?b.tickFormat.apply(b,h):String:l,t=je(b,n,m),u=a.selectAll(".minor").data(t,String),t=u.enter().insert("line","g").attr("class","tick minor").style("opacity",1E-6),w=d3.transition(u.exit()).style("opacity",1E-6).remove(),u=d3.transition(u).style("opacity",1),x=a.selectAll("g").data(n,String),n=x.enter().insert("g","path").style("opacity",1E-6),y=d3.transition(x.exit()).style("opacity",1E-6).remove(),D=d3.transition(x).style("opacity",
1),B,A=Ca(b),a=a.selectAll(".domain").data([0]);a.enter().append("path").attr("class","domain");var a=d3.transition(a),F=b.copy(),v=this.__chart__||F;this.__chart__=F;n.append("line").attr("class","tick");n.append("text");var M=n.select("line"),K=D.select("line"),r=x.select("text").text(r),x=n.select("text"),s=D.select("text");switch(c){case "bottom":B=Uc;t.attr("y2",e);u.attr("x2",0).attr("y2",e);M.attr("y2",d);x.attr("y",Math.max(d,0)+g);K.attr("x2",0).attr("y2",d);s.attr("x",0).attr("y",Math.max(d,
0)+g);r.attr("dy",".71em").attr("text-anchor","middle");a.attr("d","M"+A[0]+","+f+"V0H"+A[1]+"V"+f);break;case "top":B=Uc;t.attr("y2",-e);u.attr("x2",0).attr("y2",-e);M.attr("y2",-d);x.attr("y",-(Math.max(d,0)+g));K.attr("x2",0).attr("y2",-d);s.attr("x",0).attr("y",-(Math.max(d,0)+g));r.attr("dy","0em").attr("text-anchor","middle");a.attr("d","M"+A[0]+","+-f+"V0H"+A[1]+"V"+-f);break;case "left":B=Vc;t.attr("x2",-e);u.attr("x2",-e).attr("y2",0);M.attr("x2",-d);x.attr("x",-(Math.max(d,0)+g));K.attr("x2",
-d).attr("y2",0);s.attr("x",-(Math.max(d,0)+g)).attr("y",0);r.attr("dy",".32em").attr("text-anchor","end");a.attr("d","M"+-f+","+A[0]+"H0V"+A[1]+"H"+-f);break;case "right":B=Vc,t.attr("x2",e),u.attr("x2",e).attr("y2",0),M.attr("x2",d),x.attr("x",Math.max(d,0)+g),K.attr("x2",d).attr("y2",0),s.attr("x",Math.max(d,0)+g).attr("y",0),r.attr("dy",".32em").attr("text-anchor","start"),a.attr("d","M"+f+","+A[0]+"H0V"+A[1]+"H"+f)}if(b.ticks)n.call(B,v),D.call(B,F),y.call(B,F),t.call(B,v),u.call(B,F),w.call(B,
F);else{var mf=F.rangeBand()/2,t=function(a){return F(a)+mf};n.call(B,t);D.call(B,t)}})}var b=d3.scale.linear(),c="bottom",d=6,e=6,f=6,g=3,h=[10],k=null,l,m=0;a.scale=function(c){if(!arguments.length)return b;b=c;return a};a.orient=function(b){if(!arguments.length)return c;c=b;return a};a.ticks=function(){if(!arguments.length)return h;h=arguments;return a};a.tickValues=function(b){if(!arguments.length)return k;k=b;return a};a.tickFormat=function(b){if(!arguments.length)return l;l=b;return a};a.tickSize=
function(b,c,g){if(!arguments.length)return d;var h=arguments.length-1;d=+b;e=1<h?+c:d;f=0<h?+arguments[h]:d;return a};a.tickPadding=function(b){if(!arguments.length)return g;g=+b;return a};a.tickSubdivide=function(b){if(!arguments.length)return m;m=+b;return a};return a};d3.svg.brush=function(){function a(f){f.each(function(){var f=d3.select(this),l=f.selectAll(".background").data([0]),n=f.selectAll(".extent").data([0]),m=f.selectAll(".resize").data(k,String);f.style("pointer-events","all").on("mousedown.brush",
e).on("touchstart.brush",e);l.enter().append("rect").attr("class","background").style("visibility","hidden").style("cursor","crosshair");n.enter().append("rect").attr("class","extent").style("cursor","move");m.enter().append("g").attr("class",function(a){return"resize "+a}).style("cursor",function(a){return nf[a]}).append("rect").attr("x",function(a){return/[ew]$/.test(a)?-3:null}).attr("y",function(a){return/^[ns]/.test(a)?-3:null}).attr("width",6).attr("height",6).style("visibility","hidden");m.style("display",
a.empty()?"none":null);m.exit().remove();g&&(n=Ca(g),l.attr("x",n[0]).attr("width",n[1]-n[0]),c(f));h&&(n=Ca(h),l.attr("y",n[0]).attr("height",n[1]-n[0]),d(f));b(f)})}function b(a){a.selectAll(".resize").attr("transform",function(a){return"translate("+l[+/e$/.test(a)][0]+","+l[+/^s/.test(a)][1]+")"})}function c(a){a.select(".extent").attr("x",l[0][0]);a.selectAll(".extent,.n>rect,.s>rect").attr("width",l[1][0]-l[0][0])}function d(a){a.select(".extent").attr("y",l[0][1]);a.selectAll(".extent,.e>rect,.w>rect").attr("height",
l[1][1]-l[0][1])}function e(){function e(){var a=d3.event.changedTouches;return a?d3.touches(t,a)[0]:d3.mouse(t)}function k(){var a=e(),f=!1;M&&(a[0]+=M[0],a[1]+=M[1]);A||(d3.event.altKey?(F||(F=[(l[0][0]+l[1][0])/2,(l[0][1]+l[1][1])/2]),v[0]=l[+(a[0]<F[0])][0],v[1]=l[+(a[1]<F[1])][1]):F=null);D&&p(a,g,0)&&(c(x),f=!0);B&&p(a,h,1)&&(d(x),f=!0);f&&(b(x),w({type:"brush",mode:A?"move":"resize"}))}function p(a,b,c){var d=Ca(b);b=d[0];var e=d[1],d=v[c],f=l[1][c]-l[0][c];A&&(b-=d,e-=f+d);a=Math.max(b,Math.min(e,
a[c]));A?b=(a+=d)+f:(F&&(d=Math.max(b,Math.min(e,2*F[c]-a))),d<a?(b=a,a=d):b=d);if(l[0][c]!==a||l[1][c]!==b)return m=null,l[0][c]=a,l[1][c]=b,!0}function r(){k();x.style("pointer-events","all").selectAll(".resize").style("display",a.empty()?"none":null);d3.select("body").style("cursor",null);K.on("mousemove.brush",null).on("mouseup.brush",null).on("touchmove.brush",null).on("touchend.brush",null).on("keydown.brush",null).on("keyup.brush",null);w({type:"brushend"});J()}var t=this,u=d3.select(d3.event.target),
w=f.of(t,arguments),x=d3.select(t),y=u.datum(),D=!/^(n|s)$/.test(y)&&g,B=!/^(e|w)$/.test(y)&&h,A=u.classed("extent"),F,v=e(),M,K=d3.select(window).on("mousemove.brush",k).on("mouseup.brush",r).on("touchmove.brush",k).on("touchend.brush",r).on("keydown.brush",function(){32==d3.event.keyCode&&(A||(F=null,v[0]-=l[1][0],v[1]-=l[1][1],A=2),J())}).on("keyup.brush",function(){32==d3.event.keyCode&&2==A&&(v[0]+=l[1][0],v[1]+=l[1][1],A=0,J())});if(A)v[0]=l[0][0]-v[0],v[1]=l[0][1]-v[1];else if(y){var s=+/w$/.test(y),
y=+/^n/.test(y);M=[l[1-s][0]-v[0],l[1-y][1]-v[1]];v[0]=l[s][0];v[1]=l[y][1]}else d3.event.altKey&&(F=v.slice());x.style("pointer-events","none").selectAll(".resize").style("display",null);d3.select("body").style("cursor",u.style("cursor"));w({type:"brushstart"});k();J()}var f=Za(a,"brushstart","brush","brushend"),g=null,h=null,k=Ob[0],l=[[0,0],[0,0]],m;a.x=function(b){if(!arguments.length)return g;g=b;k=Ob[!g<<1|!h];return a};a.y=function(b){if(!arguments.length)return h;h=b;k=Ob[!g<<1|!h];return a};
a.extent=function(b){var c,d,e,f,k;if(!arguments.length)return b=m||l,g&&(c=b[0][0],d=b[1][0],m||(c=l[0][0],d=l[1][0],g.invert&&(c=g.invert(c),d=g.invert(d)),d<c&&(k=c,c=d,d=k))),h&&(e=b[0][1],f=b[1][1],m||(e=l[0][1],f=l[1][1],h.invert&&(e=h.invert(e),f=h.invert(f)),f<e&&(k=e,e=f,f=k))),g&&h?[[c,e],[d,f]]:g?[c,d]:h&&[e,f];m=[[0,0],[0,0]];g&&(c=b[0],d=b[1],h&&(c=c[0],d=d[0]),m[0][0]=c,m[1][0]=d,g.invert&&(c=g(c),d=g(d)),d<c&&(k=c,c=d,d=k),l[0][0]=c|0,l[1][0]=d|0);h&&(e=b[0],f=b[1],g&&(e=e[1],f=f[1]),
m[0][1]=e,m[1][1]=f,h.invert&&(e=h(e),f=h(f)),f<e&&(k=e,e=f,f=k),l[0][1]=e|0,l[1][1]=f|0);return a};a.clear=function(){m=null;l[0][0]=l[0][1]=l[1][0]=l[1][1]=0;return a};a.empty=function(){return g&&l[0][0]===l[1][0]||h&&l[0][1]===l[1][1]};return d3.rebind(a,f,"on")};var nf={n:"ns-resize",e:"ew-resize",s:"ns-resize",w:"ew-resize",nw:"nwse-resize",ne:"nesw-resize",se:"nwse-resize",sw:"nesw-resize"},Ob=["n e s w nw ne se sw".split(" "),["e","w"],["n","s"],[]];d3.behavior={};d3.behavior.drag=function(){function a(){this.on("mousedown.drag",
b).on("touchstart.drag",b)}function b(){function a(){var b=h.parentNode;return m?d3.touches(b).filter(function(a){return a.identifier===m})[0]:d3.mouse(b)}function b(){k({type:"dragend"});if(p&&(J(),d3.event.target===l))r.on("click.drag",g,!0);r.on(m?"touchmove.drag-"+m:"mousemove.drag",null).on(m?"touchend.drag-"+m:"mouseup.drag",null)}function g(){J();r.on("click.drag",null)}var h=this,k=c.of(h,arguments),l=d3.event.target,m=d3.event.touches&&d3.event.changedTouches[0].identifier,n,q=a(),p=0,r=
d3.select(window).on(m?"touchmove.drag-"+m:"mousemove.drag",function(){if(!h.parentNode)return b();var c=a(),d=c[0]-q[0],g=c[1]-q[1];p=p|d|g;q=c;J();k({type:"drag",x:c[0]+n[0],y:c[1]+n[1],dx:d,dy:g})}).on(m?"touchend.drag-"+m:"mouseup.drag",b,!0);d?(n=d.apply(h,arguments),n=[n.x-q[0],n.y-q[1]]):n=[0,0];m||J();k({type:"dragstart"})}var c=Za(a,"drag","dragstart","dragend"),d=null;a.origin=function(b){if(!arguments.length)return d;d=b;return a};return d3.rebind(a,c,"on")};d3.behavior.zoom=function(){function a(){this.on("mousedown.zoom",
f).on("mousewheel.zoom",g).on("mousemove.zoom",h).on("DOMMouseScroll.zoom",g).on("dblclick.zoom",k).on("touchstart.zoom",l).on("touchmove.zoom",m).on("touchend.zoom",l)}function b(a){return[(a[0]-n[0])/p,(a[1]-n[1])/p]}function c(a){p=Math.max(t[0],Math.min(t[1],a))}function d(a,b){b=[b[0]*p+n[0],b[1]*p+n[1]];n[0]+=a[0]-b[0];n[1]+=a[1]-b[1]}function e(a){x&&x.domain(w.range().map(function(a){return(a-n[0])/p}).map(w.invert));D&&D.domain(y.range().map(function(a){return(a-n[1])/p}).map(y.invert));
d3.event.preventDefault();a({type:"zoom",scale:p,translate:n})}function f(){function a(){J();k.on("click.zoom",null)}var c=this,f=u.of(c,arguments),g=d3.event.target,h=0,k=d3.select(window).on("mousemove.zoom",function(){h=1;d(d3.mouse(c),l);e(f)}).on("mouseup.zoom",function(){h&&J();k.on("mousemove.zoom",null).on("mouseup.zoom",null);if(h&&d3.event.target===g)k.on("click.zoom",a,!0)}),l=b(d3.mouse(c));window.focus();J()}function g(){q||(q=b(d3.mouse(this)));c(Math.pow(2,0.002*ke())*p);d(d3.mouse(this),
q);e(u.of(this,arguments))}function h(){q=null}function k(){var a=d3.mouse(this),f=b(a);c(d3.event.shiftKey?p/2:2*p);d(a,f);e(u.of(this,arguments))}function l(){var a=d3.touches(this),f=Date.now();r=p;q={};a.forEach(function(a){q[a.identifier]=b(a)});J();if(1===a.length){if(500>f-B){var g=a[0],a=b(a[0]);c(2*p);d(g,a);e(u.of(this,arguments))}B=f}}function m(){var a=d3.touches(this),b=a[0],f=q[b.identifier];if(a=a[1]){var g=q[a.identifier],b=[(b[0]+a[0])/2,(b[1]+a[1])/2],f=[(f[0]+g[0])/2,(f[1]+g[1])/
2];c(d3.event.scale*r)}d(b,f);B=null;e(u.of(this,arguments))}var n=[0,0],q,p=1,r,t=yd,u=Za(a,"zoom"),w,x,y,D,B;a.translate=function(b){if(!arguments.length)return n;n=b.map(Number);return a};a.scale=function(b){if(!arguments.length)return p;p=+b;return a};a.scaleExtent=function(b){if(!arguments.length)return t;t=null==b?yd:b.map(Number);return a};a.x=function(b){if(!arguments.length)return x;x=b;w=b.copy();return a};a.y=function(b){if(!arguments.length)return D;D=b;y=b.copy();return a};return d3.rebind(a,
u,"on")};var la,yd=[0,Infinity];d3.layout={};d3.layout.bundle=function(){return function(a){for(var b=[],c=-1,d=a.length;++c<d;)b.push(le(a[c]));return b}};d3.layout.chord=function(){function a(){var a={},c=[],p=d3.range(g),r=[],t,u,w,x,y;d=[];e=[];t=0;for(x=-1;++x<g;){u=0;for(y=-1;++y<g;)u+=f[x][y];c.push(u);r.push(d3.range(g));t+=u}k&&p.sort(function(a,b){return k(c[a],c[b])});l&&r.forEach(function(a,b){a.sort(function(a,c){return l(f[b][a],f[b][c])})});t=(2*Math.PI-h*g)/t;u=0;for(x=-1;++x<g;){w=
u;for(y=-1;++y<g;){var D=p[x],B=r[D][y],A=f[D][B],F=u,v=u+=A*t;a[D+"-"+B]={index:D,subindex:B,startAngle:F,endAngle:v,value:A}}e[D]={index:D,startAngle:w,endAngle:u,value:(u-w)/t};u+=h}for(x=-1;++x<g;)for(y=x-1;++y<g;)p=a[x+"-"+y],r=a[y+"-"+x],(p.value||r.value)&&d.push(p.value<r.value?{source:r,target:p}:{source:p,target:r});m&&b()}function b(){d.sort(function(a,b){return m((a.source.value+a.target.value)/2,(b.source.value+b.target.value)/2)})}var c={},d,e,f,g,h=0,k,l,m;c.matrix=function(a){if(!arguments.length)return f;
g=(f=a)&&f.length;d=e=null;return c};c.padding=function(a){if(!arguments.length)return h;h=a;d=e=null;return c};c.sortGroups=function(a){if(!arguments.length)return k;k=a;d=e=null;return c};c.sortSubgroups=function(a){if(!arguments.length)return l;l=a;d=null;return c};c.sortChords=function(a){if(!arguments.length)return m;m=a;d&&b();return c};c.chords=function(){d||a();return d};c.groups=function(){e||a();return e};return c};d3.layout.force=function(){function a(a){return function(b,c,d,e,f){if(b.point!==
a){d=b.cx-a.x;f=b.cy-a.y;var g=1/Math.sqrt(d*d+f*f);if((e-c)*g<q)return c=b.charge*g*g,a.px-=d*c,a.py-=f*c,!0;b.point&&isFinite(g)&&(c=b.pointCharge*g*g,a.px-=d*c,a.py-=f*c)}return!b.charge}}function b(a){a.px=d3.event.x;a.py=d3.event.y;c.resume()}var c={},d=d3.dispatch("start","tick","end"),e=[1,1],f,g,h=0.9,k=qe,l=re,m=-30,n=0.1,q=0.8,p=[],r=[],t,u,w;c.tick=function(){if(0.005>(g*=0.99))return d.end({type:"end",alpha:g=0}),!0;var b=p.length,c=r.length,f,k,l,q,v,s,K;for(f=0;f<c;++f)if(k=r[f],l=k.source,
q=k.target,s=q.x-l.x,K=q.y-l.y,v=s*s+K*K)v=g*u[f]*((v=Math.sqrt(v))-t[f])/v,s*=v,K*=v,q.x-=s*(v=l.weight/(q.weight+l.weight)),q.y-=K*v,l.x+=s*(v=1-v),l.y+=K*v;if(v=g*n)if(s=e[0]/2,K=e[1]/2,f=-1,v)for(;++f<b;)k=p[f],k.x+=(s-k.x)*v,k.y+=(K-k.y)*v;if(m)for(Xc(c=d3.geom.quadtree(p),g,w),f=-1;++f<b;)(k=p[f]).fixed||c.visit(a(k));for(f=-1;++f<b;)k=p[f],k.fixed?(k.x=k.px,k.y=k.py):(k.x-=(k.px-(k.px=k.x))*h,k.y-=(k.py-(k.py=k.y))*h);d.tick({type:"tick",alpha:g})};c.nodes=function(a){if(!arguments.length)return p;
p=a;return c};c.links=function(a){if(!arguments.length)return r;r=a;return c};c.size=function(a){if(!arguments.length)return e;e=a;return c};c.linkDistance=function(a){if(!arguments.length)return k;k=C(a);return c};c.distance=c.linkDistance;c.linkStrength=function(a){if(!arguments.length)return l;l=C(a);return c};c.friction=function(a){if(!arguments.length)return h;h=a;return c};c.charge=function(a){if(!arguments.length)return m;m="function"===typeof a?a:+a;return c};c.gravity=function(a){if(!arguments.length)return n;
n=a;return c};c.theta=function(a){if(!arguments.length)return q;q=a;return c};c.alpha=function(a){if(!arguments.length)return g;g?g=0<a?a:0:0<a&&(d.start({type:"start",alpha:g=a}),d3.timer(c.tick));return c};c.start=function(){function a(c,e){var h;if(!q){q=[];for(d=0;d<f;++d)q[d]=[];for(d=0;d<g;++d)h=r[d],q[h.source.index].push(h.target),q[h.target.index].push(h.source)}h=q[b];for(var k=-1,l=h.length,n;++k<l;)if(!isNaN(n=h[k][c]))return n;return Math.random()*e}var b,d,f=p.length,g=r.length,h=e[0],
n=e[1],q,s;for(b=0;b<f;++b)(s=p[b]).index=b,s.weight=0;t=[];u=[];for(b=0;b<g;++b)s=r[b],"number"==typeof s.source&&(s.source=p[s.source]),"number"==typeof s.target&&(s.target=p[s.target]),t[b]=k.call(this,s,b),u[b]=l.call(this,s,b),++s.source.weight,++s.target.weight;for(b=0;b<f;++b)s=p[b],isNaN(s.x)&&(s.x=a("x",h)),isNaN(s.y)&&(s.y=a("y",n)),isNaN(s.px)&&(s.px=s.x),isNaN(s.py)&&(s.py=s.y);w=[];if("function"===typeof m)for(b=0;b<f;++b)w[b]=+m.call(this,p[b],b);else for(b=0;b<f;++b)w[b]=m;return c.resume()};
c.resume=function(){return c.alpha(0.1)};c.stop=function(){return c.alpha(0)};c.drag=function(){f||(f=d3.behavior.drag().origin(T).on("dragstart",me).on("drag",b).on("dragend",ne));this.on("mouseover.force",oe).on("mouseout.force",pe).call(f)};return d3.rebind(c,d,"on")};d3.layout.partition=function(){function a(b,c,d,e){var l=b.children;b.x=c;b.y=b.depth*e;b.dx=d;b.dy=e;if(l&&(n=l.length)){var m=-1,n,q;for(d=b.value?d/b.value:0;++m<n;)a(q=l[m],c,b=q.value*d,e),c+=b}}function b(a){a=a.children;var c=
0;if(a&&(e=a.length))for(var d=-1,e;++d<e;)c=Math.max(c,b(a[d]));return 1+c}function c(c,g){var h=d.call(this,c,g);a(h[0],0,e[0],e[1]/b(h[0]));return h}var d=d3.layout.hierarchy(),e=[1,1];c.size=function(a){if(!arguments.length)return e;e=a;return c};return ma(c,d)};d3.layout.pie=function(){function a(f,g){var h=f.map(function(c,d){return+b.call(a,c,d)}),k=+("function"===typeof d?d.apply(this,arguments):d),l=(("function"===typeof e?e.apply(this,arguments):e)-d)/d3.sum(h),m=d3.range(f.length);null!=
c&&m.sort(c===zd?function(a,b){return h[b]-h[a]}:function(a,b){return c(f[a],f[b])});var n=[];m.forEach(function(a){var b;n[a]={data:f[a],value:b=h[a],startAngle:k,endAngle:k+=b*l}});return n}var b=Number,c=zd,d=0,e=2*Math.PI;a.value=function(c){if(!arguments.length)return b;b=c;return a};a.sort=function(b){if(!arguments.length)return c;c=b;return a};a.startAngle=function(b){if(!arguments.length)return d;d=b;return a};a.endAngle=function(b){if(!arguments.length)return e;e=b;return a};return a};var zd=
{};d3.layout.stack=function(){function a(h,k){var l=h.map(function(c,d){return b.call(a,c,d)}),m=l.map(function(b,c){return b.map(function(b,c){return[f.call(a,b,c),g.call(a,b,c)]})}),n=c.call(a,m,k),l=d3.permute(l,n),m=d3.permute(m,n),n=d.call(a,m,k),q=l.length,p=l[0].length,r,t,u;for(t=0;t<p;++t)for(e.call(a,l[0][t],u=n[t],m[0][t][1]),r=1;r<q;++r)e.call(a,l[r][t],u+=m[r-1][t][1],m[r][t][1]);return h}var b=T,c=vb,d=wb,e=ue,f=se,g=te;a.values=function(c){if(!arguments.length)return b;b=c;return a};
a.order=function(b){if(!arguments.length)return c;c="function"===typeof b?b:of.get(b)||vb;return a};a.offset=function(b){if(!arguments.length)return d;d="function"===typeof b?b:pf.get(b)||wb;return a};a.x=function(b){if(!arguments.length)return f;f=b;return a};a.y=function(b){if(!arguments.length)return g;g=b;return a};a.out=function(b){if(!arguments.length)return e;e=b;return a};return a};var of=d3.map({"inside-out":function(a){var b=a.length,c,d=a.map(ve),e=a.map(we),f=d3.range(b).sort(function(a,
b){return d[a]-d[b]}),g=0,h=0,k=[],l=[];for(a=0;a<b;++a)c=f[a],g<h?(g+=e[c],k.push(c)):(h+=e[c],l.push(c));return l.reverse().concat(k)},reverse:function(a){return d3.range(a.length).reverse()},"default":vb}),pf=d3.map({silhouette:function(a){var b=a.length,c=a[0].length,d=[],e=0,f,g,h,k=[];for(g=0;g<c;++g){for(h=f=0;f<b;f++)h+=a[f][g][1];h>e&&(e=h);d.push(h)}for(g=0;g<c;++g)k[g]=(e-d[g])/2;return k},wiggle:function(a){var b=a.length,c=a[0],d=c.length,e,f,g,h,k,l,m,n,q,p=[];p[0]=n=q=0;for(f=1;f<d;++f){for(h=
e=0;e<b;++e)h+=a[e][f][1];k=e=0;for(m=c[f][0]-c[f-1][0];e<b;++e){g=0;for(l=(a[e][f][1]-a[e][f-1][1])/(2*m);g<e;++g)l+=(a[g][f][1]-a[g][f-1][1])/m;k+=l*a[e][f][1]}p[f]=n-=h?k/h*m:0;n<q&&(q=n)}for(f=0;f<d;++f)p[f]-=q;return p},expand:function(a){var b=a.length,c=a[0].length,d=1/b,e,f,g,h=[];for(f=0;f<c;++f){for(g=e=0;e<b;e++)g+=a[e][f][1];if(g)for(e=0;e<b;e++)a[e][f][1]/=g;else for(e=0;e<b;e++)a[e][f][1]=d}for(f=0;f<c;++f)h[f]=0;return h},zero:wb});d3.layout.histogram=function(){function a(a,g){var h=
[],k=a.map(c,this),l=d.call(this,k,g),m=e.call(this,l,k,g),n;g=-1;for(var q=k.length,p=m.length-1,r=b?1:1/q;++g<p;)n=h[g]=[],n.dx=m[g+1]-(n.x=m[g]),n.y=0;if(0<p)for(g=-1;++g<q;)n=k[g],n>=l[0]&&n<=l[1]&&(n=h[d3.bisect(m,n,1,p)-1],n.y+=r,n.push(a[g]));return h}var b=!0,c=Number,d=ze,e=ye;a.value=function(b){if(!arguments.length)return c;c=b;return a};a.range=function(b){if(!arguments.length)return d;d=C(b);return a};a.bins=function(b){if(!arguments.length)return e;e="number"===typeof b?function(a){return Yc(a,
b)}:C(b);return a};a.frequency=function(c){if(!arguments.length)return b;b=!!c;return a};return a};d3.layout.hierarchy=function(){function a(b,h,k){var l=e.call(c,b,h),m=xb?b:{data:b};m.depth=h;k.push(m);if(l&&(n=l.length)){b=-1;var n,q=m.children=[],p=0;h+=1;for(var r;++b<n;)r=a(l[b],h,k),r.parent=m,q.push(r),p+=r.value;d&&q.sort(d);f&&(m.value=p)}else f&&(m.value=+f.call(c,b,h)||0);return m}function b(a,d){var e=a.children,l=0;if(e&&(n=e.length))for(var m=-1,n,q=d+1;++m<n;)l+=b(e[m],q);else f&&
(l=+f.call(c,xb?a:a.data,d)||0);f&&(a.value=l);return l}function c(b){var c=[];a(b,0,c);return c}var d=De,e=Be,f=Ce;c.sort=function(a){if(!arguments.length)return d;d=a;return c};c.children=function(a){if(!arguments.length)return e;e=a;return c};c.value=function(a){if(!arguments.length)return f;f=a;return c};c.revalue=function(a){b(a,0);return a};return c};var xb=!1;d3.layout.pack=function(){function a(a,f){var g=b.call(this,a,f),h=g[0];h.x=0;h.y=0;Q(h,function(a){a.r=Math.sqrt(a.value)});Q(h,ad);
var k=d[0],l=d[1],m=Math.max(2*h.r/k,2*h.r/l);if(0<c){var n=c*m/2;Q(h,function(a){a.r+=n});Q(h,ad);Q(h,function(a){a.r-=n});m=Math.max(2*h.r/k,2*h.r/l)}cd(h,k/2,l/2,1/m);return g}var b=d3.layout.hierarchy().sort(Ee),c=0,d=[1,1];a.size=function(b){if(!arguments.length)return d;d=b;return a};a.padding=function(b){if(!arguments.length)return c;c=+b;return a};return ma(a,b)};d3.layout.cluster=function(){function a(a,f){var g=b.call(this,a,f),h=g[0],k,l=0;Q(h,function(a){var b=a.children;b&&b.length?(a.x=
Ie(b),a.y=He(b)):(a.x=k?l+=c(a,k):0,a.y=0,k=a)});var m=dd(h),n=ed(h),q=m.x-c(m,n)/2,p=n.x+c(n,m)/2;Q(h,function(a){a.x=(a.x-q)/(p-q)*d[0];a.y=(1-(h.y?a.y/h.y:1))*d[1]});return g}var b=d3.layout.hierarchy().sort(null).value(null),c=fd,d=[1,1];a.separation=function(b){if(!arguments.length)return c;c=b;return a};a.size=function(b){if(!arguments.length)return d;d=b;return a};return ma(a,b)};d3.layout.tree=function(){function a(a,f){function g(a,b){var d=a.children,e=a._tree;if(d&&(f=d.length)){for(var f,
h=d[0],k,l=h,n,p=-1;++p<f;){n=d[p];g(n,k);var m=n;if(k){for(var q=m,r=m,t=m.parent.children[0],s=q._tree.mod,z=r._tree.mod,C=k._tree.mod,I=t._tree.mod,G=void 0;k=Ab(k),q=zb(q),k&&q;){t=zb(t);r=Ab(r);r._tree.ancestor=m;G=k._tree.prelim+C-q._tree.prelim-s+c(k,q);if(0<G){var H=k._tree.ancestor.parent==m.parent?k._tree.ancestor:l,E=m,J=G,H=H._tree,E=E._tree,L=J/(E.number-H.number);H.change+=L;E.change-=L;E.shift+=J;E.prelim+=J;E.mod+=J;s+=G;z+=G}C+=k._tree.mod;s+=q._tree.mod;I+=t._tree.mod;z+=r._tree.mod}k&&
!Ab(r)&&(r._tree.thread=k,r._tree.mod+=C-z);q&&!zb(t)&&(t._tree.thread=q,t._tree.mod+=s-I,l=m)}k=n}f=d=0;p=a.children;for(m=p.length;0<=--m;)l=p[m]._tree,l.prelim+=d,l.mod+=d,d+=l.shift+(f+=l.change);h=0.5*(h._tree.prelim+n._tree.prelim);b?(e.prelim=b._tree.prelim+c(a,b),e.mod=e.prelim-h):e.prelim=h}else b&&(e.prelim=b._tree.prelim+c(a,b))}function h(a,b){a.x=a._tree.prelim+b;var c=a.children;if(c&&(e=c.length)){var d=-1,e;for(b+=a._tree.mod;++d<e;)h(c[d],b)}}var k=b.call(this,a,f),l=k[0];Q(l,function(a,
b){a._tree={ancestor:a,prelim:0,mod:0,change:0,shift:0,number:b?b._tree.number+1:0}});g(l);h(l,-l._tree.prelim);var m=Ha(l,Ke),n=Ha(l,Je),q=Ha(l,Le),p=m.x-c(m,n)/2,r=n.x+c(n,m)/2,t=q.depth||1;Q(l,function(a){a.x=(a.x-p)/(r-p)*d[0];a.y=a.depth/t*d[1];delete a._tree});return k}var b=d3.layout.hierarchy().sort(null).value(null),c=fd,d=[1,1];a.separation=function(b){if(!arguments.length)return c;c=b;return a};a.size=function(b){if(!arguments.length)return d;d=b;return a};return ma(a,b)};d3.layout.treemap=
function(){function a(a,b){for(var c=-1,d=a.length,e,f;++c<d;)f=(e=a[c]).value*(0>b?0:b),e.area=isNaN(f)||0>=f?0:f}function b(c){var e=c.children;if(e&&e.length){var f=l(c),g=[],h=e.slice(),k=Infinity,n=Math.min(f.dx,f.dy);a(h,f.dx*f.dy/c.value);for(g.area=0;0<(c=h.length);){g.push(c=h[c-1]);g.area+=c.area;c=n;for(var m=g.area,s=void 0,A=0,z=Infinity,v=-1,C=g.length;++v<C;)if(s=g[v].area)s<z&&(z=s),s>A&&(A=s);m*=m;c*=c;(c=m?Math.max(c*A*q/m,m/(c*z*q)):Infinity)<=k?(h.pop(),k=c):(g.area-=g.pop().area,
d(g,n,f,!1),n=Math.min(f.dx,f.dy),g.length=g.area=0,k=Infinity)}g.length&&(d(g,n,f,!0),g.length=g.area=0);e.forEach(b)}}function c(b){var e=b.children;if(e&&e.length){var f=l(b),g=e.slice(),h=[];a(g,f.dx*f.dy/b.value);for(h.area=0;b=g.pop();)h.push(b),h.area+=b.area,null!=b.z&&(d(h,b.z?f.dx:f.dy,f,!g.length),h.length=h.area=0);e.forEach(c)}}function d(a,b,c,d){var e=-1,f=a.length,h=c.x,k=c.y,l=b?g(a.area/b):0,n;if(b==c.dx){if(d||l>c.dy)l=c.dy;for(;++e<f;)n=a[e],n.x=h,n.y=k,n.dy=l,h+=n.dx=Math.min(c.x+
c.dx-h,l?g(n.area/l):0);n.z=!0;n.dx+=c.x+c.dx-h;c.y+=l;c.dy-=l}else{if(d||l>c.dx)l=c.dx;for(;++e<f;)n=a[e],n.x=h,n.y=k,n.dx=l,k+=n.dy=Math.min(c.y+c.dy-k,l?g(n.area/l):0);n.z=!1;n.dy+=c.y+c.dy-k;c.x+=l;c.dx-=l}}function e(d){d=n||f(d);var e=d[0];e.x=0;e.y=0;e.dx=h[0];e.dy=h[1];n&&f.revalue(e);a([e],e.dx*e.dy/e.value);(n?c:b)(e);m&&(n=d);return d}var f=d3.layout.hierarchy(),g=Math.round,h=[1,1],k=null,l=Bb,m=!1,n,q=0.5*(1+Math.sqrt(5));e.size=function(a){if(!arguments.length)return h;h=a;return e};
e.padding=function(a){function b(c){var d=a.call(e,c,c.depth);return null==d?Bb(c):gd(c,"number"===typeof d?[d,d,d,d]:d)}function c(b){return gd(b,a)}if(!arguments.length)return k;var d;l=null==(k=a)?Bb:"function"===(d=typeof a)?b:"number"===d?(a=[a,a,a,a],c):c;return e};e.round=function(a){if(!arguments.length)return g!=Number;g=a?Math.round:Number;return e};e.sticky=function(a){if(!arguments.length)return m;m=a;n=null;return e};e.ratio=function(a){if(!arguments.length)return q;q=a;return e};return ma(e,
f)};d3.csv=hd(",","text/csv");d3.tsv=hd("\t","text/tab-separated-values");d3.geo={};var s=Math.PI/180;d3.geo.azimuthal=function(){function a(a){var c=a[0]*s-f,g=a[1]*s;a=Math.cos(c);var c=Math.sin(c),q=Math.cos(g),g=Math.sin(g),p="orthographic"!==b?k*g+h*q*a:null,r,p="stereographic"===b?1/(1+p):"gnomonic"===b?1/p:"equidistant"===b?(r=Math.acos(p),r?r/Math.sin(r):0):"equalarea"===b?Math.sqrt(2/(1+p)):1;return[d*p*q*c+e[0],d*p*(k*q*a-h*g)+e[1]]}var b="orthographic",c,d=200,e=[480,250],f,g,h,k;a.invert=
function(a){var c=(a[0]-e[0])/d;a=(a[1]-e[1])/d;var g=Math.sqrt(c*c+a*a),q="stereographic"===b?2*Math.atan(g):"gnomonic"===b?Math.atan(g):"equidistant"===b?g:"equalarea"===b?2*Math.asin(0.5*g):Math.asin(g),p=Math.sin(q),q=Math.cos(q);return[(f+Math.atan2(c*p,g*h*q+a*k*p))/s,Math.asin(q*k-(g?a*p*h/g:0))/s]};a.mode=function(c){if(!arguments.length)return b;b=c+"";return a};a.origin=function(b){if(!arguments.length)return c;c=b;f=c[0]*s;g=c[1]*s;h=Math.cos(g);k=Math.sin(g);return a};a.scale=function(b){if(!arguments.length)return d;
d=+b;return a};a.translate=function(b){if(!arguments.length)return e;e=[+b[0],+b[1]];return a};return a.origin([0,0])};d3.geo.albers=function(){function a(a){var b=h*(s*a[0]-g);a=Math.sqrt(k-2*h*Math.sin(s*a[1]))/h;return[e*a*Math.sin(b)+f[0],e*(a*Math.cos(b)-l)+f[1]]}function b(){var b=s*d[0],e=s*d[1],f=s*c[1],p=Math.sin(b),b=Math.cos(b);g=s*c[0];h=0.5*(p+Math.sin(e));k=b*b+2*h*p;l=Math.sqrt(k-2*h*Math.sin(f))/h;return a}var c=[-98,38],d=[29.5,45.5],e=1E3,f=[480,250],g,h,k,l;a.invert=function(a){var b=
(a[0]-f[0])/e,c=l+(a[1]-f[1])/e;a=Math.atan2(b,c);b=Math.sqrt(b*b+c*c);return[(g+a/h)/s,Math.asin((k-b*b*h*h)/(2*h))/s]};a.origin=function(a){if(!arguments.length)return c;c=[+a[0],+a[1]];return b()};a.parallels=function(a){if(!arguments.length)return d;d=[+a[0],+a[1]];return b()};a.scale=function(b){if(!arguments.length)return e;e=+b;return a};a.translate=function(b){if(!arguments.length)return f;f=[+b[0],+b[1]];return a};return b()};d3.geo.albersUsa=function(){function a(a){var g=a[0],h=a[1];return(50<
h?c:-140>g?d:21>h?e:b)(a)}var b=d3.geo.albers(),c=d3.geo.albers().origin([-160,60]).parallels([55,65]),d=d3.geo.albers().origin([-160,20]).parallels([8,18]),e=d3.geo.albers().origin([-60,10]).parallels([8,18]);a.scale=function(f){if(!arguments.length)return b.scale();b.scale(f);c.scale(0.6*f);d.scale(f);e.scale(1.5*f);return a.translate(b.translate())};a.translate=function(f){if(!arguments.length)return b.translate();var g=b.scale()/1E3,h=f[0],k=f[1];b.translate(f);c.translate([h-400*g,k+170*g]);
d.translate([h-190*g,k+200*g]);e.translate([h+580*g,k+430*g]);return a};return a.scale(b.scale())};d3.geo.bonne=function(){function a(a){var k=a[0]*s-d,l=a[1]*s-e;f?(a=g+f-l,l=k*Math.cos(l)/a,k=a*Math.sin(l),l=a*Math.cos(l)-g):(k*=Math.cos(l),l*=-1);return[b*k+c[0],b*l+c[1]]}var b=200,c=[480,250],d,e,f,g;a.invert=function(a){var e=(a[0]-c[0])/b;a=(a[1]-c[1])/b;if(f){var l=g+a,m=Math.sqrt(e*e+l*l);a=g+f-m;e=d+m*Math.atan2(e,l)/Math.cos(a)}else a*=-1,e/=Math.cos(a);return[e/s,a/s]};a.parallel=function(b){if(!arguments.length)return f/
s;g=1/Math.tan(f=b*s);return a};a.origin=function(b){if(!arguments.length)return[d/s,e/s];d=b[0]*s;e=b[1]*s;return a};a.scale=function(c){if(!arguments.length)return b;b=+c;return a};a.translate=function(b){if(!arguments.length)return c;c=[+b[0],+b[1]];return a};return a.origin([0,0]).parallel(45)};d3.geo.equirectangular=function(){function a(a){return[a[0]/360*b+c[0],-a[1]/360*b+c[1]]}var b=500,c=[480,250];a.invert=function(a){return[(a[0]-c[0])/b*360,(a[1]-c[1])/b*-360]};a.scale=function(c){if(!arguments.length)return b;
b=+c;return a};a.translate=function(b){if(!arguments.length)return c;c=[+b[0],+b[1]];return a};return a};d3.geo.mercator=function(){function a(a){var e=a[0]/360;a=-(Math.log(Math.tan(Math.PI/4+a[1]*s/2))/s)/360;return[b*e+c[0],b*Math.max(-0.5,Math.min(0.5,a))+c[1]]}var b=500,c=[480,250];a.invert=function(a){return[(a[0]-c[0])/b*360,2*Math.atan(Math.exp((a[1]-c[1])/b*-360*s))/s-90]};a.scale=function(c){if(!arguments.length)return b;b=+c;return a};a.translate=function(b){if(!arguments.length)return c;
c=[+b[0],+b[1]];return a};return a};d3.geo.path=function(){function a(a,b){"function"===typeof e&&(f=Cb(e.apply(this,arguments)));k(a);var c=h.length?h.join(""):null;h=[];return c}function b(a){return g(a).join(",")}function c(a){for(var b=Math.abs(d3.geom.polygon(a[0].map(g)).area()),c=0,d=a.length;++c<d;)b-=Math.abs(d3.geom.polygon(a[c].map(g)).area());return b}function d(a){for(var b=d3.geom.polygon(a[0].map(g)),c=b.area(),b=b.centroid(0>c?(c*=-1,1):-1),d=b[0],e=b[1],f=c,h=0,k=a.length;++h<k;)b=
d3.geom.polygon(a[h].map(g)),c=b.area(),b=b.centroid(0>c?(c*=-1,1):-1),d-=b[0],e-=b[1],f-=c;return[d,e,6*f]}var e=4.5,f=Cb(e),g=d3.geo.albersUsa(),h=[],k=Ia({FeatureCollection:function(a){a=a.features;for(var b=-1,c=a.length;++b<c;)h.push(k(a[b].geometry))},Feature:function(a){k(a.geometry)},Point:function(a){h.push("M",b(a.coordinates),f)},MultiPoint:function(a){a=a.coordinates;for(var c=-1,d=a.length;++c<d;)h.push("M",b(a[c]),f)},LineString:function(a){a=a.coordinates;var c=-1,d=a.length;for(h.push("M");++c<
d;)h.push(b(a[c]),"L");h.pop()},MultiLineString:function(a){a=a.coordinates;for(var c=-1,d=a.length,e,f,g;++c<d;){e=a[c];f=-1;g=e.length;for(h.push("M");++f<g;)h.push(b(e[f]),"L");h.pop()}},Polygon:function(a){a=a.coordinates;for(var c=-1,d=a.length,e,f,g;++c<d;)if(e=a[c],f=-1,0<(g=e.length-1)){for(h.push("M");++f<g;)h.push(b(e[f]),"L");h[h.length-1]="Z"}},MultiPolygon:function(a){a=a.coordinates;for(var c=-1,d=a.length,e,f,g,k,l,m;++c<d;)for(e=a[c],f=-1,g=e.length;++f<g;)if(k=e[f],l=-1,0<(m=k.length-
1)){for(h.push("M");++l<m;)h.push(b(k[l]),"L");h[h.length-1]="Z"}},GeometryCollection:function(a){a=a.geometries;for(var b=-1,c=a.length;++b<c;)h.push(k(a[b]))}}),l=a.area=Ia({FeatureCollection:function(a){var b=0;a=a.features;for(var c=-1,d=a.length;++c<d;)b+=l(a[c]);return b},Feature:function(a){return l(a.geometry)},Polygon:function(a){return c(a.coordinates)},MultiPolygon:function(a){var b=0;a=a.coordinates;for(var d=-1,e=a.length;++d<e;)b+=c(a[d]);return b},GeometryCollection:function(a){var b=
0;a=a.geometries;for(var c=-1,d=a.length;++c<d;)b+=l(a[c]);return b}},0),m=a.centroid=Ia({Feature:function(a){return m(a.geometry)},Polygon:function(a){a=d(a.coordinates);return[a[0]/a[2],a[1]/a[2]]},MultiPolygon:function(a){a=a.coordinates;for(var b,c=0,e=0,f=0,g=-1,h=a.length;++g<h;)b=d(a[g]),c+=b[0],e+=b[1],f+=b[2];return[c/f,e/f]}});a.projection=function(b){g=b;return a};a.pointRadius=function(b){"function"===typeof b?e=b:(e=+b,f=Cb(e));return a};return a};d3.geo.bounds=function(a){var b=Infinity,
c=Infinity,d=-Infinity,e=-Infinity;Ja(a,function(a,g){a<b&&(b=a);a>d&&(d=a);g<c&&(c=g);g>e&&(e=g)});return[[b,c],[d,e]]};var id={Feature:function(a,b){Ja(a.geometry,b)},FeatureCollection:function(a,b){for(var c=a.features,d=0,e=c.length;d<e;d++)Ja(c[d].geometry,b)},GeometryCollection:function(a,b){for(var c=a.geometries,d=0,e=c.length;d<e;d++)Ja(c[d],b)},LineString:jd,MultiLineString:function(a,b){for(var c=a.coordinates,d=0,e=c.length;d<e;d++)for(var f=c[d],g=0,h=f.length;g<h;g++)b.apply(null,f[g])},
MultiPoint:jd,MultiPolygon:function(a,b){for(var c=a.coordinates,d=0,e=c.length;d<e;d++)for(var f=c[d][0],g=0,h=f.length;g<h;g++)b.apply(null,f[g])},Point:function(a,b){b.apply(null,a.coordinates)},Polygon:function(a,b){for(var c=a.coordinates[0],d=0,e=c.length;d<e;d++)b.apply(null,c[d])}};d3.geo.circle=function(){function a(){}function b(a){return g.distance(a)<f}function c(a){for(var b=-1,c=a.length,d=[],e,h,r,t,s;++b<c;)s=g.distance(r=a[b]),s<f?(h&&d.push(ld(h,r)((t-f)/(t-s))),d.push(r),e=h=null):
(h=r,!e&&d.length&&(d.push(ld(d[d.length-1],h)((f-t)/(s-t))),e=h)),t=s;e=a[0];h=d[0];!h||r[0]!==e[0]||r[1]!==e[1]||r[0]===h[0]&&r[1]===h[1]||d.push(h);a=0;h=(b=d.length)?[d[0]]:d;for(t=g.source();++a<b;)for(r=g.source(d[a-1])(d[a]).coordinates,c=0,e=r.length;++c<e;)h.push(r[c]);g.source(t);return h}var d=[0,0],e=89.99,f=e*s,g=d3.geo.greatArc().source(d).target(T);a.clip=function(a){"function"===typeof d&&g.source(d.apply(this,arguments));return h(a)||null};var h=Ia({FeatureCollection:function(a){var b=
a.features.map(h).filter(T);return b&&(a=Object.create(a),a.features=b,a)},Feature:function(a){var b=h(a.geometry);return b&&(a=Object.create(a),a.geometry=b,a)},Point:function(a){return b(a.coordinates)&&a},MultiPoint:function(a){var c=a.coordinates.filter(b);return c.length&&{type:a.type,coordinates:c}},LineString:function(a){var b=c(a.coordinates);return b.length&&(a=Object.create(a),a.coordinates=b,a)},MultiLineString:function(a){var b=a.coordinates.map(c).filter(function(a){return a.length});
return b.length&&(a=Object.create(a),a.coordinates=b,a)},Polygon:function(a){var b=a.coordinates.map(c);return b[0].length&&(a=Object.create(a),a.coordinates=b,a)},MultiPolygon:function(a){var b=a.coordinates.map(function(a){return a.map(c)}).filter(function(a){return a[0].length});return b.length&&(a=Object.create(a),a.coordinates=b,a)},GeometryCollection:function(a){var b=a.geometries.map(h).filter(T);return b.length&&(a=Object.create(a),a.geometries=b,a)}});a.origin=function(b){if(!arguments.length)return d;
d=b;"function"!==typeof d&&g.source(d);return a};a.angle=function(b){if(!arguments.length)return e;f=(e=+b)*s;return a};return d3.rebind(a,g,"precision")};d3.geo.greatArc=function(){function a(){for(var b=a.distance.apply(this,arguments),d=0,b=f/b,l=[c];1>(d+=b);)l.push(g(d));l.push(e);return{type:"LineString",coordinates:l}}var b=Me,c,d=Ne,e,f=6*s,g=kd();a.distance=function(){"function"===typeof b&&g.source(c=b.apply(this,arguments));"function"===typeof d&&g.target(e=d.apply(this,arguments));return g.distance()};
a.source=function(d){if(!arguments.length)return b;b=d;"function"!==typeof b&&g.source(c=b);return a};a.target=function(b){if(!arguments.length)return d;d=b;"function"!==typeof d&&g.target(e=d);return a};a.precision=function(b){if(!arguments.length)return f/s;f=b*s;return a};return a};d3.geo.greatCircle=d3.geo.circle;d3.geom={};d3.geom.contour=function(a,b){var c;if(!(c=b))a:{for(var d=c=0;;){if(a(c,d)){c=[c,d];break a}0===c?(c=d+1,d=0):(c-=1,d+=1)}c=void 0}var d=[],e=c[0],f=c[1],g=0,h=0,k=NaN,l=
NaN,h=0;do h=0,a(e-1,f-1)&&(h+=1),a(e,f-1)&&(h+=2),a(e-1,f)&&(h+=4),a(e,f)&&(h+=8),6===h?(g=-1===l?-1:1,h=0):9===h?(g=0,h=1===k?-1:1):(g=qf[h],h=rf[h]),g!=k&&h!=l&&(d.push([e,f]),k=g,l=h),e+=g,f+=h;while(c[0]!=e||c[1]!=f);return d};var qf=[1,0,1,1,-1,0,-1,1,0,0,0,0,-1,0,-1,NaN],rf=[0,-1,0,0,0,-1,0,0,1,-1,1,1,0,-1,0,NaN];d3.geom.hull=function(a){if(3>a.length)return[];var b=a.length,c=b-1,d=[],e=[],f,g=0,h,k,l,m,n,q,p;for(f=1;f<b;++f)a[f][1]<a[g][1]?g=f:a[f][1]==a[g][1]&&(g=a[f][0]<a[g][0]?f:g);for(f=
0;f<b;++f)f!==g&&(k=a[f][1]-a[g][1],h=a[f][0]-a[g][0],d.push({angle:Math.atan2(k,h),index:f}));d.sort(function(a,b){return a.angle-b.angle});p=d[0].angle;q=d[0].index;n=0;for(f=1;f<c;++f)b=d[f].index,p==d[f].angle?(h=a[q][0]-a[g][0],k=a[q][1]-a[g][1],l=a[b][0]-a[g][0],m=a[b][1]-a[g][1],h*h+k*k>=l*l+m*m?d[f].index=-1:(d[n].index=-1,p=d[f].angle,n=f,q=b)):(p=d[f].angle,n=f,q=b);e.push(g);for(b=f=0;2>f;++b)-1!==d[b].index&&(e.push(d[b].index),f++);for(g=e.length;b<c;++b)if(-1!==d[b].index){for(;!Oe(e[g-
2],e[g-1],d[b].index,a);)--g;e[g++]=d[b].index}c=[];for(f=0;f<g;++f)c.push(a[e[f]]);return c};d3.geom.polygon=function(a){a.area=function(){for(var b=0,c=a.length,d=a[c-1][0]*a[0][1],e=a[c-1][1]*a[0][0];++b<c;)d+=a[b-1][0]*a[b][1],e+=a[b-1][1]*a[b][0];return 0.5*(e-d)};a.centroid=function(b){var c=-1,d=a.length,e=0,f=0,g,h=a[d-1],k;for(arguments.length||(b=-1/(6*a.area()));++c<d;)g=h,h=a[c],k=g[0]*h[1]-h[0]*g[1],e+=(g[0]+h[0])*k,f+=(g[1]+h[1])*k;return[e*b,f*b]};a.clip=function(b){for(var c,d=-1,
e=a.length,f,g,h=a[e-1],k,l,m;++d<e;){c=b.slice();b.length=0;k=a[d];l=c[(g=c.length)-1];for(f=-1;++f<g;)m=c[f],Db(m,h,k)?(Db(l,h,k)||b.push(md(l,m,h,k)),b.push(m)):Db(l,h,k)&&b.push(md(l,m,h,k)),l=m;h=k}return b};return a};d3.geom.voronoi=function(a){var b=a.map(function(){return[]});nd(a,function(a){var d,e,f,g;1===a.a&&0<=a.b?(d=a.ep.r,e=a.ep.l):(d=a.ep.l,e=a.ep.r);1===a.a?(f=d?d.y:-1E6,d=a.c-a.b*f,g=e?e.y:1E6,e=a.c-a.b*g):(d=d?d.x:-1E6,f=a.c-a.a*d,e=e?e.x:1E6,g=a.c-a.a*e);d=[d,f];e=[e,g];b[a.region.l.index].push(d,
e);b[a.region.r.index].push(d,e)});return b.map(function(b,d){var e=a[d][0],f=a[d][1];b.forEach(function(a){a.angle=Math.atan2(a[0]-e,a[1]-f)});return b.sort(function(a,b){return a.angle-b.angle}).filter(function(a,d){return!d||1E-10<a.angle-b[d-1].angle})})};var Eb={l:"r",r:"l"};d3.geom.delaunay=function(a){var b=a.map(function(){return[]}),c=[];nd(a,function(c){b[c.region.l.index].push(a[c.region.r.index])});b.forEach(function(b,e){var f=a[e],g=f[0],h=f[1];b.forEach(function(a){a.angle=Math.atan2(a[0]-
g,a[1]-h)});b.sort(function(a,b){return a.angle-b.angle});for(var k=0,l=b.length-1;k<l;k++)c.push([f,b[k],b[k+1]])});return c};d3.geom.quadtree=function(a,b,c,d,e){function f(a,b,c,d,e,f){if(!isNaN(b.x)&&!isNaN(b.y))if(a.leaf){var h=a.point;h?(0.01>Math.abs(h.x-b.x)+Math.abs(h.y-b.y)||(a.point=null,g(a,h,c,d,e,f)),g(a,b,c,d,e,f)):a.point=b}else g(a,b,c,d,e,f)}function g(a,b,c,d,e,g){var h=0.5*(c+e),k=0.5*(d+g),l=b.x>=h,m=b.y>=k,s=(m<<1)+l;a.leaf=!1;a=a.nodes[s]||(a.nodes[s]={leaf:!0,nodes:[],point:null});
l?c=h:e=h;m?d=k:g=k;f(a,b,c,d,e,g)}var h,k=-1,l=a.length;l&&isNaN(a[0].x)&&(a=a.map(Pe));if(5>arguments.length)if(3===arguments.length)e=d=c,c=b;else{b=c=Infinity;for(d=e=-Infinity;++k<l;)h=a[k],h.x<b&&(b=h.x),h.y<c&&(c=h.y),h.x>d&&(d=h.x),h.y>e&&(e=h.y);h=d-b;k=e-c;h>k?e=c+h:d=b+k}var m={leaf:!0,nodes:[],point:null,add:function(a){f(m,a,b,c,d,e)},visit:function(a){na(a,m,b,c,d,e)}};a.forEach(m.add);return m};d3.time={};var G=Date,Sa="Sunday Monday Tuesday Wednesday Thursday Friday Saturday".split(" ");
X.prototype={getDate:function(){return this._.getUTCDate()},getDay:function(){return this._.getUTCDay()},getFullYear:function(){return this._.getUTCFullYear()},getHours:function(){return this._.getUTCHours()},getMilliseconds:function(){return this._.getUTCMilliseconds()},getMinutes:function(){return this._.getUTCMinutes()},getMonth:function(){return this._.getUTCMonth()},getSeconds:function(){return this._.getUTCSeconds()},getTime:function(){return this._.getTime()},getTimezoneOffset:function(){return 0},
valueOf:function(){return this._.valueOf()},setDate:function(){R.setUTCDate.apply(this._,arguments)},setDay:function(){R.setUTCDay.apply(this._,arguments)},setFullYear:function(){R.setUTCFullYear.apply(this._,arguments)},setHours:function(){R.setUTCHours.apply(this._,arguments)},setMilliseconds:function(){R.setUTCMilliseconds.apply(this._,arguments)},setMinutes:function(){R.setUTCMinutes.apply(this._,arguments)},setMonth:function(){R.setUTCMonth.apply(this._,arguments)},setSeconds:function(){R.setUTCSeconds.apply(this._,
arguments)},setTime:function(){R.setTime.apply(this._,arguments)}};var R=Date.prototype,Ad=Sa.map(od),Ta="January February March April May June July August September October November December".split(" "),Pb=Ta.map(od);d3.time.format=function(a){function b(b){for(var e=[],f=-1,g=0,h,k;++f<c;)37==a.charCodeAt(f)&&(e.push(a.substring(g,f),(k=Ua[h=a.charAt(++f)])?k(b):h),g=f+1);e.push(a.substring(g,f));return e.join("")}var c=a.length;b.parse=function(b){var c={y:1900,m:0,d:1,H:0,M:0,S:0,L:0};if(Ka(c,
a,b,0)!=b.length)return null;"p"in c&&(c.H=c.H%12+12*c.p);b=new G;b.setFullYear(c.y,c.m,c.d);b.setHours(c.H,c.M,c.S,c.L);return b};b.toString=function(){return a};return b};var L=d3.format("02d"),Bd=d3.format("03d"),sf=d3.format("04d"),tf=d3.format("2d"),Cd=La(Sa),Dd=La(Ad),Ed=La(Ta),uf=pd(Ta),Fd=La(Pb),vf=pd(Pb),Ua={a:function(a){return Ad[a.getDay()]},A:function(a){return Sa[a.getDay()]},b:function(a){return Pb[a.getMonth()]},B:function(a){return Ta[a.getMonth()]},c:d3.time.format("%a %b %e %H:%M:%S %Y"),
d:function(a){return L(a.getDate())},e:function(a){return tf(a.getDate())},H:function(a){return L(a.getHours())},I:function(a){return L(a.getHours()%12||12)},j:function(a){return Bd(1+d3.time.dayOfYear(a))},L:function(a){return Bd(a.getMilliseconds())},m:function(a){return L(a.getMonth()+1)},M:function(a){return L(a.getMinutes())},p:function(a){return 12<=a.getHours()?"PM":"AM"},S:function(a){return L(a.getSeconds())},U:function(a){return L(d3.time.sundayOfYear(a))},w:function(a){return a.getDay()},
W:function(a){return L(d3.time.mondayOfYear(a))},x:d3.time.format("%m/%d/%y"),X:d3.time.format("%H:%M:%S"),y:function(a){return L(a.getFullYear()%100)},Y:function(a){return sf(a.getFullYear()%1E4)},Z:function(a){var b=a.getTimezoneOffset();a=0<b?"-":"+";var c=~~(Math.abs(b)/60),b=Math.abs(b)%60;return a+L(c)+L(b)},"%":function(a){return"%"}},Qe={a:function(a,b,c){Dd.lastIndex=0;return(a=Dd.exec(b.substring(c)))?c+a[0].length:-1},A:function(a,b,c){Cd.lastIndex=0;return(a=Cd.exec(b.substring(c)))?c+
a[0].length:-1},b:function(a,b,c){Fd.lastIndex=0;return(b=Fd.exec(b.substring(c)))?(a.m=vf.get(b[0].toLowerCase()),c+b[0].length):-1},B:function(a,b,c){Ed.lastIndex=0;return(b=Ed.exec(b.substring(c)))?(a.m=uf.get(b[0].toLowerCase()),c+b[0].length):-1},c:function(a,b,c){return Ka(a,Ua.c.toString(),b,c)},d:qd,e:qd,H:rd,I:rd,L:function(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+3)))?(a.L=+b[0],c+b[0].length):-1},m:function(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+2)))?(a.m=b[0]-
1,c+b[0].length):-1},M:function(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+2)))?(a.M=+b[0],c+b[0].length):-1},p:function(a,b,c){b=wf.get(b.substring(c,c+=2).toLowerCase());return null==b?-1:(a.p=b,c)},S:function(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+2)))?(a.S=+b[0],c+b[0].length):-1},x:function(a,b,c){return Ka(a,Ua.x.toString(),b,c)},X:function(a,b,c){return Ka(a,Ua.X.toString(),b,c)},y:function(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+2)))?(a.y=+b[0]+(68<+b[0]?
1900:2E3),c+b[0].length):-1},Y:function(a,b,c){I.lastIndex=0;return(b=I.exec(b.substring(c,c+4)))?(a.y=+b[0],c+b[0].length):-1}},I=/^\s*\d+/,wf=d3.map({am:0,pm:1});d3.time.format.utc=function(a){function b(a){try{G=X;var b=new G;b._=a;return c(b)}finally{G=Date}}var c=d3.time.format(a);b.parse=function(a){try{G=X;var b=c.parse(a);return b&&b._}finally{G=Date}};b.toString=c.toString;return b};var Gd=d3.time.format.utc("%Y-%m-%dT%H:%M:%S.%LZ");d3.time.format.iso=Date.prototype.toISOString?Fb:Gd;Fb.parse=
function(a){a=new Date(a);return isNaN(a)?null:a};Fb.toString=Gd.toString;d3.time.second=Y(function(a){return new G(1E3*Math.floor(a/1E3))},function(a,b){a.setTime(a.getTime()+1E3*Math.floor(b))},function(a){return a.getSeconds()});d3.time.seconds=d3.time.second.range;d3.time.seconds.utc=d3.time.second.utc.range;d3.time.minute=Y(function(a){return new G(6E4*Math.floor(a/6E4))},function(a,b){a.setTime(a.getTime()+6E4*Math.floor(b))},function(a){return a.getMinutes()});d3.time.minutes=d3.time.minute.range;
d3.time.minutes.utc=d3.time.minute.utc.range;d3.time.hour=Y(function(a){var b=a.getTimezoneOffset()/60;return new G(36E5*(Math.floor(a/36E5-b)+b))},function(a,b){a.setTime(a.getTime()+36E5*Math.floor(b))},function(a){return a.getHours()});d3.time.hours=d3.time.hour.range;d3.time.hours.utc=d3.time.hour.utc.range;d3.time.day=Y(function(a){var b=new G(1970,0);b.setFullYear(a.getFullYear(),a.getMonth(),a.getDate());return b},function(a,b){a.setDate(a.getDate()+b)},function(a){return a.getDate()-1});d3.time.days=
d3.time.day.range;d3.time.days.utc=d3.time.day.utc.range;d3.time.dayOfYear=function(a){var b=d3.time.year(a);return Math.floor((a-b-6E4*(a.getTimezoneOffset()-b.getTimezoneOffset()))/864E5)};Sa.forEach(function(a,b){a=a.toLowerCase();b=7-b;var c=d3.time[a]=Y(function(a){(a=d3.time.day(a)).setDate(a.getDate()-(a.getDay()+b)%7);return a},function(a,b){a.setDate(a.getDate()+7*Math.floor(b))},function(a){var c=d3.time.year(a).getDay();return Math.floor((d3.time.dayOfYear(a)+(c+b)%7)/7)-(c!==b)});d3.time[a+
"s"]=c.range;d3.time[a+"s"].utc=c.utc.range;d3.time[a+"OfYear"]=function(a){var c=d3.time.year(a).getDay();return Math.floor((d3.time.dayOfYear(a)+(c+b)%7)/7)}});d3.time.week=d3.time.sunday;d3.time.weeks=d3.time.sunday.range;d3.time.weeks.utc=d3.time.sunday.utc.range;d3.time.weekOfYear=d3.time.sundayOfYear;d3.time.month=Y(function(a){a=d3.time.day(a);a.setDate(1);return a},function(a,b){a.setMonth(a.getMonth()+b)},function(a){return a.getMonth()});d3.time.months=d3.time.month.range;d3.time.months.utc=
d3.time.month.utc.range;d3.time.year=Y(function(a){a=d3.time.day(a);a.setMonth(0,1);return a},function(a,b){a.setFullYear(a.getFullYear()+b)},function(a){return a.getFullYear()});d3.time.years=d3.time.year.range;d3.time.years.utc=d3.time.year.utc.range;var Na=[1E3,5E3,15E3,3E4,6E4,3E5,9E5,18E5,36E5,108E5,216E5,432E5,864E5,1728E5,6048E5,2592E6,7776E6,31536E6],Qb=[[d3.time.second,1],[d3.time.second,5],[d3.time.second,15],[d3.time.second,30],[d3.time.minute,1],[d3.time.minute,5],[d3.time.minute,15],
[d3.time.minute,30],[d3.time.hour,1],[d3.time.hour,3],[d3.time.hour,6],[d3.time.hour,12],[d3.time.day,1],[d3.time.day,2],[d3.time.week,1],[d3.time.month,1],[d3.time.month,3],[d3.time.year,1]],xf=[[d3.time.format("%Y"),function(a){return!0}],[d3.time.format("%B"),function(a){return a.getMonth()}],[d3.time.format("%b %d"),function(a){return 1!=a.getDate()}],[d3.time.format("%a %d"),function(a){return a.getDay()&&1!=a.getDate()}],[d3.time.format("%I %p"),function(a){return a.getHours()}],[d3.time.format("%I:%M"),
function(a){return a.getMinutes()}],[d3.time.format(":%S"),function(a){return a.getSeconds()}],[d3.time.format(".%L"),function(a){return a.getMilliseconds()}]],Hd=d3.scale.linear(),yf=sd(xf);Qb.year=function(a,b){return Hd.domain(a.map(Re)).ticks(b).map(Ib)};d3.time.scale=function(){return Gb(d3.scale.linear(),Qb,yf)};var Id=Qb.map(function(a){return[a[0].utc,a[1]]}),zf=[[d3.time.format.utc("%Y"),function(a){return!0}],[d3.time.format.utc("%B"),function(a){return a.getUTCMonth()}],[d3.time.format.utc("%b %d"),
function(a){return 1!=a.getUTCDate()}],[d3.time.format.utc("%a %d"),function(a){return a.getUTCDay()&&1!=a.getUTCDate()}],[d3.time.format.utc("%I %p"),function(a){return a.getUTCHours()}],[d3.time.format.utc("%I:%M"),function(a){return a.getUTCMinutes()}],[d3.time.format.utc(":%S"),function(a){return a.getUTCSeconds()}],[d3.time.format.utc(".%L"),function(a){return a.getUTCMilliseconds()}]],Af=sd(zf);Id.year=function(a,b){return Hd.domain(a.map(Se)).ticks(b).map(Jb)};d3.time.scale.utc=function(){return Gb(d3.scale.linear(),
Id,Af)}})();
d3 = function() {
  var d3 = {
    version: "3.3.8"
  };
  if (!Date.now) Date.now = function() {
    return +new Date();
  };
  var d3_arraySlice = [].slice, d3_array = function(list) {
    return d3_arraySlice.call(list);
  };
  var d3_document = document, d3_documentElement = d3_document.documentElement, d3_window = window;
  try {
    d3_array(d3_documentElement.childNodes)[0].nodeType;
  } catch (e) {
    d3_array = function(list) {
      var i = list.length, array = new Array(i);
      while (i--) array[i] = list[i];
      return array;
    };
  }
  try {
    d3_document.createElement("div").style.setProperty("opacity", 0, "");
  } catch (error) {
    var d3_element_prototype = d3_window.Element.prototype, d3_element_setAttribute = d3_element_prototype.setAttribute, d3_element_setAttributeNS = d3_element_prototype.setAttributeNS, d3_style_prototype = d3_window.CSSStyleDeclaration.prototype, d3_style_setProperty = d3_style_prototype.setProperty;
    d3_element_prototype.setAttribute = function(name, value) {
      d3_element_setAttribute.call(this, name, value + "");
    };
    d3_element_prototype.setAttributeNS = function(space, local, value) {
      d3_element_setAttributeNS.call(this, space, local, value + "");
    };
    d3_style_prototype.setProperty = function(name, value, priority) {
      d3_style_setProperty.call(this, name, value + "", priority);
    };
  }
  d3.ascending = function(a, b) {
    return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
  };
  d3.descending = function(a, b) {
    return b < a ? -1 : b > a ? 1 : b >= a ? 0 : NaN;
  };
  d3.min = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && a > b) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && a > b) a = b;
    }
    return a;
  };
  d3.max = function(array, f) {
    var i = -1, n = array.length, a, b;
    if (arguments.length === 1) {
      while (++i < n && !((a = array[i]) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = array[i]) != null && b > a) a = b;
    } else {
      while (++i < n && !((a = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null && b > a) a = b;
    }
    return a;
  };
  d3.extent = function(array, f) {
    var i = -1, n = array.length, a, b, c;
    if (arguments.length === 1) {
      while (++i < n && !((a = c = array[i]) != null && a <= a)) a = c = undefined;
      while (++i < n) if ((b = array[i]) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    } else {
      while (++i < n && !((a = c = f.call(array, array[i], i)) != null && a <= a)) a = undefined;
      while (++i < n) if ((b = f.call(array, array[i], i)) != null) {
        if (a > b) a = b;
        if (c < b) c = b;
      }
    }
    return [ a, c ];
  };
  d3.sum = function(array, f) {
    var s = 0, n = array.length, a, i = -1;
    if (arguments.length === 1) {
      while (++i < n) if (!isNaN(a = +array[i])) s += a;
    } else {
      while (++i < n) if (!isNaN(a = +f.call(array, array[i], i))) s += a;
    }
    return s;
  };
  function d3_number(x) {
    return x != null && !isNaN(x);
  }
  d3.mean = function(array, f) {
    var n = array.length, a, m = 0, i = -1, j = 0;
    if (arguments.length === 1) {
      while (++i < n) if (d3_number(a = array[i])) m += (a - m) / ++j;
    } else {
      while (++i < n) if (d3_number(a = f.call(array, array[i], i))) m += (a - m) / ++j;
    }
    return j ? m : undefined;
  };
  d3.quantile = function(values, p) {
    var H = (values.length - 1) * p + 1, h = Math.floor(H), v = +values[h - 1], e = H - h;
    return e ? v + e * (values[h] - v) : v;
  };
  d3.median = function(array, f) {
    if (arguments.length > 1) array = array.map(f);
    array = array.filter(d3_number);
    return array.length ? d3.quantile(array.sort(d3.ascending), .5) : undefined;
  };
  d3.bisector = function(f) {
    return {
      left: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (f.call(a, a[mid], mid) < x) lo = mid + 1; else hi = mid;
        }
        return lo;
      },
      right: function(a, x, lo, hi) {
        if (arguments.length < 3) lo = 0;
        if (arguments.length < 4) hi = a.length;
        while (lo < hi) {
          var mid = lo + hi >>> 1;
          if (x < f.call(a, a[mid], mid)) hi = mid; else lo = mid + 1;
        }
        return lo;
      }
    };
  };
  var d3_bisector = d3.bisector(function(d) {
    return d;
  });
  d3.bisectLeft = d3_bisector.left;
  d3.bisect = d3.bisectRight = d3_bisector.right;
  d3.shuffle = function(array) {
    var m = array.length, t, i;
    while (m) {
      i = Math.random() * m-- | 0;
      t = array[m], array[m] = array[i], array[i] = t;
    }
    return array;
  };
  d3.permute = function(array, indexes) {
    var i = indexes.length, permutes = new Array(i);
    while (i--) permutes[i] = array[indexes[i]];
    return permutes;
  };
  d3.pairs = function(array) {
    var i = 0, n = array.length - 1, p0, p1 = array[0], pairs = new Array(n < 0 ? 0 : n);
    while (i < n) pairs[i] = [ p0 = p1, p1 = array[++i] ];
    return pairs;
  };
  d3.zip = function() {
    if (!(n = arguments.length)) return [];
    for (var i = -1, m = d3.min(arguments, d3_zipLength), zips = new Array(m); ++i < m; ) {
      for (var j = -1, n, zip = zips[i] = new Array(n); ++j < n; ) {
        zip[j] = arguments[j][i];
      }
    }
    return zips;
  };
  function d3_zipLength(d) {
    return d.length;
  }
  d3.transpose = function(matrix) {
    return d3.zip.apply(d3, matrix);
  };
  d3.keys = function(map) {
    var keys = [];
    for (var key in map) keys.push(key);
    return keys;
  };
  d3.values = function(map) {
    var values = [];
    for (var key in map) values.push(map[key]);
    return values;
  };
  d3.entries = function(map) {
    var entries = [];
    for (var key in map) entries.push({
      key: key,
      value: map[key]
    });
    return entries;
  };
  d3.merge = function(arrays) {
    var n = arrays.length, m, i = -1, j = 0, merged, array;
    while (++i < n) j += arrays[i].length;
    merged = new Array(j);
    while (--n >= 0) {
      array = arrays[n];
      m = array.length;
      while (--m >= 0) {
        merged[--j] = array[m];
      }
    }
    return merged;
  };
  var abs = Math.abs;
  d3.range = function(start, stop, step) {
    if (arguments.length < 3) {
      step = 1;
      if (arguments.length < 2) {
        stop = start;
        start = 0;
      }
    }
    if ((stop - start) / step === Infinity) throw new Error("infinite range");
    var range = [], k = d3_range_integerScale(abs(step)), i = -1, j;
    start *= k, stop *= k, step *= k;
    if (step < 0) while ((j = start + step * ++i) > stop) range.push(j / k); else while ((j = start + step * ++i) < stop) range.push(j / k);
    return range;
  };
  function d3_range_integerScale(x) {
    var k = 1;
    while (x * k % 1) k *= 10;
    return k;
  }
  function d3_class(ctor, properties) {
    try {
      for (var key in properties) {
        Object.defineProperty(ctor.prototype, key, {
          value: properties[key],
          enumerable: false
        });
      }
    } catch (e) {
      ctor.prototype = properties;
    }
  }
  d3.map = function(object) {
    var map = new d3_Map();
    if (object instanceof d3_Map) object.forEach(function(key, value) {
      map.set(key, value);
    }); else for (var key in object) map.set(key, object[key]);
    return map;
  };
  function d3_Map() {}
  d3_class(d3_Map, {
    has: function(key) {
      return d3_map_prefix + key in this;
    },
    get: function(key) {
      return this[d3_map_prefix + key];
    },
    set: function(key, value) {
      return this[d3_map_prefix + key] = value;
    },
    remove: function(key) {
      key = d3_map_prefix + key;
      return key in this && delete this[key];
    },
    keys: function() {
      var keys = [];
      this.forEach(function(key) {
        keys.push(key);
      });
      return keys;
    },
    values: function() {
      var values = [];
      this.forEach(function(key, value) {
        values.push(value);
      });
      return values;
    },
    entries: function() {
      var entries = [];
      this.forEach(function(key, value) {
        entries.push({
          key: key,
          value: value
        });
      });
      return entries;
    },
    forEach: function(f) {
      for (var key in this) {
        if (key.charCodeAt(0) === d3_map_prefixCode) {
          f.call(this, key.substring(1), this[key]);
        }
      }
    }
  });
  var d3_map_prefix = "\x00", d3_map_prefixCode = d3_map_prefix.charCodeAt(0);
  d3.nest = function() {
    var nest = {}, keys = [], sortKeys = [], sortValues, rollup;
    function map(mapType, array, depth) {
      if (depth >= keys.length) return rollup ? rollup.call(nest, array) : sortValues ? array.sort(sortValues) : array;
      var i = -1, n = array.length, key = keys[depth++], keyValue, object, setter, valuesByKey = new d3_Map(), values;
      while (++i < n) {
        if (values = valuesByKey.get(keyValue = key(object = array[i]))) {
          values.push(object);
        } else {
          valuesByKey.set(keyValue, [ object ]);
        }
      }
      if (mapType) {
        object = mapType();
        setter = function(keyValue, values) {
          object.set(keyValue, map(mapType, values, depth));
        };
      } else {
        object = {};
        setter = function(keyValue, values) {
          object[keyValue] = map(mapType, values, depth);
        };
      }
      valuesByKey.forEach(setter);
      return object;
    }
    function entries(map, depth) {
      if (depth >= keys.length) return map;
      var array = [], sortKey = sortKeys[depth++];
      map.forEach(function(key, keyMap) {
        array.push({
          key: key,
          values: entries(keyMap, depth)
        });
      });
      return sortKey ? array.sort(function(a, b) {
        return sortKey(a.key, b.key);
      }) : array;
    }
    nest.map = function(array, mapType) {
      return map(mapType, array, 0);
    };
    nest.entries = function(array) {
      return entries(map(d3.map, array, 0), 0);
    };
    nest.key = function(d) {
      keys.push(d);
      return nest;
    };
    nest.sortKeys = function(order) {
      sortKeys[keys.length - 1] = order;
      return nest;
    };
    nest.sortValues = function(order) {
      sortValues = order;
      return nest;
    };
    nest.rollup = function(f) {
      rollup = f;
      return nest;
    };
    return nest;
  };
  d3.set = function(array) {
    var set = new d3_Set();
    if (array) for (var i = 0, n = array.length; i < n; ++i) set.add(array[i]);
    return set;
  };
  function d3_Set() {}
  d3_class(d3_Set, {
    has: function(value) {
      return d3_map_prefix + value in this;
    },
    add: function(value) {
      this[d3_map_prefix + value] = true;
      return value;
    },
    remove: function(value) {
      value = d3_map_prefix + value;
      return value in this && delete this[value];
    },
    values: function() {
      var values = [];
      this.forEach(function(value) {
        values.push(value);
      });
      return values;
    },
    forEach: function(f) {
      for (var value in this) {
        if (value.charCodeAt(0) === d3_map_prefixCode) {
          f.call(this, value.substring(1));
        }
      }
    }
  });
  d3.behavior = {};
  d3.rebind = function(target, source) {
    var i = 1, n = arguments.length, method;
    while (++i < n) target[method = arguments[i]] = d3_rebind(target, source, source[method]);
    return target;
  };
  function d3_rebind(target, source, method) {
    return function() {
      var value = method.apply(source, arguments);
      return value === source ? target : value;
    };
  }
  function d3_vendorSymbol(object, name) {
    if (name in object) return name;
    name = name.charAt(0).toUpperCase() + name.substring(1);
    for (var i = 0, n = d3_vendorPrefixes.length; i < n; ++i) {
      var prefixName = d3_vendorPrefixes[i] + name;
      if (prefixName in object) return prefixName;
    }
  }
  var d3_vendorPrefixes = [ "webkit", "ms", "moz", "Moz", "o", "O" ];
  function d3_noop() {}
  d3.dispatch = function() {
    var dispatch = new d3_dispatch(), i = -1, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    return dispatch;
  };
  function d3_dispatch() {}
  d3_dispatch.prototype.on = function(type, listener) {
    var i = type.indexOf("."), name = "";
    if (i >= 0) {
      name = type.substring(i + 1);
      type = type.substring(0, i);
    }
    if (type) return arguments.length < 2 ? this[type].on(name) : this[type].on(name, listener);
    if (arguments.length === 2) {
      if (listener == null) for (type in this) {
        if (this.hasOwnProperty(type)) this[type].on(name, null);
      }
      return this;
    }
  };
  function d3_dispatch_event(dispatch) {
    var listeners = [], listenerByName = new d3_Map();
    function event() {
      var z = listeners, i = -1, n = z.length, l;
      while (++i < n) if (l = z[i].on) l.apply(this, arguments);
      return dispatch;
    }
    event.on = function(name, listener) {
      var l = listenerByName.get(name), i;
      if (arguments.length < 2) return l && l.on;
      if (l) {
        l.on = null;
        listeners = listeners.slice(0, i = listeners.indexOf(l)).concat(listeners.slice(i + 1));
        listenerByName.remove(name);
      }
      if (listener) listeners.push(listenerByName.set(name, {
        on: listener
      }));
      return dispatch;
    };
    return event;
  }
  d3.event = null;
  function d3_eventPreventDefault() {
    d3.event.preventDefault();
  }
  function d3_eventSource() {
    var e = d3.event, s;
    while (s = e.sourceEvent) e = s;
    return e;
  }
  function d3_eventDispatch(target) {
    var dispatch = new d3_dispatch(), i = 0, n = arguments.length;
    while (++i < n) dispatch[arguments[i]] = d3_dispatch_event(dispatch);
    dispatch.of = function(thiz, argumentz) {
      return function(e1) {
        try {
          var e0 = e1.sourceEvent = d3.event;
          e1.target = target;
          d3.event = e1;
          dispatch[e1.type].apply(thiz, argumentz);
        } finally {
          d3.event = e0;
        }
      };
    };
    return dispatch;
  }
  d3.requote = function(s) {
    return s.replace(d3_requote_re, "\\$&");
  };
  var d3_requote_re = /[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g;
  var d3_subclass = {}.__proto__ ? function(object, prototype) {
    object.__proto__ = prototype;
  } : function(object, prototype) {
    for (var property in prototype) object[property] = prototype[property];
  };
  function d3_selection(groups) {
    d3_subclass(groups, d3_selectionPrototype);
    return groups;
  }
  var d3_select = function(s, n) {
    return n.querySelector(s);
  }, d3_selectAll = function(s, n) {
    return n.querySelectorAll(s);
  }, d3_selectMatcher = d3_documentElement[d3_vendorSymbol(d3_documentElement, "matchesSelector")], d3_selectMatches = function(n, s) {
    return d3_selectMatcher.call(n, s);
  };
  if (typeof Sizzle === "function") {
    d3_select = function(s, n) {
      return Sizzle(s, n)[0] || null;
    };
    d3_selectAll = function(s, n) {
      return Sizzle.uniqueSort(Sizzle(s, n));
    };
    d3_selectMatches = Sizzle.matchesSelector;
  }
  d3.selection = function() {
    return d3_selectionRoot;
  };
  var d3_selectionPrototype = d3.selection.prototype = [];
  d3_selectionPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, group, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(subnode = selector.call(node, node.__data__, i, j));
          if (subnode && "__data__" in node) subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selector(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_select(selector, this);
    };
  }
  d3_selectionPrototype.selectAll = function(selector) {
    var subgroups = [], subgroup, node;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroups.push(subgroup = d3_array(selector.call(node, node.__data__, i, j)));
          subgroup.parentNode = node;
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_selectorAll(selector) {
    return typeof selector === "function" ? selector : function() {
      return d3_selectAll(selector, this);
    };
  }
  var d3_nsPrefix = {
    svg: "http://www.w3.org/2000/svg",
    xhtml: "http://www.w3.org/1999/xhtml",
    xlink: "http://www.w3.org/1999/xlink",
    xml: "http://www.w3.org/XML/1998/namespace",
    xmlns: "http://www.w3.org/2000/xmlns/"
  };
  d3.ns = {
    prefix: d3_nsPrefix,
    qualify: function(name) {
      var i = name.indexOf(":"), prefix = name;
      if (i >= 0) {
        prefix = name.substring(0, i);
        name = name.substring(i + 1);
      }
      return d3_nsPrefix.hasOwnProperty(prefix) ? {
        space: d3_nsPrefix[prefix],
        local: name
      } : name;
    }
  };
  d3_selectionPrototype.attr = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node();
        name = d3.ns.qualify(name);
        return name.local ? node.getAttributeNS(name.space, name.local) : node.getAttribute(name);
      }
      for (value in name) this.each(d3_selection_attr(value, name[value]));
      return this;
    }
    return this.each(d3_selection_attr(name, value));
  };
  function d3_selection_attr(name, value) {
    name = d3.ns.qualify(name);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrConstant() {
      this.setAttribute(name, value);
    }
    function attrConstantNS() {
      this.setAttributeNS(name.space, name.local, value);
    }
    function attrFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttribute(name); else this.setAttribute(name, x);
    }
    function attrFunctionNS() {
      var x = value.apply(this, arguments);
      if (x == null) this.removeAttributeNS(name.space, name.local); else this.setAttributeNS(name.space, name.local, x);
    }
    return value == null ? name.local ? attrNullNS : attrNull : typeof value === "function" ? name.local ? attrFunctionNS : attrFunction : name.local ? attrConstantNS : attrConstant;
  }
  function d3_collapse(s) {
    return s.trim().replace(/\s+/g, " ");
  }
  d3_selectionPrototype.classed = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") {
        var node = this.node(), n = (name = name.trim().split(/^|\s+/g)).length, i = -1;
        if (value = node.classList) {
          while (++i < n) if (!value.contains(name[i])) return false;
        } else {
          value = node.getAttribute("class");
          while (++i < n) if (!d3_selection_classedRe(name[i]).test(value)) return false;
        }
        return true;
      }
      for (value in name) this.each(d3_selection_classed(value, name[value]));
      return this;
    }
    return this.each(d3_selection_classed(name, value));
  };
  function d3_selection_classedRe(name) {
    return new RegExp("(?:^|\\s+)" + d3.requote(name) + "(?:\\s+|$)", "g");
  }
  function d3_selection_classed(name, value) {
    name = name.trim().split(/\s+/).map(d3_selection_classedName);
    var n = name.length;
    function classedConstant() {
      var i = -1;
      while (++i < n) name[i](this, value);
    }
    function classedFunction() {
      var i = -1, x = value.apply(this, arguments);
      while (++i < n) name[i](this, x);
    }
    return typeof value === "function" ? classedFunction : classedConstant;
  }
  function d3_selection_classedName(name) {
    var re = d3_selection_classedRe(name);
    return function(node, value) {
      if (c = node.classList) return value ? c.add(name) : c.remove(name);
      var c = node.getAttribute("class") || "";
      if (value) {
        re.lastIndex = 0;
        if (!re.test(c)) node.setAttribute("class", d3_collapse(c + " " + name));
      } else {
        node.setAttribute("class", d3_collapse(c.replace(re, " ")));
      }
    };
  }
  d3_selectionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.each(d3_selection_style(priority, name[priority], value));
        return this;
      }
      if (n < 2) return d3_window.getComputedStyle(this.node(), null).getPropertyValue(name);
      priority = "";
    }
    return this.each(d3_selection_style(name, value, priority));
  };
  function d3_selection_style(name, value, priority) {
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleConstant() {
      this.style.setProperty(name, value, priority);
    }
    function styleFunction() {
      var x = value.apply(this, arguments);
      if (x == null) this.style.removeProperty(name); else this.style.setProperty(name, x, priority);
    }
    return value == null ? styleNull : typeof value === "function" ? styleFunction : styleConstant;
  }
  d3_selectionPrototype.property = function(name, value) {
    if (arguments.length < 2) {
      if (typeof name === "string") return this.node()[name];
      for (value in name) this.each(d3_selection_property(value, name[value]));
      return this;
    }
    return this.each(d3_selection_property(name, value));
  };
  function d3_selection_property(name, value) {
    function propertyNull() {
      delete this[name];
    }
    function propertyConstant() {
      this[name] = value;
    }
    function propertyFunction() {
      var x = value.apply(this, arguments);
      if (x == null) delete this[name]; else this[name] = x;
    }
    return value == null ? propertyNull : typeof value === "function" ? propertyFunction : propertyConstant;
  }
  d3_selectionPrototype.text = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.textContent = v == null ? "" : v;
    } : value == null ? function() {
      this.textContent = "";
    } : function() {
      this.textContent = value;
    }) : this.node().textContent;
  };
  d3_selectionPrototype.html = function(value) {
    return arguments.length ? this.each(typeof value === "function" ? function() {
      var v = value.apply(this, arguments);
      this.innerHTML = v == null ? "" : v;
    } : value == null ? function() {
      this.innerHTML = "";
    } : function() {
      this.innerHTML = value;
    }) : this.node().innerHTML;
  };
  d3_selectionPrototype.append = function(name) {
    name = d3_selection_creator(name);
    return this.select(function() {
      return this.appendChild(name.apply(this, arguments));
    });
  };
  function d3_selection_creator(name) {
    return typeof name === "function" ? name : (name = d3.ns.qualify(name)).local ? function() {
      return this.ownerDocument.createElementNS(name.space, name.local);
    } : function() {
      return this.ownerDocument.createElementNS(this.namespaceURI, name);
    };
  }
  d3_selectionPrototype.insert = function(name, before) {
    name = d3_selection_creator(name);
    before = d3_selection_selector(before);
    return this.select(function() {
      return this.insertBefore(name.apply(this, arguments), before.apply(this, arguments) || null);
    });
  };
  d3_selectionPrototype.remove = function() {
    return this.each(function() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    });
  };
  d3_selectionPrototype.data = function(value, key) {
    var i = -1, n = this.length, group, node;
    if (!arguments.length) {
      value = new Array(n = (group = this[0]).length);
      while (++i < n) {
        if (node = group[i]) {
          value[i] = node.__data__;
        }
      }
      return value;
    }
    function bind(group, groupData) {
      var i, n = group.length, m = groupData.length, n0 = Math.min(n, m), updateNodes = new Array(m), enterNodes = new Array(m), exitNodes = new Array(n), node, nodeData;
      if (key) {
        var nodeByKeyValue = new d3_Map(), dataByKeyValue = new d3_Map(), keyValues = [], keyValue;
        for (i = -1; ++i < n; ) {
          keyValue = key.call(node = group[i], node.__data__, i);
          if (nodeByKeyValue.has(keyValue)) {
            exitNodes[i] = node;
          } else {
            nodeByKeyValue.set(keyValue, node);
          }
          keyValues.push(keyValue);
        }
        for (i = -1; ++i < m; ) {
          keyValue = key.call(groupData, nodeData = groupData[i], i);
          if (node = nodeByKeyValue.get(keyValue)) {
            updateNodes[i] = node;
            node.__data__ = nodeData;
          } else if (!dataByKeyValue.has(keyValue)) {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
          dataByKeyValue.set(keyValue, nodeData);
          nodeByKeyValue.remove(keyValue);
        }
        for (i = -1; ++i < n; ) {
          if (nodeByKeyValue.has(keyValues[i])) {
            exitNodes[i] = group[i];
          }
        }
      } else {
        for (i = -1; ++i < n0; ) {
          node = group[i];
          nodeData = groupData[i];
          if (node) {
            node.__data__ = nodeData;
            updateNodes[i] = node;
          } else {
            enterNodes[i] = d3_selection_dataNode(nodeData);
          }
        }
        for (;i < m; ++i) {
          enterNodes[i] = d3_selection_dataNode(groupData[i]);
        }
        for (;i < n; ++i) {
          exitNodes[i] = group[i];
        }
      }
      enterNodes.update = updateNodes;
      enterNodes.parentNode = updateNodes.parentNode = exitNodes.parentNode = group.parentNode;
      enter.push(enterNodes);
      update.push(updateNodes);
      exit.push(exitNodes);
    }
    var enter = d3_selection_enter([]), update = d3_selection([]), exit = d3_selection([]);
    if (typeof value === "function") {
      while (++i < n) {
        bind(group = this[i], value.call(group, group.parentNode.__data__, i));
      }
    } else {
      while (++i < n) {
        bind(group = this[i], value);
      }
    }
    update.enter = function() {
      return enter;
    };
    update.exit = function() {
      return exit;
    };
    return update;
  };
  function d3_selection_dataNode(data) {
    return {
      __data__: data
    };
  }
  d3_selectionPrototype.datum = function(value) {
    return arguments.length ? this.property("__data__", value) : this.property("__data__");
  };
  d3_selectionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      subgroup.parentNode = (group = this[j]).parentNode;
      for (var i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i)) {
          subgroup.push(node);
        }
      }
    }
    return d3_selection(subgroups);
  };
  function d3_selection_filter(selector) {
    return function() {
      return d3_selectMatches(this, selector);
    };
  }
  d3_selectionPrototype.order = function() {
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = group.length - 1, next = group[i], node; --i >= 0; ) {
        if (node = group[i]) {
          if (next && next !== node.nextSibling) next.parentNode.insertBefore(node, next);
          next = node;
        }
      }
    }
    return this;
  };
  d3_selectionPrototype.sort = function(comparator) {
    comparator = d3_selection_sortComparator.apply(this, arguments);
    for (var j = -1, m = this.length; ++j < m; ) this[j].sort(comparator);
    return this.order();
  };
  function d3_selection_sortComparator(comparator) {
    if (!arguments.length) comparator = d3.ascending;
    return function(a, b) {
      return a && b ? comparator(a.__data__, b.__data__) : !a - !b;
    };
  }
  d3_selectionPrototype.each = function(callback) {
    return d3_selection_each(this, function(node, i, j) {
      callback.call(node, node.__data__, i, j);
    });
  };
  function d3_selection_each(groups, callback) {
    for (var j = 0, m = groups.length; j < m; j++) {
      for (var group = groups[j], i = 0, n = group.length, node; i < n; i++) {
        if (node = group[i]) callback(node, i, j);
      }
    }
    return groups;
  }
  d3_selectionPrototype.call = function(callback) {
    var args = d3_array(arguments);
    callback.apply(args[0] = this, args);
    return this;
  };
  d3_selectionPrototype.empty = function() {
    return !this.node();
  };
  d3_selectionPrototype.node = function() {
    for (var j = 0, m = this.length; j < m; j++) {
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        var node = group[i];
        if (node) return node;
      }
    }
    return null;
  };
  d3_selectionPrototype.size = function() {
    var n = 0;
    this.each(function() {
      ++n;
    });
    return n;
  };
  function d3_selection_enter(selection) {
    d3_subclass(selection, d3_selection_enterPrototype);
    return selection;
  }
  var d3_selection_enterPrototype = [];
  d3.selection.enter = d3_selection_enter;
  d3.selection.enter.prototype = d3_selection_enterPrototype;
  d3_selection_enterPrototype.append = d3_selectionPrototype.append;
  d3_selection_enterPrototype.empty = d3_selectionPrototype.empty;
  d3_selection_enterPrototype.node = d3_selectionPrototype.node;
  d3_selection_enterPrototype.call = d3_selectionPrototype.call;
  d3_selection_enterPrototype.size = d3_selectionPrototype.size;
  d3_selection_enterPrototype.select = function(selector) {
    var subgroups = [], subgroup, subnode, upgroup, group, node;
    for (var j = -1, m = this.length; ++j < m; ) {
      upgroup = (group = this[j]).update;
      subgroups.push(subgroup = []);
      subgroup.parentNode = group.parentNode;
      for (var i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          subgroup.push(upgroup[i] = subnode = selector.call(group.parentNode, node.__data__, i, j));
          subnode.__data__ = node.__data__;
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_selection(subgroups);
  };
  d3_selection_enterPrototype.insert = function(name, before) {
    if (arguments.length < 2) before = d3_selection_enterInsertBefore(this);
    return d3_selectionPrototype.insert.call(this, name, before);
  };
  function d3_selection_enterInsertBefore(enter) {
    var i0, j0;
    return function(d, i, j) {
      var group = enter[j].update, n = group.length, node;
      if (j != j0) j0 = j, i0 = 0;
      if (i >= i0) i0 = i + 1;
      while (!(node = group[i0]) && ++i0 < n) ;
      return node;
    };
  }
  d3_selectionPrototype.transition = function() {
    var id = d3_transitionInheritId || ++d3_transitionId, subgroups = [], subgroup, node, transition = d3_transitionInherit || {
      time: Date.now(),
      ease: d3_ease_cubicInOut,
      delay: 0,
      duration: 250
    };
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) d3_transitionNode(node, i, id, transition);
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_selectionPrototype.interrupt = function() {
    return this.each(d3_selection_interrupt);
  };
  function d3_selection_interrupt() {
    var lock = this.__transition__;
    if (lock) ++lock.active;
  }
  d3.select = function(node) {
    var group = [ typeof node === "string" ? d3_select(node, d3_document) : node ];
    group.parentNode = d3_documentElement;
    return d3_selection([ group ]);
  };
  d3.selectAll = function(nodes) {
    var group = d3_array(typeof nodes === "string" ? d3_selectAll(nodes, d3_document) : nodes);
    group.parentNode = d3_documentElement;
    return d3_selection([ group ]);
  };
  var d3_selectionRoot = d3.select(d3_documentElement);
  d3_selectionPrototype.on = function(type, listener, capture) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof type !== "string") {
        if (n < 2) listener = false;
        for (capture in type) this.each(d3_selection_on(capture, type[capture], listener));
        return this;
      }
      if (n < 2) return (n = this.node()["__on" + type]) && n._;
      capture = false;
    }
    return this.each(d3_selection_on(type, listener, capture));
  };
  function d3_selection_on(type, listener, capture) {
    var name = "__on" + type, i = type.indexOf("."), wrap = d3_selection_onListener;
    if (i > 0) type = type.substring(0, i);
    var filter = d3_selection_onFilters.get(type);
    if (filter) type = filter, wrap = d3_selection_onFilter;
    function onRemove() {
      var l = this[name];
      if (l) {
        this.removeEventListener(type, l, l.$);
        delete this[name];
      }
    }
    function onAdd() {
      var l = wrap(listener, d3_array(arguments));
      onRemove.call(this);
      this.addEventListener(type, this[name] = l, l.$ = capture);
      l._ = listener;
    }
    function removeAll() {
      var re = new RegExp("^__on([^.]+)" + d3.requote(type) + "$"), match;
      for (var name in this) {
        if (match = name.match(re)) {
          var l = this[name];
          this.removeEventListener(match[1], l, l.$);
          delete this[name];
        }
      }
    }
    return i ? listener ? onAdd : onRemove : listener ? d3_noop : removeAll;
  }
  var d3_selection_onFilters = d3.map({
    mouseenter: "mouseover",
    mouseleave: "mouseout"
  });
  d3_selection_onFilters.forEach(function(k) {
    if ("on" + k in d3_document) d3_selection_onFilters.remove(k);
  });
  function d3_selection_onListener(listener, argumentz) {
    return function(e) {
      var o = d3.event;
      d3.event = e;
      argumentz[0] = this.__data__;
      try {
        listener.apply(this, argumentz);
      } finally {
        d3.event = o;
      }
    };
  }
  function d3_selection_onFilter(listener, argumentz) {
    var l = d3_selection_onListener(listener, argumentz);
    return function(e) {
      var target = this, related = e.relatedTarget;
      if (!related || related !== target && !(related.compareDocumentPosition(target) & 8)) {
        l.call(target, e);
      }
    };
  }
  var d3_event_dragSelect = d3_vendorSymbol(d3_documentElement.style, "userSelect"), d3_event_dragId = 0;
  function d3_event_dragSuppress() {
    var name = ".dragsuppress-" + ++d3_event_dragId, touchmove = "touchmove" + name, selectstart = "selectstart" + name, dragstart = "dragstart" + name, click = "click" + name, w = d3.select(d3_window).on(touchmove, d3_eventPreventDefault).on(selectstart, d3_eventPreventDefault).on(dragstart, d3_eventPreventDefault), style = d3_documentElement.style, select = style[d3_event_dragSelect];
    style[d3_event_dragSelect] = "none";
    return function(suppressClick) {
      w.on(name, null);
      style[d3_event_dragSelect] = select;
      if (suppressClick) {
        function off() {
          w.on(click, null);
        }
        w.on(click, function() {
          d3_eventPreventDefault();
          off();
        }, true);
        setTimeout(off, 0);
      }
    };
  }
  d3.mouse = function(container) {
    return d3_mousePoint(container, d3_eventSource());
  };
  var d3_mouse_bug44083 = /WebKit/.test(d3_window.navigator.userAgent) ? -1 : 0;
  function d3_mousePoint(container, e) {
    if (e.changedTouches) e = e.changedTouches[0];
    var svg = container.ownerSVGElement || container;
    if (svg.createSVGPoint) {
      var point = svg.createSVGPoint();
      if (d3_mouse_bug44083 < 0 && (d3_window.scrollX || d3_window.scrollY)) {
        svg = d3.select("body").append("svg").style({
          position: "absolute",
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
          border: "none"
        }, "important");
        var ctm = svg[0][0].getScreenCTM();
        d3_mouse_bug44083 = !(ctm.f || ctm.e);
        svg.remove();
      }
      if (d3_mouse_bug44083) point.x = e.pageX, point.y = e.pageY; else point.x = e.clientX, 
      point.y = e.clientY;
      point = point.matrixTransform(container.getScreenCTM().inverse());
      return [ point.x, point.y ];
    }
    var rect = container.getBoundingClientRect();
    return [ e.clientX - rect.left - container.clientLeft, e.clientY - rect.top - container.clientTop ];
  }
  d3.touches = function(container, touches) {
    if (arguments.length < 2) touches = d3_eventSource().touches;
    return touches ? d3_array(touches).map(function(touch) {
      var point = d3_mousePoint(container, touch);
      point.identifier = touch.identifier;
      return point;
    }) : [];
  };
  d3.behavior.drag = function() {
    var event = d3_eventDispatch(drag, "drag", "dragstart", "dragend"), origin = null, mousedown = dragstart(d3_noop, d3.mouse, "mousemove", "mouseup"), touchstart = dragstart(touchid, touchposition, "touchmove", "touchend");
    function drag() {
      this.on("mousedown.drag", mousedown).on("touchstart.drag", touchstart);
    }
    function touchid() {
      return d3.event.changedTouches[0].identifier;
    }
    function touchposition(parent, id) {
      return d3.touches(parent).filter(function(p) {
        return p.identifier === id;
      })[0];
    }
    function dragstart(id, position, move, end) {
      return function() {
        var target = this, parent = target.parentNode, event_ = event.of(target, arguments), eventTarget = d3.event.target, eventId = id(), drag = eventId == null ? "drag" : "drag-" + eventId, origin_ = position(parent, eventId), dragged = 0, offset, w = d3.select(d3_window).on(move + "." + drag, moved).on(end + "." + drag, ended), dragRestore = d3_event_dragSuppress();
        if (origin) {
          offset = origin.apply(target, arguments);
          offset = [ offset.x - origin_[0], offset.y - origin_[1] ];
        } else {
          offset = [ 0, 0 ];
        }
        event_({
          type: "dragstart"
        });
        function moved() {
          var p = position(parent, eventId), dx = p[0] - origin_[0], dy = p[1] - origin_[1];
          dragged |= dx | dy;
          origin_ = p;
          event_({
            type: "drag",
            x: p[0] + offset[0],
            y: p[1] + offset[1],
            dx: dx,
            dy: dy
          });
        }
        function ended() {
          w.on(move + "." + drag, null).on(end + "." + drag, null);
          dragRestore(dragged && d3.event.target === eventTarget);
          event_({
            type: "dragend"
          });
        }
      };
    }
    drag.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return drag;
    };
    return d3.rebind(drag, event, "on");
  };
  var π = Math.PI, τ = 2 * π, halfπ = π / 2, ε = 1e-6, ε2 = ε * ε, d3_radians = π / 180, d3_degrees = 180 / π;
  function d3_sgn(x) {
    return x > 0 ? 1 : x < 0 ? -1 : 0;
  }
  function d3_acos(x) {
    return x > 1 ? 0 : x < -1 ? π : Math.acos(x);
  }
  function d3_asin(x) {
    return x > 1 ? halfπ : x < -1 ? -halfπ : Math.asin(x);
  }
  function d3_sinh(x) {
    return ((x = Math.exp(x)) - 1 / x) / 2;
  }
  function d3_cosh(x) {
    return ((x = Math.exp(x)) + 1 / x) / 2;
  }
  function d3_tanh(x) {
    return ((x = Math.exp(2 * x)) - 1) / (x + 1);
  }
  function d3_haversin(x) {
    return (x = Math.sin(x / 2)) * x;
  }
  var ρ = Math.SQRT2, ρ2 = 2, ρ4 = 4;
  d3.interpolateZoom = function(p0, p1) {
    var ux0 = p0[0], uy0 = p0[1], w0 = p0[2], ux1 = p1[0], uy1 = p1[1], w1 = p1[2];
    var dx = ux1 - ux0, dy = uy1 - uy0, d2 = dx * dx + dy * dy, d1 = Math.sqrt(d2), b0 = (w1 * w1 - w0 * w0 + ρ4 * d2) / (2 * w0 * ρ2 * d1), b1 = (w1 * w1 - w0 * w0 - ρ4 * d2) / (2 * w1 * ρ2 * d1), r0 = Math.log(Math.sqrt(b0 * b0 + 1) - b0), r1 = Math.log(Math.sqrt(b1 * b1 + 1) - b1), dr = r1 - r0, S = (dr || Math.log(w1 / w0)) / ρ;
    function interpolate(t) {
      var s = t * S;
      if (dr) {
        var coshr0 = d3_cosh(r0), u = w0 / (ρ2 * d1) * (coshr0 * d3_tanh(ρ * s + r0) - d3_sinh(r0));
        return [ ux0 + u * dx, uy0 + u * dy, w0 * coshr0 / d3_cosh(ρ * s + r0) ];
      }
      return [ ux0 + t * dx, uy0 + t * dy, w0 * Math.exp(ρ * s) ];
    }
    interpolate.duration = S * 1e3;
    return interpolate;
  };
  d3.behavior.zoom = function() {
    var view = {
      x: 0,
      y: 0,
      k: 1
    }, translate0, center, size = [ 960, 500 ], scaleExtent = d3_behavior_zoomInfinity, mousedown = "mousedown.zoom", mousemove = "mousemove.zoom", mouseup = "mouseup.zoom", mousewheelTimer, touchstart = "touchstart.zoom", touchtime, event = d3_eventDispatch(zoom, "zoomstart", "zoom", "zoomend"), x0, x1, y0, y1;
    function zoom(g) {
      g.on(mousedown, mousedowned).on(d3_behavior_zoomWheel + ".zoom", mousewheeled).on(mousemove, mousewheelreset).on("dblclick.zoom", dblclicked).on(touchstart, touchstarted);
    }
    zoom.event = function(g) {
      g.each(function() {
        var event_ = event.of(this, arguments), view1 = view;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.zoom", function() {
            view = this.__chart__ || {
              x: 0,
              y: 0,
              k: 1
            };
            zoomstarted(event_);
          }).tween("zoom:zoom", function() {
            var dx = size[0], dy = size[1], cx = dx / 2, cy = dy / 2, i = d3.interpolateZoom([ (cx - view.x) / view.k, (cy - view.y) / view.k, dx / view.k ], [ (cx - view1.x) / view1.k, (cy - view1.y) / view1.k, dx / view1.k ]);
            return function(t) {
              var l = i(t), k = dx / l[2];
              this.__chart__ = view = {
                x: cx - l[0] * k,
                y: cy - l[1] * k,
                k: k
              };
              zoomed(event_);
            };
          }).each("end.zoom", function() {
            zoomended(event_);
          });
        } else {
          this.__chart__ = view;
          zoomstarted(event_);
          zoomed(event_);
          zoomended(event_);
        }
      });
    };
    zoom.translate = function(_) {
      if (!arguments.length) return [ view.x, view.y ];
      view = {
        x: +_[0],
        y: +_[1],
        k: view.k
      };
      rescale();
      return zoom;
    };
    zoom.scale = function(_) {
      if (!arguments.length) return view.k;
      view = {
        x: view.x,
        y: view.y,
        k: +_
      };
      rescale();
      return zoom;
    };
    zoom.scaleExtent = function(_) {
      if (!arguments.length) return scaleExtent;
      scaleExtent = _ == null ? d3_behavior_zoomInfinity : [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.center = function(_) {
      if (!arguments.length) return center;
      center = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.size = function(_) {
      if (!arguments.length) return size;
      size = _ && [ +_[0], +_[1] ];
      return zoom;
    };
    zoom.x = function(z) {
      if (!arguments.length) return x1;
      x1 = z;
      x0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    zoom.y = function(z) {
      if (!arguments.length) return y1;
      y1 = z;
      y0 = z.copy();
      view = {
        x: 0,
        y: 0,
        k: 1
      };
      return zoom;
    };
    function location(p) {
      return [ (p[0] - view.x) / view.k, (p[1] - view.y) / view.k ];
    }
    function point(l) {
      return [ l[0] * view.k + view.x, l[1] * view.k + view.y ];
    }
    function scaleTo(s) {
      view.k = Math.max(scaleExtent[0], Math.min(scaleExtent[1], s));
    }
    function translateTo(p, l) {
      l = point(l);
      view.x += p[0] - l[0];
      view.y += p[1] - l[1];
    }
    function rescale() {
      if (x1) x1.domain(x0.range().map(function(x) {
        return (x - view.x) / view.k;
      }).map(x0.invert));
      if (y1) y1.domain(y0.range().map(function(y) {
        return (y - view.y) / view.k;
      }).map(y0.invert));
    }
    function zoomstarted(event) {
      event({
        type: "zoomstart"
      });
    }
    function zoomed(event) {
      rescale();
      event({
        type: "zoom",
        scale: view.k,
        translate: [ view.x, view.y ]
      });
    }
    function zoomended(event) {
      event({
        type: "zoomend"
      });
    }
    function mousedowned() {
      var target = this, event_ = event.of(target, arguments), eventTarget = d3.event.target, dragged = 0, w = d3.select(d3_window).on(mousemove, moved).on(mouseup, ended), l = location(d3.mouse(target)), dragRestore = d3_event_dragSuppress();
      d3_selection_interrupt.call(target);
      zoomstarted(event_);
      function moved() {
        dragged = 1;
        translateTo(d3.mouse(target), l);
        zoomed(event_);
      }
      function ended() {
        w.on(mousemove, d3_window === target ? mousewheelreset : null).on(mouseup, null);
        dragRestore(dragged && d3.event.target === eventTarget);
        zoomended(event_);
      }
    }
    function touchstarted() {
      var target = this, event_ = event.of(target, arguments), locations0 = {}, distance0 = 0, scale0, eventId = d3.event.changedTouches[0].identifier, touchmove = "touchmove.zoom-" + eventId, touchend = "touchend.zoom-" + eventId, w = d3.select(d3_window).on(touchmove, moved).on(touchend, ended), t = d3.select(target).on(mousedown, null).on(touchstart, started), dragRestore = d3_event_dragSuppress();
      d3_selection_interrupt.call(target);
      started();
      zoomstarted(event_);
      function relocate() {
        var touches = d3.touches(target);
        scale0 = view.k;
        touches.forEach(function(t) {
          if (t.identifier in locations0) locations0[t.identifier] = location(t);
        });
        return touches;
      }
      function started() {
        var changed = d3.event.changedTouches;
        for (var i = 0, n = changed.length; i < n; ++i) {
          locations0[changed[i].identifier] = null;
        }
        var touches = relocate(), now = Date.now();
        if (touches.length === 1) {
          if (now - touchtime < 500) {
            var p = touches[0], l = locations0[p.identifier];
            scaleTo(view.k * 2);
            translateTo(p, l);
            d3_eventPreventDefault();
            zoomed(event_);
          }
          touchtime = now;
        } else if (touches.length > 1) {
          var p = touches[0], q = touches[1], dx = p[0] - q[0], dy = p[1] - q[1];
          distance0 = dx * dx + dy * dy;
        }
      }
      function moved() {
        var touches = d3.touches(target), p0, l0, p1, l1;
        for (var i = 0, n = touches.length; i < n; ++i, l1 = null) {
          p1 = touches[i];
          if (l1 = locations0[p1.identifier]) {
            if (l0) break;
            p0 = p1, l0 = l1;
          }
        }
        if (l1) {
          var distance1 = (distance1 = p1[0] - p0[0]) * distance1 + (distance1 = p1[1] - p0[1]) * distance1, scale1 = distance0 && Math.sqrt(distance1 / distance0);
          p0 = [ (p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 ];
          l0 = [ (l0[0] + l1[0]) / 2, (l0[1] + l1[1]) / 2 ];
          scaleTo(scale1 * scale0);
        }
        touchtime = null;
        translateTo(p0, l0);
        zoomed(event_);
      }
      function ended() {
        if (d3.event.touches.length) {
          var changed = d3.event.changedTouches;
          for (var i = 0, n = changed.length; i < n; ++i) {
            delete locations0[changed[i].identifier];
          }
          for (var identifier in locations0) {
            return void relocate();
          }
        }
        w.on(touchmove, null).on(touchend, null);
        t.on(mousedown, mousedowned).on(touchstart, touchstarted);
        dragRestore();
        zoomended(event_);
      }
    }
    function mousewheeled() {
      var event_ = event.of(this, arguments);
      if (mousewheelTimer) clearTimeout(mousewheelTimer); else d3_selection_interrupt.call(this), 
      zoomstarted(event_);
      mousewheelTimer = setTimeout(function() {
        mousewheelTimer = null;
        zoomended(event_);
      }, 50);
      d3_eventPreventDefault();
      var point = center || d3.mouse(this);
      if (!translate0) translate0 = location(point);
      scaleTo(Math.pow(2, d3_behavior_zoomDelta() * .002) * view.k);
      translateTo(point, translate0);
      zoomed(event_);
    }
    function mousewheelreset() {
      translate0 = null;
    }
    function dblclicked() {
      var event_ = event.of(this, arguments), p = d3.mouse(this), l = location(p), k = Math.log(view.k) / Math.LN2;
      zoomstarted(event_);
      scaleTo(Math.pow(2, d3.event.shiftKey ? Math.ceil(k) - 1 : Math.floor(k) + 1));
      translateTo(p, l);
      zoomed(event_);
      zoomended(event_);
    }
    return d3.rebind(zoom, event, "on");
  };
  var d3_behavior_zoomInfinity = [ 0, Infinity ];
  var d3_behavior_zoomDelta, d3_behavior_zoomWheel = "onwheel" in d3_document ? (d3_behavior_zoomDelta = function() {
    return -d3.event.deltaY * (d3.event.deltaMode ? 120 : 1);
  }, "wheel") : "onmousewheel" in d3_document ? (d3_behavior_zoomDelta = function() {
    return d3.event.wheelDelta;
  }, "mousewheel") : (d3_behavior_zoomDelta = function() {
    return -d3.event.detail;
  }, "MozMousePixelScroll");
  function d3_Color() {}
  d3_Color.prototype.toString = function() {
    return this.rgb() + "";
  };
  d3.hsl = function(h, s, l) {
    return arguments.length === 1 ? h instanceof d3_Hsl ? d3_hsl(h.h, h.s, h.l) : d3_rgb_parse("" + h, d3_rgb_hsl, d3_hsl) : d3_hsl(+h, +s, +l);
  };
  function d3_hsl(h, s, l) {
    return new d3_Hsl(h, s, l);
  }
  function d3_Hsl(h, s, l) {
    this.h = h;
    this.s = s;
    this.l = l;
  }
  var d3_hslPrototype = d3_Hsl.prototype = new d3_Color();
  d3_hslPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_hsl(this.h, this.s, this.l / k);
  };
  d3_hslPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_hsl(this.h, this.s, k * this.l);
  };
  d3_hslPrototype.rgb = function() {
    return d3_hsl_rgb(this.h, this.s, this.l);
  };
  function d3_hsl_rgb(h, s, l) {
    var m1, m2;
    h = isNaN(h) ? 0 : (h %= 360) < 0 ? h + 360 : h;
    s = isNaN(s) ? 0 : s < 0 ? 0 : s > 1 ? 1 : s;
    l = l < 0 ? 0 : l > 1 ? 1 : l;
    m2 = l <= .5 ? l * (1 + s) : l + s - l * s;
    m1 = 2 * l - m2;
    function v(h) {
      if (h > 360) h -= 360; else if (h < 0) h += 360;
      if (h < 60) return m1 + (m2 - m1) * h / 60;
      if (h < 180) return m2;
      if (h < 240) return m1 + (m2 - m1) * (240 - h) / 60;
      return m1;
    }
    function vv(h) {
      return Math.round(v(h) * 255);
    }
    return d3_rgb(vv(h + 120), vv(h), vv(h - 120));
  }
  d3.hcl = function(h, c, l) {
    return arguments.length === 1 ? h instanceof d3_Hcl ? d3_hcl(h.h, h.c, h.l) : h instanceof d3_Lab ? d3_lab_hcl(h.l, h.a, h.b) : d3_lab_hcl((h = d3_rgb_lab((h = d3.rgb(h)).r, h.g, h.b)).l, h.a, h.b) : d3_hcl(+h, +c, +l);
  };
  function d3_hcl(h, c, l) {
    return new d3_Hcl(h, c, l);
  }
  function d3_Hcl(h, c, l) {
    this.h = h;
    this.c = c;
    this.l = l;
  }
  var d3_hclPrototype = d3_Hcl.prototype = new d3_Color();
  d3_hclPrototype.brighter = function(k) {
    return d3_hcl(this.h, this.c, Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.darker = function(k) {
    return d3_hcl(this.h, this.c, Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)));
  };
  d3_hclPrototype.rgb = function() {
    return d3_hcl_lab(this.h, this.c, this.l).rgb();
  };
  function d3_hcl_lab(h, c, l) {
    if (isNaN(h)) h = 0;
    if (isNaN(c)) c = 0;
    return d3_lab(l, Math.cos(h *= d3_radians) * c, Math.sin(h) * c);
  }
  d3.lab = function(l, a, b) {
    return arguments.length === 1 ? l instanceof d3_Lab ? d3_lab(l.l, l.a, l.b) : l instanceof d3_Hcl ? d3_hcl_lab(l.l, l.c, l.h) : d3_rgb_lab((l = d3.rgb(l)).r, l.g, l.b) : d3_lab(+l, +a, +b);
  };
  function d3_lab(l, a, b) {
    return new d3_Lab(l, a, b);
  }
  function d3_Lab(l, a, b) {
    this.l = l;
    this.a = a;
    this.b = b;
  }
  var d3_lab_K = 18;
  var d3_lab_X = .95047, d3_lab_Y = 1, d3_lab_Z = 1.08883;
  var d3_labPrototype = d3_Lab.prototype = new d3_Color();
  d3_labPrototype.brighter = function(k) {
    return d3_lab(Math.min(100, this.l + d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.darker = function(k) {
    return d3_lab(Math.max(0, this.l - d3_lab_K * (arguments.length ? k : 1)), this.a, this.b);
  };
  d3_labPrototype.rgb = function() {
    return d3_lab_rgb(this.l, this.a, this.b);
  };
  function d3_lab_rgb(l, a, b) {
    var y = (l + 16) / 116, x = y + a / 500, z = y - b / 200;
    x = d3_lab_xyz(x) * d3_lab_X;
    y = d3_lab_xyz(y) * d3_lab_Y;
    z = d3_lab_xyz(z) * d3_lab_Z;
    return d3_rgb(d3_xyz_rgb(3.2404542 * x - 1.5371385 * y - .4985314 * z), d3_xyz_rgb(-.969266 * x + 1.8760108 * y + .041556 * z), d3_xyz_rgb(.0556434 * x - .2040259 * y + 1.0572252 * z));
  }
  function d3_lab_hcl(l, a, b) {
    return l > 0 ? d3_hcl(Math.atan2(b, a) * d3_degrees, Math.sqrt(a * a + b * b), l) : d3_hcl(NaN, NaN, l);
  }
  function d3_lab_xyz(x) {
    return x > .206893034 ? x * x * x : (x - 4 / 29) / 7.787037;
  }
  function d3_xyz_lab(x) {
    return x > .008856 ? Math.pow(x, 1 / 3) : 7.787037 * x + 4 / 29;
  }
  function d3_xyz_rgb(r) {
    return Math.round(255 * (r <= .00304 ? 12.92 * r : 1.055 * Math.pow(r, 1 / 2.4) - .055));
  }
  d3.rgb = function(r, g, b) {
    return arguments.length === 1 ? r instanceof d3_Rgb ? d3_rgb(r.r, r.g, r.b) : d3_rgb_parse("" + r, d3_rgb, d3_hsl_rgb) : d3_rgb(~~r, ~~g, ~~b);
  };
  function d3_rgbNumber(value) {
    return d3_rgb(value >> 16, value >> 8 & 255, value & 255);
  }
  function d3_rgbString(value) {
    return d3_rgbNumber(value) + "";
  }
  function d3_rgb(r, g, b) {
    return new d3_Rgb(r, g, b);
  }
  function d3_Rgb(r, g, b) {
    this.r = r;
    this.g = g;
    this.b = b;
  }
  var d3_rgbPrototype = d3_Rgb.prototype = new d3_Color();
  d3_rgbPrototype.brighter = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    var r = this.r, g = this.g, b = this.b, i = 30;
    if (!r && !g && !b) return d3_rgb(i, i, i);
    if (r && r < i) r = i;
    if (g && g < i) g = i;
    if (b && b < i) b = i;
    return d3_rgb(Math.min(255, ~~(r / k)), Math.min(255, ~~(g / k)), Math.min(255, ~~(b / k)));
  };
  d3_rgbPrototype.darker = function(k) {
    k = Math.pow(.7, arguments.length ? k : 1);
    return d3_rgb(~~(k * this.r), ~~(k * this.g), ~~(k * this.b));
  };
  d3_rgbPrototype.hsl = function() {
    return d3_rgb_hsl(this.r, this.g, this.b);
  };
  d3_rgbPrototype.toString = function() {
    return "#" + d3_rgb_hex(this.r) + d3_rgb_hex(this.g) + d3_rgb_hex(this.b);
  };
  function d3_rgb_hex(v) {
    return v < 16 ? "0" + Math.max(0, v).toString(16) : Math.min(255, v).toString(16);
  }
  function d3_rgb_parse(format, rgb, hsl) {
    var r = 0, g = 0, b = 0, m1, m2, name;
    m1 = /([a-z]+)\((.*)\)/i.exec(format);
    if (m1) {
      m2 = m1[2].split(",");
      switch (m1[1]) {
       case "hsl":
        {
          return hsl(parseFloat(m2[0]), parseFloat(m2[1]) / 100, parseFloat(m2[2]) / 100);
        }

       case "rgb":
        {
          return rgb(d3_rgb_parseNumber(m2[0]), d3_rgb_parseNumber(m2[1]), d3_rgb_parseNumber(m2[2]));
        }
      }
    }
    if (name = d3_rgb_names.get(format)) return rgb(name.r, name.g, name.b);
    if (format != null && format.charAt(0) === "#") {
      if (format.length === 4) {
        r = format.charAt(1);
        r += r;
        g = format.charAt(2);
        g += g;
        b = format.charAt(3);
        b += b;
      } else if (format.length === 7) {
        r = format.substring(1, 3);
        g = format.substring(3, 5);
        b = format.substring(5, 7);
      }
      r = parseInt(r, 16);
      g = parseInt(g, 16);
      b = parseInt(b, 16);
    }
    return rgb(r, g, b);
  }
  function d3_rgb_hsl(r, g, b) {
    var min = Math.min(r /= 255, g /= 255, b /= 255), max = Math.max(r, g, b), d = max - min, h, s, l = (max + min) / 2;
    if (d) {
      s = l < .5 ? d / (max + min) : d / (2 - max - min);
      if (r == max) h = (g - b) / d + (g < b ? 6 : 0); else if (g == max) h = (b - r) / d + 2; else h = (r - g) / d + 4;
      h *= 60;
    } else {
      h = NaN;
      s = l > 0 && l < 1 ? 0 : h;
    }
    return d3_hsl(h, s, l);
  }
  function d3_rgb_lab(r, g, b) {
    r = d3_rgb_xyz(r);
    g = d3_rgb_xyz(g);
    b = d3_rgb_xyz(b);
    var x = d3_xyz_lab((.4124564 * r + .3575761 * g + .1804375 * b) / d3_lab_X), y = d3_xyz_lab((.2126729 * r + .7151522 * g + .072175 * b) / d3_lab_Y), z = d3_xyz_lab((.0193339 * r + .119192 * g + .9503041 * b) / d3_lab_Z);
    return d3_lab(116 * y - 16, 500 * (x - y), 200 * (y - z));
  }
  function d3_rgb_xyz(r) {
    return (r /= 255) <= .04045 ? r / 12.92 : Math.pow((r + .055) / 1.055, 2.4);
  }
  function d3_rgb_parseNumber(c) {
    var f = parseFloat(c);
    return c.charAt(c.length - 1) === "%" ? Math.round(f * 2.55) : f;
  }
  var d3_rgb_names = d3.map({
    aliceblue: 15792383,
    antiquewhite: 16444375,
    aqua: 65535,
    aquamarine: 8388564,
    azure: 15794175,
    beige: 16119260,
    bisque: 16770244,
    black: 0,
    blanchedalmond: 16772045,
    blue: 255,
    blueviolet: 9055202,
    brown: 10824234,
    burlywood: 14596231,
    cadetblue: 6266528,
    chartreuse: 8388352,
    chocolate: 13789470,
    coral: 16744272,
    cornflowerblue: 6591981,
    cornsilk: 16775388,
    crimson: 14423100,
    cyan: 65535,
    darkblue: 139,
    darkcyan: 35723,
    darkgoldenrod: 12092939,
    darkgray: 11119017,
    darkgreen: 25600,
    darkgrey: 11119017,
    darkkhaki: 12433259,
    darkmagenta: 9109643,
    darkolivegreen: 5597999,
    darkorange: 16747520,
    darkorchid: 10040012,
    darkred: 9109504,
    darksalmon: 15308410,
    darkseagreen: 9419919,
    darkslateblue: 4734347,
    darkslategray: 3100495,
    darkslategrey: 3100495,
    darkturquoise: 52945,
    darkviolet: 9699539,
    deeppink: 16716947,
    deepskyblue: 49151,
    dimgray: 6908265,
    dimgrey: 6908265,
    dodgerblue: 2003199,
    firebrick: 11674146,
    floralwhite: 16775920,
    forestgreen: 2263842,
    fuchsia: 16711935,
    gainsboro: 14474460,
    ghostwhite: 16316671,
    gold: 16766720,
    goldenrod: 14329120,
    gray: 8421504,
    green: 32768,
    greenyellow: 11403055,
    grey: 8421504,
    honeydew: 15794160,
    hotpink: 16738740,
    indianred: 13458524,
    indigo: 4915330,
    ivory: 16777200,
    khaki: 15787660,
    lavender: 15132410,
    lavenderblush: 16773365,
    lawngreen: 8190976,
    lemonchiffon: 16775885,
    lightblue: 11393254,
    lightcoral: 15761536,
    lightcyan: 14745599,
    lightgoldenrodyellow: 16448210,
    lightgray: 13882323,
    lightgreen: 9498256,
    lightgrey: 13882323,
    lightpink: 16758465,
    lightsalmon: 16752762,
    lightseagreen: 2142890,
    lightskyblue: 8900346,
    lightslategray: 7833753,
    lightslategrey: 7833753,
    lightsteelblue: 11584734,
    lightyellow: 16777184,
    lime: 65280,
    limegreen: 3329330,
    linen: 16445670,
    magenta: 16711935,
    maroon: 8388608,
    mediumaquamarine: 6737322,
    mediumblue: 205,
    mediumorchid: 12211667,
    mediumpurple: 9662683,
    mediumseagreen: 3978097,
    mediumslateblue: 8087790,
    mediumspringgreen: 64154,
    mediumturquoise: 4772300,
    mediumvioletred: 13047173,
    midnightblue: 1644912,
    mintcream: 16121850,
    mistyrose: 16770273,
    moccasin: 16770229,
    navajowhite: 16768685,
    navy: 128,
    oldlace: 16643558,
    olive: 8421376,
    olivedrab: 7048739,
    orange: 16753920,
    orangered: 16729344,
    orchid: 14315734,
    palegoldenrod: 15657130,
    palegreen: 10025880,
    paleturquoise: 11529966,
    palevioletred: 14381203,
    papayawhip: 16773077,
    peachpuff: 16767673,
    peru: 13468991,
    pink: 16761035,
    plum: 14524637,
    powderblue: 11591910,
    purple: 8388736,
    red: 16711680,
    rosybrown: 12357519,
    royalblue: 4286945,
    saddlebrown: 9127187,
    salmon: 16416882,
    sandybrown: 16032864,
    seagreen: 3050327,
    seashell: 16774638,
    sienna: 10506797,
    silver: 12632256,
    skyblue: 8900331,
    slateblue: 6970061,
    slategray: 7372944,
    slategrey: 7372944,
    snow: 16775930,
    springgreen: 65407,
    steelblue: 4620980,
    tan: 13808780,
    teal: 32896,
    thistle: 14204888,
    tomato: 16737095,
    turquoise: 4251856,
    violet: 15631086,
    wheat: 16113331,
    white: 16777215,
    whitesmoke: 16119285,
    yellow: 16776960,
    yellowgreen: 10145074
  });
  d3_rgb_names.forEach(function(key, value) {
    d3_rgb_names.set(key, d3_rgbNumber(value));
  });
  function d3_functor(v) {
    return typeof v === "function" ? v : function() {
      return v;
    };
  }
  d3.functor = d3_functor;
  function d3_identity(d) {
    return d;
  }
  d3.xhr = d3_xhrType(d3_identity);
  function d3_xhrType(response) {
    return function(url, mimeType, callback) {
      if (arguments.length === 2 && typeof mimeType === "function") callback = mimeType, 
      mimeType = null;
      return d3_xhr(url, mimeType, response, callback);
    };
  }
  function d3_xhr(url, mimeType, response, callback) {
    var xhr = {}, dispatch = d3.dispatch("beforesend", "progress", "load", "error"), headers = {}, request = new XMLHttpRequest(), responseType = null;
    if (d3_window.XDomainRequest && !("withCredentials" in request) && /^(http(s)?:)?\/\//.test(url)) request = new XDomainRequest();
    "onload" in request ? request.onload = request.onerror = respond : request.onreadystatechange = function() {
      request.readyState > 3 && respond();
    };
    function respond() {
      var status = request.status, result;
      if (!status && request.responseText || status >= 200 && status < 300 || status === 304) {
        try {
          result = response.call(xhr, request);
        } catch (e) {
          dispatch.error.call(xhr, e);
          return;
        }
        dispatch.load.call(xhr, result);
      } else {
        dispatch.error.call(xhr, request);
      }
    }
    request.onprogress = function(event) {
      var o = d3.event;
      d3.event = event;
      try {
        dispatch.progress.call(xhr, request);
      } finally {
        d3.event = o;
      }
    };
    xhr.header = function(name, value) {
      name = (name + "").toLowerCase();
      if (arguments.length < 2) return headers[name];
      if (value == null) delete headers[name]; else headers[name] = value + "";
      return xhr;
    };
    xhr.mimeType = function(value) {
      if (!arguments.length) return mimeType;
      mimeType = value == null ? null : value + "";
      return xhr;
    };
    xhr.responseType = function(value) {
      if (!arguments.length) return responseType;
      responseType = value;
      return xhr;
    };
    xhr.response = function(value) {
      response = value;
      return xhr;
    };
    [ "get", "post" ].forEach(function(method) {
      xhr[method] = function() {
        return xhr.send.apply(xhr, [ method ].concat(d3_array(arguments)));
      };
    });
    xhr.send = function(method, data, callback) {
      if (arguments.length === 2 && typeof data === "function") callback = data, data = null;
      request.open(method, url, true);
      if (mimeType != null && !("accept" in headers)) headers["accept"] = mimeType + ",*/*";
      if (request.setRequestHeader) for (var name in headers) request.setRequestHeader(name, headers[name]);
      if (mimeType != null && request.overrideMimeType) request.overrideMimeType(mimeType);
      if (responseType != null) request.responseType = responseType;
      if (callback != null) xhr.on("error", callback).on("load", function(request) {
        callback(null, request);
      });
      dispatch.beforesend.call(xhr, request);
      request.send(data == null ? null : data);
      return xhr;
    };
    xhr.abort = function() {
      request.abort();
      return xhr;
    };
    d3.rebind(xhr, dispatch, "on");
    return callback == null ? xhr : xhr.get(d3_xhr_fixCallback(callback));
  }
  function d3_xhr_fixCallback(callback) {
    return callback.length === 1 ? function(error, request) {
      callback(error == null ? request : null);
    } : callback;
  }
  d3.dsv = function(delimiter, mimeType) {
    var reFormat = new RegExp('["' + delimiter + "\n]"), delimiterCode = delimiter.charCodeAt(0);
    function dsv(url, row, callback) {
      if (arguments.length < 3) callback = row, row = null;
      var xhr = d3.xhr(url, mimeType, callback);
      xhr.row = function(_) {
        return arguments.length ? xhr.response((row = _) == null ? response : typedResponse(_)) : row;
      };
      return xhr.row(row);
    }
    function response(request) {
      return dsv.parse(request.responseText);
    }
    function typedResponse(f) {
      return function(request) {
        return dsv.parse(request.responseText, f);
      };
    }
    dsv.parse = function(text, f) {
      var o;
      return dsv.parseRows(text, function(row, i) {
        if (o) return o(row, i - 1);
        var a = new Function("d", "return {" + row.map(function(name, i) {
          return JSON.stringify(name) + ": d[" + i + "]";
        }).join(",") + "}");
        o = f ? function(row, i) {
          return f(a(row), i);
        } : a;
      });
    };
    dsv.parseRows = function(text, f) {
      var EOL = {}, EOF = {}, rows = [], N = text.length, I = 0, n = 0, t, eol;
      function token() {
        if (I >= N) return EOF;
        if (eol) return eol = false, EOL;
        var j = I;
        if (text.charCodeAt(j) === 34) {
          var i = j;
          while (i++ < N) {
            if (text.charCodeAt(i) === 34) {
              if (text.charCodeAt(i + 1) !== 34) break;
              ++i;
            }
          }
          I = i + 2;
          var c = text.charCodeAt(i + 1);
          if (c === 13) {
            eol = true;
            if (text.charCodeAt(i + 2) === 10) ++I;
          } else if (c === 10) {
            eol = true;
          }
          return text.substring(j + 1, i).replace(/""/g, '"');
        }
        while (I < N) {
          var c = text.charCodeAt(I++), k = 1;
          if (c === 10) eol = true; else if (c === 13) {
            eol = true;
            if (text.charCodeAt(I) === 10) ++I, ++k;
          } else if (c !== delimiterCode) continue;
          return text.substring(j, I - k);
        }
        return text.substring(j);
      }
      while ((t = token()) !== EOF) {
        var a = [];
        while (t !== EOL && t !== EOF) {
          a.push(t);
          t = token();
        }
        if (f && !(a = f(a, n++))) continue;
        rows.push(a);
      }
      return rows;
    };
    dsv.format = function(rows) {
      if (Array.isArray(rows[0])) return dsv.formatRows(rows);
      var fieldSet = new d3_Set(), fields = [];
      rows.forEach(function(row) {
        for (var field in row) {
          if (!fieldSet.has(field)) {
            fields.push(fieldSet.add(field));
          }
        }
      });
      return [ fields.map(formatValue).join(delimiter) ].concat(rows.map(function(row) {
        return fields.map(function(field) {
          return formatValue(row[field]);
        }).join(delimiter);
      })).join("\n");
    };
    dsv.formatRows = function(rows) {
      return rows.map(formatRow).join("\n");
    };
    function formatRow(row) {
      return row.map(formatValue).join(delimiter);
    }
    function formatValue(text) {
      return reFormat.test(text) ? '"' + text.replace(/\"/g, '""') + '"' : text;
    }
    return dsv;
  };
  d3.csv = d3.dsv(",", "text/csv");
  d3.tsv = d3.dsv("	", "text/tab-separated-values");
  var d3_timer_queueHead, d3_timer_queueTail, d3_timer_interval, d3_timer_timeout, d3_timer_active, d3_timer_frame = d3_window[d3_vendorSymbol(d3_window, "requestAnimationFrame")] || function(callback) {
    setTimeout(callback, 17);
  };
  d3.timer = function(callback, delay, then) {
    var n = arguments.length;
    if (n < 2) delay = 0;
    if (n < 3) then = Date.now();
    var time = then + delay, timer = {
      c: callback,
      t: time,
      f: false,
      n: null
    };
    if (d3_timer_queueTail) d3_timer_queueTail.n = timer; else d3_timer_queueHead = timer;
    d3_timer_queueTail = timer;
    if (!d3_timer_interval) {
      d3_timer_timeout = clearTimeout(d3_timer_timeout);
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  };
  function d3_timer_step() {
    var now = d3_timer_mark(), delay = d3_timer_sweep() - now;
    if (delay > 24) {
      if (isFinite(delay)) {
        clearTimeout(d3_timer_timeout);
        d3_timer_timeout = setTimeout(d3_timer_step, delay);
      }
      d3_timer_interval = 0;
    } else {
      d3_timer_interval = 1;
      d3_timer_frame(d3_timer_step);
    }
  }
  d3.timer.flush = function() {
    d3_timer_mark();
    d3_timer_sweep();
  };
  function d3_timer_mark() {
    var now = Date.now();
    d3_timer_active = d3_timer_queueHead;
    while (d3_timer_active) {
      if (now >= d3_timer_active.t) d3_timer_active.f = d3_timer_active.c(now - d3_timer_active.t);
      d3_timer_active = d3_timer_active.n;
    }
    return now;
  }
  function d3_timer_sweep() {
    var t0, t1 = d3_timer_queueHead, time = Infinity;
    while (t1) {
      if (t1.f) {
        t1 = t0 ? t0.n = t1.n : d3_timer_queueHead = t1.n;
      } else {
        if (t1.t < time) time = t1.t;
        t1 = (t0 = t1).n;
      }
    }
    d3_timer_queueTail = t0;
    return time;
  }
  var d3_format_decimalPoint = ".", d3_format_thousandsSeparator = ",", d3_format_grouping = [ 3, 3 ], d3_format_currencySymbol = "$";
  var d3_formatPrefixes = [ "y", "z", "a", "f", "p", "n", "µ", "m", "", "k", "M", "G", "T", "P", "E", "Z", "Y" ].map(d3_formatPrefix);
  d3.formatPrefix = function(value, precision) {
    var i = 0;
    if (value) {
      if (value < 0) value *= -1;
      if (precision) value = d3.round(value, d3_format_precision(value, precision));
      i = 1 + Math.floor(1e-12 + Math.log(value) / Math.LN10);
      i = Math.max(-24, Math.min(24, Math.floor((i <= 0 ? i + 1 : i - 1) / 3) * 3));
    }
    return d3_formatPrefixes[8 + i / 3];
  };
  function d3_formatPrefix(d, i) {
    var k = Math.pow(10, abs(8 - i) * 3);
    return {
      scale: i > 8 ? function(d) {
        return d / k;
      } : function(d) {
        return d * k;
      },
      symbol: d
    };
  }
  d3.round = function(x, n) {
    return n ? Math.round(x * (n = Math.pow(10, n))) / n : Math.round(x);
  };
  d3.format = function(specifier) {
    var match = d3_format_re.exec(specifier), fill = match[1] || " ", align = match[2] || ">", sign = match[3] || "", symbol = match[4] || "", zfill = match[5], width = +match[6], comma = match[7], precision = match[8], type = match[9], scale = 1, suffix = "", integer = false;
    if (precision) precision = +precision.substring(1);
    if (zfill || fill === "0" && align === "=") {
      zfill = fill = "0";
      align = "=";
      if (comma) width -= Math.floor((width - 1) / 4);
    }
    switch (type) {
     case "n":
      comma = true;
      type = "g";
      break;

     case "%":
      scale = 100;
      suffix = "%";
      type = "f";
      break;

     case "p":
      scale = 100;
      suffix = "%";
      type = "r";
      break;

     case "b":
     case "o":
     case "x":
     case "X":
      if (symbol === "#") symbol = "0" + type.toLowerCase();

     case "c":
     case "d":
      integer = true;
      precision = 0;
      break;

     case "s":
      scale = -1;
      type = "r";
      break;
    }
    if (symbol === "#") symbol = ""; else if (symbol === "$") symbol = d3_format_currencySymbol;
    if (type == "r" && !precision) type = "g";
    if (precision != null) {
      if (type == "g") precision = Math.max(1, Math.min(21, precision)); else if (type == "e" || type == "f") precision = Math.max(0, Math.min(20, precision));
    }
    type = d3_format_types.get(type) || d3_format_typeDefault;
    var zcomma = zfill && comma;
    return function(value) {
      if (integer && value % 1) return "";
      var negative = value < 0 || value === 0 && 1 / value < 0 ? (value = -value, "-") : sign;
      if (scale < 0) {
        var prefix = d3.formatPrefix(value, precision);
        value = prefix.scale(value);
        suffix = prefix.symbol;
      } else {
        value *= scale;
      }
      value = type(value, precision);
      var i = value.lastIndexOf("."), before = i < 0 ? value : value.substring(0, i), after = i < 0 ? "" : d3_format_decimalPoint + value.substring(i + 1);
      if (!zfill && comma) before = d3_format_group(before);
      var length = symbol.length + before.length + after.length + (zcomma ? 0 : negative.length), padding = length < width ? new Array(length = width - length + 1).join(fill) : "";
      if (zcomma) before = d3_format_group(padding + before);
      negative += symbol;
      value = before + after;
      return (align === "<" ? negative + value + padding : align === ">" ? padding + negative + value : align === "^" ? padding.substring(0, length >>= 1) + negative + value + padding.substring(length) : negative + (zcomma ? value : padding + value)) + suffix;
    };
  };
  var d3_format_re = /(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i;
  var d3_format_types = d3.map({
    b: function(x) {
      return x.toString(2);
    },
    c: function(x) {
      return String.fromCharCode(x);
    },
    o: function(x) {
      return x.toString(8);
    },
    x: function(x) {
      return x.toString(16);
    },
    X: function(x) {
      return x.toString(16).toUpperCase();
    },
    g: function(x, p) {
      return x.toPrecision(p);
    },
    e: function(x, p) {
      return x.toExponential(p);
    },
    f: function(x, p) {
      return x.toFixed(p);
    },
    r: function(x, p) {
      return (x = d3.round(x, d3_format_precision(x, p))).toFixed(Math.max(0, Math.min(20, d3_format_precision(x * (1 + 1e-15), p))));
    }
  });
  function d3_format_precision(x, p) {
    return p - (x ? Math.ceil(Math.log(x) / Math.LN10) : 1);
  }
  function d3_format_typeDefault(x) {
    return x + "";
  }
  var d3_format_group = d3_identity;
  if (d3_format_grouping) {
    var d3_format_groupingLength = d3_format_grouping.length;
    d3_format_group = function(value) {
      var i = value.length, t = [], j = 0, g = d3_format_grouping[0];
      while (i > 0 && g > 0) {
        t.push(value.substring(i -= g, i + g));
        g = d3_format_grouping[j = (j + 1) % d3_format_groupingLength];
      }
      return t.reverse().join(d3_format_thousandsSeparator);
    };
  }
  d3.geo = {};
  function d3_adder() {}
  d3_adder.prototype = {
    s: 0,
    t: 0,
    add: function(y) {
      d3_adderSum(y, this.t, d3_adderTemp);
      d3_adderSum(d3_adderTemp.s, this.s, this);
      if (this.s) this.t += d3_adderTemp.t; else this.s = d3_adderTemp.t;
    },
    reset: function() {
      this.s = this.t = 0;
    },
    valueOf: function() {
      return this.s;
    }
  };
  var d3_adderTemp = new d3_adder();
  function d3_adderSum(a, b, o) {
    var x = o.s = a + b, bv = x - a, av = x - bv;
    o.t = a - av + (b - bv);
  }
  d3.geo.stream = function(object, listener) {
    if (object && d3_geo_streamObjectType.hasOwnProperty(object.type)) {
      d3_geo_streamObjectType[object.type](object, listener);
    } else {
      d3_geo_streamGeometry(object, listener);
    }
  };
  function d3_geo_streamGeometry(geometry, listener) {
    if (geometry && d3_geo_streamGeometryType.hasOwnProperty(geometry.type)) {
      d3_geo_streamGeometryType[geometry.type](geometry, listener);
    }
  }
  var d3_geo_streamObjectType = {
    Feature: function(feature, listener) {
      d3_geo_streamGeometry(feature.geometry, listener);
    },
    FeatureCollection: function(object, listener) {
      var features = object.features, i = -1, n = features.length;
      while (++i < n) d3_geo_streamGeometry(features[i].geometry, listener);
    }
  };
  var d3_geo_streamGeometryType = {
    Sphere: function(object, listener) {
      listener.sphere();
    },
    Point: function(object, listener) {
      object = object.coordinates;
      listener.point(object[0], object[1], object[2]);
    },
    MultiPoint: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) object = coordinates[i], listener.point(object[0], object[1], object[2]);
    },
    LineString: function(object, listener) {
      d3_geo_streamLine(object.coordinates, listener, 0);
    },
    MultiLineString: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamLine(coordinates[i], listener, 0);
    },
    Polygon: function(object, listener) {
      d3_geo_streamPolygon(object.coordinates, listener);
    },
    MultiPolygon: function(object, listener) {
      var coordinates = object.coordinates, i = -1, n = coordinates.length;
      while (++i < n) d3_geo_streamPolygon(coordinates[i], listener);
    },
    GeometryCollection: function(object, listener) {
      var geometries = object.geometries, i = -1, n = geometries.length;
      while (++i < n) d3_geo_streamGeometry(geometries[i], listener);
    }
  };
  function d3_geo_streamLine(coordinates, listener, closed) {
    var i = -1, n = coordinates.length - closed, coordinate;
    listener.lineStart();
    while (++i < n) coordinate = coordinates[i], listener.point(coordinate[0], coordinate[1], coordinate[2]);
    listener.lineEnd();
  }
  function d3_geo_streamPolygon(coordinates, listener) {
    var i = -1, n = coordinates.length;
    listener.polygonStart();
    while (++i < n) d3_geo_streamLine(coordinates[i], listener, 1);
    listener.polygonEnd();
  }
  d3.geo.area = function(object) {
    d3_geo_areaSum = 0;
    d3.geo.stream(object, d3_geo_area);
    return d3_geo_areaSum;
  };
  var d3_geo_areaSum, d3_geo_areaRingSum = new d3_adder();
  var d3_geo_area = {
    sphere: function() {
      d3_geo_areaSum += 4 * π;
    },
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_areaRingSum.reset();
      d3_geo_area.lineStart = d3_geo_areaRingStart;
    },
    polygonEnd: function() {
      var area = 2 * d3_geo_areaRingSum;
      d3_geo_areaSum += area < 0 ? 4 * π + area : area;
      d3_geo_area.lineStart = d3_geo_area.lineEnd = d3_geo_area.point = d3_noop;
    }
  };
  function d3_geo_areaRingStart() {
    var λ00, φ00, λ0, cosφ0, sinφ0;
    d3_geo_area.point = function(λ, φ) {
      d3_geo_area.point = nextPoint;
      λ0 = (λ00 = λ) * d3_radians, cosφ0 = Math.cos(φ = (φ00 = φ) * d3_radians / 2 + π / 4), 
      sinφ0 = Math.sin(φ);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      φ = φ * d3_radians / 2 + π / 4;
      var dλ = λ - λ0, cosφ = Math.cos(φ), sinφ = Math.sin(φ), k = sinφ0 * sinφ, u = cosφ0 * cosφ + k * Math.cos(dλ), v = k * Math.sin(dλ);
      d3_geo_areaRingSum.add(Math.atan2(v, u));
      λ0 = λ, cosφ0 = cosφ, sinφ0 = sinφ;
    }
    d3_geo_area.lineEnd = function() {
      nextPoint(λ00, φ00);
    };
  }
  function d3_geo_cartesian(spherical) {
    var λ = spherical[0], φ = spherical[1], cosφ = Math.cos(φ);
    return [ cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ) ];
  }
  function d3_geo_cartesianDot(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  }
  function d3_geo_cartesianCross(a, b) {
    return [ a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0] ];
  }
  function d3_geo_cartesianAdd(a, b) {
    a[0] += b[0];
    a[1] += b[1];
    a[2] += b[2];
  }
  function d3_geo_cartesianScale(vector, k) {
    return [ vector[0] * k, vector[1] * k, vector[2] * k ];
  }
  function d3_geo_cartesianNormalize(d) {
    var l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
    d[0] /= l;
    d[1] /= l;
    d[2] /= l;
  }
  function d3_geo_spherical(cartesian) {
    return [ Math.atan2(cartesian[1], cartesian[0]), d3_asin(cartesian[2]) ];
  }
  function d3_geo_sphericalEqual(a, b) {
    return abs(a[0] - b[0]) < ε && abs(a[1] - b[1]) < ε;
  }
  d3.geo.bounds = function() {
    var λ0, φ0, λ1, φ1, λ_, λ__, φ__, p0, dλSum, ranges, range;
    var bound = {
      point: point,
      lineStart: lineStart,
      lineEnd: lineEnd,
      polygonStart: function() {
        bound.point = ringPoint;
        bound.lineStart = ringStart;
        bound.lineEnd = ringEnd;
        dλSum = 0;
        d3_geo_area.polygonStart();
      },
      polygonEnd: function() {
        d3_geo_area.polygonEnd();
        bound.point = point;
        bound.lineStart = lineStart;
        bound.lineEnd = lineEnd;
        if (d3_geo_areaRingSum < 0) λ0 = -(λ1 = 180), φ0 = -(φ1 = 90); else if (dλSum > ε) φ1 = 90; else if (dλSum < -ε) φ0 = -90;
        range[0] = λ0, range[1] = λ1;
      }
    };
    function point(λ, φ) {
      ranges.push(range = [ λ0 = λ, λ1 = λ ]);
      if (φ < φ0) φ0 = φ;
      if (φ > φ1) φ1 = φ;
    }
    function linePoint(λ, φ) {
      var p = d3_geo_cartesian([ λ * d3_radians, φ * d3_radians ]);
      if (p0) {
        var normal = d3_geo_cartesianCross(p0, p), equatorial = [ normal[1], -normal[0], 0 ], inflection = d3_geo_cartesianCross(equatorial, normal);
        d3_geo_cartesianNormalize(inflection);
        inflection = d3_geo_spherical(inflection);
        var dλ = λ - λ_, s = dλ > 0 ? 1 : -1, λi = inflection[0] * d3_degrees * s, antimeridian = abs(dλ) > 180;
        if (antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = inflection[1] * d3_degrees;
          if (φi > φ1) φ1 = φi;
        } else if (λi = (λi + 360) % 360 - 180, antimeridian ^ (s * λ_ < λi && λi < s * λ)) {
          var φi = -inflection[1] * d3_degrees;
          if (φi < φ0) φ0 = φi;
        } else {
          if (φ < φ0) φ0 = φ;
          if (φ > φ1) φ1 = φ;
        }
        if (antimeridian) {
          if (λ < λ_) {
            if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
          } else {
            if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
          }
        } else {
          if (λ1 >= λ0) {
            if (λ < λ0) λ0 = λ;
            if (λ > λ1) λ1 = λ;
          } else {
            if (λ > λ_) {
              if (angle(λ0, λ) > angle(λ0, λ1)) λ1 = λ;
            } else {
              if (angle(λ, λ1) > angle(λ0, λ1)) λ0 = λ;
            }
          }
        }
      } else {
        point(λ, φ);
      }
      p0 = p, λ_ = λ;
    }
    function lineStart() {
      bound.point = linePoint;
    }
    function lineEnd() {
      range[0] = λ0, range[1] = λ1;
      bound.point = point;
      p0 = null;
    }
    function ringPoint(λ, φ) {
      if (p0) {
        var dλ = λ - λ_;
        dλSum += abs(dλ) > 180 ? dλ + (dλ > 0 ? 360 : -360) : dλ;
      } else λ__ = λ, φ__ = φ;
      d3_geo_area.point(λ, φ);
      linePoint(λ, φ);
    }
    function ringStart() {
      d3_geo_area.lineStart();
    }
    function ringEnd() {
      ringPoint(λ__, φ__);
      d3_geo_area.lineEnd();
      if (abs(dλSum) > ε) λ0 = -(λ1 = 180);
      range[0] = λ0, range[1] = λ1;
      p0 = null;
    }
    function angle(λ0, λ1) {
      return (λ1 -= λ0) < 0 ? λ1 + 360 : λ1;
    }
    function compareRanges(a, b) {
      return a[0] - b[0];
    }
    function withinRange(x, range) {
      return range[0] <= range[1] ? range[0] <= x && x <= range[1] : x < range[0] || range[1] < x;
    }
    return function(feature) {
      φ1 = λ1 = -(λ0 = φ0 = Infinity);
      ranges = [];
      d3.geo.stream(feature, bound);
      var n = ranges.length;
      if (n) {
        ranges.sort(compareRanges);
        for (var i = 1, a = ranges[0], b, merged = [ a ]; i < n; ++i) {
          b = ranges[i];
          if (withinRange(b[0], a) || withinRange(b[1], a)) {
            if (angle(a[0], b[1]) > angle(a[0], a[1])) a[1] = b[1];
            if (angle(b[0], a[1]) > angle(a[0], a[1])) a[0] = b[0];
          } else {
            merged.push(a = b);
          }
        }
        var best = -Infinity, dλ;
        for (var n = merged.length - 1, i = 0, a = merged[n], b; i <= n; a = b, ++i) {
          b = merged[i];
          if ((dλ = angle(a[1], b[0])) > best) best = dλ, λ0 = b[0], λ1 = a[1];
        }
      }
      ranges = range = null;
      return λ0 === Infinity || φ0 === Infinity ? [ [ NaN, NaN ], [ NaN, NaN ] ] : [ [ λ0, φ0 ], [ λ1, φ1 ] ];
    };
  }();
  d3.geo.centroid = function(object) {
    d3_geo_centroidW0 = d3_geo_centroidW1 = d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
    d3.geo.stream(object, d3_geo_centroid);
    var x = d3_geo_centroidX2, y = d3_geo_centroidY2, z = d3_geo_centroidZ2, m = x * x + y * y + z * z;
    if (m < ε2) {
      x = d3_geo_centroidX1, y = d3_geo_centroidY1, z = d3_geo_centroidZ1;
      if (d3_geo_centroidW1 < ε) x = d3_geo_centroidX0, y = d3_geo_centroidY0, z = d3_geo_centroidZ0;
      m = x * x + y * y + z * z;
      if (m < ε2) return [ NaN, NaN ];
    }
    return [ Math.atan2(y, x) * d3_degrees, d3_asin(z / Math.sqrt(m)) * d3_degrees ];
  };
  var d3_geo_centroidW0, d3_geo_centroidW1, d3_geo_centroidX0, d3_geo_centroidY0, d3_geo_centroidZ0, d3_geo_centroidX1, d3_geo_centroidY1, d3_geo_centroidZ1, d3_geo_centroidX2, d3_geo_centroidY2, d3_geo_centroidZ2;
  var d3_geo_centroid = {
    sphere: d3_noop,
    point: d3_geo_centroidPoint,
    lineStart: d3_geo_centroidLineStart,
    lineEnd: d3_geo_centroidLineEnd,
    polygonStart: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_centroid.lineStart = d3_geo_centroidLineStart;
    }
  };
  function d3_geo_centroidPoint(λ, φ) {
    λ *= d3_radians;
    var cosφ = Math.cos(φ *= d3_radians);
    d3_geo_centroidPointXYZ(cosφ * Math.cos(λ), cosφ * Math.sin(λ), Math.sin(φ));
  }
  function d3_geo_centroidPointXYZ(x, y, z) {
    ++d3_geo_centroidW0;
    d3_geo_centroidX0 += (x - d3_geo_centroidX0) / d3_geo_centroidW0;
    d3_geo_centroidY0 += (y - d3_geo_centroidY0) / d3_geo_centroidW0;
    d3_geo_centroidZ0 += (z - d3_geo_centroidZ0) / d3_geo_centroidW0;
  }
  function d3_geo_centroidLineStart() {
    var x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroid.point = nextPoint;
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), w = Math.atan2(Math.sqrt((w = y0 * z - z0 * y) * w + (w = z0 * x - x0 * z) * w + (w = x0 * y - y0 * x) * w), x0 * x + y0 * y + z0 * z);
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_geo_centroidLineEnd() {
    d3_geo_centroid.point = d3_geo_centroidPoint;
  }
  function d3_geo_centroidRingStart() {
    var λ00, φ00, x0, y0, z0;
    d3_geo_centroid.point = function(λ, φ) {
      λ00 = λ, φ00 = φ;
      d3_geo_centroid.point = nextPoint;
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians);
      x0 = cosφ * Math.cos(λ);
      y0 = cosφ * Math.sin(λ);
      z0 = Math.sin(φ);
      d3_geo_centroidPointXYZ(x0, y0, z0);
    };
    d3_geo_centroid.lineEnd = function() {
      nextPoint(λ00, φ00);
      d3_geo_centroid.lineEnd = d3_geo_centroidLineEnd;
      d3_geo_centroid.point = d3_geo_centroidPoint;
    };
    function nextPoint(λ, φ) {
      λ *= d3_radians;
      var cosφ = Math.cos(φ *= d3_radians), x = cosφ * Math.cos(λ), y = cosφ * Math.sin(λ), z = Math.sin(φ), cx = y0 * z - z0 * y, cy = z0 * x - x0 * z, cz = x0 * y - y0 * x, m = Math.sqrt(cx * cx + cy * cy + cz * cz), u = x0 * x + y0 * y + z0 * z, v = m && -d3_acos(u) / m, w = Math.atan2(m, u);
      d3_geo_centroidX2 += v * cx;
      d3_geo_centroidY2 += v * cy;
      d3_geo_centroidZ2 += v * cz;
      d3_geo_centroidW1 += w;
      d3_geo_centroidX1 += w * (x0 + (x0 = x));
      d3_geo_centroidY1 += w * (y0 + (y0 = y));
      d3_geo_centroidZ1 += w * (z0 + (z0 = z));
      d3_geo_centroidPointXYZ(x0, y0, z0);
    }
  }
  function d3_true() {
    return true;
  }
  function d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener) {
    var subject = [], clip = [];
    segments.forEach(function(segment) {
      if ((n = segment.length - 1) <= 0) return;
      var n, p0 = segment[0], p1 = segment[n];
      if (d3_geo_sphericalEqual(p0, p1)) {
        listener.lineStart();
        for (var i = 0; i < n; ++i) listener.point((p0 = segment[i])[0], p0[1]);
        listener.lineEnd();
        return;
      }
      var a = new d3_geo_clipPolygonIntersection(p0, segment, null, true), b = new d3_geo_clipPolygonIntersection(p0, null, a, false);
      a.o = b;
      subject.push(a);
      clip.push(b);
      a = new d3_geo_clipPolygonIntersection(p1, segment, null, false);
      b = new d3_geo_clipPolygonIntersection(p1, null, a, true);
      a.o = b;
      subject.push(a);
      clip.push(b);
    });
    clip.sort(compare);
    d3_geo_clipPolygonLinkCircular(subject);
    d3_geo_clipPolygonLinkCircular(clip);
    if (!subject.length) return;
    for (var i = 0, entry = clipStartInside, n = clip.length; i < n; ++i) {
      clip[i].e = entry = !entry;
    }
    var start = subject[0], points, point;
    while (1) {
      var current = start, isSubject = true;
      while (current.v) if ((current = current.n) === start) return;
      points = current.z;
      listener.lineStart();
      do {
        current.v = current.o.v = true;
        if (current.e) {
          if (isSubject) {
            for (var i = 0, n = points.length; i < n; ++i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.n.x, 1, listener);
          }
          current = current.n;
        } else {
          if (isSubject) {
            points = current.p.z;
            for (var i = points.length - 1; i >= 0; --i) listener.point((point = points[i])[0], point[1]);
          } else {
            interpolate(current.x, current.p.x, -1, listener);
          }
          current = current.p;
        }
        current = current.o;
        points = current.z;
        isSubject = !isSubject;
      } while (!current.v);
      listener.lineEnd();
    }
  }
  function d3_geo_clipPolygonLinkCircular(array) {
    if (!(n = array.length)) return;
    var n, i = 0, a = array[0], b;
    while (++i < n) {
      a.n = b = array[i];
      b.p = a;
      a = b;
    }
    a.n = b = array[0];
    b.p = a;
  }
  function d3_geo_clipPolygonIntersection(point, points, other, entry) {
    this.x = point;
    this.z = points;
    this.o = other;
    this.e = entry;
    this.v = false;
    this.n = this.p = null;
  }
  function d3_geo_clip(pointVisible, clipLine, interpolate, clipStart) {
    return function(rotate, listener) {
      var line = clipLine(listener), rotatedClipStart = rotate.invert(clipStart[0], clipStart[1]);
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          clip.point = pointRing;
          clip.lineStart = ringStart;
          clip.lineEnd = ringEnd;
          segments = [];
          polygon = [];
          listener.polygonStart();
        },
        polygonEnd: function() {
          clip.point = point;
          clip.lineStart = lineStart;
          clip.lineEnd = lineEnd;
          segments = d3.merge(segments);
          var clipStartInside = d3_geo_pointInPolygon(rotatedClipStart, polygon);
          if (segments.length) {
            d3_geo_clipPolygon(segments, d3_geo_clipSort, clipStartInside, interpolate, listener);
          } else if (clipStartInside) {
            listener.lineStart();
            interpolate(null, null, 1, listener);
            listener.lineEnd();
          }
          listener.polygonEnd();
          segments = polygon = null;
        },
        sphere: function() {
          listener.polygonStart();
          listener.lineStart();
          interpolate(null, null, 1, listener);
          listener.lineEnd();
          listener.polygonEnd();
        }
      };
      function point(λ, φ) {
        var point = rotate(λ, φ);
        if (pointVisible(λ = point[0], φ = point[1])) listener.point(λ, φ);
      }
      function pointLine(λ, φ) {
        var point = rotate(λ, φ);
        line.point(point[0], point[1]);
      }
      function lineStart() {
        clip.point = pointLine;
        line.lineStart();
      }
      function lineEnd() {
        clip.point = point;
        line.lineEnd();
      }
      var segments;
      var buffer = d3_geo_clipBufferListener(), ringListener = clipLine(buffer), polygon, ring;
      function pointRing(λ, φ) {
        ring.push([ λ, φ ]);
        var point = rotate(λ, φ);
        ringListener.point(point[0], point[1]);
      }
      function ringStart() {
        ringListener.lineStart();
        ring = [];
      }
      function ringEnd() {
        pointRing(ring[0][0], ring[0][1]);
        ringListener.lineEnd();
        var clean = ringListener.clean(), ringSegments = buffer.buffer(), segment, n = ringSegments.length;
        ring.pop();
        polygon.push(ring);
        ring = null;
        if (!n) return;
        if (clean & 1) {
          segment = ringSegments[0];
          var n = segment.length - 1, i = -1, point;
          listener.lineStart();
          while (++i < n) listener.point((point = segment[i])[0], point[1]);
          listener.lineEnd();
          return;
        }
        if (n > 1 && clean & 2) ringSegments.push(ringSegments.pop().concat(ringSegments.shift()));
        segments.push(ringSegments.filter(d3_geo_clipSegmentLength1));
      }
      return clip;
    };
  }
  function d3_geo_clipSegmentLength1(segment) {
    return segment.length > 1;
  }
  function d3_geo_clipBufferListener() {
    var lines = [], line;
    return {
      lineStart: function() {
        lines.push(line = []);
      },
      point: function(λ, φ) {
        line.push([ λ, φ ]);
      },
      lineEnd: d3_noop,
      buffer: function() {
        var buffer = lines;
        lines = [];
        line = null;
        return buffer;
      },
      rejoin: function() {
        if (lines.length > 1) lines.push(lines.pop().concat(lines.shift()));
      }
    };
  }
  function d3_geo_clipSort(a, b) {
    return ((a = a.x)[0] < 0 ? a[1] - halfπ - ε : halfπ - a[1]) - ((b = b.x)[0] < 0 ? b[1] - halfπ - ε : halfπ - b[1]);
  }
  function d3_geo_pointInPolygon(point, polygon) {
    var meridian = point[0], parallel = point[1], meridianNormal = [ Math.sin(meridian), -Math.cos(meridian), 0 ], polarAngle = 0, winding = 0;
    d3_geo_areaRingSum.reset();
    for (var i = 0, n = polygon.length; i < n; ++i) {
      var ring = polygon[i], m = ring.length;
      if (!m) continue;
      var point0 = ring[0], λ0 = point0[0], φ0 = point0[1] / 2 + π / 4, sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), j = 1;
      while (true) {
        if (j === m) j = 0;
        point = ring[j];
        var λ = point[0], φ = point[1] / 2 + π / 4, sinφ = Math.sin(φ), cosφ = Math.cos(φ), dλ = λ - λ0, antimeridian = abs(dλ) > π, k = sinφ0 * sinφ;
        d3_geo_areaRingSum.add(Math.atan2(k * Math.sin(dλ), cosφ0 * cosφ + k * Math.cos(dλ)));
        polarAngle += antimeridian ? dλ + (dλ >= 0 ? τ : -τ) : dλ;
        if (antimeridian ^ λ0 >= meridian ^ λ >= meridian) {
          var arc = d3_geo_cartesianCross(d3_geo_cartesian(point0), d3_geo_cartesian(point));
          d3_geo_cartesianNormalize(arc);
          var intersection = d3_geo_cartesianCross(meridianNormal, arc);
          d3_geo_cartesianNormalize(intersection);
          var φarc = (antimeridian ^ dλ >= 0 ? -1 : 1) * d3_asin(intersection[2]);
          if (parallel > φarc || parallel === φarc && (arc[0] || arc[1])) {
            winding += antimeridian ^ dλ >= 0 ? 1 : -1;
          }
        }
        if (!j++) break;
        λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ, point0 = point;
      }
    }
    return (polarAngle < -ε || polarAngle < ε && d3_geo_areaRingSum < 0) ^ winding & 1;
  }
  var d3_geo_clipAntimeridian = d3_geo_clip(d3_true, d3_geo_clipAntimeridianLine, d3_geo_clipAntimeridianInterpolate, [ -π, -π / 2 ]);
  function d3_geo_clipAntimeridianLine(listener) {
    var λ0 = NaN, φ0 = NaN, sλ0 = NaN, clean;
    return {
      lineStart: function() {
        listener.lineStart();
        clean = 1;
      },
      point: function(λ1, φ1) {
        var sλ1 = λ1 > 0 ? π : -π, dλ = abs(λ1 - λ0);
        if (abs(dλ - π) < ε) {
          listener.point(λ0, φ0 = (φ0 + φ1) / 2 > 0 ? halfπ : -halfπ);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          listener.point(λ1, φ0);
          clean = 0;
        } else if (sλ0 !== sλ1 && dλ >= π) {
          if (abs(λ0 - sλ0) < ε) λ0 -= sλ0 * ε;
          if (abs(λ1 - sλ1) < ε) λ1 -= sλ1 * ε;
          φ0 = d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1);
          listener.point(sλ0, φ0);
          listener.lineEnd();
          listener.lineStart();
          listener.point(sλ1, φ0);
          clean = 0;
        }
        listener.point(λ0 = λ1, φ0 = φ1);
        sλ0 = sλ1;
      },
      lineEnd: function() {
        listener.lineEnd();
        λ0 = φ0 = NaN;
      },
      clean: function() {
        return 2 - clean;
      }
    };
  }
  function d3_geo_clipAntimeridianIntersect(λ0, φ0, λ1, φ1) {
    var cosφ0, cosφ1, sinλ0_λ1 = Math.sin(λ0 - λ1);
    return abs(sinλ0_λ1) > ε ? Math.atan((Math.sin(φ0) * (cosφ1 = Math.cos(φ1)) * Math.sin(λ1) - Math.sin(φ1) * (cosφ0 = Math.cos(φ0)) * Math.sin(λ0)) / (cosφ0 * cosφ1 * sinλ0_λ1)) : (φ0 + φ1) / 2;
  }
  function d3_geo_clipAntimeridianInterpolate(from, to, direction, listener) {
    var φ;
    if (from == null) {
      φ = direction * halfπ;
      listener.point(-π, φ);
      listener.point(0, φ);
      listener.point(π, φ);
      listener.point(π, 0);
      listener.point(π, -φ);
      listener.point(0, -φ);
      listener.point(-π, -φ);
      listener.point(-π, 0);
      listener.point(-π, φ);
    } else if (abs(from[0] - to[0]) > ε) {
      var s = from[0] < to[0] ? π : -π;
      φ = direction * s / 2;
      listener.point(-s, φ);
      listener.point(0, φ);
      listener.point(s, φ);
    } else {
      listener.point(to[0], to[1]);
    }
  }
  function d3_geo_clipCircle(radius) {
    var cr = Math.cos(radius), smallRadius = cr > 0, notHemisphere = abs(cr) > ε, interpolate = d3_geo_circleInterpolate(radius, 6 * d3_radians);
    return d3_geo_clip(visible, clipLine, interpolate, smallRadius ? [ 0, -radius ] : [ -π, radius - π ]);
    function visible(λ, φ) {
      return Math.cos(λ) * Math.cos(φ) > cr;
    }
    function clipLine(listener) {
      var point0, c0, v0, v00, clean;
      return {
        lineStart: function() {
          v00 = v0 = false;
          clean = 1;
        },
        point: function(λ, φ) {
          var point1 = [ λ, φ ], point2, v = visible(λ, φ), c = smallRadius ? v ? 0 : code(λ, φ) : v ? code(λ + (λ < 0 ? π : -π), φ) : 0;
          if (!point0 && (v00 = v0 = v)) listener.lineStart();
          if (v !== v0) {
            point2 = intersect(point0, point1);
            if (d3_geo_sphericalEqual(point0, point2) || d3_geo_sphericalEqual(point1, point2)) {
              point1[0] += ε;
              point1[1] += ε;
              v = visible(point1[0], point1[1]);
            }
          }
          if (v !== v0) {
            clean = 0;
            if (v) {
              listener.lineStart();
              point2 = intersect(point1, point0);
              listener.point(point2[0], point2[1]);
            } else {
              point2 = intersect(point0, point1);
              listener.point(point2[0], point2[1]);
              listener.lineEnd();
            }
            point0 = point2;
          } else if (notHemisphere && point0 && smallRadius ^ v) {
            var t;
            if (!(c & c0) && (t = intersect(point1, point0, true))) {
              clean = 0;
              if (smallRadius) {
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
              } else {
                listener.point(t[1][0], t[1][1]);
                listener.lineEnd();
                listener.lineStart();
                listener.point(t[0][0], t[0][1]);
              }
            }
          }
          if (v && (!point0 || !d3_geo_sphericalEqual(point0, point1))) {
            listener.point(point1[0], point1[1]);
          }
          point0 = point1, v0 = v, c0 = c;
        },
        lineEnd: function() {
          if (v0) listener.lineEnd();
          point0 = null;
        },
        clean: function() {
          return clean | (v00 && v0) << 1;
        }
      };
    }
    function intersect(a, b, two) {
      var pa = d3_geo_cartesian(a), pb = d3_geo_cartesian(b);
      var n1 = [ 1, 0, 0 ], n2 = d3_geo_cartesianCross(pa, pb), n2n2 = d3_geo_cartesianDot(n2, n2), n1n2 = n2[0], determinant = n2n2 - n1n2 * n1n2;
      if (!determinant) return !two && a;
      var c1 = cr * n2n2 / determinant, c2 = -cr * n1n2 / determinant, n1xn2 = d3_geo_cartesianCross(n1, n2), A = d3_geo_cartesianScale(n1, c1), B = d3_geo_cartesianScale(n2, c2);
      d3_geo_cartesianAdd(A, B);
      var u = n1xn2, w = d3_geo_cartesianDot(A, u), uu = d3_geo_cartesianDot(u, u), t2 = w * w - uu * (d3_geo_cartesianDot(A, A) - 1);
      if (t2 < 0) return;
      var t = Math.sqrt(t2), q = d3_geo_cartesianScale(u, (-w - t) / uu);
      d3_geo_cartesianAdd(q, A);
      q = d3_geo_spherical(q);
      if (!two) return q;
      var λ0 = a[0], λ1 = b[0], φ0 = a[1], φ1 = b[1], z;
      if (λ1 < λ0) z = λ0, λ0 = λ1, λ1 = z;
      var δλ = λ1 - λ0, polar = abs(δλ - π) < ε, meridian = polar || δλ < ε;
      if (!polar && φ1 < φ0) z = φ0, φ0 = φ1, φ1 = z;
      if (meridian ? polar ? φ0 + φ1 > 0 ^ q[1] < (abs(q[0] - λ0) < ε ? φ0 : φ1) : φ0 <= q[1] && q[1] <= φ1 : δλ > π ^ (λ0 <= q[0] && q[0] <= λ1)) {
        var q1 = d3_geo_cartesianScale(u, (-w + t) / uu);
        d3_geo_cartesianAdd(q1, A);
        return [ q, d3_geo_spherical(q1) ];
      }
    }
    function code(λ, φ) {
      var r = smallRadius ? radius : π - radius, code = 0;
      if (λ < -r) code |= 1; else if (λ > r) code |= 2;
      if (φ < -r) code |= 4; else if (φ > r) code |= 8;
      return code;
    }
  }
  function d3_geom_clipLine(x0, y0, x1, y1) {
    return function(line) {
      var a = line.a, b = line.b, ax = a.x, ay = a.y, bx = b.x, by = b.y, t0 = 0, t1 = 1, dx = bx - ax, dy = by - ay, r;
      r = x0 - ax;
      if (!dx && r > 0) return;
      r /= dx;
      if (dx < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dx > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = x1 - ax;
      if (!dx && r < 0) return;
      r /= dx;
      if (dx < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dx > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      r = y0 - ay;
      if (!dy && r > 0) return;
      r /= dy;
      if (dy < 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      } else if (dy > 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      }
      r = y1 - ay;
      if (!dy && r < 0) return;
      r /= dy;
      if (dy < 0) {
        if (r > t1) return;
        if (r > t0) t0 = r;
      } else if (dy > 0) {
        if (r < t0) return;
        if (r < t1) t1 = r;
      }
      if (t0 > 0) line.a = {
        x: ax + t0 * dx,
        y: ay + t0 * dy
      };
      if (t1 < 1) line.b = {
        x: ax + t1 * dx,
        y: ay + t1 * dy
      };
      return line;
    };
  }
  var d3_geo_clipExtentMAX = 1e9;
  d3.geo.clipExtent = function() {
    var x0, y0, x1, y1, stream, clip, clipExtent = {
      stream: function(output) {
        if (stream) stream.valid = false;
        stream = clip(output);
        stream.valid = true;
        return stream;
      },
      extent: function(_) {
        if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
        clip = d3_geo_clipExtent(x0 = +_[0][0], y0 = +_[0][1], x1 = +_[1][0], y1 = +_[1][1]);
        if (stream) stream.valid = false, stream = null;
        return clipExtent;
      }
    };
    return clipExtent.extent([ [ 0, 0 ], [ 960, 500 ] ]);
  };
  function d3_geo_clipExtent(x0, y0, x1, y1) {
    return function(listener) {
      var listener_ = listener, bufferListener = d3_geo_clipBufferListener(), clipLine = d3_geom_clipLine(x0, y0, x1, y1), segments, polygon, ring;
      var clip = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          listener = bufferListener;
          segments = [];
          polygon = [];
          clean = true;
        },
        polygonEnd: function() {
          listener = listener_;
          segments = d3.merge(segments);
          var clipStartInside = insidePolygon([ x0, y1 ]), inside = clean && clipStartInside, visible = segments.length;
          if (inside || visible) {
            listener.polygonStart();
            if (inside) {
              listener.lineStart();
              interpolate(null, null, 1, listener);
              listener.lineEnd();
            }
            if (visible) {
              d3_geo_clipPolygon(segments, compare, clipStartInside, interpolate, listener);
            }
            listener.polygonEnd();
          }
          segments = polygon = ring = null;
        }
      };
      function insidePolygon(p) {
        var wn = 0, n = polygon.length, y = p[1];
        for (var i = 0; i < n; ++i) {
          for (var j = 1, v = polygon[i], m = v.length, a = v[0], b; j < m; ++j) {
            b = v[j];
            if (a[1] <= y) {
              if (b[1] > y && isLeft(a, b, p) > 0) ++wn;
            } else {
              if (b[1] <= y && isLeft(a, b, p) < 0) --wn;
            }
            a = b;
          }
        }
        return wn !== 0;
      }
      function isLeft(a, b, c) {
        return (b[0] - a[0]) * (c[1] - a[1]) - (c[0] - a[0]) * (b[1] - a[1]);
      }
      function interpolate(from, to, direction, listener) {
        var a = 0, a1 = 0;
        if (from == null || (a = corner(from, direction)) !== (a1 = corner(to, direction)) || comparePoints(from, to) < 0 ^ direction > 0) {
          do {
            listener.point(a === 0 || a === 3 ? x0 : x1, a > 1 ? y1 : y0);
          } while ((a = (a + direction + 4) % 4) !== a1);
        } else {
          listener.point(to[0], to[1]);
        }
      }
      function pointVisible(x, y) {
        return x0 <= x && x <= x1 && y0 <= y && y <= y1;
      }
      function point(x, y) {
        if (pointVisible(x, y)) listener.point(x, y);
      }
      var x__, y__, v__, x_, y_, v_, first, clean;
      function lineStart() {
        clip.point = linePoint;
        if (polygon) polygon.push(ring = []);
        first = true;
        v_ = false;
        x_ = y_ = NaN;
      }
      function lineEnd() {
        if (segments) {
          linePoint(x__, y__);
          if (v__ && v_) bufferListener.rejoin();
          segments.push(bufferListener.buffer());
        }
        clip.point = point;
        if (v_) listener.lineEnd();
      }
      function linePoint(x, y) {
        x = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, x));
        y = Math.max(-d3_geo_clipExtentMAX, Math.min(d3_geo_clipExtentMAX, y));
        var v = pointVisible(x, y);
        if (polygon) ring.push([ x, y ]);
        if (first) {
          x__ = x, y__ = y, v__ = v;
          first = false;
          if (v) {
            listener.lineStart();
            listener.point(x, y);
          }
        } else {
          if (v && v_) listener.point(x, y); else {
            var l = {
              a: {
                x: x_,
                y: y_
              },
              b: {
                x: x,
                y: y
              }
            };
            if (clipLine(l)) {
              if (!v_) {
                listener.lineStart();
                listener.point(l.a.x, l.a.y);
              }
              listener.point(l.b.x, l.b.y);
              if (!v) listener.lineEnd();
              clean = false;
            } else if (v) {
              listener.lineStart();
              listener.point(x, y);
              clean = false;
            }
          }
        }
        x_ = x, y_ = y, v_ = v;
      }
      return clip;
    };
    function corner(p, direction) {
      return abs(p[0] - x0) < ε ? direction > 0 ? 0 : 3 : abs(p[0] - x1) < ε ? direction > 0 ? 2 : 1 : abs(p[1] - y0) < ε ? direction > 0 ? 1 : 0 : direction > 0 ? 3 : 2;
    }
    function compare(a, b) {
      return comparePoints(a.x, b.x);
    }
    function comparePoints(a, b) {
      var ca = corner(a, 1), cb = corner(b, 1);
      return ca !== cb ? ca - cb : ca === 0 ? b[1] - a[1] : ca === 1 ? a[0] - b[0] : ca === 2 ? a[1] - b[1] : b[0] - a[0];
    }
  }
  function d3_geo_compose(a, b) {
    function compose(x, y) {
      return x = a(x, y), b(x[0], x[1]);
    }
    if (a.invert && b.invert) compose.invert = function(x, y) {
      return x = b.invert(x, y), x && a.invert(x[0], x[1]);
    };
    return compose;
  }
  function d3_geo_conic(projectAt) {
    var φ0 = 0, φ1 = π / 3, m = d3_geo_projectionMutator(projectAt), p = m(φ0, φ1);
    p.parallels = function(_) {
      if (!arguments.length) return [ φ0 / π * 180, φ1 / π * 180 ];
      return m(φ0 = _[0] * π / 180, φ1 = _[1] * π / 180);
    };
    return p;
  }
  function d3_geo_conicEqualArea(φ0, φ1) {
    var sinφ0 = Math.sin(φ0), n = (sinφ0 + Math.sin(φ1)) / 2, C = 1 + sinφ0 * (2 * n - sinφ0), ρ0 = Math.sqrt(C) / n;
    function forward(λ, φ) {
      var ρ = Math.sqrt(C - 2 * n * Math.sin(φ)) / n;
      return [ ρ * Math.sin(λ *= n), ρ0 - ρ * Math.cos(λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = ρ0 - y;
      return [ Math.atan2(x, ρ0_y) / n, d3_asin((C - (x * x + ρ0_y * ρ0_y) * n * n) / (2 * n)) ];
    };
    return forward;
  }
  (d3.geo.conicEqualArea = function() {
    return d3_geo_conic(d3_geo_conicEqualArea);
  }).raw = d3_geo_conicEqualArea;
  d3.geo.albers = function() {
    return d3.geo.conicEqualArea().rotate([ 96, 0 ]).center([ -.6, 38.7 ]).parallels([ 29.5, 45.5 ]).scale(1070);
  };
  d3.geo.albersUsa = function() {
    var lower48 = d3.geo.albers();
    var alaska = d3.geo.conicEqualArea().rotate([ 154, 0 ]).center([ -2, 58.5 ]).parallels([ 55, 65 ]);
    var hawaii = d3.geo.conicEqualArea().rotate([ 157, 0 ]).center([ -3, 19.9 ]).parallels([ 8, 18 ]);
    var point, pointStream = {
      point: function(x, y) {
        point = [ x, y ];
      }
    }, lower48Point, alaskaPoint, hawaiiPoint;
    function albersUsa(coordinates) {
      var x = coordinates[0], y = coordinates[1];
      point = null;
      (lower48Point(x, y), point) || (alaskaPoint(x, y), point) || hawaiiPoint(x, y);
      return point;
    }
    albersUsa.invert = function(coordinates) {
      var k = lower48.scale(), t = lower48.translate(), x = (coordinates[0] - t[0]) / k, y = (coordinates[1] - t[1]) / k;
      return (y >= .12 && y < .234 && x >= -.425 && x < -.214 ? alaska : y >= .166 && y < .234 && x >= -.214 && x < -.115 ? hawaii : lower48).invert(coordinates);
    };
    albersUsa.stream = function(stream) {
      var lower48Stream = lower48.stream(stream), alaskaStream = alaska.stream(stream), hawaiiStream = hawaii.stream(stream);
      return {
        point: function(x, y) {
          lower48Stream.point(x, y);
          alaskaStream.point(x, y);
          hawaiiStream.point(x, y);
        },
        sphere: function() {
          lower48Stream.sphere();
          alaskaStream.sphere();
          hawaiiStream.sphere();
        },
        lineStart: function() {
          lower48Stream.lineStart();
          alaskaStream.lineStart();
          hawaiiStream.lineStart();
        },
        lineEnd: function() {
          lower48Stream.lineEnd();
          alaskaStream.lineEnd();
          hawaiiStream.lineEnd();
        },
        polygonStart: function() {
          lower48Stream.polygonStart();
          alaskaStream.polygonStart();
          hawaiiStream.polygonStart();
        },
        polygonEnd: function() {
          lower48Stream.polygonEnd();
          alaskaStream.polygonEnd();
          hawaiiStream.polygonEnd();
        }
      };
    };
    albersUsa.precision = function(_) {
      if (!arguments.length) return lower48.precision();
      lower48.precision(_);
      alaska.precision(_);
      hawaii.precision(_);
      return albersUsa;
    };
    albersUsa.scale = function(_) {
      if (!arguments.length) return lower48.scale();
      lower48.scale(_);
      alaska.scale(_ * .35);
      hawaii.scale(_);
      return albersUsa.translate(lower48.translate());
    };
    albersUsa.translate = function(_) {
      if (!arguments.length) return lower48.translate();
      var k = lower48.scale(), x = +_[0], y = +_[1];
      lower48Point = lower48.translate(_).clipExtent([ [ x - .455 * k, y - .238 * k ], [ x + .455 * k, y + .238 * k ] ]).stream(pointStream).point;
      alaskaPoint = alaska.translate([ x - .307 * k, y + .201 * k ]).clipExtent([ [ x - .425 * k + ε, y + .12 * k + ε ], [ x - .214 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      hawaiiPoint = hawaii.translate([ x - .205 * k, y + .212 * k ]).clipExtent([ [ x - .214 * k + ε, y + .166 * k + ε ], [ x - .115 * k - ε, y + .234 * k - ε ] ]).stream(pointStream).point;
      return albersUsa;
    };
    return albersUsa.scale(1070);
  };
  var d3_geo_pathAreaSum, d3_geo_pathAreaPolygon, d3_geo_pathArea = {
    point: d3_noop,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: function() {
      d3_geo_pathAreaPolygon = 0;
      d3_geo_pathArea.lineStart = d3_geo_pathAreaRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathArea.lineStart = d3_geo_pathArea.lineEnd = d3_geo_pathArea.point = d3_noop;
      d3_geo_pathAreaSum += abs(d3_geo_pathAreaPolygon / 2);
    }
  };
  function d3_geo_pathAreaRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathArea.point = function(x, y) {
      d3_geo_pathArea.point = nextPoint;
      x00 = x0 = x, y00 = y0 = y;
    };
    function nextPoint(x, y) {
      d3_geo_pathAreaPolygon += y0 * x - x0 * y;
      x0 = x, y0 = y;
    }
    d3_geo_pathArea.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  var d3_geo_pathBoundsX0, d3_geo_pathBoundsY0, d3_geo_pathBoundsX1, d3_geo_pathBoundsY1;
  var d3_geo_pathBounds = {
    point: d3_geo_pathBoundsPoint,
    lineStart: d3_noop,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_pathBoundsPoint(x, y) {
    if (x < d3_geo_pathBoundsX0) d3_geo_pathBoundsX0 = x;
    if (x > d3_geo_pathBoundsX1) d3_geo_pathBoundsX1 = x;
    if (y < d3_geo_pathBoundsY0) d3_geo_pathBoundsY0 = y;
    if (y > d3_geo_pathBoundsY1) d3_geo_pathBoundsY1 = y;
  }
  function d3_geo_pathBuffer() {
    var pointCircle = d3_geo_pathBufferCircle(4.5), buffer = [];
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointCircle = d3_geo_pathBufferCircle(_);
        return stream;
      },
      result: function() {
        if (buffer.length) {
          var result = buffer.join("");
          buffer = [];
          return result;
        }
      }
    };
    function point(x, y) {
      buffer.push("M", x, ",", y, pointCircle);
    }
    function pointLineStart(x, y) {
      buffer.push("M", x, ",", y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      buffer.push("L", x, ",", y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      buffer.push("Z");
    }
    return stream;
  }
  function d3_geo_pathBufferCircle(radius) {
    return "m0," + radius + "a" + radius + "," + radius + " 0 1,1 0," + -2 * radius + "a" + radius + "," + radius + " 0 1,1 0," + 2 * radius + "z";
  }
  var d3_geo_pathCentroid = {
    point: d3_geo_pathCentroidPoint,
    lineStart: d3_geo_pathCentroidLineStart,
    lineEnd: d3_geo_pathCentroidLineEnd,
    polygonStart: function() {
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidRingStart;
    },
    polygonEnd: function() {
      d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
      d3_geo_pathCentroid.lineStart = d3_geo_pathCentroidLineStart;
      d3_geo_pathCentroid.lineEnd = d3_geo_pathCentroidLineEnd;
    }
  };
  function d3_geo_pathCentroidPoint(x, y) {
    d3_geo_centroidX0 += x;
    d3_geo_centroidY0 += y;
    ++d3_geo_centroidZ0;
  }
  function d3_geo_pathCentroidLineStart() {
    var x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
  }
  function d3_geo_pathCentroidLineEnd() {
    d3_geo_pathCentroid.point = d3_geo_pathCentroidPoint;
  }
  function d3_geo_pathCentroidRingStart() {
    var x00, y00, x0, y0;
    d3_geo_pathCentroid.point = function(x, y) {
      d3_geo_pathCentroid.point = nextPoint;
      d3_geo_pathCentroidPoint(x00 = x0 = x, y00 = y0 = y);
    };
    function nextPoint(x, y) {
      var dx = x - x0, dy = y - y0, z = Math.sqrt(dx * dx + dy * dy);
      d3_geo_centroidX1 += z * (x0 + x) / 2;
      d3_geo_centroidY1 += z * (y0 + y) / 2;
      d3_geo_centroidZ1 += z;
      z = y0 * x - x0 * y;
      d3_geo_centroidX2 += z * (x0 + x);
      d3_geo_centroidY2 += z * (y0 + y);
      d3_geo_centroidZ2 += z * 3;
      d3_geo_pathCentroidPoint(x0 = x, y0 = y);
    }
    d3_geo_pathCentroid.lineEnd = function() {
      nextPoint(x00, y00);
    };
  }
  function d3_geo_pathContext(context) {
    var pointRadius = 4.5;
    var stream = {
      point: point,
      lineStart: function() {
        stream.point = pointLineStart;
      },
      lineEnd: lineEnd,
      polygonStart: function() {
        stream.lineEnd = lineEndPolygon;
      },
      polygonEnd: function() {
        stream.lineEnd = lineEnd;
        stream.point = point;
      },
      pointRadius: function(_) {
        pointRadius = _;
        return stream;
      },
      result: d3_noop
    };
    function point(x, y) {
      context.moveTo(x, y);
      context.arc(x, y, pointRadius, 0, τ);
    }
    function pointLineStart(x, y) {
      context.moveTo(x, y);
      stream.point = pointLine;
    }
    function pointLine(x, y) {
      context.lineTo(x, y);
    }
    function lineEnd() {
      stream.point = point;
    }
    function lineEndPolygon() {
      context.closePath();
    }
    return stream;
  }
  function d3_geo_resample(project) {
    var δ2 = .5, cosMinDistance = Math.cos(30 * d3_radians), maxDepth = 16;
    function resample(stream) {
      var λ00, φ00, x00, y00, a00, b00, c00, λ0, x0, y0, a0, b0, c0;
      var resample = {
        point: point,
        lineStart: lineStart,
        lineEnd: lineEnd,
        polygonStart: function() {
          stream.polygonStart();
          resample.lineStart = ringStart;
        },
        polygonEnd: function() {
          stream.polygonEnd();
          resample.lineStart = lineStart;
        }
      };
      function point(x, y) {
        x = project(x, y);
        stream.point(x[0], x[1]);
      }
      function lineStart() {
        x0 = NaN;
        resample.point = linePoint;
        stream.lineStart();
      }
      function linePoint(λ, φ) {
        var c = d3_geo_cartesian([ λ, φ ]), p = project(λ, φ);
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x0 = p[0], y0 = p[1], λ0 = λ, a0 = c[0], b0 = c[1], c0 = c[2], maxDepth, stream);
        stream.point(x0, y0);
      }
      function lineEnd() {
        resample.point = point;
        stream.lineEnd();
      }
      function ringStart() {
        lineStart();
        resample.point = ringPoint;
        resample.lineEnd = ringEnd;
      }
      function ringPoint(λ, φ) {
        linePoint(λ00 = λ, φ00 = φ), x00 = x0, y00 = y0, a00 = a0, b00 = b0, c00 = c0;
        resample.point = linePoint;
      }
      function ringEnd() {
        resampleLineTo(x0, y0, λ0, a0, b0, c0, x00, y00, λ00, a00, b00, c00, maxDepth, stream);
        resample.lineEnd = lineEnd;
        lineEnd();
      }
      return resample;
    }
    function resampleLineTo(x0, y0, λ0, a0, b0, c0, x1, y1, λ1, a1, b1, c1, depth, stream) {
      var dx = x1 - x0, dy = y1 - y0, d2 = dx * dx + dy * dy;
      if (d2 > 4 * δ2 && depth--) {
        var a = a0 + a1, b = b0 + b1, c = c0 + c1, m = Math.sqrt(a * a + b * b + c * c), φ2 = Math.asin(c /= m), λ2 = abs(abs(c) - 1) < ε ? (λ0 + λ1) / 2 : Math.atan2(b, a), p = project(λ2, φ2), x2 = p[0], y2 = p[1], dx2 = x2 - x0, dy2 = y2 - y0, dz = dy * dx2 - dx * dy2;
        if (dz * dz / d2 > δ2 || abs((dx * dx2 + dy * dy2) / d2 - .5) > .3 || a0 * a1 + b0 * b1 + c0 * c1 < cosMinDistance) {
          resampleLineTo(x0, y0, λ0, a0, b0, c0, x2, y2, λ2, a /= m, b /= m, c, depth, stream);
          stream.point(x2, y2);
          resampleLineTo(x2, y2, λ2, a, b, c, x1, y1, λ1, a1, b1, c1, depth, stream);
        }
      }
    }
    resample.precision = function(_) {
      if (!arguments.length) return Math.sqrt(δ2);
      maxDepth = (δ2 = _ * _) > 0 && 16;
      return resample;
    };
    return resample;
  }
  d3.geo.transform = function(methods) {
    return {
      stream: function(stream) {
        var transform = new d3_geo_transform(stream);
        for (var k in methods) transform[k] = methods[k];
        return transform;
      }
    };
  };
  function d3_geo_transform(stream) {
    this.stream = stream;
  }
  d3_geo_transform.prototype = {
    point: function(x, y) {
      this.stream.point(x, y);
    },
    sphere: function() {
      this.stream.sphere();
    },
    lineStart: function() {
      this.stream.lineStart();
    },
    lineEnd: function() {
      this.stream.lineEnd();
    },
    polygonStart: function() {
      this.stream.polygonStart();
    },
    polygonEnd: function() {
      this.stream.polygonEnd();
    }
  };
  d3.geo.path = function() {
    var pointRadius = 4.5, projection, context, projectStream, contextStream, cacheStream;
    function path(object) {
      if (object) {
        if (typeof pointRadius === "function") contextStream.pointRadius(+pointRadius.apply(this, arguments));
        if (!cacheStream || !cacheStream.valid) cacheStream = projectStream(contextStream);
        d3.geo.stream(object, cacheStream);
      }
      return contextStream.result();
    }
    path.area = function(object) {
      d3_geo_pathAreaSum = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathArea));
      return d3_geo_pathAreaSum;
    };
    path.centroid = function(object) {
      d3_geo_centroidX0 = d3_geo_centroidY0 = d3_geo_centroidZ0 = d3_geo_centroidX1 = d3_geo_centroidY1 = d3_geo_centroidZ1 = d3_geo_centroidX2 = d3_geo_centroidY2 = d3_geo_centroidZ2 = 0;
      d3.geo.stream(object, projectStream(d3_geo_pathCentroid));
      return d3_geo_centroidZ2 ? [ d3_geo_centroidX2 / d3_geo_centroidZ2, d3_geo_centroidY2 / d3_geo_centroidZ2 ] : d3_geo_centroidZ1 ? [ d3_geo_centroidX1 / d3_geo_centroidZ1, d3_geo_centroidY1 / d3_geo_centroidZ1 ] : d3_geo_centroidZ0 ? [ d3_geo_centroidX0 / d3_geo_centroidZ0, d3_geo_centroidY0 / d3_geo_centroidZ0 ] : [ NaN, NaN ];
    };
    path.bounds = function(object) {
      d3_geo_pathBoundsX1 = d3_geo_pathBoundsY1 = -(d3_geo_pathBoundsX0 = d3_geo_pathBoundsY0 = Infinity);
      d3.geo.stream(object, projectStream(d3_geo_pathBounds));
      return [ [ d3_geo_pathBoundsX0, d3_geo_pathBoundsY0 ], [ d3_geo_pathBoundsX1, d3_geo_pathBoundsY1 ] ];
    };
    path.projection = function(_) {
      if (!arguments.length) return projection;
      projectStream = (projection = _) ? _.stream || d3_geo_pathProjectStream(_) : d3_identity;
      return reset();
    };
    path.context = function(_) {
      if (!arguments.length) return context;
      contextStream = (context = _) == null ? new d3_geo_pathBuffer() : new d3_geo_pathContext(_);
      if (typeof pointRadius !== "function") contextStream.pointRadius(pointRadius);
      return reset();
    };
    path.pointRadius = function(_) {
      if (!arguments.length) return pointRadius;
      pointRadius = typeof _ === "function" ? _ : (contextStream.pointRadius(+_), +_);
      return path;
    };
    function reset() {
      cacheStream = null;
      return path;
    }
    return path.projection(d3.geo.albersUsa()).context(null);
  };
  function d3_geo_pathProjectStream(project) {
    var resample = d3_geo_resample(function(x, y) {
      return project([ x * d3_degrees, y * d3_degrees ]);
    });
    return function(stream) {
      var transform = new d3_geo_transform(stream = resample(stream));
      transform.point = function(x, y) {
        stream.point(x * d3_radians, y * d3_radians);
      };
      return transform;
    };
  }
  d3.geo.projection = d3_geo_projection;
  d3.geo.projectionMutator = d3_geo_projectionMutator;
  function d3_geo_projection(project) {
    return d3_geo_projectionMutator(function() {
      return project;
    })();
  }
  function d3_geo_projectionMutator(projectAt) {
    var project, rotate, projectRotate, projectResample = d3_geo_resample(function(x, y) {
      x = project(x, y);
      return [ x[0] * k + δx, δy - x[1] * k ];
    }), k = 150, x = 480, y = 250, λ = 0, φ = 0, δλ = 0, δφ = 0, δγ = 0, δx, δy, preclip = d3_geo_clipAntimeridian, postclip = d3_identity, clipAngle = null, clipExtent = null, stream;
    function projection(point) {
      point = projectRotate(point[0] * d3_radians, point[1] * d3_radians);
      return [ point[0] * k + δx, δy - point[1] * k ];
    }
    function invert(point) {
      point = projectRotate.invert((point[0] - δx) / k, (δy - point[1]) / k);
      return point && [ point[0] * d3_degrees, point[1] * d3_degrees ];
    }
    projection.stream = function(output) {
      if (stream) stream.valid = false;
      stream = d3_geo_projectionRadians(preclip(rotate, projectResample(postclip(output))));
      stream.valid = true;
      return stream;
    };
    projection.clipAngle = function(_) {
      if (!arguments.length) return clipAngle;
      preclip = _ == null ? (clipAngle = _, d3_geo_clipAntimeridian) : d3_geo_clipCircle((clipAngle = +_) * d3_radians);
      return invalidate();
    };
    projection.clipExtent = function(_) {
      if (!arguments.length) return clipExtent;
      clipExtent = _;
      postclip = _ ? d3_geo_clipExtent(_[0][0], _[0][1], _[1][0], _[1][1]) : d3_identity;
      return invalidate();
    };
    projection.scale = function(_) {
      if (!arguments.length) return k;
      k = +_;
      return reset();
    };
    projection.translate = function(_) {
      if (!arguments.length) return [ x, y ];
      x = +_[0];
      y = +_[1];
      return reset();
    };
    projection.center = function(_) {
      if (!arguments.length) return [ λ * d3_degrees, φ * d3_degrees ];
      λ = _[0] % 360 * d3_radians;
      φ = _[1] % 360 * d3_radians;
      return reset();
    };
    projection.rotate = function(_) {
      if (!arguments.length) return [ δλ * d3_degrees, δφ * d3_degrees, δγ * d3_degrees ];
      δλ = _[0] % 360 * d3_radians;
      δφ = _[1] % 360 * d3_radians;
      δγ = _.length > 2 ? _[2] % 360 * d3_radians : 0;
      return reset();
    };
    d3.rebind(projection, projectResample, "precision");
    function reset() {
      projectRotate = d3_geo_compose(rotate = d3_geo_rotation(δλ, δφ, δγ), project);
      var center = project(λ, φ);
      δx = x - center[0] * k;
      δy = y + center[1] * k;
      return invalidate();
    }
    function invalidate() {
      if (stream) stream.valid = false, stream = null;
      return projection;
    }
    return function() {
      project = projectAt.apply(this, arguments);
      projection.invert = project.invert && invert;
      return reset();
    };
  }
  function d3_geo_projectionRadians(stream) {
    var transform = new d3_geo_transform(stream);
    transform.point = function(λ, φ) {
      stream.point(λ * d3_radians, φ * d3_radians);
    };
    return transform;
  }
  function d3_geo_equirectangular(λ, φ) {
    return [ λ, φ ];
  }
  (d3.geo.equirectangular = function() {
    return d3_geo_projection(d3_geo_equirectangular);
  }).raw = d3_geo_equirectangular.invert = d3_geo_equirectangular;
  d3.geo.rotation = function(rotate) {
    rotate = d3_geo_rotation(rotate[0] % 360 * d3_radians, rotate[1] * d3_radians, rotate.length > 2 ? rotate[2] * d3_radians : 0);
    function forward(coordinates) {
      coordinates = rotate(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    }
    forward.invert = function(coordinates) {
      coordinates = rotate.invert(coordinates[0] * d3_radians, coordinates[1] * d3_radians);
      return coordinates[0] *= d3_degrees, coordinates[1] *= d3_degrees, coordinates;
    };
    return forward;
  };
  function d3_geo_identityRotation(λ, φ) {
    return [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
  }
  d3_geo_identityRotation.invert = d3_geo_equirectangular;
  function d3_geo_rotation(δλ, δφ, δγ) {
    return δλ ? δφ || δγ ? d3_geo_compose(d3_geo_rotationλ(δλ), d3_geo_rotationφγ(δφ, δγ)) : d3_geo_rotationλ(δλ) : δφ || δγ ? d3_geo_rotationφγ(δφ, δγ) : d3_geo_identityRotation;
  }
  function d3_geo_forwardRotationλ(δλ) {
    return function(λ, φ) {
      return λ += δλ, [ λ > π ? λ - τ : λ < -π ? λ + τ : λ, φ ];
    };
  }
  function d3_geo_rotationλ(δλ) {
    var rotation = d3_geo_forwardRotationλ(δλ);
    rotation.invert = d3_geo_forwardRotationλ(-δλ);
    return rotation;
  }
  function d3_geo_rotationφγ(δφ, δγ) {
    var cosδφ = Math.cos(δφ), sinδφ = Math.sin(δφ), cosδγ = Math.cos(δγ), sinδγ = Math.sin(δγ);
    function rotation(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδφ + x * sinδφ;
      return [ Math.atan2(y * cosδγ - k * sinδγ, x * cosδφ - z * sinδφ), d3_asin(k * cosδγ + y * sinδγ) ];
    }
    rotation.invert = function(λ, φ) {
      var cosφ = Math.cos(φ), x = Math.cos(λ) * cosφ, y = Math.sin(λ) * cosφ, z = Math.sin(φ), k = z * cosδγ - y * sinδγ;
      return [ Math.atan2(y * cosδγ + z * sinδγ, x * cosδφ + k * sinδφ), d3_asin(k * cosδφ - x * sinδφ) ];
    };
    return rotation;
  }
  d3.geo.circle = function() {
    var origin = [ 0, 0 ], angle, precision = 6, interpolate;
    function circle() {
      var center = typeof origin === "function" ? origin.apply(this, arguments) : origin, rotate = d3_geo_rotation(-center[0] * d3_radians, -center[1] * d3_radians, 0).invert, ring = [];
      interpolate(null, null, 1, {
        point: function(x, y) {
          ring.push(x = rotate(x, y));
          x[0] *= d3_degrees, x[1] *= d3_degrees;
        }
      });
      return {
        type: "Polygon",
        coordinates: [ ring ]
      };
    }
    circle.origin = function(x) {
      if (!arguments.length) return origin;
      origin = x;
      return circle;
    };
    circle.angle = function(x) {
      if (!arguments.length) return angle;
      interpolate = d3_geo_circleInterpolate((angle = +x) * d3_radians, precision * d3_radians);
      return circle;
    };
    circle.precision = function(_) {
      if (!arguments.length) return precision;
      interpolate = d3_geo_circleInterpolate(angle * d3_radians, (precision = +_) * d3_radians);
      return circle;
    };
    return circle.angle(90);
  };
  function d3_geo_circleInterpolate(radius, precision) {
    var cr = Math.cos(radius), sr = Math.sin(radius);
    return function(from, to, direction, listener) {
      var step = direction * precision;
      if (from != null) {
        from = d3_geo_circleAngle(cr, from);
        to = d3_geo_circleAngle(cr, to);
        if (direction > 0 ? from < to : from > to) from += direction * τ;
      } else {
        from = radius + direction * τ;
        to = radius - .5 * step;
      }
      for (var point, t = from; direction > 0 ? t > to : t < to; t -= step) {
        listener.point((point = d3_geo_spherical([ cr, -sr * Math.cos(t), -sr * Math.sin(t) ]))[0], point[1]);
      }
    };
  }
  function d3_geo_circleAngle(cr, point) {
    var a = d3_geo_cartesian(point);
    a[0] -= cr;
    d3_geo_cartesianNormalize(a);
    var angle = d3_acos(-a[1]);
    return ((-a[2] < 0 ? -angle : angle) + 2 * Math.PI - ε) % (2 * Math.PI);
  }
  d3.geo.distance = function(a, b) {
    var Δλ = (b[0] - a[0]) * d3_radians, φ0 = a[1] * d3_radians, φ1 = b[1] * d3_radians, sinΔλ = Math.sin(Δλ), cosΔλ = Math.cos(Δλ), sinφ0 = Math.sin(φ0), cosφ0 = Math.cos(φ0), sinφ1 = Math.sin(φ1), cosφ1 = Math.cos(φ1), t;
    return Math.atan2(Math.sqrt((t = cosφ1 * sinΔλ) * t + (t = cosφ0 * sinφ1 - sinφ0 * cosφ1 * cosΔλ) * t), sinφ0 * sinφ1 + cosφ0 * cosφ1 * cosΔλ);
  };
  d3.geo.graticule = function() {
    var x1, x0, X1, X0, y1, y0, Y1, Y0, dx = 10, dy = dx, DX = 90, DY = 360, x, y, X, Y, precision = 2.5;
    function graticule() {
      return {
        type: "MultiLineString",
        coordinates: lines()
      };
    }
    function lines() {
      return d3.range(Math.ceil(X0 / DX) * DX, X1, DX).map(X).concat(d3.range(Math.ceil(Y0 / DY) * DY, Y1, DY).map(Y)).concat(d3.range(Math.ceil(x0 / dx) * dx, x1, dx).filter(function(x) {
        return abs(x % DX) > ε;
      }).map(x)).concat(d3.range(Math.ceil(y0 / dy) * dy, y1, dy).filter(function(y) {
        return abs(y % DY) > ε;
      }).map(y));
    }
    graticule.lines = function() {
      return lines().map(function(coordinates) {
        return {
          type: "LineString",
          coordinates: coordinates
        };
      });
    };
    graticule.outline = function() {
      return {
        type: "Polygon",
        coordinates: [ X(X0).concat(Y(Y1).slice(1), X(X1).reverse().slice(1), Y(Y0).reverse().slice(1)) ]
      };
    };
    graticule.extent = function(_) {
      if (!arguments.length) return graticule.minorExtent();
      return graticule.majorExtent(_).minorExtent(_);
    };
    graticule.majorExtent = function(_) {
      if (!arguments.length) return [ [ X0, Y0 ], [ X1, Y1 ] ];
      X0 = +_[0][0], X1 = +_[1][0];
      Y0 = +_[0][1], Y1 = +_[1][1];
      if (X0 > X1) _ = X0, X0 = X1, X1 = _;
      if (Y0 > Y1) _ = Y0, Y0 = Y1, Y1 = _;
      return graticule.precision(precision);
    };
    graticule.minorExtent = function(_) {
      if (!arguments.length) return [ [ x0, y0 ], [ x1, y1 ] ];
      x0 = +_[0][0], x1 = +_[1][0];
      y0 = +_[0][1], y1 = +_[1][1];
      if (x0 > x1) _ = x0, x0 = x1, x1 = _;
      if (y0 > y1) _ = y0, y0 = y1, y1 = _;
      return graticule.precision(precision);
    };
    graticule.step = function(_) {
      if (!arguments.length) return graticule.minorStep();
      return graticule.majorStep(_).minorStep(_);
    };
    graticule.majorStep = function(_) {
      if (!arguments.length) return [ DX, DY ];
      DX = +_[0], DY = +_[1];
      return graticule;
    };
    graticule.minorStep = function(_) {
      if (!arguments.length) return [ dx, dy ];
      dx = +_[0], dy = +_[1];
      return graticule;
    };
    graticule.precision = function(_) {
      if (!arguments.length) return precision;
      precision = +_;
      x = d3_geo_graticuleX(y0, y1, 90);
      y = d3_geo_graticuleY(x0, x1, precision);
      X = d3_geo_graticuleX(Y0, Y1, 90);
      Y = d3_geo_graticuleY(X0, X1, precision);
      return graticule;
    };
    return graticule.majorExtent([ [ -180, -90 + ε ], [ 180, 90 - ε ] ]).minorExtent([ [ -180, -80 - ε ], [ 180, 80 + ε ] ]);
  };
  function d3_geo_graticuleX(y0, y1, dy) {
    var y = d3.range(y0, y1 - ε, dy).concat(y1);
    return function(x) {
      return y.map(function(y) {
        return [ x, y ];
      });
    };
  }
  function d3_geo_graticuleY(x0, x1, dx) {
    var x = d3.range(x0, x1 - ε, dx).concat(x1);
    return function(y) {
      return x.map(function(x) {
        return [ x, y ];
      });
    };
  }
  function d3_source(d) {
    return d.source;
  }
  function d3_target(d) {
    return d.target;
  }
  d3.geo.greatArc = function() {
    var source = d3_source, source_, target = d3_target, target_;
    function greatArc() {
      return {
        type: "LineString",
        coordinates: [ source_ || source.apply(this, arguments), target_ || target.apply(this, arguments) ]
      };
    }
    greatArc.distance = function() {
      return d3.geo.distance(source_ || source.apply(this, arguments), target_ || target.apply(this, arguments));
    };
    greatArc.source = function(_) {
      if (!arguments.length) return source;
      source = _, source_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.target = function(_) {
      if (!arguments.length) return target;
      target = _, target_ = typeof _ === "function" ? null : _;
      return greatArc;
    };
    greatArc.precision = function() {
      return arguments.length ? greatArc : 0;
    };
    return greatArc;
  };
  d3.geo.interpolate = function(source, target) {
    return d3_geo_interpolate(source[0] * d3_radians, source[1] * d3_radians, target[0] * d3_radians, target[1] * d3_radians);
  };
  function d3_geo_interpolate(x0, y0, x1, y1) {
    var cy0 = Math.cos(y0), sy0 = Math.sin(y0), cy1 = Math.cos(y1), sy1 = Math.sin(y1), kx0 = cy0 * Math.cos(x0), ky0 = cy0 * Math.sin(x0), kx1 = cy1 * Math.cos(x1), ky1 = cy1 * Math.sin(x1), d = 2 * Math.asin(Math.sqrt(d3_haversin(y1 - y0) + cy0 * cy1 * d3_haversin(x1 - x0))), k = 1 / Math.sin(d);
    var interpolate = d ? function(t) {
      var B = Math.sin(t *= d) * k, A = Math.sin(d - t) * k, x = A * kx0 + B * kx1, y = A * ky0 + B * ky1, z = A * sy0 + B * sy1;
      return [ Math.atan2(y, x) * d3_degrees, Math.atan2(z, Math.sqrt(x * x + y * y)) * d3_degrees ];
    } : function() {
      return [ x0 * d3_degrees, y0 * d3_degrees ];
    };
    interpolate.distance = d;
    return interpolate;
  }
  d3.geo.length = function(object) {
    d3_geo_lengthSum = 0;
    d3.geo.stream(object, d3_geo_length);
    return d3_geo_lengthSum;
  };
  var d3_geo_lengthSum;
  var d3_geo_length = {
    sphere: d3_noop,
    point: d3_noop,
    lineStart: d3_geo_lengthLineStart,
    lineEnd: d3_noop,
    polygonStart: d3_noop,
    polygonEnd: d3_noop
  };
  function d3_geo_lengthLineStart() {
    var λ0, sinφ0, cosφ0;
    d3_geo_length.point = function(λ, φ) {
      λ0 = λ * d3_radians, sinφ0 = Math.sin(φ *= d3_radians), cosφ0 = Math.cos(φ);
      d3_geo_length.point = nextPoint;
    };
    d3_geo_length.lineEnd = function() {
      d3_geo_length.point = d3_geo_length.lineEnd = d3_noop;
    };
    function nextPoint(λ, φ) {
      var sinφ = Math.sin(φ *= d3_radians), cosφ = Math.cos(φ), t = abs((λ *= d3_radians) - λ0), cosΔλ = Math.cos(t);
      d3_geo_lengthSum += Math.atan2(Math.sqrt((t = cosφ * Math.sin(t)) * t + (t = cosφ0 * sinφ - sinφ0 * cosφ * cosΔλ) * t), sinφ0 * sinφ + cosφ0 * cosφ * cosΔλ);
      λ0 = λ, sinφ0 = sinφ, cosφ0 = cosφ;
    }
  }
  function d3_geo_azimuthal(scale, angle) {
    function azimuthal(λ, φ) {
      var cosλ = Math.cos(λ), cosφ = Math.cos(φ), k = scale(cosλ * cosφ);
      return [ k * cosφ * Math.sin(λ), k * Math.sin(φ) ];
    }
    azimuthal.invert = function(x, y) {
      var ρ = Math.sqrt(x * x + y * y), c = angle(ρ), sinc = Math.sin(c), cosc = Math.cos(c);
      return [ Math.atan2(x * sinc, ρ * cosc), Math.asin(ρ && y * sinc / ρ) ];
    };
    return azimuthal;
  }
  var d3_geo_azimuthalEqualArea = d3_geo_azimuthal(function(cosλcosφ) {
    return Math.sqrt(2 / (1 + cosλcosφ));
  }, function(ρ) {
    return 2 * Math.asin(ρ / 2);
  });
  (d3.geo.azimuthalEqualArea = function() {
    return d3_geo_projection(d3_geo_azimuthalEqualArea);
  }).raw = d3_geo_azimuthalEqualArea;
  var d3_geo_azimuthalEquidistant = d3_geo_azimuthal(function(cosλcosφ) {
    var c = Math.acos(cosλcosφ);
    return c && c / Math.sin(c);
  }, d3_identity);
  (d3.geo.azimuthalEquidistant = function() {
    return d3_geo_projection(d3_geo_azimuthalEquidistant);
  }).raw = d3_geo_azimuthalEquidistant;
  function d3_geo_conicConformal(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), t = function(φ) {
      return Math.tan(π / 4 + φ / 2);
    }, n = φ0 === φ1 ? Math.sin(φ0) : Math.log(cosφ0 / Math.cos(φ1)) / Math.log(t(φ1) / t(φ0)), F = cosφ0 * Math.pow(t(φ0), n) / n;
    if (!n) return d3_geo_mercator;
    function forward(λ, φ) {
      var ρ = abs(abs(φ) - halfπ) < ε ? 0 : F / Math.pow(t(φ), n);
      return [ ρ * Math.sin(n * λ), F - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = F - y, ρ = d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y);
      return [ Math.atan2(x, ρ0_y) / n, 2 * Math.atan(Math.pow(F / ρ, 1 / n)) - halfπ ];
    };
    return forward;
  }
  (d3.geo.conicConformal = function() {
    return d3_geo_conic(d3_geo_conicConformal);
  }).raw = d3_geo_conicConformal;
  function d3_geo_conicEquidistant(φ0, φ1) {
    var cosφ0 = Math.cos(φ0), n = φ0 === φ1 ? Math.sin(φ0) : (cosφ0 - Math.cos(φ1)) / (φ1 - φ0), G = cosφ0 / n + φ0;
    if (abs(n) < ε) return d3_geo_equirectangular;
    function forward(λ, φ) {
      var ρ = G - φ;
      return [ ρ * Math.sin(n * λ), G - ρ * Math.cos(n * λ) ];
    }
    forward.invert = function(x, y) {
      var ρ0_y = G - y;
      return [ Math.atan2(x, ρ0_y) / n, G - d3_sgn(n) * Math.sqrt(x * x + ρ0_y * ρ0_y) ];
    };
    return forward;
  }
  (d3.geo.conicEquidistant = function() {
    return d3_geo_conic(d3_geo_conicEquidistant);
  }).raw = d3_geo_conicEquidistant;
  var d3_geo_gnomonic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / cosλcosφ;
  }, Math.atan);
  (d3.geo.gnomonic = function() {
    return d3_geo_projection(d3_geo_gnomonic);
  }).raw = d3_geo_gnomonic;
  function d3_geo_mercator(λ, φ) {
    return [ λ, Math.log(Math.tan(π / 4 + φ / 2)) ];
  }
  d3_geo_mercator.invert = function(x, y) {
    return [ x, 2 * Math.atan(Math.exp(y)) - halfπ ];
  };
  function d3_geo_mercatorProjection(project) {
    var m = d3_geo_projection(project), scale = m.scale, translate = m.translate, clipExtent = m.clipExtent, clipAuto;
    m.scale = function() {
      var v = scale.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.translate = function() {
      var v = translate.apply(m, arguments);
      return v === m ? clipAuto ? m.clipExtent(null) : m : v;
    };
    m.clipExtent = function(_) {
      var v = clipExtent.apply(m, arguments);
      if (v === m) {
        if (clipAuto = _ == null) {
          var k = π * scale(), t = translate();
          clipExtent([ [ t[0] - k, t[1] - k ], [ t[0] + k, t[1] + k ] ]);
        }
      } else if (clipAuto) {
        v = null;
      }
      return v;
    };
    return m.clipExtent(null);
  }
  (d3.geo.mercator = function() {
    return d3_geo_mercatorProjection(d3_geo_mercator);
  }).raw = d3_geo_mercator;
  var d3_geo_orthographic = d3_geo_azimuthal(function() {
    return 1;
  }, Math.asin);
  (d3.geo.orthographic = function() {
    return d3_geo_projection(d3_geo_orthographic);
  }).raw = d3_geo_orthographic;
  var d3_geo_stereographic = d3_geo_azimuthal(function(cosλcosφ) {
    return 1 / (1 + cosλcosφ);
  }, function(ρ) {
    return 2 * Math.atan(ρ);
  });
  (d3.geo.stereographic = function() {
    return d3_geo_projection(d3_geo_stereographic);
  }).raw = d3_geo_stereographic;
  function d3_geo_transverseMercator(λ, φ) {
    var B = Math.cos(φ) * Math.sin(λ);
    return [ Math.log((1 + B) / (1 - B)) / 2, Math.atan2(Math.tan(φ), Math.cos(λ)) ];
  }
  d3_geo_transverseMercator.invert = function(x, y) {
    return [ Math.atan2(d3_sinh(x), Math.cos(y)), d3_asin(Math.sin(y) / d3_cosh(x)) ];
  };
  (d3.geo.transverseMercator = function() {
    return d3_geo_mercatorProjection(d3_geo_transverseMercator);
  }).raw = d3_geo_transverseMercator;
  d3.geom = {};
  function d3_geom_pointX(d) {
    return d[0];
  }
  function d3_geom_pointY(d) {
    return d[1];
  }
  d3.geom.hull = function(vertices) {
    var x = d3_geom_pointX, y = d3_geom_pointY;
    if (arguments.length) return hull(vertices);
    function hull(data) {
      if (data.length < 3) return [];
      var fx = d3_functor(x), fy = d3_functor(y), n = data.length, vertices, plen = n - 1, points = [], stack = [], d, i, j, h = 0, x1, y1, x2, y2, u, v, a, sp;
      if (fx === d3_geom_pointX && y === d3_geom_pointY) vertices = data; else for (i = 0, 
      vertices = []; i < n; ++i) {
        vertices.push([ +fx.call(this, d = data[i], i), +fy.call(this, d, i) ]);
      }
      for (i = 1; i < n; ++i) {
        if (vertices[i][1] < vertices[h][1] || vertices[i][1] == vertices[h][1] && vertices[i][0] < vertices[h][0]) h = i;
      }
      for (i = 0; i < n; ++i) {
        if (i === h) continue;
        y1 = vertices[i][1] - vertices[h][1];
        x1 = vertices[i][0] - vertices[h][0];
        points.push({
          angle: Math.atan2(y1, x1),
          index: i
        });
      }
      points.sort(function(a, b) {
        return a.angle - b.angle;
      });
      a = points[0].angle;
      v = points[0].index;
      u = 0;
      for (i = 1; i < plen; ++i) {
        j = points[i].index;
        if (a == points[i].angle) {
          x1 = vertices[v][0] - vertices[h][0];
          y1 = vertices[v][1] - vertices[h][1];
          x2 = vertices[j][0] - vertices[h][0];
          y2 = vertices[j][1] - vertices[h][1];
          if (x1 * x1 + y1 * y1 >= x2 * x2 + y2 * y2) {
            points[i].index = -1;
            continue;
          } else {
            points[u].index = -1;
          }
        }
        a = points[i].angle;
        u = i;
        v = j;
      }
      stack.push(h);
      for (i = 0, j = 0; i < 2; ++j) {
        if (points[j].index > -1) {
          stack.push(points[j].index);
          i++;
        }
      }
      sp = stack.length;
      for (;j < plen; ++j) {
        if (points[j].index < 0) continue;
        while (!d3_geom_hullCCW(stack[sp - 2], stack[sp - 1], points[j].index, vertices)) {
          --sp;
        }
        stack[sp++] = points[j].index;
      }
      var poly = [];
      for (i = sp - 1; i >= 0; --i) poly.push(data[stack[i]]);
      return poly;
    }
    hull.x = function(_) {
      return arguments.length ? (x = _, hull) : x;
    };
    hull.y = function(_) {
      return arguments.length ? (y = _, hull) : y;
    };
    return hull;
  };
  function d3_geom_hullCCW(i1, i2, i3, v) {
    var t, a, b, c, d, e, f;
    t = v[i1];
    a = t[0];
    b = t[1];
    t = v[i2];
    c = t[0];
    d = t[1];
    t = v[i3];
    e = t[0];
    f = t[1];
    return (f - b) * (c - a) - (d - b) * (e - a) > 0;
  }
  d3.geom.polygon = function(coordinates) {
    d3_subclass(coordinates, d3_geom_polygonPrototype);
    return coordinates;
  };
  var d3_geom_polygonPrototype = d3.geom.polygon.prototype = [];
  d3_geom_polygonPrototype.area = function() {
    var i = -1, n = this.length, a, b = this[n - 1], area = 0;
    while (++i < n) {
      a = b;
      b = this[i];
      area += a[1] * b[0] - a[0] * b[1];
    }
    return area * .5;
  };
  d3_geom_polygonPrototype.centroid = function(k) {
    var i = -1, n = this.length, x = 0, y = 0, a, b = this[n - 1], c;
    if (!arguments.length) k = -1 / (6 * this.area());
    while (++i < n) {
      a = b;
      b = this[i];
      c = a[0] * b[1] - b[0] * a[1];
      x += (a[0] + b[0]) * c;
      y += (a[1] + b[1]) * c;
    }
    return [ x * k, y * k ];
  };
  d3_geom_polygonPrototype.clip = function(subject) {
    var input, closed = d3_geom_polygonClosed(subject), i = -1, n = this.length - d3_geom_polygonClosed(this), j, m, a = this[n - 1], b, c, d;
    while (++i < n) {
      input = subject.slice();
      subject.length = 0;
      b = this[i];
      c = input[(m = input.length - closed) - 1];
      j = -1;
      while (++j < m) {
        d = input[j];
        if (d3_geom_polygonInside(d, a, b)) {
          if (!d3_geom_polygonInside(c, a, b)) {
            subject.push(d3_geom_polygonIntersect(c, d, a, b));
          }
          subject.push(d);
        } else if (d3_geom_polygonInside(c, a, b)) {
          subject.push(d3_geom_polygonIntersect(c, d, a, b));
        }
        c = d;
      }
      if (closed) subject.push(subject[0]);
      a = b;
    }
    return subject;
  };
  function d3_geom_polygonInside(p, a, b) {
    return (b[0] - a[0]) * (p[1] - a[1]) < (b[1] - a[1]) * (p[0] - a[0]);
  }
  function d3_geom_polygonIntersect(c, d, a, b) {
    var x1 = c[0], x3 = a[0], x21 = d[0] - x1, x43 = b[0] - x3, y1 = c[1], y3 = a[1], y21 = d[1] - y1, y43 = b[1] - y3, ua = (x43 * (y1 - y3) - y43 * (x1 - x3)) / (y43 * x21 - x43 * y21);
    return [ x1 + ua * x21, y1 + ua * y21 ];
  }
  function d3_geom_polygonClosed(coordinates) {
    var a = coordinates[0], b = coordinates[coordinates.length - 1];
    return !(a[0] - b[0] || a[1] - b[1]);
  }
  var d3_geom_voronoiEdges, d3_geom_voronoiCells, d3_geom_voronoiBeaches, d3_geom_voronoiBeachPool = [], d3_geom_voronoiFirstCircle, d3_geom_voronoiCircles, d3_geom_voronoiCirclePool = [];
  function d3_geom_voronoiBeach() {
    d3_geom_voronoiRedBlackNode(this);
    this.edge = this.site = this.circle = null;
  }
  function d3_geom_voronoiCreateBeach(site) {
    var beach = d3_geom_voronoiBeachPool.pop() || new d3_geom_voronoiBeach();
    beach.site = site;
    return beach;
  }
  function d3_geom_voronoiDetachBeach(beach) {
    d3_geom_voronoiDetachCircle(beach);
    d3_geom_voronoiBeaches.remove(beach);
    d3_geom_voronoiBeachPool.push(beach);
    d3_geom_voronoiRedBlackNode(beach);
  }
  function d3_geom_voronoiRemoveBeach(beach) {
    var circle = beach.circle, x = circle.x, y = circle.cy, vertex = {
      x: x,
      y: y
    }, previous = beach.P, next = beach.N, disappearing = [ beach ];
    d3_geom_voronoiDetachBeach(beach);
    var lArc = previous;
    while (lArc.circle && abs(x - lArc.circle.x) < ε && abs(y - lArc.circle.cy) < ε) {
      previous = lArc.P;
      disappearing.unshift(lArc);
      d3_geom_voronoiDetachBeach(lArc);
      lArc = previous;
    }
    disappearing.unshift(lArc);
    d3_geom_voronoiDetachCircle(lArc);
    var rArc = next;
    while (rArc.circle && abs(x - rArc.circle.x) < ε && abs(y - rArc.circle.cy) < ε) {
      next = rArc.N;
      disappearing.push(rArc);
      d3_geom_voronoiDetachBeach(rArc);
      rArc = next;
    }
    disappearing.push(rArc);
    d3_geom_voronoiDetachCircle(rArc);
    var nArcs = disappearing.length, iArc;
    for (iArc = 1; iArc < nArcs; ++iArc) {
      rArc = disappearing[iArc];
      lArc = disappearing[iArc - 1];
      d3_geom_voronoiSetEdgeEnd(rArc.edge, lArc.site, rArc.site, vertex);
    }
    lArc = disappearing[0];
    rArc = disappearing[nArcs - 1];
    rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, rArc.site, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiAddBeach(site) {
    var x = site.x, directrix = site.y, lArc, rArc, dxl, dxr, node = d3_geom_voronoiBeaches._;
    while (node) {
      dxl = d3_geom_voronoiLeftBreakPoint(node, directrix) - x;
      if (dxl > ε) node = node.L; else {
        dxr = x - d3_geom_voronoiRightBreakPoint(node, directrix);
        if (dxr > ε) {
          if (!node.R) {
            lArc = node;
            break;
          }
          node = node.R;
        } else {
          if (dxl > -ε) {
            lArc = node.P;
            rArc = node;
          } else if (dxr > -ε) {
            lArc = node;
            rArc = node.N;
          } else {
            lArc = rArc = node;
          }
          break;
        }
      }
    }
    var newArc = d3_geom_voronoiCreateBeach(site);
    d3_geom_voronoiBeaches.insert(lArc, newArc);
    if (!lArc && !rArc) return;
    if (lArc === rArc) {
      d3_geom_voronoiDetachCircle(lArc);
      rArc = d3_geom_voronoiCreateBeach(lArc.site);
      d3_geom_voronoiBeaches.insert(newArc, rArc);
      newArc.edge = rArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      d3_geom_voronoiAttachCircle(lArc);
      d3_geom_voronoiAttachCircle(rArc);
      return;
    }
    if (!rArc) {
      newArc.edge = d3_geom_voronoiCreateEdge(lArc.site, newArc.site);
      return;
    }
    d3_geom_voronoiDetachCircle(lArc);
    d3_geom_voronoiDetachCircle(rArc);
    var lSite = lArc.site, ax = lSite.x, ay = lSite.y, bx = site.x - ax, by = site.y - ay, rSite = rArc.site, cx = rSite.x - ax, cy = rSite.y - ay, d = 2 * (bx * cy - by * cx), hb = bx * bx + by * by, hc = cx * cx + cy * cy, vertex = {
      x: (cy * hb - by * hc) / d + ax,
      y: (bx * hc - cx * hb) / d + ay
    };
    d3_geom_voronoiSetEdgeEnd(rArc.edge, lSite, rSite, vertex);
    newArc.edge = d3_geom_voronoiCreateEdge(lSite, site, null, vertex);
    rArc.edge = d3_geom_voronoiCreateEdge(site, rSite, null, vertex);
    d3_geom_voronoiAttachCircle(lArc);
    d3_geom_voronoiAttachCircle(rArc);
  }
  function d3_geom_voronoiLeftBreakPoint(arc, directrix) {
    var site = arc.site, rfocx = site.x, rfocy = site.y, pby2 = rfocy - directrix;
    if (!pby2) return rfocx;
    var lArc = arc.P;
    if (!lArc) return -Infinity;
    site = lArc.site;
    var lfocx = site.x, lfocy = site.y, plby2 = lfocy - directrix;
    if (!plby2) return lfocx;
    var hl = lfocx - rfocx, aby2 = 1 / pby2 - 1 / plby2, b = hl / plby2;
    if (aby2) return (-b + Math.sqrt(b * b - 2 * aby2 * (hl * hl / (-2 * plby2) - lfocy + plby2 / 2 + rfocy - pby2 / 2))) / aby2 + rfocx;
    return (rfocx + lfocx) / 2;
  }
  function d3_geom_voronoiRightBreakPoint(arc, directrix) {
    var rArc = arc.N;
    if (rArc) return d3_geom_voronoiLeftBreakPoint(rArc, directrix);
    var site = arc.site;
    return site.y === directrix ? site.x : Infinity;
  }
  function d3_geom_voronoiCell(site) {
    this.site = site;
    this.edges = [];
  }
  d3_geom_voronoiCell.prototype.prepare = function() {
    var halfEdges = this.edges, iHalfEdge = halfEdges.length, edge;
    while (iHalfEdge--) {
      edge = halfEdges[iHalfEdge].edge;
      if (!edge.b || !edge.a) halfEdges.splice(iHalfEdge, 1);
    }
    halfEdges.sort(d3_geom_voronoiHalfEdgeOrder);
    return halfEdges.length;
  };
  function d3_geom_voronoiCloseCells(extent) {
    var x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], x2, y2, x3, y3, cells = d3_geom_voronoiCells, iCell = cells.length, cell, iHalfEdge, halfEdges, nHalfEdges, start, end;
    while (iCell--) {
      cell = cells[iCell];
      if (!cell || !cell.prepare()) continue;
      halfEdges = cell.edges;
      nHalfEdges = halfEdges.length;
      iHalfEdge = 0;
      while (iHalfEdge < nHalfEdges) {
        end = halfEdges[iHalfEdge].end(), x3 = end.x, y3 = end.y;
        start = halfEdges[++iHalfEdge % nHalfEdges].start(), x2 = start.x, y2 = start.y;
        if (abs(x3 - x2) > ε || abs(y3 - y2) > ε) {
          halfEdges.splice(iHalfEdge, 0, new d3_geom_voronoiHalfEdge(d3_geom_voronoiCreateBorderEdge(cell.site, end, abs(x3 - x0) < ε && y1 - y3 > ε ? {
            x: x0,
            y: abs(x2 - x0) < ε ? y2 : y1
          } : abs(y3 - y1) < ε && x1 - x3 > ε ? {
            x: abs(y2 - y1) < ε ? x2 : x1,
            y: y1
          } : abs(x3 - x1) < ε && y3 - y0 > ε ? {
            x: x1,
            y: abs(x2 - x1) < ε ? y2 : y0
          } : abs(y3 - y0) < ε && x3 - x0 > ε ? {
            x: abs(y2 - y0) < ε ? x2 : x0,
            y: y0
          } : null), cell.site, null));
          ++nHalfEdges;
        }
      }
    }
  }
  function d3_geom_voronoiHalfEdgeOrder(a, b) {
    return b.angle - a.angle;
  }
  function d3_geom_voronoiCircle() {
    d3_geom_voronoiRedBlackNode(this);
    this.x = this.y = this.arc = this.site = this.cy = null;
  }
  function d3_geom_voronoiAttachCircle(arc) {
    var lArc = arc.P, rArc = arc.N;
    if (!lArc || !rArc) return;
    var lSite = lArc.site, cSite = arc.site, rSite = rArc.site;
    if (lSite === rSite) return;
    var bx = cSite.x, by = cSite.y, ax = lSite.x - bx, ay = lSite.y - by, cx = rSite.x - bx, cy = rSite.y - by;
    var d = 2 * (ax * cy - ay * cx);
    if (d >= -ε2) return;
    var ha = ax * ax + ay * ay, hc = cx * cx + cy * cy, x = (cy * ha - ay * hc) / d, y = (ax * hc - cx * ha) / d, cy = y + by;
    var circle = d3_geom_voronoiCirclePool.pop() || new d3_geom_voronoiCircle();
    circle.arc = arc;
    circle.site = cSite;
    circle.x = x + bx;
    circle.y = cy + Math.sqrt(x * x + y * y);
    circle.cy = cy;
    arc.circle = circle;
    var before = null, node = d3_geom_voronoiCircles._;
    while (node) {
      if (circle.y < node.y || circle.y === node.y && circle.x <= node.x) {
        if (node.L) node = node.L; else {
          before = node.P;
          break;
        }
      } else {
        if (node.R) node = node.R; else {
          before = node;
          break;
        }
      }
    }
    d3_geom_voronoiCircles.insert(before, circle);
    if (!before) d3_geom_voronoiFirstCircle = circle;
  }
  function d3_geom_voronoiDetachCircle(arc) {
    var circle = arc.circle;
    if (circle) {
      if (!circle.P) d3_geom_voronoiFirstCircle = circle.N;
      d3_geom_voronoiCircles.remove(circle);
      d3_geom_voronoiCirclePool.push(circle);
      d3_geom_voronoiRedBlackNode(circle);
      arc.circle = null;
    }
  }
  function d3_geom_voronoiClipEdges(extent) {
    var edges = d3_geom_voronoiEdges, clip = d3_geom_clipLine(extent[0][0], extent[0][1], extent[1][0], extent[1][1]), i = edges.length, e;
    while (i--) {
      e = edges[i];
      if (!d3_geom_voronoiConnectEdge(e, extent) || !clip(e) || abs(e.a.x - e.b.x) < ε && abs(e.a.y - e.b.y) < ε) {
        e.a = e.b = null;
        edges.splice(i, 1);
      }
    }
  }
  function d3_geom_voronoiConnectEdge(edge, extent) {
    var vb = edge.b;
    if (vb) return true;
    var va = edge.a, x0 = extent[0][0], x1 = extent[1][0], y0 = extent[0][1], y1 = extent[1][1], lSite = edge.l, rSite = edge.r, lx = lSite.x, ly = lSite.y, rx = rSite.x, ry = rSite.y, fx = (lx + rx) / 2, fy = (ly + ry) / 2, fm, fb;
    if (ry === ly) {
      if (fx < x0 || fx >= x1) return;
      if (lx > rx) {
        if (!va) va = {
          x: fx,
          y: y0
        }; else if (va.y >= y1) return;
        vb = {
          x: fx,
          y: y1
        };
      } else {
        if (!va) va = {
          x: fx,
          y: y1
        }; else if (va.y < y0) return;
        vb = {
          x: fx,
          y: y0
        };
      }
    } else {
      fm = (lx - rx) / (ry - ly);
      fb = fy - fm * fx;
      if (fm < -1 || fm > 1) {
        if (lx > rx) {
          if (!va) va = {
            x: (y0 - fb) / fm,
            y: y0
          }; else if (va.y >= y1) return;
          vb = {
            x: (y1 - fb) / fm,
            y: y1
          };
        } else {
          if (!va) va = {
            x: (y1 - fb) / fm,
            y: y1
          }; else if (va.y < y0) return;
          vb = {
            x: (y0 - fb) / fm,
            y: y0
          };
        }
      } else {
        if (ly < ry) {
          if (!va) va = {
            x: x0,
            y: fm * x0 + fb
          }; else if (va.x >= x1) return;
          vb = {
            x: x1,
            y: fm * x1 + fb
          };
        } else {
          if (!va) va = {
            x: x1,
            y: fm * x1 + fb
          }; else if (va.x < x0) return;
          vb = {
            x: x0,
            y: fm * x0 + fb
          };
        }
      }
    }
    edge.a = va;
    edge.b = vb;
    return true;
  }
  function d3_geom_voronoiEdge(lSite, rSite) {
    this.l = lSite;
    this.r = rSite;
    this.a = this.b = null;
  }
  function d3_geom_voronoiCreateEdge(lSite, rSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, rSite);
    d3_geom_voronoiEdges.push(edge);
    if (va) d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, va);
    if (vb) d3_geom_voronoiSetEdgeEnd(edge, rSite, lSite, vb);
    d3_geom_voronoiCells[lSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, lSite, rSite));
    d3_geom_voronoiCells[rSite.i].edges.push(new d3_geom_voronoiHalfEdge(edge, rSite, lSite));
    return edge;
  }
  function d3_geom_voronoiCreateBorderEdge(lSite, va, vb) {
    var edge = new d3_geom_voronoiEdge(lSite, null);
    edge.a = va;
    edge.b = vb;
    d3_geom_voronoiEdges.push(edge);
    return edge;
  }
  function d3_geom_voronoiSetEdgeEnd(edge, lSite, rSite, vertex) {
    if (!edge.a && !edge.b) {
      edge.a = vertex;
      edge.l = lSite;
      edge.r = rSite;
    } else if (edge.l === rSite) {
      edge.b = vertex;
    } else {
      edge.a = vertex;
    }
  }
  function d3_geom_voronoiHalfEdge(edge, lSite, rSite) {
    var va = edge.a, vb = edge.b;
    this.edge = edge;
    this.site = lSite;
    this.angle = rSite ? Math.atan2(rSite.y - lSite.y, rSite.x - lSite.x) : edge.l === lSite ? Math.atan2(vb.x - va.x, va.y - vb.y) : Math.atan2(va.x - vb.x, vb.y - va.y);
  }
  d3_geom_voronoiHalfEdge.prototype = {
    start: function() {
      return this.edge.l === this.site ? this.edge.a : this.edge.b;
    },
    end: function() {
      return this.edge.l === this.site ? this.edge.b : this.edge.a;
    }
  };
  function d3_geom_voronoiRedBlackTree() {
    this._ = null;
  }
  function d3_geom_voronoiRedBlackNode(node) {
    node.U = node.C = node.L = node.R = node.P = node.N = null;
  }
  d3_geom_voronoiRedBlackTree.prototype = {
    insert: function(after, node) {
      var parent, grandpa, uncle;
      if (after) {
        node.P = after;
        node.N = after.N;
        if (after.N) after.N.P = node;
        after.N = node;
        if (after.R) {
          after = after.R;
          while (after.L) after = after.L;
          after.L = node;
        } else {
          after.R = node;
        }
        parent = after;
      } else if (this._) {
        after = d3_geom_voronoiRedBlackFirst(this._);
        node.P = null;
        node.N = after;
        after.P = after.L = node;
        parent = after;
      } else {
        node.P = node.N = null;
        this._ = node;
        parent = null;
      }
      node.L = node.R = null;
      node.U = parent;
      node.C = true;
      after = node;
      while (parent && parent.C) {
        grandpa = parent.U;
        if (parent === grandpa.L) {
          uncle = grandpa.R;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.R) {
              d3_geom_voronoiRedBlackRotateLeft(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, grandpa);
          }
        } else {
          uncle = grandpa.L;
          if (uncle && uncle.C) {
            parent.C = uncle.C = false;
            grandpa.C = true;
            after = grandpa;
          } else {
            if (after === parent.L) {
              d3_geom_voronoiRedBlackRotateRight(this, parent);
              after = parent;
              parent = after.U;
            }
            parent.C = false;
            grandpa.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, grandpa);
          }
        }
        parent = after.U;
      }
      this._.C = false;
    },
    remove: function(node) {
      if (node.N) node.N.P = node.P;
      if (node.P) node.P.N = node.N;
      node.N = node.P = null;
      var parent = node.U, sibling, left = node.L, right = node.R, next, red;
      if (!left) next = right; else if (!right) next = left; else next = d3_geom_voronoiRedBlackFirst(right);
      if (parent) {
        if (parent.L === node) parent.L = next; else parent.R = next;
      } else {
        this._ = next;
      }
      if (left && right) {
        red = next.C;
        next.C = node.C;
        next.L = left;
        left.U = next;
        if (next !== right) {
          parent = next.U;
          next.U = node.U;
          node = next.R;
          parent.L = node;
          next.R = right;
          right.U = next;
        } else {
          next.U = parent;
          parent = next;
          node = next.R;
        }
      } else {
        red = node.C;
        node = next;
      }
      if (node) node.U = parent;
      if (red) return;
      if (node && node.C) {
        node.C = false;
        return;
      }
      do {
        if (node === this._) break;
        if (node === parent.L) {
          sibling = parent.R;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            sibling = parent.R;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.R || !sibling.R.C) {
              sibling.L.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateRight(this, sibling);
              sibling = parent.R;
            }
            sibling.C = parent.C;
            parent.C = sibling.R.C = false;
            d3_geom_voronoiRedBlackRotateLeft(this, parent);
            node = this._;
            break;
          }
        } else {
          sibling = parent.L;
          if (sibling.C) {
            sibling.C = false;
            parent.C = true;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            sibling = parent.L;
          }
          if (sibling.L && sibling.L.C || sibling.R && sibling.R.C) {
            if (!sibling.L || !sibling.L.C) {
              sibling.R.C = false;
              sibling.C = true;
              d3_geom_voronoiRedBlackRotateLeft(this, sibling);
              sibling = parent.L;
            }
            sibling.C = parent.C;
            parent.C = sibling.L.C = false;
            d3_geom_voronoiRedBlackRotateRight(this, parent);
            node = this._;
            break;
          }
        }
        sibling.C = true;
        node = parent;
        parent = parent.U;
      } while (!node.C);
      if (node) node.C = false;
    }
  };
  function d3_geom_voronoiRedBlackRotateLeft(tree, node) {
    var p = node, q = node.R, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.R = q.L;
    if (p.R) p.R.U = p;
    q.L = p;
  }
  function d3_geom_voronoiRedBlackRotateRight(tree, node) {
    var p = node, q = node.L, parent = p.U;
    if (parent) {
      if (parent.L === p) parent.L = q; else parent.R = q;
    } else {
      tree._ = q;
    }
    q.U = parent;
    p.U = q;
    p.L = q.R;
    if (p.L) p.L.U = p;
    q.R = p;
  }
  function d3_geom_voronoiRedBlackFirst(node) {
    while (node.L) node = node.L;
    return node;
  }
  function d3_geom_voronoi(sites, bbox) {
    var site = sites.sort(d3_geom_voronoiVertexOrder).pop(), x0, y0, circle;
    d3_geom_voronoiEdges = [];
    d3_geom_voronoiCells = new Array(sites.length);
    d3_geom_voronoiBeaches = new d3_geom_voronoiRedBlackTree();
    d3_geom_voronoiCircles = new d3_geom_voronoiRedBlackTree();
    while (true) {
      circle = d3_geom_voronoiFirstCircle;
      if (site && (!circle || site.y < circle.y || site.y === circle.y && site.x < circle.x)) {
        if (site.x !== x0 || site.y !== y0) {
          d3_geom_voronoiCells[site.i] = new d3_geom_voronoiCell(site);
          d3_geom_voronoiAddBeach(site);
          x0 = site.x, y0 = site.y;
        }
        site = sites.pop();
      } else if (circle) {
        d3_geom_voronoiRemoveBeach(circle.arc);
      } else {
        break;
      }
    }
    if (bbox) d3_geom_voronoiClipEdges(bbox), d3_geom_voronoiCloseCells(bbox);
    var diagram = {
      cells: d3_geom_voronoiCells,
      edges: d3_geom_voronoiEdges
    };
    d3_geom_voronoiBeaches = d3_geom_voronoiCircles = d3_geom_voronoiEdges = d3_geom_voronoiCells = null;
    return diagram;
  }
  function d3_geom_voronoiVertexOrder(a, b) {
    return b.y - a.y || b.x - a.x;
  }
  d3.geom.voronoi = function(points) {
    var x = d3_geom_pointX, y = d3_geom_pointY, fx = x, fy = y, clipExtent = d3_geom_voronoiClipExtent;
    if (points) return voronoi(points);
    function voronoi(data) {
      var polygons = new Array(data.length), x0 = clipExtent[0][0], y0 = clipExtent[0][1], x1 = clipExtent[1][0], y1 = clipExtent[1][1];
      d3_geom_voronoi(sites(data), clipExtent).cells.forEach(function(cell, i) {
        var edges = cell.edges, site = cell.site, polygon = polygons[i] = edges.length ? edges.map(function(e) {
          var s = e.start();
          return [ s.x, s.y ];
        }) : site.x >= x0 && site.x <= x1 && site.y >= y0 && site.y <= y1 ? [ [ x0, y1 ], [ x1, y1 ], [ x1, y0 ], [ x0, y0 ] ] : [];
        polygon.point = data[i];
      });
      return polygons;
    }
    function sites(data) {
      return data.map(function(d, i) {
        return {
          x: Math.round(fx(d, i) / ε) * ε,
          y: Math.round(fy(d, i) / ε) * ε,
          i: i
        };
      });
    }
    voronoi.links = function(data) {
      return d3_geom_voronoi(sites(data)).edges.filter(function(edge) {
        return edge.l && edge.r;
      }).map(function(edge) {
        return {
          source: data[edge.l.i],
          target: data[edge.r.i]
        };
      });
    };
    voronoi.triangles = function(data) {
      var triangles = [];
      d3_geom_voronoi(sites(data)).cells.forEach(function(cell, i) {
        var site = cell.site, edges = cell.edges.sort(d3_geom_voronoiHalfEdgeOrder), j = -1, m = edges.length, e0, s0, e1 = edges[m - 1].edge, s1 = e1.l === site ? e1.r : e1.l;
        while (++j < m) {
          e0 = e1;
          s0 = s1;
          e1 = edges[j].edge;
          s1 = e1.l === site ? e1.r : e1.l;
          if (i < s0.i && i < s1.i && d3_geom_voronoiTriangleArea(site, s0, s1) < 0) {
            triangles.push([ data[i], data[s0.i], data[s1.i] ]);
          }
        }
      });
      return triangles;
    };
    voronoi.x = function(_) {
      return arguments.length ? (fx = d3_functor(x = _), voronoi) : x;
    };
    voronoi.y = function(_) {
      return arguments.length ? (fy = d3_functor(y = _), voronoi) : y;
    };
    voronoi.clipExtent = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent;
      clipExtent = _ == null ? d3_geom_voronoiClipExtent : _;
      return voronoi;
    };
    voronoi.size = function(_) {
      if (!arguments.length) return clipExtent === d3_geom_voronoiClipExtent ? null : clipExtent && clipExtent[1];
      return voronoi.clipExtent(_ && [ [ 0, 0 ], _ ]);
    };
    return voronoi;
  };
  var d3_geom_voronoiClipExtent = [ [ -1e6, -1e6 ], [ 1e6, 1e6 ] ];
  function d3_geom_voronoiTriangleArea(a, b, c) {
    return (a.x - c.x) * (b.y - a.y) - (a.x - b.x) * (c.y - a.y);
  }
  d3.geom.delaunay = function(vertices) {
    return d3.geom.voronoi().triangles(vertices);
  };
  d3.geom.quadtree = function(points, x1, y1, x2, y2) {
    var x = d3_geom_pointX, y = d3_geom_pointY, compat;
    if (compat = arguments.length) {
      x = d3_geom_quadtreeCompatX;
      y = d3_geom_quadtreeCompatY;
      if (compat === 3) {
        y2 = y1;
        x2 = x1;
        y1 = x1 = 0;
      }
      return quadtree(points);
    }
    function quadtree(data) {
      var d, fx = d3_functor(x), fy = d3_functor(y), xs, ys, i, n, x1_, y1_, x2_, y2_;
      if (x1 != null) {
        x1_ = x1, y1_ = y1, x2_ = x2, y2_ = y2;
      } else {
        x2_ = y2_ = -(x1_ = y1_ = Infinity);
        xs = [], ys = [];
        n = data.length;
        if (compat) for (i = 0; i < n; ++i) {
          d = data[i];
          if (d.x < x1_) x1_ = d.x;
          if (d.y < y1_) y1_ = d.y;
          if (d.x > x2_) x2_ = d.x;
          if (d.y > y2_) y2_ = d.y;
          xs.push(d.x);
          ys.push(d.y);
        } else for (i = 0; i < n; ++i) {
          var x_ = +fx(d = data[i], i), y_ = +fy(d, i);
          if (x_ < x1_) x1_ = x_;
          if (y_ < y1_) y1_ = y_;
          if (x_ > x2_) x2_ = x_;
          if (y_ > y2_) y2_ = y_;
          xs.push(x_);
          ys.push(y_);
        }
      }
      var dx = x2_ - x1_, dy = y2_ - y1_;
      if (dx > dy) y2_ = y1_ + dx; else x2_ = x1_ + dy;
      function insert(n, d, x, y, x1, y1, x2, y2) {
        if (isNaN(x) || isNaN(y)) return;
        if (n.leaf) {
          var nx = n.x, ny = n.y;
          if (nx != null) {
            if (abs(nx - x) + abs(ny - y) < .01) {
              insertChild(n, d, x, y, x1, y1, x2, y2);
            } else {
              var nPoint = n.point;
              n.x = n.y = n.point = null;
              insertChild(n, nPoint, nx, ny, x1, y1, x2, y2);
              insertChild(n, d, x, y, x1, y1, x2, y2);
            }
          } else {
            n.x = x, n.y = y, n.point = d;
          }
        } else {
          insertChild(n, d, x, y, x1, y1, x2, y2);
        }
      }
      function insertChild(n, d, x, y, x1, y1, x2, y2) {
        var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, right = x >= sx, bottom = y >= sy, i = (bottom << 1) + right;
        n.leaf = false;
        n = n.nodes[i] || (n.nodes[i] = d3_geom_quadtreeNode());
        if (right) x1 = sx; else x2 = sx;
        if (bottom) y1 = sy; else y2 = sy;
        insert(n, d, x, y, x1, y1, x2, y2);
      }
      var root = d3_geom_quadtreeNode();
      root.add = function(d) {
        insert(root, d, +fx(d, ++i), +fy(d, i), x1_, y1_, x2_, y2_);
      };
      root.visit = function(f) {
        d3_geom_quadtreeVisit(f, root, x1_, y1_, x2_, y2_);
      };
      i = -1;
      if (x1 == null) {
        while (++i < n) {
          insert(root, data[i], xs[i], ys[i], x1_, y1_, x2_, y2_);
        }
        --i;
      } else data.forEach(root.add);
      xs = ys = data = d = null;
      return root;
    }
    quadtree.x = function(_) {
      return arguments.length ? (x = _, quadtree) : x;
    };
    quadtree.y = function(_) {
      return arguments.length ? (y = _, quadtree) : y;
    };
    quadtree.extent = function(_) {
      if (!arguments.length) return x1 == null ? null : [ [ x1, y1 ], [ x2, y2 ] ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = +_[0][0], y1 = +_[0][1], x2 = +_[1][0], 
      y2 = +_[1][1];
      return quadtree;
    };
    quadtree.size = function(_) {
      if (!arguments.length) return x1 == null ? null : [ x2 - x1, y2 - y1 ];
      if (_ == null) x1 = y1 = x2 = y2 = null; else x1 = y1 = 0, x2 = +_[0], y2 = +_[1];
      return quadtree;
    };
    return quadtree;
  };
  function d3_geom_quadtreeCompatX(d) {
    return d.x;
  }
  function d3_geom_quadtreeCompatY(d) {
    return d.y;
  }
  function d3_geom_quadtreeNode() {
    return {
      leaf: true,
      nodes: [],
      point: null,
      x: null,
      y: null
    };
  }
  function d3_geom_quadtreeVisit(f, node, x1, y1, x2, y2) {
    if (!f(node, x1, y1, x2, y2)) {
      var sx = (x1 + x2) * .5, sy = (y1 + y2) * .5, children = node.nodes;
      if (children[0]) d3_geom_quadtreeVisit(f, children[0], x1, y1, sx, sy);
      if (children[1]) d3_geom_quadtreeVisit(f, children[1], sx, y1, x2, sy);
      if (children[2]) d3_geom_quadtreeVisit(f, children[2], x1, sy, sx, y2);
      if (children[3]) d3_geom_quadtreeVisit(f, children[3], sx, sy, x2, y2);
    }
  }
  d3.interpolateRgb = d3_interpolateRgb;
  function d3_interpolateRgb(a, b) {
    a = d3.rgb(a);
    b = d3.rgb(b);
    var ar = a.r, ag = a.g, ab = a.b, br = b.r - ar, bg = b.g - ag, bb = b.b - ab;
    return function(t) {
      return "#" + d3_rgb_hex(Math.round(ar + br * t)) + d3_rgb_hex(Math.round(ag + bg * t)) + d3_rgb_hex(Math.round(ab + bb * t));
    };
  }
  d3.interpolateObject = d3_interpolateObject;
  function d3_interpolateObject(a, b) {
    var i = {}, c = {}, k;
    for (k in a) {
      if (k in b) {
        i[k] = d3_interpolate(a[k], b[k]);
      } else {
        c[k] = a[k];
      }
    }
    for (k in b) {
      if (!(k in a)) {
        c[k] = b[k];
      }
    }
    return function(t) {
      for (k in i) c[k] = i[k](t);
      return c;
    };
  }
  d3.interpolateNumber = d3_interpolateNumber;
  function d3_interpolateNumber(a, b) {
    b -= a = +a;
    return function(t) {
      return a + b * t;
    };
  }
  d3.interpolateString = d3_interpolateString;
  function d3_interpolateString(a, b) {
    var m, i, j, s0 = 0, s1 = 0, s = [], q = [], n, o;
    a = a + "", b = b + "";
    d3_interpolate_number.lastIndex = 0;
    for (i = 0; m = d3_interpolate_number.exec(b); ++i) {
      if (m.index) s.push(b.substring(s0, s1 = m.index));
      q.push({
        i: s.length,
        x: m[0]
      });
      s.push(null);
      s0 = d3_interpolate_number.lastIndex;
    }
    if (s0 < b.length) s.push(b.substring(s0));
    for (i = 0, n = q.length; (m = d3_interpolate_number.exec(a)) && i < n; ++i) {
      o = q[i];
      if (o.x == m[0]) {
        if (o.i) {
          if (s[o.i + 1] == null) {
            s[o.i - 1] += o.x;
            s.splice(o.i, 1);
            for (j = i + 1; j < n; ++j) q[j].i--;
          } else {
            s[o.i - 1] += o.x + s[o.i + 1];
            s.splice(o.i, 2);
            for (j = i + 1; j < n; ++j) q[j].i -= 2;
          }
        } else {
          if (s[o.i + 1] == null) {
            s[o.i] = o.x;
          } else {
            s[o.i] = o.x + s[o.i + 1];
            s.splice(o.i + 1, 1);
            for (j = i + 1; j < n; ++j) q[j].i--;
          }
        }
        q.splice(i, 1);
        n--;
        i--;
      } else {
        o.x = d3_interpolateNumber(parseFloat(m[0]), parseFloat(o.x));
      }
    }
    while (i < n) {
      o = q.pop();
      if (s[o.i + 1] == null) {
        s[o.i] = o.x;
      } else {
        s[o.i] = o.x + s[o.i + 1];
        s.splice(o.i + 1, 1);
      }
      n--;
    }
    if (s.length === 1) {
      return s[0] == null ? (o = q[0].x, function(t) {
        return o(t) + "";
      }) : function() {
        return b;
      };
    }
    return function(t) {
      for (i = 0; i < n; ++i) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  }
  var d3_interpolate_number = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;
  d3.interpolate = d3_interpolate;
  function d3_interpolate(a, b) {
    var i = d3.interpolators.length, f;
    while (--i >= 0 && !(f = d3.interpolators[i](a, b))) ;
    return f;
  }
  d3.interpolators = [ function(a, b) {
    var t = typeof b;
    return (t === "string" ? d3_rgb_names.has(b) || /^(#|rgb\(|hsl\()/.test(b) ? d3_interpolateRgb : d3_interpolateString : b instanceof d3_Color ? d3_interpolateRgb : t === "object" ? Array.isArray(b) ? d3_interpolateArray : d3_interpolateObject : d3_interpolateNumber)(a, b);
  } ];
  d3.interpolateArray = d3_interpolateArray;
  function d3_interpolateArray(a, b) {
    var x = [], c = [], na = a.length, nb = b.length, n0 = Math.min(a.length, b.length), i;
    for (i = 0; i < n0; ++i) x.push(d3_interpolate(a[i], b[i]));
    for (;i < na; ++i) c[i] = a[i];
    for (;i < nb; ++i) c[i] = b[i];
    return function(t) {
      for (i = 0; i < n0; ++i) c[i] = x[i](t);
      return c;
    };
  }
  var d3_ease_default = function() {
    return d3_identity;
  };
  var d3_ease = d3.map({
    linear: d3_ease_default,
    poly: d3_ease_poly,
    quad: function() {
      return d3_ease_quad;
    },
    cubic: function() {
      return d3_ease_cubic;
    },
    sin: function() {
      return d3_ease_sin;
    },
    exp: function() {
      return d3_ease_exp;
    },
    circle: function() {
      return d3_ease_circle;
    },
    elastic: d3_ease_elastic,
    back: d3_ease_back,
    bounce: function() {
      return d3_ease_bounce;
    }
  });
  var d3_ease_mode = d3.map({
    "in": d3_identity,
    out: d3_ease_reverse,
    "in-out": d3_ease_reflect,
    "out-in": function(f) {
      return d3_ease_reflect(d3_ease_reverse(f));
    }
  });
  d3.ease = function(name) {
    var i = name.indexOf("-"), t = i >= 0 ? name.substring(0, i) : name, m = i >= 0 ? name.substring(i + 1) : "in";
    t = d3_ease.get(t) || d3_ease_default;
    m = d3_ease_mode.get(m) || d3_identity;
    return d3_ease_clamp(m(t.apply(null, d3_arraySlice.call(arguments, 1))));
  };
  function d3_ease_clamp(f) {
    return function(t) {
      return t <= 0 ? 0 : t >= 1 ? 1 : f(t);
    };
  }
  function d3_ease_reverse(f) {
    return function(t) {
      return 1 - f(1 - t);
    };
  }
  function d3_ease_reflect(f) {
    return function(t) {
      return .5 * (t < .5 ? f(2 * t) : 2 - f(2 - 2 * t));
    };
  }
  function d3_ease_quad(t) {
    return t * t;
  }
  function d3_ease_cubic(t) {
    return t * t * t;
  }
  function d3_ease_cubicInOut(t) {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    var t2 = t * t, t3 = t2 * t;
    return 4 * (t < .5 ? t3 : 3 * (t - t2) + t3 - .75);
  }
  function d3_ease_poly(e) {
    return function(t) {
      return Math.pow(t, e);
    };
  }
  function d3_ease_sin(t) {
    return 1 - Math.cos(t * halfπ);
  }
  function d3_ease_exp(t) {
    return Math.pow(2, 10 * (t - 1));
  }
  function d3_ease_circle(t) {
    return 1 - Math.sqrt(1 - t * t);
  }
  function d3_ease_elastic(a, p) {
    var s;
    if (arguments.length < 2) p = .45;
    if (arguments.length) s = p / τ * Math.asin(1 / a); else a = 1, s = p / 4;
    return function(t) {
      return 1 + a * Math.pow(2, -10 * t) * Math.sin((t - s) * τ / p);
    };
  }
  function d3_ease_back(s) {
    if (!s) s = 1.70158;
    return function(t) {
      return t * t * ((s + 1) * t - s);
    };
  }
  function d3_ease_bounce(t) {
    return t < 1 / 2.75 ? 7.5625 * t * t : t < 2 / 2.75 ? 7.5625 * (t -= 1.5 / 2.75) * t + .75 : t < 2.5 / 2.75 ? 7.5625 * (t -= 2.25 / 2.75) * t + .9375 : 7.5625 * (t -= 2.625 / 2.75) * t + .984375;
  }
  d3.interpolateHcl = d3_interpolateHcl;
  function d3_interpolateHcl(a, b) {
    a = d3.hcl(a);
    b = d3.hcl(b);
    var ah = a.h, ac = a.c, al = a.l, bh = b.h - ah, bc = b.c - ac, bl = b.l - al;
    if (isNaN(bc)) bc = 0, ac = isNaN(ac) ? b.c : ac;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hcl_lab(ah + bh * t, ac + bc * t, al + bl * t) + "";
    };
  }
  d3.interpolateHsl = d3_interpolateHsl;
  function d3_interpolateHsl(a, b) {
    a = d3.hsl(a);
    b = d3.hsl(b);
    var ah = a.h, as = a.s, al = a.l, bh = b.h - ah, bs = b.s - as, bl = b.l - al;
    if (isNaN(bs)) bs = 0, as = isNaN(as) ? b.s : as;
    if (isNaN(bh)) bh = 0, ah = isNaN(ah) ? b.h : ah; else if (bh > 180) bh -= 360; else if (bh < -180) bh += 360;
    return function(t) {
      return d3_hsl_rgb(ah + bh * t, as + bs * t, al + bl * t) + "";
    };
  }
  d3.interpolateLab = d3_interpolateLab;
  function d3_interpolateLab(a, b) {
    a = d3.lab(a);
    b = d3.lab(b);
    var al = a.l, aa = a.a, ab = a.b, bl = b.l - al, ba = b.a - aa, bb = b.b - ab;
    return function(t) {
      return d3_lab_rgb(al + bl * t, aa + ba * t, ab + bb * t) + "";
    };
  }
  d3.interpolateRound = d3_interpolateRound;
  function d3_interpolateRound(a, b) {
    b -= a;
    return function(t) {
      return Math.round(a + b * t);
    };
  }
  d3.transform = function(string) {
    var g = d3_document.createElementNS(d3.ns.prefix.svg, "g");
    return (d3.transform = function(string) {
      if (string != null) {
        g.setAttribute("transform", string);
        var t = g.transform.baseVal.consolidate();
      }
      return new d3_transform(t ? t.matrix : d3_transformIdentity);
    })(string);
  };
  function d3_transform(m) {
    var r0 = [ m.a, m.b ], r1 = [ m.c, m.d ], kx = d3_transformNormalize(r0), kz = d3_transformDot(r0, r1), ky = d3_transformNormalize(d3_transformCombine(r1, r0, -kz)) || 0;
    if (r0[0] * r1[1] < r1[0] * r0[1]) {
      r0[0] *= -1;
      r0[1] *= -1;
      kx *= -1;
      kz *= -1;
    }
    this.rotate = (kx ? Math.atan2(r0[1], r0[0]) : Math.atan2(-r1[0], r1[1])) * d3_degrees;
    this.translate = [ m.e, m.f ];
    this.scale = [ kx, ky ];
    this.skew = ky ? Math.atan2(kz, ky) * d3_degrees : 0;
  }
  d3_transform.prototype.toString = function() {
    return "translate(" + this.translate + ")rotate(" + this.rotate + ")skewX(" + this.skew + ")scale(" + this.scale + ")";
  };
  function d3_transformDot(a, b) {
    return a[0] * b[0] + a[1] * b[1];
  }
  function d3_transformNormalize(a) {
    var k = Math.sqrt(d3_transformDot(a, a));
    if (k) {
      a[0] /= k;
      a[1] /= k;
    }
    return k;
  }
  function d3_transformCombine(a, b, k) {
    a[0] += k * b[0];
    a[1] += k * b[1];
    return a;
  }
  var d3_transformIdentity = {
    a: 1,
    b: 0,
    c: 0,
    d: 1,
    e: 0,
    f: 0
  };
  d3.interpolateTransform = d3_interpolateTransform;
  function d3_interpolateTransform(a, b) {
    var s = [], q = [], n, A = d3.transform(a), B = d3.transform(b), ta = A.translate, tb = B.translate, ra = A.rotate, rb = B.rotate, wa = A.skew, wb = B.skew, ka = A.scale, kb = B.scale;
    if (ta[0] != tb[0] || ta[1] != tb[1]) {
      s.push("translate(", null, ",", null, ")");
      q.push({
        i: 1,
        x: d3_interpolateNumber(ta[0], tb[0])
      }, {
        i: 3,
        x: d3_interpolateNumber(ta[1], tb[1])
      });
    } else if (tb[0] || tb[1]) {
      s.push("translate(" + tb + ")");
    } else {
      s.push("");
    }
    if (ra != rb) {
      if (ra - rb > 180) rb += 360; else if (rb - ra > 180) ra += 360;
      q.push({
        i: s.push(s.pop() + "rotate(", null, ")") - 2,
        x: d3_interpolateNumber(ra, rb)
      });
    } else if (rb) {
      s.push(s.pop() + "rotate(" + rb + ")");
    }
    if (wa != wb) {
      q.push({
        i: s.push(s.pop() + "skewX(", null, ")") - 2,
        x: d3_interpolateNumber(wa, wb)
      });
    } else if (wb) {
      s.push(s.pop() + "skewX(" + wb + ")");
    }
    if (ka[0] != kb[0] || ka[1] != kb[1]) {
      n = s.push(s.pop() + "scale(", null, ",", null, ")");
      q.push({
        i: n - 4,
        x: d3_interpolateNumber(ka[0], kb[0])
      }, {
        i: n - 2,
        x: d3_interpolateNumber(ka[1], kb[1])
      });
    } else if (kb[0] != 1 || kb[1] != 1) {
      s.push(s.pop() + "scale(" + kb + ")");
    }
    n = q.length;
    return function(t) {
      var i = -1, o;
      while (++i < n) s[(o = q[i]).i] = o.x(t);
      return s.join("");
    };
  }
  function d3_uninterpolateNumber(a, b) {
    b = b - (a = +a) ? 1 / (b - a) : 0;
    return function(x) {
      return (x - a) * b;
    };
  }
  function d3_uninterpolateClamp(a, b) {
    b = b - (a = +a) ? 1 / (b - a) : 0;
    return function(x) {
      return Math.max(0, Math.min(1, (x - a) * b));
    };
  }
  d3.layout = {};
  d3.layout.bundle = function() {
    return function(links) {
      var paths = [], i = -1, n = links.length;
      while (++i < n) paths.push(d3_layout_bundlePath(links[i]));
      return paths;
    };
  };
  function d3_layout_bundlePath(link) {
    var start = link.source, end = link.target, lca = d3_layout_bundleLeastCommonAncestor(start, end), points = [ start ];
    while (start !== lca) {
      start = start.parent;
      points.push(start);
    }
    var k = points.length;
    while (end !== lca) {
      points.splice(k, 0, end);
      end = end.parent;
    }
    return points;
  }
  function d3_layout_bundleAncestors(node) {
    var ancestors = [], parent = node.parent;
    while (parent != null) {
      ancestors.push(node);
      node = parent;
      parent = parent.parent;
    }
    ancestors.push(node);
    return ancestors;
  }
  function d3_layout_bundleLeastCommonAncestor(a, b) {
    if (a === b) return a;
    var aNodes = d3_layout_bundleAncestors(a), bNodes = d3_layout_bundleAncestors(b), aNode = aNodes.pop(), bNode = bNodes.pop(), sharedNode = null;
    while (aNode === bNode) {
      sharedNode = aNode;
      aNode = aNodes.pop();
      bNode = bNodes.pop();
    }
    return sharedNode;
  }
  d3.layout.chord = function() {
    var chord = {}, chords, groups, matrix, n, padding = 0, sortGroups, sortSubgroups, sortChords;
    function relayout() {
      var subgroups = {}, groupSums = [], groupIndex = d3.range(n), subgroupIndex = [], k, x, x0, i, j;
      chords = [];
      groups = [];
      k = 0, i = -1;
      while (++i < n) {
        x = 0, j = -1;
        while (++j < n) {
          x += matrix[i][j];
        }
        groupSums.push(x);
        subgroupIndex.push(d3.range(n));
        k += x;
      }
      if (sortGroups) {
        groupIndex.sort(function(a, b) {
          return sortGroups(groupSums[a], groupSums[b]);
        });
      }
      if (sortSubgroups) {
        subgroupIndex.forEach(function(d, i) {
          d.sort(function(a, b) {
            return sortSubgroups(matrix[i][a], matrix[i][b]);
          });
        });
      }
      k = (τ - padding * n) / k;
      x = 0, i = -1;
      while (++i < n) {
        x0 = x, j = -1;
        while (++j < n) {
          var di = groupIndex[i], dj = subgroupIndex[di][j], v = matrix[di][dj], a0 = x, a1 = x += v * k;
          subgroups[di + "-" + dj] = {
            index: di,
            subindex: dj,
            startAngle: a0,
            endAngle: a1,
            value: v
          };
        }
        groups[di] = {
          index: di,
          startAngle: x0,
          endAngle: x,
          value: (x - x0) / k
        };
        x += padding;
      }
      i = -1;
      while (++i < n) {
        j = i - 1;
        while (++j < n) {
          var source = subgroups[i + "-" + j], target = subgroups[j + "-" + i];
          if (source.value || target.value) {
            chords.push(source.value < target.value ? {
              source: target,
              target: source
            } : {
              source: source,
              target: target
            });
          }
        }
      }
      if (sortChords) resort();
    }
    function resort() {
      chords.sort(function(a, b) {
        return sortChords((a.source.value + a.target.value) / 2, (b.source.value + b.target.value) / 2);
      });
    }
    chord.matrix = function(x) {
      if (!arguments.length) return matrix;
      n = (matrix = x) && matrix.length;
      chords = groups = null;
      return chord;
    };
    chord.padding = function(x) {
      if (!arguments.length) return padding;
      padding = x;
      chords = groups = null;
      return chord;
    };
    chord.sortGroups = function(x) {
      if (!arguments.length) return sortGroups;
      sortGroups = x;
      chords = groups = null;
      return chord;
    };
    chord.sortSubgroups = function(x) {
      if (!arguments.length) return sortSubgroups;
      sortSubgroups = x;
      chords = null;
      return chord;
    };
    chord.sortChords = function(x) {
      if (!arguments.length) return sortChords;
      sortChords = x;
      if (chords) resort();
      return chord;
    };
    chord.chords = function() {
      if (!chords) relayout();
      return chords;
    };
    chord.groups = function() {
      if (!groups) relayout();
      return groups;
    };
    return chord;
  };
  d3.layout.force = function() {
    var force = {}, event = d3.dispatch("start", "tick", "end"), size = [ 1, 1 ], drag, alpha, friction = .9, linkDistance = d3_layout_forceLinkDistance, linkStrength = d3_layout_forceLinkStrength, charge = -30, gravity = .1, theta = .8, nodes = [], links = [], distances, strengths, charges;
    function repulse(node) {
      return function(quad, x1, _, x2) {
        if (quad.point !== node) {
          var dx = quad.cx - node.x, dy = quad.cy - node.y, dn = 1 / Math.sqrt(dx * dx + dy * dy);
          if ((x2 - x1) * dn < theta) {
            var k = quad.charge * dn * dn;
            node.px -= dx * k;
            node.py -= dy * k;
            return true;
          }
          if (quad.point && isFinite(dn)) {
            var k = quad.pointCharge * dn * dn;
            node.px -= dx * k;
            node.py -= dy * k;
          }
        }
        return !quad.charge;
      };
    }
    force.tick = function() {
      if ((alpha *= .99) < .005) {
        event.end({
          type: "end",
          alpha: alpha = 0
        });
        return true;
      }
      var n = nodes.length, m = links.length, q, i, o, s, t, l, k, x, y;
      for (i = 0; i < m; ++i) {
        o = links[i];
        s = o.source;
        t = o.target;
        x = t.x - s.x;
        y = t.y - s.y;
        if (l = x * x + y * y) {
          l = alpha * strengths[i] * ((l = Math.sqrt(l)) - distances[i]) / l;
          x *= l;
          y *= l;
          t.x -= x * (k = s.weight / (t.weight + s.weight));
          t.y -= y * k;
          s.x += x * (k = 1 - k);
          s.y += y * k;
        }
      }
      if (k = alpha * gravity) {
        x = size[0] / 2;
        y = size[1] / 2;
        i = -1;
        if (k) while (++i < n) {
          o = nodes[i];
          o.x += (x - o.x) * k;
          o.y += (y - o.y) * k;
        }
      }
      if (charge) {
        d3_layout_forceAccumulate(q = d3.geom.quadtree(nodes), alpha, charges);
        i = -1;
        while (++i < n) {
          if (!(o = nodes[i]).fixed) {
            q.visit(repulse(o));
          }
        }
      }
      i = -1;
      while (++i < n) {
        o = nodes[i];
        if (o.fixed) {
          o.x = o.px;
          o.y = o.py;
        } else {
          o.x -= (o.px - (o.px = o.x)) * friction;
          o.y -= (o.py - (o.py = o.y)) * friction;
        }
      }
      event.tick({
        type: "tick",
        alpha: alpha
      });
    };
    force.nodes = function(x) {
      if (!arguments.length) return nodes;
      nodes = x;
      return force;
    };
    force.links = function(x) {
      if (!arguments.length) return links;
      links = x;
      return force;
    };
    force.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return force;
    };
    force.linkDistance = function(x) {
      if (!arguments.length) return linkDistance;
      linkDistance = typeof x === "function" ? x : +x;
      return force;
    };
    force.distance = force.linkDistance;
    force.linkStrength = function(x) {
      if (!arguments.length) return linkStrength;
      linkStrength = typeof x === "function" ? x : +x;
      return force;
    };
    force.friction = function(x) {
      if (!arguments.length) return friction;
      friction = +x;
      return force;
    };
    force.charge = function(x) {
      if (!arguments.length) return charge;
      charge = typeof x === "function" ? x : +x;
      return force;
    };
    force.gravity = function(x) {
      if (!arguments.length) return gravity;
      gravity = +x;
      return force;
    };
    force.theta = function(x) {
      if (!arguments.length) return theta;
      theta = +x;
      return force;
    };
    force.alpha = function(x) {
      if (!arguments.length) return alpha;
      x = +x;
      if (alpha) {
        if (x > 0) alpha = x; else alpha = 0;
      } else if (x > 0) {
        event.start({
          type: "start",
          alpha: alpha = x
        });
        d3.timer(force.tick);
      }
      return force;
    };
    force.start = function() {
      var i, n = nodes.length, m = links.length, w = size[0], h = size[1], neighbors, o;
      for (i = 0; i < n; ++i) {
        (o = nodes[i]).index = i;
        o.weight = 0;
      }
      for (i = 0; i < m; ++i) {
        o = links[i];
        if (typeof o.source == "number") o.source = nodes[o.source];
        if (typeof o.target == "number") o.target = nodes[o.target];
        ++o.source.weight;
        ++o.target.weight;
      }
      for (i = 0; i < n; ++i) {
        o = nodes[i];
        if (isNaN(o.x)) o.x = position("x", w);
        if (isNaN(o.y)) o.y = position("y", h);
        if (isNaN(o.px)) o.px = o.x;
        if (isNaN(o.py)) o.py = o.y;
      }
      distances = [];
      if (typeof linkDistance === "function") for (i = 0; i < m; ++i) distances[i] = +linkDistance.call(this, links[i], i); else for (i = 0; i < m; ++i) distances[i] = linkDistance;
      strengths = [];
      if (typeof linkStrength === "function") for (i = 0; i < m; ++i) strengths[i] = +linkStrength.call(this, links[i], i); else for (i = 0; i < m; ++i) strengths[i] = linkStrength;
      charges = [];
      if (typeof charge === "function") for (i = 0; i < n; ++i) charges[i] = +charge.call(this, nodes[i], i); else for (i = 0; i < n; ++i) charges[i] = charge;
      function position(dimension, size) {
        if (!neighbors) {
          neighbors = new Array(n);
          for (j = 0; j < n; ++j) {
            neighbors[j] = [];
          }
          for (j = 0; j < m; ++j) {
            var o = links[j];
            neighbors[o.source.index].push(o.target);
            neighbors[o.target.index].push(o.source);
          }
        }
        var candidates = neighbors[i], j = -1, m = candidates.length, x;
        while (++j < m) if (!isNaN(x = candidates[j][dimension])) return x;
        return Math.random() * size;
      }
      return force.resume();
    };
    force.resume = function() {
      return force.alpha(.1);
    };
    force.stop = function() {
      return force.alpha(0);
    };
    force.drag = function() {
      if (!drag) drag = d3.behavior.drag().origin(d3_identity).on("dragstart.force", d3_layout_forceDragstart).on("drag.force", dragmove).on("dragend.force", d3_layout_forceDragend);
      if (!arguments.length) return drag;
      this.on("mouseover.force", d3_layout_forceMouseover).on("mouseout.force", d3_layout_forceMouseout).call(drag);
    };
    function dragmove(d) {
      d.px = d3.event.x, d.py = d3.event.y;
      force.resume();
    }
    return d3.rebind(force, event, "on");
  };
  function d3_layout_forceDragstart(d) {
    d.fixed |= 2;
  }
  function d3_layout_forceDragend(d) {
    d.fixed &= ~6;
  }
  function d3_layout_forceMouseover(d) {
    d.fixed |= 4;
    d.px = d.x, d.py = d.y;
  }
  function d3_layout_forceMouseout(d) {
    d.fixed &= ~4;
  }
  function d3_layout_forceAccumulate(quad, alpha, charges) {
    var cx = 0, cy = 0;
    quad.charge = 0;
    if (!quad.leaf) {
      var nodes = quad.nodes, n = nodes.length, i = -1, c;
      while (++i < n) {
        c = nodes[i];
        if (c == null) continue;
        d3_layout_forceAccumulate(c, alpha, charges);
        quad.charge += c.charge;
        cx += c.charge * c.cx;
        cy += c.charge * c.cy;
      }
    }
    if (quad.point) {
      if (!quad.leaf) {
        quad.point.x += Math.random() - .5;
        quad.point.y += Math.random() - .5;
      }
      var k = alpha * charges[quad.point.index];
      quad.charge += quad.pointCharge = k;
      cx += k * quad.point.x;
      cy += k * quad.point.y;
    }
    quad.cx = cx / quad.charge;
    quad.cy = cy / quad.charge;
  }
  var d3_layout_forceLinkDistance = 20, d3_layout_forceLinkStrength = 1;
  d3.layout.hierarchy = function() {
    var sort = d3_layout_hierarchySort, children = d3_layout_hierarchyChildren, value = d3_layout_hierarchyValue;
    function recurse(node, depth, nodes) {
      var childs = children.call(hierarchy, node, depth);
      node.depth = depth;
      nodes.push(node);
      if (childs && (n = childs.length)) {
        var i = -1, n, c = node.children = new Array(n), v = 0, j = depth + 1, d;
        while (++i < n) {
          d = c[i] = recurse(childs[i], j, nodes);
          d.parent = node;
          v += d.value;
        }
        if (sort) c.sort(sort);
        if (value) node.value = v;
      } else {
        delete node.children;
        if (value) {
          node.value = +value.call(hierarchy, node, depth) || 0;
        }
      }
      return node;
    }
    function revalue(node, depth) {
      var children = node.children, v = 0;
      if (children && (n = children.length)) {
        var i = -1, n, j = depth + 1;
        while (++i < n) v += revalue(children[i], j);
      } else if (value) {
        v = +value.call(hierarchy, node, depth) || 0;
      }
      if (value) node.value = v;
      return v;
    }
    function hierarchy(d) {
      var nodes = [];
      recurse(d, 0, nodes);
      return nodes;
    }
    hierarchy.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return hierarchy;
    };
    hierarchy.children = function(x) {
      if (!arguments.length) return children;
      children = x;
      return hierarchy;
    };
    hierarchy.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return hierarchy;
    };
    hierarchy.revalue = function(root) {
      revalue(root, 0);
      return root;
    };
    return hierarchy;
  };
  function d3_layout_hierarchyRebind(object, hierarchy) {
    d3.rebind(object, hierarchy, "sort", "children", "value");
    object.nodes = object;
    object.links = d3_layout_hierarchyLinks;
    return object;
  }
  function d3_layout_hierarchyChildren(d) {
    return d.children;
  }
  function d3_layout_hierarchyValue(d) {
    return d.value;
  }
  function d3_layout_hierarchySort(a, b) {
    return b.value - a.value;
  }
  function d3_layout_hierarchyLinks(nodes) {
    return d3.merge(nodes.map(function(parent) {
      return (parent.children || []).map(function(child) {
        return {
          source: parent,
          target: child
        };
      });
    }));
  }
  d3.layout.partition = function() {
    var hierarchy = d3.layout.hierarchy(), size = [ 1, 1 ];
    function position(node, x, dx, dy) {
      var children = node.children;
      node.x = x;
      node.y = node.depth * dy;
      node.dx = dx;
      node.dy = dy;
      if (children && (n = children.length)) {
        var i = -1, n, c, d;
        dx = node.value ? dx / node.value : 0;
        while (++i < n) {
          position(c = children[i], x, d = c.value * dx, dy);
          x += d;
        }
      }
    }
    function depth(node) {
      var children = node.children, d = 0;
      if (children && (n = children.length)) {
        var i = -1, n;
        while (++i < n) d = Math.max(d, depth(children[i]));
      }
      return 1 + d;
    }
    function partition(d, i) {
      var nodes = hierarchy.call(this, d, i);
      position(nodes[0], 0, size[0], size[1] / depth(nodes[0]));
      return nodes;
    }
    partition.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return partition;
    };
    return d3_layout_hierarchyRebind(partition, hierarchy);
  };
  d3.layout.pie = function() {
    var value = Number, sort = d3_layout_pieSortByValue, startAngle = 0, endAngle = τ;
    function pie(data) {
      var values = data.map(function(d, i) {
        return +value.call(pie, d, i);
      });
      var a = +(typeof startAngle === "function" ? startAngle.apply(this, arguments) : startAngle);
      var k = ((typeof endAngle === "function" ? endAngle.apply(this, arguments) : endAngle) - a) / d3.sum(values);
      var index = d3.range(data.length);
      if (sort != null) index.sort(sort === d3_layout_pieSortByValue ? function(i, j) {
        return values[j] - values[i];
      } : function(i, j) {
        return sort(data[i], data[j]);
      });
      var arcs = [];
      index.forEach(function(i) {
        var d;
        arcs[i] = {
          data: data[i],
          value: d = values[i],
          startAngle: a,
          endAngle: a += d * k
        };
      });
      return arcs;
    }
    pie.value = function(x) {
      if (!arguments.length) return value;
      value = x;
      return pie;
    };
    pie.sort = function(x) {
      if (!arguments.length) return sort;
      sort = x;
      return pie;
    };
    pie.startAngle = function(x) {
      if (!arguments.length) return startAngle;
      startAngle = x;
      return pie;
    };
    pie.endAngle = function(x) {
      if (!arguments.length) return endAngle;
      endAngle = x;
      return pie;
    };
    return pie;
  };
  var d3_layout_pieSortByValue = {};
  d3.layout.stack = function() {
    var values = d3_identity, order = d3_layout_stackOrderDefault, offset = d3_layout_stackOffsetZero, out = d3_layout_stackOut, x = d3_layout_stackX, y = d3_layout_stackY;
    function stack(data, index) {
      var series = data.map(function(d, i) {
        return values.call(stack, d, i);
      });
      var points = series.map(function(d) {
        return d.map(function(v, i) {
          return [ x.call(stack, v, i), y.call(stack, v, i) ];
        });
      });
      var orders = order.call(stack, points, index);
      series = d3.permute(series, orders);
      points = d3.permute(points, orders);
      var offsets = offset.call(stack, points, index);
      var n = series.length, m = series[0].length, i, j, o;
      for (j = 0; j < m; ++j) {
        out.call(stack, series[0][j], o = offsets[j], points[0][j][1]);
        for (i = 1; i < n; ++i) {
          out.call(stack, series[i][j], o += points[i - 1][j][1], points[i][j][1]);
        }
      }
      return data;
    }
    stack.values = function(x) {
      if (!arguments.length) return values;
      values = x;
      return stack;
    };
    stack.order = function(x) {
      if (!arguments.length) return order;
      order = typeof x === "function" ? x : d3_layout_stackOrders.get(x) || d3_layout_stackOrderDefault;
      return stack;
    };
    stack.offset = function(x) {
      if (!arguments.length) return offset;
      offset = typeof x === "function" ? x : d3_layout_stackOffsets.get(x) || d3_layout_stackOffsetZero;
      return stack;
    };
    stack.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      return stack;
    };
    stack.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      return stack;
    };
    stack.out = function(z) {
      if (!arguments.length) return out;
      out = z;
      return stack;
    };
    return stack;
  };
  function d3_layout_stackX(d) {
    return d.x;
  }
  function d3_layout_stackY(d) {
    return d.y;
  }
  function d3_layout_stackOut(d, y0, y) {
    d.y0 = y0;
    d.y = y;
  }
  var d3_layout_stackOrders = d3.map({
    "inside-out": function(data) {
      var n = data.length, i, j, max = data.map(d3_layout_stackMaxIndex), sums = data.map(d3_layout_stackReduceSum), index = d3.range(n).sort(function(a, b) {
        return max[a] - max[b];
      }), top = 0, bottom = 0, tops = [], bottoms = [];
      for (i = 0; i < n; ++i) {
        j = index[i];
        if (top < bottom) {
          top += sums[j];
          tops.push(j);
        } else {
          bottom += sums[j];
          bottoms.push(j);
        }
      }
      return bottoms.reverse().concat(tops);
    },
    reverse: function(data) {
      return d3.range(data.length).reverse();
    },
    "default": d3_layout_stackOrderDefault
  });
  var d3_layout_stackOffsets = d3.map({
    silhouette: function(data) {
      var n = data.length, m = data[0].length, sums = [], max = 0, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o > max) max = o;
        sums.push(o);
      }
      for (j = 0; j < m; ++j) {
        y0[j] = (max - sums[j]) / 2;
      }
      return y0;
    },
    wiggle: function(data) {
      var n = data.length, x = data[0], m = x.length, i, j, k, s1, s2, s3, dx, o, o0, y0 = [];
      y0[0] = o = o0 = 0;
      for (j = 1; j < m; ++j) {
        for (i = 0, s1 = 0; i < n; ++i) s1 += data[i][j][1];
        for (i = 0, s2 = 0, dx = x[j][0] - x[j - 1][0]; i < n; ++i) {
          for (k = 0, s3 = (data[i][j][1] - data[i][j - 1][1]) / (2 * dx); k < i; ++k) {
            s3 += (data[k][j][1] - data[k][j - 1][1]) / dx;
          }
          s2 += s3 * data[i][j][1];
        }
        y0[j] = o -= s1 ? s2 / s1 * dx : 0;
        if (o < o0) o0 = o;
      }
      for (j = 0; j < m; ++j) y0[j] -= o0;
      return y0;
    },
    expand: function(data) {
      var n = data.length, m = data[0].length, k = 1 / n, i, j, o, y0 = [];
      for (j = 0; j < m; ++j) {
        for (i = 0, o = 0; i < n; i++) o += data[i][j][1];
        if (o) for (i = 0; i < n; i++) data[i][j][1] /= o; else for (i = 0; i < n; i++) data[i][j][1] = k;
      }
      for (j = 0; j < m; ++j) y0[j] = 0;
      return y0;
    },
    zero: d3_layout_stackOffsetZero
  });
  function d3_layout_stackOrderDefault(data) {
    return d3.range(data.length);
  }
  function d3_layout_stackOffsetZero(data) {
    var j = -1, m = data[0].length, y0 = [];
    while (++j < m) y0[j] = 0;
    return y0;
  }
  function d3_layout_stackMaxIndex(array) {
    var i = 1, j = 0, v = array[0][1], k, n = array.length;
    for (;i < n; ++i) {
      if ((k = array[i][1]) > v) {
        j = i;
        v = k;
      }
    }
    return j;
  }
  function d3_layout_stackReduceSum(d) {
    return d.reduce(d3_layout_stackSum, 0);
  }
  function d3_layout_stackSum(p, d) {
    return p + d[1];
  }
  d3.layout.histogram = function() {
    var frequency = true, valuer = Number, ranger = d3_layout_histogramRange, binner = d3_layout_histogramBinSturges;
    function histogram(data, i) {
      var bins = [], values = data.map(valuer, this), range = ranger.call(this, values, i), thresholds = binner.call(this, range, values, i), bin, i = -1, n = values.length, m = thresholds.length - 1, k = frequency ? 1 : 1 / n, x;
      while (++i < m) {
        bin = bins[i] = [];
        bin.dx = thresholds[i + 1] - (bin.x = thresholds[i]);
        bin.y = 0;
      }
      if (m > 0) {
        i = -1;
        while (++i < n) {
          x = values[i];
          if (x >= range[0] && x <= range[1]) {
            bin = bins[d3.bisect(thresholds, x, 1, m) - 1];
            bin.y += k;
            bin.push(data[i]);
          }
        }
      }
      return bins;
    }
    histogram.value = function(x) {
      if (!arguments.length) return valuer;
      valuer = x;
      return histogram;
    };
    histogram.range = function(x) {
      if (!arguments.length) return ranger;
      ranger = d3_functor(x);
      return histogram;
    };
    histogram.bins = function(x) {
      if (!arguments.length) return binner;
      binner = typeof x === "number" ? function(range) {
        return d3_layout_histogramBinFixed(range, x);
      } : d3_functor(x);
      return histogram;
    };
    histogram.frequency = function(x) {
      if (!arguments.length) return frequency;
      frequency = !!x;
      return histogram;
    };
    return histogram;
  };
  function d3_layout_histogramBinSturges(range, values) {
    return d3_layout_histogramBinFixed(range, Math.ceil(Math.log(values.length) / Math.LN2 + 1));
  }
  function d3_layout_histogramBinFixed(range, n) {
    var x = -1, b = +range[0], m = (range[1] - b) / n, f = [];
    while (++x <= n) f[x] = m * x + b;
    return f;
  }
  function d3_layout_histogramRange(values) {
    return [ d3.min(values), d3.max(values) ];
  }
  d3.layout.tree = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function tree(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0];
      function firstWalk(node, previousSibling) {
        var children = node.children, layout = node._tree;
        if (children && (n = children.length)) {
          var n, firstChild = children[0], previousChild, ancestor = firstChild, child, i = -1;
          while (++i < n) {
            child = children[i];
            firstWalk(child, previousChild);
            ancestor = apportion(child, previousChild, ancestor);
            previousChild = child;
          }
          d3_layout_treeShift(node);
          var midpoint = .5 * (firstChild._tree.prelim + child._tree.prelim);
          if (previousSibling) {
            layout.prelim = previousSibling._tree.prelim + separation(node, previousSibling);
            layout.mod = layout.prelim - midpoint;
          } else {
            layout.prelim = midpoint;
          }
        } else {
          if (previousSibling) {
            layout.prelim = previousSibling._tree.prelim + separation(node, previousSibling);
          }
        }
      }
      function secondWalk(node, x) {
        node.x = node._tree.prelim + x;
        var children = node.children;
        if (children && (n = children.length)) {
          var i = -1, n;
          x += node._tree.mod;
          while (++i < n) {
            secondWalk(children[i], x);
          }
        }
      }
      function apportion(node, previousSibling, ancestor) {
        if (previousSibling) {
          var vip = node, vop = node, vim = previousSibling, vom = node.parent.children[0], sip = vip._tree.mod, sop = vop._tree.mod, sim = vim._tree.mod, som = vom._tree.mod, shift;
          while (vim = d3_layout_treeRight(vim), vip = d3_layout_treeLeft(vip), vim && vip) {
            vom = d3_layout_treeLeft(vom);
            vop = d3_layout_treeRight(vop);
            vop._tree.ancestor = node;
            shift = vim._tree.prelim + sim - vip._tree.prelim - sip + separation(vim, vip);
            if (shift > 0) {
              d3_layout_treeMove(d3_layout_treeAncestor(vim, node, ancestor), node, shift);
              sip += shift;
              sop += shift;
            }
            sim += vim._tree.mod;
            sip += vip._tree.mod;
            som += vom._tree.mod;
            sop += vop._tree.mod;
          }
          if (vim && !d3_layout_treeRight(vop)) {
            vop._tree.thread = vim;
            vop._tree.mod += sim - sop;
          }
          if (vip && !d3_layout_treeLeft(vom)) {
            vom._tree.thread = vip;
            vom._tree.mod += sip - som;
            ancestor = node;
          }
        }
        return ancestor;
      }
      d3_layout_treeVisitAfter(root, function(node, previousSibling) {
        node._tree = {
          ancestor: node,
          prelim: 0,
          mod: 0,
          change: 0,
          shift: 0,
          number: previousSibling ? previousSibling._tree.number + 1 : 0
        };
      });
      firstWalk(root);
      secondWalk(root, -root._tree.prelim);
      var left = d3_layout_treeSearch(root, d3_layout_treeLeftmost), right = d3_layout_treeSearch(root, d3_layout_treeRightmost), deep = d3_layout_treeSearch(root, d3_layout_treeDeepest), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2, y1 = deep.depth || 1;
      d3_layout_treeVisitAfter(root, nodeSize ? function(node) {
        node.x *= size[0];
        node.y = node.depth * size[1];
        delete node._tree;
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = node.depth / y1 * size[1];
        delete node._tree;
      });
      return nodes;
    }
    tree.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return tree;
    };
    tree.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return tree;
    };
    tree.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return tree;
    };
    return d3_layout_hierarchyRebind(tree, hierarchy);
  };
  function d3_layout_treeSeparation(a, b) {
    return a.parent == b.parent ? 1 : 2;
  }
  function d3_layout_treeLeft(node) {
    var children = node.children;
    return children && children.length ? children[0] : node._tree.thread;
  }
  function d3_layout_treeRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? children[n - 1] : node._tree.thread;
  }
  function d3_layout_treeSearch(node, compare) {
    var children = node.children;
    if (children && (n = children.length)) {
      var child, n, i = -1;
      while (++i < n) {
        if (compare(child = d3_layout_treeSearch(children[i], compare), node) > 0) {
          node = child;
        }
      }
    }
    return node;
  }
  function d3_layout_treeRightmost(a, b) {
    return a.x - b.x;
  }
  function d3_layout_treeLeftmost(a, b) {
    return b.x - a.x;
  }
  function d3_layout_treeDeepest(a, b) {
    return a.depth - b.depth;
  }
  function d3_layout_treeVisitAfter(node, callback) {
    function visit(node, previousSibling) {
      var children = node.children;
      if (children && (n = children.length)) {
        var child, previousChild = null, i = -1, n;
        while (++i < n) {
          child = children[i];
          visit(child, previousChild);
          previousChild = child;
        }
      }
      callback(node, previousSibling);
    }
    visit(node, null);
  }
  function d3_layout_treeShift(node) {
    var shift = 0, change = 0, children = node.children, i = children.length, child;
    while (--i >= 0) {
      child = children[i]._tree;
      child.prelim += shift;
      child.mod += shift;
      shift += child.shift + (change += child.change);
    }
  }
  function d3_layout_treeMove(ancestor, node, shift) {
    ancestor = ancestor._tree;
    node = node._tree;
    var change = shift / (node.number - ancestor.number);
    ancestor.change += change;
    node.change -= change;
    node.shift += shift;
    node.prelim += shift;
    node.mod += shift;
  }
  function d3_layout_treeAncestor(vim, node, ancestor) {
    return vim._tree.ancestor.parent == node.parent ? vim._tree.ancestor : ancestor;
  }
  d3.layout.pack = function() {
    var hierarchy = d3.layout.hierarchy().sort(d3_layout_packSort), padding = 0, size = [ 1, 1 ], radius;
    function pack(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], w = size[0], h = size[1], r = radius == null ? Math.sqrt : typeof radius === "function" ? radius : function() {
        return radius;
      };
      root.x = root.y = 0;
      d3_layout_treeVisitAfter(root, function(d) {
        d.r = +r(d.value);
      });
      d3_layout_treeVisitAfter(root, d3_layout_packSiblings);
      if (padding) {
        var dr = padding * (radius ? 1 : Math.max(2 * root.r / w, 2 * root.r / h)) / 2;
        d3_layout_treeVisitAfter(root, function(d) {
          d.r += dr;
        });
        d3_layout_treeVisitAfter(root, d3_layout_packSiblings);
        d3_layout_treeVisitAfter(root, function(d) {
          d.r -= dr;
        });
      }
      d3_layout_packTransform(root, w / 2, h / 2, radius ? 1 : 1 / Math.max(2 * root.r / w, 2 * root.r / h));
      return nodes;
    }
    pack.size = function(_) {
      if (!arguments.length) return size;
      size = _;
      return pack;
    };
    pack.radius = function(_) {
      if (!arguments.length) return radius;
      radius = _ == null || typeof _ === "function" ? _ : +_;
      return pack;
    };
    pack.padding = function(_) {
      if (!arguments.length) return padding;
      padding = +_;
      return pack;
    };
    return d3_layout_hierarchyRebind(pack, hierarchy);
  };
  function d3_layout_packSort(a, b) {
    return a.value - b.value;
  }
  function d3_layout_packInsert(a, b) {
    var c = a._pack_next;
    a._pack_next = b;
    b._pack_prev = a;
    b._pack_next = c;
    c._pack_prev = b;
  }
  function d3_layout_packSplice(a, b) {
    a._pack_next = b;
    b._pack_prev = a;
  }
  function d3_layout_packIntersects(a, b) {
    var dx = b.x - a.x, dy = b.y - a.y, dr = a.r + b.r;
    return .999 * dr * dr > dx * dx + dy * dy;
  }
  function d3_layout_packSiblings(node) {
    if (!(nodes = node.children) || !(n = nodes.length)) return;
    var nodes, xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity, a, b, c, i, j, k, n;
    function bound(node) {
      xMin = Math.min(node.x - node.r, xMin);
      xMax = Math.max(node.x + node.r, xMax);
      yMin = Math.min(node.y - node.r, yMin);
      yMax = Math.max(node.y + node.r, yMax);
    }
    nodes.forEach(d3_layout_packLink);
    a = nodes[0];
    a.x = -a.r;
    a.y = 0;
    bound(a);
    if (n > 1) {
      b = nodes[1];
      b.x = b.r;
      b.y = 0;
      bound(b);
      if (n > 2) {
        c = nodes[2];
        d3_layout_packPlace(a, b, c);
        bound(c);
        d3_layout_packInsert(a, c);
        a._pack_prev = c;
        d3_layout_packInsert(c, b);
        b = a._pack_next;
        for (i = 3; i < n; i++) {
          d3_layout_packPlace(a, b, c = nodes[i]);
          var isect = 0, s1 = 1, s2 = 1;
          for (j = b._pack_next; j !== b; j = j._pack_next, s1++) {
            if (d3_layout_packIntersects(j, c)) {
              isect = 1;
              break;
            }
          }
          if (isect == 1) {
            for (k = a._pack_prev; k !== j._pack_prev; k = k._pack_prev, s2++) {
              if (d3_layout_packIntersects(k, c)) {
                break;
              }
            }
          }
          if (isect) {
            if (s1 < s2 || s1 == s2 && b.r < a.r) d3_layout_packSplice(a, b = j); else d3_layout_packSplice(a = k, b);
            i--;
          } else {
            d3_layout_packInsert(a, c);
            b = c;
            bound(c);
          }
        }
      }
    }
    var cx = (xMin + xMax) / 2, cy = (yMin + yMax) / 2, cr = 0;
    for (i = 0; i < n; i++) {
      c = nodes[i];
      c.x -= cx;
      c.y -= cy;
      cr = Math.max(cr, c.r + Math.sqrt(c.x * c.x + c.y * c.y));
    }
    node.r = cr;
    nodes.forEach(d3_layout_packUnlink);
  }
  function d3_layout_packLink(node) {
    node._pack_next = node._pack_prev = node;
  }
  function d3_layout_packUnlink(node) {
    delete node._pack_next;
    delete node._pack_prev;
  }
  function d3_layout_packTransform(node, x, y, k) {
    var children = node.children;
    node.x = x += k * node.x;
    node.y = y += k * node.y;
    node.r *= k;
    if (children) {
      var i = -1, n = children.length;
      while (++i < n) d3_layout_packTransform(children[i], x, y, k);
    }
  }
  function d3_layout_packPlace(a, b, c) {
    var db = a.r + c.r, dx = b.x - a.x, dy = b.y - a.y;
    if (db && (dx || dy)) {
      var da = b.r + c.r, dc = dx * dx + dy * dy;
      da *= da;
      db *= db;
      var x = .5 + (db - da) / (2 * dc), y = Math.sqrt(Math.max(0, 2 * da * (db + dc) - (db -= dc) * db - da * da)) / (2 * dc);
      c.x = a.x + x * dx + y * dy;
      c.y = a.y + x * dy - y * dx;
    } else {
      c.x = a.x + db;
      c.y = a.y;
    }
  }
  d3.layout.cluster = function() {
    var hierarchy = d3.layout.hierarchy().sort(null).value(null), separation = d3_layout_treeSeparation, size = [ 1, 1 ], nodeSize = false;
    function cluster(d, i) {
      var nodes = hierarchy.call(this, d, i), root = nodes[0], previousNode, x = 0;
      d3_layout_treeVisitAfter(root, function(node) {
        var children = node.children;
        if (children && children.length) {
          node.x = d3_layout_clusterX(children);
          node.y = d3_layout_clusterY(children);
        } else {
          node.x = previousNode ? x += separation(node, previousNode) : 0;
          node.y = 0;
          previousNode = node;
        }
      });
      var left = d3_layout_clusterLeft(root), right = d3_layout_clusterRight(root), x0 = left.x - separation(left, right) / 2, x1 = right.x + separation(right, left) / 2;
      d3_layout_treeVisitAfter(root, nodeSize ? function(node) {
        node.x = (node.x - root.x) * size[0];
        node.y = (root.y - node.y) * size[1];
      } : function(node) {
        node.x = (node.x - x0) / (x1 - x0) * size[0];
        node.y = (1 - (root.y ? node.y / root.y : 1)) * size[1];
      });
      return nodes;
    }
    cluster.separation = function(x) {
      if (!arguments.length) return separation;
      separation = x;
      return cluster;
    };
    cluster.size = function(x) {
      if (!arguments.length) return nodeSize ? null : size;
      nodeSize = (size = x) == null;
      return cluster;
    };
    cluster.nodeSize = function(x) {
      if (!arguments.length) return nodeSize ? size : null;
      nodeSize = (size = x) != null;
      return cluster;
    };
    return d3_layout_hierarchyRebind(cluster, hierarchy);
  };
  function d3_layout_clusterY(children) {
    return 1 + d3.max(children, function(child) {
      return child.y;
    });
  }
  function d3_layout_clusterX(children) {
    return children.reduce(function(x, child) {
      return x + child.x;
    }, 0) / children.length;
  }
  function d3_layout_clusterLeft(node) {
    var children = node.children;
    return children && children.length ? d3_layout_clusterLeft(children[0]) : node;
  }
  function d3_layout_clusterRight(node) {
    var children = node.children, n;
    return children && (n = children.length) ? d3_layout_clusterRight(children[n - 1]) : node;
  }
  d3.layout.treemap = function() {
    var hierarchy = d3.layout.hierarchy(), round = Math.round, size = [ 1, 1 ], padding = null, pad = d3_layout_treemapPadNull, sticky = false, stickies, mode = "squarify", ratio = .5 * (1 + Math.sqrt(5));
    function scale(children, k) {
      var i = -1, n = children.length, child, area;
      while (++i < n) {
        area = (child = children[i]).value * (k < 0 ? 0 : k);
        child.area = isNaN(area) || area <= 0 ? 0 : area;
      }
    }
    function squarify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), row = [], remaining = children.slice(), child, best = Infinity, score, u = mode === "slice" ? rect.dx : mode === "dice" ? rect.dy : mode === "slice-dice" ? node.depth & 1 ? rect.dy : rect.dx : Math.min(rect.dx, rect.dy), n;
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while ((n = remaining.length) > 0) {
          row.push(child = remaining[n - 1]);
          row.area += child.area;
          if (mode !== "squarify" || (score = worst(row, u)) <= best) {
            remaining.pop();
            best = score;
          } else {
            row.area -= row.pop().area;
            position(row, u, rect, false);
            u = Math.min(rect.dx, rect.dy);
            row.length = row.area = 0;
            best = Infinity;
          }
        }
        if (row.length) {
          position(row, u, rect, true);
          row.length = row.area = 0;
        }
        children.forEach(squarify);
      }
    }
    function stickify(node) {
      var children = node.children;
      if (children && children.length) {
        var rect = pad(node), remaining = children.slice(), child, row = [];
        scale(remaining, rect.dx * rect.dy / node.value);
        row.area = 0;
        while (child = remaining.pop()) {
          row.push(child);
          row.area += child.area;
          if (child.z != null) {
            position(row, child.z ? rect.dx : rect.dy, rect, !remaining.length);
            row.length = row.area = 0;
          }
        }
        children.forEach(stickify);
      }
    }
    function worst(row, u) {
      var s = row.area, r, rmax = 0, rmin = Infinity, i = -1, n = row.length;
      while (++i < n) {
        if (!(r = row[i].area)) continue;
        if (r < rmin) rmin = r;
        if (r > rmax) rmax = r;
      }
      s *= s;
      u *= u;
      return s ? Math.max(u * rmax * ratio / s, s / (u * rmin * ratio)) : Infinity;
    }
    function position(row, u, rect, flush) {
      var i = -1, n = row.length, x = rect.x, y = rect.y, v = u ? round(row.area / u) : 0, o;
      if (u == rect.dx) {
        if (flush || v > rect.dy) v = rect.dy;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dy = v;
          x += o.dx = Math.min(rect.x + rect.dx - x, v ? round(o.area / v) : 0);
        }
        o.z = true;
        o.dx += rect.x + rect.dx - x;
        rect.y += v;
        rect.dy -= v;
      } else {
        if (flush || v > rect.dx) v = rect.dx;
        while (++i < n) {
          o = row[i];
          o.x = x;
          o.y = y;
          o.dx = v;
          y += o.dy = Math.min(rect.y + rect.dy - y, v ? round(o.area / v) : 0);
        }
        o.z = false;
        o.dy += rect.y + rect.dy - y;
        rect.x += v;
        rect.dx -= v;
      }
    }
    function treemap(d) {
      var nodes = stickies || hierarchy(d), root = nodes[0];
      root.x = 0;
      root.y = 0;
      root.dx = size[0];
      root.dy = size[1];
      if (stickies) hierarchy.revalue(root);
      scale([ root ], root.dx * root.dy / root.value);
      (stickies ? stickify : squarify)(root);
      if (sticky) stickies = nodes;
      return nodes;
    }
    treemap.size = function(x) {
      if (!arguments.length) return size;
      size = x;
      return treemap;
    };
    treemap.padding = function(x) {
      if (!arguments.length) return padding;
      function padFunction(node) {
        var p = x.call(treemap, node, node.depth);
        return p == null ? d3_layout_treemapPadNull(node) : d3_layout_treemapPad(node, typeof p === "number" ? [ p, p, p, p ] : p);
      }
      function padConstant(node) {
        return d3_layout_treemapPad(node, x);
      }
      var type;
      pad = (padding = x) == null ? d3_layout_treemapPadNull : (type = typeof x) === "function" ? padFunction : type === "number" ? (x = [ x, x, x, x ], 
      padConstant) : padConstant;
      return treemap;
    };
    treemap.round = function(x) {
      if (!arguments.length) return round != Number;
      round = x ? Math.round : Number;
      return treemap;
    };
    treemap.sticky = function(x) {
      if (!arguments.length) return sticky;
      sticky = x;
      stickies = null;
      return treemap;
    };
    treemap.ratio = function(x) {
      if (!arguments.length) return ratio;
      ratio = x;
      return treemap;
    };
    treemap.mode = function(x) {
      if (!arguments.length) return mode;
      mode = x + "";
      return treemap;
    };
    return d3_layout_hierarchyRebind(treemap, hierarchy);
  };
  function d3_layout_treemapPadNull(node) {
    return {
      x: node.x,
      y: node.y,
      dx: node.dx,
      dy: node.dy
    };
  }
  function d3_layout_treemapPad(node, padding) {
    var x = node.x + padding[3], y = node.y + padding[0], dx = node.dx - padding[1] - padding[3], dy = node.dy - padding[0] - padding[2];
    if (dx < 0) {
      x += dx / 2;
      dx = 0;
    }
    if (dy < 0) {
      y += dy / 2;
      dy = 0;
    }
    return {
      x: x,
      y: y,
      dx: dx,
      dy: dy
    };
  }
  d3.random = {
    normal: function(µ, σ) {
      var n = arguments.length;
      if (n < 2) σ = 1;
      if (n < 1) µ = 0;
      return function() {
        var x, y, r;
        do {
          x = Math.random() * 2 - 1;
          y = Math.random() * 2 - 1;
          r = x * x + y * y;
        } while (!r || r > 1);
        return µ + σ * x * Math.sqrt(-2 * Math.log(r) / r);
      };
    },
    logNormal: function() {
      var random = d3.random.normal.apply(d3, arguments);
      return function() {
        return Math.exp(random());
      };
    },
    irwinHall: function(m) {
      return function() {
        for (var s = 0, j = 0; j < m; j++) s += Math.random();
        return s / m;
      };
    }
  };
  d3.scale = {};
  function d3_scaleExtent(domain) {
    var start = domain[0], stop = domain[domain.length - 1];
    return start < stop ? [ start, stop ] : [ stop, start ];
  }
  function d3_scaleRange(scale) {
    return scale.rangeExtent ? scale.rangeExtent() : d3_scaleExtent(scale.range());
  }
  function d3_scale_bilinear(domain, range, uninterpolate, interpolate) {
    var u = uninterpolate(domain[0], domain[1]), i = interpolate(range[0], range[1]);
    return function(x) {
      return i(u(x));
    };
  }
  function d3_scale_nice(domain, nice) {
    var i0 = 0, i1 = domain.length - 1, x0 = domain[i0], x1 = domain[i1], dx;
    if (x1 < x0) {
      dx = i0, i0 = i1, i1 = dx;
      dx = x0, x0 = x1, x1 = dx;
    }
    domain[i0] = nice.floor(x0);
    domain[i1] = nice.ceil(x1);
    return domain;
  }
  function d3_scale_niceStep(step) {
    return step ? {
      floor: function(x) {
        return Math.floor(x / step) * step;
      },
      ceil: function(x) {
        return Math.ceil(x / step) * step;
      }
    } : d3_scale_niceIdentity;
  }
  var d3_scale_niceIdentity = {
    floor: d3_identity,
    ceil: d3_identity
  };
  function d3_scale_polylinear(domain, range, uninterpolate, interpolate) {
    var u = [], i = [], j = 0, k = Math.min(domain.length, range.length) - 1;
    if (domain[k] < domain[0]) {
      domain = domain.slice().reverse();
      range = range.slice().reverse();
    }
    while (++j <= k) {
      u.push(uninterpolate(domain[j - 1], domain[j]));
      i.push(interpolate(range[j - 1], range[j]));
    }
    return function(x) {
      var j = d3.bisect(domain, x, 1, k) - 1;
      return i[j](u[j](x));
    };
  }
  d3.scale.linear = function() {
    return d3_scale_linear([ 0, 1 ], [ 0, 1 ], d3_interpolate, false);
  };
  function d3_scale_linear(domain, range, interpolate, clamp) {
    var output, input;
    function rescale() {
      var linear = Math.min(domain.length, range.length) > 2 ? d3_scale_polylinear : d3_scale_bilinear, uninterpolate = clamp ? d3_uninterpolateClamp : d3_uninterpolateNumber;
      output = linear(domain, range, uninterpolate, interpolate);
      input = linear(range, domain, uninterpolate, d3_interpolate);
      return scale;
    }
    function scale(x) {
      return output(x);
    }
    scale.invert = function(y) {
      return input(y);
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(Number);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.rangeRound = function(x) {
      return scale.range(x).interpolate(d3_interpolateRound);
    };
    scale.clamp = function(x) {
      if (!arguments.length) return clamp;
      clamp = x;
      return rescale();
    };
    scale.interpolate = function(x) {
      if (!arguments.length) return interpolate;
      interpolate = x;
      return rescale();
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      d3_scale_linearNice(domain, m);
      return rescale();
    };
    scale.copy = function() {
      return d3_scale_linear(domain, range, interpolate, clamp);
    };
    return rescale();
  }
  function d3_scale_linearRebind(scale, linear) {
    return d3.rebind(scale, linear, "range", "rangeRound", "interpolate", "clamp");
  }
  function d3_scale_linearNice(domain, m) {
    return d3_scale_nice(domain, d3_scale_niceStep(d3_scale_linearTickRange(domain, m)[2]));
  }
  function d3_scale_linearTickRange(domain, m) {
    if (m == null) m = 10;
    var extent = d3_scaleExtent(domain), span = extent[1] - extent[0], step = Math.pow(10, Math.floor(Math.log(span / m) / Math.LN10)), err = m / span * step;
    if (err <= .15) step *= 10; else if (err <= .35) step *= 5; else if (err <= .75) step *= 2;
    extent[0] = Math.ceil(extent[0] / step) * step;
    extent[1] = Math.floor(extent[1] / step) * step + step * .5;
    extent[2] = step;
    return extent;
  }
  function d3_scale_linearTicks(domain, m) {
    return d3.range.apply(d3, d3_scale_linearTickRange(domain, m));
  }
  function d3_scale_linearTickFormat(domain, m, format) {
    var precision = -Math.floor(Math.log(d3_scale_linearTickRange(domain, m)[2]) / Math.LN10 + .01);
    return d3.format(format ? format.replace(d3_format_re, function(a, b, c, d, e, f, g, h, i, j) {
      return [ b, c, d, e, f, g, h, i || "." + (precision - (j === "%") * 2), j ].join("");
    }) : ",." + precision + "f");
  }
  d3.scale.log = function() {
    return d3_scale_log(d3.scale.linear().domain([ 0, 1 ]), 10, true, [ 1, 10 ]);
  };
  function d3_scale_log(linear, base, positive, domain) {
    function log(x) {
      return (positive ? Math.log(x < 0 ? 0 : x) : -Math.log(x > 0 ? 0 : -x)) / Math.log(base);
    }
    function pow(x) {
      return positive ? Math.pow(base, x) : -Math.pow(base, -x);
    }
    function scale(x) {
      return linear(log(x));
    }
    scale.invert = function(x) {
      return pow(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      positive = x[0] >= 0;
      linear.domain((domain = x.map(Number)).map(log));
      return scale;
    };
    scale.base = function(_) {
      if (!arguments.length) return base;
      base = +_;
      linear.domain(domain.map(log));
      return scale;
    };
    scale.nice = function() {
      var niced = d3_scale_nice(domain.map(log), positive ? Math : d3_scale_logNiceNegative);
      linear.domain(niced);
      domain = niced.map(pow);
      return scale;
    };
    scale.ticks = function() {
      var extent = d3_scaleExtent(domain), ticks = [], u = extent[0], v = extent[1], i = Math.floor(log(u)), j = Math.ceil(log(v)), n = base % 1 ? 2 : base;
      if (isFinite(j - i)) {
        if (positive) {
          for (;i < j; i++) for (var k = 1; k < n; k++) ticks.push(pow(i) * k);
          ticks.push(pow(i));
        } else {
          ticks.push(pow(i));
          for (;i++ < j; ) for (var k = n - 1; k > 0; k--) ticks.push(pow(i) * k);
        }
        for (i = 0; ticks[i] < u; i++) {}
        for (j = ticks.length; ticks[j - 1] > v; j--) {}
        ticks = ticks.slice(i, j);
      }
      return ticks;
    };
    scale.tickFormat = function(n, format) {
      if (!arguments.length) return d3_scale_logFormat;
      if (arguments.length < 2) format = d3_scale_logFormat; else if (typeof format !== "function") format = d3.format(format);
      var k = Math.max(.1, n / scale.ticks().length), f = positive ? (e = 1e-12, Math.ceil) : (e = -1e-12, 
      Math.floor), e;
      return function(d) {
        return d / pow(f(log(d) + e)) <= k ? format(d) : "";
      };
    };
    scale.copy = function() {
      return d3_scale_log(linear.copy(), base, positive, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  var d3_scale_logFormat = d3.format(".0e"), d3_scale_logNiceNegative = {
    floor: function(x) {
      return -Math.ceil(-x);
    },
    ceil: function(x) {
      return -Math.floor(-x);
    }
  };
  d3.scale.pow = function() {
    return d3_scale_pow(d3.scale.linear(), 1, [ 0, 1 ]);
  };
  function d3_scale_pow(linear, exponent, domain) {
    var powp = d3_scale_powPow(exponent), powb = d3_scale_powPow(1 / exponent);
    function scale(x) {
      return linear(powp(x));
    }
    scale.invert = function(x) {
      return powb(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      linear.domain((domain = x.map(Number)).map(powp));
      return scale;
    };
    scale.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    scale.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    scale.nice = function(m) {
      return scale.domain(d3_scale_linearNice(domain, m));
    };
    scale.exponent = function(x) {
      if (!arguments.length) return exponent;
      powp = d3_scale_powPow(exponent = x);
      powb = d3_scale_powPow(1 / exponent);
      linear.domain(domain.map(powp));
      return scale;
    };
    scale.copy = function() {
      return d3_scale_pow(linear.copy(), exponent, domain);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_scale_powPow(e) {
    return function(x) {
      return x < 0 ? -Math.pow(-x, e) : Math.pow(x, e);
    };
  }
  d3.scale.sqrt = function() {
    return d3.scale.pow().exponent(.5);
  };
  d3.scale.ordinal = function() {
    return d3_scale_ordinal([], {
      t: "range",
      a: [ [] ]
    });
  };
  function d3_scale_ordinal(domain, ranger) {
    var index, range, rangeBand;
    function scale(x) {
      return range[((index.get(x) || ranger.t === "range" && index.set(x, domain.push(x))) - 1) % range.length];
    }
    function steps(start, step) {
      return d3.range(domain.length).map(function(i) {
        return start + step * i;
      });
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = [];
      index = new d3_Map();
      var i = -1, n = x.length, xi;
      while (++i < n) if (!index.has(xi = x[i])) index.set(xi, domain.push(xi));
      return scale[ranger.t].apply(scale, ranger.a);
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      rangeBand = 0;
      ranger = {
        t: "range",
        a: arguments
      };
      return scale;
    };
    scale.rangePoints = function(x, padding) {
      if (arguments.length < 2) padding = 0;
      var start = x[0], stop = x[1], step = (stop - start) / (Math.max(1, domain.length - 1) + padding);
      range = steps(domain.length < 2 ? (start + stop) / 2 : start + step * padding / 2, step);
      rangeBand = 0;
      ranger = {
        t: "rangePoints",
        a: arguments
      };
      return scale;
    };
    scale.rangeBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = (stop - start) / (domain.length - padding + 2 * outerPadding);
      range = steps(start + step * outerPadding, step);
      if (reverse) range.reverse();
      rangeBand = step * (1 - padding);
      ranger = {
        t: "rangeBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeRoundBands = function(x, padding, outerPadding) {
      if (arguments.length < 2) padding = 0;
      if (arguments.length < 3) outerPadding = padding;
      var reverse = x[1] < x[0], start = x[reverse - 0], stop = x[1 - reverse], step = Math.floor((stop - start) / (domain.length - padding + 2 * outerPadding)), error = stop - start - (domain.length - padding) * step;
      range = steps(start + Math.round(error / 2), step);
      if (reverse) range.reverse();
      rangeBand = Math.round(step * (1 - padding));
      ranger = {
        t: "rangeRoundBands",
        a: arguments
      };
      return scale;
    };
    scale.rangeBand = function() {
      return rangeBand;
    };
    scale.rangeExtent = function() {
      return d3_scaleExtent(ranger.a[0]);
    };
    scale.copy = function() {
      return d3_scale_ordinal(domain, ranger);
    };
    return scale.domain(domain);
  }
  d3.scale.category10 = function() {
    return d3.scale.ordinal().range(d3_category10);
  };
  d3.scale.category20 = function() {
    return d3.scale.ordinal().range(d3_category20);
  };
  d3.scale.category20b = function() {
    return d3.scale.ordinal().range(d3_category20b);
  };
  d3.scale.category20c = function() {
    return d3.scale.ordinal().range(d3_category20c);
  };
  var d3_category10 = [ 2062260, 16744206, 2924588, 14034728, 9725885, 9197131, 14907330, 8355711, 12369186, 1556175 ].map(d3_rgbString);
  var d3_category20 = [ 2062260, 11454440, 16744206, 16759672, 2924588, 10018698, 14034728, 16750742, 9725885, 12955861, 9197131, 12885140, 14907330, 16234194, 8355711, 13092807, 12369186, 14408589, 1556175, 10410725 ].map(d3_rgbString);
  var d3_category20b = [ 3750777, 5395619, 7040719, 10264286, 6519097, 9216594, 11915115, 13556636, 9202993, 12426809, 15186514, 15190932, 8666169, 11356490, 14049643, 15177372, 8077683, 10834324, 13528509, 14589654 ].map(d3_rgbString);
  var d3_category20c = [ 3244733, 7057110, 10406625, 13032431, 15095053, 16616764, 16625259, 16634018, 3253076, 7652470, 10607003, 13101504, 7695281, 10394312, 12369372, 14342891, 6513507, 9868950, 12434877, 14277081 ].map(d3_rgbString);
  d3.scale.quantile = function() {
    return d3_scale_quantile([], []);
  };
  function d3_scale_quantile(domain, range) {
    var thresholds;
    function rescale() {
      var k = 0, q = range.length;
      thresholds = [];
      while (++k < q) thresholds[k - 1] = d3.quantile(domain, k / q);
      return scale;
    }
    function scale(x) {
      if (!isNaN(x = +x)) return range[d3.bisect(thresholds, x)];
    }
    scale.domain = function(x) {
      if (!arguments.length) return domain;
      domain = x.filter(function(d) {
        return !isNaN(d);
      }).sort(d3.ascending);
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.quantiles = function() {
      return thresholds;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return y < 0 ? [ NaN, NaN ] : [ y > 0 ? thresholds[y - 1] : domain[0], y < thresholds.length ? thresholds[y] : domain[domain.length - 1] ];
    };
    scale.copy = function() {
      return d3_scale_quantile(domain, range);
    };
    return rescale();
  }
  d3.scale.quantize = function() {
    return d3_scale_quantize(0, 1, [ 0, 1 ]);
  };
  function d3_scale_quantize(x0, x1, range) {
    var kx, i;
    function scale(x) {
      return range[Math.max(0, Math.min(i, Math.floor(kx * (x - x0))))];
    }
    function rescale() {
      kx = range.length / (x1 - x0);
      i = range.length - 1;
      return scale;
    }
    scale.domain = function(x) {
      if (!arguments.length) return [ x0, x1 ];
      x0 = +x[0];
      x1 = +x[x.length - 1];
      return rescale();
    };
    scale.range = function(x) {
      if (!arguments.length) return range;
      range = x;
      return rescale();
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      y = y < 0 ? NaN : y / kx + x0;
      return [ y, y + 1 / kx ];
    };
    scale.copy = function() {
      return d3_scale_quantize(x0, x1, range);
    };
    return rescale();
  }
  d3.scale.threshold = function() {
    return d3_scale_threshold([ .5 ], [ 0, 1 ]);
  };
  function d3_scale_threshold(domain, range) {
    function scale(x) {
      if (x <= x) return range[d3.bisect(domain, x)];
    }
    scale.domain = function(_) {
      if (!arguments.length) return domain;
      domain = _;
      return scale;
    };
    scale.range = function(_) {
      if (!arguments.length) return range;
      range = _;
      return scale;
    };
    scale.invertExtent = function(y) {
      y = range.indexOf(y);
      return [ domain[y - 1], domain[y] ];
    };
    scale.copy = function() {
      return d3_scale_threshold(domain, range);
    };
    return scale;
  }
  d3.scale.identity = function() {
    return d3_scale_identity([ 0, 1 ]);
  };
  function d3_scale_identity(domain) {
    function identity(x) {
      return +x;
    }
    identity.invert = identity;
    identity.domain = identity.range = function(x) {
      if (!arguments.length) return domain;
      domain = x.map(identity);
      return identity;
    };
    identity.ticks = function(m) {
      return d3_scale_linearTicks(domain, m);
    };
    identity.tickFormat = function(m, format) {
      return d3_scale_linearTickFormat(domain, m, format);
    };
    identity.copy = function() {
      return d3_scale_identity(domain);
    };
    return identity;
  }
  d3.svg = {};
  d3.svg.arc = function() {
    var innerRadius = d3_svg_arcInnerRadius, outerRadius = d3_svg_arcOuterRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function arc() {
      var r0 = innerRadius.apply(this, arguments), r1 = outerRadius.apply(this, arguments), a0 = startAngle.apply(this, arguments) + d3_svg_arcOffset, a1 = endAngle.apply(this, arguments) + d3_svg_arcOffset, da = (a1 < a0 && (da = a0, 
      a0 = a1, a1 = da), a1 - a0), df = da < π ? "0" : "1", c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
      return da >= d3_svg_arcMax ? r0 ? "M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1 + "M0," + r0 + "A" + r0 + "," + r0 + " 0 1,0 0," + -r0 + "A" + r0 + "," + r0 + " 0 1,0 0," + r0 + "Z" : "M0," + r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + -r1 + "A" + r1 + "," + r1 + " 0 1,1 0," + r1 + "Z" : r0 ? "M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1 + "L" + r0 * c1 + "," + r0 * s1 + "A" + r0 + "," + r0 + " 0 " + df + ",0 " + r0 * c0 + "," + r0 * s0 + "Z" : "M" + r1 * c0 + "," + r1 * s0 + "A" + r1 + "," + r1 + " 0 " + df + ",1 " + r1 * c1 + "," + r1 * s1 + "L0,0" + "Z";
    }
    arc.innerRadius = function(v) {
      if (!arguments.length) return innerRadius;
      innerRadius = d3_functor(v);
      return arc;
    };
    arc.outerRadius = function(v) {
      if (!arguments.length) return outerRadius;
      outerRadius = d3_functor(v);
      return arc;
    };
    arc.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return arc;
    };
    arc.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return arc;
    };
    arc.centroid = function() {
      var r = (innerRadius.apply(this, arguments) + outerRadius.apply(this, arguments)) / 2, a = (startAngle.apply(this, arguments) + endAngle.apply(this, arguments)) / 2 + d3_svg_arcOffset;
      return [ Math.cos(a) * r, Math.sin(a) * r ];
    };
    return arc;
  };
  var d3_svg_arcOffset = -halfπ, d3_svg_arcMax = τ - ε;
  function d3_svg_arcInnerRadius(d) {
    return d.innerRadius;
  }
  function d3_svg_arcOuterRadius(d) {
    return d.outerRadius;
  }
  function d3_svg_arcStartAngle(d) {
    return d.startAngle;
  }
  function d3_svg_arcEndAngle(d) {
    return d.endAngle;
  }
  function d3_svg_line(projection) {
    var x = d3_geom_pointX, y = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, tension = .7;
    function line(data) {
      var segments = [], points = [], i = -1, n = data.length, d, fx = d3_functor(x), fy = d3_functor(y);
      function segment() {
        segments.push("M", interpolate(projection(points), tension));
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points.push([ +fx.call(this, d, i), +fy.call(this, d, i) ]);
        } else if (points.length) {
          segment();
          points = [];
        }
      }
      if (points.length) segment();
      return segments.length ? segments.join("") : null;
    }
    line.x = function(_) {
      if (!arguments.length) return x;
      x = _;
      return line;
    };
    line.y = function(_) {
      if (!arguments.length) return y;
      y = _;
      return line;
    };
    line.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return line;
    };
    line.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      return line;
    };
    line.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return line;
    };
    return line;
  }
  d3.svg.line = function() {
    return d3_svg_line(d3_identity);
  };
  var d3_svg_lineInterpolators = d3.map({
    linear: d3_svg_lineLinear,
    "linear-closed": d3_svg_lineLinearClosed,
    step: d3_svg_lineStep,
    "step-before": d3_svg_lineStepBefore,
    "step-after": d3_svg_lineStepAfter,
    basis: d3_svg_lineBasis,
    "basis-open": d3_svg_lineBasisOpen,
    "basis-closed": d3_svg_lineBasisClosed,
    bundle: d3_svg_lineBundle,
    cardinal: d3_svg_lineCardinal,
    "cardinal-open": d3_svg_lineCardinalOpen,
    "cardinal-closed": d3_svg_lineCardinalClosed,
    monotone: d3_svg_lineMonotone
  });
  d3_svg_lineInterpolators.forEach(function(key, value) {
    value.key = key;
    value.closed = /-closed$/.test(key);
  });
  function d3_svg_lineLinear(points) {
    return points.join("L");
  }
  function d3_svg_lineLinearClosed(points) {
    return d3_svg_lineLinear(points) + "Z";
  }
  function d3_svg_lineStep(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p[0] + (p = points[i])[0]) / 2, "V", p[1]);
    if (n > 1) path.push("H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepBefore(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("V", (p = points[i])[1], "H", p[0]);
    return path.join("");
  }
  function d3_svg_lineStepAfter(points) {
    var i = 0, n = points.length, p = points[0], path = [ p[0], ",", p[1] ];
    while (++i < n) path.push("H", (p = points[i])[0], "V", p[1]);
    return path.join("");
  }
  function d3_svg_lineCardinalOpen(points, tension) {
    return points.length < 4 ? d3_svg_lineLinear(points) : points[1] + d3_svg_lineHermite(points.slice(1, points.length - 1), d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineCardinalClosed(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite((points.push(points[0]), 
    points), d3_svg_lineCardinalTangents([ points[points.length - 2] ].concat(points, [ points[1] ]), tension));
  }
  function d3_svg_lineCardinal(points, tension) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineCardinalTangents(points, tension));
  }
  function d3_svg_lineHermite(points, tangents) {
    if (tangents.length < 1 || points.length != tangents.length && points.length != tangents.length + 2) {
      return d3_svg_lineLinear(points);
    }
    var quad = points.length != tangents.length, path = "", p0 = points[0], p = points[1], t0 = tangents[0], t = t0, pi = 1;
    if (quad) {
      path += "Q" + (p[0] - t0[0] * 2 / 3) + "," + (p[1] - t0[1] * 2 / 3) + "," + p[0] + "," + p[1];
      p0 = points[1];
      pi = 2;
    }
    if (tangents.length > 1) {
      t = tangents[1];
      p = points[pi];
      pi++;
      path += "C" + (p0[0] + t0[0]) + "," + (p0[1] + t0[1]) + "," + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      for (var i = 2; i < tangents.length; i++, pi++) {
        p = points[pi];
        t = tangents[i];
        path += "S" + (p[0] - t[0]) + "," + (p[1] - t[1]) + "," + p[0] + "," + p[1];
      }
    }
    if (quad) {
      var lp = points[pi];
      path += "Q" + (p[0] + t[0] * 2 / 3) + "," + (p[1] + t[1] * 2 / 3) + "," + lp[0] + "," + lp[1];
    }
    return path;
  }
  function d3_svg_lineCardinalTangents(points, tension) {
    var tangents = [], a = (1 - tension) / 2, p0, p1 = points[0], p2 = points[1], i = 1, n = points.length;
    while (++i < n) {
      p0 = p1;
      p1 = p2;
      p2 = points[i];
      tangents.push([ a * (p2[0] - p0[0]), a * (p2[1] - p0[1]) ]);
    }
    return tangents;
  }
  function d3_svg_lineBasis(points) {
    if (points.length < 3) return d3_svg_lineLinear(points);
    var i = 1, n = points.length, pi = points[0], x0 = pi[0], y0 = pi[1], px = [ x0, x0, x0, (pi = points[1])[0] ], py = [ y0, y0, y0, pi[1] ], path = [ x0, ",", y0, "L", d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    points.push(points[n - 1]);
    while (++i <= n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    points.pop();
    path.push("L", pi);
    return path.join("");
  }
  function d3_svg_lineBasisOpen(points) {
    if (points.length < 4) return d3_svg_lineLinear(points);
    var path = [], i = -1, n = points.length, pi, px = [ 0 ], py = [ 0 ];
    while (++i < 3) {
      pi = points[i];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path.push(d3_svg_lineDot4(d3_svg_lineBasisBezier3, px) + "," + d3_svg_lineDot4(d3_svg_lineBasisBezier3, py));
    --i;
    while (++i < n) {
      pi = points[i];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBasisClosed(points) {
    var path, i = -1, n = points.length, m = n + 4, pi, px = [], py = [];
    while (++i < 4) {
      pi = points[i % n];
      px.push(pi[0]);
      py.push(pi[1]);
    }
    path = [ d3_svg_lineDot4(d3_svg_lineBasisBezier3, px), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, py) ];
    --i;
    while (++i < m) {
      pi = points[i % n];
      px.shift();
      px.push(pi[0]);
      py.shift();
      py.push(pi[1]);
      d3_svg_lineBasisBezier(path, px, py);
    }
    return path.join("");
  }
  function d3_svg_lineBundle(points, tension) {
    var n = points.length - 1;
    if (n) {
      var x0 = points[0][0], y0 = points[0][1], dx = points[n][0] - x0, dy = points[n][1] - y0, i = -1, p, t;
      while (++i <= n) {
        p = points[i];
        t = i / n;
        p[0] = tension * p[0] + (1 - tension) * (x0 + t * dx);
        p[1] = tension * p[1] + (1 - tension) * (y0 + t * dy);
      }
    }
    return d3_svg_lineBasis(points);
  }
  function d3_svg_lineDot4(a, b) {
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2] + a[3] * b[3];
  }
  var d3_svg_lineBasisBezier1 = [ 0, 2 / 3, 1 / 3, 0 ], d3_svg_lineBasisBezier2 = [ 0, 1 / 3, 2 / 3, 0 ], d3_svg_lineBasisBezier3 = [ 0, 1 / 6, 2 / 3, 1 / 6 ];
  function d3_svg_lineBasisBezier(path, x, y) {
    path.push("C", d3_svg_lineDot4(d3_svg_lineBasisBezier1, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier1, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier2, y), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, x), ",", d3_svg_lineDot4(d3_svg_lineBasisBezier3, y));
  }
  function d3_svg_lineSlope(p0, p1) {
    return (p1[1] - p0[1]) / (p1[0] - p0[0]);
  }
  function d3_svg_lineFiniteDifferences(points) {
    var i = 0, j = points.length - 1, m = [], p0 = points[0], p1 = points[1], d = m[0] = d3_svg_lineSlope(p0, p1);
    while (++i < j) {
      m[i] = (d + (d = d3_svg_lineSlope(p0 = p1, p1 = points[i + 1]))) / 2;
    }
    m[i] = d;
    return m;
  }
  function d3_svg_lineMonotoneTangents(points) {
    var tangents = [], d, a, b, s, m = d3_svg_lineFiniteDifferences(points), i = -1, j = points.length - 1;
    while (++i < j) {
      d = d3_svg_lineSlope(points[i], points[i + 1]);
      if (abs(d) < ε) {
        m[i] = m[i + 1] = 0;
      } else {
        a = m[i] / d;
        b = m[i + 1] / d;
        s = a * a + b * b;
        if (s > 9) {
          s = d * 3 / Math.sqrt(s);
          m[i] = s * a;
          m[i + 1] = s * b;
        }
      }
    }
    i = -1;
    while (++i <= j) {
      s = (points[Math.min(j, i + 1)][0] - points[Math.max(0, i - 1)][0]) / (6 * (1 + m[i] * m[i]));
      tangents.push([ s || 0, m[i] * s || 0 ]);
    }
    return tangents;
  }
  function d3_svg_lineMonotone(points) {
    return points.length < 3 ? d3_svg_lineLinear(points) : points[0] + d3_svg_lineHermite(points, d3_svg_lineMonotoneTangents(points));
  }
  d3.svg.line.radial = function() {
    var line = d3_svg_line(d3_svg_lineRadial);
    line.radius = line.x, delete line.x;
    line.angle = line.y, delete line.y;
    return line;
  };
  function d3_svg_lineRadial(points) {
    var point, i = -1, n = points.length, r, a;
    while (++i < n) {
      point = points[i];
      r = point[0];
      a = point[1] + d3_svg_arcOffset;
      point[0] = r * Math.cos(a);
      point[1] = r * Math.sin(a);
    }
    return points;
  }
  function d3_svg_area(projection) {
    var x0 = d3_geom_pointX, x1 = d3_geom_pointX, y0 = 0, y1 = d3_geom_pointY, defined = d3_true, interpolate = d3_svg_lineLinear, interpolateKey = interpolate.key, interpolateReverse = interpolate, L = "L", tension = .7;
    function area(data) {
      var segments = [], points0 = [], points1 = [], i = -1, n = data.length, d, fx0 = d3_functor(x0), fy0 = d3_functor(y0), fx1 = x0 === x1 ? function() {
        return x;
      } : d3_functor(x1), fy1 = y0 === y1 ? function() {
        return y;
      } : d3_functor(y1), x, y;
      function segment() {
        segments.push("M", interpolate(projection(points1), tension), L, interpolateReverse(projection(points0.reverse()), tension), "Z");
      }
      while (++i < n) {
        if (defined.call(this, d = data[i], i)) {
          points0.push([ x = +fx0.call(this, d, i), y = +fy0.call(this, d, i) ]);
          points1.push([ +fx1.call(this, d, i), +fy1.call(this, d, i) ]);
        } else if (points0.length) {
          segment();
          points0 = [];
          points1 = [];
        }
      }
      if (points0.length) segment();
      return segments.length ? segments.join("") : null;
    }
    area.x = function(_) {
      if (!arguments.length) return x1;
      x0 = x1 = _;
      return area;
    };
    area.x0 = function(_) {
      if (!arguments.length) return x0;
      x0 = _;
      return area;
    };
    area.x1 = function(_) {
      if (!arguments.length) return x1;
      x1 = _;
      return area;
    };
    area.y = function(_) {
      if (!arguments.length) return y1;
      y0 = y1 = _;
      return area;
    };
    area.y0 = function(_) {
      if (!arguments.length) return y0;
      y0 = _;
      return area;
    };
    area.y1 = function(_) {
      if (!arguments.length) return y1;
      y1 = _;
      return area;
    };
    area.defined = function(_) {
      if (!arguments.length) return defined;
      defined = _;
      return area;
    };
    area.interpolate = function(_) {
      if (!arguments.length) return interpolateKey;
      if (typeof _ === "function") interpolateKey = interpolate = _; else interpolateKey = (interpolate = d3_svg_lineInterpolators.get(_) || d3_svg_lineLinear).key;
      interpolateReverse = interpolate.reverse || interpolate;
      L = interpolate.closed ? "M" : "L";
      return area;
    };
    area.tension = function(_) {
      if (!arguments.length) return tension;
      tension = _;
      return area;
    };
    return area;
  }
  d3_svg_lineStepBefore.reverse = d3_svg_lineStepAfter;
  d3_svg_lineStepAfter.reverse = d3_svg_lineStepBefore;
  d3.svg.area = function() {
    return d3_svg_area(d3_identity);
  };
  d3.svg.area.radial = function() {
    var area = d3_svg_area(d3_svg_lineRadial);
    area.radius = area.x, delete area.x;
    area.innerRadius = area.x0, delete area.x0;
    area.outerRadius = area.x1, delete area.x1;
    area.angle = area.y, delete area.y;
    area.startAngle = area.y0, delete area.y0;
    area.endAngle = area.y1, delete area.y1;
    return area;
  };
  d3.svg.chord = function() {
    var source = d3_source, target = d3_target, radius = d3_svg_chordRadius, startAngle = d3_svg_arcStartAngle, endAngle = d3_svg_arcEndAngle;
    function chord(d, i) {
      var s = subgroup(this, source, d, i), t = subgroup(this, target, d, i);
      return "M" + s.p0 + arc(s.r, s.p1, s.a1 - s.a0) + (equals(s, t) ? curve(s.r, s.p1, s.r, s.p0) : curve(s.r, s.p1, t.r, t.p0) + arc(t.r, t.p1, t.a1 - t.a0) + curve(t.r, t.p1, s.r, s.p0)) + "Z";
    }
    function subgroup(self, f, d, i) {
      var subgroup = f.call(self, d, i), r = radius.call(self, subgroup, i), a0 = startAngle.call(self, subgroup, i) + d3_svg_arcOffset, a1 = endAngle.call(self, subgroup, i) + d3_svg_arcOffset;
      return {
        r: r,
        a0: a0,
        a1: a1,
        p0: [ r * Math.cos(a0), r * Math.sin(a0) ],
        p1: [ r * Math.cos(a1), r * Math.sin(a1) ]
      };
    }
    function equals(a, b) {
      return a.a0 == b.a0 && a.a1 == b.a1;
    }
    function arc(r, p, a) {
      return "A" + r + "," + r + " 0 " + +(a > π) + ",1 " + p;
    }
    function curve(r0, p0, r1, p1) {
      return "Q 0,0 " + p1;
    }
    chord.radius = function(v) {
      if (!arguments.length) return radius;
      radius = d3_functor(v);
      return chord;
    };
    chord.source = function(v) {
      if (!arguments.length) return source;
      source = d3_functor(v);
      return chord;
    };
    chord.target = function(v) {
      if (!arguments.length) return target;
      target = d3_functor(v);
      return chord;
    };
    chord.startAngle = function(v) {
      if (!arguments.length) return startAngle;
      startAngle = d3_functor(v);
      return chord;
    };
    chord.endAngle = function(v) {
      if (!arguments.length) return endAngle;
      endAngle = d3_functor(v);
      return chord;
    };
    return chord;
  };
  function d3_svg_chordRadius(d) {
    return d.radius;
  }
  d3.svg.diagonal = function() {
    var source = d3_source, target = d3_target, projection = d3_svg_diagonalProjection;
    function diagonal(d, i) {
      var p0 = source.call(this, d, i), p3 = target.call(this, d, i), m = (p0.y + p3.y) / 2, p = [ p0, {
        x: p0.x,
        y: m
      }, {
        x: p3.x,
        y: m
      }, p3 ];
      p = p.map(projection);
      return "M" + p[0] + "C" + p[1] + " " + p[2] + " " + p[3];
    }
    diagonal.source = function(x) {
      if (!arguments.length) return source;
      source = d3_functor(x);
      return diagonal;
    };
    diagonal.target = function(x) {
      if (!arguments.length) return target;
      target = d3_functor(x);
      return diagonal;
    };
    diagonal.projection = function(x) {
      if (!arguments.length) return projection;
      projection = x;
      return diagonal;
    };
    return diagonal;
  };
  function d3_svg_diagonalProjection(d) {
    return [ d.x, d.y ];
  }
  d3.svg.diagonal.radial = function() {
    var diagonal = d3.svg.diagonal(), projection = d3_svg_diagonalProjection, projection_ = diagonal.projection;
    diagonal.projection = function(x) {
      return arguments.length ? projection_(d3_svg_diagonalRadialProjection(projection = x)) : projection;
    };
    return diagonal;
  };
  function d3_svg_diagonalRadialProjection(projection) {
    return function() {
      var d = projection.apply(this, arguments), r = d[0], a = d[1] + d3_svg_arcOffset;
      return [ r * Math.cos(a), r * Math.sin(a) ];
    };
  }
  d3.svg.symbol = function() {
    var type = d3_svg_symbolType, size = d3_svg_symbolSize;
    function symbol(d, i) {
      return (d3_svg_symbols.get(type.call(this, d, i)) || d3_svg_symbolCircle)(size.call(this, d, i));
    }
    symbol.type = function(x) {
      if (!arguments.length) return type;
      type = d3_functor(x);
      return symbol;
    };
    symbol.size = function(x) {
      if (!arguments.length) return size;
      size = d3_functor(x);
      return symbol;
    };
    return symbol;
  };
  function d3_svg_symbolSize() {
    return 64;
  }
  function d3_svg_symbolType() {
    return "circle";
  }
  function d3_svg_symbolCircle(size) {
    var r = Math.sqrt(size / π);
    return "M0," + r + "A" + r + "," + r + " 0 1,1 0," + -r + "A" + r + "," + r + " 0 1,1 0," + r + "Z";
  }
  var d3_svg_symbols = d3.map({
    circle: d3_svg_symbolCircle,
    cross: function(size) {
      var r = Math.sqrt(size / 5) / 2;
      return "M" + -3 * r + "," + -r + "H" + -r + "V" + -3 * r + "H" + r + "V" + -r + "H" + 3 * r + "V" + r + "H" + r + "V" + 3 * r + "H" + -r + "V" + r + "H" + -3 * r + "Z";
    },
    diamond: function(size) {
      var ry = Math.sqrt(size / (2 * d3_svg_symbolTan30)), rx = ry * d3_svg_symbolTan30;
      return "M0," + -ry + "L" + rx + ",0" + " 0," + ry + " " + -rx + ",0" + "Z";
    },
    square: function(size) {
      var r = Math.sqrt(size) / 2;
      return "M" + -r + "," + -r + "L" + r + "," + -r + " " + r + "," + r + " " + -r + "," + r + "Z";
    },
    "triangle-down": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + ry + "L" + rx + "," + -ry + " " + -rx + "," + -ry + "Z";
    },
    "triangle-up": function(size) {
      var rx = Math.sqrt(size / d3_svg_symbolSqrt3), ry = rx * d3_svg_symbolSqrt3 / 2;
      return "M0," + -ry + "L" + rx + "," + ry + " " + -rx + "," + ry + "Z";
    }
  });
  d3.svg.symbolTypes = d3_svg_symbols.keys();
  var d3_svg_symbolSqrt3 = Math.sqrt(3), d3_svg_symbolTan30 = Math.tan(30 * d3_radians);
  function d3_transition(groups, id) {
    d3_subclass(groups, d3_transitionPrototype);
    groups.id = id;
    return groups;
  }
  var d3_transitionPrototype = [], d3_transitionId = 0, d3_transitionInheritId, d3_transitionInherit;
  d3_transitionPrototype.call = d3_selectionPrototype.call;
  d3_transitionPrototype.empty = d3_selectionPrototype.empty;
  d3_transitionPrototype.node = d3_selectionPrototype.node;
  d3_transitionPrototype.size = d3_selectionPrototype.size;
  d3.transition = function(selection) {
    return arguments.length ? d3_transitionInheritId ? selection.transition() : selection : d3_selectionRoot.transition();
  };
  d3.transition.prototype = d3_transitionPrototype;
  d3_transitionPrototype.select = function(selector) {
    var id = this.id, subgroups = [], subgroup, subnode, node;
    selector = d3_selection_selector(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if ((node = group[i]) && (subnode = selector.call(node, node.__data__, i, j))) {
          if ("__data__" in node) subnode.__data__ = node.__data__;
          d3_transitionNode(subnode, i, id, node.__transition__[id]);
          subgroup.push(subnode);
        } else {
          subgroup.push(null);
        }
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_transitionPrototype.selectAll = function(selector) {
    var id = this.id, subgroups = [], subgroup, subnodes, node, subnode, transition;
    selector = d3_selection_selectorAll(selector);
    for (var j = -1, m = this.length; ++j < m; ) {
      for (var group = this[j], i = -1, n = group.length; ++i < n; ) {
        if (node = group[i]) {
          transition = node.__transition__[id];
          subnodes = selector.call(node, node.__data__, i, j);
          subgroups.push(subgroup = []);
          for (var k = -1, o = subnodes.length; ++k < o; ) {
            if (subnode = subnodes[k]) d3_transitionNode(subnode, k, id, transition);
            subgroup.push(subnode);
          }
        }
      }
    }
    return d3_transition(subgroups, id);
  };
  d3_transitionPrototype.filter = function(filter) {
    var subgroups = [], subgroup, group, node;
    if (typeof filter !== "function") filter = d3_selection_filter(filter);
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if ((node = group[i]) && filter.call(node, node.__data__, i)) {
          subgroup.push(node);
        }
      }
    }
    return d3_transition(subgroups, this.id);
  };
  d3_transitionPrototype.tween = function(name, tween) {
    var id = this.id;
    if (arguments.length < 2) return this.node().__transition__[id].tween.get(name);
    return d3_selection_each(this, tween == null ? function(node) {
      node.__transition__[id].tween.remove(name);
    } : function(node) {
      node.__transition__[id].tween.set(name, tween);
    });
  };
  function d3_transition_tween(groups, name, value, tween) {
    var id = groups.id;
    return d3_selection_each(groups, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].tween.set(name, tween(value.call(node, node.__data__, i, j)));
    } : (value = tween(value), function(node) {
      node.__transition__[id].tween.set(name, value);
    }));
  }
  d3_transitionPrototype.attr = function(nameNS, value) {
    if (arguments.length < 2) {
      for (value in nameNS) this.attr(value, nameNS[value]);
      return this;
    }
    var interpolate = nameNS == "transform" ? d3_interpolateTransform : d3_interpolate, name = d3.ns.qualify(nameNS);
    function attrNull() {
      this.removeAttribute(name);
    }
    function attrNullNS() {
      this.removeAttributeNS(name.space, name.local);
    }
    function attrTween(b) {
      return b == null ? attrNull : (b += "", function() {
        var a = this.getAttribute(name), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttribute(name, i(t));
        });
      });
    }
    function attrTweenNS(b) {
      return b == null ? attrNullNS : (b += "", function() {
        var a = this.getAttributeNS(name.space, name.local), i;
        return a !== b && (i = interpolate(a, b), function(t) {
          this.setAttributeNS(name.space, name.local, i(t));
        });
      });
    }
    return d3_transition_tween(this, "attr." + nameNS, value, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.attrTween = function(nameNS, tween) {
    var name = d3.ns.qualify(nameNS);
    function attrTween(d, i) {
      var f = tween.call(this, d, i, this.getAttribute(name));
      return f && function(t) {
        this.setAttribute(name, f(t));
      };
    }
    function attrTweenNS(d, i) {
      var f = tween.call(this, d, i, this.getAttributeNS(name.space, name.local));
      return f && function(t) {
        this.setAttributeNS(name.space, name.local, f(t));
      };
    }
    return this.tween("attr." + nameNS, name.local ? attrTweenNS : attrTween);
  };
  d3_transitionPrototype.style = function(name, value, priority) {
    var n = arguments.length;
    if (n < 3) {
      if (typeof name !== "string") {
        if (n < 2) value = "";
        for (priority in name) this.style(priority, name[priority], value);
        return this;
      }
      priority = "";
    }
    function styleNull() {
      this.style.removeProperty(name);
    }
    function styleString(b) {
      return b == null ? styleNull : (b += "", function() {
        var a = d3_window.getComputedStyle(this, null).getPropertyValue(name), i;
        return a !== b && (i = d3_interpolate(a, b), function(t) {
          this.style.setProperty(name, i(t), priority);
        });
      });
    }
    return d3_transition_tween(this, "style." + name, value, styleString);
  };
  d3_transitionPrototype.styleTween = function(name, tween, priority) {
    if (arguments.length < 3) priority = "";
    function styleTween(d, i) {
      var f = tween.call(this, d, i, d3_window.getComputedStyle(this, null).getPropertyValue(name));
      return f && function(t) {
        this.style.setProperty(name, f(t), priority);
      };
    }
    return this.tween("style." + name, styleTween);
  };
  d3_transitionPrototype.text = function(value) {
    return d3_transition_tween(this, "text", value, d3_transition_text);
  };
  function d3_transition_text(b) {
    if (b == null) b = "";
    return function() {
      this.textContent = b;
    };
  }
  d3_transitionPrototype.remove = function() {
    return this.each("end.transition", function() {
      var p;
      if (this.__transition__.count < 2 && (p = this.parentNode)) p.removeChild(this);
    });
  };
  d3_transitionPrototype.ease = function(value) {
    var id = this.id;
    if (arguments.length < 1) return this.node().__transition__[id].ease;
    if (typeof value !== "function") value = d3.ease.apply(d3, arguments);
    return d3_selection_each(this, function(node) {
      node.__transition__[id].ease = value;
    });
  };
  d3_transitionPrototype.delay = function(value) {
    var id = this.id;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].delay = +value.call(node, node.__data__, i, j);
    } : (value = +value, function(node) {
      node.__transition__[id].delay = value;
    }));
  };
  d3_transitionPrototype.duration = function(value) {
    var id = this.id;
    return d3_selection_each(this, typeof value === "function" ? function(node, i, j) {
      node.__transition__[id].duration = Math.max(1, value.call(node, node.__data__, i, j));
    } : (value = Math.max(1, value), function(node) {
      node.__transition__[id].duration = value;
    }));
  };
  d3_transitionPrototype.each = function(type, listener) {
    var id = this.id;
    if (arguments.length < 2) {
      var inherit = d3_transitionInherit, inheritId = d3_transitionInheritId;
      d3_transitionInheritId = id;
      d3_selection_each(this, function(node, i, j) {
        d3_transitionInherit = node.__transition__[id];
        type.call(node, node.__data__, i, j);
      });
      d3_transitionInherit = inherit;
      d3_transitionInheritId = inheritId;
    } else {
      d3_selection_each(this, function(node) {
        var transition = node.__transition__[id];
        (transition.event || (transition.event = d3.dispatch("start", "end"))).on(type, listener);
      });
    }
    return this;
  };
  d3_transitionPrototype.transition = function() {
    var id0 = this.id, id1 = ++d3_transitionId, subgroups = [], subgroup, group, node, transition;
    for (var j = 0, m = this.length; j < m; j++) {
      subgroups.push(subgroup = []);
      for (var group = this[j], i = 0, n = group.length; i < n; i++) {
        if (node = group[i]) {
          transition = Object.create(node.__transition__[id0]);
          transition.delay += transition.duration;
          d3_transitionNode(node, i, id1, transition);
        }
        subgroup.push(node);
      }
    }
    return d3_transition(subgroups, id1);
  };
  function d3_transitionNode(node, i, id, inherit) {
    var lock = node.__transition__ || (node.__transition__ = {
      active: 0,
      count: 0
    }), transition = lock[id];
    if (!transition) {
      var time = inherit.time;
      transition = lock[id] = {
        tween: new d3_Map(),
        time: time,
        ease: inherit.ease,
        delay: inherit.delay,
        duration: inherit.duration
      };
      ++lock.count;
      d3.timer(function(elapsed) {
        var d = node.__data__, ease = transition.ease, delay = transition.delay, duration = transition.duration, timer = d3_timer_active, tweened = [];
        timer.t = delay + time;
        if (delay <= elapsed) return start(elapsed - delay);
        timer.c = start;
        function start(elapsed) {
          if (lock.active > id) return stop();
          lock.active = id;
          transition.event && transition.event.start.call(node, d, i);
          transition.tween.forEach(function(key, value) {
            if (value = value.call(node, d, i)) {
              tweened.push(value);
            }
          });
          d3.timer(function() {
            timer.c = tick(elapsed || 1) ? d3_true : tick;
            return 1;
          }, 0, time);
        }
        function tick(elapsed) {
          if (lock.active !== id) return stop();
          var t = elapsed / duration, e = ease(t), n = tweened.length;
          while (n > 0) {
            tweened[--n].call(node, e);
          }
          if (t >= 1) {
            transition.event && transition.event.end.call(node, d, i);
            return stop();
          }
        }
        function stop() {
          if (--lock.count) delete lock[id]; else delete node.__transition__;
          return 1;
        }
      }, 0, time);
    }
  }
  d3.svg.axis = function() {
    var scale = d3.scale.linear(), orient = d3_svg_axisDefaultOrient, innerTickSize = 6, outerTickSize = 6, tickPadding = 3, tickArguments_ = [ 10 ], tickValues = null, tickFormat_;
    function axis(g) {
      g.each(function() {
        var g = d3.select(this);
        var scale0 = this.__chart__ || scale, scale1 = this.__chart__ = scale.copy();
        var ticks = tickValues == null ? scale1.ticks ? scale1.ticks.apply(scale1, tickArguments_) : scale1.domain() : tickValues, tickFormat = tickFormat_ == null ? scale1.tickFormat ? scale1.tickFormat.apply(scale1, tickArguments_) : d3_identity : tickFormat_, tick = g.selectAll(".tick").data(ticks, scale1), tickEnter = tick.enter().insert("g", ".domain").attr("class", "tick").style("opacity", ε), tickExit = d3.transition(tick.exit()).style("opacity", ε).remove(), tickUpdate = d3.transition(tick).style("opacity", 1), tickTransform;
        var range = d3_scaleRange(scale1), path = g.selectAll(".domain").data([ 0 ]), pathUpdate = (path.enter().append("path").attr("class", "domain"), 
        d3.transition(path));
        tickEnter.append("line");
        tickEnter.append("text");
        var lineEnter = tickEnter.select("line"), lineUpdate = tickUpdate.select("line"), text = tick.select("text").text(tickFormat), textEnter = tickEnter.select("text"), textUpdate = tickUpdate.select("text");
        switch (orient) {
         case "bottom":
          {
            tickTransform = d3_svg_axisX;
            lineEnter.attr("y2", innerTickSize);
            textEnter.attr("y", Math.max(innerTickSize, 0) + tickPadding);
            lineUpdate.attr("x2", 0).attr("y2", innerTickSize);
            textUpdate.attr("x", 0).attr("y", Math.max(innerTickSize, 0) + tickPadding);
            text.attr("dy", ".71em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + outerTickSize + "V0H" + range[1] + "V" + outerTickSize);
            break;
          }

         case "top":
          {
            tickTransform = d3_svg_axisX;
            lineEnter.attr("y2", -innerTickSize);
            textEnter.attr("y", -(Math.max(innerTickSize, 0) + tickPadding));
            lineUpdate.attr("x2", 0).attr("y2", -innerTickSize);
            textUpdate.attr("x", 0).attr("y", -(Math.max(innerTickSize, 0) + tickPadding));
            text.attr("dy", "0em").style("text-anchor", "middle");
            pathUpdate.attr("d", "M" + range[0] + "," + -outerTickSize + "V0H" + range[1] + "V" + -outerTickSize);
            break;
          }

         case "left":
          {
            tickTransform = d3_svg_axisY;
            lineEnter.attr("x2", -innerTickSize);
            textEnter.attr("x", -(Math.max(innerTickSize, 0) + tickPadding));
            lineUpdate.attr("x2", -innerTickSize).attr("y2", 0);
            textUpdate.attr("x", -(Math.max(innerTickSize, 0) + tickPadding)).attr("y", 0);
            text.attr("dy", ".32em").style("text-anchor", "end");
            pathUpdate.attr("d", "M" + -outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + -outerTickSize);
            break;
          }

         case "right":
          {
            tickTransform = d3_svg_axisY;
            lineEnter.attr("x2", innerTickSize);
            textEnter.attr("x", Math.max(innerTickSize, 0) + tickPadding);
            lineUpdate.attr("x2", innerTickSize).attr("y2", 0);
            textUpdate.attr("x", Math.max(innerTickSize, 0) + tickPadding).attr("y", 0);
            text.attr("dy", ".32em").style("text-anchor", "start");
            pathUpdate.attr("d", "M" + outerTickSize + "," + range[0] + "H0V" + range[1] + "H" + outerTickSize);
            break;
          }
        }
        if (scale1.rangeBand) {
          var dx = scale1.rangeBand() / 2, x = function(d) {
            return scale1(d) + dx;
          };
          tickEnter.call(tickTransform, x);
          tickUpdate.call(tickTransform, x);
        } else {
          tickEnter.call(tickTransform, scale0);
          tickUpdate.call(tickTransform, scale1);
          tickExit.call(tickTransform, scale1);
        }
      });
    }
    axis.scale = function(x) {
      if (!arguments.length) return scale;
      scale = x;
      return axis;
    };
    axis.orient = function(x) {
      if (!arguments.length) return orient;
      orient = x in d3_svg_axisOrients ? x + "" : d3_svg_axisDefaultOrient;
      return axis;
    };
    axis.ticks = function() {
      if (!arguments.length) return tickArguments_;
      tickArguments_ = arguments;
      return axis;
    };
    axis.tickValues = function(x) {
      if (!arguments.length) return tickValues;
      tickValues = x;
      return axis;
    };
    axis.tickFormat = function(x) {
      if (!arguments.length) return tickFormat_;
      tickFormat_ = x;
      return axis;
    };
    axis.tickSize = function(x) {
      var n = arguments.length;
      if (!n) return innerTickSize;
      innerTickSize = +x;
      outerTickSize = +arguments[n - 1];
      return axis;
    };
    axis.innerTickSize = function(x) {
      if (!arguments.length) return innerTickSize;
      innerTickSize = +x;
      return axis;
    };
    axis.outerTickSize = function(x) {
      if (!arguments.length) return outerTickSize;
      outerTickSize = +x;
      return axis;
    };
    axis.tickPadding = function(x) {
      if (!arguments.length) return tickPadding;
      tickPadding = +x;
      return axis;
    };
    axis.tickSubdivide = function() {
      return arguments.length && axis;
    };
    return axis;
  };
  var d3_svg_axisDefaultOrient = "bottom", d3_svg_axisOrients = {
    top: 1,
    right: 1,
    bottom: 1,
    left: 1
  };
  function d3_svg_axisX(selection, x) {
    selection.attr("transform", function(d) {
      return "translate(" + x(d) + ",0)";
    });
  }
  function d3_svg_axisY(selection, y) {
    selection.attr("transform", function(d) {
      return "translate(0," + y(d) + ")";
    });
  }
  d3.svg.brush = function() {
    var event = d3_eventDispatch(brush, "brushstart", "brush", "brushend"), x = null, y = null, xExtent = [ 0, 0 ], yExtent = [ 0, 0 ], xExtentDomain, yExtentDomain, xClamp = true, yClamp = true, resizes = d3_svg_brushResizes[0];
    function brush(g) {
      g.each(function() {
        var g = d3.select(this).style("pointer-events", "all").style("-webkit-tap-highlight-color", "rgba(0,0,0,0)").on("mousedown.brush", brushstart).on("touchstart.brush", brushstart);
        var background = g.selectAll(".background").data([ 0 ]);
        background.enter().append("rect").attr("class", "background").style("visibility", "hidden").style("cursor", "crosshair");
        g.selectAll(".extent").data([ 0 ]).enter().append("rect").attr("class", "extent").style("cursor", "move");
        var resize = g.selectAll(".resize").data(resizes, d3_identity);
        resize.exit().remove();
        resize.enter().append("g").attr("class", function(d) {
          return "resize " + d;
        }).style("cursor", function(d) {
          return d3_svg_brushCursor[d];
        }).append("rect").attr("x", function(d) {
          return /[ew]$/.test(d) ? -3 : null;
        }).attr("y", function(d) {
          return /^[ns]/.test(d) ? -3 : null;
        }).attr("width", 6).attr("height", 6).style("visibility", "hidden");
        resize.style("display", brush.empty() ? "none" : null);
        var gUpdate = d3.transition(g), backgroundUpdate = d3.transition(background), range;
        if (x) {
          range = d3_scaleRange(x);
          backgroundUpdate.attr("x", range[0]).attr("width", range[1] - range[0]);
          redrawX(gUpdate);
        }
        if (y) {
          range = d3_scaleRange(y);
          backgroundUpdate.attr("y", range[0]).attr("height", range[1] - range[0]);
          redrawY(gUpdate);
        }
        redraw(gUpdate);
      });
    }
    brush.event = function(g) {
      g.each(function() {
        var event_ = event.of(this, arguments), extent1 = {
          x: xExtent,
          y: yExtent,
          i: xExtentDomain,
          j: yExtentDomain
        }, extent0 = this.__chart__ || extent1;
        this.__chart__ = extent1;
        if (d3_transitionInheritId) {
          d3.select(this).transition().each("start.brush", function() {
            xExtentDomain = extent0.i;
            yExtentDomain = extent0.j;
            xExtent = extent0.x;
            yExtent = extent0.y;
            event_({
              type: "brushstart"
            });
          }).tween("brush:brush", function() {
            var xi = d3_interpolateArray(xExtent, extent1.x), yi = d3_interpolateArray(yExtent, extent1.y);
            xExtentDomain = yExtentDomain = null;
            return function(t) {
              xExtent = extent1.x = xi(t);
              yExtent = extent1.y = yi(t);
              event_({
                type: "brush",
                mode: "resize"
              });
            };
          }).each("end.brush", function() {
            xExtentDomain = extent1.i;
            yExtentDomain = extent1.j;
            event_({
              type: "brush",
              mode: "resize"
            });
            event_({
              type: "brushend"
            });
          });
        } else {
          event_({
            type: "brushstart"
          });
          event_({
            type: "brush",
            mode: "resize"
          });
          event_({
            type: "brushend"
          });
        }
      });
    };
    function redraw(g) {
      g.selectAll(".resize").attr("transform", function(d) {
        return "translate(" + xExtent[+/e$/.test(d)] + "," + yExtent[+/^s/.test(d)] + ")";
      });
    }
    function redrawX(g) {
      g.select(".extent").attr("x", xExtent[0]);
      g.selectAll(".extent,.n>rect,.s>rect").attr("width", xExtent[1] - xExtent[0]);
    }
    function redrawY(g) {
      g.select(".extent").attr("y", yExtent[0]);
      g.selectAll(".extent,.e>rect,.w>rect").attr("height", yExtent[1] - yExtent[0]);
    }
    function brushstart() {
      var target = this, eventTarget = d3.select(d3.event.target), event_ = event.of(target, arguments), g = d3.select(target), resizing = eventTarget.datum(), resizingX = !/^(n|s)$/.test(resizing) && x, resizingY = !/^(e|w)$/.test(resizing) && y, dragging = eventTarget.classed("extent"), dragRestore = d3_event_dragSuppress(), center, origin = d3.mouse(target), offset;
      var w = d3.select(d3_window).on("keydown.brush", keydown).on("keyup.brush", keyup);
      if (d3.event.changedTouches) {
        w.on("touchmove.brush", brushmove).on("touchend.brush", brushend);
      } else {
        w.on("mousemove.brush", brushmove).on("mouseup.brush", brushend);
      }
      g.interrupt().selectAll("*").interrupt();
      if (dragging) {
        origin[0] = xExtent[0] - origin[0];
        origin[1] = yExtent[0] - origin[1];
      } else if (resizing) {
        var ex = +/w$/.test(resizing), ey = +/^n/.test(resizing);
        offset = [ xExtent[1 - ex] - origin[0], yExtent[1 - ey] - origin[1] ];
        origin[0] = xExtent[ex];
        origin[1] = yExtent[ey];
      } else if (d3.event.altKey) center = origin.slice();
      g.style("pointer-events", "none").selectAll(".resize").style("display", null);
      d3.select("body").style("cursor", eventTarget.style("cursor"));
      event_({
        type: "brushstart"
      });
      brushmove();
      function keydown() {
        if (d3.event.keyCode == 32) {
          if (!dragging) {
            center = null;
            origin[0] -= xExtent[1];
            origin[1] -= yExtent[1];
            dragging = 2;
          }
          d3_eventPreventDefault();
        }
      }
      function keyup() {
        if (d3.event.keyCode == 32 && dragging == 2) {
          origin[0] += xExtent[1];
          origin[1] += yExtent[1];
          dragging = 0;
          d3_eventPreventDefault();
        }
      }
      function brushmove() {
        var point = d3.mouse(target), moved = false;
        if (offset) {
          point[0] += offset[0];
          point[1] += offset[1];
        }
        if (!dragging) {
          if (d3.event.altKey) {
            if (!center) center = [ (xExtent[0] + xExtent[1]) / 2, (yExtent[0] + yExtent[1]) / 2 ];
            origin[0] = xExtent[+(point[0] < center[0])];
            origin[1] = yExtent[+(point[1] < center[1])];
          } else center = null;
        }
        if (resizingX && move1(point, x, 0)) {
          redrawX(g);
          moved = true;
        }
        if (resizingY && move1(point, y, 1)) {
          redrawY(g);
          moved = true;
        }
        if (moved) {
          redraw(g);
          event_({
            type: "brush",
            mode: dragging ? "move" : "resize"
          });
        }
      }
      function move1(point, scale, i) {
        var range = d3_scaleRange(scale), r0 = range[0], r1 = range[1], position = origin[i], extent = i ? yExtent : xExtent, size = extent[1] - extent[0], min, max;
        if (dragging) {
          r0 -= position;
          r1 -= size + position;
        }
        min = (i ? yClamp : xClamp) ? Math.max(r0, Math.min(r1, point[i])) : point[i];
        if (dragging) {
          max = (min += position) + size;
        } else {
          if (center) position = Math.max(r0, Math.min(r1, 2 * center[i] - min));
          if (position < min) {
            max = min;
            min = position;
          } else {
            max = position;
          }
        }
        if (extent[0] != min || extent[1] != max) {
          if (i) yExtentDomain = null; else xExtentDomain = null;
          extent[0] = min;
          extent[1] = max;
          return true;
        }
      }
      function brushend() {
        brushmove();
        g.style("pointer-events", "all").selectAll(".resize").style("display", brush.empty() ? "none" : null);
        d3.select("body").style("cursor", null);
        w.on("mousemove.brush", null).on("mouseup.brush", null).on("touchmove.brush", null).on("touchend.brush", null).on("keydown.brush", null).on("keyup.brush", null);
        dragRestore();
        event_({
          type: "brushend"
        });
      }
    }
    brush.x = function(z) {
      if (!arguments.length) return x;
      x = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.y = function(z) {
      if (!arguments.length) return y;
      y = z;
      resizes = d3_svg_brushResizes[!x << 1 | !y];
      return brush;
    };
    brush.clamp = function(z) {
      if (!arguments.length) return x && y ? [ xClamp, yClamp ] : x ? xClamp : y ? yClamp : null;
      if (x && y) xClamp = !!z[0], yClamp = !!z[1]; else if (x) xClamp = !!z; else if (y) yClamp = !!z;
      return brush;
    };
    brush.extent = function(z) {
      var x0, x1, y0, y1, t;
      if (!arguments.length) {
        if (x) {
          if (xExtentDomain) {
            x0 = xExtentDomain[0], x1 = xExtentDomain[1];
          } else {
            x0 = xExtent[0], x1 = xExtent[1];
            if (x.invert) x0 = x.invert(x0), x1 = x.invert(x1);
            if (x1 < x0) t = x0, x0 = x1, x1 = t;
          }
        }
        if (y) {
          if (yExtentDomain) {
            y0 = yExtentDomain[0], y1 = yExtentDomain[1];
          } else {
            y0 = yExtent[0], y1 = yExtent[1];
            if (y.invert) y0 = y.invert(y0), y1 = y.invert(y1);
            if (y1 < y0) t = y0, y0 = y1, y1 = t;
          }
        }
        return x && y ? [ [ x0, y0 ], [ x1, y1 ] ] : x ? [ x0, x1 ] : y && [ y0, y1 ];
      }
      if (x) {
        x0 = z[0], x1 = z[1];
        if (y) x0 = x0[0], x1 = x1[0];
        xExtentDomain = [ x0, x1 ];
        if (x.invert) x0 = x(x0), x1 = x(x1);
        if (x1 < x0) t = x0, x0 = x1, x1 = t;
        if (x0 != xExtent[0] || x1 != xExtent[1]) xExtent = [ x0, x1 ];
      }
      if (y) {
        y0 = z[0], y1 = z[1];
        if (x) y0 = y0[1], y1 = y1[1];
        yExtentDomain = [ y0, y1 ];
        if (y.invert) y0 = y(y0), y1 = y(y1);
        if (y1 < y0) t = y0, y0 = y1, y1 = t;
        if (y0 != yExtent[0] || y1 != yExtent[1]) yExtent = [ y0, y1 ];
      }
      return brush;
    };
    brush.clear = function() {
      if (!brush.empty()) {
        xExtent = [ 0, 0 ], yExtent = [ 0, 0 ];
        xExtentDomain = yExtentDomain = null;
      }
      return brush;
    };
    brush.empty = function() {
      return !!x && xExtent[0] == xExtent[1] || !!y && yExtent[0] == yExtent[1];
    };
    return d3.rebind(brush, event, "on");
  };
  var d3_svg_brushCursor = {
    n: "ns-resize",
    e: "ew-resize",
    s: "ns-resize",
    w: "ew-resize",
    nw: "nwse-resize",
    ne: "nesw-resize",
    se: "nwse-resize",
    sw: "nesw-resize"
  };
  var d3_svg_brushResizes = [ [ "n", "e", "s", "w", "nw", "ne", "se", "sw" ], [ "e", "w" ], [ "n", "s" ], [] ];
  var d3_time = d3.time = {}, d3_date = Date, d3_time_daySymbols = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
  function d3_date_utc() {
    this._ = new Date(arguments.length > 1 ? Date.UTC.apply(this, arguments) : arguments[0]);
  }
  d3_date_utc.prototype = {
    getDate: function() {
      return this._.getUTCDate();
    },
    getDay: function() {
      return this._.getUTCDay();
    },
    getFullYear: function() {
      return this._.getUTCFullYear();
    },
    getHours: function() {
      return this._.getUTCHours();
    },
    getMilliseconds: function() {
      return this._.getUTCMilliseconds();
    },
    getMinutes: function() {
      return this._.getUTCMinutes();
    },
    getMonth: function() {
      return this._.getUTCMonth();
    },
    getSeconds: function() {
      return this._.getUTCSeconds();
    },
    getTime: function() {
      return this._.getTime();
    },
    getTimezoneOffset: function() {
      return 0;
    },
    valueOf: function() {
      return this._.valueOf();
    },
    setDate: function() {
      d3_time_prototype.setUTCDate.apply(this._, arguments);
    },
    setDay: function() {
      d3_time_prototype.setUTCDay.apply(this._, arguments);
    },
    setFullYear: function() {
      d3_time_prototype.setUTCFullYear.apply(this._, arguments);
    },
    setHours: function() {
      d3_time_prototype.setUTCHours.apply(this._, arguments);
    },
    setMilliseconds: function() {
      d3_time_prototype.setUTCMilliseconds.apply(this._, arguments);
    },
    setMinutes: function() {
      d3_time_prototype.setUTCMinutes.apply(this._, arguments);
    },
    setMonth: function() {
      d3_time_prototype.setUTCMonth.apply(this._, arguments);
    },
    setSeconds: function() {
      d3_time_prototype.setUTCSeconds.apply(this._, arguments);
    },
    setTime: function() {
      d3_time_prototype.setTime.apply(this._, arguments);
    }
  };
  var d3_time_prototype = Date.prototype;
  var d3_time_formatDateTime = "%a %b %e %X %Y", d3_time_formatDate = "%m/%d/%Y", d3_time_formatTime = "%H:%M:%S";
  var d3_time_days = [ "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ], d3_time_dayAbbreviations = [ "Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat" ], d3_time_months = [ "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December" ], d3_time_monthAbbreviations = [ "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec" ];
  function d3_time_interval(local, step, number) {
    function round(date) {
      var d0 = local(date), d1 = offset(d0, 1);
      return date - d0 < d1 - date ? d0 : d1;
    }
    function ceil(date) {
      step(date = local(new d3_date(date - 1)), 1);
      return date;
    }
    function offset(date, k) {
      step(date = new d3_date(+date), k);
      return date;
    }
    function range(t0, t1, dt) {
      var time = ceil(t0), times = [];
      if (dt > 1) {
        while (time < t1) {
          if (!(number(time) % dt)) times.push(new Date(+time));
          step(time, 1);
        }
      } else {
        while (time < t1) times.push(new Date(+time)), step(time, 1);
      }
      return times;
    }
    function range_utc(t0, t1, dt) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = t0;
        return range(utc, t1, dt);
      } finally {
        d3_date = Date;
      }
    }
    local.floor = local;
    local.round = round;
    local.ceil = ceil;
    local.offset = offset;
    local.range = range;
    var utc = local.utc = d3_time_interval_utc(local);
    utc.floor = utc;
    utc.round = d3_time_interval_utc(round);
    utc.ceil = d3_time_interval_utc(ceil);
    utc.offset = d3_time_interval_utc(offset);
    utc.range = range_utc;
    return local;
  }
  function d3_time_interval_utc(method) {
    return function(date, k) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date_utc();
        utc._ = date;
        return method(utc, k)._;
      } finally {
        d3_date = Date;
      }
    };
  }
  d3_time.year = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setMonth(0, 1);
    return date;
  }, function(date, offset) {
    date.setFullYear(date.getFullYear() + offset);
  }, function(date) {
    return date.getFullYear();
  });
  d3_time.years = d3_time.year.range;
  d3_time.years.utc = d3_time.year.utc.range;
  d3_time.day = d3_time_interval(function(date) {
    var day = new d3_date(2e3, 0);
    day.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    return day;
  }, function(date, offset) {
    date.setDate(date.getDate() + offset);
  }, function(date) {
    return date.getDate() - 1;
  });
  d3_time.days = d3_time.day.range;
  d3_time.days.utc = d3_time.day.utc.range;
  d3_time.dayOfYear = function(date) {
    var year = d3_time.year(date);
    return Math.floor((date - year - (date.getTimezoneOffset() - year.getTimezoneOffset()) * 6e4) / 864e5);
  };
  d3_time_daySymbols.forEach(function(day, i) {
    day = day.toLowerCase();
    i = 7 - i;
    var interval = d3_time[day] = d3_time_interval(function(date) {
      (date = d3_time.day(date)).setDate(date.getDate() - (date.getDay() + i) % 7);
      return date;
    }, function(date, offset) {
      date.setDate(date.getDate() + Math.floor(offset) * 7);
    }, function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7) - (day !== i);
    });
    d3_time[day + "s"] = interval.range;
    d3_time[day + "s"].utc = interval.utc.range;
    d3_time[day + "OfYear"] = function(date) {
      var day = d3_time.year(date).getDay();
      return Math.floor((d3_time.dayOfYear(date) + (day + i) % 7) / 7);
    };
  });
  d3_time.week = d3_time.sunday;
  d3_time.weeks = d3_time.sunday.range;
  d3_time.weeks.utc = d3_time.sunday.utc.range;
  d3_time.weekOfYear = d3_time.sundayOfYear;
  d3_time.format = d3_time_format;
  function d3_time_format(template) {
    var n = template.length;
    function format(date) {
      var string = [], i = -1, j = 0, c, p, f;
      while (++i < n) {
        if (template.charCodeAt(i) === 37) {
          string.push(template.substring(j, i));
          if ((p = d3_time_formatPads[c = template.charAt(++i)]) != null) c = template.charAt(++i);
          if (f = d3_time_formats[c]) c = f(date, p == null ? c === "e" ? " " : "0" : p);
          string.push(c);
          j = i + 1;
        }
      }
      string.push(template.substring(j, i));
      return string.join("");
    }
    format.parse = function(string) {
      var d = {
        y: 1900,
        m: 0,
        d: 1,
        H: 0,
        M: 0,
        S: 0,
        L: 0,
        Z: null
      }, i = d3_time_parse(d, template, string, 0);
      if (i != string.length) return null;
      if ("p" in d) d.H = d.H % 12 + d.p * 12;
      var localZ = d.Z != null && d3_date !== d3_date_utc, date = new (localZ ? d3_date_utc : d3_date)();
      if ("j" in d) date.setFullYear(d.y, 0, d.j); else if ("w" in d && ("W" in d || "U" in d)) {
        date.setFullYear(d.y, 0, 1);
        date.setFullYear(d.y, 0, "W" in d ? (d.w + 6) % 7 + d.W * 7 - (date.getDay() + 5) % 7 : d.w + d.U * 7 - (date.getDay() + 6) % 7);
      } else date.setFullYear(d.y, d.m, d.d);
      date.setHours(d.H + Math.floor(d.Z / 100), d.M + d.Z % 100, d.S, d.L);
      return localZ ? date._ : date;
    };
    format.toString = function() {
      return template;
    };
    return format;
  }
  function d3_time_parse(date, template, string, j) {
    var c, p, t, i = 0, n = template.length, m = string.length;
    while (i < n) {
      if (j >= m) return -1;
      c = template.charCodeAt(i++);
      if (c === 37) {
        t = template.charAt(i++);
        p = d3_time_parsers[t in d3_time_formatPads ? template.charAt(i++) : t];
        if (!p || (j = p(date, string, j)) < 0) return -1;
      } else if (c != string.charCodeAt(j++)) {
        return -1;
      }
    }
    return j;
  }
  function d3_time_formatRe(names) {
    return new RegExp("^(?:" + names.map(d3.requote).join("|") + ")", "i");
  }
  function d3_time_formatLookup(names) {
    var map = new d3_Map(), i = -1, n = names.length;
    while (++i < n) map.set(names[i].toLowerCase(), i);
    return map;
  }
  function d3_time_formatPad(value, fill, width) {
    var sign = value < 0 ? "-" : "", string = (sign ? -value : value) + "", length = string.length;
    return sign + (length < width ? new Array(width - length + 1).join(fill) + string : string);
  }
  var d3_time_dayRe = d3_time_formatRe(d3_time_days), d3_time_dayLookup = d3_time_formatLookup(d3_time_days), d3_time_dayAbbrevRe = d3_time_formatRe(d3_time_dayAbbreviations), d3_time_dayAbbrevLookup = d3_time_formatLookup(d3_time_dayAbbreviations), d3_time_monthRe = d3_time_formatRe(d3_time_months), d3_time_monthLookup = d3_time_formatLookup(d3_time_months), d3_time_monthAbbrevRe = d3_time_formatRe(d3_time_monthAbbreviations), d3_time_monthAbbrevLookup = d3_time_formatLookup(d3_time_monthAbbreviations), d3_time_percentRe = /^%/;
  var d3_time_formatPads = {
    "-": "",
    _: " ",
    "0": "0"
  };
  var d3_time_formats = {
    a: function(d) {
      return d3_time_dayAbbreviations[d.getDay()];
    },
    A: function(d) {
      return d3_time_days[d.getDay()];
    },
    b: function(d) {
      return d3_time_monthAbbreviations[d.getMonth()];
    },
    B: function(d) {
      return d3_time_months[d.getMonth()];
    },
    c: d3_time_format(d3_time_formatDateTime),
    d: function(d, p) {
      return d3_time_formatPad(d.getDate(), p, 2);
    },
    e: function(d, p) {
      return d3_time_formatPad(d.getDate(), p, 2);
    },
    H: function(d, p) {
      return d3_time_formatPad(d.getHours(), p, 2);
    },
    I: function(d, p) {
      return d3_time_formatPad(d.getHours() % 12 || 12, p, 2);
    },
    j: function(d, p) {
      return d3_time_formatPad(1 + d3_time.dayOfYear(d), p, 3);
    },
    L: function(d, p) {
      return d3_time_formatPad(d.getMilliseconds(), p, 3);
    },
    m: function(d, p) {
      return d3_time_formatPad(d.getMonth() + 1, p, 2);
    },
    M: function(d, p) {
      return d3_time_formatPad(d.getMinutes(), p, 2);
    },
    p: function(d) {
      return d.getHours() >= 12 ? "PM" : "AM";
    },
    S: function(d, p) {
      return d3_time_formatPad(d.getSeconds(), p, 2);
    },
    U: function(d, p) {
      return d3_time_formatPad(d3_time.sundayOfYear(d), p, 2);
    },
    w: function(d) {
      return d.getDay();
    },
    W: function(d, p) {
      return d3_time_formatPad(d3_time.mondayOfYear(d), p, 2);
    },
    x: d3_time_format(d3_time_formatDate),
    X: d3_time_format(d3_time_formatTime),
    y: function(d, p) {
      return d3_time_formatPad(d.getFullYear() % 100, p, 2);
    },
    Y: function(d, p) {
      return d3_time_formatPad(d.getFullYear() % 1e4, p, 4);
    },
    Z: d3_time_zone,
    "%": function() {
      return "%";
    }
  };
  var d3_time_parsers = {
    a: d3_time_parseWeekdayAbbrev,
    A: d3_time_parseWeekday,
    b: d3_time_parseMonthAbbrev,
    B: d3_time_parseMonth,
    c: d3_time_parseLocaleFull,
    d: d3_time_parseDay,
    e: d3_time_parseDay,
    H: d3_time_parseHour24,
    I: d3_time_parseHour24,
    j: d3_time_parseDayOfYear,
    L: d3_time_parseMilliseconds,
    m: d3_time_parseMonthNumber,
    M: d3_time_parseMinutes,
    p: d3_time_parseAmPm,
    S: d3_time_parseSeconds,
    U: d3_time_parseWeekNumberSunday,
    w: d3_time_parseWeekdayNumber,
    W: d3_time_parseWeekNumberMonday,
    x: d3_time_parseLocaleDate,
    X: d3_time_parseLocaleTime,
    y: d3_time_parseYear,
    Y: d3_time_parseFullYear,
    Z: d3_time_parseZone,
    "%": d3_time_parseLiteralPercent
  };
  function d3_time_parseWeekdayAbbrev(date, string, i) {
    d3_time_dayAbbrevRe.lastIndex = 0;
    var n = d3_time_dayAbbrevRe.exec(string.substring(i));
    return n ? (date.w = d3_time_dayAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function d3_time_parseWeekday(date, string, i) {
    d3_time_dayRe.lastIndex = 0;
    var n = d3_time_dayRe.exec(string.substring(i));
    return n ? (date.w = d3_time_dayLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function d3_time_parseWeekdayNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 1));
    return n ? (date.w = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberSunday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i));
    return n ? (date.U = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseWeekNumberMonday(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i));
    return n ? (date.W = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMonthAbbrev(date, string, i) {
    d3_time_monthAbbrevRe.lastIndex = 0;
    var n = d3_time_monthAbbrevRe.exec(string.substring(i));
    return n ? (date.m = d3_time_monthAbbrevLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function d3_time_parseMonth(date, string, i) {
    d3_time_monthRe.lastIndex = 0;
    var n = d3_time_monthRe.exec(string.substring(i));
    return n ? (date.m = d3_time_monthLookup.get(n[0].toLowerCase()), i + n[0].length) : -1;
  }
  function d3_time_parseLocaleFull(date, string, i) {
    return d3_time_parse(date, d3_time_formats.c.toString(), string, i);
  }
  function d3_time_parseLocaleDate(date, string, i) {
    return d3_time_parse(date, d3_time_formats.x.toString(), string, i);
  }
  function d3_time_parseLocaleTime(date, string, i) {
    return d3_time_parse(date, d3_time_formats.X.toString(), string, i);
  }
  function d3_time_parseFullYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 4));
    return n ? (date.y = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.y = d3_time_expandYear(+n[0]), i + n[0].length) : -1;
  }
  function d3_time_parseZone(date, string, i) {
    return /^[+-]\d{4}$/.test(string = string.substring(i, i + 5)) ? (date.Z = +string, 
    i + 5) : -1;
  }
  function d3_time_expandYear(d) {
    return d + (d > 68 ? 1900 : 2e3);
  }
  function d3_time_parseMonthNumber(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.m = n[0] - 1, i + n[0].length) : -1;
  }
  function d3_time_parseDay(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.d = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseDayOfYear(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 3));
    return n ? (date.j = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseHour24(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.H = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMinutes(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.M = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseSeconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 2));
    return n ? (date.S = +n[0], i + n[0].length) : -1;
  }
  function d3_time_parseMilliseconds(date, string, i) {
    d3_time_numberRe.lastIndex = 0;
    var n = d3_time_numberRe.exec(string.substring(i, i + 3));
    return n ? (date.L = +n[0], i + n[0].length) : -1;
  }
  var d3_time_numberRe = /^\s*\d+/;
  function d3_time_parseAmPm(date, string, i) {
    var n = d3_time_amPmLookup.get(string.substring(i, i += 2).toLowerCase());
    return n == null ? -1 : (date.p = n, i);
  }
  var d3_time_amPmLookup = d3.map({
    am: 0,
    pm: 1
  });
  function d3_time_zone(d) {
    var z = d.getTimezoneOffset(), zs = z > 0 ? "-" : "+", zh = ~~(abs(z) / 60), zm = abs(z) % 60;
    return zs + d3_time_formatPad(zh, "0", 2) + d3_time_formatPad(zm, "0", 2);
  }
  function d3_time_parseLiteralPercent(date, string, i) {
    d3_time_percentRe.lastIndex = 0;
    var n = d3_time_percentRe.exec(string.substring(i, i + 1));
    return n ? i + n[0].length : -1;
  }
  d3_time_format.utc = d3_time_formatUtc;
  function d3_time_formatUtc(template) {
    var local = d3_time_format(template);
    function format(date) {
      try {
        d3_date = d3_date_utc;
        var utc = new d3_date();
        utc._ = date;
        return local(utc);
      } finally {
        d3_date = Date;
      }
    }
    format.parse = function(string) {
      try {
        d3_date = d3_date_utc;
        var date = local.parse(string);
        return date && date._;
      } finally {
        d3_date = Date;
      }
    };
    format.toString = local.toString;
    return format;
  }
  var d3_time_formatIso = d3_time_formatUtc("%Y-%m-%dT%H:%M:%S.%LZ");
  d3_time_format.iso = Date.prototype.toISOString && +new Date("2000-01-01T00:00:00.000Z") ? d3_time_formatIsoNative : d3_time_formatIso;
  function d3_time_formatIsoNative(date) {
    return date.toISOString();
  }
  d3_time_formatIsoNative.parse = function(string) {
    var date = new Date(string);
    return isNaN(date) ? null : date;
  };
  d3_time_formatIsoNative.toString = d3_time_formatIso.toString;
  d3_time.second = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 1e3) * 1e3);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 1e3);
  }, function(date) {
    return date.getSeconds();
  });
  d3_time.seconds = d3_time.second.range;
  d3_time.seconds.utc = d3_time.second.utc.range;
  d3_time.minute = d3_time_interval(function(date) {
    return new d3_date(Math.floor(date / 6e4) * 6e4);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 6e4);
  }, function(date) {
    return date.getMinutes();
  });
  d3_time.minutes = d3_time.minute.range;
  d3_time.minutes.utc = d3_time.minute.utc.range;
  d3_time.hour = d3_time_interval(function(date) {
    var timezone = date.getTimezoneOffset() / 60;
    return new d3_date((Math.floor(date / 36e5 - timezone) + timezone) * 36e5);
  }, function(date, offset) {
    date.setTime(date.getTime() + Math.floor(offset) * 36e5);
  }, function(date) {
    return date.getHours();
  });
  d3_time.hours = d3_time.hour.range;
  d3_time.hours.utc = d3_time.hour.utc.range;
  d3_time.month = d3_time_interval(function(date) {
    date = d3_time.day(date);
    date.setDate(1);
    return date;
  }, function(date, offset) {
    date.setMonth(date.getMonth() + offset);
  }, function(date) {
    return date.getMonth();
  });
  d3_time.months = d3_time.month.range;
  d3_time.months.utc = d3_time.month.utc.range;
  function d3_time_scale(linear, methods, format) {
    function scale(x) {
      return linear(x);
    }
    scale.invert = function(x) {
      return d3_time_scaleDate(linear.invert(x));
    };
    scale.domain = function(x) {
      if (!arguments.length) return linear.domain().map(d3_time_scaleDate);
      linear.domain(x);
      return scale;
    };
    function tickMethod(extent, count) {
      var span = extent[1] - extent[0], target = span / count, i = d3.bisect(d3_time_scaleSteps, target);
      return i == d3_time_scaleSteps.length ? [ methods.year, d3_scale_linearTickRange(extent.map(function(d) {
        return d / 31536e6;
      }), count)[2] ] : !i ? [ d3_time_scaleMilliseconds, d3_scale_linearTickRange(extent, count)[2] ] : methods[target / d3_time_scaleSteps[i - 1] < d3_time_scaleSteps[i] / target ? i - 1 : i];
    }
    scale.nice = function(interval, skip) {
      var domain = scale.domain(), extent = d3_scaleExtent(domain), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" && tickMethod(extent, interval);
      if (method) interval = method[0], skip = method[1];
      function skipped(date) {
        return !isNaN(date) && !interval.range(date, d3_time_scaleDate(+date + 1), skip).length;
      }
      return scale.domain(d3_scale_nice(domain, skip > 1 ? {
        floor: function(date) {
          while (skipped(date = interval.floor(date))) date = d3_time_scaleDate(date - 1);
          return date;
        },
        ceil: function(date) {
          while (skipped(date = interval.ceil(date))) date = d3_time_scaleDate(+date + 1);
          return date;
        }
      } : interval));
    };
    scale.ticks = function(interval, skip) {
      var extent = d3_scaleExtent(scale.domain()), method = interval == null ? tickMethod(extent, 10) : typeof interval === "number" ? tickMethod(extent, interval) : !interval.range && [ {
        range: interval
      }, skip ];
      if (method) interval = method[0], skip = method[1];
      return interval.range(extent[0], d3_time_scaleDate(+extent[1] + 1), skip < 1 ? 1 : skip);
    };
    scale.tickFormat = function() {
      return format;
    };
    scale.copy = function() {
      return d3_time_scale(linear.copy(), methods, format);
    };
    return d3_scale_linearRebind(scale, linear);
  }
  function d3_time_scaleDate(t) {
    return new Date(t);
  }
  function d3_time_scaleFormat(formats) {
    return function(date) {
      var i = formats.length - 1, f = formats[i];
      while (!f[1](date)) f = formats[--i];
      return f[0](date);
    };
  }
  var d3_time_scaleSteps = [ 1e3, 5e3, 15e3, 3e4, 6e4, 3e5, 9e5, 18e5, 36e5, 108e5, 216e5, 432e5, 864e5, 1728e5, 6048e5, 2592e6, 7776e6, 31536e6 ];
  var d3_time_scaleLocalMethods = [ [ d3_time.second, 1 ], [ d3_time.second, 5 ], [ d3_time.second, 15 ], [ d3_time.second, 30 ], [ d3_time.minute, 1 ], [ d3_time.minute, 5 ], [ d3_time.minute, 15 ], [ d3_time.minute, 30 ], [ d3_time.hour, 1 ], [ d3_time.hour, 3 ], [ d3_time.hour, 6 ], [ d3_time.hour, 12 ], [ d3_time.day, 1 ], [ d3_time.day, 2 ], [ d3_time.week, 1 ], [ d3_time.month, 1 ], [ d3_time.month, 3 ], [ d3_time.year, 1 ] ];
  var d3_time_scaleLocalFormats = [ [ d3_time_format("%Y"), d3_true ], [ d3_time_format("%B"), function(d) {
    return d.getMonth();
  } ], [ d3_time_format("%b %d"), function(d) {
    return d.getDate() != 1;
  } ], [ d3_time_format("%a %d"), function(d) {
    return d.getDay() && d.getDate() != 1;
  } ], [ d3_time_format("%I %p"), function(d) {
    return d.getHours();
  } ], [ d3_time_format("%I:%M"), function(d) {
    return d.getMinutes();
  } ], [ d3_time_format(":%S"), function(d) {
    return d.getSeconds();
  } ], [ d3_time_format(".%L"), function(d) {
    return d.getMilliseconds();
  } ] ];
  var d3_time_scaleLocalFormat = d3_time_scaleFormat(d3_time_scaleLocalFormats);
  d3_time_scaleLocalMethods.year = d3_time.year;
  d3_time.scale = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleLocalMethods, d3_time_scaleLocalFormat);
  };
  var d3_time_scaleMilliseconds = {
    range: function(start, stop, step) {
      return d3.range(+start, +stop, step).map(d3_time_scaleDate);
    }
  };
  var d3_time_scaleUTCMethods = d3_time_scaleLocalMethods.map(function(m) {
    return [ m[0].utc, m[1] ];
  });
  var d3_time_scaleUTCFormats = [ [ d3_time_formatUtc("%Y"), d3_true ], [ d3_time_formatUtc("%B"), function(d) {
    return d.getUTCMonth();
  } ], [ d3_time_formatUtc("%b %d"), function(d) {
    return d.getUTCDate() != 1;
  } ], [ d3_time_formatUtc("%a %d"), function(d) {
    return d.getUTCDay() && d.getUTCDate() != 1;
  } ], [ d3_time_formatUtc("%I %p"), function(d) {
    return d.getUTCHours();
  } ], [ d3_time_formatUtc("%I:%M"), function(d) {
    return d.getUTCMinutes();
  } ], [ d3_time_formatUtc(":%S"), function(d) {
    return d.getUTCSeconds();
  } ], [ d3_time_formatUtc(".%L"), function(d) {
    return d.getUTCMilliseconds();
  } ] ];
  var d3_time_scaleUTCFormat = d3_time_scaleFormat(d3_time_scaleUTCFormats);
  d3_time_scaleUTCMethods.year = d3_time.year.utc;
  d3_time.scale.utc = function() {
    return d3_time_scale(d3.scale.linear(), d3_time_scaleUTCMethods, d3_time_scaleUTCFormat);
  };
  d3.text = d3_xhrType(function(request) {
    return request.responseText;
  });
  d3.json = function(url, callback) {
    return d3_xhr(url, "application/json", d3_json, callback);
  };
  function d3_json(request) {
    return JSON.parse(request.responseText);
  }
  d3.html = function(url, callback) {
    return d3_xhr(url, "text/html", d3_html, callback);
  };
  function d3_html(request) {
    var range = d3_document.createRange();
    range.selectNode(d3_document.body);
    return range.createContextualFragment(request.responseText);
  }
  d3.xml = d3_xhrType(function(request) {
    return request.responseXML;
  });
  return d3;
}();
d3=function(){function n(n){return null!=n&&!isNaN(n)}function t(n){return n.length}function e(n){for(var t=1;n*t%1;)t*=10;return t}function r(n,t){try{for(var e in t)Object.defineProperty(n.prototype,e,{value:t[e],enumerable:!1})}catch(r){n.prototype=t}}function u(){}function i(){}function o(n,t,e){return function(){var r=e.apply(t,arguments);return r===t?n:r}}function a(n,t){if(t in n)return t;t=t.charAt(0).toUpperCase()+t.substring(1);for(var e=0,r=aa.length;r>e;++e){var u=aa[e]+t;if(u in n)return u}}function c(){}function s(){}function l(n){function t(){for(var t,r=e,u=-1,i=r.length;++u<i;)(t=r[u].on)&&t.apply(this,arguments);return n}var e=[],r=new u;return t.on=function(t,u){var i,o=r.get(t);return arguments.length<2?o&&o.on:(o&&(o.on=null,e=e.slice(0,i=e.indexOf(o)).concat(e.slice(i+1)),r.remove(t)),u&&e.push(r.set(t,{on:u})),n)},t}function f(){Zo.event.preventDefault()}function h(){for(var n,t=Zo.event;n=t.sourceEvent;)t=n;return t}function g(n){for(var t=new s,e=0,r=arguments.length;++e<r;)t[arguments[e]]=l(t);return t.of=function(e,r){return function(u){try{var i=u.sourceEvent=Zo.event;u.target=n,Zo.event=u,t[u.type].apply(e,r)}finally{Zo.event=i}}},t}function p(n){return sa(n,pa),n}function v(n){return"function"==typeof n?n:function(){return la(n,this)}}function d(n){return"function"==typeof n?n:function(){return fa(n,this)}}function m(n,t){function e(){this.removeAttribute(n)}function r(){this.removeAttributeNS(n.space,n.local)}function u(){this.setAttribute(n,t)}function i(){this.setAttributeNS(n.space,n.local,t)}function o(){var e=t.apply(this,arguments);null==e?this.removeAttribute(n):this.setAttribute(n,e)}function a(){var e=t.apply(this,arguments);null==e?this.removeAttributeNS(n.space,n.local):this.setAttributeNS(n.space,n.local,e)}return n=Zo.ns.qualify(n),null==t?n.local?r:e:"function"==typeof t?n.local?a:o:n.local?i:u}function y(n){return n.trim().replace(/\s+/g," ")}function x(n){return new RegExp("(?:^|\\s+)"+Zo.requote(n)+"(?:\\s+|$)","g")}function M(n,t){function e(){for(var e=-1;++e<u;)n[e](this,t)}function r(){for(var e=-1,r=t.apply(this,arguments);++e<u;)n[e](this,r)}n=n.trim().split(/\s+/).map(_);var u=n.length;return"function"==typeof t?r:e}function _(n){var t=x(n);return function(e,r){if(u=e.classList)return r?u.add(n):u.remove(n);var u=e.getAttribute("class")||"";r?(t.lastIndex=0,t.test(u)||e.setAttribute("class",y(u+" "+n))):e.setAttribute("class",y(u.replace(t," ")))}}function b(n,t,e){function r(){this.style.removeProperty(n)}function u(){this.style.setProperty(n,t,e)}function i(){var r=t.apply(this,arguments);null==r?this.style.removeProperty(n):this.style.setProperty(n,r,e)}return null==t?r:"function"==typeof t?i:u}function w(n,t){function e(){delete this[n]}function r(){this[n]=t}function u(){var e=t.apply(this,arguments);null==e?delete this[n]:this[n]=e}return null==t?e:"function"==typeof t?u:r}function S(n){return"function"==typeof n?n:(n=Zo.ns.qualify(n)).local?function(){return this.ownerDocument.createElementNS(n.space,n.local)}:function(){return this.ownerDocument.createElementNS(this.namespaceURI,n)}}function k(n){return{__data__:n}}function E(n){return function(){return ga(this,n)}}function A(n){return arguments.length||(n=Zo.ascending),function(t,e){return t&&e?n(t.__data__,e.__data__):!t-!e}}function C(n,t){for(var e=0,r=n.length;r>e;e++)for(var u,i=n[e],o=0,a=i.length;a>o;o++)(u=i[o])&&t(u,o,e);return n}function N(n){return sa(n,da),n}function L(n){var t,e;return function(r,u,i){var o,a=n[i].update,c=a.length;for(i!=e&&(e=i,t=0),u>=t&&(t=u+1);!(o=a[t])&&++t<c;);return o}}function T(){var n=this.__transition__;n&&++n.active}function q(n,t,e){function r(){var t=this[o];t&&(this.removeEventListener(n,t,t.$),delete this[o])}function u(){var u=s(t,Xo(arguments));r.call(this),this.addEventListener(n,this[o]=u,u.$=e),u._=t}function i(){var t,e=new RegExp("^__on([^.]+)"+Zo.requote(n)+"$");for(var r in this)if(t=r.match(e)){var u=this[r];this.removeEventListener(t[1],u,u.$),delete this[r]}}var o="__on"+n,a=n.indexOf("."),s=z;a>0&&(n=n.substring(0,a));var l=ya.get(n);return l&&(n=l,s=R),a?t?u:r:t?c:i}function z(n,t){return function(e){var r=Zo.event;Zo.event=e,t[0]=this.__data__;try{n.apply(this,t)}finally{Zo.event=r}}}function R(n,t){var e=z(n,t);return function(n){var t=this,r=n.relatedTarget;r&&(r===t||8&r.compareDocumentPosition(t))||e.call(t,n)}}function D(){var n=".dragsuppress-"+ ++Ma,t="touchmove"+n,e="selectstart"+n,r="dragstart"+n,u="click"+n,i=Zo.select(Wo).on(t,f).on(e,f).on(r,f),o=Bo.style,a=o[xa];return o[xa]="none",function(t){function e(){i.on(u,null)}i.on(n,null),o[xa]=a,t&&(i.on(u,function(){f(),e()},!0),setTimeout(e,0))}}function P(n,t){t.changedTouches&&(t=t.changedTouches[0]);var e=n.ownerSVGElement||n;if(e.createSVGPoint){var r=e.createSVGPoint();if(0>_a&&(Wo.scrollX||Wo.scrollY)){e=Zo.select("body").append("svg").style({position:"absolute",top:0,left:0,margin:0,padding:0,border:"none"},"important");var u=e[0][0].getScreenCTM();_a=!(u.f||u.e),e.remove()}return _a?(r.x=t.pageX,r.y=t.pageY):(r.x=t.clientX,r.y=t.clientY),r=r.matrixTransform(n.getScreenCTM().inverse()),[r.x,r.y]}var i=n.getBoundingClientRect();return[t.clientX-i.left-n.clientLeft,t.clientY-i.top-n.clientTop]}function U(n){return n>0?1:0>n?-1:0}function j(n){return n>1?0:-1>n?ba:Math.acos(n)}function H(n){return n>1?Sa:-1>n?-Sa:Math.asin(n)}function F(n){return((n=Math.exp(n))-1/n)/2}function O(n){return((n=Math.exp(n))+1/n)/2}function Y(n){return((n=Math.exp(2*n))-1)/(n+1)}function I(n){return(n=Math.sin(n/2))*n}function Z(){}function V(n,t,e){return new X(n,t,e)}function X(n,t,e){this.h=n,this.s=t,this.l=e}function $(n,t,e){function r(n){return n>360?n-=360:0>n&&(n+=360),60>n?i+(o-i)*n/60:180>n?o:240>n?i+(o-i)*(240-n)/60:i}function u(n){return Math.round(255*r(n))}var i,o;return n=isNaN(n)?0:(n%=360)<0?n+360:n,t=isNaN(t)?0:0>t?0:t>1?1:t,e=0>e?0:e>1?1:e,o=.5>=e?e*(1+t):e+t-e*t,i=2*e-o,ot(u(n+120),u(n),u(n-120))}function B(n,t,e){return new W(n,t,e)}function W(n,t,e){this.h=n,this.c=t,this.l=e}function J(n,t,e){return isNaN(n)&&(n=0),isNaN(t)&&(t=0),G(e,Math.cos(n*=Aa)*t,Math.sin(n)*t)}function G(n,t,e){return new K(n,t,e)}function K(n,t,e){this.l=n,this.a=t,this.b=e}function Q(n,t,e){var r=(n+16)/116,u=r+t/500,i=r-e/200;return u=tt(u)*ja,r=tt(r)*Ha,i=tt(i)*Fa,ot(rt(3.2404542*u-1.5371385*r-.4985314*i),rt(-.969266*u+1.8760108*r+.041556*i),rt(.0556434*u-.2040259*r+1.0572252*i))}function nt(n,t,e){return n>0?B(Math.atan2(e,t)*Ca,Math.sqrt(t*t+e*e),n):B(0/0,0/0,n)}function tt(n){return n>.206893034?n*n*n:(n-4/29)/7.787037}function et(n){return n>.008856?Math.pow(n,1/3):7.787037*n+4/29}function rt(n){return Math.round(255*(.00304>=n?12.92*n:1.055*Math.pow(n,1/2.4)-.055))}function ut(n){return ot(n>>16,255&n>>8,255&n)}function it(n){return ut(n)+""}function ot(n,t,e){return new at(n,t,e)}function at(n,t,e){this.r=n,this.g=t,this.b=e}function ct(n){return 16>n?"0"+Math.max(0,n).toString(16):Math.min(255,n).toString(16)}function st(n,t,e){var r,u,i,o=0,a=0,c=0;if(r=/([a-z]+)\((.*)\)/i.exec(n))switch(u=r[2].split(","),r[1]){case"hsl":return e(parseFloat(u[0]),parseFloat(u[1])/100,parseFloat(u[2])/100);case"rgb":return t(gt(u[0]),gt(u[1]),gt(u[2]))}return(i=Ia.get(n))?t(i.r,i.g,i.b):(null!=n&&"#"===n.charAt(0)&&(4===n.length?(o=n.charAt(1),o+=o,a=n.charAt(2),a+=a,c=n.charAt(3),c+=c):7===n.length&&(o=n.substring(1,3),a=n.substring(3,5),c=n.substring(5,7)),o=parseInt(o,16),a=parseInt(a,16),c=parseInt(c,16)),t(o,a,c))}function lt(n,t,e){var r,u,i=Math.min(n/=255,t/=255,e/=255),o=Math.max(n,t,e),a=o-i,c=(o+i)/2;return a?(u=.5>c?a/(o+i):a/(2-o-i),r=n==o?(t-e)/a+(e>t?6:0):t==o?(e-n)/a+2:(n-t)/a+4,r*=60):(r=0/0,u=c>0&&1>c?0:r),V(r,u,c)}function ft(n,t,e){n=ht(n),t=ht(t),e=ht(e);var r=et((.4124564*n+.3575761*t+.1804375*e)/ja),u=et((.2126729*n+.7151522*t+.072175*e)/Ha),i=et((.0193339*n+.119192*t+.9503041*e)/Fa);return G(116*u-16,500*(r-u),200*(u-i))}function ht(n){return(n/=255)<=.04045?n/12.92:Math.pow((n+.055)/1.055,2.4)}function gt(n){var t=parseFloat(n);return"%"===n.charAt(n.length-1)?Math.round(2.55*t):t}function pt(n){return"function"==typeof n?n:function(){return n}}function vt(n){return n}function dt(n){return function(t,e,r){return 2===arguments.length&&"function"==typeof e&&(r=e,e=null),mt(t,e,n,r)}}function mt(n,t,e,r){function u(){var n,t=c.status;if(!t&&c.responseText||t>=200&&300>t||304===t){try{n=e.call(i,c)}catch(r){return o.error.call(i,r),void 0}o.load.call(i,n)}else o.error.call(i,c)}var i={},o=Zo.dispatch("beforesend","progress","load","error"),a={},c=new XMLHttpRequest,s=null;return!Wo.XDomainRequest||"withCredentials"in c||!/^(http(s)?:)?\/\//.test(n)||(c=new XDomainRequest),"onload"in c?c.onload=c.onerror=u:c.onreadystatechange=function(){c.readyState>3&&u()},c.onprogress=function(n){var t=Zo.event;Zo.event=n;try{o.progress.call(i,c)}finally{Zo.event=t}},i.header=function(n,t){return n=(n+"").toLowerCase(),arguments.length<2?a[n]:(null==t?delete a[n]:a[n]=t+"",i)},i.mimeType=function(n){return arguments.length?(t=null==n?null:n+"",i):t},i.responseType=function(n){return arguments.length?(s=n,i):s},i.response=function(n){return e=n,i},["get","post"].forEach(function(n){i[n]=function(){return i.send.apply(i,[n].concat(Xo(arguments)))}}),i.send=function(e,r,u){if(2===arguments.length&&"function"==typeof r&&(u=r,r=null),c.open(e,n,!0),null==t||"accept"in a||(a.accept=t+",*/*"),c.setRequestHeader)for(var l in a)c.setRequestHeader(l,a[l]);return null!=t&&c.overrideMimeType&&c.overrideMimeType(t),null!=s&&(c.responseType=s),null!=u&&i.on("error",u).on("load",function(n){u(null,n)}),o.beforesend.call(i,c),c.send(null==r?null:r),i},i.abort=function(){return c.abort(),i},Zo.rebind(i,o,"on"),null==r?i:i.get(yt(r))}function yt(n){return 1===n.length?function(t,e){n(null==t?e:null)}:n}function xt(){var n=Mt(),t=_t()-n;t>24?(isFinite(t)&&(clearTimeout($a),$a=setTimeout(xt,t)),Xa=0):(Xa=1,Wa(xt))}function Mt(){var n=Date.now();for(Ba=Za;Ba;)n>=Ba.t&&(Ba.f=Ba.c(n-Ba.t)),Ba=Ba.n;return n}function _t(){for(var n,t=Za,e=1/0;t;)t.f?t=n?n.n=t.n:Za=t.n:(t.t<e&&(e=t.t),t=(n=t).n);return Va=n,e}function bt(n,t){var e=Math.pow(10,3*ua(8-t));return{scale:t>8?function(n){return n/e}:function(n){return n*e},symbol:n}}function wt(n,t){return t-(n?Math.ceil(Math.log(n)/Math.LN10):1)}function St(n){return n+""}function kt(){}function Et(n,t,e){var r=e.s=n+t,u=r-n,i=r-u;e.t=n-i+(t-u)}function At(n,t){n&&ac.hasOwnProperty(n.type)&&ac[n.type](n,t)}function Ct(n,t,e){var r,u=-1,i=n.length-e;for(t.lineStart();++u<i;)r=n[u],t.point(r[0],r[1],r[2]);t.lineEnd()}function Nt(n,t){var e=-1,r=n.length;for(t.polygonStart();++e<r;)Ct(n[e],t,1);t.polygonEnd()}function Lt(){function n(n,t){n*=Aa,t=t*Aa/2+ba/4;var e=n-r,o=Math.cos(t),a=Math.sin(t),c=i*a,s=u*o+c*Math.cos(e),l=c*Math.sin(e);sc.add(Math.atan2(l,s)),r=n,u=o,i=a}var t,e,r,u,i;lc.point=function(o,a){lc.point=n,r=(t=o)*Aa,u=Math.cos(a=(e=a)*Aa/2+ba/4),i=Math.sin(a)},lc.lineEnd=function(){n(t,e)}}function Tt(n){var t=n[0],e=n[1],r=Math.cos(e);return[r*Math.cos(t),r*Math.sin(t),Math.sin(e)]}function qt(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]}function zt(n,t){return[n[1]*t[2]-n[2]*t[1],n[2]*t[0]-n[0]*t[2],n[0]*t[1]-n[1]*t[0]]}function Rt(n,t){n[0]+=t[0],n[1]+=t[1],n[2]+=t[2]}function Dt(n,t){return[n[0]*t,n[1]*t,n[2]*t]}function Pt(n){var t=Math.sqrt(n[0]*n[0]+n[1]*n[1]+n[2]*n[2]);n[0]/=t,n[1]/=t,n[2]/=t}function Ut(n){return[Math.atan2(n[1],n[0]),H(n[2])]}function jt(n,t){return ua(n[0]-t[0])<ka&&ua(n[1]-t[1])<ka}function Ht(n,t){n*=Aa;var e=Math.cos(t*=Aa);Ft(e*Math.cos(n),e*Math.sin(n),Math.sin(t))}function Ft(n,t,e){++fc,gc+=(n-gc)/fc,pc+=(t-pc)/fc,vc+=(e-vc)/fc}function Ot(){function n(n,u){n*=Aa;var i=Math.cos(u*=Aa),o=i*Math.cos(n),a=i*Math.sin(n),c=Math.sin(u),s=Math.atan2(Math.sqrt((s=e*c-r*a)*s+(s=r*o-t*c)*s+(s=t*a-e*o)*s),t*o+e*a+r*c);hc+=s,dc+=s*(t+(t=o)),mc+=s*(e+(e=a)),yc+=s*(r+(r=c)),Ft(t,e,r)}var t,e,r;bc.point=function(u,i){u*=Aa;var o=Math.cos(i*=Aa);t=o*Math.cos(u),e=o*Math.sin(u),r=Math.sin(i),bc.point=n,Ft(t,e,r)}}function Yt(){bc.point=Ht}function It(){function n(n,t){n*=Aa;var e=Math.cos(t*=Aa),o=e*Math.cos(n),a=e*Math.sin(n),c=Math.sin(t),s=u*c-i*a,l=i*o-r*c,f=r*a-u*o,h=Math.sqrt(s*s+l*l+f*f),g=r*o+u*a+i*c,p=h&&-j(g)/h,v=Math.atan2(h,g);xc+=p*s,Mc+=p*l,_c+=p*f,hc+=v,dc+=v*(r+(r=o)),mc+=v*(u+(u=a)),yc+=v*(i+(i=c)),Ft(r,u,i)}var t,e,r,u,i;bc.point=function(o,a){t=o,e=a,bc.point=n,o*=Aa;var c=Math.cos(a*=Aa);r=c*Math.cos(o),u=c*Math.sin(o),i=Math.sin(a),Ft(r,u,i)},bc.lineEnd=function(){n(t,e),bc.lineEnd=Yt,bc.point=Ht}}function Zt(){return!0}function Vt(n,t,e,r,u){var i=[],o=[];if(n.forEach(function(n){if(!((t=n.length-1)<=0)){var t,e=n[0],r=n[t];if(jt(e,r)){u.lineStart();for(var a=0;t>a;++a)u.point((e=n[a])[0],e[1]);return u.lineEnd(),void 0}var c=new $t(e,n,null,!0),s=new $t(e,null,c,!1);c.o=s,i.push(c),o.push(s),c=new $t(r,n,null,!1),s=new $t(r,null,c,!0),c.o=s,i.push(c),o.push(s)}}),o.sort(t),Xt(i),Xt(o),i.length){for(var a=0,c=e,s=o.length;s>a;++a)o[a].e=c=!c;for(var l,f,h=i[0];;){for(var g=h,p=!0;g.v;)if((g=g.n)===h)return;l=g.z,u.lineStart();do{if(g.v=g.o.v=!0,g.e){if(p)for(var a=0,s=l.length;s>a;++a)u.point((f=l[a])[0],f[1]);else r(g.x,g.n.x,1,u);g=g.n}else{if(p){l=g.p.z;for(var a=l.length-1;a>=0;--a)u.point((f=l[a])[0],f[1])}else r(g.x,g.p.x,-1,u);g=g.p}g=g.o,l=g.z,p=!p}while(!g.v);u.lineEnd()}}}function Xt(n){if(t=n.length){for(var t,e,r=0,u=n[0];++r<t;)u.n=e=n[r],e.p=u,u=e;u.n=e=n[0],e.p=u}}function $t(n,t,e,r){this.x=n,this.z=t,this.o=e,this.e=r,this.v=!1,this.n=this.p=null}function Bt(n,t,e,r){return function(u,i){function o(t,e){var r=u(t,e);n(t=r[0],e=r[1])&&i.point(t,e)}function a(n,t){var e=u(n,t);d.point(e[0],e[1])}function c(){y.point=a,d.lineStart()}function s(){y.point=o,d.lineEnd()}function l(n,t){v.push([n,t]);var e=u(n,t);M.point(e[0],e[1])}function f(){M.lineStart(),v=[]}function h(){l(v[0][0],v[0][1]),M.lineEnd();var n,t=M.clean(),e=x.buffer(),r=e.length;if(v.pop(),p.push(v),v=null,r){if(1&t){n=e[0];var u,r=n.length-1,o=-1;for(i.lineStart();++o<r;)i.point((u=n[o])[0],u[1]);return i.lineEnd(),void 0}r>1&&2&t&&e.push(e.pop().concat(e.shift())),g.push(e.filter(Wt))}}var g,p,v,d=t(i),m=u.invert(r[0],r[1]),y={point:o,lineStart:c,lineEnd:s,polygonStart:function(){y.point=l,y.lineStart=f,y.lineEnd=h,g=[],p=[],i.polygonStart()},polygonEnd:function(){y.point=o,y.lineStart=c,y.lineEnd=s,g=Zo.merge(g);var n=Kt(m,p);g.length?Vt(g,Gt,n,e,i):n&&(i.lineStart(),e(null,null,1,i),i.lineEnd()),i.polygonEnd(),g=p=null},sphere:function(){i.polygonStart(),i.lineStart(),e(null,null,1,i),i.lineEnd(),i.polygonEnd()}},x=Jt(),M=t(x);return y}}function Wt(n){return n.length>1}function Jt(){var n,t=[];return{lineStart:function(){t.push(n=[])},point:function(t,e){n.push([t,e])},lineEnd:c,buffer:function(){var e=t;return t=[],n=null,e},rejoin:function(){t.length>1&&t.push(t.pop().concat(t.shift()))}}}function Gt(n,t){return((n=n.x)[0]<0?n[1]-Sa-ka:Sa-n[1])-((t=t.x)[0]<0?t[1]-Sa-ka:Sa-t[1])}function Kt(n,t){var e=n[0],r=n[1],u=[Math.sin(e),-Math.cos(e),0],i=0,o=0;sc.reset();for(var a=0,c=t.length;c>a;++a){var s=t[a],l=s.length;if(l)for(var f=s[0],h=f[0],g=f[1]/2+ba/4,p=Math.sin(g),v=Math.cos(g),d=1;;){d===l&&(d=0),n=s[d];var m=n[0],y=n[1]/2+ba/4,x=Math.sin(y),M=Math.cos(y),_=m-h,b=ua(_)>ba,w=p*x;if(sc.add(Math.atan2(w*Math.sin(_),v*M+w*Math.cos(_))),i+=b?_+(_>=0?wa:-wa):_,b^h>=e^m>=e){var S=zt(Tt(f),Tt(n));Pt(S);var k=zt(u,S);Pt(k);var E=(b^_>=0?-1:1)*H(k[2]);(r>E||r===E&&(S[0]||S[1]))&&(o+=b^_>=0?1:-1)}if(!d++)break;h=m,p=x,v=M,f=n}}return(-ka>i||ka>i&&0>sc)^1&o}function Qt(n){var t,e=0/0,r=0/0,u=0/0;return{lineStart:function(){n.lineStart(),t=1},point:function(i,o){var a=i>0?ba:-ba,c=ua(i-e);ua(c-ba)<ka?(n.point(e,r=(r+o)/2>0?Sa:-Sa),n.point(u,r),n.lineEnd(),n.lineStart(),n.point(a,r),n.point(i,r),t=0):u!==a&&c>=ba&&(ua(e-u)<ka&&(e-=u*ka),ua(i-a)<ka&&(i-=a*ka),r=ne(e,r,i,o),n.point(u,r),n.lineEnd(),n.lineStart(),n.point(a,r),t=0),n.point(e=i,r=o),u=a},lineEnd:function(){n.lineEnd(),e=r=0/0},clean:function(){return 2-t}}}function ne(n,t,e,r){var u,i,o=Math.sin(n-e);return ua(o)>ka?Math.atan((Math.sin(t)*(i=Math.cos(r))*Math.sin(e)-Math.sin(r)*(u=Math.cos(t))*Math.sin(n))/(u*i*o)):(t+r)/2}function te(n,t,e,r){var u;if(null==n)u=e*Sa,r.point(-ba,u),r.point(0,u),r.point(ba,u),r.point(ba,0),r.point(ba,-u),r.point(0,-u),r.point(-ba,-u),r.point(-ba,0),r.point(-ba,u);else if(ua(n[0]-t[0])>ka){var i=n[0]<t[0]?ba:-ba;u=e*i/2,r.point(-i,u),r.point(0,u),r.point(i,u)}else r.point(t[0],t[1])}function ee(n){function t(n,t){return Math.cos(n)*Math.cos(t)>i}function e(n){var e,i,c,s,l;return{lineStart:function(){s=c=!1,l=1},point:function(f,h){var g,p=[f,h],v=t(f,h),d=o?v?0:u(f,h):v?u(f+(0>f?ba:-ba),h):0;if(!e&&(s=c=v)&&n.lineStart(),v!==c&&(g=r(e,p),(jt(e,g)||jt(p,g))&&(p[0]+=ka,p[1]+=ka,v=t(p[0],p[1]))),v!==c)l=0,v?(n.lineStart(),g=r(p,e),n.point(g[0],g[1])):(g=r(e,p),n.point(g[0],g[1]),n.lineEnd()),e=g;else if(a&&e&&o^v){var m;d&i||!(m=r(p,e,!0))||(l=0,o?(n.lineStart(),n.point(m[0][0],m[0][1]),n.point(m[1][0],m[1][1]),n.lineEnd()):(n.point(m[1][0],m[1][1]),n.lineEnd(),n.lineStart(),n.point(m[0][0],m[0][1])))}!v||e&&jt(e,p)||n.point(p[0],p[1]),e=p,c=v,i=d},lineEnd:function(){c&&n.lineEnd(),e=null},clean:function(){return l|(s&&c)<<1}}}function r(n,t,e){var r=Tt(n),u=Tt(t),o=[1,0,0],a=zt(r,u),c=qt(a,a),s=a[0],l=c-s*s;if(!l)return!e&&n;var f=i*c/l,h=-i*s/l,g=zt(o,a),p=Dt(o,f),v=Dt(a,h);Rt(p,v);var d=g,m=qt(p,d),y=qt(d,d),x=m*m-y*(qt(p,p)-1);if(!(0>x)){var M=Math.sqrt(x),_=Dt(d,(-m-M)/y);if(Rt(_,p),_=Ut(_),!e)return _;var b,w=n[0],S=t[0],k=n[1],E=t[1];w>S&&(b=w,w=S,S=b);var A=S-w,C=ua(A-ba)<ka,N=C||ka>A;if(!C&&k>E&&(b=k,k=E,E=b),N?C?k+E>0^_[1]<(ua(_[0]-w)<ka?k:E):k<=_[1]&&_[1]<=E:A>ba^(w<=_[0]&&_[0]<=S)){var L=Dt(d,(-m+M)/y);return Rt(L,p),[_,Ut(L)]}}}function u(t,e){var r=o?n:ba-n,u=0;return-r>t?u|=1:t>r&&(u|=2),-r>e?u|=4:e>r&&(u|=8),u}var i=Math.cos(n),o=i>0,a=ua(i)>ka,c=Ne(n,6*Aa);return Bt(t,e,c,o?[0,-n]:[-ba,n-ba])}function re(n,t,e,r){return function(u){var i,o=u.a,a=u.b,c=o.x,s=o.y,l=a.x,f=a.y,h=0,g=1,p=l-c,v=f-s;if(i=n-c,p||!(i>0)){if(i/=p,0>p){if(h>i)return;g>i&&(g=i)}else if(p>0){if(i>g)return;i>h&&(h=i)}if(i=e-c,p||!(0>i)){if(i/=p,0>p){if(i>g)return;i>h&&(h=i)}else if(p>0){if(h>i)return;g>i&&(g=i)}if(i=t-s,v||!(i>0)){if(i/=v,0>v){if(h>i)return;g>i&&(g=i)}else if(v>0){if(i>g)return;i>h&&(h=i)}if(i=r-s,v||!(0>i)){if(i/=v,0>v){if(i>g)return;i>h&&(h=i)}else if(v>0){if(h>i)return;g>i&&(g=i)}return h>0&&(u.a={x:c+h*p,y:s+h*v}),1>g&&(u.b={x:c+g*p,y:s+g*v}),u}}}}}}function ue(n,t,e,r){function u(r,u){return ua(r[0]-n)<ka?u>0?0:3:ua(r[0]-e)<ka?u>0?2:1:ua(r[1]-t)<ka?u>0?1:0:u>0?3:2}function i(n,t){return o(n.x,t.x)}function o(n,t){var e=u(n,1),r=u(t,1);return e!==r?e-r:0===e?t[1]-n[1]:1===e?n[0]-t[0]:2===e?n[1]-t[1]:t[0]-n[0]}return function(a){function c(n){for(var t=0,e=m.length,r=n[1],u=0;e>u;++u)for(var i,o=1,a=m[u],c=a.length,l=a[0];c>o;++o)i=a[o],l[1]<=r?i[1]>r&&s(l,i,n)>0&&++t:i[1]<=r&&s(l,i,n)<0&&--t,l=i;return 0!==t}function s(n,t,e){return(t[0]-n[0])*(e[1]-n[1])-(e[0]-n[0])*(t[1]-n[1])}function l(i,a,c,s){var l=0,f=0;if(null==i||(l=u(i,c))!==(f=u(a,c))||o(i,a)<0^c>0){do s.point(0===l||3===l?n:e,l>1?r:t);while((l=(l+c+4)%4)!==f)}else s.point(a[0],a[1])}function f(u,i){return u>=n&&e>=u&&i>=t&&r>=i}function h(n,t){f(n,t)&&a.point(n,t)}function g(){L.point=v,m&&m.push(y=[]),k=!0,S=!1,b=w=0/0}function p(){d&&(v(x,M),_&&S&&C.rejoin(),d.push(C.buffer())),L.point=h,S&&a.lineEnd()}function v(n,t){n=Math.max(-Sc,Math.min(Sc,n)),t=Math.max(-Sc,Math.min(Sc,t));var e=f(n,t);if(m&&y.push([n,t]),k)x=n,M=t,_=e,k=!1,e&&(a.lineStart(),a.point(n,t));else if(e&&S)a.point(n,t);else{var r={a:{x:b,y:w},b:{x:n,y:t}};N(r)?(S||(a.lineStart(),a.point(r.a.x,r.a.y)),a.point(r.b.x,r.b.y),e||a.lineEnd(),E=!1):e&&(a.lineStart(),a.point(n,t),E=!1)}b=n,w=t,S=e}var d,m,y,x,M,_,b,w,S,k,E,A=a,C=Jt(),N=re(n,t,e,r),L={point:h,lineStart:g,lineEnd:p,polygonStart:function(){a=C,d=[],m=[],E=!0},polygonEnd:function(){a=A,d=Zo.merge(d);var t=c([n,r]),e=E&&t,u=d.length;(e||u)&&(a.polygonStart(),e&&(a.lineStart(),l(null,null,1,a),a.lineEnd()),u&&Vt(d,i,t,l,a),a.polygonEnd()),d=m=y=null}};return L}}function ie(n,t){function e(e,r){return e=n(e,r),t(e[0],e[1])}return n.invert&&t.invert&&(e.invert=function(e,r){return e=t.invert(e,r),e&&n.invert(e[0],e[1])}),e}function oe(n){var t=0,e=ba/3,r=_e(n),u=r(t,e);return u.parallels=function(n){return arguments.length?r(t=n[0]*ba/180,e=n[1]*ba/180):[180*(t/ba),180*(e/ba)]},u}function ae(n,t){function e(n,t){var e=Math.sqrt(i-2*u*Math.sin(t))/u;return[e*Math.sin(n*=u),o-e*Math.cos(n)]}var r=Math.sin(n),u=(r+Math.sin(t))/2,i=1+r*(2*u-r),o=Math.sqrt(i)/u;return e.invert=function(n,t){var e=o-t;return[Math.atan2(n,e)/u,H((i-(n*n+e*e)*u*u)/(2*u))]},e}function ce(){function n(n,t){Ec+=u*n-r*t,r=n,u=t}var t,e,r,u;Tc.point=function(i,o){Tc.point=n,t=r=i,e=u=o},Tc.lineEnd=function(){n(t,e)}}function se(n,t){Ac>n&&(Ac=n),n>Nc&&(Nc=n),Cc>t&&(Cc=t),t>Lc&&(Lc=t)}function le(){function n(n,t){o.push("M",n,",",t,i)}function t(n,t){o.push("M",n,",",t),a.point=e}function e(n,t){o.push("L",n,",",t)}function r(){a.point=n}function u(){o.push("Z")}var i=fe(4.5),o=[],a={point:n,lineStart:function(){a.point=t},lineEnd:r,polygonStart:function(){a.lineEnd=u},polygonEnd:function(){a.lineEnd=r,a.point=n},pointRadius:function(n){return i=fe(n),a},result:function(){if(o.length){var n=o.join("");return o=[],n}}};return a}function fe(n){return"m0,"+n+"a"+n+","+n+" 0 1,1 0,"+-2*n+"a"+n+","+n+" 0 1,1 0,"+2*n+"z"}function he(n,t){gc+=n,pc+=t,++vc}function ge(){function n(n,r){var u=n-t,i=r-e,o=Math.sqrt(u*u+i*i);dc+=o*(t+n)/2,mc+=o*(e+r)/2,yc+=o,he(t=n,e=r)}var t,e;zc.point=function(r,u){zc.point=n,he(t=r,e=u)}}function pe(){zc.point=he}function ve(){function n(n,t){var e=n-r,i=t-u,o=Math.sqrt(e*e+i*i);dc+=o*(r+n)/2,mc+=o*(u+t)/2,yc+=o,o=u*n-r*t,xc+=o*(r+n),Mc+=o*(u+t),_c+=3*o,he(r=n,u=t)}var t,e,r,u;zc.point=function(i,o){zc.point=n,he(t=r=i,e=u=o)},zc.lineEnd=function(){n(t,e)}}function de(n){function t(t,e){n.moveTo(t,e),n.arc(t,e,o,0,wa)}function e(t,e){n.moveTo(t,e),a.point=r}function r(t,e){n.lineTo(t,e)}function u(){a.point=t}function i(){n.closePath()}var o=4.5,a={point:t,lineStart:function(){a.point=e},lineEnd:u,polygonStart:function(){a.lineEnd=i},polygonEnd:function(){a.lineEnd=u,a.point=t},pointRadius:function(n){return o=n,a},result:c};return a}function me(n){function t(t){function r(e,r){e=n(e,r),t.point(e[0],e[1])}function u(){x=0/0,S.point=o,t.lineStart()}function o(r,u){var o=Tt([r,u]),a=n(r,u);e(x,M,y,_,b,w,x=a[0],M=a[1],y=r,_=o[0],b=o[1],w=o[2],i,t),t.point(x,M)}function a(){S.point=r,t.lineEnd()}function c(){u(),S.point=s,S.lineEnd=l}function s(n,t){o(f=n,h=t),g=x,p=M,v=_,d=b,m=w,S.point=o}function l(){e(x,M,y,_,b,w,g,p,f,v,d,m,i,t),S.lineEnd=a,a()}var f,h,g,p,v,d,m,y,x,M,_,b,w,S={point:r,lineStart:u,lineEnd:a,polygonStart:function(){t.polygonStart(),S.lineStart=c},polygonEnd:function(){t.polygonEnd(),S.lineStart=u}};return S}function e(t,i,o,a,c,s,l,f,h,g,p,v,d,m){var y=l-t,x=f-i,M=y*y+x*x;if(M>4*r&&d--){var _=a+g,b=c+p,w=s+v,S=Math.sqrt(_*_+b*b+w*w),k=Math.asin(w/=S),E=ua(ua(w)-1)<ka?(o+h)/2:Math.atan2(b,_),A=n(E,k),C=A[0],N=A[1],L=C-t,T=N-i,q=x*L-y*T;(q*q/M>r||ua((y*L+x*T)/M-.5)>.3||u>a*g+c*p+s*v)&&(e(t,i,o,a,c,s,C,N,E,_/=S,b/=S,w,d,m),m.point(C,N),e(C,N,E,_,b,w,l,f,h,g,p,v,d,m))}}var r=.5,u=Math.cos(30*Aa),i=16;return t.precision=function(n){return arguments.length?(i=(r=n*n)>0&&16,t):Math.sqrt(r)},t}function ye(n){this.stream=n}function xe(n){var t=me(function(t,e){return n([t*Ca,e*Ca])});return function(n){var e=new ye(n=t(n));return e.point=function(t,e){n.point(t*Aa,e*Aa)},e}}function Me(n){return _e(function(){return n})()}function _e(n){function t(n){return n=a(n[0]*Aa,n[1]*Aa),[n[0]*h+c,s-n[1]*h]}function e(n){return n=a.invert((n[0]-c)/h,(s-n[1])/h),n&&[n[0]*Ca,n[1]*Ca]}function r(){a=ie(o=ke(m,y,x),i);var n=i(v,d);return c=g-n[0]*h,s=p+n[1]*h,u()}function u(){return l&&(l.valid=!1,l=null),t}var i,o,a,c,s,l,f=me(function(n,t){return n=i(n,t),[n[0]*h+c,s-n[1]*h]}),h=150,g=480,p=250,v=0,d=0,m=0,y=0,x=0,M=wc,_=vt,b=null,w=null;return t.stream=function(n){return l&&(l.valid=!1),l=be(M(o,f(_(n)))),l.valid=!0,l},t.clipAngle=function(n){return arguments.length?(M=null==n?(b=n,wc):ee((b=+n)*Aa),u()):b},t.clipExtent=function(n){return arguments.length?(w=n,_=n?ue(n[0][0],n[0][1],n[1][0],n[1][1]):vt,u()):w},t.scale=function(n){return arguments.length?(h=+n,r()):h},t.translate=function(n){return arguments.length?(g=+n[0],p=+n[1],r()):[g,p]},t.center=function(n){return arguments.length?(v=n[0]%360*Aa,d=n[1]%360*Aa,r()):[v*Ca,d*Ca]},t.rotate=function(n){return arguments.length?(m=n[0]%360*Aa,y=n[1]%360*Aa,x=n.length>2?n[2]%360*Aa:0,r()):[m*Ca,y*Ca,x*Ca]},Zo.rebind(t,f,"precision"),function(){return i=n.apply(this,arguments),t.invert=i.invert&&e,r()}}function be(n){var t=new ye(n);return t.point=function(t,e){n.point(t*Aa,e*Aa)},t}function we(n,t){return[n,t]}function Se(n,t){return[n>ba?n-wa:-ba>n?n+wa:n,t]}function ke(n,t,e){return n?t||e?ie(Ae(n),Ce(t,e)):Ae(n):t||e?Ce(t,e):Se}function Ee(n){return function(t,e){return t+=n,[t>ba?t-wa:-ba>t?t+wa:t,e]}}function Ae(n){var t=Ee(n);return t.invert=Ee(-n),t}function Ce(n,t){function e(n,t){var e=Math.cos(t),a=Math.cos(n)*e,c=Math.sin(n)*e,s=Math.sin(t),l=s*r+a*u;return[Math.atan2(c*i-l*o,a*r-s*u),H(l*i+c*o)]}var r=Math.cos(n),u=Math.sin(n),i=Math.cos(t),o=Math.sin(t);return e.invert=function(n,t){var e=Math.cos(t),a=Math.cos(n)*e,c=Math.sin(n)*e,s=Math.sin(t),l=s*i-c*o;return[Math.atan2(c*i+s*o,a*r+l*u),H(l*r-a*u)]},e}function Ne(n,t){var e=Math.cos(n),r=Math.sin(n);return function(u,i,o,a){var c=o*t;null!=u?(u=Le(e,u),i=Le(e,i),(o>0?i>u:u>i)&&(u+=o*wa)):(u=n+o*wa,i=n-.5*c);for(var s,l=u;o>0?l>i:i>l;l-=c)a.point((s=Ut([e,-r*Math.cos(l),-r*Math.sin(l)]))[0],s[1])}}function Le(n,t){var e=Tt(t);e[0]-=n,Pt(e);var r=j(-e[1]);return((-e[2]<0?-r:r)+2*Math.PI-ka)%(2*Math.PI)}function Te(n,t,e){var r=Zo.range(n,t-ka,e).concat(t);return function(n){return r.map(function(t){return[n,t]})}}function qe(n,t,e){var r=Zo.range(n,t-ka,e).concat(t);return function(n){return r.map(function(t){return[t,n]})}}function ze(n){return n.source}function Re(n){return n.target}function De(n,t,e,r){var u=Math.cos(t),i=Math.sin(t),o=Math.cos(r),a=Math.sin(r),c=u*Math.cos(n),s=u*Math.sin(n),l=o*Math.cos(e),f=o*Math.sin(e),h=2*Math.asin(Math.sqrt(I(r-t)+u*o*I(e-n))),g=1/Math.sin(h),p=h?function(n){var t=Math.sin(n*=h)*g,e=Math.sin(h-n)*g,r=e*c+t*l,u=e*s+t*f,o=e*i+t*a;return[Math.atan2(u,r)*Ca,Math.atan2(o,Math.sqrt(r*r+u*u))*Ca]}:function(){return[n*Ca,t*Ca]};return p.distance=h,p}function Pe(){function n(n,u){var i=Math.sin(u*=Aa),o=Math.cos(u),a=ua((n*=Aa)-t),c=Math.cos(a);Rc+=Math.atan2(Math.sqrt((a=o*Math.sin(a))*a+(a=r*i-e*o*c)*a),e*i+r*o*c),t=n,e=i,r=o}var t,e,r;Dc.point=function(u,i){t=u*Aa,e=Math.sin(i*=Aa),r=Math.cos(i),Dc.point=n},Dc.lineEnd=function(){Dc.point=Dc.lineEnd=c}}function Ue(n,t){function e(t,e){var r=Math.cos(t),u=Math.cos(e),i=n(r*u);return[i*u*Math.sin(t),i*Math.sin(e)]}return e.invert=function(n,e){var r=Math.sqrt(n*n+e*e),u=t(r),i=Math.sin(u),o=Math.cos(u);return[Math.atan2(n*i,r*o),Math.asin(r&&e*i/r)]},e}function je(n,t){function e(n,t){var e=ua(ua(t)-Sa)<ka?0:o/Math.pow(u(t),i);return[e*Math.sin(i*n),o-e*Math.cos(i*n)]}var r=Math.cos(n),u=function(n){return Math.tan(ba/4+n/2)},i=n===t?Math.sin(n):Math.log(r/Math.cos(t))/Math.log(u(t)/u(n)),o=r*Math.pow(u(n),i)/i;return i?(e.invert=function(n,t){var e=o-t,r=U(i)*Math.sqrt(n*n+e*e);return[Math.atan2(n,e)/i,2*Math.atan(Math.pow(o/r,1/i))-Sa]},e):Fe}function He(n,t){function e(n,t){var e=i-t;return[e*Math.sin(u*n),i-e*Math.cos(u*n)]}var r=Math.cos(n),u=n===t?Math.sin(n):(r-Math.cos(t))/(t-n),i=r/u+n;return ua(u)<ka?we:(e.invert=function(n,t){var e=i-t;return[Math.atan2(n,e)/u,i-U(u)*Math.sqrt(n*n+e*e)]},e)}function Fe(n,t){return[n,Math.log(Math.tan(ba/4+t/2))]}function Oe(n){var t,e=Me(n),r=e.scale,u=e.translate,i=e.clipExtent;return e.scale=function(){var n=r.apply(e,arguments);return n===e?t?e.clipExtent(null):e:n},e.translate=function(){var n=u.apply(e,arguments);return n===e?t?e.clipExtent(null):e:n},e.clipExtent=function(n){var o=i.apply(e,arguments);if(o===e){if(t=null==n){var a=ba*r(),c=u();i([[c[0]-a,c[1]-a],[c[0]+a,c[1]+a]])}}else t&&(o=null);return o},e.clipExtent(null)}function Ye(n,t){var e=Math.cos(t)*Math.sin(n);return[Math.log((1+e)/(1-e))/2,Math.atan2(Math.tan(t),Math.cos(n))]}function Ie(n){return n[0]}function Ze(n){return n[1]}function Ve(n,t,e,r){var u,i,o,a,c,s,l;return u=r[n],i=u[0],o=u[1],u=r[t],a=u[0],c=u[1],u=r[e],s=u[0],l=u[1],(l-o)*(a-i)-(c-o)*(s-i)>0}function Xe(n,t,e){return(e[0]-t[0])*(n[1]-t[1])<(e[1]-t[1])*(n[0]-t[0])}function $e(n,t,e,r){var u=n[0],i=e[0],o=t[0]-u,a=r[0]-i,c=n[1],s=e[1],l=t[1]-c,f=r[1]-s,h=(a*(c-s)-f*(u-i))/(f*o-a*l);return[u+h*o,c+h*l]}function Be(n){var t=n[0],e=n[n.length-1];return!(t[0]-e[0]||t[1]-e[1])}function We(){dr(this),this.edge=this.site=this.circle=null}function Je(n){var t=$c.pop()||new We;return t.site=n,t}function Ge(n){ar(n),Zc.remove(n),$c.push(n),dr(n)}function Ke(n){var t=n.circle,e=t.x,r=t.cy,u={x:e,y:r},i=n.P,o=n.N,a=[n];Ge(n);for(var c=i;c.circle&&ua(e-c.circle.x)<ka&&ua(r-c.circle.cy)<ka;)i=c.P,a.unshift(c),Ge(c),c=i;a.unshift(c),ar(c);for(var s=o;s.circle&&ua(e-s.circle.x)<ka&&ua(r-s.circle.cy)<ka;)o=s.N,a.push(s),Ge(s),s=o;a.push(s),ar(s);var l,f=a.length;for(l=1;f>l;++l)s=a[l],c=a[l-1],gr(s.edge,c.site,s.site,u);c=a[0],s=a[f-1],s.edge=fr(c.site,s.site,null,u),or(c),or(s)}function Qe(n){for(var t,e,r,u,i=n.x,o=n.y,a=Zc._;a;)if(r=nr(a,o)-i,r>ka)a=a.L;else{if(u=i-tr(a,o),!(u>ka)){r>-ka?(t=a.P,e=a):u>-ka?(t=a,e=a.N):t=e=a;break}if(!a.R){t=a;break}a=a.R}var c=Je(n);if(Zc.insert(t,c),t||e){if(t===e)return ar(t),e=Je(t.site),Zc.insert(c,e),c.edge=e.edge=fr(t.site,c.site),or(t),or(e),void 0;if(!e)return c.edge=fr(t.site,c.site),void 0;ar(t),ar(e);var s=t.site,l=s.x,f=s.y,h=n.x-l,g=n.y-f,p=e.site,v=p.x-l,d=p.y-f,m=2*(h*d-g*v),y=h*h+g*g,x=v*v+d*d,M={x:(d*y-g*x)/m+l,y:(h*x-v*y)/m+f};gr(e.edge,s,p,M),c.edge=fr(s,n,null,M),e.edge=fr(n,p,null,M),or(t),or(e)}}function nr(n,t){var e=n.site,r=e.x,u=e.y,i=u-t;if(!i)return r;var o=n.P;if(!o)return-1/0;e=o.site;var a=e.x,c=e.y,s=c-t;if(!s)return a;var l=a-r,f=1/i-1/s,h=l/s;return f?(-h+Math.sqrt(h*h-2*f*(l*l/(-2*s)-c+s/2+u-i/2)))/f+r:(r+a)/2}function tr(n,t){var e=n.N;if(e)return nr(e,t);var r=n.site;return r.y===t?r.x:1/0}function er(n){this.site=n,this.edges=[]}function rr(n){for(var t,e,r,u,i,o,a,c,s,l,f=n[0][0],h=n[1][0],g=n[0][1],p=n[1][1],v=Ic,d=v.length;d--;)if(i=v[d],i&&i.prepare())for(a=i.edges,c=a.length,o=0;c>o;)l=a[o].end(),r=l.x,u=l.y,s=a[++o%c].start(),t=s.x,e=s.y,(ua(r-t)>ka||ua(u-e)>ka)&&(a.splice(o,0,new pr(hr(i.site,l,ua(r-f)<ka&&p-u>ka?{x:f,y:ua(t-f)<ka?e:p}:ua(u-p)<ka&&h-r>ka?{x:ua(e-p)<ka?t:h,y:p}:ua(r-h)<ka&&u-g>ka?{x:h,y:ua(t-h)<ka?e:g}:ua(u-g)<ka&&r-f>ka?{x:ua(e-g)<ka?t:f,y:g}:null),i.site,null)),++c)}function ur(n,t){return t.angle-n.angle}function ir(){dr(this),this.x=this.y=this.arc=this.site=this.cy=null}function or(n){var t=n.P,e=n.N;if(t&&e){var r=t.site,u=n.site,i=e.site;if(r!==i){var o=u.x,a=u.y,c=r.x-o,s=r.y-a,l=i.x-o,f=i.y-a,h=2*(c*f-s*l);if(!(h>=-Ea)){var g=c*c+s*s,p=l*l+f*f,v=(f*g-s*p)/h,d=(c*p-l*g)/h,f=d+a,m=Bc.pop()||new ir;m.arc=n,m.site=u,m.x=v+o,m.y=f+Math.sqrt(v*v+d*d),m.cy=f,n.circle=m;for(var y=null,x=Xc._;x;)if(m.y<x.y||m.y===x.y&&m.x<=x.x){if(!x.L){y=x.P;break}x=x.L}else{if(!x.R){y=x;break}x=x.R}Xc.insert(y,m),y||(Vc=m)}}}}function ar(n){var t=n.circle;t&&(t.P||(Vc=t.N),Xc.remove(t),Bc.push(t),dr(t),n.circle=null)}function cr(n){for(var t,e=Yc,r=re(n[0][0],n[0][1],n[1][0],n[1][1]),u=e.length;u--;)t=e[u],(!sr(t,n)||!r(t)||ua(t.a.x-t.b.x)<ka&&ua(t.a.y-t.b.y)<ka)&&(t.a=t.b=null,e.splice(u,1))}function sr(n,t){var e=n.b;if(e)return!0;var r,u,i=n.a,o=t[0][0],a=t[1][0],c=t[0][1],s=t[1][1],l=n.l,f=n.r,h=l.x,g=l.y,p=f.x,v=f.y,d=(h+p)/2,m=(g+v)/2;if(v===g){if(o>d||d>=a)return;if(h>p){if(i){if(i.y>=s)return}else i={x:d,y:c};e={x:d,y:s}}else{if(i){if(i.y<c)return}else i={x:d,y:s};e={x:d,y:c}}}else if(r=(h-p)/(v-g),u=m-r*d,-1>r||r>1)if(h>p){if(i){if(i.y>=s)return
}else i={x:(c-u)/r,y:c};e={x:(s-u)/r,y:s}}else{if(i){if(i.y<c)return}else i={x:(s-u)/r,y:s};e={x:(c-u)/r,y:c}}else if(v>g){if(i){if(i.x>=a)return}else i={x:o,y:r*o+u};e={x:a,y:r*a+u}}else{if(i){if(i.x<o)return}else i={x:a,y:r*a+u};e={x:o,y:r*o+u}}return n.a=i,n.b=e,!0}function lr(n,t){this.l=n,this.r=t,this.a=this.b=null}function fr(n,t,e,r){var u=new lr(n,t);return Yc.push(u),e&&gr(u,n,t,e),r&&gr(u,t,n,r),Ic[n.i].edges.push(new pr(u,n,t)),Ic[t.i].edges.push(new pr(u,t,n)),u}function hr(n,t,e){var r=new lr(n,null);return r.a=t,r.b=e,Yc.push(r),r}function gr(n,t,e,r){n.a||n.b?n.l===e?n.b=r:n.a=r:(n.a=r,n.l=t,n.r=e)}function pr(n,t,e){var r=n.a,u=n.b;this.edge=n,this.site=t,this.angle=e?Math.atan2(e.y-t.y,e.x-t.x):n.l===t?Math.atan2(u.x-r.x,r.y-u.y):Math.atan2(r.x-u.x,u.y-r.y)}function vr(){this._=null}function dr(n){n.U=n.C=n.L=n.R=n.P=n.N=null}function mr(n,t){var e=t,r=t.R,u=e.U;u?u.L===e?u.L=r:u.R=r:n._=r,r.U=u,e.U=r,e.R=r.L,e.R&&(e.R.U=e),r.L=e}function yr(n,t){var e=t,r=t.L,u=e.U;u?u.L===e?u.L=r:u.R=r:n._=r,r.U=u,e.U=r,e.L=r.R,e.L&&(e.L.U=e),r.R=e}function xr(n){for(;n.L;)n=n.L;return n}function Mr(n,t){var e,r,u,i=n.sort(_r).pop();for(Yc=[],Ic=new Array(n.length),Zc=new vr,Xc=new vr;;)if(u=Vc,i&&(!u||i.y<u.y||i.y===u.y&&i.x<u.x))(i.x!==e||i.y!==r)&&(Ic[i.i]=new er(i),Qe(i),e=i.x,r=i.y),i=n.pop();else{if(!u)break;Ke(u.arc)}t&&(cr(t),rr(t));var o={cells:Ic,edges:Yc};return Zc=Xc=Yc=Ic=null,o}function _r(n,t){return t.y-n.y||t.x-n.x}function br(n,t,e){return(n.x-e.x)*(t.y-n.y)-(n.x-t.x)*(e.y-n.y)}function wr(n){return n.x}function Sr(n){return n.y}function kr(){return{leaf:!0,nodes:[],point:null,x:null,y:null}}function Er(n,t,e,r,u,i){if(!n(t,e,r,u,i)){var o=.5*(e+u),a=.5*(r+i),c=t.nodes;c[0]&&Er(n,c[0],e,r,o,a),c[1]&&Er(n,c[1],o,r,u,a),c[2]&&Er(n,c[2],e,a,o,i),c[3]&&Er(n,c[3],o,a,u,i)}}function Ar(n,t){n=Zo.rgb(n),t=Zo.rgb(t);var e=n.r,r=n.g,u=n.b,i=t.r-e,o=t.g-r,a=t.b-u;return function(n){return"#"+ct(Math.round(e+i*n))+ct(Math.round(r+o*n))+ct(Math.round(u+a*n))}}function Cr(n,t){var e,r={},u={};for(e in n)e in t?r[e]=Tr(n[e],t[e]):u[e]=n[e];for(e in t)e in n||(u[e]=t[e]);return function(n){for(e in r)u[e]=r[e](n);return u}}function Nr(n,t){return t-=n=+n,function(e){return n+t*e}}function Lr(n,t){var e,r,u,i,o,a=0,c=0,s=[],l=[];for(n+="",t+="",Jc.lastIndex=0,r=0;e=Jc.exec(t);++r)e.index&&s.push(t.substring(a,c=e.index)),l.push({i:s.length,x:e[0]}),s.push(null),a=Jc.lastIndex;for(a<t.length&&s.push(t.substring(a)),r=0,i=l.length;(e=Jc.exec(n))&&i>r;++r)if(o=l[r],o.x==e[0]){if(o.i)if(null==s[o.i+1])for(s[o.i-1]+=o.x,s.splice(o.i,1),u=r+1;i>u;++u)l[u].i--;else for(s[o.i-1]+=o.x+s[o.i+1],s.splice(o.i,2),u=r+1;i>u;++u)l[u].i-=2;else if(null==s[o.i+1])s[o.i]=o.x;else for(s[o.i]=o.x+s[o.i+1],s.splice(o.i+1,1),u=r+1;i>u;++u)l[u].i--;l.splice(r,1),i--,r--}else o.x=Nr(parseFloat(e[0]),parseFloat(o.x));for(;i>r;)o=l.pop(),null==s[o.i+1]?s[o.i]=o.x:(s[o.i]=o.x+s[o.i+1],s.splice(o.i+1,1)),i--;return 1===s.length?null==s[0]?(o=l[0].x,function(n){return o(n)+""}):function(){return t}:function(n){for(r=0;i>r;++r)s[(o=l[r]).i]=o.x(n);return s.join("")}}function Tr(n,t){for(var e,r=Zo.interpolators.length;--r>=0&&!(e=Zo.interpolators[r](n,t)););return e}function qr(n,t){var e,r=[],u=[],i=n.length,o=t.length,a=Math.min(n.length,t.length);for(e=0;a>e;++e)r.push(Tr(n[e],t[e]));for(;i>e;++e)u[e]=n[e];for(;o>e;++e)u[e]=t[e];return function(n){for(e=0;a>e;++e)u[e]=r[e](n);return u}}function zr(n){return function(t){return 0>=t?0:t>=1?1:n(t)}}function Rr(n){return function(t){return 1-n(1-t)}}function Dr(n){return function(t){return.5*(.5>t?n(2*t):2-n(2-2*t))}}function Pr(n){return n*n}function Ur(n){return n*n*n}function jr(n){if(0>=n)return 0;if(n>=1)return 1;var t=n*n,e=t*n;return 4*(.5>n?e:3*(n-t)+e-.75)}function Hr(n){return function(t){return Math.pow(t,n)}}function Fr(n){return 1-Math.cos(n*Sa)}function Or(n){return Math.pow(2,10*(n-1))}function Yr(n){return 1-Math.sqrt(1-n*n)}function Ir(n,t){var e;return arguments.length<2&&(t=.45),arguments.length?e=t/wa*Math.asin(1/n):(n=1,e=t/4),function(r){return 1+n*Math.pow(2,-10*r)*Math.sin((r-e)*wa/t)}}function Zr(n){return n||(n=1.70158),function(t){return t*t*((n+1)*t-n)}}function Vr(n){return 1/2.75>n?7.5625*n*n:2/2.75>n?7.5625*(n-=1.5/2.75)*n+.75:2.5/2.75>n?7.5625*(n-=2.25/2.75)*n+.9375:7.5625*(n-=2.625/2.75)*n+.984375}function Xr(n,t){n=Zo.hcl(n),t=Zo.hcl(t);var e=n.h,r=n.c,u=n.l,i=t.h-e,o=t.c-r,a=t.l-u;return isNaN(o)&&(o=0,r=isNaN(r)?t.c:r),isNaN(i)?(i=0,e=isNaN(e)?t.h:e):i>180?i-=360:-180>i&&(i+=360),function(n){return J(e+i*n,r+o*n,u+a*n)+""}}function $r(n,t){n=Zo.hsl(n),t=Zo.hsl(t);var e=n.h,r=n.s,u=n.l,i=t.h-e,o=t.s-r,a=t.l-u;return isNaN(o)&&(o=0,r=isNaN(r)?t.s:r),isNaN(i)?(i=0,e=isNaN(e)?t.h:e):i>180?i-=360:-180>i&&(i+=360),function(n){return $(e+i*n,r+o*n,u+a*n)+""}}function Br(n,t){n=Zo.lab(n),t=Zo.lab(t);var e=n.l,r=n.a,u=n.b,i=t.l-e,o=t.a-r,a=t.b-u;return function(n){return Q(e+i*n,r+o*n,u+a*n)+""}}function Wr(n,t){return t-=n,function(e){return Math.round(n+t*e)}}function Jr(n){var t=[n.a,n.b],e=[n.c,n.d],r=Kr(t),u=Gr(t,e),i=Kr(Qr(e,t,-u))||0;t[0]*e[1]<e[0]*t[1]&&(t[0]*=-1,t[1]*=-1,r*=-1,u*=-1),this.rotate=(r?Math.atan2(t[1],t[0]):Math.atan2(-e[0],e[1]))*Ca,this.translate=[n.e,n.f],this.scale=[r,i],this.skew=i?Math.atan2(u,i)*Ca:0}function Gr(n,t){return n[0]*t[0]+n[1]*t[1]}function Kr(n){var t=Math.sqrt(Gr(n,n));return t&&(n[0]/=t,n[1]/=t),t}function Qr(n,t,e){return n[0]+=e*t[0],n[1]+=e*t[1],n}function nu(n,t){var e,r=[],u=[],i=Zo.transform(n),o=Zo.transform(t),a=i.translate,c=o.translate,s=i.rotate,l=o.rotate,f=i.skew,h=o.skew,g=i.scale,p=o.scale;return a[0]!=c[0]||a[1]!=c[1]?(r.push("translate(",null,",",null,")"),u.push({i:1,x:Nr(a[0],c[0])},{i:3,x:Nr(a[1],c[1])})):c[0]||c[1]?r.push("translate("+c+")"):r.push(""),s!=l?(s-l>180?l+=360:l-s>180&&(s+=360),u.push({i:r.push(r.pop()+"rotate(",null,")")-2,x:Nr(s,l)})):l&&r.push(r.pop()+"rotate("+l+")"),f!=h?u.push({i:r.push(r.pop()+"skewX(",null,")")-2,x:Nr(f,h)}):h&&r.push(r.pop()+"skewX("+h+")"),g[0]!=p[0]||g[1]!=p[1]?(e=r.push(r.pop()+"scale(",null,",",null,")"),u.push({i:e-4,x:Nr(g[0],p[0])},{i:e-2,x:Nr(g[1],p[1])})):(1!=p[0]||1!=p[1])&&r.push(r.pop()+"scale("+p+")"),e=u.length,function(n){for(var t,i=-1;++i<e;)r[(t=u[i]).i]=t.x(n);return r.join("")}}function tu(n,t){return t=t-(n=+n)?1/(t-n):0,function(e){return(e-n)*t}}function eu(n,t){return t=t-(n=+n)?1/(t-n):0,function(e){return Math.max(0,Math.min(1,(e-n)*t))}}function ru(n){for(var t=n.source,e=n.target,r=iu(t,e),u=[t];t!==r;)t=t.parent,u.push(t);for(var i=u.length;e!==r;)u.splice(i,0,e),e=e.parent;return u}function uu(n){for(var t=[],e=n.parent;null!=e;)t.push(n),n=e,e=e.parent;return t.push(n),t}function iu(n,t){if(n===t)return n;for(var e=uu(n),r=uu(t),u=e.pop(),i=r.pop(),o=null;u===i;)o=u,u=e.pop(),i=r.pop();return o}function ou(n){n.fixed|=2}function au(n){n.fixed&=-7}function cu(n){n.fixed|=4,n.px=n.x,n.py=n.y}function su(n){n.fixed&=-5}function lu(n,t,e){var r=0,u=0;if(n.charge=0,!n.leaf)for(var i,o=n.nodes,a=o.length,c=-1;++c<a;)i=o[c],null!=i&&(lu(i,t,e),n.charge+=i.charge,r+=i.charge*i.cx,u+=i.charge*i.cy);if(n.point){n.leaf||(n.point.x+=Math.random()-.5,n.point.y+=Math.random()-.5);var s=t*e[n.point.index];n.charge+=n.pointCharge=s,r+=s*n.point.x,u+=s*n.point.y}n.cx=r/n.charge,n.cy=u/n.charge}function fu(n,t){return Zo.rebind(n,t,"sort","children","value"),n.nodes=n,n.links=vu,n}function hu(n){return n.children}function gu(n){return n.value}function pu(n,t){return t.value-n.value}function vu(n){return Zo.merge(n.map(function(n){return(n.children||[]).map(function(t){return{source:n,target:t}})}))}function du(n){return n.x}function mu(n){return n.y}function yu(n,t,e){n.y0=t,n.y=e}function xu(n){return Zo.range(n.length)}function Mu(n){for(var t=-1,e=n[0].length,r=[];++t<e;)r[t]=0;return r}function _u(n){for(var t,e=1,r=0,u=n[0][1],i=n.length;i>e;++e)(t=n[e][1])>u&&(r=e,u=t);return r}function bu(n){return n.reduce(wu,0)}function wu(n,t){return n+t[1]}function Su(n,t){return ku(n,Math.ceil(Math.log(t.length)/Math.LN2+1))}function ku(n,t){for(var e=-1,r=+n[0],u=(n[1]-r)/t,i=[];++e<=t;)i[e]=u*e+r;return i}function Eu(n){return[Zo.min(n),Zo.max(n)]}function Au(n,t){return n.parent==t.parent?1:2}function Cu(n){var t=n.children;return t&&t.length?t[0]:n._tree.thread}function Nu(n){var t,e=n.children;return e&&(t=e.length)?e[t-1]:n._tree.thread}function Lu(n,t){var e=n.children;if(e&&(u=e.length))for(var r,u,i=-1;++i<u;)t(r=Lu(e[i],t),n)>0&&(n=r);return n}function Tu(n,t){return n.x-t.x}function qu(n,t){return t.x-n.x}function zu(n,t){return n.depth-t.depth}function Ru(n,t){function e(n,r){var u=n.children;if(u&&(o=u.length))for(var i,o,a=null,c=-1;++c<o;)i=u[c],e(i,a),a=i;t(n,r)}e(n,null)}function Du(n){for(var t,e=0,r=0,u=n.children,i=u.length;--i>=0;)t=u[i]._tree,t.prelim+=e,t.mod+=e,e+=t.shift+(r+=t.change)}function Pu(n,t,e){n=n._tree,t=t._tree;var r=e/(t.number-n.number);n.change+=r,t.change-=r,t.shift+=e,t.prelim+=e,t.mod+=e}function Uu(n,t,e){return n._tree.ancestor.parent==t.parent?n._tree.ancestor:e}function ju(n,t){return n.value-t.value}function Hu(n,t){var e=n._pack_next;n._pack_next=t,t._pack_prev=n,t._pack_next=e,e._pack_prev=t}function Fu(n,t){n._pack_next=t,t._pack_prev=n}function Ou(n,t){var e=t.x-n.x,r=t.y-n.y,u=n.r+t.r;return.999*u*u>e*e+r*r}function Yu(n){function t(n){l=Math.min(n.x-n.r,l),f=Math.max(n.x+n.r,f),h=Math.min(n.y-n.r,h),g=Math.max(n.y+n.r,g)}if((e=n.children)&&(s=e.length)){var e,r,u,i,o,a,c,s,l=1/0,f=-1/0,h=1/0,g=-1/0;if(e.forEach(Iu),r=e[0],r.x=-r.r,r.y=0,t(r),s>1&&(u=e[1],u.x=u.r,u.y=0,t(u),s>2))for(i=e[2],Xu(r,u,i),t(i),Hu(r,i),r._pack_prev=i,Hu(i,u),u=r._pack_next,o=3;s>o;o++){Xu(r,u,i=e[o]);var p=0,v=1,d=1;for(a=u._pack_next;a!==u;a=a._pack_next,v++)if(Ou(a,i)){p=1;break}if(1==p)for(c=r._pack_prev;c!==a._pack_prev&&!Ou(c,i);c=c._pack_prev,d++);p?(d>v||v==d&&u.r<r.r?Fu(r,u=a):Fu(r=c,u),o--):(Hu(r,i),u=i,t(i))}var m=(l+f)/2,y=(h+g)/2,x=0;for(o=0;s>o;o++)i=e[o],i.x-=m,i.y-=y,x=Math.max(x,i.r+Math.sqrt(i.x*i.x+i.y*i.y));n.r=x,e.forEach(Zu)}}function Iu(n){n._pack_next=n._pack_prev=n}function Zu(n){delete n._pack_next,delete n._pack_prev}function Vu(n,t,e,r){var u=n.children;if(n.x=t+=r*n.x,n.y=e+=r*n.y,n.r*=r,u)for(var i=-1,o=u.length;++i<o;)Vu(u[i],t,e,r)}function Xu(n,t,e){var r=n.r+e.r,u=t.x-n.x,i=t.y-n.y;if(r&&(u||i)){var o=t.r+e.r,a=u*u+i*i;o*=o,r*=r;var c=.5+(r-o)/(2*a),s=Math.sqrt(Math.max(0,2*o*(r+a)-(r-=a)*r-o*o))/(2*a);e.x=n.x+c*u+s*i,e.y=n.y+c*i-s*u}else e.x=n.x+r,e.y=n.y}function $u(n){return 1+Zo.max(n,function(n){return n.y})}function Bu(n){return n.reduce(function(n,t){return n+t.x},0)/n.length}function Wu(n){var t=n.children;return t&&t.length?Wu(t[0]):n}function Ju(n){var t,e=n.children;return e&&(t=e.length)?Ju(e[t-1]):n}function Gu(n){return{x:n.x,y:n.y,dx:n.dx,dy:n.dy}}function Ku(n,t){var e=n.x+t[3],r=n.y+t[0],u=n.dx-t[1]-t[3],i=n.dy-t[0]-t[2];return 0>u&&(e+=u/2,u=0),0>i&&(r+=i/2,i=0),{x:e,y:r,dx:u,dy:i}}function Qu(n){var t=n[0],e=n[n.length-1];return e>t?[t,e]:[e,t]}function ni(n){return n.rangeExtent?n.rangeExtent():Qu(n.range())}function ti(n,t,e,r){var u=e(n[0],n[1]),i=r(t[0],t[1]);return function(n){return i(u(n))}}function ei(n,t){var e,r=0,u=n.length-1,i=n[r],o=n[u];return i>o&&(e=r,r=u,u=e,e=i,i=o,o=e),n[r]=t.floor(i),n[u]=t.ceil(o),n}function ri(n){return n?{floor:function(t){return Math.floor(t/n)*n},ceil:function(t){return Math.ceil(t/n)*n}}:os}function ui(n,t,e,r){var u=[],i=[],o=0,a=Math.min(n.length,t.length)-1;for(n[a]<n[0]&&(n=n.slice().reverse(),t=t.slice().reverse());++o<=a;)u.push(e(n[o-1],n[o])),i.push(r(t[o-1],t[o]));return function(t){var e=Zo.bisect(n,t,1,a)-1;return i[e](u[e](t))}}function ii(n,t,e,r){function u(){var u=Math.min(n.length,t.length)>2?ui:ti,c=r?eu:tu;return o=u(n,t,c,e),a=u(t,n,c,Tr),i}function i(n){return o(n)}var o,a;return i.invert=function(n){return a(n)},i.domain=function(t){return arguments.length?(n=t.map(Number),u()):n},i.range=function(n){return arguments.length?(t=n,u()):t},i.rangeRound=function(n){return i.range(n).interpolate(Wr)},i.clamp=function(n){return arguments.length?(r=n,u()):r},i.interpolate=function(n){return arguments.length?(e=n,u()):e},i.ticks=function(t){return si(n,t)},i.tickFormat=function(t,e){return li(n,t,e)},i.nice=function(t){return ai(n,t),u()},i.copy=function(){return ii(n,t,e,r)},u()}function oi(n,t){return Zo.rebind(n,t,"range","rangeRound","interpolate","clamp")}function ai(n,t){return ei(n,ri(ci(n,t)[2]))}function ci(n,t){null==t&&(t=10);var e=Qu(n),r=e[1]-e[0],u=Math.pow(10,Math.floor(Math.log(r/t)/Math.LN10)),i=t/r*u;return.15>=i?u*=10:.35>=i?u*=5:.75>=i&&(u*=2),e[0]=Math.ceil(e[0]/u)*u,e[1]=Math.floor(e[1]/u)*u+.5*u,e[2]=u,e}function si(n,t){return Zo.range.apply(Zo,ci(n,t))}function li(n,t,e){var r=-Math.floor(Math.log(ci(n,t)[2])/Math.LN10+.01);return Zo.format(e?e.replace(tc,function(n,t,e,u,i,o,a,c,s,l){return[t,e,u,i,o,a,c,s||"."+(r-2*("%"===l)),l].join("")}):",."+r+"f")}function fi(n,t,e,r){function u(n){return(e?Math.log(0>n?0:n):-Math.log(n>0?0:-n))/Math.log(t)}function i(n){return e?Math.pow(t,n):-Math.pow(t,-n)}function o(t){return n(u(t))}return o.invert=function(t){return i(n.invert(t))},o.domain=function(t){return arguments.length?(e=t[0]>=0,n.domain((r=t.map(Number)).map(u)),o):r},o.base=function(e){return arguments.length?(t=+e,n.domain(r.map(u)),o):t},o.nice=function(){var t=ei(r.map(u),e?Math:cs);return n.domain(t),r=t.map(i),o},o.ticks=function(){var n=Qu(r),o=[],a=n[0],c=n[1],s=Math.floor(u(a)),l=Math.ceil(u(c)),f=t%1?2:t;if(isFinite(l-s)){if(e){for(;l>s;s++)for(var h=1;f>h;h++)o.push(i(s)*h);o.push(i(s))}else for(o.push(i(s));s++<l;)for(var h=f-1;h>0;h--)o.push(i(s)*h);for(s=0;o[s]<a;s++);for(l=o.length;o[l-1]>c;l--);o=o.slice(s,l)}return o},o.tickFormat=function(n,t){if(!arguments.length)return as;arguments.length<2?t=as:"function"!=typeof t&&(t=Zo.format(t));var r,a=Math.max(.1,n/o.ticks().length),c=e?(r=1e-12,Math.ceil):(r=-1e-12,Math.floor);return function(n){return n/i(c(u(n)+r))<=a?t(n):""}},o.copy=function(){return fi(n.copy(),t,e,r)},oi(o,n)}function hi(n,t,e){function r(t){return n(u(t))}var u=gi(t),i=gi(1/t);return r.invert=function(t){return i(n.invert(t))},r.domain=function(t){return arguments.length?(n.domain((e=t.map(Number)).map(u)),r):e},r.ticks=function(n){return si(e,n)},r.tickFormat=function(n,t){return li(e,n,t)},r.nice=function(n){return r.domain(ai(e,n))},r.exponent=function(o){return arguments.length?(u=gi(t=o),i=gi(1/t),n.domain(e.map(u)),r):t},r.copy=function(){return hi(n.copy(),t,e)},oi(r,n)}function gi(n){return function(t){return 0>t?-Math.pow(-t,n):Math.pow(t,n)}}function pi(n,t){function e(e){return o[((i.get(e)||"range"===t.t&&i.set(e,n.push(e)))-1)%o.length]}function r(t,e){return Zo.range(n.length).map(function(n){return t+e*n})}var i,o,a;return e.domain=function(r){if(!arguments.length)return n;n=[],i=new u;for(var o,a=-1,c=r.length;++a<c;)i.has(o=r[a])||i.set(o,n.push(o));return e[t.t].apply(e,t.a)},e.range=function(n){return arguments.length?(o=n,a=0,t={t:"range",a:arguments},e):o},e.rangePoints=function(u,i){arguments.length<2&&(i=0);var c=u[0],s=u[1],l=(s-c)/(Math.max(1,n.length-1)+i);return o=r(n.length<2?(c+s)/2:c+l*i/2,l),a=0,t={t:"rangePoints",a:arguments},e},e.rangeBands=function(u,i,c){arguments.length<2&&(i=0),arguments.length<3&&(c=i);var s=u[1]<u[0],l=u[s-0],f=u[1-s],h=(f-l)/(n.length-i+2*c);return o=r(l+h*c,h),s&&o.reverse(),a=h*(1-i),t={t:"rangeBands",a:arguments},e},e.rangeRoundBands=function(u,i,c){arguments.length<2&&(i=0),arguments.length<3&&(c=i);var s=u[1]<u[0],l=u[s-0],f=u[1-s],h=Math.floor((f-l)/(n.length-i+2*c)),g=f-l-(n.length-i)*h;return o=r(l+Math.round(g/2),h),s&&o.reverse(),a=Math.round(h*(1-i)),t={t:"rangeRoundBands",a:arguments},e},e.rangeBand=function(){return a},e.rangeExtent=function(){return Qu(t.a[0])},e.copy=function(){return pi(n,t)},e.domain(n)}function vi(n,t){function e(){var e=0,i=t.length;for(u=[];++e<i;)u[e-1]=Zo.quantile(n,e/i);return r}function r(n){return isNaN(n=+n)?void 0:t[Zo.bisect(u,n)]}var u;return r.domain=function(t){return arguments.length?(n=t.filter(function(n){return!isNaN(n)}).sort(Zo.ascending),e()):n},r.range=function(n){return arguments.length?(t=n,e()):t},r.quantiles=function(){return u},r.invertExtent=function(e){return e=t.indexOf(e),0>e?[0/0,0/0]:[e>0?u[e-1]:n[0],e<u.length?u[e]:n[n.length-1]]},r.copy=function(){return vi(n,t)},e()}function di(n,t,e){function r(t){return e[Math.max(0,Math.min(o,Math.floor(i*(t-n))))]}function u(){return i=e.length/(t-n),o=e.length-1,r}var i,o;return r.domain=function(e){return arguments.length?(n=+e[0],t=+e[e.length-1],u()):[n,t]},r.range=function(n){return arguments.length?(e=n,u()):e},r.invertExtent=function(t){return t=e.indexOf(t),t=0>t?0/0:t/i+n,[t,t+1/i]},r.copy=function(){return di(n,t,e)},u()}function mi(n,t){function e(e){return e>=e?t[Zo.bisect(n,e)]:void 0}return e.domain=function(t){return arguments.length?(n=t,e):n},e.range=function(n){return arguments.length?(t=n,e):t},e.invertExtent=function(e){return e=t.indexOf(e),[n[e-1],n[e]]},e.copy=function(){return mi(n,t)},e}function yi(n){function t(n){return+n}return t.invert=t,t.domain=t.range=function(e){return arguments.length?(n=e.map(t),t):n},t.ticks=function(t){return si(n,t)},t.tickFormat=function(t,e){return li(n,t,e)},t.copy=function(){return yi(n)},t}function xi(n){return n.innerRadius}function Mi(n){return n.outerRadius}function _i(n){return n.startAngle}function bi(n){return n.endAngle}function wi(n){function t(t){function o(){s.push("M",i(n(l),a))}for(var c,s=[],l=[],f=-1,h=t.length,g=pt(e),p=pt(r);++f<h;)u.call(this,c=t[f],f)?l.push([+g.call(this,c,f),+p.call(this,c,f)]):l.length&&(o(),l=[]);return l.length&&o(),s.length?s.join(""):null}var e=Ie,r=Ze,u=Zt,i=Si,o=i.key,a=.7;return t.x=function(n){return arguments.length?(e=n,t):e},t.y=function(n){return arguments.length?(r=n,t):r},t.defined=function(n){return arguments.length?(u=n,t):u},t.interpolate=function(n){return arguments.length?(o="function"==typeof n?i=n:(i=vs.get(n)||Si).key,t):o},t.tension=function(n){return arguments.length?(a=n,t):a},t}function Si(n){return n.join("L")}function ki(n){return Si(n)+"Z"}function Ei(n){for(var t=0,e=n.length,r=n[0],u=[r[0],",",r[1]];++t<e;)u.push("H",(r[0]+(r=n[t])[0])/2,"V",r[1]);return e>1&&u.push("H",r[0]),u.join("")}function Ai(n){for(var t=0,e=n.length,r=n[0],u=[r[0],",",r[1]];++t<e;)u.push("V",(r=n[t])[1],"H",r[0]);return u.join("")}function Ci(n){for(var t=0,e=n.length,r=n[0],u=[r[0],",",r[1]];++t<e;)u.push("H",(r=n[t])[0],"V",r[1]);return u.join("")}function Ni(n,t){return n.length<4?Si(n):n[1]+qi(n.slice(1,n.length-1),zi(n,t))}function Li(n,t){return n.length<3?Si(n):n[0]+qi((n.push(n[0]),n),zi([n[n.length-2]].concat(n,[n[1]]),t))}function Ti(n,t){return n.length<3?Si(n):n[0]+qi(n,zi(n,t))}function qi(n,t){if(t.length<1||n.length!=t.length&&n.length!=t.length+2)return Si(n);var e=n.length!=t.length,r="",u=n[0],i=n[1],o=t[0],a=o,c=1;if(e&&(r+="Q"+(i[0]-2*o[0]/3)+","+(i[1]-2*o[1]/3)+","+i[0]+","+i[1],u=n[1],c=2),t.length>1){a=t[1],i=n[c],c++,r+="C"+(u[0]+o[0])+","+(u[1]+o[1])+","+(i[0]-a[0])+","+(i[1]-a[1])+","+i[0]+","+i[1];for(var s=2;s<t.length;s++,c++)i=n[c],a=t[s],r+="S"+(i[0]-a[0])+","+(i[1]-a[1])+","+i[0]+","+i[1]}if(e){var l=n[c];r+="Q"+(i[0]+2*a[0]/3)+","+(i[1]+2*a[1]/3)+","+l[0]+","+l[1]}return r}function zi(n,t){for(var e,r=[],u=(1-t)/2,i=n[0],o=n[1],a=1,c=n.length;++a<c;)e=i,i=o,o=n[a],r.push([u*(o[0]-e[0]),u*(o[1]-e[1])]);return r}function Ri(n){if(n.length<3)return Si(n);var t=1,e=n.length,r=n[0],u=r[0],i=r[1],o=[u,u,u,(r=n[1])[0]],a=[i,i,i,r[1]],c=[u,",",i,"L",ji(ys,o),",",ji(ys,a)];for(n.push(n[e-1]);++t<=e;)r=n[t],o.shift(),o.push(r[0]),a.shift(),a.push(r[1]),Hi(c,o,a);return n.pop(),c.push("L",r),c.join("")}function Di(n){if(n.length<4)return Si(n);for(var t,e=[],r=-1,u=n.length,i=[0],o=[0];++r<3;)t=n[r],i.push(t[0]),o.push(t[1]);for(e.push(ji(ys,i)+","+ji(ys,o)),--r;++r<u;)t=n[r],i.shift(),i.push(t[0]),o.shift(),o.push(t[1]),Hi(e,i,o);return e.join("")}function Pi(n){for(var t,e,r=-1,u=n.length,i=u+4,o=[],a=[];++r<4;)e=n[r%u],o.push(e[0]),a.push(e[1]);for(t=[ji(ys,o),",",ji(ys,a)],--r;++r<i;)e=n[r%u],o.shift(),o.push(e[0]),a.shift(),a.push(e[1]),Hi(t,o,a);return t.join("")}function Ui(n,t){var e=n.length-1;if(e)for(var r,u,i=n[0][0],o=n[0][1],a=n[e][0]-i,c=n[e][1]-o,s=-1;++s<=e;)r=n[s],u=s/e,r[0]=t*r[0]+(1-t)*(i+u*a),r[1]=t*r[1]+(1-t)*(o+u*c);return Ri(n)}function ji(n,t){return n[0]*t[0]+n[1]*t[1]+n[2]*t[2]+n[3]*t[3]}function Hi(n,t,e){n.push("C",ji(ds,t),",",ji(ds,e),",",ji(ms,t),",",ji(ms,e),",",ji(ys,t),",",ji(ys,e))}function Fi(n,t){return(t[1]-n[1])/(t[0]-n[0])}function Oi(n){for(var t=0,e=n.length-1,r=[],u=n[0],i=n[1],o=r[0]=Fi(u,i);++t<e;)r[t]=(o+(o=Fi(u=i,i=n[t+1])))/2;return r[t]=o,r}function Yi(n){for(var t,e,r,u,i=[],o=Oi(n),a=-1,c=n.length-1;++a<c;)t=Fi(n[a],n[a+1]),ua(t)<ka?o[a]=o[a+1]=0:(e=o[a]/t,r=o[a+1]/t,u=e*e+r*r,u>9&&(u=3*t/Math.sqrt(u),o[a]=u*e,o[a+1]=u*r));for(a=-1;++a<=c;)u=(n[Math.min(c,a+1)][0]-n[Math.max(0,a-1)][0])/(6*(1+o[a]*o[a])),i.push([u||0,o[a]*u||0]);return i}function Ii(n){return n.length<3?Si(n):n[0]+qi(n,Yi(n))}function Zi(n){for(var t,e,r,u=-1,i=n.length;++u<i;)t=n[u],e=t[0],r=t[1]+gs,t[0]=e*Math.cos(r),t[1]=e*Math.sin(r);return n}function Vi(n){function t(t){function c(){v.push("M",a(n(m),f),l,s(n(d.reverse()),f),"Z")}for(var h,g,p,v=[],d=[],m=[],y=-1,x=t.length,M=pt(e),_=pt(u),b=e===r?function(){return g}:pt(r),w=u===i?function(){return p}:pt(i);++y<x;)o.call(this,h=t[y],y)?(d.push([g=+M.call(this,h,y),p=+_.call(this,h,y)]),m.push([+b.call(this,h,y),+w.call(this,h,y)])):d.length&&(c(),d=[],m=[]);return d.length&&c(),v.length?v.join(""):null}var e=Ie,r=Ie,u=0,i=Ze,o=Zt,a=Si,c=a.key,s=a,l="L",f=.7;return t.x=function(n){return arguments.length?(e=r=n,t):r},t.x0=function(n){return arguments.length?(e=n,t):e},t.x1=function(n){return arguments.length?(r=n,t):r},t.y=function(n){return arguments.length?(u=i=n,t):i},t.y0=function(n){return arguments.length?(u=n,t):u},t.y1=function(n){return arguments.length?(i=n,t):i},t.defined=function(n){return arguments.length?(o=n,t):o},t.interpolate=function(n){return arguments.length?(c="function"==typeof n?a=n:(a=vs.get(n)||Si).key,s=a.reverse||a,l=a.closed?"M":"L",t):c},t.tension=function(n){return arguments.length?(f=n,t):f},t}function Xi(n){return n.radius}function $i(n){return[n.x,n.y]}function Bi(n){return function(){var t=n.apply(this,arguments),e=t[0],r=t[1]+gs;return[e*Math.cos(r),e*Math.sin(r)]}}function Wi(){return 64}function Ji(){return"circle"}function Gi(n){var t=Math.sqrt(n/ba);return"M0,"+t+"A"+t+","+t+" 0 1,1 0,"+-t+"A"+t+","+t+" 0 1,1 0,"+t+"Z"}function Ki(n,t){return sa(n,Ss),n.id=t,n}function Qi(n,t,e,r){var u=n.id;return C(n,"function"==typeof e?function(n,i,o){n.__transition__[u].tween.set(t,r(e.call(n,n.__data__,i,o)))}:(e=r(e),function(n){n.__transition__[u].tween.set(t,e)}))}function no(n){return null==n&&(n=""),function(){this.textContent=n}}function to(n,t,e,r){var i=n.__transition__||(n.__transition__={active:0,count:0}),o=i[e];if(!o){var a=r.time;o=i[e]={tween:new u,time:a,ease:r.ease,delay:r.delay,duration:r.duration},++i.count,Zo.timer(function(r){function u(r){return i.active>e?s():(i.active=e,o.event&&o.event.start.call(n,l,t),o.tween.forEach(function(e,r){(r=r.call(n,l,t))&&v.push(r)}),Zo.timer(function(){return p.c=c(r||1)?Zt:c,1},0,a),void 0)}function c(r){if(i.active!==e)return s();for(var u=r/g,a=f(u),c=v.length;c>0;)v[--c].call(n,a);return u>=1?(o.event&&o.event.end.call(n,l,t),s()):void 0}function s(){return--i.count?delete i[e]:delete n.__transition__,1}var l=n.__data__,f=o.ease,h=o.delay,g=o.duration,p=Ba,v=[];return p.t=h+a,r>=h?u(r-h):(p.c=u,void 0)},0,a)}}function eo(n,t){n.attr("transform",function(n){return"translate("+t(n)+",0)"})}function ro(n,t){n.attr("transform",function(n){return"translate(0,"+t(n)+")"})}function uo(){this._=new Date(arguments.length>1?Date.UTC.apply(this,arguments):arguments[0])}function io(n,t,e){function r(t){var e=n(t),r=i(e,1);return r-t>t-e?e:r}function u(e){return t(e=n(new Ts(e-1)),1),e}function i(n,e){return t(n=new Ts(+n),e),n}function o(n,r,i){var o=u(n),a=[];if(i>1)for(;r>o;)e(o)%i||a.push(new Date(+o)),t(o,1);else for(;r>o;)a.push(new Date(+o)),t(o,1);return a}function a(n,t,e){try{Ts=uo;var r=new uo;return r._=n,o(r,t,e)}finally{Ts=Date}}n.floor=n,n.round=r,n.ceil=u,n.offset=i,n.range=o;var c=n.utc=oo(n);return c.floor=c,c.round=oo(r),c.ceil=oo(u),c.offset=oo(i),c.range=a,n}function oo(n){return function(t,e){try{Ts=uo;var r=new uo;return r._=t,n(r,e)._}finally{Ts=Date}}}function ao(n){function t(t){for(var r,u,i,o=[],a=-1,c=0;++a<e;)37===n.charCodeAt(a)&&(o.push(n.substring(c,a)),null!=(u=Js[r=n.charAt(++a)])&&(r=n.charAt(++a)),(i=Gs[r])&&(r=i(t,null==u?"e"===r?" ":"0":u)),o.push(r),c=a+1);return o.push(n.substring(c,a)),o.join("")}var e=n.length;return t.parse=function(t){var e={y:1900,m:0,d:1,H:0,M:0,S:0,L:0,Z:null},r=co(e,n,t,0);if(r!=t.length)return null;"p"in e&&(e.H=e.H%12+12*e.p);var u=null!=e.Z&&Ts!==uo,i=new(u?uo:Ts);return"j"in e?i.setFullYear(e.y,0,e.j):"w"in e&&("W"in e||"U"in e)?(i.setFullYear(e.y,0,1),i.setFullYear(e.y,0,"W"in e?(e.w+6)%7+7*e.W-(i.getDay()+5)%7:e.w+7*e.U-(i.getDay()+6)%7)):i.setFullYear(e.y,e.m,e.d),i.setHours(e.H+Math.floor(e.Z/100),e.M+e.Z%100,e.S,e.L),u?i._:i},t.toString=function(){return n},t}function co(n,t,e,r){for(var u,i,o,a=0,c=t.length,s=e.length;c>a;){if(r>=s)return-1;if(u=t.charCodeAt(a++),37===u){if(o=t.charAt(a++),i=Ks[o in Js?t.charAt(a++):o],!i||(r=i(n,e,r))<0)return-1}else if(u!=e.charCodeAt(r++))return-1}return r}function so(n){return new RegExp("^(?:"+n.map(Zo.requote).join("|")+")","i")}function lo(n){for(var t=new u,e=-1,r=n.length;++e<r;)t.set(n[e].toLowerCase(),e);return t}function fo(n,t,e){var r=0>n?"-":"",u=(r?-n:n)+"",i=u.length;return r+(e>i?new Array(e-i+1).join(t)+u:u)}function ho(n,t,e){Is.lastIndex=0;var r=Is.exec(t.substring(e));return r?(n.w=Zs.get(r[0].toLowerCase()),e+r[0].length):-1}function go(n,t,e){Os.lastIndex=0;var r=Os.exec(t.substring(e));return r?(n.w=Ys.get(r[0].toLowerCase()),e+r[0].length):-1}function po(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+1));return r?(n.w=+r[0],e+r[0].length):-1}function vo(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e));return r?(n.U=+r[0],e+r[0].length):-1}function mo(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e));return r?(n.W=+r[0],e+r[0].length):-1}function yo(n,t,e){$s.lastIndex=0;var r=$s.exec(t.substring(e));return r?(n.m=Bs.get(r[0].toLowerCase()),e+r[0].length):-1}function xo(n,t,e){Vs.lastIndex=0;var r=Vs.exec(t.substring(e));return r?(n.m=Xs.get(r[0].toLowerCase()),e+r[0].length):-1}function Mo(n,t,e){return co(n,Gs.c.toString(),t,e)}function _o(n,t,e){return co(n,Gs.x.toString(),t,e)}function bo(n,t,e){return co(n,Gs.X.toString(),t,e)}function wo(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+4));return r?(n.y=+r[0],e+r[0].length):-1}function So(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+2));return r?(n.y=Eo(+r[0]),e+r[0].length):-1}function ko(n,t,e){return/^[+-]\d{4}$/.test(t=t.substring(e,e+5))?(n.Z=+t,e+5):-1}function Eo(n){return n+(n>68?1900:2e3)}function Ao(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+2));return r?(n.m=r[0]-1,e+r[0].length):-1}function Co(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+2));return r?(n.d=+r[0],e+r[0].length):-1}function No(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+3));return r?(n.j=+r[0],e+r[0].length):-1}function Lo(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+2));return r?(n.H=+r[0],e+r[0].length):-1}function To(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+2));return r?(n.M=+r[0],e+r[0].length):-1}function qo(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+2));return r?(n.S=+r[0],e+r[0].length):-1}function zo(n,t,e){Qs.lastIndex=0;var r=Qs.exec(t.substring(e,e+3));return r?(n.L=+r[0],e+r[0].length):-1}function Ro(n,t,e){var r=nl.get(t.substring(e,e+=2).toLowerCase());return null==r?-1:(n.p=r,e)}function Do(n){var t=n.getTimezoneOffset(),e=t>0?"-":"+",r=~~(ua(t)/60),u=ua(t)%60;return e+fo(r,"0",2)+fo(u,"0",2)}function Po(n,t,e){Ws.lastIndex=0;var r=Ws.exec(t.substring(e,e+1));return r?e+r[0].length:-1}function Uo(n){function t(n){try{Ts=uo;var t=new Ts;return t._=n,e(t)}finally{Ts=Date}}var e=ao(n);return t.parse=function(n){try{Ts=uo;var t=e.parse(n);return t&&t._}finally{Ts=Date}},t.toString=e.toString,t}function jo(n){return n.toISOString()}function Ho(n,t,e){function r(t){return n(t)}function u(n,e){var r=n[1]-n[0],u=r/e,i=Zo.bisect(el,u);return i==el.length?[t.year,ci(n.map(function(n){return n/31536e6}),e)[2]]:i?t[u/el[i-1]<el[i]/u?i-1:i]:[ol,ci(n,e)[2]]}return r.invert=function(t){return Fo(n.invert(t))},r.domain=function(t){return arguments.length?(n.domain(t),r):n.domain().map(Fo)},r.nice=function(n,t){function e(e){return!isNaN(e)&&!n.range(e,Fo(+e+1),t).length}var i=r.domain(),o=Qu(i),a=null==n?u(o,10):"number"==typeof n&&u(o,n);return a&&(n=a[0],t=a[1]),r.domain(ei(i,t>1?{floor:function(t){for(;e(t=n.floor(t));)t=Fo(t-1);return t},ceil:function(t){for(;e(t=n.ceil(t));)t=Fo(+t+1);return t}}:n))},r.ticks=function(n,t){var e=Qu(r.domain()),i=null==n?u(e,10):"number"==typeof n?u(e,n):!n.range&&[{range:n},t];return i&&(n=i[0],t=i[1]),n.range(e[0],Fo(+e[1]+1),1>t?1:t)},r.tickFormat=function(){return e},r.copy=function(){return Ho(n.copy(),t,e)},oi(r,n)}function Fo(n){return new Date(n)}function Oo(n){return function(t){for(var e=n.length-1,r=n[e];!r[1](t);)r=n[--e];return r[0](t)}}function Yo(n){return JSON.parse(n.responseText)}function Io(n){var t=$o.createRange();return t.selectNode($o.body),t.createContextualFragment(n.responseText)}var Zo={version:"3.3.8"};Date.now||(Date.now=function(){return+new Date});var Vo=[].slice,Xo=function(n){return Vo.call(n)},$o=document,Bo=$o.documentElement,Wo=window;try{Xo(Bo.childNodes)[0].nodeType}catch(Jo){Xo=function(n){for(var t=n.length,e=new Array(t);t--;)e[t]=n[t];return e}}try{$o.createElement("div").style.setProperty("opacity",0,"")}catch(Go){var Ko=Wo.Element.prototype,Qo=Ko.setAttribute,na=Ko.setAttributeNS,ta=Wo.CSSStyleDeclaration.prototype,ea=ta.setProperty;Ko.setAttribute=function(n,t){Qo.call(this,n,t+"")},Ko.setAttributeNS=function(n,t,e){na.call(this,n,t,e+"")},ta.setProperty=function(n,t,e){ea.call(this,n,t+"",e)}}Zo.ascending=function(n,t){return t>n?-1:n>t?1:n>=t?0:0/0},Zo.descending=function(n,t){return n>t?-1:t>n?1:t>=n?0:0/0},Zo.min=function(n,t){var e,r,u=-1,i=n.length;if(1===arguments.length){for(;++u<i&&!(null!=(e=n[u])&&e>=e);)e=void 0;for(;++u<i;)null!=(r=n[u])&&e>r&&(e=r)}else{for(;++u<i&&!(null!=(e=t.call(n,n[u],u))&&e>=e);)e=void 0;for(;++u<i;)null!=(r=t.call(n,n[u],u))&&e>r&&(e=r)}return e},Zo.max=function(n,t){var e,r,u=-1,i=n.length;if(1===arguments.length){for(;++u<i&&!(null!=(e=n[u])&&e>=e);)e=void 0;for(;++u<i;)null!=(r=n[u])&&r>e&&(e=r)}else{for(;++u<i&&!(null!=(e=t.call(n,n[u],u))&&e>=e);)e=void 0;for(;++u<i;)null!=(r=t.call(n,n[u],u))&&r>e&&(e=r)}return e},Zo.extent=function(n,t){var e,r,u,i=-1,o=n.length;if(1===arguments.length){for(;++i<o&&!(null!=(e=u=n[i])&&e>=e);)e=u=void 0;for(;++i<o;)null!=(r=n[i])&&(e>r&&(e=r),r>u&&(u=r))}else{for(;++i<o&&!(null!=(e=u=t.call(n,n[i],i))&&e>=e);)e=void 0;for(;++i<o;)null!=(r=t.call(n,n[i],i))&&(e>r&&(e=r),r>u&&(u=r))}return[e,u]},Zo.sum=function(n,t){var e,r=0,u=n.length,i=-1;if(1===arguments.length)for(;++i<u;)isNaN(e=+n[i])||(r+=e);else for(;++i<u;)isNaN(e=+t.call(n,n[i],i))||(r+=e);return r},Zo.mean=function(t,e){var r,u=t.length,i=0,o=-1,a=0;if(1===arguments.length)for(;++o<u;)n(r=t[o])&&(i+=(r-i)/++a);else for(;++o<u;)n(r=e.call(t,t[o],o))&&(i+=(r-i)/++a);return a?i:void 0},Zo.quantile=function(n,t){var e=(n.length-1)*t+1,r=Math.floor(e),u=+n[r-1],i=e-r;return i?u+i*(n[r]-u):u},Zo.median=function(t,e){return arguments.length>1&&(t=t.map(e)),t=t.filter(n),t.length?Zo.quantile(t.sort(Zo.ascending),.5):void 0},Zo.bisector=function(n){return{left:function(t,e,r,u){for(arguments.length<3&&(r=0),arguments.length<4&&(u=t.length);u>r;){var i=r+u>>>1;
n.call(t,t[i],i)<e?r=i+1:u=i}return r},right:function(t,e,r,u){for(arguments.length<3&&(r=0),arguments.length<4&&(u=t.length);u>r;){var i=r+u>>>1;e<n.call(t,t[i],i)?u=i:r=i+1}return r}}};var ra=Zo.bisector(function(n){return n});Zo.bisectLeft=ra.left,Zo.bisect=Zo.bisectRight=ra.right,Zo.shuffle=function(n){for(var t,e,r=n.length;r;)e=0|Math.random()*r--,t=n[r],n[r]=n[e],n[e]=t;return n},Zo.permute=function(n,t){for(var e=t.length,r=new Array(e);e--;)r[e]=n[t[e]];return r},Zo.pairs=function(n){for(var t,e=0,r=n.length-1,u=n[0],i=new Array(0>r?0:r);r>e;)i[e]=[t=u,u=n[++e]];return i},Zo.zip=function(){if(!(u=arguments.length))return[];for(var n=-1,e=Zo.min(arguments,t),r=new Array(e);++n<e;)for(var u,i=-1,o=r[n]=new Array(u);++i<u;)o[i]=arguments[i][n];return r},Zo.transpose=function(n){return Zo.zip.apply(Zo,n)},Zo.keys=function(n){var t=[];for(var e in n)t.push(e);return t},Zo.values=function(n){var t=[];for(var e in n)t.push(n[e]);return t},Zo.entries=function(n){var t=[];for(var e in n)t.push({key:e,value:n[e]});return t},Zo.merge=function(n){for(var t,e,r,u=n.length,i=-1,o=0;++i<u;)o+=n[i].length;for(e=new Array(o);--u>=0;)for(r=n[u],t=r.length;--t>=0;)e[--o]=r[t];return e};var ua=Math.abs;Zo.range=function(n,t,r){if(arguments.length<3&&(r=1,arguments.length<2&&(t=n,n=0)),1/0===(t-n)/r)throw new Error("infinite range");var u,i=[],o=e(ua(r)),a=-1;if(n*=o,t*=o,r*=o,0>r)for(;(u=n+r*++a)>t;)i.push(u/o);else for(;(u=n+r*++a)<t;)i.push(u/o);return i},Zo.map=function(n){var t=new u;if(n instanceof u)n.forEach(function(n,e){t.set(n,e)});else for(var e in n)t.set(e,n[e]);return t},r(u,{has:function(n){return ia+n in this},get:function(n){return this[ia+n]},set:function(n,t){return this[ia+n]=t},remove:function(n){return n=ia+n,n in this&&delete this[n]},keys:function(){var n=[];return this.forEach(function(t){n.push(t)}),n},values:function(){var n=[];return this.forEach(function(t,e){n.push(e)}),n},entries:function(){var n=[];return this.forEach(function(t,e){n.push({key:t,value:e})}),n},forEach:function(n){for(var t in this)t.charCodeAt(0)===oa&&n.call(this,t.substring(1),this[t])}});var ia="\x00",oa=ia.charCodeAt(0);Zo.nest=function(){function n(t,a,c){if(c>=o.length)return r?r.call(i,a):e?a.sort(e):a;for(var s,l,f,h,g=-1,p=a.length,v=o[c++],d=new u;++g<p;)(h=d.get(s=v(l=a[g])))?h.push(l):d.set(s,[l]);return t?(l=t(),f=function(e,r){l.set(e,n(t,r,c))}):(l={},f=function(e,r){l[e]=n(t,r,c)}),d.forEach(f),l}function t(n,e){if(e>=o.length)return n;var r=[],u=a[e++];return n.forEach(function(n,u){r.push({key:n,values:t(u,e)})}),u?r.sort(function(n,t){return u(n.key,t.key)}):r}var e,r,i={},o=[],a=[];return i.map=function(t,e){return n(e,t,0)},i.entries=function(e){return t(n(Zo.map,e,0),0)},i.key=function(n){return o.push(n),i},i.sortKeys=function(n){return a[o.length-1]=n,i},i.sortValues=function(n){return e=n,i},i.rollup=function(n){return r=n,i},i},Zo.set=function(n){var t=new i;if(n)for(var e=0,r=n.length;r>e;++e)t.add(n[e]);return t},r(i,{has:function(n){return ia+n in this},add:function(n){return this[ia+n]=!0,n},remove:function(n){return n=ia+n,n in this&&delete this[n]},values:function(){var n=[];return this.forEach(function(t){n.push(t)}),n},forEach:function(n){for(var t in this)t.charCodeAt(0)===oa&&n.call(this,t.substring(1))}}),Zo.behavior={},Zo.rebind=function(n,t){for(var e,r=1,u=arguments.length;++r<u;)n[e=arguments[r]]=o(n,t,t[e]);return n};var aa=["webkit","ms","moz","Moz","o","O"];Zo.dispatch=function(){for(var n=new s,t=-1,e=arguments.length;++t<e;)n[arguments[t]]=l(n);return n},s.prototype.on=function(n,t){var e=n.indexOf("."),r="";if(e>=0&&(r=n.substring(e+1),n=n.substring(0,e)),n)return arguments.length<2?this[n].on(r):this[n].on(r,t);if(2===arguments.length){if(null==t)for(n in this)this.hasOwnProperty(n)&&this[n].on(r,null);return this}},Zo.event=null,Zo.requote=function(n){return n.replace(ca,"\\$&")};var ca=/[\\\^\$\*\+\?\|\[\]\(\)\.\{\}]/g,sa={}.__proto__?function(n,t){n.__proto__=t}:function(n,t){for(var e in t)n[e]=t[e]},la=function(n,t){return t.querySelector(n)},fa=function(n,t){return t.querySelectorAll(n)},ha=Bo[a(Bo,"matchesSelector")],ga=function(n,t){return ha.call(n,t)};"function"==typeof Sizzle&&(la=function(n,t){return Sizzle(n,t)[0]||null},fa=function(n,t){return Sizzle.uniqueSort(Sizzle(n,t))},ga=Sizzle.matchesSelector),Zo.selection=function(){return ma};var pa=Zo.selection.prototype=[];pa.select=function(n){var t,e,r,u,i=[];n=v(n);for(var o=-1,a=this.length;++o<a;){i.push(t=[]),t.parentNode=(r=this[o]).parentNode;for(var c=-1,s=r.length;++c<s;)(u=r[c])?(t.push(e=n.call(u,u.__data__,c,o)),e&&"__data__"in u&&(e.__data__=u.__data__)):t.push(null)}return p(i)},pa.selectAll=function(n){var t,e,r=[];n=d(n);for(var u=-1,i=this.length;++u<i;)for(var o=this[u],a=-1,c=o.length;++a<c;)(e=o[a])&&(r.push(t=Xo(n.call(e,e.__data__,a,u))),t.parentNode=e);return p(r)};var va={svg:"http://www.w3.org/2000/svg",xhtml:"http://www.w3.org/1999/xhtml",xlink:"http://www.w3.org/1999/xlink",xml:"http://www.w3.org/XML/1998/namespace",xmlns:"http://www.w3.org/2000/xmlns/"};Zo.ns={prefix:va,qualify:function(n){var t=n.indexOf(":"),e=n;return t>=0&&(e=n.substring(0,t),n=n.substring(t+1)),va.hasOwnProperty(e)?{space:va[e],local:n}:n}},pa.attr=function(n,t){if(arguments.length<2){if("string"==typeof n){var e=this.node();return n=Zo.ns.qualify(n),n.local?e.getAttributeNS(n.space,n.local):e.getAttribute(n)}for(t in n)this.each(m(t,n[t]));return this}return this.each(m(n,t))},pa.classed=function(n,t){if(arguments.length<2){if("string"==typeof n){var e=this.node(),r=(n=n.trim().split(/^|\s+/g)).length,u=-1;if(t=e.classList){for(;++u<r;)if(!t.contains(n[u]))return!1}else for(t=e.getAttribute("class");++u<r;)if(!x(n[u]).test(t))return!1;return!0}for(t in n)this.each(M(t,n[t]));return this}return this.each(M(n,t))},pa.style=function(n,t,e){var r=arguments.length;if(3>r){if("string"!=typeof n){2>r&&(t="");for(e in n)this.each(b(e,n[e],t));return this}if(2>r)return Wo.getComputedStyle(this.node(),null).getPropertyValue(n);e=""}return this.each(b(n,t,e))},pa.property=function(n,t){if(arguments.length<2){if("string"==typeof n)return this.node()[n];for(t in n)this.each(w(t,n[t]));return this}return this.each(w(n,t))},pa.text=function(n){return arguments.length?this.each("function"==typeof n?function(){var t=n.apply(this,arguments);this.textContent=null==t?"":t}:null==n?function(){this.textContent=""}:function(){this.textContent=n}):this.node().textContent},pa.html=function(n){return arguments.length?this.each("function"==typeof n?function(){var t=n.apply(this,arguments);this.innerHTML=null==t?"":t}:null==n?function(){this.innerHTML=""}:function(){this.innerHTML=n}):this.node().innerHTML},pa.append=function(n){return n=S(n),this.select(function(){return this.appendChild(n.apply(this,arguments))})},pa.insert=function(n,t){return n=S(n),t=v(t),this.select(function(){return this.insertBefore(n.apply(this,arguments),t.apply(this,arguments)||null)})},pa.remove=function(){return this.each(function(){var n=this.parentNode;n&&n.removeChild(this)})},pa.data=function(n,t){function e(n,e){var r,i,o,a=n.length,f=e.length,h=Math.min(a,f),g=new Array(f),p=new Array(f),v=new Array(a);if(t){var d,m=new u,y=new u,x=[];for(r=-1;++r<a;)d=t.call(i=n[r],i.__data__,r),m.has(d)?v[r]=i:m.set(d,i),x.push(d);for(r=-1;++r<f;)d=t.call(e,o=e[r],r),(i=m.get(d))?(g[r]=i,i.__data__=o):y.has(d)||(p[r]=k(o)),y.set(d,o),m.remove(d);for(r=-1;++r<a;)m.has(x[r])&&(v[r]=n[r])}else{for(r=-1;++r<h;)i=n[r],o=e[r],i?(i.__data__=o,g[r]=i):p[r]=k(o);for(;f>r;++r)p[r]=k(e[r]);for(;a>r;++r)v[r]=n[r]}p.update=g,p.parentNode=g.parentNode=v.parentNode=n.parentNode,c.push(p),s.push(g),l.push(v)}var r,i,o=-1,a=this.length;if(!arguments.length){for(n=new Array(a=(r=this[0]).length);++o<a;)(i=r[o])&&(n[o]=i.__data__);return n}var c=N([]),s=p([]),l=p([]);if("function"==typeof n)for(;++o<a;)e(r=this[o],n.call(r,r.parentNode.__data__,o));else for(;++o<a;)e(r=this[o],n);return s.enter=function(){return c},s.exit=function(){return l},s},pa.datum=function(n){return arguments.length?this.property("__data__",n):this.property("__data__")},pa.filter=function(n){var t,e,r,u=[];"function"!=typeof n&&(n=E(n));for(var i=0,o=this.length;o>i;i++){u.push(t=[]),t.parentNode=(e=this[i]).parentNode;for(var a=0,c=e.length;c>a;a++)(r=e[a])&&n.call(r,r.__data__,a)&&t.push(r)}return p(u)},pa.order=function(){for(var n=-1,t=this.length;++n<t;)for(var e,r=this[n],u=r.length-1,i=r[u];--u>=0;)(e=r[u])&&(i&&i!==e.nextSibling&&i.parentNode.insertBefore(e,i),i=e);return this},pa.sort=function(n){n=A.apply(this,arguments);for(var t=-1,e=this.length;++t<e;)this[t].sort(n);return this.order()},pa.each=function(n){return C(this,function(t,e,r){n.call(t,t.__data__,e,r)})},pa.call=function(n){var t=Xo(arguments);return n.apply(t[0]=this,t),this},pa.empty=function(){return!this.node()},pa.node=function(){for(var n=0,t=this.length;t>n;n++)for(var e=this[n],r=0,u=e.length;u>r;r++){var i=e[r];if(i)return i}return null},pa.size=function(){var n=0;return this.each(function(){++n}),n};var da=[];Zo.selection.enter=N,Zo.selection.enter.prototype=da,da.append=pa.append,da.empty=pa.empty,da.node=pa.node,da.call=pa.call,da.size=pa.size,da.select=function(n){for(var t,e,r,u,i,o=[],a=-1,c=this.length;++a<c;){r=(u=this[a]).update,o.push(t=[]),t.parentNode=u.parentNode;for(var s=-1,l=u.length;++s<l;)(i=u[s])?(t.push(r[s]=e=n.call(u.parentNode,i.__data__,s,a)),e.__data__=i.__data__):t.push(null)}return p(o)},da.insert=function(n,t){return arguments.length<2&&(t=L(this)),pa.insert.call(this,n,t)},pa.transition=function(){for(var n,t,e=Ms||++ks,r=[],u=_s||{time:Date.now(),ease:jr,delay:0,duration:250},i=-1,o=this.length;++i<o;){r.push(n=[]);for(var a=this[i],c=-1,s=a.length;++c<s;)(t=a[c])&&to(t,c,e,u),n.push(t)}return Ki(r,e)},pa.interrupt=function(){return this.each(T)},Zo.select=function(n){var t=["string"==typeof n?la(n,$o):n];return t.parentNode=Bo,p([t])},Zo.selectAll=function(n){var t=Xo("string"==typeof n?fa(n,$o):n);return t.parentNode=Bo,p([t])};var ma=Zo.select(Bo);pa.on=function(n,t,e){var r=arguments.length;if(3>r){if("string"!=typeof n){2>r&&(t=!1);for(e in n)this.each(q(e,n[e],t));return this}if(2>r)return(r=this.node()["__on"+n])&&r._;e=!1}return this.each(q(n,t,e))};var ya=Zo.map({mouseenter:"mouseover",mouseleave:"mouseout"});ya.forEach(function(n){"on"+n in $o&&ya.remove(n)});var xa=a(Bo.style,"userSelect"),Ma=0;Zo.mouse=function(n){return P(n,h())};var _a=/WebKit/.test(Wo.navigator.userAgent)?-1:0;Zo.touches=function(n,t){return arguments.length<2&&(t=h().touches),t?Xo(t).map(function(t){var e=P(n,t);return e.identifier=t.identifier,e}):[]},Zo.behavior.drag=function(){function n(){this.on("mousedown.drag",o).on("touchstart.drag",a)}function t(){return Zo.event.changedTouches[0].identifier}function e(n,t){return Zo.touches(n).filter(function(n){return n.identifier===t})[0]}function r(n,t,e,r){return function(){function o(){var n=t(l,g),e=n[0]-v[0],r=n[1]-v[1];d|=e|r,v=n,f({type:"drag",x:n[0]+c[0],y:n[1]+c[1],dx:e,dy:r})}function a(){m.on(e+"."+p,null).on(r+"."+p,null),y(d&&Zo.event.target===h),f({type:"dragend"})}var c,s=this,l=s.parentNode,f=u.of(s,arguments),h=Zo.event.target,g=n(),p=null==g?"drag":"drag-"+g,v=t(l,g),d=0,m=Zo.select(Wo).on(e+"."+p,o).on(r+"."+p,a),y=D();i?(c=i.apply(s,arguments),c=[c.x-v[0],c.y-v[1]]):c=[0,0],f({type:"dragstart"})}}var u=g(n,"drag","dragstart","dragend"),i=null,o=r(c,Zo.mouse,"mousemove","mouseup"),a=r(t,e,"touchmove","touchend");return n.origin=function(t){return arguments.length?(i=t,n):i},Zo.rebind(n,u,"on")};var ba=Math.PI,wa=2*ba,Sa=ba/2,ka=1e-6,Ea=ka*ka,Aa=ba/180,Ca=180/ba,Na=Math.SQRT2,La=2,Ta=4;Zo.interpolateZoom=function(n,t){function e(n){var t=n*y;if(m){var e=O(v),o=i/(La*h)*(e*Y(Na*t+v)-F(v));return[r+o*s,u+o*l,i*e/O(Na*t+v)]}return[r+n*s,u+n*l,i*Math.exp(Na*t)]}var r=n[0],u=n[1],i=n[2],o=t[0],a=t[1],c=t[2],s=o-r,l=a-u,f=s*s+l*l,h=Math.sqrt(f),g=(c*c-i*i+Ta*f)/(2*i*La*h),p=(c*c-i*i-Ta*f)/(2*c*La*h),v=Math.log(Math.sqrt(g*g+1)-g),d=Math.log(Math.sqrt(p*p+1)-p),m=d-v,y=(m||Math.log(c/i))/Na;return e.duration=1e3*y,e},Zo.behavior.zoom=function(){function n(n){n.on(A,s).on(Ra+".zoom",h).on(C,p).on("dblclick.zoom",v).on(L,l)}function t(n){return[(n[0]-S.x)/S.k,(n[1]-S.y)/S.k]}function e(n){return[n[0]*S.k+S.x,n[1]*S.k+S.y]}function r(n){S.k=Math.max(E[0],Math.min(E[1],n))}function u(n,t){t=e(t),S.x+=n[0]-t[0],S.y+=n[1]-t[1]}function i(){_&&_.domain(M.range().map(function(n){return(n-S.x)/S.k}).map(M.invert)),w&&w.domain(b.range().map(function(n){return(n-S.y)/S.k}).map(b.invert))}function o(n){n({type:"zoomstart"})}function a(n){i(),n({type:"zoom",scale:S.k,translate:[S.x,S.y]})}function c(n){n({type:"zoomend"})}function s(){function n(){l=1,u(Zo.mouse(r),h),a(i)}function e(){f.on(C,Wo===r?p:null).on(N,null),g(l&&Zo.event.target===s),c(i)}var r=this,i=q.of(r,arguments),s=Zo.event.target,l=0,f=Zo.select(Wo).on(C,n).on(N,e),h=t(Zo.mouse(r)),g=D();T.call(r),o(i)}function l(){function n(){var n=Zo.touches(p);return g=S.k,n.forEach(function(n){n.identifier in d&&(d[n.identifier]=t(n))}),n}function e(){for(var t=Zo.event.changedTouches,e=0,i=t.length;i>e;++e)d[t[e].identifier]=null;var o=n(),c=Date.now();if(1===o.length){if(500>c-x){var s=o[0],l=d[s.identifier];r(2*S.k),u(s,l),f(),a(v)}x=c}else if(o.length>1){var s=o[0],h=o[1],g=s[0]-h[0],p=s[1]-h[1];m=g*g+p*p}}function i(){for(var n,t,e,i,o=Zo.touches(p),c=0,s=o.length;s>c;++c,i=null)if(e=o[c],i=d[e.identifier]){if(t)break;n=e,t=i}if(i){var l=(l=e[0]-n[0])*l+(l=e[1]-n[1])*l,f=m&&Math.sqrt(l/m);n=[(n[0]+e[0])/2,(n[1]+e[1])/2],t=[(t[0]+i[0])/2,(t[1]+i[1])/2],r(f*g)}x=null,u(n,t),a(v)}function h(){if(Zo.event.touches.length){for(var t=Zo.event.changedTouches,e=0,r=t.length;r>e;++e)delete d[t[e].identifier];for(var u in d)return void n()}b.on(M,null).on(_,null),w.on(A,s).on(L,l),k(),c(v)}var g,p=this,v=q.of(p,arguments),d={},m=0,y=Zo.event.changedTouches[0].identifier,M="touchmove.zoom-"+y,_="touchend.zoom-"+y,b=Zo.select(Wo).on(M,i).on(_,h),w=Zo.select(p).on(A,null).on(L,e),k=D();T.call(p),e(),o(v)}function h(){var n=q.of(this,arguments);y?clearTimeout(y):(T.call(this),o(n)),y=setTimeout(function(){y=null,c(n)},50),f();var e=m||Zo.mouse(this);d||(d=t(e)),r(Math.pow(2,.002*qa())*S.k),u(e,d),a(n)}function p(){d=null}function v(){var n=q.of(this,arguments),e=Zo.mouse(this),i=t(e),s=Math.log(S.k)/Math.LN2;o(n),r(Math.pow(2,Zo.event.shiftKey?Math.ceil(s)-1:Math.floor(s)+1)),u(e,i),a(n),c(n)}var d,m,y,x,M,_,b,w,S={x:0,y:0,k:1},k=[960,500],E=za,A="mousedown.zoom",C="mousemove.zoom",N="mouseup.zoom",L="touchstart.zoom",q=g(n,"zoomstart","zoom","zoomend");return n.event=function(n){n.each(function(){var n=q.of(this,arguments),t=S;Ms?Zo.select(this).transition().each("start.zoom",function(){S=this.__chart__||{x:0,y:0,k:1},o(n)}).tween("zoom:zoom",function(){var e=k[0],r=k[1],u=e/2,i=r/2,o=Zo.interpolateZoom([(u-S.x)/S.k,(i-S.y)/S.k,e/S.k],[(u-t.x)/t.k,(i-t.y)/t.k,e/t.k]);return function(t){var r=o(t),c=e/r[2];this.__chart__=S={x:u-r[0]*c,y:i-r[1]*c,k:c},a(n)}}).each("end.zoom",function(){c(n)}):(this.__chart__=S,o(n),a(n),c(n))})},n.translate=function(t){return arguments.length?(S={x:+t[0],y:+t[1],k:S.k},i(),n):[S.x,S.y]},n.scale=function(t){return arguments.length?(S={x:S.x,y:S.y,k:+t},i(),n):S.k},n.scaleExtent=function(t){return arguments.length?(E=null==t?za:[+t[0],+t[1]],n):E},n.center=function(t){return arguments.length?(m=t&&[+t[0],+t[1]],n):m},n.size=function(t){return arguments.length?(k=t&&[+t[0],+t[1]],n):k},n.x=function(t){return arguments.length?(_=t,M=t.copy(),S={x:0,y:0,k:1},n):_},n.y=function(t){return arguments.length?(w=t,b=t.copy(),S={x:0,y:0,k:1},n):w},Zo.rebind(n,q,"on")};var qa,za=[0,1/0],Ra="onwheel"in $o?(qa=function(){return-Zo.event.deltaY*(Zo.event.deltaMode?120:1)},"wheel"):"onmousewheel"in $o?(qa=function(){return Zo.event.wheelDelta},"mousewheel"):(qa=function(){return-Zo.event.detail},"MozMousePixelScroll");Z.prototype.toString=function(){return this.rgb()+""},Zo.hsl=function(n,t,e){return 1===arguments.length?n instanceof X?V(n.h,n.s,n.l):st(""+n,lt,V):V(+n,+t,+e)};var Da=X.prototype=new Z;Da.brighter=function(n){return n=Math.pow(.7,arguments.length?n:1),V(this.h,this.s,this.l/n)},Da.darker=function(n){return n=Math.pow(.7,arguments.length?n:1),V(this.h,this.s,n*this.l)},Da.rgb=function(){return $(this.h,this.s,this.l)},Zo.hcl=function(n,t,e){return 1===arguments.length?n instanceof W?B(n.h,n.c,n.l):n instanceof K?nt(n.l,n.a,n.b):nt((n=ft((n=Zo.rgb(n)).r,n.g,n.b)).l,n.a,n.b):B(+n,+t,+e)};var Pa=W.prototype=new Z;Pa.brighter=function(n){return B(this.h,this.c,Math.min(100,this.l+Ua*(arguments.length?n:1)))},Pa.darker=function(n){return B(this.h,this.c,Math.max(0,this.l-Ua*(arguments.length?n:1)))},Pa.rgb=function(){return J(this.h,this.c,this.l).rgb()},Zo.lab=function(n,t,e){return 1===arguments.length?n instanceof K?G(n.l,n.a,n.b):n instanceof W?J(n.l,n.c,n.h):ft((n=Zo.rgb(n)).r,n.g,n.b):G(+n,+t,+e)};var Ua=18,ja=.95047,Ha=1,Fa=1.08883,Oa=K.prototype=new Z;Oa.brighter=function(n){return G(Math.min(100,this.l+Ua*(arguments.length?n:1)),this.a,this.b)},Oa.darker=function(n){return G(Math.max(0,this.l-Ua*(arguments.length?n:1)),this.a,this.b)},Oa.rgb=function(){return Q(this.l,this.a,this.b)},Zo.rgb=function(n,t,e){return 1===arguments.length?n instanceof at?ot(n.r,n.g,n.b):st(""+n,ot,$):ot(~~n,~~t,~~e)};var Ya=at.prototype=new Z;Ya.brighter=function(n){n=Math.pow(.7,arguments.length?n:1);var t=this.r,e=this.g,r=this.b,u=30;return t||e||r?(t&&u>t&&(t=u),e&&u>e&&(e=u),r&&u>r&&(r=u),ot(Math.min(255,~~(t/n)),Math.min(255,~~(e/n)),Math.min(255,~~(r/n)))):ot(u,u,u)},Ya.darker=function(n){return n=Math.pow(.7,arguments.length?n:1),ot(~~(n*this.r),~~(n*this.g),~~(n*this.b))},Ya.hsl=function(){return lt(this.r,this.g,this.b)},Ya.toString=function(){return"#"+ct(this.r)+ct(this.g)+ct(this.b)};var Ia=Zo.map({aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074});Ia.forEach(function(n,t){Ia.set(n,ut(t))}),Zo.functor=pt,Zo.xhr=dt(vt),Zo.dsv=function(n,t){function e(n,e,i){arguments.length<3&&(i=e,e=null);var o=Zo.xhr(n,t,i);return o.row=function(n){return arguments.length?o.response(null==(e=n)?r:u(n)):e},o.row(e)}function r(n){return e.parse(n.responseText)}function u(n){return function(t){return e.parse(t.responseText,n)}}function o(t){return t.map(a).join(n)}function a(n){return c.test(n)?'"'+n.replace(/\"/g,'""')+'"':n}var c=new RegExp('["'+n+"\n]"),s=n.charCodeAt(0);return e.parse=function(n,t){var r;return e.parseRows(n,function(n,e){if(r)return r(n,e-1);var u=new Function("d","return {"+n.map(function(n,t){return JSON.stringify(n)+": d["+t+"]"}).join(",")+"}");r=t?function(n,e){return t(u(n),e)}:u})},e.parseRows=function(n,t){function e(){if(l>=c)return o;if(u)return u=!1,i;var t=l;if(34===n.charCodeAt(t)){for(var e=t;e++<c;)if(34===n.charCodeAt(e)){if(34!==n.charCodeAt(e+1))break;++e}l=e+2;var r=n.charCodeAt(e+1);return 13===r?(u=!0,10===n.charCodeAt(e+2)&&++l):10===r&&(u=!0),n.substring(t+1,e).replace(/""/g,'"')}for(;c>l;){var r=n.charCodeAt(l++),a=1;if(10===r)u=!0;else if(13===r)u=!0,10===n.charCodeAt(l)&&(++l,++a);else if(r!==s)continue;return n.substring(t,l-a)}return n.substring(t)}for(var r,u,i={},o={},a=[],c=n.length,l=0,f=0;(r=e())!==o;){for(var h=[];r!==i&&r!==o;)h.push(r),r=e();(!t||(h=t(h,f++)))&&a.push(h)}return a},e.format=function(t){if(Array.isArray(t[0]))return e.formatRows(t);var r=new i,u=[];return t.forEach(function(n){for(var t in n)r.has(t)||u.push(r.add(t))}),[u.map(a).join(n)].concat(t.map(function(t){return u.map(function(n){return a(t[n])}).join(n)})).join("\n")},e.formatRows=function(n){return n.map(o).join("\n")},e},Zo.csv=Zo.dsv(",","text/csv"),Zo.tsv=Zo.dsv("	","text/tab-separated-values");var Za,Va,Xa,$a,Ba,Wa=Wo[a(Wo,"requestAnimationFrame")]||function(n){setTimeout(n,17)};Zo.timer=function(n,t,e){var r=arguments.length;2>r&&(t=0),3>r&&(e=Date.now());var u=e+t,i={c:n,t:u,f:!1,n:null};Va?Va.n=i:Za=i,Va=i,Xa||($a=clearTimeout($a),Xa=1,Wa(xt))},Zo.timer.flush=function(){Mt(),_t()};var Ja=".",Ga=",",Ka=[3,3],Qa="$",nc=["y","z","a","f","p","n","\xb5","m","","k","M","G","T","P","E","Z","Y"].map(bt);Zo.formatPrefix=function(n,t){var e=0;return n&&(0>n&&(n*=-1),t&&(n=Zo.round(n,wt(n,t))),e=1+Math.floor(1e-12+Math.log(n)/Math.LN10),e=Math.max(-24,Math.min(24,3*Math.floor((0>=e?e+1:e-1)/3)))),nc[8+e/3]},Zo.round=function(n,t){return t?Math.round(n*(t=Math.pow(10,t)))/t:Math.round(n)},Zo.format=function(n){var t=tc.exec(n),e=t[1]||" ",r=t[2]||">",u=t[3]||"",i=t[4]||"",o=t[5],a=+t[6],c=t[7],s=t[8],l=t[9],f=1,h="",g=!1;switch(s&&(s=+s.substring(1)),(o||"0"===e&&"="===r)&&(o=e="0",r="=",c&&(a-=Math.floor((a-1)/4))),l){case"n":c=!0,l="g";break;case"%":f=100,h="%",l="f";break;case"p":f=100,h="%",l="r";break;case"b":case"o":case"x":case"X":"#"===i&&(i="0"+l.toLowerCase());case"c":case"d":g=!0,s=0;break;case"s":f=-1,l="r"}"#"===i?i="":"$"===i&&(i=Qa),"r"!=l||s||(l="g"),null!=s&&("g"==l?s=Math.max(1,Math.min(21,s)):("e"==l||"f"==l)&&(s=Math.max(0,Math.min(20,s)))),l=ec.get(l)||St;var p=o&&c;return function(n){if(g&&n%1)return"";var t=0>n||0===n&&0>1/n?(n=-n,"-"):u;if(0>f){var v=Zo.formatPrefix(n,s);n=v.scale(n),h=v.symbol}else n*=f;n=l(n,s);var d=n.lastIndexOf("."),m=0>d?n:n.substring(0,d),y=0>d?"":Ja+n.substring(d+1);!o&&c&&(m=rc(m));var x=i.length+m.length+y.length+(p?0:t.length),M=a>x?new Array(x=a-x+1).join(e):"";return p&&(m=rc(M+m)),t+=i,n=m+y,("<"===r?t+n+M:">"===r?M+t+n:"^"===r?M.substring(0,x>>=1)+t+n+M.substring(x):t+(p?n:M+n))+h}};var tc=/(?:([^{])?([<>=^]))?([+\- ])?([$#])?(0)?(\d+)?(,)?(\.-?\d+)?([a-z%])?/i,ec=Zo.map({b:function(n){return n.toString(2)},c:function(n){return String.fromCharCode(n)},o:function(n){return n.toString(8)},x:function(n){return n.toString(16)},X:function(n){return n.toString(16).toUpperCase()},g:function(n,t){return n.toPrecision(t)},e:function(n,t){return n.toExponential(t)},f:function(n,t){return n.toFixed(t)},r:function(n,t){return(n=Zo.round(n,wt(n,t))).toFixed(Math.max(0,Math.min(20,wt(n*(1+1e-15),t))))}}),rc=vt;if(Ka){var uc=Ka.length;rc=function(n){for(var t=n.length,e=[],r=0,u=Ka[0];t>0&&u>0;)e.push(n.substring(t-=u,t+u)),u=Ka[r=(r+1)%uc];return e.reverse().join(Ga)}}Zo.geo={},kt.prototype={s:0,t:0,add:function(n){Et(n,this.t,ic),Et(ic.s,this.s,this),this.s?this.t+=ic.t:this.s=ic.t},reset:function(){this.s=this.t=0},valueOf:function(){return this.s}};var ic=new kt;Zo.geo.stream=function(n,t){n&&oc.hasOwnProperty(n.type)?oc[n.type](n,t):At(n,t)};var oc={Feature:function(n,t){At(n.geometry,t)},FeatureCollection:function(n,t){for(var e=n.features,r=-1,u=e.length;++r<u;)At(e[r].geometry,t)}},ac={Sphere:function(n,t){t.sphere()},Point:function(n,t){n=n.coordinates,t.point(n[0],n[1],n[2])},MultiPoint:function(n,t){for(var e=n.coordinates,r=-1,u=e.length;++r<u;)n=e[r],t.point(n[0],n[1],n[2])},LineString:function(n,t){Ct(n.coordinates,t,0)},MultiLineString:function(n,t){for(var e=n.coordinates,r=-1,u=e.length;++r<u;)Ct(e[r],t,0)},Polygon:function(n,t){Nt(n.coordinates,t)},MultiPolygon:function(n,t){for(var e=n.coordinates,r=-1,u=e.length;++r<u;)Nt(e[r],t)},GeometryCollection:function(n,t){for(var e=n.geometries,r=-1,u=e.length;++r<u;)At(e[r],t)}};Zo.geo.area=function(n){return cc=0,Zo.geo.stream(n,lc),cc};var cc,sc=new kt,lc={sphere:function(){cc+=4*ba},point:c,lineStart:c,lineEnd:c,polygonStart:function(){sc.reset(),lc.lineStart=Lt},polygonEnd:function(){var n=2*sc;cc+=0>n?4*ba+n:n,lc.lineStart=lc.lineEnd=lc.point=c}};Zo.geo.bounds=function(){function n(n,t){x.push(M=[l=n,h=n]),f>t&&(f=t),t>g&&(g=t)}function t(t,e){var r=Tt([t*Aa,e*Aa]);if(m){var u=zt(m,r),i=[u[1],-u[0],0],o=zt(i,u);Pt(o),o=Ut(o);var c=t-p,s=c>0?1:-1,v=o[0]*Ca*s,d=ua(c)>180;if(d^(v>s*p&&s*t>v)){var y=o[1]*Ca;y>g&&(g=y)}else if(v=(v+360)%360-180,d^(v>s*p&&s*t>v)){var y=-o[1]*Ca;f>y&&(f=y)}else f>e&&(f=e),e>g&&(g=e);d?p>t?a(l,t)>a(l,h)&&(h=t):a(t,h)>a(l,h)&&(l=t):h>=l?(l>t&&(l=t),t>h&&(h=t)):t>p?a(l,t)>a(l,h)&&(h=t):a(t,h)>a(l,h)&&(l=t)}else n(t,e);m=r,p=t}function e(){_.point=t}function r(){M[0]=l,M[1]=h,_.point=n,m=null}function u(n,e){if(m){var r=n-p;y+=ua(r)>180?r+(r>0?360:-360):r}else v=n,d=e;lc.point(n,e),t(n,e)}function i(){lc.lineStart()}function o(){u(v,d),lc.lineEnd(),ua(y)>ka&&(l=-(h=180)),M[0]=l,M[1]=h,m=null}function a(n,t){return(t-=n)<0?t+360:t}function c(n,t){return n[0]-t[0]}function s(n,t){return t[0]<=t[1]?t[0]<=n&&n<=t[1]:n<t[0]||t[1]<n}var l,f,h,g,p,v,d,m,y,x,M,_={point:n,lineStart:e,lineEnd:r,polygonStart:function(){_.point=u,_.lineStart=i,_.lineEnd=o,y=0,lc.polygonStart()},polygonEnd:function(){lc.polygonEnd(),_.point=n,_.lineStart=e,_.lineEnd=r,0>sc?(l=-(h=180),f=-(g=90)):y>ka?g=90:-ka>y&&(f=-90),M[0]=l,M[1]=h}};return function(n){g=h=-(l=f=1/0),x=[],Zo.geo.stream(n,_);var t=x.length;if(t){x.sort(c);for(var e,r=1,u=x[0],i=[u];t>r;++r)e=x[r],s(e[0],u)||s(e[1],u)?(a(u[0],e[1])>a(u[0],u[1])&&(u[1]=e[1]),a(e[0],u[1])>a(u[0],u[1])&&(u[0]=e[0])):i.push(u=e);for(var o,e,p=-1/0,t=i.length-1,r=0,u=i[t];t>=r;u=e,++r)e=i[r],(o=a(u[1],e[0]))>p&&(p=o,l=e[0],h=u[1])}return x=M=null,1/0===l||1/0===f?[[0/0,0/0],[0/0,0/0]]:[[l,f],[h,g]]}}(),Zo.geo.centroid=function(n){fc=hc=gc=pc=vc=dc=mc=yc=xc=Mc=_c=0,Zo.geo.stream(n,bc);var t=xc,e=Mc,r=_c,u=t*t+e*e+r*r;return Ea>u&&(t=dc,e=mc,r=yc,ka>hc&&(t=gc,e=pc,r=vc),u=t*t+e*e+r*r,Ea>u)?[0/0,0/0]:[Math.atan2(e,t)*Ca,H(r/Math.sqrt(u))*Ca]};var fc,hc,gc,pc,vc,dc,mc,yc,xc,Mc,_c,bc={sphere:c,point:Ht,lineStart:Ot,lineEnd:Yt,polygonStart:function(){bc.lineStart=It},polygonEnd:function(){bc.lineStart=Ot}},wc=Bt(Zt,Qt,te,[-ba,-ba/2]),Sc=1e9;Zo.geo.clipExtent=function(){var n,t,e,r,u,i,o={stream:function(n){return u&&(u.valid=!1),u=i(n),u.valid=!0,u},extent:function(a){return arguments.length?(i=ue(n=+a[0][0],t=+a[0][1],e=+a[1][0],r=+a[1][1]),u&&(u.valid=!1,u=null),o):[[n,t],[e,r]]}};return o.extent([[0,0],[960,500]])},(Zo.geo.conicEqualArea=function(){return oe(ae)}).raw=ae,Zo.geo.albers=function(){return Zo.geo.conicEqualArea().rotate([96,0]).center([-.6,38.7]).parallels([29.5,45.5]).scale(1070)},Zo.geo.albersUsa=function(){function n(n){var i=n[0],o=n[1];return t=null,e(i,o),t||(r(i,o),t)||u(i,o),t}var t,e,r,u,i=Zo.geo.albers(),o=Zo.geo.conicEqualArea().rotate([154,0]).center([-2,58.5]).parallels([55,65]),a=Zo.geo.conicEqualArea().rotate([157,0]).center([-3,19.9]).parallels([8,18]),c={point:function(n,e){t=[n,e]}};return n.invert=function(n){var t=i.scale(),e=i.translate(),r=(n[0]-e[0])/t,u=(n[1]-e[1])/t;return(u>=.12&&.234>u&&r>=-.425&&-.214>r?o:u>=.166&&.234>u&&r>=-.214&&-.115>r?a:i).invert(n)},n.stream=function(n){var t=i.stream(n),e=o.stream(n),r=a.stream(n);return{point:function(n,u){t.point(n,u),e.point(n,u),r.point(n,u)},sphere:function(){t.sphere(),e.sphere(),r.sphere()},lineStart:function(){t.lineStart(),e.lineStart(),r.lineStart()},lineEnd:function(){t.lineEnd(),e.lineEnd(),r.lineEnd()},polygonStart:function(){t.polygonStart(),e.polygonStart(),r.polygonStart()},polygonEnd:function(){t.polygonEnd(),e.polygonEnd(),r.polygonEnd()}}},n.precision=function(t){return arguments.length?(i.precision(t),o.precision(t),a.precision(t),n):i.precision()},n.scale=function(t){return arguments.length?(i.scale(t),o.scale(.35*t),a.scale(t),n.translate(i.translate())):i.scale()},n.translate=function(t){if(!arguments.length)return i.translate();var s=i.scale(),l=+t[0],f=+t[1];return e=i.translate(t).clipExtent([[l-.455*s,f-.238*s],[l+.455*s,f+.238*s]]).stream(c).point,r=o.translate([l-.307*s,f+.201*s]).clipExtent([[l-.425*s+ka,f+.12*s+ka],[l-.214*s-ka,f+.234*s-ka]]).stream(c).point,u=a.translate([l-.205*s,f+.212*s]).clipExtent([[l-.214*s+ka,f+.166*s+ka],[l-.115*s-ka,f+.234*s-ka]]).stream(c).point,n},n.scale(1070)};var kc,Ec,Ac,Cc,Nc,Lc,Tc={point:c,lineStart:c,lineEnd:c,polygonStart:function(){Ec=0,Tc.lineStart=ce},polygonEnd:function(){Tc.lineStart=Tc.lineEnd=Tc.point=c,kc+=ua(Ec/2)}},qc={point:se,lineStart:c,lineEnd:c,polygonStart:c,polygonEnd:c},zc={point:he,lineStart:ge,lineEnd:pe,polygonStart:function(){zc.lineStart=ve},polygonEnd:function(){zc.point=he,zc.lineStart=ge,zc.lineEnd=pe}};Zo.geo.transform=function(n){return{stream:function(t){var e=new ye(t);for(var r in n)e[r]=n[r];return e}}},ye.prototype={point:function(n,t){this.stream.point(n,t)},sphere:function(){this.stream.sphere()},lineStart:function(){this.stream.lineStart()},lineEnd:function(){this.stream.lineEnd()},polygonStart:function(){this.stream.polygonStart()},polygonEnd:function(){this.stream.polygonEnd()}},Zo.geo.path=function(){function n(n){return n&&("function"==typeof a&&i.pointRadius(+a.apply(this,arguments)),o&&o.valid||(o=u(i)),Zo.geo.stream(n,o)),i.result()}function t(){return o=null,n}var e,r,u,i,o,a=4.5;return n.area=function(n){return kc=0,Zo.geo.stream(n,u(Tc)),kc},n.centroid=function(n){return gc=pc=vc=dc=mc=yc=xc=Mc=_c=0,Zo.geo.stream(n,u(zc)),_c?[xc/_c,Mc/_c]:yc?[dc/yc,mc/yc]:vc?[gc/vc,pc/vc]:[0/0,0/0]},n.bounds=function(n){return Nc=Lc=-(Ac=Cc=1/0),Zo.geo.stream(n,u(qc)),[[Ac,Cc],[Nc,Lc]]},n.projection=function(n){return arguments.length?(u=(e=n)?n.stream||xe(n):vt,t()):e},n.context=function(n){return arguments.length?(i=null==(r=n)?new le:new de(n),"function"!=typeof a&&i.pointRadius(a),t()):r},n.pointRadius=function(t){return arguments.length?(a="function"==typeof t?t:(i.pointRadius(+t),+t),n):a},n.projection(Zo.geo.albersUsa()).context(null)},Zo.geo.projection=Me,Zo.geo.projectionMutator=_e,(Zo.geo.equirectangular=function(){return Me(we)}).raw=we.invert=we,Zo.geo.rotation=function(n){function t(t){return t=n(t[0]*Aa,t[1]*Aa),t[0]*=Ca,t[1]*=Ca,t
}return n=ke(n[0]%360*Aa,n[1]*Aa,n.length>2?n[2]*Aa:0),t.invert=function(t){return t=n.invert(t[0]*Aa,t[1]*Aa),t[0]*=Ca,t[1]*=Ca,t},t},Se.invert=we,Zo.geo.circle=function(){function n(){var n="function"==typeof r?r.apply(this,arguments):r,t=ke(-n[0]*Aa,-n[1]*Aa,0).invert,u=[];return e(null,null,1,{point:function(n,e){u.push(n=t(n,e)),n[0]*=Ca,n[1]*=Ca}}),{type:"Polygon",coordinates:[u]}}var t,e,r=[0,0],u=6;return n.origin=function(t){return arguments.length?(r=t,n):r},n.angle=function(r){return arguments.length?(e=Ne((t=+r)*Aa,u*Aa),n):t},n.precision=function(r){return arguments.length?(e=Ne(t*Aa,(u=+r)*Aa),n):u},n.angle(90)},Zo.geo.distance=function(n,t){var e,r=(t[0]-n[0])*Aa,u=n[1]*Aa,i=t[1]*Aa,o=Math.sin(r),a=Math.cos(r),c=Math.sin(u),s=Math.cos(u),l=Math.sin(i),f=Math.cos(i);return Math.atan2(Math.sqrt((e=f*o)*e+(e=s*l-c*f*a)*e),c*l+s*f*a)},Zo.geo.graticule=function(){function n(){return{type:"MultiLineString",coordinates:t()}}function t(){return Zo.range(Math.ceil(i/d)*d,u,d).map(h).concat(Zo.range(Math.ceil(s/m)*m,c,m).map(g)).concat(Zo.range(Math.ceil(r/p)*p,e,p).filter(function(n){return ua(n%d)>ka}).map(l)).concat(Zo.range(Math.ceil(a/v)*v,o,v).filter(function(n){return ua(n%m)>ka}).map(f))}var e,r,u,i,o,a,c,s,l,f,h,g,p=10,v=p,d=90,m=360,y=2.5;return n.lines=function(){return t().map(function(n){return{type:"LineString",coordinates:n}})},n.outline=function(){return{type:"Polygon",coordinates:[h(i).concat(g(c).slice(1),h(u).reverse().slice(1),g(s).reverse().slice(1))]}},n.extent=function(t){return arguments.length?n.majorExtent(t).minorExtent(t):n.minorExtent()},n.majorExtent=function(t){return arguments.length?(i=+t[0][0],u=+t[1][0],s=+t[0][1],c=+t[1][1],i>u&&(t=i,i=u,u=t),s>c&&(t=s,s=c,c=t),n.precision(y)):[[i,s],[u,c]]},n.minorExtent=function(t){return arguments.length?(r=+t[0][0],e=+t[1][0],a=+t[0][1],o=+t[1][1],r>e&&(t=r,r=e,e=t),a>o&&(t=a,a=o,o=t),n.precision(y)):[[r,a],[e,o]]},n.step=function(t){return arguments.length?n.majorStep(t).minorStep(t):n.minorStep()},n.majorStep=function(t){return arguments.length?(d=+t[0],m=+t[1],n):[d,m]},n.minorStep=function(t){return arguments.length?(p=+t[0],v=+t[1],n):[p,v]},n.precision=function(t){return arguments.length?(y=+t,l=Te(a,o,90),f=qe(r,e,y),h=Te(s,c,90),g=qe(i,u,y),n):y},n.majorExtent([[-180,-90+ka],[180,90-ka]]).minorExtent([[-180,-80-ka],[180,80+ka]])},Zo.geo.greatArc=function(){function n(){return{type:"LineString",coordinates:[t||r.apply(this,arguments),e||u.apply(this,arguments)]}}var t,e,r=ze,u=Re;return n.distance=function(){return Zo.geo.distance(t||r.apply(this,arguments),e||u.apply(this,arguments))},n.source=function(e){return arguments.length?(r=e,t="function"==typeof e?null:e,n):r},n.target=function(t){return arguments.length?(u=t,e="function"==typeof t?null:t,n):u},n.precision=function(){return arguments.length?n:0},n},Zo.geo.interpolate=function(n,t){return De(n[0]*Aa,n[1]*Aa,t[0]*Aa,t[1]*Aa)},Zo.geo.length=function(n){return Rc=0,Zo.geo.stream(n,Dc),Rc};var Rc,Dc={sphere:c,point:c,lineStart:Pe,lineEnd:c,polygonStart:c,polygonEnd:c},Pc=Ue(function(n){return Math.sqrt(2/(1+n))},function(n){return 2*Math.asin(n/2)});(Zo.geo.azimuthalEqualArea=function(){return Me(Pc)}).raw=Pc;var Uc=Ue(function(n){var t=Math.acos(n);return t&&t/Math.sin(t)},vt);(Zo.geo.azimuthalEquidistant=function(){return Me(Uc)}).raw=Uc,(Zo.geo.conicConformal=function(){return oe(je)}).raw=je,(Zo.geo.conicEquidistant=function(){return oe(He)}).raw=He;var jc=Ue(function(n){return 1/n},Math.atan);(Zo.geo.gnomonic=function(){return Me(jc)}).raw=jc,Fe.invert=function(n,t){return[n,2*Math.atan(Math.exp(t))-Sa]},(Zo.geo.mercator=function(){return Oe(Fe)}).raw=Fe;var Hc=Ue(function(){return 1},Math.asin);(Zo.geo.orthographic=function(){return Me(Hc)}).raw=Hc;var Fc=Ue(function(n){return 1/(1+n)},function(n){return 2*Math.atan(n)});(Zo.geo.stereographic=function(){return Me(Fc)}).raw=Fc,Ye.invert=function(n,t){return[Math.atan2(F(n),Math.cos(t)),H(Math.sin(t)/O(n))]},(Zo.geo.transverseMercator=function(){return Oe(Ye)}).raw=Ye,Zo.geom={},Zo.geom.hull=function(n){function t(n){if(n.length<3)return[];var t,u,i,o,a,c,s,l,f,h,g,p,v=pt(e),d=pt(r),m=n.length,y=m-1,x=[],M=[],_=0;if(v===Ie&&r===Ze)t=n;else for(i=0,t=[];m>i;++i)t.push([+v.call(this,u=n[i],i),+d.call(this,u,i)]);for(i=1;m>i;++i)(t[i][1]<t[_][1]||t[i][1]==t[_][1]&&t[i][0]<t[_][0])&&(_=i);for(i=0;m>i;++i)i!==_&&(c=t[i][1]-t[_][1],a=t[i][0]-t[_][0],x.push({angle:Math.atan2(c,a),index:i}));for(x.sort(function(n,t){return n.angle-t.angle}),g=x[0].angle,h=x[0].index,f=0,i=1;y>i;++i){if(o=x[i].index,g==x[i].angle){if(a=t[h][0]-t[_][0],c=t[h][1]-t[_][1],s=t[o][0]-t[_][0],l=t[o][1]-t[_][1],a*a+c*c>=s*s+l*l){x[i].index=-1;continue}x[f].index=-1}g=x[i].angle,f=i,h=o}for(M.push(_),i=0,o=0;2>i;++o)x[o].index>-1&&(M.push(x[o].index),i++);for(p=M.length;y>o;++o)if(!(x[o].index<0)){for(;!Ve(M[p-2],M[p-1],x[o].index,t);)--p;M[p++]=x[o].index}var b=[];for(i=p-1;i>=0;--i)b.push(n[M[i]]);return b}var e=Ie,r=Ze;return arguments.length?t(n):(t.x=function(n){return arguments.length?(e=n,t):e},t.y=function(n){return arguments.length?(r=n,t):r},t)},Zo.geom.polygon=function(n){return sa(n,Oc),n};var Oc=Zo.geom.polygon.prototype=[];Oc.area=function(){for(var n,t=-1,e=this.length,r=this[e-1],u=0;++t<e;)n=r,r=this[t],u+=n[1]*r[0]-n[0]*r[1];return.5*u},Oc.centroid=function(n){var t,e,r=-1,u=this.length,i=0,o=0,a=this[u-1];for(arguments.length||(n=-1/(6*this.area()));++r<u;)t=a,a=this[r],e=t[0]*a[1]-a[0]*t[1],i+=(t[0]+a[0])*e,o+=(t[1]+a[1])*e;return[i*n,o*n]},Oc.clip=function(n){for(var t,e,r,u,i,o,a=Be(n),c=-1,s=this.length-Be(this),l=this[s-1];++c<s;){for(t=n.slice(),n.length=0,u=this[c],i=t[(r=t.length-a)-1],e=-1;++e<r;)o=t[e],Xe(o,l,u)?(Xe(i,l,u)||n.push($e(i,o,l,u)),n.push(o)):Xe(i,l,u)&&n.push($e(i,o,l,u)),i=o;a&&n.push(n[0]),l=u}return n};var Yc,Ic,Zc,Vc,Xc,$c=[],Bc=[];er.prototype.prepare=function(){for(var n,t=this.edges,e=t.length;e--;)n=t[e].edge,n.b&&n.a||t.splice(e,1);return t.sort(ur),t.length},pr.prototype={start:function(){return this.edge.l===this.site?this.edge.a:this.edge.b},end:function(){return this.edge.l===this.site?this.edge.b:this.edge.a}},vr.prototype={insert:function(n,t){var e,r,u;if(n){if(t.P=n,t.N=n.N,n.N&&(n.N.P=t),n.N=t,n.R){for(n=n.R;n.L;)n=n.L;n.L=t}else n.R=t;e=n}else this._?(n=xr(this._),t.P=null,t.N=n,n.P=n.L=t,e=n):(t.P=t.N=null,this._=t,e=null);for(t.L=t.R=null,t.U=e,t.C=!0,n=t;e&&e.C;)r=e.U,e===r.L?(u=r.R,u&&u.C?(e.C=u.C=!1,r.C=!0,n=r):(n===e.R&&(mr(this,e),n=e,e=n.U),e.C=!1,r.C=!0,yr(this,r))):(u=r.L,u&&u.C?(e.C=u.C=!1,r.C=!0,n=r):(n===e.L&&(yr(this,e),n=e,e=n.U),e.C=!1,r.C=!0,mr(this,r))),e=n.U;this._.C=!1},remove:function(n){n.N&&(n.N.P=n.P),n.P&&(n.P.N=n.N),n.N=n.P=null;var t,e,r,u=n.U,i=n.L,o=n.R;if(e=i?o?xr(o):i:o,u?u.L===n?u.L=e:u.R=e:this._=e,i&&o?(r=e.C,e.C=n.C,e.L=i,i.U=e,e!==o?(u=e.U,e.U=n.U,n=e.R,u.L=n,e.R=o,o.U=e):(e.U=u,u=e,n=e.R)):(r=n.C,n=e),n&&(n.U=u),!r){if(n&&n.C)return n.C=!1,void 0;do{if(n===this._)break;if(n===u.L){if(t=u.R,t.C&&(t.C=!1,u.C=!0,mr(this,u),t=u.R),t.L&&t.L.C||t.R&&t.R.C){t.R&&t.R.C||(t.L.C=!1,t.C=!0,yr(this,t),t=u.R),t.C=u.C,u.C=t.R.C=!1,mr(this,u),n=this._;break}}else if(t=u.L,t.C&&(t.C=!1,u.C=!0,yr(this,u),t=u.L),t.L&&t.L.C||t.R&&t.R.C){t.L&&t.L.C||(t.R.C=!1,t.C=!0,mr(this,t),t=u.L),t.C=u.C,u.C=t.L.C=!1,yr(this,u),n=this._;break}t.C=!0,n=u,u=u.U}while(!n.C);n&&(n.C=!1)}}},Zo.geom.voronoi=function(n){function t(n){var t=new Array(n.length),r=a[0][0],u=a[0][1],i=a[1][0],o=a[1][1];return Mr(e(n),a).cells.forEach(function(e,a){var c=e.edges,s=e.site,l=t[a]=c.length?c.map(function(n){var t=n.start();return[t.x,t.y]}):s.x>=r&&s.x<=i&&s.y>=u&&s.y<=o?[[r,o],[i,o],[i,u],[r,u]]:[];l.point=n[a]}),t}function e(n){return n.map(function(n,t){return{x:Math.round(i(n,t)/ka)*ka,y:Math.round(o(n,t)/ka)*ka,i:t}})}var r=Ie,u=Ze,i=r,o=u,a=Wc;return n?t(n):(t.links=function(n){return Mr(e(n)).edges.filter(function(n){return n.l&&n.r}).map(function(t){return{source:n[t.l.i],target:n[t.r.i]}})},t.triangles=function(n){var t=[];return Mr(e(n)).cells.forEach(function(e,r){for(var u,i,o=e.site,a=e.edges.sort(ur),c=-1,s=a.length,l=a[s-1].edge,f=l.l===o?l.r:l.l;++c<s;)u=l,i=f,l=a[c].edge,f=l.l===o?l.r:l.l,r<i.i&&r<f.i&&br(o,i,f)<0&&t.push([n[r],n[i.i],n[f.i]])}),t},t.x=function(n){return arguments.length?(i=pt(r=n),t):r},t.y=function(n){return arguments.length?(o=pt(u=n),t):u},t.clipExtent=function(n){return arguments.length?(a=null==n?Wc:n,t):a===Wc?null:a},t.size=function(n){return arguments.length?t.clipExtent(n&&[[0,0],n]):a===Wc?null:a&&a[1]},t)};var Wc=[[-1e6,-1e6],[1e6,1e6]];Zo.geom.delaunay=function(n){return Zo.geom.voronoi().triangles(n)},Zo.geom.quadtree=function(n,t,e,r,u){function i(n){function i(n,t,e,r,u,i,o,a){if(!isNaN(e)&&!isNaN(r))if(n.leaf){var c=n.x,l=n.y;if(null!=c)if(ua(c-e)+ua(l-r)<.01)s(n,t,e,r,u,i,o,a);else{var f=n.point;n.x=n.y=n.point=null,s(n,f,c,l,u,i,o,a),s(n,t,e,r,u,i,o,a)}else n.x=e,n.y=r,n.point=t}else s(n,t,e,r,u,i,o,a)}function s(n,t,e,r,u,o,a,c){var s=.5*(u+a),l=.5*(o+c),f=e>=s,h=r>=l,g=(h<<1)+f;n.leaf=!1,n=n.nodes[g]||(n.nodes[g]=kr()),f?u=s:a=s,h?o=l:c=l,i(n,t,e,r,u,o,a,c)}var l,f,h,g,p,v,d,m,y,x=pt(a),M=pt(c);if(null!=t)v=t,d=e,m=r,y=u;else if(m=y=-(v=d=1/0),f=[],h=[],p=n.length,o)for(g=0;p>g;++g)l=n[g],l.x<v&&(v=l.x),l.y<d&&(d=l.y),l.x>m&&(m=l.x),l.y>y&&(y=l.y),f.push(l.x),h.push(l.y);else for(g=0;p>g;++g){var _=+x(l=n[g],g),b=+M(l,g);v>_&&(v=_),d>b&&(d=b),_>m&&(m=_),b>y&&(y=b),f.push(_),h.push(b)}var w=m-v,S=y-d;w>S?y=d+w:m=v+S;var k=kr();if(k.add=function(n){i(k,n,+x(n,++g),+M(n,g),v,d,m,y)},k.visit=function(n){Er(n,k,v,d,m,y)},g=-1,null==t){for(;++g<p;)i(k,n[g],f[g],h[g],v,d,m,y);--g}else n.forEach(k.add);return f=h=n=l=null,k}var o,a=Ie,c=Ze;return(o=arguments.length)?(a=wr,c=Sr,3===o&&(u=e,r=t,e=t=0),i(n)):(i.x=function(n){return arguments.length?(a=n,i):a},i.y=function(n){return arguments.length?(c=n,i):c},i.extent=function(n){return arguments.length?(null==n?t=e=r=u=null:(t=+n[0][0],e=+n[0][1],r=+n[1][0],u=+n[1][1]),i):null==t?null:[[t,e],[r,u]]},i.size=function(n){return arguments.length?(null==n?t=e=r=u=null:(t=e=0,r=+n[0],u=+n[1]),i):null==t?null:[r-t,u-e]},i)},Zo.interpolateRgb=Ar,Zo.interpolateObject=Cr,Zo.interpolateNumber=Nr,Zo.interpolateString=Lr;var Jc=/[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g;Zo.interpolate=Tr,Zo.interpolators=[function(n,t){var e=typeof t;return("string"===e?Ia.has(t)||/^(#|rgb\(|hsl\()/.test(t)?Ar:Lr:t instanceof Z?Ar:"object"===e?Array.isArray(t)?qr:Cr:Nr)(n,t)}],Zo.interpolateArray=qr;var Gc=function(){return vt},Kc=Zo.map({linear:Gc,poly:Hr,quad:function(){return Pr},cubic:function(){return Ur},sin:function(){return Fr},exp:function(){return Or},circle:function(){return Yr},elastic:Ir,back:Zr,bounce:function(){return Vr}}),Qc=Zo.map({"in":vt,out:Rr,"in-out":Dr,"out-in":function(n){return Dr(Rr(n))}});Zo.ease=function(n){var t=n.indexOf("-"),e=t>=0?n.substring(0,t):n,r=t>=0?n.substring(t+1):"in";return e=Kc.get(e)||Gc,r=Qc.get(r)||vt,zr(r(e.apply(null,Vo.call(arguments,1))))},Zo.interpolateHcl=Xr,Zo.interpolateHsl=$r,Zo.interpolateLab=Br,Zo.interpolateRound=Wr,Zo.transform=function(n){var t=$o.createElementNS(Zo.ns.prefix.svg,"g");return(Zo.transform=function(n){if(null!=n){t.setAttribute("transform",n);var e=t.transform.baseVal.consolidate()}return new Jr(e?e.matrix:ns)})(n)},Jr.prototype.toString=function(){return"translate("+this.translate+")rotate("+this.rotate+")skewX("+this.skew+")scale("+this.scale+")"};var ns={a:1,b:0,c:0,d:1,e:0,f:0};Zo.interpolateTransform=nu,Zo.layout={},Zo.layout.bundle=function(){return function(n){for(var t=[],e=-1,r=n.length;++e<r;)t.push(ru(n[e]));return t}},Zo.layout.chord=function(){function n(){var n,s,f,h,g,p={},v=[],d=Zo.range(i),m=[];for(e=[],r=[],n=0,h=-1;++h<i;){for(s=0,g=-1;++g<i;)s+=u[h][g];v.push(s),m.push(Zo.range(i)),n+=s}for(o&&d.sort(function(n,t){return o(v[n],v[t])}),a&&m.forEach(function(n,t){n.sort(function(n,e){return a(u[t][n],u[t][e])})}),n=(wa-l*i)/n,s=0,h=-1;++h<i;){for(f=s,g=-1;++g<i;){var y=d[h],x=m[y][g],M=u[y][x],_=s,b=s+=M*n;p[y+"-"+x]={index:y,subindex:x,startAngle:_,endAngle:b,value:M}}r[y]={index:y,startAngle:f,endAngle:s,value:(s-f)/n},s+=l}for(h=-1;++h<i;)for(g=h-1;++g<i;){var w=p[h+"-"+g],S=p[g+"-"+h];(w.value||S.value)&&e.push(w.value<S.value?{source:S,target:w}:{source:w,target:S})}c&&t()}function t(){e.sort(function(n,t){return c((n.source.value+n.target.value)/2,(t.source.value+t.target.value)/2)})}var e,r,u,i,o,a,c,s={},l=0;return s.matrix=function(n){return arguments.length?(i=(u=n)&&u.length,e=r=null,s):u},s.padding=function(n){return arguments.length?(l=n,e=r=null,s):l},s.sortGroups=function(n){return arguments.length?(o=n,e=r=null,s):o},s.sortSubgroups=function(n){return arguments.length?(a=n,e=null,s):a},s.sortChords=function(n){return arguments.length?(c=n,e&&t(),s):c},s.chords=function(){return e||n(),e},s.groups=function(){return r||n(),r},s},Zo.layout.force=function(){function n(n){return function(t,e,r,u){if(t.point!==n){var i=t.cx-n.x,o=t.cy-n.y,a=1/Math.sqrt(i*i+o*o);if(v>(u-e)*a){var c=t.charge*a*a;return n.px-=i*c,n.py-=o*c,!0}if(t.point&&isFinite(a)){var c=t.pointCharge*a*a;n.px-=i*c,n.py-=o*c}}return!t.charge}}function t(n){n.px=Zo.event.x,n.py=Zo.event.y,a.resume()}var e,r,u,i,o,a={},c=Zo.dispatch("start","tick","end"),s=[1,1],l=.9,f=ts,h=es,g=-30,p=.1,v=.8,d=[],m=[];return a.tick=function(){if((r*=.99)<.005)return c.end({type:"end",alpha:r=0}),!0;var t,e,a,f,h,v,y,x,M,_=d.length,b=m.length;for(e=0;b>e;++e)a=m[e],f=a.source,h=a.target,x=h.x-f.x,M=h.y-f.y,(v=x*x+M*M)&&(v=r*i[e]*((v=Math.sqrt(v))-u[e])/v,x*=v,M*=v,h.x-=x*(y=f.weight/(h.weight+f.weight)),h.y-=M*y,f.x+=x*(y=1-y),f.y+=M*y);if((y=r*p)&&(x=s[0]/2,M=s[1]/2,e=-1,y))for(;++e<_;)a=d[e],a.x+=(x-a.x)*y,a.y+=(M-a.y)*y;if(g)for(lu(t=Zo.geom.quadtree(d),r,o),e=-1;++e<_;)(a=d[e]).fixed||t.visit(n(a));for(e=-1;++e<_;)a=d[e],a.fixed?(a.x=a.px,a.y=a.py):(a.x-=(a.px-(a.px=a.x))*l,a.y-=(a.py-(a.py=a.y))*l);c.tick({type:"tick",alpha:r})},a.nodes=function(n){return arguments.length?(d=n,a):d},a.links=function(n){return arguments.length?(m=n,a):m},a.size=function(n){return arguments.length?(s=n,a):s},a.linkDistance=function(n){return arguments.length?(f="function"==typeof n?n:+n,a):f},a.distance=a.linkDistance,a.linkStrength=function(n){return arguments.length?(h="function"==typeof n?n:+n,a):h},a.friction=function(n){return arguments.length?(l=+n,a):l},a.charge=function(n){return arguments.length?(g="function"==typeof n?n:+n,a):g},a.gravity=function(n){return arguments.length?(p=+n,a):p},a.theta=function(n){return arguments.length?(v=+n,a):v},a.alpha=function(n){return arguments.length?(n=+n,r?r=n>0?n:0:n>0&&(c.start({type:"start",alpha:r=n}),Zo.timer(a.tick)),a):r},a.start=function(){function n(n,r){if(!e){for(e=new Array(c),a=0;c>a;++a)e[a]=[];for(a=0;s>a;++a){var u=m[a];e[u.source.index].push(u.target),e[u.target.index].push(u.source)}}for(var i,o=e[t],a=-1,s=o.length;++a<s;)if(!isNaN(i=o[a][n]))return i;return Math.random()*r}var t,e,r,c=d.length,l=m.length,p=s[0],v=s[1];for(t=0;c>t;++t)(r=d[t]).index=t,r.weight=0;for(t=0;l>t;++t)r=m[t],"number"==typeof r.source&&(r.source=d[r.source]),"number"==typeof r.target&&(r.target=d[r.target]),++r.source.weight,++r.target.weight;for(t=0;c>t;++t)r=d[t],isNaN(r.x)&&(r.x=n("x",p)),isNaN(r.y)&&(r.y=n("y",v)),isNaN(r.px)&&(r.px=r.x),isNaN(r.py)&&(r.py=r.y);if(u=[],"function"==typeof f)for(t=0;l>t;++t)u[t]=+f.call(this,m[t],t);else for(t=0;l>t;++t)u[t]=f;if(i=[],"function"==typeof h)for(t=0;l>t;++t)i[t]=+h.call(this,m[t],t);else for(t=0;l>t;++t)i[t]=h;if(o=[],"function"==typeof g)for(t=0;c>t;++t)o[t]=+g.call(this,d[t],t);else for(t=0;c>t;++t)o[t]=g;return a.resume()},a.resume=function(){return a.alpha(.1)},a.stop=function(){return a.alpha(0)},a.drag=function(){return e||(e=Zo.behavior.drag().origin(vt).on("dragstart.force",ou).on("drag.force",t).on("dragend.force",au)),arguments.length?(this.on("mouseover.force",cu).on("mouseout.force",su).call(e),void 0):e},Zo.rebind(a,c,"on")};var ts=20,es=1;Zo.layout.hierarchy=function(){function n(t,o,a){var c=u.call(e,t,o);if(t.depth=o,a.push(t),c&&(s=c.length)){for(var s,l,f=-1,h=t.children=new Array(s),g=0,p=o+1;++f<s;)l=h[f]=n(c[f],p,a),l.parent=t,g+=l.value;r&&h.sort(r),i&&(t.value=g)}else delete t.children,i&&(t.value=+i.call(e,t,o)||0);return t}function t(n,r){var u=n.children,o=0;if(u&&(a=u.length))for(var a,c=-1,s=r+1;++c<a;)o+=t(u[c],s);else i&&(o=+i.call(e,n,r)||0);return i&&(n.value=o),o}function e(t){var e=[];return n(t,0,e),e}var r=pu,u=hu,i=gu;return e.sort=function(n){return arguments.length?(r=n,e):r},e.children=function(n){return arguments.length?(u=n,e):u},e.value=function(n){return arguments.length?(i=n,e):i},e.revalue=function(n){return t(n,0),n},e},Zo.layout.partition=function(){function n(t,e,r,u){var i=t.children;if(t.x=e,t.y=t.depth*u,t.dx=r,t.dy=u,i&&(o=i.length)){var o,a,c,s=-1;for(r=t.value?r/t.value:0;++s<o;)n(a=i[s],e,c=a.value*r,u),e+=c}}function t(n){var e=n.children,r=0;if(e&&(u=e.length))for(var u,i=-1;++i<u;)r=Math.max(r,t(e[i]));return 1+r}function e(e,i){var o=r.call(this,e,i);return n(o[0],0,u[0],u[1]/t(o[0])),o}var r=Zo.layout.hierarchy(),u=[1,1];return e.size=function(n){return arguments.length?(u=n,e):u},fu(e,r)},Zo.layout.pie=function(){function n(i){var o=i.map(function(e,r){return+t.call(n,e,r)}),a=+("function"==typeof r?r.apply(this,arguments):r),c=(("function"==typeof u?u.apply(this,arguments):u)-a)/Zo.sum(o),s=Zo.range(i.length);null!=e&&s.sort(e===rs?function(n,t){return o[t]-o[n]}:function(n,t){return e(i[n],i[t])});var l=[];return s.forEach(function(n){var t;l[n]={data:i[n],value:t=o[n],startAngle:a,endAngle:a+=t*c}}),l}var t=Number,e=rs,r=0,u=wa;return n.value=function(e){return arguments.length?(t=e,n):t},n.sort=function(t){return arguments.length?(e=t,n):e},n.startAngle=function(t){return arguments.length?(r=t,n):r},n.endAngle=function(t){return arguments.length?(u=t,n):u},n};var rs={};Zo.layout.stack=function(){function n(a,c){var s=a.map(function(e,r){return t.call(n,e,r)}),l=s.map(function(t){return t.map(function(t,e){return[i.call(n,t,e),o.call(n,t,e)]})}),f=e.call(n,l,c);s=Zo.permute(s,f),l=Zo.permute(l,f);var h,g,p,v=r.call(n,l,c),d=s.length,m=s[0].length;for(g=0;m>g;++g)for(u.call(n,s[0][g],p=v[g],l[0][g][1]),h=1;d>h;++h)u.call(n,s[h][g],p+=l[h-1][g][1],l[h][g][1]);return a}var t=vt,e=xu,r=Mu,u=yu,i=du,o=mu;return n.values=function(e){return arguments.length?(t=e,n):t},n.order=function(t){return arguments.length?(e="function"==typeof t?t:us.get(t)||xu,n):e},n.offset=function(t){return arguments.length?(r="function"==typeof t?t:is.get(t)||Mu,n):r},n.x=function(t){return arguments.length?(i=t,n):i},n.y=function(t){return arguments.length?(o=t,n):o},n.out=function(t){return arguments.length?(u=t,n):u},n};var us=Zo.map({"inside-out":function(n){var t,e,r=n.length,u=n.map(_u),i=n.map(bu),o=Zo.range(r).sort(function(n,t){return u[n]-u[t]}),a=0,c=0,s=[],l=[];for(t=0;r>t;++t)e=o[t],c>a?(a+=i[e],s.push(e)):(c+=i[e],l.push(e));return l.reverse().concat(s)},reverse:function(n){return Zo.range(n.length).reverse()},"default":xu}),is=Zo.map({silhouette:function(n){var t,e,r,u=n.length,i=n[0].length,o=[],a=0,c=[];for(e=0;i>e;++e){for(t=0,r=0;u>t;t++)r+=n[t][e][1];r>a&&(a=r),o.push(r)}for(e=0;i>e;++e)c[e]=(a-o[e])/2;return c},wiggle:function(n){var t,e,r,u,i,o,a,c,s,l=n.length,f=n[0],h=f.length,g=[];for(g[0]=c=s=0,e=1;h>e;++e){for(t=0,u=0;l>t;++t)u+=n[t][e][1];for(t=0,i=0,a=f[e][0]-f[e-1][0];l>t;++t){for(r=0,o=(n[t][e][1]-n[t][e-1][1])/(2*a);t>r;++r)o+=(n[r][e][1]-n[r][e-1][1])/a;i+=o*n[t][e][1]}g[e]=c-=u?i/u*a:0,s>c&&(s=c)}for(e=0;h>e;++e)g[e]-=s;return g},expand:function(n){var t,e,r,u=n.length,i=n[0].length,o=1/u,a=[];for(e=0;i>e;++e){for(t=0,r=0;u>t;t++)r+=n[t][e][1];if(r)for(t=0;u>t;t++)n[t][e][1]/=r;else for(t=0;u>t;t++)n[t][e][1]=o}for(e=0;i>e;++e)a[e]=0;return a},zero:Mu});Zo.layout.histogram=function(){function n(n,i){for(var o,a,c=[],s=n.map(e,this),l=r.call(this,s,i),f=u.call(this,l,s,i),i=-1,h=s.length,g=f.length-1,p=t?1:1/h;++i<g;)o=c[i]=[],o.dx=f[i+1]-(o.x=f[i]),o.y=0;if(g>0)for(i=-1;++i<h;)a=s[i],a>=l[0]&&a<=l[1]&&(o=c[Zo.bisect(f,a,1,g)-1],o.y+=p,o.push(n[i]));return c}var t=!0,e=Number,r=Eu,u=Su;return n.value=function(t){return arguments.length?(e=t,n):e},n.range=function(t){return arguments.length?(r=pt(t),n):r},n.bins=function(t){return arguments.length?(u="number"==typeof t?function(n){return ku(n,t)}:pt(t),n):u},n.frequency=function(e){return arguments.length?(t=!!e,n):t},n},Zo.layout.tree=function(){function n(n,i){function o(n,t){var r=n.children,u=n._tree;if(r&&(i=r.length)){for(var i,a,s,l=r[0],f=l,h=-1;++h<i;)s=r[h],o(s,a),f=c(s,a,f),a=s;Du(n);var g=.5*(l._tree.prelim+s._tree.prelim);t?(u.prelim=t._tree.prelim+e(n,t),u.mod=u.prelim-g):u.prelim=g}else t&&(u.prelim=t._tree.prelim+e(n,t))}function a(n,t){n.x=n._tree.prelim+t;var e=n.children;if(e&&(r=e.length)){var r,u=-1;for(t+=n._tree.mod;++u<r;)a(e[u],t)}}function c(n,t,r){if(t){for(var u,i=n,o=n,a=t,c=n.parent.children[0],s=i._tree.mod,l=o._tree.mod,f=a._tree.mod,h=c._tree.mod;a=Nu(a),i=Cu(i),a&&i;)c=Cu(c),o=Nu(o),o._tree.ancestor=n,u=a._tree.prelim+f-i._tree.prelim-s+e(a,i),u>0&&(Pu(Uu(a,n,r),n,u),s+=u,l+=u),f+=a._tree.mod,s+=i._tree.mod,h+=c._tree.mod,l+=o._tree.mod;a&&!Nu(o)&&(o._tree.thread=a,o._tree.mod+=f-l),i&&!Cu(c)&&(c._tree.thread=i,c._tree.mod+=s-h,r=n)}return r}var s=t.call(this,n,i),l=s[0];Ru(l,function(n,t){n._tree={ancestor:n,prelim:0,mod:0,change:0,shift:0,number:t?t._tree.number+1:0}}),o(l),a(l,-l._tree.prelim);var f=Lu(l,qu),h=Lu(l,Tu),g=Lu(l,zu),p=f.x-e(f,h)/2,v=h.x+e(h,f)/2,d=g.depth||1;return Ru(l,u?function(n){n.x*=r[0],n.y=n.depth*r[1],delete n._tree}:function(n){n.x=(n.x-p)/(v-p)*r[0],n.y=n.depth/d*r[1],delete n._tree}),s}var t=Zo.layout.hierarchy().sort(null).value(null),e=Au,r=[1,1],u=!1;return n.separation=function(t){return arguments.length?(e=t,n):e},n.size=function(t){return arguments.length?(u=null==(r=t),n):u?null:r},n.nodeSize=function(t){return arguments.length?(u=null!=(r=t),n):u?r:null},fu(n,t)},Zo.layout.pack=function(){function n(n,i){var o=e.call(this,n,i),a=o[0],c=u[0],s=u[1],l=null==t?Math.sqrt:"function"==typeof t?t:function(){return t};if(a.x=a.y=0,Ru(a,function(n){n.r=+l(n.value)}),Ru(a,Yu),r){var f=r*(t?1:Math.max(2*a.r/c,2*a.r/s))/2;Ru(a,function(n){n.r+=f}),Ru(a,Yu),Ru(a,function(n){n.r-=f})}return Vu(a,c/2,s/2,t?1:1/Math.max(2*a.r/c,2*a.r/s)),o}var t,e=Zo.layout.hierarchy().sort(ju),r=0,u=[1,1];return n.size=function(t){return arguments.length?(u=t,n):u},n.radius=function(e){return arguments.length?(t=null==e||"function"==typeof e?e:+e,n):t},n.padding=function(t){return arguments.length?(r=+t,n):r},fu(n,e)},Zo.layout.cluster=function(){function n(n,i){var o,a=t.call(this,n,i),c=a[0],s=0;Ru(c,function(n){var t=n.children;t&&t.length?(n.x=Bu(t),n.y=$u(t)):(n.x=o?s+=e(n,o):0,n.y=0,o=n)});var l=Wu(c),f=Ju(c),h=l.x-e(l,f)/2,g=f.x+e(f,l)/2;return Ru(c,u?function(n){n.x=(n.x-c.x)*r[0],n.y=(c.y-n.y)*r[1]}:function(n){n.x=(n.x-h)/(g-h)*r[0],n.y=(1-(c.y?n.y/c.y:1))*r[1]}),a}var t=Zo.layout.hierarchy().sort(null).value(null),e=Au,r=[1,1],u=!1;return n.separation=function(t){return arguments.length?(e=t,n):e},n.size=function(t){return arguments.length?(u=null==(r=t),n):u?null:r},n.nodeSize=function(t){return arguments.length?(u=null!=(r=t),n):u?r:null},fu(n,t)},Zo.layout.treemap=function(){function n(n,t){for(var e,r,u=-1,i=n.length;++u<i;)r=(e=n[u]).value*(0>t?0:t),e.area=isNaN(r)||0>=r?0:r}function t(e){var i=e.children;if(i&&i.length){var o,a,c,s=f(e),l=[],h=i.slice(),p=1/0,v="slice"===g?s.dx:"dice"===g?s.dy:"slice-dice"===g?1&e.depth?s.dy:s.dx:Math.min(s.dx,s.dy);for(n(h,s.dx*s.dy/e.value),l.area=0;(c=h.length)>0;)l.push(o=h[c-1]),l.area+=o.area,"squarify"!==g||(a=r(l,v))<=p?(h.pop(),p=a):(l.area-=l.pop().area,u(l,v,s,!1),v=Math.min(s.dx,s.dy),l.length=l.area=0,p=1/0);l.length&&(u(l,v,s,!0),l.length=l.area=0),i.forEach(t)}}function e(t){var r=t.children;if(r&&r.length){var i,o=f(t),a=r.slice(),c=[];for(n(a,o.dx*o.dy/t.value),c.area=0;i=a.pop();)c.push(i),c.area+=i.area,null!=i.z&&(u(c,i.z?o.dx:o.dy,o,!a.length),c.length=c.area=0);r.forEach(e)}}function r(n,t){for(var e,r=n.area,u=0,i=1/0,o=-1,a=n.length;++o<a;)(e=n[o].area)&&(i>e&&(i=e),e>u&&(u=e));return r*=r,t*=t,r?Math.max(t*u*p/r,r/(t*i*p)):1/0}function u(n,t,e,r){var u,i=-1,o=n.length,a=e.x,s=e.y,l=t?c(n.area/t):0;if(t==e.dx){for((r||l>e.dy)&&(l=e.dy);++i<o;)u=n[i],u.x=a,u.y=s,u.dy=l,a+=u.dx=Math.min(e.x+e.dx-a,l?c(u.area/l):0);u.z=!0,u.dx+=e.x+e.dx-a,e.y+=l,e.dy-=l}else{for((r||l>e.dx)&&(l=e.dx);++i<o;)u=n[i],u.x=a,u.y=s,u.dx=l,s+=u.dy=Math.min(e.y+e.dy-s,l?c(u.area/l):0);u.z=!1,u.dy+=e.y+e.dy-s,e.x+=l,e.dx-=l}}function i(r){var u=o||a(r),i=u[0];return i.x=0,i.y=0,i.dx=s[0],i.dy=s[1],o&&a.revalue(i),n([i],i.dx*i.dy/i.value),(o?e:t)(i),h&&(o=u),u}var o,a=Zo.layout.hierarchy(),c=Math.round,s=[1,1],l=null,f=Gu,h=!1,g="squarify",p=.5*(1+Math.sqrt(5));return i.size=function(n){return arguments.length?(s=n,i):s},i.padding=function(n){function t(t){var e=n.call(i,t,t.depth);return null==e?Gu(t):Ku(t,"number"==typeof e?[e,e,e,e]:e)}function e(t){return Ku(t,n)}if(!arguments.length)return l;var r;return f=null==(l=n)?Gu:"function"==(r=typeof n)?t:"number"===r?(n=[n,n,n,n],e):e,i},i.round=function(n){return arguments.length?(c=n?Math.round:Number,i):c!=Number},i.sticky=function(n){return arguments.length?(h=n,o=null,i):h},i.ratio=function(n){return arguments.length?(p=n,i):p},i.mode=function(n){return arguments.length?(g=n+"",i):g},fu(i,a)},Zo.random={normal:function(n,t){var e=arguments.length;return 2>e&&(t=1),1>e&&(n=0),function(){var e,r,u;do e=2*Math.random()-1,r=2*Math.random()-1,u=e*e+r*r;while(!u||u>1);return n+t*e*Math.sqrt(-2*Math.log(u)/u)}},logNormal:function(){var n=Zo.random.normal.apply(Zo,arguments);return function(){return Math.exp(n())}},irwinHall:function(n){return function(){for(var t=0,e=0;n>e;e++)t+=Math.random();return t/n}}},Zo.scale={};var os={floor:vt,ceil:vt};Zo.scale.linear=function(){return ii([0,1],[0,1],Tr,!1)},Zo.scale.log=function(){return fi(Zo.scale.linear().domain([0,1]),10,!0,[1,10])};var as=Zo.format(".0e"),cs={floor:function(n){return-Math.ceil(-n)},ceil:function(n){return-Math.floor(-n)}};Zo.scale.pow=function(){return hi(Zo.scale.linear(),1,[0,1])},Zo.scale.sqrt=function(){return Zo.scale.pow().exponent(.5)},Zo.scale.ordinal=function(){return pi([],{t:"range",a:[[]]})},Zo.scale.category10=function(){return Zo.scale.ordinal().range(ss)},Zo.scale.category20=function(){return Zo.scale.ordinal().range(ls)},Zo.scale.category20b=function(){return Zo.scale.ordinal().range(fs)},Zo.scale.category20c=function(){return Zo.scale.ordinal().range(hs)};var ss=[2062260,16744206,2924588,14034728,9725885,9197131,14907330,8355711,12369186,1556175].map(it),ls=[2062260,11454440,16744206,16759672,2924588,10018698,14034728,16750742,9725885,12955861,9197131,12885140,14907330,16234194,8355711,13092807,12369186,14408589,1556175,10410725].map(it),fs=[3750777,5395619,7040719,10264286,6519097,9216594,11915115,13556636,9202993,12426809,15186514,15190932,8666169,11356490,14049643,15177372,8077683,10834324,13528509,14589654].map(it),hs=[3244733,7057110,10406625,13032431,15095053,16616764,16625259,16634018,3253076,7652470,10607003,13101504,7695281,10394312,12369372,14342891,6513507,9868950,12434877,14277081].map(it);Zo.scale.quantile=function(){return vi([],[])},Zo.scale.quantize=function(){return di(0,1,[0,1])},Zo.scale.threshold=function(){return mi([.5],[0,1])},Zo.scale.identity=function(){return yi([0,1])},Zo.svg={},Zo.svg.arc=function(){function n(){var n=t.apply(this,arguments),i=e.apply(this,arguments),o=r.apply(this,arguments)+gs,a=u.apply(this,arguments)+gs,c=(o>a&&(c=o,o=a,a=c),a-o),s=ba>c?"0":"1",l=Math.cos(o),f=Math.sin(o),h=Math.cos(a),g=Math.sin(a);return c>=ps?n?"M0,"+i+"A"+i+","+i+" 0 1,1 0,"+-i+"A"+i+","+i+" 0 1,1 0,"+i+"M0,"+n+"A"+n+","+n+" 0 1,0 0,"+-n+"A"+n+","+n+" 0 1,0 0,"+n+"Z":"M0,"+i+"A"+i+","+i+" 0 1,1 0,"+-i+"A"+i+","+i+" 0 1,1 0,"+i+"Z":n?"M"+i*l+","+i*f+"A"+i+","+i+" 0 "+s+",1 "+i*h+","+i*g+"L"+n*h+","+n*g+"A"+n+","+n+" 0 "+s+",0 "+n*l+","+n*f+"Z":"M"+i*l+","+i*f+"A"+i+","+i+" 0 "+s+",1 "+i*h+","+i*g+"L0,0"+"Z"}var t=xi,e=Mi,r=_i,u=bi;return n.innerRadius=function(e){return arguments.length?(t=pt(e),n):t},n.outerRadius=function(t){return arguments.length?(e=pt(t),n):e},n.startAngle=function(t){return arguments.length?(r=pt(t),n):r},n.endAngle=function(t){return arguments.length?(u=pt(t),n):u},n.centroid=function(){var n=(t.apply(this,arguments)+e.apply(this,arguments))/2,i=(r.apply(this,arguments)+u.apply(this,arguments))/2+gs;return[Math.cos(i)*n,Math.sin(i)*n]},n};var gs=-Sa,ps=wa-ka;Zo.svg.line=function(){return wi(vt)};var vs=Zo.map({linear:Si,"linear-closed":ki,step:Ei,"step-before":Ai,"step-after":Ci,basis:Ri,"basis-open":Di,"basis-closed":Pi,bundle:Ui,cardinal:Ti,"cardinal-open":Ni,"cardinal-closed":Li,monotone:Ii});vs.forEach(function(n,t){t.key=n,t.closed=/-closed$/.test(n)});var ds=[0,2/3,1/3,0],ms=[0,1/3,2/3,0],ys=[0,1/6,2/3,1/6];Zo.svg.line.radial=function(){var n=wi(Zi);return n.radius=n.x,delete n.x,n.angle=n.y,delete n.y,n},Ai.reverse=Ci,Ci.reverse=Ai,Zo.svg.area=function(){return Vi(vt)},Zo.svg.area.radial=function(){var n=Vi(Zi);return n.radius=n.x,delete n.x,n.innerRadius=n.x0,delete n.x0,n.outerRadius=n.x1,delete n.x1,n.angle=n.y,delete n.y,n.startAngle=n.y0,delete n.y0,n.endAngle=n.y1,delete n.y1,n},Zo.svg.chord=function(){function n(n,a){var c=t(this,i,n,a),s=t(this,o,n,a);return"M"+c.p0+r(c.r,c.p1,c.a1-c.a0)+(e(c,s)?u(c.r,c.p1,c.r,c.p0):u(c.r,c.p1,s.r,s.p0)+r(s.r,s.p1,s.a1-s.a0)+u(s.r,s.p1,c.r,c.p0))+"Z"}function t(n,t,e,r){var u=t.call(n,e,r),i=a.call(n,u,r),o=c.call(n,u,r)+gs,l=s.call(n,u,r)+gs;return{r:i,a0:o,a1:l,p0:[i*Math.cos(o),i*Math.sin(o)],p1:[i*Math.cos(l),i*Math.sin(l)]}}function e(n,t){return n.a0==t.a0&&n.a1==t.a1}function r(n,t,e){return"A"+n+","+n+" 0 "+ +(e>ba)+",1 "+t}function u(n,t,e,r){return"Q 0,0 "+r}var i=ze,o=Re,a=Xi,c=_i,s=bi;return n.radius=function(t){return arguments.length?(a=pt(t),n):a},n.source=function(t){return arguments.length?(i=pt(t),n):i},n.target=function(t){return arguments.length?(o=pt(t),n):o},n.startAngle=function(t){return arguments.length?(c=pt(t),n):c},n.endAngle=function(t){return arguments.length?(s=pt(t),n):s},n},Zo.svg.diagonal=function(){function n(n,u){var i=t.call(this,n,u),o=e.call(this,n,u),a=(i.y+o.y)/2,c=[i,{x:i.x,y:a},{x:o.x,y:a},o];return c=c.map(r),"M"+c[0]+"C"+c[1]+" "+c[2]+" "+c[3]}var t=ze,e=Re,r=$i;return n.source=function(e){return arguments.length?(t=pt(e),n):t},n.target=function(t){return arguments.length?(e=pt(t),n):e},n.projection=function(t){return arguments.length?(r=t,n):r},n},Zo.svg.diagonal.radial=function(){var n=Zo.svg.diagonal(),t=$i,e=n.projection;return n.projection=function(n){return arguments.length?e(Bi(t=n)):t},n},Zo.svg.symbol=function(){function n(n,r){return(xs.get(t.call(this,n,r))||Gi)(e.call(this,n,r))}var t=Ji,e=Wi;return n.type=function(e){return arguments.length?(t=pt(e),n):t},n.size=function(t){return arguments.length?(e=pt(t),n):e},n};var xs=Zo.map({circle:Gi,cross:function(n){var t=Math.sqrt(n/5)/2;return"M"+-3*t+","+-t+"H"+-t+"V"+-3*t+"H"+t+"V"+-t+"H"+3*t+"V"+t+"H"+t+"V"+3*t+"H"+-t+"V"+t+"H"+-3*t+"Z"},diamond:function(n){var t=Math.sqrt(n/(2*ws)),e=t*ws;return"M0,"+-t+"L"+e+",0"+" 0,"+t+" "+-e+",0"+"Z"},square:function(n){var t=Math.sqrt(n)/2;return"M"+-t+","+-t+"L"+t+","+-t+" "+t+","+t+" "+-t+","+t+"Z"},"triangle-down":function(n){var t=Math.sqrt(n/bs),e=t*bs/2;return"M0,"+e+"L"+t+","+-e+" "+-t+","+-e+"Z"},"triangle-up":function(n){var t=Math.sqrt(n/bs),e=t*bs/2;return"M0,"+-e+"L"+t+","+e+" "+-t+","+e+"Z"}});Zo.svg.symbolTypes=xs.keys();var Ms,_s,bs=Math.sqrt(3),ws=Math.tan(30*Aa),Ss=[],ks=0;Ss.call=pa.call,Ss.empty=pa.empty,Ss.node=pa.node,Ss.size=pa.size,Zo.transition=function(n){return arguments.length?Ms?n.transition():n:ma.transition()},Zo.transition.prototype=Ss,Ss.select=function(n){var t,e,r,u=this.id,i=[];n=v(n);for(var o=-1,a=this.length;++o<a;){i.push(t=[]);for(var c=this[o],s=-1,l=c.length;++s<l;)(r=c[s])&&(e=n.call(r,r.__data__,s,o))?("__data__"in r&&(e.__data__=r.__data__),to(e,s,u,r.__transition__[u]),t.push(e)):t.push(null)
}return Ki(i,u)},Ss.selectAll=function(n){var t,e,r,u,i,o=this.id,a=[];n=d(n);for(var c=-1,s=this.length;++c<s;)for(var l=this[c],f=-1,h=l.length;++f<h;)if(r=l[f]){i=r.__transition__[o],e=n.call(r,r.__data__,f,c),a.push(t=[]);for(var g=-1,p=e.length;++g<p;)(u=e[g])&&to(u,g,o,i),t.push(u)}return Ki(a,o)},Ss.filter=function(n){var t,e,r,u=[];"function"!=typeof n&&(n=E(n));for(var i=0,o=this.length;o>i;i++){u.push(t=[]);for(var e=this[i],a=0,c=e.length;c>a;a++)(r=e[a])&&n.call(r,r.__data__,a)&&t.push(r)}return Ki(u,this.id)},Ss.tween=function(n,t){var e=this.id;return arguments.length<2?this.node().__transition__[e].tween.get(n):C(this,null==t?function(t){t.__transition__[e].tween.remove(n)}:function(r){r.__transition__[e].tween.set(n,t)})},Ss.attr=function(n,t){function e(){this.removeAttribute(a)}function r(){this.removeAttributeNS(a.space,a.local)}function u(n){return null==n?e:(n+="",function(){var t,e=this.getAttribute(a);return e!==n&&(t=o(e,n),function(n){this.setAttribute(a,t(n))})})}function i(n){return null==n?r:(n+="",function(){var t,e=this.getAttributeNS(a.space,a.local);return e!==n&&(t=o(e,n),function(n){this.setAttributeNS(a.space,a.local,t(n))})})}if(arguments.length<2){for(t in n)this.attr(t,n[t]);return this}var o="transform"==n?nu:Tr,a=Zo.ns.qualify(n);return Qi(this,"attr."+n,t,a.local?i:u)},Ss.attrTween=function(n,t){function e(n,e){var r=t.call(this,n,e,this.getAttribute(u));return r&&function(n){this.setAttribute(u,r(n))}}function r(n,e){var r=t.call(this,n,e,this.getAttributeNS(u.space,u.local));return r&&function(n){this.setAttributeNS(u.space,u.local,r(n))}}var u=Zo.ns.qualify(n);return this.tween("attr."+n,u.local?r:e)},Ss.style=function(n,t,e){function r(){this.style.removeProperty(n)}function u(t){return null==t?r:(t+="",function(){var r,u=Wo.getComputedStyle(this,null).getPropertyValue(n);return u!==t&&(r=Tr(u,t),function(t){this.style.setProperty(n,r(t),e)})})}var i=arguments.length;if(3>i){if("string"!=typeof n){2>i&&(t="");for(e in n)this.style(e,n[e],t);return this}e=""}return Qi(this,"style."+n,t,u)},Ss.styleTween=function(n,t,e){function r(r,u){var i=t.call(this,r,u,Wo.getComputedStyle(this,null).getPropertyValue(n));return i&&function(t){this.style.setProperty(n,i(t),e)}}return arguments.length<3&&(e=""),this.tween("style."+n,r)},Ss.text=function(n){return Qi(this,"text",n,no)},Ss.remove=function(){return this.each("end.transition",function(){var n;this.__transition__.count<2&&(n=this.parentNode)&&n.removeChild(this)})},Ss.ease=function(n){var t=this.id;return arguments.length<1?this.node().__transition__[t].ease:("function"!=typeof n&&(n=Zo.ease.apply(Zo,arguments)),C(this,function(e){e.__transition__[t].ease=n}))},Ss.delay=function(n){var t=this.id;return C(this,"function"==typeof n?function(e,r,u){e.__transition__[t].delay=+n.call(e,e.__data__,r,u)}:(n=+n,function(e){e.__transition__[t].delay=n}))},Ss.duration=function(n){var t=this.id;return C(this,"function"==typeof n?function(e,r,u){e.__transition__[t].duration=Math.max(1,n.call(e,e.__data__,r,u))}:(n=Math.max(1,n),function(e){e.__transition__[t].duration=n}))},Ss.each=function(n,t){var e=this.id;if(arguments.length<2){var r=_s,u=Ms;Ms=e,C(this,function(t,r,u){_s=t.__transition__[e],n.call(t,t.__data__,r,u)}),_s=r,Ms=u}else C(this,function(r){var u=r.__transition__[e];(u.event||(u.event=Zo.dispatch("start","end"))).on(n,t)});return this},Ss.transition=function(){for(var n,t,e,r,u=this.id,i=++ks,o=[],a=0,c=this.length;c>a;a++){o.push(n=[]);for(var t=this[a],s=0,l=t.length;l>s;s++)(e=t[s])&&(r=Object.create(e.__transition__[u]),r.delay+=r.duration,to(e,s,i,r)),n.push(e)}return Ki(o,i)},Zo.svg.axis=function(){function n(n){n.each(function(){var n,s=Zo.select(this),l=this.__chart__||e,f=this.__chart__=e.copy(),h=null==c?f.ticks?f.ticks.apply(f,a):f.domain():c,g=null==t?f.tickFormat?f.tickFormat.apply(f,a):vt:t,p=s.selectAll(".tick").data(h,f),v=p.enter().insert("g",".domain").attr("class","tick").style("opacity",ka),d=Zo.transition(p.exit()).style("opacity",ka).remove(),m=Zo.transition(p).style("opacity",1),y=ni(f),x=s.selectAll(".domain").data([0]),M=(x.enter().append("path").attr("class","domain"),Zo.transition(x));v.append("line"),v.append("text");var _=v.select("line"),b=m.select("line"),w=p.select("text").text(g),S=v.select("text"),k=m.select("text");switch(r){case"bottom":n=eo,_.attr("y2",u),S.attr("y",Math.max(u,0)+o),b.attr("x2",0).attr("y2",u),k.attr("x",0).attr("y",Math.max(u,0)+o),w.attr("dy",".71em").style("text-anchor","middle"),M.attr("d","M"+y[0]+","+i+"V0H"+y[1]+"V"+i);break;case"top":n=eo,_.attr("y2",-u),S.attr("y",-(Math.max(u,0)+o)),b.attr("x2",0).attr("y2",-u),k.attr("x",0).attr("y",-(Math.max(u,0)+o)),w.attr("dy","0em").style("text-anchor","middle"),M.attr("d","M"+y[0]+","+-i+"V0H"+y[1]+"V"+-i);break;case"left":n=ro,_.attr("x2",-u),S.attr("x",-(Math.max(u,0)+o)),b.attr("x2",-u).attr("y2",0),k.attr("x",-(Math.max(u,0)+o)).attr("y",0),w.attr("dy",".32em").style("text-anchor","end"),M.attr("d","M"+-i+","+y[0]+"H0V"+y[1]+"H"+-i);break;case"right":n=ro,_.attr("x2",u),S.attr("x",Math.max(u,0)+o),b.attr("x2",u).attr("y2",0),k.attr("x",Math.max(u,0)+o).attr("y",0),w.attr("dy",".32em").style("text-anchor","start"),M.attr("d","M"+i+","+y[0]+"H0V"+y[1]+"H"+i)}if(f.rangeBand){var E=f.rangeBand()/2,A=function(n){return f(n)+E};v.call(n,A),m.call(n,A)}else v.call(n,l),m.call(n,f),d.call(n,f)})}var t,e=Zo.scale.linear(),r=Es,u=6,i=6,o=3,a=[10],c=null;return n.scale=function(t){return arguments.length?(e=t,n):e},n.orient=function(t){return arguments.length?(r=t in As?t+"":Es,n):r},n.ticks=function(){return arguments.length?(a=arguments,n):a},n.tickValues=function(t){return arguments.length?(c=t,n):c},n.tickFormat=function(e){return arguments.length?(t=e,n):t},n.tickSize=function(t){var e=arguments.length;return e?(u=+t,i=+arguments[e-1],n):u},n.innerTickSize=function(t){return arguments.length?(u=+t,n):u},n.outerTickSize=function(t){return arguments.length?(i=+t,n):i},n.tickPadding=function(t){return arguments.length?(o=+t,n):o},n.tickSubdivide=function(){return arguments.length&&n},n};var Es="bottom",As={top:1,right:1,bottom:1,left:1};Zo.svg.brush=function(){function n(i){i.each(function(){var i=Zo.select(this).style("pointer-events","all").style("-webkit-tap-highlight-color","rgba(0,0,0,0)").on("mousedown.brush",u).on("touchstart.brush",u),o=i.selectAll(".background").data([0]);o.enter().append("rect").attr("class","background").style("visibility","hidden").style("cursor","crosshair"),i.selectAll(".extent").data([0]).enter().append("rect").attr("class","extent").style("cursor","move");var a=i.selectAll(".resize").data(d,vt);a.exit().remove(),a.enter().append("g").attr("class",function(n){return"resize "+n}).style("cursor",function(n){return Cs[n]}).append("rect").attr("x",function(n){return/[ew]$/.test(n)?-3:null}).attr("y",function(n){return/^[ns]/.test(n)?-3:null}).attr("width",6).attr("height",6).style("visibility","hidden"),a.style("display",n.empty()?"none":null);var l,f=Zo.transition(i),h=Zo.transition(o);c&&(l=ni(c),h.attr("x",l[0]).attr("width",l[1]-l[0]),e(f)),s&&(l=ni(s),h.attr("y",l[0]).attr("height",l[1]-l[0]),r(f)),t(f)})}function t(n){n.selectAll(".resize").attr("transform",function(n){return"translate("+l[+/e$/.test(n)]+","+h[+/^s/.test(n)]+")"})}function e(n){n.select(".extent").attr("x",l[0]),n.selectAll(".extent,.n>rect,.s>rect").attr("width",l[1]-l[0])}function r(n){n.select(".extent").attr("y",h[0]),n.selectAll(".extent,.e>rect,.w>rect").attr("height",h[1]-h[0])}function u(){function u(){32==Zo.event.keyCode&&(C||(x=null,L[0]-=l[1],L[1]-=h[1],C=2),f())}function g(){32==Zo.event.keyCode&&2==C&&(L[0]+=l[1],L[1]+=h[1],C=0,f())}function d(){var n=Zo.mouse(_),u=!1;M&&(n[0]+=M[0],n[1]+=M[1]),C||(Zo.event.altKey?(x||(x=[(l[0]+l[1])/2,(h[0]+h[1])/2]),L[0]=l[+(n[0]<x[0])],L[1]=h[+(n[1]<x[1])]):x=null),E&&m(n,c,0)&&(e(S),u=!0),A&&m(n,s,1)&&(r(S),u=!0),u&&(t(S),w({type:"brush",mode:C?"move":"resize"}))}function m(n,t,e){var r,u,a=ni(t),c=a[0],s=a[1],f=L[e],g=e?h:l,d=g[1]-g[0];return C&&(c-=f,s-=d+f),r=(e?v:p)?Math.max(c,Math.min(s,n[e])):n[e],C?u=(r+=f)+d:(x&&(f=Math.max(c,Math.min(s,2*x[e]-r))),r>f?(u=r,r=f):u=f),g[0]!=r||g[1]!=u?(e?o=null:i=null,g[0]=r,g[1]=u,!0):void 0}function y(){d(),S.style("pointer-events","all").selectAll(".resize").style("display",n.empty()?"none":null),Zo.select("body").style("cursor",null),T.on("mousemove.brush",null).on("mouseup.brush",null).on("touchmove.brush",null).on("touchend.brush",null).on("keydown.brush",null).on("keyup.brush",null),N(),w({type:"brushend"})}var x,M,_=this,b=Zo.select(Zo.event.target),w=a.of(_,arguments),S=Zo.select(_),k=b.datum(),E=!/^(n|s)$/.test(k)&&c,A=!/^(e|w)$/.test(k)&&s,C=b.classed("extent"),N=D(),L=Zo.mouse(_),T=Zo.select(Wo).on("keydown.brush",u).on("keyup.brush",g);if(Zo.event.changedTouches?T.on("touchmove.brush",d).on("touchend.brush",y):T.on("mousemove.brush",d).on("mouseup.brush",y),S.interrupt().selectAll("*").interrupt(),C)L[0]=l[0]-L[0],L[1]=h[0]-L[1];else if(k){var q=+/w$/.test(k),z=+/^n/.test(k);M=[l[1-q]-L[0],h[1-z]-L[1]],L[0]=l[q],L[1]=h[z]}else Zo.event.altKey&&(x=L.slice());S.style("pointer-events","none").selectAll(".resize").style("display",null),Zo.select("body").style("cursor",b.style("cursor")),w({type:"brushstart"}),d()}var i,o,a=g(n,"brushstart","brush","brushend"),c=null,s=null,l=[0,0],h=[0,0],p=!0,v=!0,d=Ns[0];return n.event=function(n){n.each(function(){var n=a.of(this,arguments),t={x:l,y:h,i:i,j:o},e=this.__chart__||t;this.__chart__=t,Ms?Zo.select(this).transition().each("start.brush",function(){i=e.i,o=e.j,l=e.x,h=e.y,n({type:"brushstart"})}).tween("brush:brush",function(){var e=qr(l,t.x),r=qr(h,t.y);return i=o=null,function(u){l=t.x=e(u),h=t.y=r(u),n({type:"brush",mode:"resize"})}}).each("end.brush",function(){i=t.i,o=t.j,n({type:"brush",mode:"resize"}),n({type:"brushend"})}):(n({type:"brushstart"}),n({type:"brush",mode:"resize"}),n({type:"brushend"}))})},n.x=function(t){return arguments.length?(c=t,d=Ns[!c<<1|!s],n):c},n.y=function(t){return arguments.length?(s=t,d=Ns[!c<<1|!s],n):s},n.clamp=function(t){return arguments.length?(c&&s?(p=!!t[0],v=!!t[1]):c?p=!!t:s&&(v=!!t),n):c&&s?[p,v]:c?p:s?v:null},n.extent=function(t){var e,r,u,a,f;return arguments.length?(c&&(e=t[0],r=t[1],s&&(e=e[0],r=r[0]),i=[e,r],c.invert&&(e=c(e),r=c(r)),e>r&&(f=e,e=r,r=f),(e!=l[0]||r!=l[1])&&(l=[e,r])),s&&(u=t[0],a=t[1],c&&(u=u[1],a=a[1]),o=[u,a],s.invert&&(u=s(u),a=s(a)),u>a&&(f=u,u=a,a=f),(u!=h[0]||a!=h[1])&&(h=[u,a])),n):(c&&(i?(e=i[0],r=i[1]):(e=l[0],r=l[1],c.invert&&(e=c.invert(e),r=c.invert(r)),e>r&&(f=e,e=r,r=f))),s&&(o?(u=o[0],a=o[1]):(u=h[0],a=h[1],s.invert&&(u=s.invert(u),a=s.invert(a)),u>a&&(f=u,u=a,a=f))),c&&s?[[e,u],[r,a]]:c?[e,r]:s&&[u,a])},n.clear=function(){return n.empty()||(l=[0,0],h=[0,0],i=o=null),n},n.empty=function(){return!!c&&l[0]==l[1]||!!s&&h[0]==h[1]},Zo.rebind(n,a,"on")};var Cs={n:"ns-resize",e:"ew-resize",s:"ns-resize",w:"ew-resize",nw:"nwse-resize",ne:"nesw-resize",se:"nwse-resize",sw:"nesw-resize"},Ns=[["n","e","s","w","nw","ne","se","sw"],["e","w"],["n","s"],[]],Ls=Zo.time={},Ts=Date,qs=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];uo.prototype={getDate:function(){return this._.getUTCDate()},getDay:function(){return this._.getUTCDay()},getFullYear:function(){return this._.getUTCFullYear()},getHours:function(){return this._.getUTCHours()},getMilliseconds:function(){return this._.getUTCMilliseconds()},getMinutes:function(){return this._.getUTCMinutes()},getMonth:function(){return this._.getUTCMonth()},getSeconds:function(){return this._.getUTCSeconds()},getTime:function(){return this._.getTime()},getTimezoneOffset:function(){return 0},valueOf:function(){return this._.valueOf()},setDate:function(){zs.setUTCDate.apply(this._,arguments)},setDay:function(){zs.setUTCDay.apply(this._,arguments)},setFullYear:function(){zs.setUTCFullYear.apply(this._,arguments)},setHours:function(){zs.setUTCHours.apply(this._,arguments)},setMilliseconds:function(){zs.setUTCMilliseconds.apply(this._,arguments)},setMinutes:function(){zs.setUTCMinutes.apply(this._,arguments)},setMonth:function(){zs.setUTCMonth.apply(this._,arguments)},setSeconds:function(){zs.setUTCSeconds.apply(this._,arguments)},setTime:function(){zs.setTime.apply(this._,arguments)}};var zs=Date.prototype,Rs="%a %b %e %X %Y",Ds="%m/%d/%Y",Ps="%H:%M:%S",Us=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],js=["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],Hs=["January","February","March","April","May","June","July","August","September","October","November","December"],Fs=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];Ls.year=io(function(n){return n=Ls.day(n),n.setMonth(0,1),n},function(n,t){n.setFullYear(n.getFullYear()+t)},function(n){return n.getFullYear()}),Ls.years=Ls.year.range,Ls.years.utc=Ls.year.utc.range,Ls.day=io(function(n){var t=new Ts(2e3,0);return t.setFullYear(n.getFullYear(),n.getMonth(),n.getDate()),t},function(n,t){n.setDate(n.getDate()+t)},function(n){return n.getDate()-1}),Ls.days=Ls.day.range,Ls.days.utc=Ls.day.utc.range,Ls.dayOfYear=function(n){var t=Ls.year(n);return Math.floor((n-t-6e4*(n.getTimezoneOffset()-t.getTimezoneOffset()))/864e5)},qs.forEach(function(n,t){n=n.toLowerCase(),t=7-t;var e=Ls[n]=io(function(n){return(n=Ls.day(n)).setDate(n.getDate()-(n.getDay()+t)%7),n},function(n,t){n.setDate(n.getDate()+7*Math.floor(t))},function(n){var e=Ls.year(n).getDay();return Math.floor((Ls.dayOfYear(n)+(e+t)%7)/7)-(e!==t)});Ls[n+"s"]=e.range,Ls[n+"s"].utc=e.utc.range,Ls[n+"OfYear"]=function(n){var e=Ls.year(n).getDay();return Math.floor((Ls.dayOfYear(n)+(e+t)%7)/7)}}),Ls.week=Ls.sunday,Ls.weeks=Ls.sunday.range,Ls.weeks.utc=Ls.sunday.utc.range,Ls.weekOfYear=Ls.sundayOfYear,Ls.format=ao;var Os=so(Us),Ys=lo(Us),Is=so(js),Zs=lo(js),Vs=so(Hs),Xs=lo(Hs),$s=so(Fs),Bs=lo(Fs),Ws=/^%/,Js={"-":"",_:" ",0:"0"},Gs={a:function(n){return js[n.getDay()]},A:function(n){return Us[n.getDay()]},b:function(n){return Fs[n.getMonth()]},B:function(n){return Hs[n.getMonth()]},c:ao(Rs),d:function(n,t){return fo(n.getDate(),t,2)},e:function(n,t){return fo(n.getDate(),t,2)},H:function(n,t){return fo(n.getHours(),t,2)},I:function(n,t){return fo(n.getHours()%12||12,t,2)},j:function(n,t){return fo(1+Ls.dayOfYear(n),t,3)},L:function(n,t){return fo(n.getMilliseconds(),t,3)},m:function(n,t){return fo(n.getMonth()+1,t,2)},M:function(n,t){return fo(n.getMinutes(),t,2)},p:function(n){return n.getHours()>=12?"PM":"AM"},S:function(n,t){return fo(n.getSeconds(),t,2)},U:function(n,t){return fo(Ls.sundayOfYear(n),t,2)},w:function(n){return n.getDay()},W:function(n,t){return fo(Ls.mondayOfYear(n),t,2)},x:ao(Ds),X:ao(Ps),y:function(n,t){return fo(n.getFullYear()%100,t,2)},Y:function(n,t){return fo(n.getFullYear()%1e4,t,4)},Z:Do,"%":function(){return"%"}},Ks={a:ho,A:go,b:yo,B:xo,c:Mo,d:Co,e:Co,H:Lo,I:Lo,j:No,L:zo,m:Ao,M:To,p:Ro,S:qo,U:vo,w:po,W:mo,x:_o,X:bo,y:So,Y:wo,Z:ko,"%":Po},Qs=/^\s*\d+/,nl=Zo.map({am:0,pm:1});ao.utc=Uo;var tl=Uo("%Y-%m-%dT%H:%M:%S.%LZ");ao.iso=Date.prototype.toISOString&&+new Date("2000-01-01T00:00:00.000Z")?jo:tl,jo.parse=function(n){var t=new Date(n);return isNaN(t)?null:t},jo.toString=tl.toString,Ls.second=io(function(n){return new Ts(1e3*Math.floor(n/1e3))},function(n,t){n.setTime(n.getTime()+1e3*Math.floor(t))},function(n){return n.getSeconds()}),Ls.seconds=Ls.second.range,Ls.seconds.utc=Ls.second.utc.range,Ls.minute=io(function(n){return new Ts(6e4*Math.floor(n/6e4))},function(n,t){n.setTime(n.getTime()+6e4*Math.floor(t))},function(n){return n.getMinutes()}),Ls.minutes=Ls.minute.range,Ls.minutes.utc=Ls.minute.utc.range,Ls.hour=io(function(n){var t=n.getTimezoneOffset()/60;return new Ts(36e5*(Math.floor(n/36e5-t)+t))},function(n,t){n.setTime(n.getTime()+36e5*Math.floor(t))},function(n){return n.getHours()}),Ls.hours=Ls.hour.range,Ls.hours.utc=Ls.hour.utc.range,Ls.month=io(function(n){return n=Ls.day(n),n.setDate(1),n},function(n,t){n.setMonth(n.getMonth()+t)},function(n){return n.getMonth()}),Ls.months=Ls.month.range,Ls.months.utc=Ls.month.utc.range;var el=[1e3,5e3,15e3,3e4,6e4,3e5,9e5,18e5,36e5,108e5,216e5,432e5,864e5,1728e5,6048e5,2592e6,7776e6,31536e6],rl=[[Ls.second,1],[Ls.second,5],[Ls.second,15],[Ls.second,30],[Ls.minute,1],[Ls.minute,5],[Ls.minute,15],[Ls.minute,30],[Ls.hour,1],[Ls.hour,3],[Ls.hour,6],[Ls.hour,12],[Ls.day,1],[Ls.day,2],[Ls.week,1],[Ls.month,1],[Ls.month,3],[Ls.year,1]],ul=[[ao("%Y"),Zt],[ao("%B"),function(n){return n.getMonth()}],[ao("%b %d"),function(n){return 1!=n.getDate()}],[ao("%a %d"),function(n){return n.getDay()&&1!=n.getDate()}],[ao("%I %p"),function(n){return n.getHours()}],[ao("%I:%M"),function(n){return n.getMinutes()}],[ao(":%S"),function(n){return n.getSeconds()}],[ao(".%L"),function(n){return n.getMilliseconds()}]],il=Oo(ul);rl.year=Ls.year,Ls.scale=function(){return Ho(Zo.scale.linear(),rl,il)};var ol={range:function(n,t,e){return Zo.range(+n,+t,e).map(Fo)}},al=rl.map(function(n){return[n[0].utc,n[1]]}),cl=[[Uo("%Y"),Zt],[Uo("%B"),function(n){return n.getUTCMonth()}],[Uo("%b %d"),function(n){return 1!=n.getUTCDate()}],[Uo("%a %d"),function(n){return n.getUTCDay()&&1!=n.getUTCDate()}],[Uo("%I %p"),function(n){return n.getUTCHours()}],[Uo("%I:%M"),function(n){return n.getUTCMinutes()}],[Uo(":%S"),function(n){return n.getUTCSeconds()}],[Uo(".%L"),function(n){return n.getUTCMilliseconds()}]],sl=Oo(cl);return al.year=Ls.year.utc,Ls.scale.utc=function(){return Ho(Zo.scale.linear(),al,sl)},Zo.text=dt(function(n){return n.responseText}),Zo.json=function(n,t){return mt(n,"application/json",Yo,t)},Zo.html=function(n,t){return mt(n,"text/html",Io,t)},Zo.xml=dt(function(n){return n.responseXML}),Zo}();
(function() {
  var addCheckFilter, addStep, applyTriggers, carrega, reorder;

  window.first = true;

  window.onpopstate = function() {
    if (window.first) {
      window.first = false;
      return false;
    }
    return $('#meio').load(document.location.href, function() {
      return applyTriggers();
    });
  };

  carrega = function(url) {
    var nova_url;
    nova_url = location.pathname + url;
    return $('#meio').load(nova_url, function() {
      return applyTriggers();
    });
  };

  reorder = function(id) {
    return carrega(addStep('ordem', id));
  };

  addStep = function(nome, val) {
    var nova_url;
    url_params['page'] = 1;
    url_params[nome] = val;
    if (!val) {
      delete url_params[nome];
    }
    nova_url = '?' + $.param(url_params);
    history.pushState(url_params, '', nova_url);
    carrega(nova_url);
    return nova_url;
  };

  applyTriggers = function() {
    $('.reorder').each(function() {
      if ($(this).attr('id') === get_param('ordem')) {
        $(this).addClass('hover').css('background-color', 'rgb(54,53,49)');
      }
      return $(this).click(function() {
        return reorder($(this).attr('id'));
      });
    });
    $('#filtro_estados').empty();
    $('#filtro_estados').append($('#subfiltros'));
    $('#subfiltros').slideDown(800);
    return $('.selectable').on('click', function() {
      var badge, icon, id, is_estado, type;
      type = $(this).attr('type');
      is_estado = type === "estado";
      if ($(this).attr('filtering') === '1') {
        $(this).removeAttr('filtering');
        $(this).hide(800, function() {
          return $(this).remove();
        });
        $("#" + type + "s").slideDown(800);
        carrega(addStep("" + type + "_id", false));
        return false;
      }
      id = $(this).attr('id');
      badge = $("#" + id + ">.badge");
      if (badge.text() === "0") {
        return false;
      }
      icon = is_estado != null ? is_estado : {
        'globe': 'tags'
      };
      addStep("" + type + "_id", $(this).attr('type_id'));
      $(this).prepend($("<i class='icon-" + icon + "'></i>"));
      $(this).attr('filtering', 1);
      return $(this).css('top', $(this).offset().top).css('left', $(this).offset().left).css('position', 'absolute').animate({
        top: $("#subsub").offset().top + $("#subsub").height()
      }, 1000, function() {
        $(this).appendTo("#subsub");
        $(this).css('top', '');
        $(this).css('left', '');
        $(this).css('position', 'relative');
        $(badge).text('X').removeClass('badge-info');
        return applyTriggers();
      });
    });
  };

  addCheckFilter = function(ids) {
    return $(ids).each(function(num, id) {
      var bit;
      bit = url_params[id] && url_params[id] === 'true' ? 'true' : 'false';
      if (bit === 'true') {
        $("#" + id).attr('checked', true);
      }
      return $("#" + id).click(function() {
        return addStep(id, $(this).is(':checked'));
      });
    });
  };

  $(function() {
    var form;
    addCheckFilter(['liberados', 'providencia', 'fnc', 'recurso_tesouro', 'apoiado_maior_aprovado', 'apoiado_maior_zero', 'apoiadores_maior_20']);
    form = $('#filtros>form')[0];
    $(form).submit(function() {
      addStep('nome', $('#nome').val());
      addStep('sintese', $('#sintese').val());
      addStep('providencia', $('#providencia').val());
      return false;
    });
    $('#nome').enterKey(function() {
      return $(form).submit();
    });
    $('#sintese').enterKey(function() {
      return $(form).submit();
    });
    $('#providencia').enterKey(function() {
      return $(form).submit();
    });
    return applyTriggers();
  });

}).call(this);
(function(a,b){"use strict";var c=function(){var b=function(){var b=a.location.hash?a.location.hash.substr(1).split("&"):[],c={};for(var d=0;d<b.length;d++){var e=b[d].split("=");c[e[0]]=decodeURIComponent(e[1])}return c};var c=function(b){var c=[];for(var d in b){c.push(d+"="+encodeURIComponent(b[d]))}a.location.hash=c.join("&")};return{get:function(a){var c=b();if(a){return c[a]}else{return c}},add:function(a){var d=b();for(var e in a){d[e]=a[e]}c(d)},remove:function(a){a=typeof a=="string"?[a]:a;var d=b();for(var e=0;e<a.length;e++){delete d[a[e]]}c(d)},clear:function(){c({})}}}();a.hash=c})(window)
;
(function() {
  $(function() {});

}).call(this);


var url_params;
(window.onpopstate = function() {
    var match,
        pl     = /\+/g, // Regex for replacing addition symbol with a space
        search = /([^&=]+)=?([^&]*)/g,
        decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
        query  = window.location.search.substring(1);

    url_params = {};
    while (match = search.exec(query))
       url_params[decode(match[1])] = decode(match[2]);
})();

$.fn.enterKey = function (fnc) {
    return this.each(function () {
        $(this).keypress(function (ev) {
            var keycode = (ev.keyCode ? ev.keyCode : ev.which);
            if (keycode == '13') {
                fnc.call(this, ev);
            }
        })
    })
}

function get_param(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search)||[,""])[1].replace(/\+/g, '%20'))||null;
}

;
