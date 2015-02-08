# encoding: UTF-8
# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# Note that this schema.rb definition is the authoritative source for your
# database schema. If you need to create the application database on another
# system, you should be using db:schema:load, not running all the migrations
# from scratch. The latter is a flawed and unsustainable approach (the more migrations
# you'll amass, the slower it'll run and the greater likelihood for issues).
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema.define(version: 20150104111709) do

  create_table "areas", force: true do |t|
    t.string "nome",    default: "", null: false
    t.string "urlized"
  end

  add_index "areas", ["urlized"], name: "urlized", unique: true, using: :btree

  create_table "cidades", force: true do |t|
    t.integer "estado_id"
    t.string  "nome",                                       default: "", null: false
    t.string  "urlized"
    t.decimal "latitude",          precision: 11, scale: 8
    t.decimal "longitude",         precision: 11, scale: 8
    t.integer "impressions_count",                          default: 0
  end

  create_table "clicks", force: true do |t|
    t.integer  "link_id",    null: false
    t.string   "url",        null: false
    t.datetime "created_at"
  end

  create_table "cursos", force: true do |t|
    t.string   "nome"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "urlized"
  end

  create_table "enderecos", force: true do |t|
    t.string   "endereco"
    t.string   "complemento"
    t.string   "bairro"
    t.string   "cep"
    t.integer  "numero"
    t.integer  "city_id"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "entidades", force: true do |t|
    t.string   "nome"
    t.string   "cnpjcpf",            limit: 15
    t.string   "responsavel"
    t.string   "logradouro"
    t.string   "cidade_nome"
    t.string   "cep",                limit: 10
    t.string   "uf",                 limit: 80
    t.string   "email"
    t.string   "tel_res",            limit: 32
    t.string   "tel_cel",            limit: 32
    t.string   "tel_fax",            limit: 32
    t.string   "tel_com",            limit: 32
    t.boolean  "patrocinador"
    t.boolean  "proponente"
    t.boolean  "empresa"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "urlized"
    t.integer  "projetos_count"
    t.decimal  "projetos_sum",                  precision: 12, scale: 2
    t.integer  "incentivos_count"
    t.decimal  "incentivos_sum",                precision: 12, scale: 2
    t.integer  "estado_id"
    t.integer  "projetos_liberados"
    t.date     "last_incentivo"
    t.integer  "cidade_id"
    t.integer  "impressions_count",                                      default: 0
  end

  create_table "estados", force: true do |t|
    t.string "nome",  limit: 20
    t.string "sigla", limit: 2
  end

  add_index "estados", ["sigla"], name: "sigla", unique: true, using: :btree

  create_table "impressions", force: true do |t|
    t.string   "impressionable_type"
    t.integer  "impressionable_id"
    t.integer  "user_id"
    t.string   "controller_name"
    t.string   "action_name"
    t.string   "view_name"
    t.string   "request_hash"
    t.string   "ip_address"
    t.string   "session_hash"
    t.text     "message"
    t.text     "referrer"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  add_index "impressions", ["controller_name", "action_name", "ip_address"], name: "controlleraction_ip_index", using: :btree
  add_index "impressions", ["controller_name", "action_name", "request_hash"], name: "controlleraction_request_index", using: :btree
  add_index "impressions", ["controller_name", "action_name", "session_hash"], name: "controlleraction_session_index", using: :btree
  add_index "impressions", ["impressionable_type", "impressionable_id", "ip_address"], name: "poly_ip_index", using: :btree
  add_index "impressions", ["impressionable_type", "impressionable_id", "request_hash"], name: "poly_request_index", using: :btree
  add_index "impressions", ["impressionable_type", "impressionable_id", "session_hash"], name: "poly_session_index", using: :btree
  add_index "impressions", ["impressionable_type", "message", "impressionable_id"], name: "impressionable_type_message_index", length: {"impressionable_type"=>nil, "message"=>255, "impressionable_id"=>nil}, using: :btree
  add_index "impressions", ["user_id"], name: "index_impressions_on_user_id", using: :btree

  create_table "incentivos", force: true do |t|
    t.integer  "projeto_id"
    t.integer  "entidade_id"
    t.decimal  "valor",          precision: 11, scale: 2
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "recibos_count"
    t.date     "last_recibo_at"
  end

  create_table "institucionalizations", force: true do |t|
    t.integer "instituicao_id"
    t.integer "curso_id"
    t.string  "grau"
    t.string  "modalidade"
    t.integer "cod_mec"
    t.string  "liberado_at"
    t.integer "endereco_id"
  end

  create_table "instituicaos", force: true do |t|
    t.datetime "liberada_at"
    t.integer  "cod_mec"
    t.integer  "mantenedora_id"
    t.integer  "endereco_id"
    t.string   "site"
    t.string   "sigla"
    t.string   "nome"
    t.string   "telefone"
    t.string   "org"
    t.string   "categoria"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "emails"
    t.string   "urlized"
  end

  create_table "links", force: true do |t|
    t.string   "titulo",          limit: 45, null: false
    t.string   "atalho",          limit: 45, null: false
    t.string   "para",                       null: false
    t.datetime "created_at"
    t.datetime "last_referer_at"
  end

  create_table "mantenedoras", force: true do |t|
    t.integer  "cod_mec"
    t.string   "cnpj"
    t.string   "natureza"
    t.string   "representante"
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "newsletters", force: true do |t|
    t.string   "email"
    t.datetime "created_at"
  end

  create_table "projetos", force: true do |t|
    t.string  "nome"
    t.integer "entidade_id"
    t.string  "numero",            limit: 11
    t.string  "uf",                limit: 2
    t.string  "mecanismo"
    t.string  "enquadramento"
    t.string  "processo"
    t.date    "situacao_at"
    t.string  "situacao"
    t.string  "providencia",       limit: 500
    t.text    "sintese"
    t.decimal "solicitado",                    precision: 11, scale: 2
    t.decimal "aprovado",                      precision: 11, scale: 2
    t.decimal "apoiado",                       precision: 11, scale: 2
    t.date    "liberado_at"
    t.integer "estado_id"
    t.date    "created_at"
    t.date    "updated_at"
    t.integer "segmento_id"
    t.integer "apoiadores"
    t.integer "area_id"
    t.string  "urlized"
    t.integer "impressions_count",                                      default: 0
  end

  create_table "recibos", force: true do |t|
    t.integer  "incentivo_id"
    t.datetime "data"
    t.decimal  "valor",        precision: 11, scale: 2
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "segmentos", force: true do |t|
    t.string  "nome",    default: "", null: false
    t.integer "area_id"
    t.string  "urlized"
  end

  create_table "tse_donations", force: true do |t|
    t.string  "uf",          limit: 2
    t.string  "partido",     limit: 8
    t.string  "cargo"
    t.string  "nome"
    t.integer "numero"
    t.integer "ano"
    t.string  "cpf",         limit: 20
    t.string  "doador"
    t.string  "recurso",     limit: 20
    t.string  "data",        limit: 20
    t.string  "motivo",      limit: 400
    t.float   "valor",       limit: 53
    t.boolean "empresa"
    t.string  "tipo",        limit: 20
    t.integer "doador_id"
    t.integer "receptor_id"
  end

  add_index "tse_donations", ["cpf"], name: "cpf", using: :btree
  add_index "tse_donations", ["doador_id"], name: "doador_id", using: :btree
  add_index "tse_donations", ["nome"], name: "nome", using: :btree
  add_index "tse_donations", ["uf"], name: "uf", using: :btree

  create_table "tse_entidades", force: true do |t|
    t.string  "cpf",      limit: 20
    t.string  "nome"
    t.boolean "empresa"
    t.boolean "receptor"
  end

  add_index "tse_entidades", ["cpf"], name: "cpf", using: :btree
  add_index "tse_entidades", ["nome"], name: "nome", using: :btree

end
