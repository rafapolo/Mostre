class Projeto < ActiveRecord::Base
	belongs_to :entidade
	belongs_to :estado
	belongs_to :segmento
	belongs_to :area

	has_many :incentivos
	# has_many :apoiadores, :source => :entidade, :through => :incentivos

	scope :aprovados, -> { where('liberado_at is not null') }

	validates_uniqueness_of :numero
	validates_presence_of :nome, :numero, :entidade_id, :uf, :area, :segmento, :processo, :mecanismo, :sintese, :solicitado, 
		:aprovado, :apoiado, :sintese

	before_save :set_meta_attrs

	def set_meta_attrs
		self.urlized = self.nome.urlize
		self.estado_id = Estado.find_by_sigla(self.uf)
	end

	def to_param		
		self.urlized
	end

end