class Cidade < ActiveRecord::Base
	belongs_to :estado
	has_many :entidades	

	# geocoded_by :endereco
	# after_validation :geocode
	
	# private
	# def endereco
	# 	"#{self.nome} - #{self.estado.nome}, Brasil"
	# end
end
