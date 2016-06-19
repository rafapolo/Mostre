class AddIpToLinks < ActiveRecord::Migration
  def change
    add_column :links, :ip, :string
  end
end
