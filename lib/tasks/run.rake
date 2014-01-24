#encoding: UTF-8

namespace :minc do
  require Rails.root.join('lib', 'minc')
  
  desc "Crawleia Minc"  
  namespace :update do
  
    desc "Update Entidades"
    task :entidades => :environment do    
      minc = Minc.new

      Entidade.where("updated_at < '2014-01-24 12:06:21'").each do |e|
        minc.get_entidade(e.cnpjcpf)
      end
    end

    desc "Pega novos Projetos"
    task :projetos => :environment do    
      minc = Minc.new

      puts
      puts "="*70
      puts "\t\t\t- Crawleando MinC -".yellow
      puts "\t\t\t"+Time.new.strftime("%Y-%m-%d %H:%M:%S").yellow
      puts "="*70
      range = 500

      last_numero = Projeto.order(:numero).last.numero.to_i
      last_numero.upto(last_numero+range) do |num|
        minc.get_projeto(num)
      end    
    end

  end
end