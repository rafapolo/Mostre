class LinksController < ApplicationController
  
  def index
    @link = Link.new
  end

  def stats
    @last_links = Link.order('created_at DESC').limit 5
    @last_clicks = Click.limit 5
    @tops = Link.all(
      :limit=>10,
      :joins=> :clicks,
      :group=>"links.id",
      :select=>"*, COUNT(clicks.id) as clicks_count",
      :order=>"clicks_count DESC"
    )
  end

  def info
    param = params[:link]
    @link = Link.find_by_atalho(param)
    redirect_to "/links", notice: "Link solicitado não existe." unless @link
  end

  def show
    param = params[:link]
    @link = Link.find_by_atalho(param)
    redirect_to "/links", notice: "Link solicitado não existe." unless @link

    # salva click
    href = request.referer
    if @link && href
      @click = Click.new({:link=>@link, :url =>href})
      @click.save!
    end
    @link.update_attribute(:last_referer_at, Time.now)
    redirect_to @link.para
  end

  def create
    @link = Link.new(params[:link].permit!)
    respond_to do |format|
      if @link.save
        flash[:notice] = 'Link foi criado com sucesso.'
        format.html { redirect_to(:action=>"info", :atalho=>@link.atalho) }
      else
        format.html { render :action => "index" }
      end
    end
  end

end