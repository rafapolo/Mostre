require "test_helper"

class IncentivoTest < ActiveSupport::TestCase
  test "pertencente a projeto" do
    incentivo = incentivos(:incentivo_um)
    assert_equal projetos(:projeto_aprovado), incentivo.projeto
  end

  test "pertencente a entidade" do
    incentivo = incentivos(:incentivo_um)
    assert_equal entidades(:patrocinador), incentivo.entidade
  end

  test "tem muitos recibos" do
    incentivo = incentivos(:incentivo_dois)
    assert_equal 2, incentivo.recibos.count
  end

  test "ordenado por valor DESC" do
    incentivos = Incentivo.all
    assert incentivos[0].valor >= incentivos[-1].valor
  end

  test "valida presenca de valor" do
    incentivo = Incentivo.new(projeto_id: 1, entidade_id: 1)
    assert_not incentivo.valid?
    assert_includes incentivo.errors[:valor], "can't be blank"
  end
end
