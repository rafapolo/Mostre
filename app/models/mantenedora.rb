class Mantenedora < ActiveRecord::Base
  has_many :instituicaos

  validates :cod_mec, :presence => true, :uniqueness => true
end
