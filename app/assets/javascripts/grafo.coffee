  # uid = $("#entidade").attr("uid")
  # sigma.parsers.json "./grafo/" + uid + ".json",
  #   container: "sigma-container"
  #   settings:
  #     defaultNodeColor: "#ec5148"
  
  # , (s) ->
  #   s.startForceAtlas2()
  #   setInterval (->
  #     s.stopForceAtlas2()
  #     return
  #   ), 3000

  var nodeMap = {}
g.eachNode(function (u, name) {
    nodeMap[u] = {
        name: name
    };
})
var nodes = d3.values(nodeMap);
var edges = g.edges().map(function (e) {
    return {
        source: nodeMap[g.source(e)],
        target: nodeMap[g.target(e)]
    };
});

// D3 stuff starts here
var width = 600,
    height = 500

var svg = d3.select("body").append("svg")
    .attr("width", width)
    .attr("height", height);

svg.append("svg:defs").append("svg:marker")
    .attr("id", "arrowhead")
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 15)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5");

var force = d3.layout.force()
    .gravity(.005)
    .distance(120)
    .charge(-250)
    .size([width, height]);

force.nodes(nodes)
    .links(edges)
    .start();

var link = svg.selectAll(".link")
    .data(edges)
    .enter().append("path")
    .attr("class", "link")
    .attr("marker-end", "url(#arrowhead)");

var node = svg.selectAll(".node")
    .data(nodes)
    .enter()
    .append("g")
    .attr("class", "node");

node.append("circle")
    .attr("r", 5)
    .call(force.drag);

node.append("text")
    .attr("x", 12)
    .attr("y", ".31em")
    .attr("class", "shadow")
    .text(function (d) {
    return d.name;
});

node.append("text")
    .attr("dx", 12)
    .attr("dy", ".35em")
    .text(function (d) {
    return d.name
});

force.on("tick", function () {
    link.attr("d", function (d) {
        var dx = d.target.x - d.source.x,
            dy = d.target.y - d.source.y,
            dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
    });

    node.attr("transform", function (d) {
        return "translate(" + d.x + "," + d.y + ")";
    });
});