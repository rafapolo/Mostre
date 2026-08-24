require 'rails_helper'

RSpec.describe "Eleições", type: :request do
  it "GET /eleicoes renders the index" do
    get "/eleicoes"
    expect(response).to have_http_status(:success)
  end

  describe "doadores" do
    it "GET /eleicoes/doadores renders the index" do
      get "/eleicoes/doadores"
      expect(response).to have_http_status(:success)
      # `doador` is passed through the `hl` highlight helper, which wraps
      # each character individually, so match on the plain uf column instead.
      expect(response.body).to include(">#{doadores(:doador_ativo).uf}<")
    end

    it "GET /eleicoes/doadores/:id renders a doador with donations" do
      doador = doadores(:doador_ativo)
      get "/eleicoes/doadores/#{doador.id}"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(doador.doador)
    end

    # Regressão: doadores importados sem doacoes_count/valor_total
    # preenchidos derrubavam a página com NoMethodError em `> 0`.
    it "GET /eleicoes/doadores/:id renders a doador with no doacoes_count/valor_total" do
      get "/eleicoes/doadores/#{doadores(:doador_sem_contadores).id}"
      expect(response).to have_http_status(:success)
    end
  end

  describe "candidatos" do
    it "GET /eleicoes/candidatos renders the index" do
      get "/eleicoes/candidatos"
      expect(response).to have_http_status(:success)
      # `nome` is passed through the `hl` highlight helper, which wraps
      # each character individually, so match on the plain partido instead.
      expect(response.body).to include(">#{candidatos(:candidato_eleito).partido}<")
    end

    it "GET /eleicoes/candidatos/:id renders a candidato with donations" do
      candidato = candidatos(:candidato_eleito)
      get "/eleicoes/candidatos/#{candidato.id}"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(candidato.nome)
    end

    # Mesma regressão observada em doadores.
    it "GET /eleicoes/candidatos/:id renders a candidato with no doacoes_count/valor_total" do
      get "/eleicoes/candidatos/#{candidatos(:candidato_sem_contadores).id}"
      expect(response).to have_http_status(:success)
    end
  end
end
