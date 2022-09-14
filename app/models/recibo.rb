class Recibo < ApplicationRecord

	belongs_to :incentivo, :touch => true
	has_one :entidade, :through=>:incentivo
	has_one :projeto, :through=>:incentivo

	default_scope { order('valor DESC') }

	validates_presence_of :valor, :data, :incentivo_id
	validates_uniqueness_of :valor, scope: [:data, :incentivo_id]
end
