require "test_helper"

class EntidadeTest < ActiveSupport::TestCase
  test "proponente scope" do
    prop = Entidade.proponentes
    assert_includes prop, entidades(:proponente)
    assert_not_includes prop, entidades(:patrocinador)
  end

  test "patrocinador scope" do
    pat = Entidade.patrocinadores
    assert_includes pat, entidades(:patrocinador)
    assert_not_includes pat, entidades(:proponente)
  end

  test "empresa detectada pelo cnpj" do
    entidade = entidades(:proponente)
    assert entidade.empresa
  end

  test "to_param inclui id e urlized" do
    entidade = entidades(:proponente)
    assert_equal "#{entidade.id}-#{entidade.urlized}", entidade.to_param
  end

  test "projetos liberados count" do
    entidade = entidades(:proponente)
    entidade.save
    assert_equal 1, entidade.reload.projetos_liberados
  end
end
