# #encoding: UTF-8
namespace :tse do

  task :update => :environment do
  # atribui Doação a Entidade : better done by raw SQL
    # q = TSE::Donation.where('valor > 0').where('nome != doador').where('uf = "RJ"').where('doador_id is null')
    # count = q.count
    # q.each do |donation|
    #   #UpdatesWorker.perform_async(d.id)

    #   doador = TSE::Entidade.find_by_cpf(donation.cpf) # donation.doador
    #   receptor = TSE::Entidade.find_or_initialize_by(nome: donation.nome)
    #   if receptor.id == nil # novo?
    #     receptor.receptor = 1
    #     receptor.save
    #     puts "Receptor: #{receptor.nome}".green
    #   end

    #   donation.update!(doador_id: doador.id, receptor_id: receptor.id, doador: '')p
    #   puts "#{doador.nome} => #{donation.valor} => #{receptor.nome}".yellow
    #   count = count - 1
    #   puts "#{count}".red
    # end
  end

  task :dot => :environment do

    def escape str
      str.gsub('"', '')
    end

    include ApplicationHelper
    include ActionView::Helpers::NumberHelper

    puts "Gerando..."
    doacoes = TSE::Donation.where('valor > 0').where('uf = "RJ"').where('tipo = "candidato"').where('doador_id != receptor_id')
    count = doacoes.count

    File.open('graph_TRJ_SE.dot', 'w') do |g|
      g.puts "digraph G {"

      doacoes.find_each do |d|
        doador = d.doador
        g.puts "\"entidade_#{doador.id}\" [label = \"#{escape doador.nome}\", empresa = #{doador.empresa}, estado = \"#{d.uf}\", cargo = \"#{d.cargo}\", partido = \"#{d.partido}\", ano = #{d.ano}, doado = #{doador.doado.to_i}];"
        receptor = d.receptor
        g.puts "\"entidade_#{receptor.id}\" [label = \"#{escape receptor.nome}\", estado = \"#{d.uf}\", cargo = \"#{d.cargo}\", partido = \"#{d.partido}\", ano = #{d.ano}, empresa = #{receptor.empresa}, recebido = #{receptor.recebido.to_i}];"
        g.puts "\"entidade_#{doador.id}\" -> \"entidade_#{receptor.id}\" [label = \"#{reais d.valor}\"];"
        puts count-=1
      end

      g.puts '}'
      puts "Ok!"
    end
  end

end



