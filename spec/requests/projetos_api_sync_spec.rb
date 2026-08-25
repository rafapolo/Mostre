require 'rails_helper'

# Regression coverage for a live bug found while auditing the new SALIC API
# sync (db/mostre.py): projetos/_list.haml unconditionally called
# `projeto.entidade.nome`, `projeto.estado.sigla` and `projeto.segmento.nome`,
# which crashed the index with a NoMethodError as soon as it rendered a
# projeto synced from the live API instead of the old MySQL dump - the live
# API leaves entidade_id/area_id/segmento_id unresolved for a meaningful
# slice of projetos (~3-4% of the table). See plan/diff-schema.md.
RSpec.describe "Projetos index with API-synced data", type: :request do
  let(:sync_projeto) { projetos(:projeto_sync_api) }

  it "renders the index without error when a projeto has no linked entidade" do
    expect(sync_projeto.entidade_id).to be_nil
    get "/cultura/projetos"
    expect(response).to have_http_status(:success)
  end

  it "renders the index without error when a projeto has no linked area/segmento" do
    expect(sync_projeto.area_id).to be_nil
    expect(sync_projeto.segmento_id).to be_nil
    get "/cultura/projetos", params: { ordem: "id" }
    expect(response).to have_http_status(:success)
    expect(response.body).to include(sync_projeto.nome)
  end

  it "does not render a broken sub-link to a nonexistent entidade" do
    get "/cultura/projetos", params: { ordem: "id" }
    expect(response.body).not_to include("cultura/entidades/-")
  end

  it "still renders the show page for an API-synced projeto with no entidade/area/segmento" do
    get "/cultura/projetos/#{sync_projeto.to_param}"
    expect(response).to have_http_status(:success)
    expect(response.body).to include(sync_projeto.nome)
  end

  it "still renders normally for a fully-populated, legacy-shaped projeto (no regression)" do
    get "/cultura/projetos", params: { ordem: "id" }
    expect(response.body).to include(projetos(:projeto_aprovado).nome)
  end

  it "sorting by id (which surfaces the most recently synced rows first) does not error" do
    ultimo = Projeto.order(id: :desc).first
    expect(ultimo).to eq(sync_projeto)
    get "/cultura/projetos", params: { ordem: "id" }
    expect(response).to have_http_status(:success)
  end
end
