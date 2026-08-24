require 'rails_helper'

RSpec.describe Candidato, type: :model do
  it 'has many doacoes and doadores through doacoes' do
    candidato = candidatos(:candidato_eleito)
    expect(candidato.doacoes).to include(doacoes(:doacao_para_candidato))
    expect(candidato.doadores).to include(doadores(:doador_ativo))
  end

  # Mesmo edge case encontrado nos doadores: registros importados sem
  # contadores preenchidos.
  it 'tolerates missing doacoes_count and valor_total (real-world edge case)' do
    sem_contadores = candidatos(:candidato_sem_contadores)
    expect(sem_contadores.doacoes_count).to be_nil
    expect(sem_contadores.valor_total).to be_nil
  end
end
