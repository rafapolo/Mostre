class Instituicao < ApplicationRecord
  #default_scope :order => 'nome'

  belongs_to :endereco
  belongs_to :mantenedora
  has_many :institucionalizations, :dependent => :delete_all
  has_many :enderecos, :through => :institucionalizations
  has_many :cursos, :through => :institucionalizations
  has_many :cities, :through => :enderecos

  validates :cod_mec, :presence => true, :uniqueness => true
  validates :nome, :presence => true

  default_scope -> {order('liberada_at DESC')}

  before_save :urlize
  def urlize
    self.urlized = nome.urlize
  end

end
