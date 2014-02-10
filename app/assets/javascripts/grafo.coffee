# Add a method to the graph model that returns an
# object with every neighbors of a node inside:
sigma.classes.graph.addMethod "neighbors", (nodeId) ->
  k = undefined
  neighbors = {}
  index = @allNeighborsIndex[nodeId] or {}
  for k of index
    continue
  neighbors

sigma.parsers.gexf "props.gexf",
  container: "sigma-container",
, (s) ->
  
  # We first need to save the original colors of our
  # nodes and edges, like this:
  s.graph.nodes().forEach (n) ->
    n.originalColor = n.color
    return

  s.graph.edges().forEach (e) ->
    e.originalColor = e.color
    return

  
  # When a node is clicked, we check for each node
  # if it is a neighbor of the clicked one. If not,
  # we set its color as grey, and else, it takes its
  # original color.
  # We do the same for the edges, and we only keep
  # edges that have both extremities colored.
  s.bind "clickNode", (e) ->
    nodeId = e.data.node.id
    toKeep = s.graph.neighbors(nodeId)
    toKeep[nodeId] = e.data.node
    s.graph.nodes().forEach (n) ->
      if toKeep[n.id]
        n.color = n.originalColor
      else
        n.color = "#eee"
      return

    s.graph.edges().forEach (e) ->
      if toKeep[e.source] and toKeep[e.target]
        e.color = e.originalColor
      else
        e.color = "#eee"
      return

    
    # Since the data has been modified, we need to
    # call the refresh method to make the colors
    # update effective.
    s.refresh()
    return

  
  # When the stage is clicked, we just color each
  # node and edge with its original color.
  s.bind "clickStage", (e) ->
    s.graph.nodes().forEach (n) ->
      n.color = n.originalColor
      return

    s.graph.edges().forEach (e) ->
      e.color = e.originalColor
      return

    
    # Same as in the previous event:
    s.refresh()
    return

  return
