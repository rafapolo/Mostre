require 'rails_helper'

RSpec.describe Doador, type: :model do
  it 'has many doacoes and candidatos through doacoes' do
    doador = doadores(:doador_ativo)
    expect(doador.doacoes).to include(doacoes(:doacao_para_candidato))
    expect(doador.candidatos).to include(candidatos(:candidato_eleito))
  end

  it 'orders by valor_total desc by default' do
    expect(Doador.all.first).to eq(doadores(:doador_ativo))
  end

  # Reflete um edge case real: registros importados sem doacoes_count /
  # valor_total preenchidos (a view precisa tolerar isso via #to_i).
  it 'tolerates missing doacoes_count and valor_total (real-world edge case)' do
    sem_contadores = doadores(:doador_sem_contadores)
    expect(sem_contadores.doacoes_count).to be_nil
    expect(sem_contadores.valor_total).to be_nil
  end
end
