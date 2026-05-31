class CreateCandidatosDoadoresPartidos < ActiveRecord::Migration[8.1]
  def change
    create_table :candidatos do |t|
      t.string :nome
      t.string :partido
      t.string :cargo
      t.string :ano
      t.string :uf
      t.integer :doacoes_count, default: 0
      t.decimal :valor_total
      t.string :urlized
      t.timestamps
    end

    create_table :doadores do |t|
      t.string :doador
      t.string :cpf_cnpj
      t.integer :doacoes_count, default: 0
      t.decimal :valor_total
      t.string :uf
      t.boolean :is_empresa, default: false
      t.string :urlized
      t.timestamps
    end

    create_table :doacoes do |t|
      t.references :candidato, null: false, foreign_key: true
      t.references :doador, null: false, foreign_key: true
      t.references :comite, foreign_key: true
      t.string :partido
      t.string :motivo
      t.date :quando
      t.decimal :valor
      t.timestamps
    end

    create_table :comites do |t|
      t.string :nome
      t.string :partido
      t.string :urlized
      t.timestamps
    end
  end
end
