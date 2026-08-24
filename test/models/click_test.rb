require "test_helper"

class ClickTest < ActiveSupport::TestCase
  test "pertencente a link" do
    click = clicks(:click_um)
    assert_equal links(:link_valido), click.link
  end

  test "valida presenca de link" do
    click = Click.new
    assert_not click.valid?
    assert_includes click.errors[:link], "can't be blank"
  end

  test "ordenado por created_at DESC" do
    clicks = Click.all
    assert clicks[0].created_at >= clicks[-1].created_at
  end
end
