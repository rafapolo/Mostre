require "test_helper"

class ProjetoTest < ActiveSupport::TestCase
  test "pertencente a entidade" do
    projeto = projetos(:projeto_aprovado)
    assert_equal entidades(:proponente), projeto.entidade
  end

  test "pertencente a estado" do
    projeto = projetos(:projeto_aprovado)
    assert_equal estados(:sp), projeto.estado
  end

  test "pertencente a segmento" do
    projeto = projetos(:projeto_aprovado)
    assert_equal segmentos(:musica), projeto.segmento
  end

  test "aprovados scope" do
    aprovados = Projeto.aprovados
    assert_includes aprovados, projetos(:projeto_aprovado)
    assert_not_includes aprovados, projetos(:projeto_sem_apoio)
  end

  test "to_param inclui id e urlized" do
    projeto = projetos(:projeto_aprovado)
    assert_equal "#{projeto.id}-#{projeto.urlized}", projeto.to_param
  end

  test "urlized definido no before_save" do
    projeto = projetos(:projeto_aprovado)
    assert_equal "show-de-musica-popular", projeto.urlized
  end

  test "valida presenca de campos obrigatorios" do
    projeto = Projeto.new
    assert_not projeto.valid?
    assert_includes projeto.errors[:nome], "can't be blank"
    assert_includes projeto.errors[:numero], "can't be blank"
  end
end
