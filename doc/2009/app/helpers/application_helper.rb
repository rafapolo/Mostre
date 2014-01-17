# Methods added to this helper will be available to all templates in the application.
module ApplicationHelper

  def meus_links_count
    cookies[:links] ? cookies[:links].split("-").size : 0
  end

  def href(link)
    "<a href='#{link}'>#{link}</a>"
  end
end
