class ApplicationController < ActionController::Base  
  protect_from_forgery with: :exception

  before_filter :set_cache_buster

  def set_cache_buster
    response.headers["Cache-Control"] = "no-cache, no-store, max-age=0, must-revalidate"
    response.headers["Pragma"] = "no-cache"
  end

  def imposed? id_sym
    return params[id_sym]
  end

end
