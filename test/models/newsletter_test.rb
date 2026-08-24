require "test_helper"

class NewsletterTest < ActiveSupport::TestCase
  test "cria newsletter com email" do
    newsletter = Newsletter.create!(email: "novo@mostre.me")
    assert_equal "novo@mostre.me", newsletter.email
  end

  test "find_or_create_by nao duplica" do
    assert_difference "Newsletter.count", 0 do
      Newsletter.find_or_create_by(email: "teste@mostre.me")
    end
  end
end
