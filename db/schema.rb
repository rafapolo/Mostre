# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.1].define(version: 2026_05_31_194654) do
  create_table "areas", force: :cascade do |t|
    t.string "nome", limit: 255, default: "", null: false
    t.string "urlized", limit: 255
    t.index ["urlized"], name: "urlized", unique: true
  end

  create_table "candidatos", force: :cascade do |t|
    t.string "ano"
    t.string "cargo"
    t.datetime "created_at", null: false
    t.integer "doacoes_count", default: 0
    t.string "nome"
    t.string "partido"
    t.string "uf"
    t.datetime "updated_at", null: false
    t.string "urlized"
    t.decimal "valor_total"
  end

  create_table "cidades", force: :cascade do |t|
    t.integer "estado_id", limit: 4
    t.integer "impressions_count", limit: 4, default: 0
    t.decimal "latitude", precision: 11, scale: 8
    t.decimal "longitude", precision: 11, scale: 8
    t.string "nome", limit: 255, default: "", null: false
    t.string "urlized", limit: 255
  end

  create_table "clicks", force: :cascade do |t|
    t.datetime "created_at"
    t.integer "link_id", limit: 4, null: false
    t.string "url", limit: 255, null: false
  end

  create_table "comites", force: :cascade do |t|
    t.datetime "created_at", null: false
    t.string "nome"
    t.string "partido"
    t.datetime "updated_at", null: false
    t.string "urlized"
  end

  create_table "cursos", force: :cascade do |t|
    t.datetime "created_at"
    t.string "nome", limit: 255
    t.datetime "updated_at"
    t.string "urlized", limit: 255
  end

  create_table "doacoes", force: :cascade do |t|
    t.integer "candidato_id"
    t.integer "comite_id"
    t.datetime "created_at", null: false
    t.integer "doador_id"
    t.string "motivo"
    t.string "partido"
    t.date "quando"
    t.datetime "updated_at", null: false
    t.decimal "valor"
    t.index ["candidato_id"], name: "index_doacoes_on_candidato_id"
    t.index ["comite_id"], name: "index_doacoes_on_comite_id"
    t.index ["doador_id"], name: "index_doacoes_on_doador_id"
  end

  create_table "doadores", force: :cascade do |t|
    t.string "cpf_cnpj"
    t.datetime "created_at", null: false
    t.integer "doacoes_count", default: 0
    t.string "doador"
    t.boolean "is_empresa", default: false
    t.string "uf"
    t.datetime "updated_at", null: false
    t.string "urlized"
    t.decimal "valor_total"
  end

  create_table "enderecos", force: :cascade do |t|
    t.string "bairro", limit: 255
    t.string "cep", limit: 255
    t.integer "city_id", limit: 4
    t.string "complemento", limit: 255
    t.datetime "created_at"
    t.string "endereco", limit: 255
    t.integer "numero", limit: 4
    t.datetime "updated_at"
  end

  create_table "entidades", force: :cascade do |t|
    t.string "cep", limit: 10
    t.integer "cidade_id", limit: 4
    t.string "cidade_nome", limit: 255
    t.string "cnpjcpf", limit: 15
    t.datetime "created_at"
    t.string "email", limit: 255
    t.boolean "empresa"
    t.integer "estado_id", limit: 4
    t.integer "impressions_count", limit: 4, default: 0
    t.integer "incentivos_count", limit: 4
    t.decimal "incentivos_sum", precision: 12, scale: 2
    t.date "last_incentivo"
    t.string "logradouro", limit: 255
    t.string "nome", limit: 255
    t.boolean "patrocinador"
    t.integer "projetos_count", limit: 4
    t.integer "projetos_liberados", limit: 4
    t.decimal "projetos_sum", precision: 12, scale: 2
    t.boolean "proponente"
    t.string "responsavel", limit: 255
    t.string "tel_cel", limit: 32
    t.string "tel_com", limit: 32
    t.string "tel_fax", limit: 32
    t.string "tel_res", limit: 32
    t.string "uf", limit: 80
    t.datetime "updated_at"
    t.string "urlized", limit: 255
  end

  create_table "estados", force: :cascade do |t|
    t.string "nome", limit: 20
    t.string "sigla", limit: 2
    t.index ["sigla"], name: "sigla", unique: true
  end

  create_table "impressions", force: :cascade do |t|
    t.string "action_name", limit: 255
    t.string "controller_name", limit: 255
    t.datetime "created_at"
    t.integer "impressionable_id", limit: 4
    t.string "impressionable_type", limit: 255
    t.string "ip_address", limit: 255
    t.text "message", limit: 65535
    t.text "referrer", limit: 65535
    t.string "request_hash", limit: 255
    t.string "session_hash", limit: 255
    t.datetime "updated_at"
    t.integer "user_id", limit: 4
    t.string "view_name", limit: 255
    t.index ["controller_name", "action_name", "ip_address"], name: "controlleraction_ip_index"
    t.index ["controller_name", "action_name", "request_hash"], name: "controlleraction_request_index"
    t.index ["controller_name", "action_name", "session_hash"], name: "controlleraction_session_index"
    t.index ["impressionable_type", "impressionable_id", "ip_address"], name: "poly_ip_index"
    t.index ["impressionable_type", "impressionable_id", "request_hash"], name: "poly_request_index"
    t.index ["impressionable_type", "impressionable_id", "session_hash"], name: "poly_session_index"
    t.index ["impressionable_type", "message", "impressionable_id"], name: "impressionable_type_message_index"
    t.index ["user_id"], name: "index_impressions_on_user_id"
  end

  create_table "incentivos", force: :cascade do |t|
    t.datetime "created_at"
    t.integer "entidade_id", limit: 4
    t.date "last_recibo_at"
    t.integer "projeto_id", limit: 4
    t.integer "recibos_count", limit: 4
    t.datetime "updated_at"
    t.decimal "valor", precision: 11, scale: 2
  end

  create_table "institucionalizations", force: :cascade do |t|
    t.integer "cod_mec", limit: 4
    t.integer "curso_id", limit: 4
    t.integer "endereco_id", limit: 4
    t.string "grau", limit: 255
    t.integer "instituicao_id", limit: 4
    t.string "liberado_at", limit: 255
    t.string "modalidade", limit: 255
  end

  create_table "instituicaos", force: :cascade do |t|
    t.string "categoria", limit: 255
    t.integer "cod_mec", limit: 4
    t.datetime "created_at"
    t.string "emails", limit: 255
    t.integer "endereco_id", limit: 4
    t.datetime "liberada_at"
    t.integer "mantenedora_id", limit: 4
    t.string "nome", limit: 255
    t.string "org", limit: 255
    t.string "sigla", limit: 255
    t.string "site", limit: 255
    t.string "telefone", limit: 255
    t.datetime "updated_at"
    t.string "urlized", limit: 255
  end

  create_table "links", force: :cascade do |t|
    t.string "atalho", limit: 45, null: false
    t.datetime "created_at"
    t.string "ip", limit: 255
    t.datetime "last_referer_at"
    t.string "para", limit: 255, null: false
    t.string "titulo", limit: 45, null: false
  end

  create_table "mantenedoras", force: :cascade do |t|
    t.string "cnpj", limit: 255
    t.integer "cod_mec", limit: 4
    t.datetime "created_at"
    t.string "natureza", limit: 255
    t.string "nome", limit: 255
    t.string "representante", limit: 255
    t.datetime "updated_at"
  end

  create_table "newsletters", force: :cascade do |t|
    t.datetime "created_at"
    t.string "email", limit: 255
  end

  create_table "projetos", force: :cascade do |t|
    t.decimal "apoiado", precision: 11, scale: 2
    t.integer "apoiadores", limit: 4
    t.decimal "aprovado", precision: 11, scale: 2
    t.integer "area_id", limit: 4
    t.date "created_at"
    t.string "enquadramento", limit: 255
    t.integer "entidade_id", limit: 4
    t.integer "estado_id", limit: 4
    t.integer "impressions_count", limit: 4, default: 0
    t.date "liberado_at"
    t.string "mecanismo", limit: 255
    t.string "nome", limit: 255
    t.string "numero", limit: 11
    t.string "processo", limit: 255
    t.string "providencia", limit: 500
    t.integer "segmento_id", limit: 4
    t.text "sintese", limit: 65535
    t.string "situacao", limit: 255
    t.date "situacao_at"
    t.decimal "solicitado", precision: 11, scale: 2
    t.string "uf", limit: 2
    t.date "updated_at"
    t.string "urlized", limit: 255
  end

  create_table "recibos", force: :cascade do |t|
    t.datetime "created_at"
    t.datetime "data"
    t.integer "incentivo_id", limit: 4
    t.datetime "updated_at"
    t.decimal "valor", precision: 11, scale: 2
  end

  create_table "segmentos", force: :cascade do |t|
    t.integer "area_id", limit: 4
    t.string "nome", limit: 255, default: "", null: false
    t.string "urlized", limit: 255
  end

  add_foreign_key "doacoes", "candidatos"
  add_foreign_key "doacoes", "comites"
  add_foreign_key "doacoes", "doadores"
end
