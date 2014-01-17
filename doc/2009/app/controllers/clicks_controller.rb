class ClicksController < ApplicationController

  # GET /clicks
  def index
    @clicks = Click.all()

    respond_to do |format|
      format.html # index.html.erb
    end
  end

  # GET /clicks/1
  def show
    @click = Click.find(params[:id])

    respond_to do |format|
      format.html # show.html.erb
    end
  end

  # GET /clicks/new
  def new
    @click = Click.new
    respond_to do |format|
      format.html # new.html.erb
    end
  end

  # POST /clicks
  def novo
    param = params[:atalho]
    @link = Link.find_by_atalho(param)

    href = request.referer
    if @link && href
      @click = Click.new({:link=>@link, :url =>href})
      @click.save!
    else
      if !@link
        flash[:notice] = "Link solicitado não existe."
        redirect_to :controller => "links", :action => "new"
      end
    end
    redirect_to @link.para
  end

  # DELETE /clicks/1
  def destroy
    @click = Click.find(params[:id])
    @click.destroy

    respond_to do |format|
      format.html { redirect_to(clicks_url) }
      format.xml  { head :ok }
    end
  end
end
