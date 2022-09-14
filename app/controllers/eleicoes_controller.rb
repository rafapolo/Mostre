class EleicoesController < ApplicationController
	 skip_before_filter :verify_authenticity_token, :only => [:inscrever]

	def root
		render layout: false
	end

	def index
		# @patrocinadores_count = Entidade.patrocinadores.count
  # 		@projetos_count = Projeto.count
		# @valor_total = Incentivo.sum(:valor)
		@title = 'Eleições'
	end

end
