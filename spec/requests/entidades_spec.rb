require 'rails_helper'

RSpec.describe "Entidades", type: :request do
  it "GET /cultura/proponentes renders the index" do
    get "/cultura/proponentes"
    expect(response).to have_http_status(:success)
  end

  it "GET /cultura/patrocinadores renders the index" do
    get "/cultura/patrocinadores"
    expect(response).to have_http_status(:success)
  end

  it "GET /cultura/entidades (bare index) no longer exists — it was a dead route with no action" do
    get "/cultura/entidades"
    expect(response).to have_http_status(:not_found)
  end

  it "GET /cultura/entidades/:id renders a normal entidade" do
    get "/cultura/entidades/#{entidades(:proponente).to_param}"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(entidades(:proponente).nome)
  end

  # Regressão: entidade sem cidade_id não pode derrubar a página.
  it "GET /cultura/entidades/:id renders an entidade with no cidade" do
    get "/cultura/entidades/#{entidades(:sem_cidade).to_param}"
    expect(response).to have_http_status(:success)
  end

  # Regressão: incentivo com projeto_id órfão não pode derrubar a página.
  it "GET /cultura/entidades/:id renders an entidade with a dangling incentivo->projeto" do
    get "/cultura/entidades/#{entidades(:patrocinador).to_param}"
    expect(response).to have_http_status(:success)
  end
end
