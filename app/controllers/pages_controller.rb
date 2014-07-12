class PagesController < ApplicationController
	 skip_before_filter :verify_authenticity_token, :only => [:inscrever]

	#caches_page :visu


	def root
		render layout: false
	end

	def index
		# @patrocinadores_count = Entidade.patrocinadores.count
  # 		@projetos_count = Projeto.count
		# @valor_total = Incentivo.sum(:valor)
		@title = 'Cultura'
	end

	def salicnet
		@numero = params[:numero]
		render layout: false
	end

	def inscrever
		email = params[:email]
		if email != ""
			session[:email] = true
			Newsletter.find_or_create_by(email: email)
			render text: "Ok. #{email} cadastrado. Até breve, e obrigado.", layout: false
		else
			render text: "Opz. Email inválido.", layout: false
		end
	end

	def cidade
		estado_id = Estado.find_by(sigla: params[:uf].upcase).id
		@cidade = Cidade.find_by(urlized: params[:nome], estado_id: estado_id)
		proponentes_count = Entidade.proponentes.where(cidade_id: @cidade.id).count
		patrocinadores_count = Entidade.patrocinadores.where(cidade_id: @cidade.id).count
		@title = @cidade.nome
		@entidades = Entidade.where(cidade_id: @cidade.id)
		proponentes_sum = view_context.number_to_currency(@entidades.sum(:projetos_sum), :unit => "R$")
		incentivos_sum = view_context.number_to_currency(@entidades.sum(:incentivos_sum), :unit => "R$")
		@resumo = "#{proponentes_count} Proponentes captaram #{proponentes_sum} e #{patrocinadores_count} Patrocinadores incentivaram #{incentivos_sum} na cidade"
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
