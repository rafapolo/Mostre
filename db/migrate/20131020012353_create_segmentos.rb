class CreateSegmentos < ActiveRecord::Migration
  def change
    create_table :segmentos do |t|
      t.string :nome
      t.integer :area_id

      t.timestamps
    end
  end
end
