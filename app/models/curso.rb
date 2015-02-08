class Curso < ActiveRecord::Base
  has_many :institucionalizations
  has_many :instituicaos, :through => :institucionalizations

  validates :nome, :presence => true, :uniqueness => true

  before_save :urlize
  def urlize
    self.urlized = nome.urlize
  end
end
