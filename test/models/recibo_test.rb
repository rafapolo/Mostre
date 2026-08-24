require "test_helper"

class ReciboTest < ActiveSupport::TestCase
  test "pertencente a incentivo" do
    recibo = recibos(:recibo_um)
    assert_equal incentivos(:incentivo_um), recibo.incentivo
  end

  test "tem entidade atraves do incentivo" do
    recibo = recibos(:recibo_um)
    assert_equal entidades(:patrocinador), recibo.entidade
  end

  test "tem projeto atraves do incentivo" do
    recibo = recibos(:recibo_um)
    assert_equal projetos(:projeto_aprovado), recibo.projeto
  end

  test "ordenado por valor DESC" do
    recibos = Recibo.all
    assert recibos[0].valor >= recibos[-1].valor
  end

  test "valida presenca de campos obrigatorios" do
    recibo = Recibo.new
    assert_not recibo.valid?
    assert_includes recibo.errors[:valor], "can't be blank"
    assert_includes recibo.errors[:data], "can't be blank"
    assert_includes recibo.errors[:incentivo_id], "can't be blank"
  end
end
