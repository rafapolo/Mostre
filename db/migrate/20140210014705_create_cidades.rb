class CreateCidades < ActiveRecord::Migration
  def change
    create_table :cidades do |t|

      t.timestamps
    end
  end
end
