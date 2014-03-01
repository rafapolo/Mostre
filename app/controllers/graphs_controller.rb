class GraphsController < ApplicationController

  def entidade
  	id = params[:id]
  	@entidade = Entidade.find(id)
  	json = {}
  	nodes = []
  	edges = []
  	nodes << {id: "i#{id}", label: @entidade.nome, size: 5, x: 0, y: 0}
  	incentivos = Incentivo.joins(:projeto).where(entidade_id: @entidade).to_a
  	incentivos.each do |i|
  		nodes << {id: "i#{i.projeto.id}", label: i.projeto.nome, size: 3, x: 1, y: 1}
  		edges << {id: "i#{id}-#{i.projeto.id}", source: "i#{id}", target: "i#{i.projeto.id}"}
  	end
  	nodes.uniq!
  	edges.uniq!
   	#render json: {nodes: nodes, edges: edges}
   	render text: '{
  "nodes": [
    {
      "id": "n0",
      "label": "A node",
      "x": 0,
      "y": 0,
      "size": 3
    },
    {
      "id": "n1",
      "label": "Another node",
      "x": 1,
      "y": 1,
      "size": 2
    },
    {
      "id": "n2",
      "label": "And a last one",
      "x": 1,
      "y": 1,
      "size": 1
    }
  ],
  "edges": [
    {
      "id": "e0",
      "source": "n0",
      "target": "n1"
    },
    {
      "id": "e1",
      "source": "n1",
      "target": "n2"
    },
    {
      "id": "e2",
      "source": "n2",
      "target": "n0"
    }
  ]
}'
  end

end

