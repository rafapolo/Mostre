require 'rails_helper'

RSpec.describe Instituicao, type: :model do
  let(:instituicao) { instituicaos(:universidade_um) }

  it 'is valid with cod_mec and nome' do
    expect(instituicao).to be_valid
  end

  it 'requires cod_mec and nome' do
    invalido = Instituicao.new
    invalido.valid?
    expect(invalido.errors[:cod_mec]).not_to be_empty
    expect(invalido.errors[:nome]).not_to be_empty
  end

  it 'urlizes the nome before saving' do
    instituicao.save!
    expect(instituicao.urlized).to eq(instituicao.nome.urlize)
  end

  it 'orders by liberada_at desc by default' do
    # universidade_um has a liberada_at, the other fixtures don't, so it
    # must sort first under the default DESC ordering.
    expect(Instituicao.all.first).to eq(instituicao)
  end

  # Reflete um edge case real: ~5% das instituicoes importadas nao tem
  # mantenedora_id preenchido. O modelo deve tolerar isso sem levantar
  # exceção (a view faz a checagem antes de acessar a associação).
  it 'tolerates a missing mantenedora (real-world edge case)' do
    sem_mantenedora = instituicaos(:instituicao_sem_mantenedora)
    expect(sem_mantenedora.mantenedora_id).to be_nil
    expect(sem_mantenedora.mantenedora).to be_nil
  end

  it 'is linked to cursos through institucionalizations' do
    expect(instituicao.cursos).to include(cursos(:matematica))
  end
end
