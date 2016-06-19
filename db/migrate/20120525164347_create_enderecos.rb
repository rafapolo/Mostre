class CreateEnderecos < ActiveRecord::Migration
  def change
    create_table :enderecos do |t|
      t.string :endereco
      t.string :complemento
      t.string :bairro
      t.string :cep
      t.integer :numero
      t.integer :city_id

      t.timestamps
    end
  end
end
