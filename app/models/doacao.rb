class Doacao < ActiveRecord::Base
  belongs_to :candidato
  belongs_to :comite
  belongs_to :doador
end
