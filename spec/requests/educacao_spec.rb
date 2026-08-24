require 'rails_helper'

RSpec.describe "Educação", type: :request do
  it "GET /educacao renders the index" do
    get "/educacao"
    expect(response).to have_http_status(:success)
  end

  describe "cursos" do
    it "GET /educacao/cursos renders the index" do
      get "/educacao/cursos"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(cursos(:matematica).nome)
    end

    it "GET /educacao/cursos/:id renders the show page" do
      curso = cursos(:matematica)
      get "/educacao/cursos/#{curso.id}"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(curso.nome)
    end

    it "GET /educacao/cursos/:id renders a curso with no instituicao linked yet" do
      get "/educacao/cursos/#{cursos(:curso_sem_instituicao).id}"
      expect(response).to have_http_status(:success)
    end
  end

  describe "mantenedoras" do
    it "GET /educacao/mantenedoras renders the index" do
      get "/educacao/mantenedoras"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(mantenedoras(:fundacao_um).nome)
    end

    it "GET /educacao/mantenedoras/:id renders the show page" do
      mantenedora = mantenedoras(:fundacao_um)
      get "/educacao/mantenedoras/#{mantenedora.id}"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(mantenedora.nome)
    end
  end

  describe "instituicaos" do
    it "GET /educacao/instituicaos renders the index" do
      get "/educacao/instituicaos"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(instituicaos(:universidade_um).nome)
    end

    it "GET /educacao/instituicaos/:id renders the show page" do
      instituicao = instituicaos(:universidade_um)
      get "/educacao/instituicaos/#{instituicao.id}"
      expect(response).to have_http_status(:success)
      expect(response.body).to include(instituicao.nome)
      expect(response.body).to include(mantenedoras(:fundacao_um).nome)
    end

    # Regressão: ~5% das instituicoes importadas não têm mantenedora_id.
    it "GET /educacao/instituicaos/:id renders an instituicao with no mantenedora" do
      get "/educacao/instituicaos/#{instituicaos(:instituicao_sem_mantenedora).id}"
      expect(response).to have_http_status(:success)
    end

    # Regressão: algumas instituicoes não têm liberada_at preenchido.
    it "GET /educacao/instituicaos/:id renders an instituicao with no liberada_at" do
      get "/educacao/instituicaos/#{instituicaos(:instituicao_sem_data).id}"
      expect(response).to have_http_status(:success)
    end
  end
end
