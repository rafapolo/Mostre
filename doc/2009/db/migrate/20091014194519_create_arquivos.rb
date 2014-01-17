class CreateArquivos < ActiveRecord::Migration
  def self.up
    create_table :arquivos do |t|
      t.string :nome
      t.string :pasta
      t.integer :tamanho
      t.integer :torrent_id

      t.timestamps
    end
  end

  def self.down
    drop_table :arquivos
  end
end
