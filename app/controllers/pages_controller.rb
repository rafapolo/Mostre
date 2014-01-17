class PagesController < ApplicationController

	#caches_page :visu

	def index
		@patrocinadores_count = Entidade.patrocinadores.count
  		@projetos_count = Projeto.count
		@valor_total = Incentivo.sum(:valor)
	end

	def salicnet		
		@numero = params[:numero]
		render layout: false
	end

	def visu		
		# data = {name: 'Áreas x Projetos Aprovados'}
		# data[:children] = []

		# Area.all.each do |a|
		# 	segmentos = []
		# 	a.segmentos.each do |s|
		# 		count = s.projetos.aprovados.count
		# 		#top_projetos = s.projetos.aprovados.tops.map{|p|{name: p.nome, value: p.apoiado}}
		# 		segmentos << {name: "#{s.nome} (#{count})", value: count}
		# 	end			
		# 	count = a.projetos.aprovados.count
		# 	data[:children] << {name: "#{a.nome} (#{count})", value: count, children: segmentos}
		# end

		data = File.open(Rails.public_path.join("data/area.json")).read
		

		render json: data
	end

end
