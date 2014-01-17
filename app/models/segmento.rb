class Segmento < ActiveRecord::Base
	belongs_to :area
	has_many :projetos	

	def soma_incentivos
		self.joins(:incentivos).join(:projetos).select('sum() as soma_incentivos')
	end

	before_save :set_meta_attrs

	def set_meta_attrs
		self.urlized = self.nome.urlize
	end
end
