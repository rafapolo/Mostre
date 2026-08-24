require "test_helper"

class CulturaControllerTest < ActionDispatch::IntegrationTest
  test "deve renderizar root" do
    get "/"
    assert_response :success
  end

  test "deve renderizar index com title" do
    get "/cultura"
    assert_response :success
    assert_select "title", "Mostre!me - Cultura"
  end

  test "deve inscrever newsletter" do
    post "/cultura/inscrever", params: { email: "novo@teste.com" }
    assert_response :success
    assert_equal "Ok. novo@teste.com cadastrado. Até breve, e obrigado.", response.body
  end

  test "deve rejeitar email vazio" do
    post "/cultura/inscrever", params: { email: "" }
    assert_response :success
    assert_equal "Opz. Email inválido.", response.body
  end

  test "deve mostrar cidade" do
    get "/cultura/cidades/sp/sao-paulo"
    assert_response :success
    assert_select "title", /São Paulo/
  end

  test "deve renderizar salicnet" do
    get "/cultura/salicnet/123456"
    assert_response :success
  end

  test "deve retornar visu.json" do
    get "/visu.json"
    assert_response :success
  end
end
