# Entidade -> (candidato, comite, partido)
class TSE::Entidade < ActiveRecord::Base
  self.table_name = 'tse_entidades'

  validates_presence_of :nome

  before_save :set_meta_attrs
  def set_meta_attrs
    ( self.empresa = (self.cpf.size > 11) ? 1 : 0 ) if self.cpf
  end

  def doou
    TSE::Donation.where(doador_id: self.id)
  end

  def recebeu
    TSE::Donation.where(receptor_id: self.id)
  end

end
