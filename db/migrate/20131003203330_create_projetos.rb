class CreateProjetos < ActiveRecord::Migration
  def change
    create_table :projetos do |t|
      t.string :nome
      t.integer :proponente_id
      t.string :numero
      t.string :uf
      t.string :area
      t.string :mecanismo
      t.string :enquadramento
      t.string :segmento
      t.string :processo
      t.situacao_at :date
      t.string :situacao
      t.string :providencia
      t.text :sintese
      t.decimal :solicitado
      t.decimal :aprovado
      t.decimal :apoiado
      t.liberado_at :date

      t.timestamps
    end
  end
end
