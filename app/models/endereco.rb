class Endereco < ActiveRecord::Base
  belongs_to :city
  has_many :institucionalizations
  has_many :cursos, :through => :institucionalizations
  has_many :instituicaos, :through => :institucionalizations

  #geocoded_by :completo

  def completo
  	numero = self.numero if self.numero && self.numero>0
  	bairro = self.bairro if self.bairro
  	city = self.city.name if self.city && self.city.name
  	state = self.city.state.name if self.city && self.city.state
  	"#{self.endereco}, #{numero} - #{city} - #{state}, Brasil"
  end
end
