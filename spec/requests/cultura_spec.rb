require 'rails_helper'

RSpec.describe "Cultura", type: :request do
  it "GET / renders the root page" do
    get "/"
    expect(response).to have_http_status(:success)
  end

  it "GET /cultura renders the index" do
    get "/cultura"
    expect(response).to have_http_status(:success)
  end

  it "GET /cultura/cidades/:uf/:nome renders the cidade page" do
    get "/cultura/cidades/sp/sao-paulo"
    expect(response).to have_http_status(:success)
    expect(response.body).to include("São Paulo")
  end

  it "GET /cultura/salicnet/:numero renders" do
    get "/cultura/salicnet/123456"
    expect(response).to have_http_status(:success)
  end

  it "GET /visu.json renders json" do
    get "/visu.json"
    expect(response).to have_http_status(:success)
  end

  it "POST /cultura/inscrever registers an email" do
    post "/cultura/inscrever", params: { email: "novo@teste.com" }
    expect(response).to have_http_status(:success)
    expect(response.body).to include("novo@teste.com")
  end
end
