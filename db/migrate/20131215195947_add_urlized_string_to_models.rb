class AddUrlizedStringToModels < ActiveRecord::Migration
  def change
    add_column :areas, :urlized, :string
    add_column :segmentos, :urlized, :string
    add_column :entidades, :urlized, :string
    add_column :projetos, :urlized, :string
  end
end
