require "test_helper"

class SegmentoTest < ActiveSupport::TestCase
  test "pertencente a area" do
    segmento = segmentos(:musica)
    assert_equal areas(:cultura), segmento.area
  end

  test "tem muitos projetos" do
    segmento = segmentos(:musica)
    assert_includes segmento.projetos, projetos(:projeto_aprovado)
  end
end
