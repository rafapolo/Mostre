class Candidato < ActiveRecord::Base
  has_many :doacoes
  has_many :doadores, :through => :doacoes

  # default_scope { order('nome ASC') }
end
