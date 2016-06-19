class AddCounterCacheToEntities < ActiveRecord::Migration
  def change
    add_column :entidades, :impressions_count, :integer, :default => 0
    add_column :cidades, :impressions_count, :integer, :default => 0
    add_column :projetos, :impressions_count, :integer, :default => 0
  end
end
