require 'rails_helper'

RSpec.describe "Projetos", type: :request do
  it "GET /cultura/projetos renders the index" do
    get "/cultura/projetos"
    expect(response).to have_http_status(:success)
  end

  it "GET /cultura/projetos/:id renders the oldest projeto (by id) without error" do
    mais_antigo = Projeto.order(:id).first
    get "/cultura/projetos/#{mais_antigo.to_param}"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(mais_antigo.nome)
  end

  it "GET /cultura/projetos/:id renders the most recent projeto (by id) without error" do
    mais_recente = Projeto.order(:id).last
    get "/cultura/projetos/#{mais_recente.to_param}"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(mais_recente.nome)
  end

  it "GET /cultura/projetos/:id also works with a bare numeric id (no slug)" do
    projeto = projetos(:projeto_aprovado)
    get "/cultura/projetos/#{projeto.id}"
    expect(response).to have_http_status(:success)
  end

  it "404s for an unknown projeto id" do
    get "/cultura/projetos/999999999"
    expect(response).to have_http_status(:not_found)
  end
end
