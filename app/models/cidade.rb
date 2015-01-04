class Cidade < ActiveRecord::Base
	belongs_to :estado
	has_many :entidades

  is_impressionable :counter_cache => true, :column_name => :counte_cache, :unique => true

	# geocoded_by :endereco
	# after_validation :geocode

	# private
	# def endereco
	# 	"#{self.nome} - #{self.estado.nome}, Brasil"
	# end
end
