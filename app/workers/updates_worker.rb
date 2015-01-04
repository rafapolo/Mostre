class UpdatesWorker
  # include Sidekiq::Worker

  # def perform(donation_id)
  #     donation = TSE::Donation.find(donation_id)

  #     doador = TSE::Entidade.find_by_cpf(donation.cpf) # donation.doador
  #     receptor = TSE::Entidade.find_or_initialize_by(nome: donation.nome)
  #     unless receptor.id # novo?
  #       receptor.receptor = 1
  #       receptor.save
  #       puts "Receptor: #{receptor.nome}".green
  #     end

  #     donation.update!(doador_id: doador.id, receptor_id: receptor.id)
  #     puts "#{doador.nome} => #{donation.valor} => #{receptor.nome}".yellow
  # end
end
