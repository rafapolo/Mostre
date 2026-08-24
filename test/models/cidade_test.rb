require "test_helper"

class CidadeTest < ActiveSupport::TestCase
  test "pertencente a estado" do
    cidade = cidades(:saopaulo)
    assert_equal estados(:sp), cidade.estado
  end

  test "tem muitas entidades" do
    cidade = cidades(:saopaulo)
    assert_includes cidade.entidades, entidades(:proponente)
  end
end
