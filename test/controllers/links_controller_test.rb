require "test_helper"

class LinksControllerTest < ActionDispatch::IntegrationTest
  test "deve listar links" do
    get "/links"
    assert_response :success
  end

  test "deve criar link" do
    post "/links", params: { link: { titulo: "Link de Teste", para: "https://exemplo.com" } }
    assert_redirected_to %r{/links/info/}
  end

  test "deve rejeitar link invalido" do
    post "/links", params: { link: { titulo: "AB", para: "invalida" } }
    assert_response :unprocessable_entity
  end

  test "deve mostrar stats" do
    get "/links/stats"
    assert_response :success
  end

  test "deve mostrar info do link" do
    get "/links/info/mostre-site"
    assert_response :success
  end

  test "deve redirecionar ao acessar link" do
    get "/mostre-site"
    assert_redirected_to "https://mostre.me"
  end

  test "deve redirecionar se link nao existe" do
    get "/link-inexistente"
    assert_redirected_to "/links"
  end
end
