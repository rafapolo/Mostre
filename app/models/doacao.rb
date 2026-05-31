class Doacao < ApplicationRecord
  belongs_to :candidato, optional: true
  belongs_to :comite, optional: true
  belongs_to :doador, optional: true
end
