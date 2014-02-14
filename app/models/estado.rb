class Estado < ActiveRecord::Base
	has_many :projetos
	has_many :entidades, through: :projetos
	has_many :cidades

	def all
		self.all - [Estado.find_by_sigla('XX')] # remove Estado Desconhecido
	end

	def urlized
		sigla.downcase
	end
end
