# Entidade -> (candidato, comite, partido)
class TSE::Entidade < ActiveRecord::Base
  self.table_name = 'tse_entidades'

  has_many :doou, -> { where doador_id: self.id }, class_name: 'TSE::Donation'
  has_many :recebeu, -> { where receptor_id: self.id }, class_name: 'TSE::Donation'

  #validates_presence_of :nome

  before_save :set_meta_attrs
  def set_meta_attrs
    #self.urlized = self.nome.urlize if self.nome
    if self.cpf
      self.empresa = (self.cpf.size > 11) ? 1 : 0
    end
  end
end
