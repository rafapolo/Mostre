require "test_helper"

class EntidadesControllerTest < ActionDispatch::IntegrationTest
  test "deve listar proponentes" do
    get "/cultura/proponentes"
    assert_response :success
    assert_select "title", "Mostre!me - Proponentes"
  end

  test "deve listar patrocinadores" do
    get "/cultura/patrocinadores"
    assert_response :success
    assert_select "title", "Mostre!me - Patrocinadores"
  end

  test "deve mostrar entidade" do
    get "/cultura/entidades/#{entidades(:proponente).id}"
    assert_response :success
  end

  test "deve responder xhr com layout false" do
    get "/cultura/proponentes", headers: { "HTTP_X_REQUESTED_WITH" => "XMLHttpRequest" }
    assert_response :success
    assert_not @response.body.include?("<html")
  end

  test "topo proponentes reflete total filtrado" do
    get "/cultura/proponentes", params: { estado_id: estados(:rj).id }
    assert_response :success
    assert_match "0 proponentes", @response.body
  end

  test "topo patrocinadores reflete total filtrado" do
    get "/cultura/patrocinadores", params: { estado_id: estados(:rj).id }
    assert_response :success
    assert_match "1 patrocinadores", @response.body
  end

  test "ordem valida e aceita em proponentes" do
    get "/cultura/proponentes", params: { ordem: "projetos_sum" }
    assert_response :success
  end

  test "ordem invalida e ignorada em patrocinadores" do
    get "/cultura/patrocinadores", params: { ordem: "'; DROP TABLE entidades--" }
    assert_response :success
  end

  test "filtro por nome em proponentes" do
    get "/cultura/proponentes", params: { nome: "Associação" }
    assert_response :success
    # name is highlight-wrapped so match on the URL slug instead
    assert_match "associacao-cultural-exemplo", @response.body
  end
end
