class LinksController < ApplicationController
  # GET /redirs
  # GET /redirs.xml
  def list
    @links = Link.all(
      :limit=>15,
      :joins=> :clicks,
      :group=>"links.id",
      :select=>"*, COUNT(clicks.id) as clicks_count",
      :order=>"clicks_count DESC"
    )
    respond_to do |format|
      format.html # index.html.erb
      format.xml  { render :xml => @links }
    end
  end

  def meus
    links_id = cookies[:links] ? cookies[:links].split("-") : []
    @links = []
    links_id.each do |id|
      begin
        @links << Link.find(id)
      rescue Exception
        flash[:notice] = "Opz! Problema ao buscar algum de seus links"
      end
    end

    respond_to do |format|
      format.html # index.html.erb
    end
  end

  # GET /redirs/1
  # GET /redirs/1.xml
  def show
    param = params[:atalho]
    @link = Link.find_by_atalho(param)

     @hrefs = Link.all(
      :limit=>15,
      :joins=> :clicks,
      :group=>"clicks.url",
      :select=>"*",
      :conditions => ['link_id = ? ', "#{@link.id}"],
      :order => 'clicks.created_at ASC'
    )

    if !@link
      flash[:notice] = "Link solicitado não existe."
      redirect_to :controller => "links", :action => "list"
      return
    end

    respond_to do |format|
      format.html # show.html.erb
      format.xml  { render :xml => @link }
    end
  end

  # GET /redirs/new
  # GET /redirs/new.xml
  def new
    @link = Link.new

    respond_to do |format|
      format.html # new.html.erb
      format.xml  { render :xml => @link }
    end
  end

  # GET /redirs/1/edit
  def edit
    @link = Link.find(params[:id])
  end

  # POST /redirs
  # POST /redirs.xml
  def create
    @link = Link.new(params[:link])

    respond_to do |format|
      if @link.save

        cookies[:links] = cookies[:links].blank? ? @link.id :
          cookies[:links] = { :value => cookies[:links] << "-#{@link.id}", :expires => Time.now + 10.days}

        flash[:notice] = 'Link foi criado com sucesso.'
        format.html { redirect_to(:action=>"show", :atalho=>@link.atalho) }
        format.xml  { render :xml => @link, :status => :created, :location => @link }
      else
        format.html { render :action => "new" }
        format.xml  { render :xml => @link.errors, :status => :unprocessable_entity }
      end
    end
  end

  # PUT /redirs/1
  # PUT /redirs/1.xml
  def update
    @link = Link.find(params[:id])

    respond_to do |format|
      if @link.update_attributes(params[:link])
        flash[:notice] = 'Redir was successfully updated.'
        format.html { redirect_to(@link) }
        format.xml  { head :ok }
      else
        format.html { render :action => "edit" }
        format.xml  { render :xml => @link.errors, :status => :unprocessable_entity }
      end
    end
  end

  # DELETE /redirs/1
  # DELETE /redirs/1.xml
  def destroy
    @link = Link.find(params[:id])
    @link.destroy

    respond_to do |format|
      format.html { redirect_to(redirs_url) }
      format.xml  { head :ok }
    end
  end
end
