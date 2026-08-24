require "test_helper"

class AreaTest < ActiveSupport::TestCase
  test "has many segmentos" do
    area = areas(:cultura)
    assert_equal 1, area.segmentos.count
    assert_equal segmentos(:musica), area.segmentos.first
  end

  test "has many projetos through segmentos" do
    area = areas(:cultura)
    assert_includes area.projetos, projetos(:projeto_aprovado)
  end

  test "urlized is set on save" do
    area = Area.create!(nome: "Novo Teste")
    assert_equal "novo-teste", area.urlized
  end
end
