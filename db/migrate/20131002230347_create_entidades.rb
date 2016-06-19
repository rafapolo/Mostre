class CreateEntidades < ActiveRecord::Migration
  def change
    create_table :entidades do |t|
      t.string :nome
      t.string :cnpjcpf
      t.string :responsavel
      t.string :logradouro
      t.string :cidade
      t.string :cep
      t.string :uf
      t.string :email
      t.string :tel_res
      t.string :tel_cel
      t.string :tel_fax
      t.string :tel_com

      t.timestamps
    end
  end
end
