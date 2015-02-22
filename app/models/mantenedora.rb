class Mantenedora < ActiveRecord::Base
  has_many :instituicaos

  validates :cod_mec, :presence => true, :uniqueness => true

  #default_scope -> {order('nome')}

  # todo: instituicaos_count
end
