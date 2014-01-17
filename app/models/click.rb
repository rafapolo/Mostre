class Click < ActiveRecord::Base
  belongs_to :link
  validates_presence_of :link
  default_scope order('created_at DESC')
end
