#encoding: UTF-8
namespace :tse do
  task :update => :environment do
    q = TSE::Donation.where('valor > 0').where('nome != doador').where('uf = "RJ"').where('doador_id is null')
    count = q.count
    q.each do |donation|
      #UpdatesWorker.perform_async(d.id)

      doador = TSE::Entidade.find_by_cpf(donation.cpf) # donation.doador
      receptor = TSE::Entidade.find_or_initialize_by(nome: donation.nome)
      if receptor.id == nil # novo?
        receptor.receptor = 1
        receptor.save
        puts "Receptor: #{receptor.nome}".green
      end

      donation.update!(doador_id: doador.id, receptor_id: receptor.id, doador: '')p
      puts "#{doador.nome} => #{donation.valor} => #{receptor.nome}".yellow
      count = count - 1
      puts "#{count}".red
    end
  end

  task :dot => :environment do

    def escape str
      str.gsub('"', '')
    end

    include ApplicationHelper
    include ActionView::Helpers::NumberHelper

    puts "Gerando..."
    doacoes = TSE::Donation.where('valor > 0').where('nome != doador').where('uf = "RJ"').where('cpf is not null').where('nome != ""')
    count = doacoes.count

    File.open('graph_TSE.dot', 'w') do |g|
      g.puts "digraph G {"

      doacoes.each do |d|
        # g.puts "\"doador_#{d.cpf}\" [label = \"#{escape d.doador}\", estado = \"#{d.rj}\", cargo = \"#{d.cargo}\", partido = \"#{d.partido}\", ano = \"#{d.ano}\", tipo = \"#{d.tipo}\"];"
        # g.puts "\"receptor_#{proponente.id}\" [label = \"#{escape proponente.nome}\" fillcolor = \"#ffeecc\" size = \"#{proponente.projetos_sum}\", estado = \"#{proponente.estado.sigla}\"];"
        # g.puts "\"e#{financiador.id}\" -> \"e#{proponente.id}\" [weight = \"#{i.valor.to_i}\", label = \"#{reais (i.valor)}\", labeldistance = \"10\", style = \"bold\", fontcolor = \"#215E21\"];"
        puts count-=1
      end
      g.puts '}'
      puts "Ok!"
    end
  end

end



