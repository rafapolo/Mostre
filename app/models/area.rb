class Area < ApplicationRecord
	has_many :segmentos
	has_many :projetos, :through => :segmentos

	def soma_incentivos
		join(:incentivos).join(:projetos).select('sum() as soma_incentivos')
	end

	before_save :set_meta_attrs

	def set_meta_attrs
		self.urlized = self.nome.urlize
	end
end
