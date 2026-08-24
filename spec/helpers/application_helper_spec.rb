require 'rails_helper'

RSpec.describe ApplicationHelper, type: :helper do
  describe '#reais' do
    it 'formats positive values as currency' do
      expect(helper.reais(1000)).to include('R$')
    end

    it 'returns a dash for zero, negative or nil values' do
      expect(helper.reais(0)).to eq('-')
      expect(helper.reais(-1)).to eq('-')
      expect(helper.reais(nil)).to eq('-')
    end
  end

  describe '#to_date' do
    it 'formats a date as YYYY-MM-DD' do
      expect(helper.to_date(Date.new(2024, 1, 15))).to eq('2024-01-15')
    end

    it 'returns nil for a nil date' do
      expect(helper.to_date(nil)).to be_nil
    end
  end

  describe '#cidade_path' do
    it 'builds the path from estado and cidade urlized slugs' do
      cidade = cidades(:saopaulo)
      expect(helper.cidade_path(cidade)).to eq("/cultura/cidades/#{cidade.estado.urlized}/#{cidade.urlized}")
    end

    # Edge cases reais encontrados: entidades sem cidade_id, e (raramente)
    # cidades cujo estado_id não existe mais na tabela estados.
    it 'returns nil when the cidade is nil' do
      expect(helper.cidade_path(nil)).to be_nil
    end

    it 'returns nil when the cidade has no estado' do
      cidade_orfa = Cidade.new(estado_id: 999999)
      expect(helper.cidade_path(cidade_orfa)).to be_nil
    end
  end

  describe 'link_to_* helpers' do
    it 'link_to_entidade links to the entidade slug' do
      entidade = entidades(:proponente)
      expect(helper.link_to_entidade(entidade)).to include("/cultura/entidades/#{entidade.to_param}")
    end

    it 'link_to_projeto links to the projeto slug' do
      projeto = projetos(:projeto_aprovado)
      expect(helper.link_to_projeto(projeto)).to include("/cultura/projetos/#{projeto.to_param}")
    end

    it 'link_to_curso links to the curso' do
      curso = cursos(:matematica)
      expect(helper.link_to_curso(curso)).to include("/educacao/cursos/#{curso.to_param}")
    end

    it 'link_to_mantenedora links to the mantenedora' do
      mantenedora = mantenedoras(:fundacao_um)
      expect(helper.link_to_mantenedora(mantenedora)).to include("/educacao/mantenedoras/#{mantenedora.to_param}")
    end

    it 'link_to_instituicao links to the instituicao' do
      instituicao = instituicaos(:universidade_um)
      expect(helper.link_to_instituicao(instituicao)).to include("/educacao/instituicaos/#{instituicao.to_param}")
    end

    it 'link_to_doador links to the doador' do
      doador = doadores(:doador_ativo)
      expect(helper.link_to_doador(doador)).to include("/eleicoes/doadores/#{doador.to_param}")
    end

    it 'link_to_candidato links to the candidato' do
      candidato = candidatos(:candidato_eleito)
      expect(helper.link_to_candidato(candidato)).to include("/eleicoes/candidatos/#{candidato.to_param}")
    end
  end
end
