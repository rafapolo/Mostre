ActiveRecord::Schema.define(:version => 0.4) do

  create_table "clicks", :force => true do |t|
    t.integer  "link_id",      :null => false
    t.string  "url", :null => false
    t.datetime "created_at"
  end

  create_table "links", :force => true do |t|
    t.string   "titulo",     :limit => 45, :null => false
    t.string   "atalho",     :limit => 45, :null => false
    t.string   "para",         :null => false
    t.datetime "created_at"
  end

end
