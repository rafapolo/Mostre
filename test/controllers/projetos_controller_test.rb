require "test_helper"

class ProjetosControllerTest < ActionDispatch::IntegrationTest
  test "deve listar projetos" do
    get "/cultura/projetos"
    assert_response :success
    assert_select "title", "Mostre!me - Projetos"
    assert_select "nav.pagy-bootstrap"
  end

  test "deve mostrar projeto" do
    get "/cultura/projetos/#{projetos(:projeto_aprovado).id}"
    assert_response :success
  end

  test "deve filtrar por estado" do
    get "/cultura/projetos", params: { estado_id: estados(:sp).id }
    assert_response :success
  end

  test "deve filtrar por area" do
    get "/cultura/projetos", params: { area_id: areas(:cultura).id }
    assert_response :success
  end

  test "deve responder xhr com layout false" do
    get "/cultura/projetos", headers: { "HTTP_X_REQUESTED_WITH" => "XMLHttpRequest" }
    assert_response :success
    assert_not @response.body.include?("<html")
  end

  test "topo reflete total filtrado e nao total geral" do
    get "/cultura/projetos", params: { area_id: areas(:cultura).id }
    assert_response :success
    # area :cultura has 1 project (projeto_aprovado); area :audiovisual has 1 (projeto_sem_apoio)
    assert_match "1 projetos", @response.body
  end

  test "ordem valida e aceita" do
    get "/cultura/projetos", params: { ordem: "solicitado" }
    assert_response :success
  end

  test "ordem invalida e ignorada sem erro" do
    get "/cultura/projetos", params: { ordem: "1;DROP TABLE projetos--" }
    assert_response :success
  end

  test "ordem com ponto e ignorada" do
    get "/cultura/projetos", params: { ordem: "projetos.solicitado" }
    assert_response :success
  end

  test "filtro por nome retorna resultados corretos" do
    get "/cultura/projetos", params: { nome: "Show" }
    assert_response :success
    # name is highlight-wrapped so match on the URL slug instead
    assert_match "show-de-musica-popular", @response.body
  end

  test "filtro apoiado maior zero exclui sem apoio" do
    get "/cultura/projetos", params: { apoiado_maior_zero: "true" }
    assert_response :success
    assert_no_match(/curta-metragem/, @response.body)
  end
end
