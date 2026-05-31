class ApplicationController < ActionController::Base
  include Pagy::Backend
  protect_from_forgery with: :exception

  before_action :set_cache_buster

  def set_cache_buster
    response.headers["Cache-Control"] = "no-cache, no-store, max-age=0, must-revalidate"
    response.headers["Pragma"] = "no-cache"
  end

  def imposed? id_sym
    return params[id_sym]
  end

  def valor nome
    !params[nome] || params[nome]=='' ? '' : "'#{params[nome]}'"
  end  

   def is was    
    was if params[was.to_sym]=='true'
  end

end
