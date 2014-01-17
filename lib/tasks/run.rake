#encoding: UTF-8
namespace :minc do

  desc "Crawleia Minc"
  task :run => :environment do
    require Rails.root.join('lib', 'minc')
    
    puts
    puts "="*70
    puts "\t\t\t- Crawleando MinC -".yellow
    puts "\t\t\t"+Time.new.strftime("%Y-%m-%d %H:%M:%S").yellow
    puts "="*70

    minc = Minc.new

    #Entidade.where('year(updated_at)<2014').each{|s| get_proponente(s.cnpjcpf)}

    Entidade.all.each do |e|
      minc.get_entidade(e.cnpjcpf)
    end
  end
end