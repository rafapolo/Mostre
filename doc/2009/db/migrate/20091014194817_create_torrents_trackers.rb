class CreateTorrentsTrackers < ActiveRecord::Migration
  def self.up
    create_table :torrents_trackers do |t|

      t.timestamps
    end
  end

  def self.down
    drop_table :torrents_trackers
  end
end
