class Projeto < ActiveRecord::Base
	belongs_to :entidade, :touch => true
	belongs_to :estado
	belongs_to :segmento
	belongs_to :area

	has_many :incentivos
	# has_many :apoiadores, :source => :entidade, :through => :incentivos

	is_impressionable :counter_cache => true, :unique => true

	#default_scope -> {order('situacao_at DESC')}
	scope :aprovados, -> { where('liberado_at is not null') }

	validates_uniqueness_of :numero
	validates_presence_of :nome, :numero, :entidade_id, :uf, :area, :segmento, :processo, :mecanismo, :sintese, :solicitado,
		:aprovado, :apoiado, :sintese

	before_save :set_meta_attrs

	def set_meta_attrs
		self.urlized = self.nome.urlize
		self.estado_id = Estado.find_by_sigla(self.uf).id unless self.estado
		#self.liberado = self.mecanismo == 'FNC' || self.mecanismo == 'Recurso do Tesouro' || self.liberado_at
	end

	def to_param
		"#{self.id}-#{self.urlized}"
	end

  def expire_cache
    cache = "#{ActionController::Base.cache_store.cache_path}/cultura/projetos/#{self.to_param}.html"
    File.delete cache if File.exists? cache
  end

end
