class CreateMantenedoras < ActiveRecord::Migration
  def change
    create_table :mantenedoras do |t|
      t.integer :cod_mec
      t.string :cnpj
      t.string :natureza
      t.string :representante

      t.timestamps
    end
  end
end
