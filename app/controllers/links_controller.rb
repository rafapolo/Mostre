class LinksController < ApplicationController

  def index
    @link = Link.new
  end

  def stats
    @last_links = Link.order('created_at DESC').limit 10
    @last_clicks = Click.limit 10
    @tops = Link.joins(:clicks).group('links.id').select('*, COUNT(clicks.id) as clicks_count').order('clicks_count DESC').limit(10)
  end

  def info
    param = params[:link]
    @link = Link.find_by_atalho(param)
    redirect_to "/links", notice: "Link não existe. Crie!" unless @link
  end

  def show
    param = params[:link]
    @link = Link.find_by_atalho(param)

    unless @link
      redirect_to "/links", notice: "Link não existe. Crie!" and return
    end

    href = request.referer
    if href
      @click = Click.new({link: @link, url: href})
      @click.save!
      @link.update_attribute(:last_referer_at, Time.now)
    end
    redirect_to @link.para, allow_other_host: true
  end

  def create
   # params[:link][:ip] = request.remote_ip
    @link = Link.new(params.require(:link).permit(:titulo, :para, :ip))
    respond_to do |format|
      if @link.save
        flash[:notice] = 'Link criado com sucesso.'
        format.html { redirect_to("/links/info/#{@link.atalho}") }
      else
        format.html { render :action => "index", status: :unprocessable_entity }
      end
    end
  end

end
