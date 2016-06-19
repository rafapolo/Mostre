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

ActiveRecord::Schema.define(version: 20150329115411) do

  create_table "areas", force: :cascade do |t|
    t.string "nome",    limit: 255, default: "", null: false
    t.string "urlized", limit: 255
  end

  add_index "areas", ["urlized"], name: "urlized", unique: true, using: :btree

  create_table "cidades", force: :cascade do |t|
    t.integer "estado_id",         limit: 4
    t.string  "nome",              limit: 255,                          default: "", null: false
    t.string  "urlized",           limit: 255
    t.decimal "latitude",                      precision: 11, scale: 8
    t.decimal "longitude",                     precision: 11, scale: 8
    t.integer "impressions_count", limit: 4,                            default: 0
  end

  create_table "clicks", force: :cascade do |t|
    t.integer  "link_id",    limit: 4,   null: false
    t.string   "url",        limit: 255, null: false
    t.datetime "created_at"
  end

  create_table "cursos", force: :cascade do |t|
    t.string   "nome",       limit: 255
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "urlized",    limit: 255
  end

  create_table "enderecos", force: :cascade do |t|
    t.string   "endereco",    limit: 255
    t.string   "complemento", limit: 255
    t.string   "bairro",      limit: 255
    t.string   "cep",         limit: 255
    t.integer  "numero",      limit: 4
    t.integer  "city_id",     limit: 4
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "entidades", force: :cascade do |t|
    t.string   "nome",               limit: 255
    t.string   "cnpjcpf",            limit: 15
    t.string   "responsavel",        limit: 255
    t.string   "logradouro",         limit: 255
    t.string   "cidade_nome",        limit: 255
    t.string   "cep",                limit: 10
    t.string   "uf",                 limit: 80
    t.string   "email",              limit: 255
    t.string   "tel_res",            limit: 32
    t.string   "tel_cel",            limit: 32
    t.string   "tel_fax",            limit: 32
    t.string   "tel_com",            limit: 32
    t.boolean  "patrocinador"
    t.boolean  "proponente"
    t.boolean  "empresa"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "urlized",            limit: 255
    t.integer  "projetos_count",     limit: 4
    t.decimal  "projetos_sum",                   precision: 12, scale: 2
    t.integer  "incentivos_count",   limit: 4
    t.decimal  "incentivos_sum",                 precision: 12, scale: 2
    t.integer  "estado_id",          limit: 4
    t.integer  "projetos_liberados", limit: 4
    t.date     "last_incentivo"
    t.integer  "cidade_id",          limit: 4
    t.integer  "impressions_count",  limit: 4,                            default: 0
  end

  create_table "estados", force: :cascade do |t|
    t.string "nome",  limit: 20
    t.string "sigla", limit: 2
  end

  add_index "estados", ["sigla"], name: "sigla", unique: true, using: :btree

  create_table "impressions", force: :cascade do |t|
    t.string   "impressionable_type", limit: 255
    t.integer  "impressionable_id",   limit: 4
    t.integer  "user_id",             limit: 4
    t.string   "controller_name",     limit: 255
    t.string   "action_name",         limit: 255
    t.string   "view_name",           limit: 255
    t.string   "request_hash",        limit: 255
    t.string   "ip_address",          limit: 255
    t.string   "session_hash",        limit: 255
    t.text     "message",             limit: 65535
    t.text     "referrer",            limit: 65535
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

  create_table "incentivos", force: :cascade do |t|
    t.integer  "projeto_id",     limit: 4
    t.integer  "entidade_id",    limit: 4
    t.decimal  "valor",                    precision: 11, scale: 2
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "recibos_count",  limit: 4
    t.date     "last_recibo_at"
  end

  create_table "institucionalizations", force: :cascade do |t|
    t.integer "instituicao_id", limit: 4
    t.integer "curso_id",       limit: 4
    t.string  "grau",           limit: 255
    t.string  "modalidade",     limit: 255
    t.integer "cod_mec",        limit: 4
    t.string  "liberado_at",    limit: 255
    t.integer "endereco_id",    limit: 4
  end

  create_table "instituicaos", force: :cascade do |t|
    t.datetime "liberada_at"
    t.integer  "cod_mec",        limit: 4
    t.integer  "mantenedora_id", limit: 4
    t.integer  "endereco_id",    limit: 4
    t.string   "site",           limit: 255
    t.string   "sigla",          limit: 255
    t.string   "nome",           limit: 255
    t.string   "telefone",       limit: 255
    t.string   "org",            limit: 255
    t.string   "categoria",      limit: 255
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "emails",         limit: 255
    t.string   "urlized",        limit: 255
  end

  create_table "links", force: :cascade do |t|
    t.string   "titulo",          limit: 45,  null: false
    t.string   "atalho",          limit: 45,  null: false
    t.string   "para",            limit: 255, null: false
    t.datetime "created_at"
    t.datetime "last_referer_at"
    t.string   "ip",              limit: 255
  end

  create_table "mantenedoras", force: :cascade do |t|
    t.integer  "cod_mec",       limit: 4
    t.string   "cnpj",          limit: 255
    t.string   "natureza",      limit: 255
    t.string   "representante", limit: 255
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "nome",          limit: 255
  end

  create_table "newsletters", force: :cascade do |t|
    t.string   "email",      limit: 255
    t.datetime "created_at"
  end

  create_table "projetos", force: :cascade do |t|
    t.string  "nome",              limit: 255
    t.integer "entidade_id",       limit: 4
    t.string  "numero",            limit: 11
    t.string  "uf",                limit: 2
    t.string  "mecanismo",         limit: 255
    t.string  "enquadramento",     limit: 255
    t.string  "processo",          limit: 255
    t.date    "situacao_at"
    t.string  "situacao",          limit: 255
    t.string  "providencia",       limit: 500
    t.text    "sintese",           limit: 65535
    t.decimal "solicitado",                      precision: 11, scale: 2
    t.decimal "aprovado",                        precision: 11, scale: 2
    t.decimal "apoiado",                         precision: 11, scale: 2
    t.date    "liberado_at"
    t.integer "estado_id",         limit: 4
    t.date    "created_at"
    t.date    "updated_at"
    t.integer "segmento_id",       limit: 4
    t.integer "apoiadores",        limit: 4
    t.integer "area_id",           limit: 4
    t.string  "urlized",           limit: 255
    t.integer "impressions_count", limit: 4,                              default: 0
  end

  create_table "recibos", force: :cascade do |t|
    t.integer  "incentivo_id", limit: 4
    t.datetime "data"
    t.decimal  "valor",                  precision: 11, scale: 2
    t.datetime "created_at"
    t.datetime "updated_at"
  end

  create_table "segmentos", force: :cascade do |t|
    t.string  "nome",    limit: 255, default: "", null: false
    t.integer "area_id", limit: 4
    t.string  "urlized", limit: 255
  end

end
