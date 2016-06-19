class Curso < ActiveRecord::Base
  has_many :institucionalizations
  has_many :instituicaos, :through => :institucionalizations

  validates :nome, :presence => true, :uniqueness => true

  before_save :urlize
  def urlize
    self.urlized = nome.urlize
  end

  def primeiro_em
    Institucionalization.where(curso_id: self.id).where("liberado_at IS NOT NULL").order("liberado_at ASC").limit(1).take
  end
end
