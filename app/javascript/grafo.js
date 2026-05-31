function mouseover(d) {
  d3.selectAll(".link")
    .transition().duration(500)
    .style("opacity", function (o) {
      return o.source === d || o.target === d ? 1 : 0.1
    })
}

function mouseout() {
  d3.selectAll(".link")
    .transition().duration(500)
    .style("opacity", 0.4)
  d3.selectAll(".node")
    .transition().duration(500)
    .style("opacity", 1)
}

window.monta = function (graph, width) {
  var container = document.querySelector(".grafo")
  if (!container) return

  var height = 500

  var svg = d3.select(container)
    .append("svg")
    .attr("width", width)
    .attr("height", height)

  var edges = []
  graph.links.forEach(function (e) {
    var sourceNode = graph.nodes.filter(function (n) { return n.id === e.source })[0]
    var targetNode = graph.nodes.filter(function (n) { return n.id === e.target })[0]
    if (sourceNode && targetNode) {
      edges.push({ source: sourceNode, target: targetNode, value: e.value })
    }
  })

  var force = d3.layout.force()
    .nodes(graph.nodes)
    .links(edges)
    .size([width, height])
    .linkDistance(150)
    .charge(-600)
    .on("tick", tick)
    .start()

  svg.append("svg:defs")
    .selectAll("marker")
    .data(["end"])
    .enter()
    .append("svg:marker")
    .attr("id", String)
    .attr("viewBox", "0 -5 10 10")
    .attr("refX", 26)
    .attr("refY", -1.5)
    .attr("markerWidth", 6)
    .attr("markerHeight", 6)
    .attr("orient", "auto")
    .append("svg:path")
    .attr("d", "M0,-5L10,0L0,5")

  var path = svg.append("svg:g")
    .selectAll("path")
    .data(force.links())
    .enter()
    .append("svg:path")
    .attr("class", "link")
    .text(function (d) { return d.value })
    .attr("marker-end", "url(#end)")

  var node = svg.selectAll(".node")
    .data(force.nodes())
    .enter()
    .append("g")
    .attr("class", "node")
    .on("mouseover", mouseover)
    .on("mouseout", mouseout)
    .call(force.drag)

  node.append("circle")
    .attr("r", 10)
    .attr("class", function (d) { return d.type })

  node.append("text")
    .attr("x", 16)
    .attr("dy", ".35em")
    .text(function (d) { return d.label })

  function tick() {
    node.attr("transform", function (d) { return "translate(" + d.x + "," + d.y + ")" })
    path.attr("d", function (d) {
      var dx = d.target.x - d.source.x
      var dy = d.target.y - d.source.y
      var dr = Math.sqrt(dx * dx + dy * dy)
      return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y
    })
  }
}
