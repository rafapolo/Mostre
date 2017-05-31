class Doador < ActiveRecord::Base
  has_many :doacoes
  has_many :candidatos, :through => :doacoes

  default_scope { order('valor_total DESC') }
end
