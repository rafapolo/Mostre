class Cidade < ActiveRecord::Base
	belongs_to :estado
	has_many :entidades

  is_impressionable :counter_cache => true, :unique => true

  def expire_cache
    cache = "#{ActionController::Base.cache_store.cache_path}/cultura/cidades/#{self.estado.urlized}/#{self.urlized}.html"
    File.delete cache if File.exists? cache
  end

	# geocoded_by :endereco
	# after_validation :geocode

	# private
	# def endereco
	# 	"#{self.nome} - #{self.estado.nome}, Brasil"
	# end

end
