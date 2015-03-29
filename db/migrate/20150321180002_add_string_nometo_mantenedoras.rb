class AddStringNometoMantenedoras < ActiveRecord::Migration
  def change
  	add_column :mantenedoras, :nome, :string
  end
end
