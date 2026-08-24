require 'rails_helper'

RSpec.describe Curso, type: :model do
  let(:curso) { cursos(:matematica) }

  it 'is valid with a unique nome' do
    expect(curso).to be_valid
  end

  it 'requires nome' do
    expect(Curso.new).not_to be_valid
  end

  it 'requires a unique nome' do
    duplicado = Curso.new(nome: curso.nome)
    expect(duplicado).not_to be_valid
  end

  it 'urlizes the nome before saving' do
    curso.nome = "Curso Com Espaços"
    curso.save!
    expect(curso.urlized).to eq(curso.nome.urlize)
  end

  it 'is linked to instituicoes through institucionalizations' do
    expect(curso.instituicaos).to include(instituicaos(:universidade_um))
  end

  describe '#primeiro_em' do
    it 'returns the earliest liberado institucionalization' do
      expect(curso.primeiro_em).to eq(institucionalizations(:matematica_em_universidade_um))
    end

    it 'returns nil when there is no institucionalization released yet' do
      expect(cursos(:curso_sem_instituicao).primeiro_em).to be_nil
    end
  end
end
