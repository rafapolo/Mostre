class Doacao < ApplicationRecord
  belongs_to :candidato
  belongs_to :comite
  belongs_to :doador
end
