require 'rails_helper'

RSpec.describe Projeto, type: :model do
  let(:projeto) { projetos(:projeto_aprovado) }

  it 'is valid with all required attributes' do
    expect(projeto).to be_valid
  end

  it 'requires a unique numero' do
    duplicado = Projeto.new(projeto.attributes.except('id').merge('numero' => projeto.numero))
    expect(duplicado).not_to be_valid
  end

  it 'requires nome, entidade, uf, area, segmento, processo, mecanismo and sintese' do
    invalido = Projeto.new
    invalido.valid?
    %i[nome numero entidade_id uf area segmento processo mecanismo sintese].each do |attr|
      expect(invalido.errors[attr]).not_to be_empty
    end
  end

  describe '#to_param' do
    it 'combines id and urlized nome' do
      expect(projeto.to_param).to eq("#{projeto.id}-#{projeto.urlized}")
    end
  end

  describe 'scopes' do
    it '.aprovados only includes projects with apoiado > 0' do
      expect(Projeto.aprovados).to include(projetos(:projeto_aprovado))
      expect(Projeto.aprovados).not_to include(projetos(:projeto_sem_apoio))
    end
  end

  describe 'associations' do
    it 'belongs to entidade, estado, area and segmento' do
      expect(projeto.entidade).to eq(entidades(:proponente))
      expect(projeto.estado).to eq(estados(:sp))
    end

    it 'has many incentivos through entidades apoiadoras' do
      expect(projeto.entidades_apoiadoras).to include(entidades(:patrocinador))
    end
  end
end
