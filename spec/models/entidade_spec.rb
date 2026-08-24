require 'rails_helper'

RSpec.describe Entidade, type: :model do
  it 'has many projetos and incentivos' do
    expect(entidades(:proponente).projetos).to include(projetos(:projeto_aprovado))
    expect(entidades(:patrocinador).incentivos).to include(incentivos(:incentivo_um))
  end

  it 'computes similares excluding itself' do
    similar = Entidade.create!(
      nome: entidades(:proponente).nome, cnpjcpf: "00000000000000",
      uf: "São Paulo", cidade_id: entidades(:proponente).cidade_id,
      estado_id: entidades(:proponente).estado_id
    )
    expect(entidades(:proponente).similares).to include(similar)
    expect(entidades(:proponente).similares).not_to include(entidades(:proponente))
  end

  # Registros reais importados sem cidade_id preenchido não devem
  # impedir a leitura da entidade (a view guarda o link para a cidade).
  it 'tolerates a missing cidade (real-world edge case)' do
    sem_cidade = entidades(:sem_cidade)
    expect(sem_cidade.cidade_id).to be_nil
    expect(sem_cidade.cidade).to be_nil
  end
end
