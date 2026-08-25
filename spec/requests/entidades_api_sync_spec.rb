require 'rails_helper'

# Regression coverage for the same class of bug as projetos_api_sync_spec:
# entidades/proponentes.haml, entidades/_patrocinadores_list.haml and
# entidades/_list.haml all called `.estado.sigla` unconditionally, which
# would crash as soon as an entidade resolved by the live API sync with no
# matching estado reached one of these lists.
RSpec.describe "Entidades listings with API-synced data", type: :request do
  it "GET /cultura/proponentes renders when a proponente has no estado" do
    get "/cultura/proponentes"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(entidades(:proponente_sem_estado).urlized)
  end

  it "GET /cultura/patrocinadores renders when a patrocinador has no estado" do
    get "/cultura/patrocinadores"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(entidades(:patrocinador_sem_estado).urlized)
  end

  it "GET /cultura/cidades/:uf/:nome renders when a listed entidade has no estado" do
    # proponente_sem_estado is filed under São Paulo (cidade_id) despite
    # having no estado_id, and has projetos_liberados > 0 so it's included
    # in the cidade page's entidade listing (entidades/_list.haml).
    get "/cultura/cidades/sp/sao-paulo"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(entidades(:proponente_sem_estado).nome)
  end
end
