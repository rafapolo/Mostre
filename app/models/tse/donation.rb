class TSE::Donation < ActiveRecord::Base
  self.table_name = 'tse_donations'

  # Doador -> valor -> Receptor
  belongs_to :doou, class_name: 'TSE::Entidade', foreign_key: 'doador_id'
  belongs_to :receptor, class_name: 'TSE::Entidade', foreign_key: 'receptor_id'
  # Entidade -> (candidato, comite, partido)

end
