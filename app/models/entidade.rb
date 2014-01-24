class Entidade < ActiveRecord::Base
	has_many :projetos
	has_many :incentivos
	belongs_to :estado

	scope :patrocinadores, -> {where(patrocinador: 1)}
	scope :proponentes, -> {where(proponente: 1)}
	scope :empresas, -> {where(empresa: 1)}
	scope :pessoas, -> {where(empresa: 0)}

	before_save :set_meta_attrs
	# deduz meta-informações. é proponente? empresa? soma apoios, etc.
	def set_meta_attrs				
		estado = Estado.find_by_nome(self.uf)
		self.estado_id = estado ? estado.id : 0

		self.empresa = self.cnpjcpf.size==14
		self.proponente = self.projetos.count>0
		self.patrocinador = self.incentivos.count>0
		
		self.projetos_count = self.projetos.count
		self.projetos_sum = self.projetos.map(&:apoiado).sum.to_f # &:solicitado para FNC ?
		self.projetos_liberados = Projeto.where(entidade_id: self.id).where('liberado_at is not null').count

		self.incentivos_count = self.incentivos.count
		self.incentivos_sum = self.incentivos.map(&:valor).sum.to_f
		
		self.logradouro = self.logradouro.clean_extra_spaces
		self.nome = self.nome.normalize if self.nome && !self.empresa
		self.urlized = self.nome.urlize
	end

	def to_param		
		self.urlized
	end
	
end
