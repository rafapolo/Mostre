#  todo: bl.ocks.org/MoritzStefaner/1377729

mouseover = (d) ->
  d3.selectAll('.link')
    .transition()
        .duration(500)
          .style 'opacity', (o) ->
    if o.source == d or o.target == d then 1 else 0.1

mouseout = ->
  d3.selectAll('.link')
    .transition()
      .duration(500)
        .style 'opacity', 0.4
  d3.selectAll('.node')
    .transition()
      .duration(500)
        .style 'opacity', 1


window.monta = (graph, width) ->
  if $('.grafo').length > 0

    tick = ->
      node.attr 'transform', (d) -> "translate(#{d.x}, #{d.y})"

      path.attr 'd', (d) ->
        dx = d.target.x - (d.source.x)
        dy = d.target.y - (d.source.y)
        dr = Math.sqrt(dx * dx + dy * dy)
        'M' + d.source.x + ',' + d.source.y + 'A' + dr + ',' + dr + ' 0 0,1 ' + d.target.x + ',' + d.target.y

      # labels
      #   .attr('transform', (d) -> "translate(#{d.x}, #{d.y})")

    height = 500
    svg = d3.select('.grafo')
      .append('svg')
        .attr('width', width)
        .attr('height', height)

    edges = []
    graph.links.forEach (e) ->
      sourceNode = graph.nodes.filter((n) -> n.id == e.source)[0]
      targetNode = graph.nodes.filter((n) -> n.id == e.target)[0]

      edges.push
        source: sourceNode
        target: targetNode
        value: e.value

    force = d3.layout
      .force()
      .nodes(graph.nodes)
      .links(edges)
      .size([width, height])
      .linkDistance(150)
      .charge(-600)
      .on('tick', tick)
      .start()

    #  < arrows >
    svg.append('svg:defs')
      .selectAll('marker')
      .data([ 'end' ])
      .enter()
      .append('svg:marker')
        .attr('id', String)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 26)
        .attr('refY', -1.5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto')
      .append('svg:path')
        .attr  'd', 'M0,-5L10,0L0,5'

    # add the links and the arrows
    path = svg.append('svg:g')
    .selectAll('path')
    .data force.links()
    .enter()
    .append('svg:path')
      .attr('class', 'link')
      .text((d) -> d.value)
      .attr('marker-end', 'url(#end)')

    # define the nodes
    node = svg.selectAll('.node')
      .data(force.nodes())
      .enter()
      .append('g')
        .attr('class', 'node')
        .on('mouseover', mouseover)
        .on('mouseout', mouseout)
        .call(force.drag)

    # labels = svg.selectAll('text')
    # .data(graph.links)
    # .enter().append('text')
    #   .attr("x", (d) -> (d.source.y + d.target.y) / 2)
    #   .attr("y", (d) -> (d.source.x + d.target.x) / 2)
    #   .attr("text-anchor", "middle")
    #   .text("2");

    # add the nodes
    node
      .append('circle')
        .attr('r', (d) -> if d.type == 'proponente' then 10 else 10 )
        .attr('class', (d) -> d.type)

    # add the text
    node
      .append('text')
        .attr('x', 16)
        .attr('dy', '.35em')
        .text (d) -> d.label