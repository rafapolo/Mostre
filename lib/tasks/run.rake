#encoding: UTF-8

namespace :minc do
  require Rails.root.join('lib', 'minc')

  task :dot => :environment do   
    def escape str
      str.gsub('"', '')
    end

    include ApplicationHelper
    include ActionView::Helpers::NumberHelper

    puts "Gerando..."
    incentivos = Incentivo.find_by_sql('select i.*, p.id, p.nome, e.id, e.nome, e.projetos_count, e.projetos_sum from projetos p, entidades e, incentivos i where p.apoiado>0 and p.id=i.projeto_id and e.id=i.entidade_id and year(p.situacao_at)=2013')

    File.open('graph2013.dot', 'w') do |g|  
      g.puts "digraph G {"
      g.puts 'nodesep = "2.0";'
      g.puts 'ratio = "expand";'
      g.puts 'splines = "true";'
      g.puts 'node[ color  =  "#000000" , style  =  "filled" , penwidth  =  "2" , fillcolor  =  "lightgray"];'
      g.puts 'overlap = "false";'

      incentivos.each do |i|
        financiador = i.entidade
        g.puts "\"e#{financiador.id}\" [label = \"#{escape financiador.nome}\", size = \"#{financiador.incentivos_sum}\", estado = \"#{financiador.estado.sigla}\"];"
        proponente = i.projeto.entidade
        g.puts "\"e#{proponente.id}\" [label = \"#{escape proponente.nome}\" fillcolor = \"#ffeecc\" size = \"#{proponente.projetos_sum}\", estado = \"#{proponente.estado.sigla}\"];"
        g.puts "\"e#{financiador.id}\" -> \"e#{proponente.id}\" [weight = \"#{i.valor.to_i}\", label = \"#{reais (i.valor)}\", labeldistance = \"10\", style = \"bold\", fontcolor = \"#215E21\"];"
      end
      g.puts '}'
      puts "Ok!"
    end  

  end
  
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