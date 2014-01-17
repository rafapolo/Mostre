class Incentivo < ActiveRecord::Base

  belongs_to :projeto, :touch => true
  belongs_to :entidade, :touch => true
  has_many :recibos

  default_scope order('valor DESC')

  validates_presence_of :projeto_id, :entidade_id, :valor
  validates_uniqueness_of :valor, scope: [:projeto_id, :entidade_id]

  before_save :update_meta_attrs 
  def update_meta_attrs
  	self.last_recibo_at = Recibo.where(incentivo_id: self.id).order('data DESC').select(:data).limit(1).take.data
  end

end