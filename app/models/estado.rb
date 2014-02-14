class Estado < ActiveRecord::Base
	has_many :projetos
	has_many :entidades, through: :projetos
	has_many :cidades

	default_scope -> {where("sigla != 'XX'")} # remove Estado Desconhecido

	def urlized
		sigla.downcase
	end
end
