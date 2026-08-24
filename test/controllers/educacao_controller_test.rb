require "test_helper"

class EducacaoControllerTest < ActionDispatch::IntegrationTest
  test "deve renderizar index" do
    get "/educacao"
    assert_response :success
    assert_select "title", "Mostre!me - Educação"
  end

  test "link instituicoes corrigido para instituicaos" do
    get "/educacao"
    assert_match "/educacao/instituicaos", @response.body
    assert_no_match "/educacao/instituicoes", @response.body
  end

  test "rota mantenedoras responde" do
    get "/educacao/mantenedoras"
    assert_response :success
  end

  test "rota instituicaos responde" do
    get "/educacao/instituicaos"
    assert_response :success
  end

  test "rota cursos responde" do
    get "/educacao/cursos"
    assert_response :success
  end
end
