class Institucionalization < ActiveRecord::Base
  belongs_to :instituicao
  belongs_to :curso
  belongs_to :endereco
end
