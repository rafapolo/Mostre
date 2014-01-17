class CreateIncentivos < ActiveRecord::Migration
  def change
    create_table :incentivos do |t|
      t.integer :projeto_id
      t.integer :entidade_id
      t.decimal :valor

      t.timestamps
    end
  end
end
