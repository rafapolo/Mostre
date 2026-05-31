class RelaxDoacoesNullConstraints < ActiveRecord::Migration[8.1]
  def change
    change_column_null :doacoes, :candidato_id, true
    change_column_null :doacoes, :doador_id, true
  end
end
