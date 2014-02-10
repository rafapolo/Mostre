class Estado < ActiveRecord::Base
	has_many :projetos
	has_many :entidades, through: :projetos
	has_many :cidades

	def urlized
		sigla.downcase
	end
end
