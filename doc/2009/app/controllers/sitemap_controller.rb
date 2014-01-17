class SitemapController < ApplicationController
  def sitemap
    @links = Link.find(:all, :order => "created_at DESC", :limit => 50000)
    headers["Content-Type"] = "text/xml"
    headers["Last-Modified"] = @links[0].created_at.httpdate
  end
end

