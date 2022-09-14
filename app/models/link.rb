
class Link < ApplicationRecord
  has_many :clicks, :dependent => :destroy

  validates_length_of :titulo, :in=>5..45, :message=>"deve ter entre 5 e 45 caracteres"
  validates_length_of :para, :minimum=>15, :too_short=>"não pode ter menos de 15 caracteres"
  validates_format_of :para, :message=>"deve ter o formato de uma URL", :with => URI::regexp(%w(http https))
  validates_uniqueness_of :atalho, :message=>"com esse título já foi cadastrado, escolha outro"

  before_create :urlize
  def urlize
    self.atalho = self.titulo.urlize
  end

  def clicks_domains
    hosts = {}
    self.clicks.pluck(:url).each do |domain|
     parsed = URI.parse(domain).host ? URI.parse(domain).host.gsub('www.', '') : domain
     hosts[parsed] = hosts[parsed] ? hosts[parsed]+=1 : 1
   end
    hosts.delete "mostre.me"
    hosts.sort_by { |domain, count| count }.reverse
  end

end
