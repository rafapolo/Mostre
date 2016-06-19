class CreateRecibos < ActiveRecord::Migration
  def change
    create_table :recibos do |t|
      t.integer :incentivo_id
      t.datetime :data
      t.float :valor

      t.timestamps
    end
  end
end
