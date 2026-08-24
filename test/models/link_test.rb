require "test_helper"

class LinkTest < ActiveSupport::TestCase
  test "tem muitos clicks" do
    link = links(:link_valido)
    assert_equal 2, link.clicks.count
  end

  test "atalho gerado a partir do titulo" do
    link = Link.create!(titulo: "Meu Link Teste", para: "https://exemplo.com")
    assert_equal "meu-link-teste", link.atalho
  end

  test "valida tamanho do titulo" do
    link = Link.new(titulo: "ABC", para: "https://exemplo.com")
    assert_not link.valid?
    assert_includes link.errors[:titulo], "deve ter entre 5 e 45 caracteres"
  end

  test "valida tamanho minimo da URL" do
    link = Link.new(titulo: "Link Valido", para: "http://x.co")
    assert_not link.valid?
  end

  test "valida formato da URL" do
    link = Link.new(titulo: "Link Teste", para: "invalida")
    assert_not link.valid?
  end

  test "clicks_domains agrupa por host" do
    link = links(:link_valido)
    domains = link.clicks_domains
    assert_equal 2, domains.length
    assert_includes domains.map(&:first), "twitter.com"
    assert_includes domains.map(&:first), "facebook.com"
  end
end
