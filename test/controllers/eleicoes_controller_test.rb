require "test_helper"

class EleicoesControllerTest < ActionDispatch::IntegrationTest
  test "deve renderizar index" do
    get "/eleicoes"
    assert_response :success
    assert_select "title", "Mostre!me - Eleições"
  end

  test "link partidos removido do nav" do
    get "/eleicoes"
    assert_no_match "/eleicoes/partidos", @response.body
  end

  test "rota partidos nao e acessivel" do
    # Rails 8 shows_exceptions converts RoutingError to a rendered 404
    get "/eleicoes/partidos" rescue nil
    assert_includes [404, nil], (response.status rescue nil)
  end

  test "candidatos index responde" do
    get "/eleicoes/candidatos"
    assert_response :success
  end

  test "doadores index responde" do
    get "/eleicoes/doadores"
    assert_response :success
  end

  test "candidatos ordem invalida ignorada" do
    get "/eleicoes/candidatos", params: { ordem: "1 UNION SELECT * FROM entidades" }
    assert_response :success
  end
end
