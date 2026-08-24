require 'rails_helper'

RSpec.describe Mantenedora, type: :model do
  let(:mantenedora) { mantenedoras(:fundacao_um) }

  it 'is valid with a unique cod_mec' do
    expect(mantenedora).to be_valid
  end

  it 'requires cod_mec' do
    expect(Mantenedora.new(nome: "Sem Cod Mec")).not_to be_valid
  end

  it 'requires a unique cod_mec' do
    duplicada = Mantenedora.new(nome: "Outra", cod_mec: mantenedora.cod_mec)
    expect(duplicada).not_to be_valid
  end

  it 'has many instituicaos' do
    expect(mantenedora.instituicaos).to include(instituicaos(:universidade_um))
  end
end
