#encoding: UTF-8
desc "Crawleia Minc"
namespace :minc do
  require Rails.root.join('lib', 'minc')

  desc "Update Entidades"
  task :update_entidades => :environment do    
    minc = Minc.new

    Entidade.where('estado_id is null').each do |e|
      minc.get_entidade(e.cnpjcpf)
    end
  end

  desc "Pega novos Projetos"
  task :get_projetos => :environment do    
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