!function(){"use strict";if("undefined"==typeof sigma)throw"sigma is not declared";var a=sigma.utils.pkg("sigma.layout.forceatlas2");a.ForceAtlas2=function(b,c){var d=this;this.graph=b,this.p=sigma.utils.extend(c||{},a.defaultSettings),this.state={step:0,index:0},this.init=function(){return d.state={step:0,index:0},d.graph.nodes().forEach(function(a){a.fa2={mass:1+d.graph.degree(a.id),old_dx:0,old_dy:0,dx:0,dy:0}}),d},this.go=function(){for(;d.atomicGo(););},this.atomicGo=function(){var b,c,e,f,g,h,i,j=d.graph,k=j.nodes,l=j.edges,m=k(),n=l(),o=d.p.complexIntervals,p=d.p.simpleIntervals;switch(d.state.step){case 0:for(b=0,f=m.length;f>b;b++)c=m[b],c.fa2=c.fa2?{mass:1+d.graph.degree(c.id),old_dx:c.fa2.dx||0,old_dy:c.fa2.dy||0,dx:0,dy:0}:{mass:1+d.graph.degree(c.id),old_dx:0,old_dy:0,dx:0,dy:0};if(d.p.barnesHutOptimize&&(d.rootRegion=new a.Region(m,0),d.rootRegion.buildSubRegions()),d.p.outboundAttractionDistribution){for(d.p.outboundAttCompensation=0,b=0,f=m.length;f>b;b++)c=m[b],d.p.outboundAttCompensation+=c.fa2.mass;d.p.outboundAttCompensation/=m.length}return d.state.step=1,d.state.index=0,!0;case 1:var q,r,s,t,u,v,w=d.ForceFactory.buildRepulsion(d.p.adjustSizes,d.p.scalingRatio);if(d.p.barnesHutOptimize){for(u=d.rootRegion,v=d.p.barnesHutTheta,b=d.state.index;b<m.length&&b<d.state.index+o;)(c=m[b++]).fa2&&u.applyForce(c,w,v);b===m.length?d.state={step:2,index:0}:d.state.index=b}else{for(s=d.state.index;s<m.length&&s<d.state.index+o;)if((q=m[s++]).fa2)for(t=0;s>t;t++)(r=m[t]).fa2&&w.apply_nn(q,r);s===m.length?d.state={step:2,index:0}:d.state.index=s}return!0;case 2:var x=d.p.strongGravityMode?d.ForceFactory.getStrongGravity(d.p.scalingRatio):d.ForceFactory.buildRepulsion(d.p.adjustSizes,d.p.scalingRatio),y=d.p.gravity,z=d.p.scalingRatio;for(b=d.state.index;b<m.length&&b<d.state.index+p;)c=m[b++],c.fa2&&x.apply_g(c,y/z);return b===m.length?d.state={step:3,index:0}:d.state.index=b,!0;case 3:var A=d.ForceFactory.buildAttraction(d.p.linLogMode,d.p.outboundAttractionDistribution,d.p.adjustSizes,d.p.outboundAttractionDistribution?d.p.outboundAttCompensation:1);if(b=d.state.index,0===d.p.edgeWeightInfluence)for(;b<n.length&&b<d.state.index+o;)e=n[b++],A.apply_nn(k(e.source),k(e.target),1);else if(1===d.p.edgeWeightInfluence)for(;b<n.length&&b<d.state.index+o;)e=n[b++],A.apply_nn(k(e.source),k(e.target),e.weight||1);else for(;b<n.length&&b<d.state.index+o;)e=n[b++],A.apply_nn(k(e.source),k(e.target),Math.pow(e.weight||1,d.p.edgeWeightInfluence));return b===n.length?d.state={step:4,index:0}:d.state.index=b,!0;case 4:var B,C,D=0,E=0;for(b=0,f=m.length;f>b;b++)c=m[b],g=c.fixed||!1,!g&&c.fa2&&(h=Math.sqrt(Math.pow(c.fa2.old_dx-c.fa2.dx,2)+Math.pow(c.fa2.old_dy-c.fa2.dy,2)),D+=c.fa2.mass*h,E+=.5*c.fa2.mass*Math.sqrt(Math.pow(c.fa2.old_dx+c.fa2.dx,2)+Math.pow(c.fa2.old_dy+c.fa2.dy,2)));for(d.p.totalSwinging=D,d.p.totalEffectiveTraction=E,C=Math.pow(d.p.jitterTolerance,2)*d.p.totalEffectiveTraction/d.p.totalSwinging,B=.5,d.p.speed=d.p.speed+Math.min(C-d.p.speed,B*d.p.speed),b=0,f=m.length;f>b;b++)c=m[b],c.old_x=+c.x,c.old_y=+c.y;return d.state.step=5,!0;case 5:var F,G;if(b=d.state.index,d.p.adjustSizes)for(G=d.p.speed;b<m.length&&b<d.state.index+p;)c=m[b++],g=c.fixed||!1,!g&&c.fa2&&(h=Math.sqrt((c.fa2.old_dx-c.fa2.dx)*(c.fa2.old_dx-c.fa2.dx)+(c.fa2.old_dy-c.fa2.dy)*(c.fa2.old_dy-c.fa2.dy)),i=.1*G/(1+G*Math.sqrt(h)),F=Math.sqrt(Math.pow(c.fa2.dx,2)+Math.pow(c.fa2.dy,2)),i=Math.min(i*F,10)/F,c.x+=c.fa2.dx*i,c.y+=c.fa2.dy*i);else for(G=d.p.speed;b<m.length&&b<d.state.index+p;)c=m[b++],g=c.fixed||!1,!g&&c.fa2&&(h=Math.sqrt((c.fa2.old_dx-c.fa2.dx)*(c.fa2.old_dx-c.fa2.dx)+(c.fa2.old_dy-c.fa2.dy)*(c.fa2.old_dy-c.fa2.dy)),i=G/(1+G*Math.sqrt(h)),c.x+=c.fa2.dx*i,c.y+=c.fa2.dy*i);return b===m.length?(d.state={step:0,index:0},!1):(d.state.index=b,!0);default:throw new Error("ForceAtlas2 - atomic state error")}},this.clean=function(){var a,b=this.graph.nodes(),c=b.length;for(a=0;c>a;a++)delete b[a].fa2},this.setAutoSettings=function(){var a=this.graph;return this.p.scalingRatio=a.nodes().length>=100?2:10,this.p.strongGravityMode=!1,this.p.gravity=1,this.p.outboundAttractionDistribution=!1,this.p.linLogMode=!1,this.p.adjustSizes=!1,this.p.edgeWeightInfluence=1,this.p.jitterTolerance=a.nodes().length>=5e4?10:a.nodes().length>=5e3?1:.1,this.p.barnesHutOptimize=a.nodes().length>=1e3?!0:!1,this.p.barnesHutTheta=1.2,this},this.kill=function(){},this.ForceFactory={buildRepulsion:function(a,b){return a?new this.linRepulsion_antiCollision(b):new this.linRepulsion(b)},getStrongGravity:function(a){return new this.strongGravity(a)},buildAttraction:function(a,b,c,d){return c?a?b?new this.logAttraction_degreeDistributed_antiCollision(d):new this.logAttraction_antiCollision(d):b?new this.linAttraction_degreeDistributed_antiCollision(d):new this.linAttraction_antiCollision(d):a?b?new this.logAttraction_degreeDistributed(d):new this.logAttraction(d):b?new this.linAttraction_massDistributed(d):new this.linAttraction(d)},linRepulsion:function(a){this.coefficient=a,this.apply_nn=function(a,b){if(a.fa2&&b.fa2){var c=a.x-b.x,d=a.y-b.y,e=Math.sqrt(c*c+d*d);if(e>0){var f=this.coefficient*a.fa2.mass*b.fa2.mass/Math.pow(e,2);a.fa2.dx+=c*f,a.fa2.dy+=d*f,b.fa2.dx-=c*f,b.fa2.dy-=d*f}}},this.apply_nr=function(a,b){var c=a.x-b.p.massCenterX,d=a.y-b.p.massCenterY,e=Math.sqrt(c*c+d*d);if(e>0){var f=this.coefficient*a.fa2.mass*b.p.mass/Math.pow(e,2);a.fa2.dx+=c*f,a.fa2.dy+=d*f}},this.apply_g=function(a,b){var c=a.x,d=a.y,e=Math.sqrt(c*c+d*d);if(e>0){var f=this.coefficient*a.fa2.mass*b/e;a.fa2.dx-=c*f,a.fa2.dy-=d*f}}},linRepulsion_antiCollision:function(a){this.coefficient=a,this.apply_nn=function(a,b){var c;if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e)-a.size-b.size;f>0?(c=this.coefficient*a.fa2.mass*b.fa2.mass/Math.pow(f,2),a.fa2.dx+=d*c,a.fa2.dy+=e*c,b.fa2.dx-=d*c,b.fa2.dy-=e*c):0>f&&(c=100*this.coefficient*a.fa2.mass*b.fa2.mass,a.fa2.dx+=d*c,a.fa2.dy+=e*c,b.fa2.dx-=d*c,b.fa2.dy-=e*c)}},this.apply_nr=function(a,b){var c,d=a.fa2.x()-b.getMassCenterX(),e=a.fa2.y()-b.getMassCenterY(),f=Math.sqrt(d*d+e*e);f>0?(c=this.coefficient*a.fa2.mass*b.getMass()/Math.pow(f,2),a.fa2.dx+=d*c,a.fa2.dy+=e*c):0>f&&(c=-this.coefficient*a.fa2.mass*b.getMass()/f,a.fa2.dx+=d*c,a.fa2.dy+=e*c)},this.apply_g=function(a,b){var c=a.x,d=a.y,e=Math.sqrt(c*c+d*d);if(e>0){var f=this.coefficient*a.fa2.mass*b/e;a.fa2.dx-=c*f,a.fa2.dy-=d*f}}},strongGravity:function(a){this.coefficient=a,this.apply_nn=function(){},this.apply_nr=function(){},this.apply_g=function(a,b){var c=a.x,d=a.y,e=Math.sqrt(c*c+d*d);if(e>0){var f=this.coefficient*a.fa2.mass*b;a.fa2.dx-=c*f,a.fa2.dy-=d*f}}},linAttraction:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=-this.coefficient*c;a.fa2.dx+=d*f,a.fa2.dy+=e*f,b.fa2.dx-=d*f,b.fa2.dy-=e*f}}},linAttraction_massDistributed:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=-this.coefficient*c/a.fa2.mass;a.fa2.dx+=d*f,a.fa2.dy+=e*f,b.fa2.dx-=d*f,b.fa2.dy-=e*f}}},logAttraction:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e);if(f>0){var g=-this.coefficient*c*Math.log(1+f)/f;a.fa2.dx+=d*g,a.fa2.dy+=e*g,b.fa2.dx-=d*g,b.fa2.dy-=e*g}}}},logAttraction_degreeDistributed:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e);if(f>0){var g=-this.coefficient*c*Math.log(1+f)/f/a.fa2.mass;a.fa2.dx+=d*g,a.fa2.dy+=e*g,b.fa2.dx-=d*g,b.fa2.dy-=e*g}}}},linAttraction_antiCollision:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e);if(f>0){var g=-this.coefficient*c;a.fa2.dx+=d*g,a.fa2.dy+=e*g,b.fa2.dx-=d*g,b.fa2.dy-=e*g}}}},linAttraction_degreeDistributed_antiCollision:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e);if(f>0){var g=-this.coefficient*c/a.fa2.mass;a.fa2.dx+=d*g,a.fa2.dy+=e*g,b.fa2.dx-=d*g,b.fa2.dy-=e*g}}}},logAttraction_antiCollision:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e);if(f>0){var g=-this.coefficient*c*Math.log(1+f)/f;a.fa2.dx+=d*g,a.fa2.dy+=e*g,b.fa2.dx-=d*g,b.fa2.dy-=e*g}}}},logAttraction_degreeDistributed_antiCollision:function(a){this.coefficient=a,this.apply_nn=function(a,b,c){if(a.fa2&&b.fa2){var d=a.x-b.x,e=a.y-b.y,f=Math.sqrt(d*d+e*e);if(f>0){var g=-this.coefficient*c*Math.log(1+f)/f/a.fa2.mass;a.fa2.dx+=d*g,a.fa2.dy+=e*g,b.fa2.dx-=d*g,b.fa2.dy-=e*g}}}}}},a.Region=function(a,b){this.depthLimit=20,this.size=0,this.nodes=a,this.subregions=[],this.depth=b,this.p={mass:0,massCenterX:0,massCenterY:0},this.updateMassAndGeometry()},a.Region.prototype.updateMassAndGeometry=function(){if(this.nodes.length>1){var a=0,b=0,c=0;this.nodes.forEach(function(d){a+=d.fa2.mass,b+=d.x*d.fa2.mass,c+=d.y*d.fa2.mass});var d,e=b/a,f=c/a;this.nodes.forEach(function(a){var b=Math.sqrt((a.x-e)*(a.x-e)+(a.y-f)*(a.y-f));d=Math.max(d||2*b,2*b)}),this.p.mass=a,this.p.massCenterX=e,this.p.massCenterY=f,this.size=d}},a.Region.prototype.buildSubRegions=function(){if(this.nodes.length>1){var b,c,d,e,f=[],g=[],h=[],i=this.p.massCenterX,j=this.p.massCenterY,k=this.depth+1,l=this,m=[],n=[],o=[],p=[];this.nodes.forEach(function(a){b=a.x<i?f:g,b.push(a)}),f.forEach(function(a){c=a.y<j?m:n,c.push(a)}),g.forEach(function(a){c=a.y<j?p:o,c.push(a)}),[m,n,o,p].filter(function(a){return a.length}).forEach(function(b){k<=l.depthLimit&&b.length<l.nodes.length?(e=new a.Region(b,k),h.push(e)):b.forEach(function(b){d=[b],e=new a.Region(d,k),h.push(e)})}),this.subregions=h,h.forEach(function(a){a.buildSubRegions()})}},a.Region.prototype.applyForce=function(a,b,c){if(this.nodes.length<2){var d=this.nodes[0];b.apply_nn(a,d)}else{var e=Math.sqrt((a.x-this.p.massCenterX)*(a.x-this.p.massCenterX)+(a.y-this.p.massCenterY)*(a.y-this.p.massCenterY));e*c>this.size?b.apply_nr(a,this):this.subregions.forEach(function(d){d.applyForce(a,b,c)})}},sigma.prototype.startForceAtlas2=function(){function b(){conrad.hasJob("forceatlas2_"+c.id)||conrad.addJob({id:"forceatlas2_"+c.id,job:c.forceatlas2.atomicGo,end:function(){c.refresh(),c.forceatlas2.isRunning&&b()}})}if((this.forceatlas2||{}).isRunning)return this;this.forceatlas2||(this.forceatlas2=new a.ForceAtlas2(this.graph),this.forceatlas2.setAutoSettings(),this.forceatlas2.init()),this.forceatlas2.isRunning=!0;var c=this;return b(),this},sigma.prototype.stopForceAtlas2=function(){return conrad.hasJob("forceatlas2_"+this.id)&&conrad.killJob("forceatlas2_"+this.id),(this.forceatlas2||{}).isRunning&&(this.forceatlas2.state={step:0,index:0},this.forceatlas2.isRunning=!1,this.forceatlas2.clean()),this},a.defaultSettings={autoSettings:!0,linLogMode:!1,outboundAttractionDistribution:!1,adjustSizes:!1,edgeWeightInfluence:0,scalingRatio:1,strongGravityMode:!1,gravity:1,jitterTolerance:1,barnesHutOptimize:!1,barnesHutTheta:1.2,speed:1,outboundAttCompensation:1,totalSwinging:0,totalEffectiveTraction:0,complexIntervals:500,simpleIntervals:1e3}}();
