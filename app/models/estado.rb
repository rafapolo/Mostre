class Estado < ActiveRecord::Base
	has_many :projetos
	has_many :entidades, through: :projetos
end
