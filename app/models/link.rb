
class Link < ActiveRecord::Base
  has_many :clicks, :dependent => :destroy

  validates_length_of :titulo, :in=>5..45, :message=>"deve ter entre 5 e 45 caracteres"
  validates_length_of :atalho, :in=>5..45, :message=>"gerado deve ter entre 5 e 45 caracteres"
  validates_length_of :para, :minimum=>15, :too_short=>"não pode ter menos de 15 caracteres"
  validates_format_of :para, :message=>"deve ter o formato de uma URL", :with => URI::regexp(%w(http https))
  validates_uniqueness_of :atalho, :message=>"com esse título já foi cadastrado, escolha outro"
  before_validation :urlize, :only => [:titulo]

  private

  def urlize
    self.titulo.strip!
    self.atalho = titulo.urlize
  end

end
