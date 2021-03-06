class Entidade < ActiveRecord::Base

	belongs_to :estado
	belongs_to :cidade

	has_many :projetos
	has_many :incentivos

	scope :patrocinadores, -> {where(patrocinador: 1)}
	scope :proponentes, -> {where(proponente: 1)}
	scope :empresas, -> {where(empresa: 1)}
	scope :pessoas, -> {where(empresa: 0)}

	is_impressionable :counter_cache => true, :unique => true

	before_save :set_meta_attrs
	# deduz meta-informações. é proponente? empresa? soma apoios, etc.
	def set_meta_attrs
		self.empresa = self.cnpjcpf.size==14
		self.proponente = self.projetos.count>0
		self.patrocinador = self.incentivos.count>0

		estado = Estado.find_by_nome(self.uf)
		self.estado_id = estado ? estado.id : 100 # desconhecido

		self.projetos_count = self.projetos.count
		self.projetos_sum = self.projetos.map(&:apoiado).sum.to_f # &:solicitado para FNC ?
		self.projetos_liberados = Projeto.where(entidade_id: self.id).where('apoiado > 0').count
		# todo: incentivadores_count // filtra entidades/empresas por incentivos
		self.incentivos_count = self.incentivos.count
		self.incentivos_sum = self.incentivos.map(&:valor).sum.to_f
		self.last_incentivo = self.incentivos.sort_by{:last_recibo_at}.first.last_recibo_at if self.patrocinador

		self.logradouro = self.logradouro.clean_extra_spaces
		self.nome = self.nome.normalize if self.nome && !self.empresa
		self.urlized = self.nome.urlize
	end

	def similares
		Entidade.where("nome LIKE ?", "%#{self.nome}%") - [self]
	end

  def expire_cache
    cache = "#{ActionController::Base.cache_store.cache_path}/cultura/entidades/#{self.to_param}.html"
    File.delete cache if File.exists? cache
  end

	def to_param
		"#{self.id}-#{self.urlized}"
	end

end
