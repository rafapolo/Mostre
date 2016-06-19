class CreateInstituicaos < ActiveRecord::Migration
  def change
    create_table :instituicaos do |t|
      t.datetime :liberada_at
      t.integer :cod_mec
      t.integer :mantenedora_id
      t.integer :endereco_id
      t.string :site
      t.string :sigla
      t.string :nome
      t.string :telefone
      t.string :org
      t.string :categoria
      t.string :emails
      t.string :urlized
      t.timestamps
    end
  end
end
