class AddCounterCacheToEntities < ActiveRecord::Migration
  def change
    add_column :entidades, :counte_cache, :integer, :default => 0
    add_column :cidades, :counte_cache, :integer, :default => 0
    add_column :projetos, :counte_cache, :integer, :default => 0
  end
end
