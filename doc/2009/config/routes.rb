ActionController::Routing::Routes.draw do |map|

  map.root  :controller => 'links', :action => 'new'
  map.connect '/criar', {:controller => 'links', :action => 'new'}
  map.connect '/top/links', {:controller => 'links', :action => 'list'}
  map.connect '/meus', {:controller => 'links', :action => 'meus'}

  map.connect ':atalho', {:controller => 'clicks', :action => 'novo'}
  map.connect '/info/:atalho', {:controller => 'links', :action => 'show'}

  map.connect ':controller/:action/:id'
  map.connect ':controller/:action/:id.:format'

  map.connect 'sitemap.xml', :controller => "sitemap", :action => "sitemap"
end