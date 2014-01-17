class Entidade < ActiveRecord::Base
	has_many :projetos
	has_many :incentivos
	belongs_to :estado

	scope :patrocinadores, -> {where(patrocinador: true)}
	scope :proponentes, -> {where(proponente: true)}
	scope :empresas, -> {where(empresa: true)}
	scope :pessoas, -> {where(empresa: false)}

	before_save :set_meta_attrs
	# deduz meta-informações. é proponente? empresa? soma em apoios?
	def set_meta_attrs				
		self.estado_id = Estado.find_by_nome(self.uf).id
		self.empresa = true if self.cnpjcpf.size==11
		self.proponente = true if self.projetos.count>0
		self.patrocinador = true if self.incentivos.count>0
		
		self.projetos_count = self.projetos.count
		self.projetos_sum = self.projetos.map(&:apoiado).sum.to_f # &:solicitado para FNC ?
		self.incentivos_count = self.incentivos.count
		self.incentivos_sum = self.incentivos.map(&:valor).sum.to_f
		self.logradouro = self.logradouro.clean_extra_spaces

		self.nome = self.nome.normalize if self.nome && !self.empresa
		self.urlized = self.nome.urlize
	end
	
end
