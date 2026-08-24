require "test_helper"

class EstadoTest < ActiveSupport::TestCase
  test "tem muitas cidades" do
    estado = estados(:sp)
    assert_includes estado.cidades, cidades(:saopaulo)
  end

  test "tem muitos projetos" do
    estado = estados(:sp)
    assert_includes estado.projetos, projetos(:projeto_aprovado)
  end

  test "default scope exclui XX" do
    Estado.create!(nome: "Teste", sigla: "XX")
    assert_not_includes Estado.all.map(&:sigla), "XX"
  end

  test "urlized retorna sigla lowercase" do
    assert_equal "sp", estados(:sp).urlized
  end
end
