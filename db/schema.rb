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

ActiveRecord::Schema.define(version: 20131215195947) do

  create_table "areas", force: true do |t|
    t.string "nome",    default: "", null: false
    t.string "urlized"
  end

  create_table "clicks", force: true do |t|
    t.integer  "link_id",    null: false
    t.string   "url",        null: false
    t.datetime "created_at"
  end

  create_table "entidades", force: true do |t|
    t.string   "nome"
    t.string   "cnpjcpf",      limit: 15
    t.string   "responsavel"
    t.string   "logradouro"
    t.string   "cidade"
    t.string   "cep",          limit: 10
    t.string   "uf",           limit: 80
    t.string   "email"
    t.string   "tel_res",      limit: 32
    t.string   "tel_cel",      limit: 32
    t.string   "tel_fax",      limit: 32
    t.string   "tel_com",      limit: 32
    t.boolean  "patrocinador"
    t.boolean  "proponente"
    t.boolean  "empresa"
    t.datetime "created_at"
    t.datetime "updated_at"
    t.string   "urlized"
  end

  create_table "estados", force: true do |t|
    t.string "nome",  limit: 20
    t.string "sigla", limit: 2
  end

  create_table "incentivos", force: true do |t|
    t.integer  "projeto_id"
    t.integer  "entidade_id"
    t.decimal  "valor",         precision: 11, scale: 2
    t.datetime "created_at"
    t.datetime "updated_at"
    t.integer  "recibos_count"
  end

  create_table "links", force: true do |t|
    t.string   "titulo",          limit: 45, null: false
    t.string   "atalho",          limit: 45, null: false
    t.string   "para",                       null: false
    t.datetime "created_at"
    t.datetime "last_referer_at"
  end

  create_table "projetos", force: true do |t|
    t.string  "nome"
    t.integer "entidade_id"
    t.string  "numero",        limit: 6
    t.string  "uf",            limit: 2
    t.string  "mecanismo"
    t.string  "enquadramento"
    t.string  "processo"
    t.date    "situacao_at"
    t.string  "situacao"
    t.string  "providencia"
    t.text    "sintese"
    t.decimal "solicitado",              precision: 11, scale: 2
    t.decimal "aprovado",                precision: 11, scale: 2
    t.decimal "apoiado",                 precision: 11, scale: 2
    t.date    "liberado_at"
    t.integer "estado_id"
    t.date    "created_at"
    t.date    "updated_at"
    t.integer "segmento_id"
    t.integer "apoiadores"
    t.integer "area_id"
    t.string  "urlized"
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

end
