class Doador < ApplicationRecord
  has_many :doacoes
  has_many :candidatos, :through => :doacoes

  default_scope { order('valor_total DESC') }
end
