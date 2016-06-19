class CreateInstitucionalization < ActiveRecord::Migration
  def up
  	  create_table :institucionalizations, :force => true do |t|
      	t.references :instituicao, :curso
      	t.string :grau
        t.string :modalidade
        t.integer :cod_mec
        t.string :liberado_at
        t.integer :endereco_id
    end
  end

  def down
  end
end
