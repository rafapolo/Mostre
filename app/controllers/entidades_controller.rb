class EntidadesController < ApplicationController
  before_action :set_entidade, only: [:show]

  def define_resumo! # nos índices (_list)
    estado = params[:estado_id] ? "em " + Estado.find(params[:estado_id]).nome : '' 
    area = params[:area_id] ? "para " + Area.find(params[:area_id]).nome : '' 
    tipo = request.path.index("proponente") ? 'proponentes' : 'patrocinadores'
    if tipo == 'proponentes'
      soma = view_context.number_to_currency(@entidades.sum(:projetos_sum), :unit => "R$")
    else
      soma = view_context.number_to_currency(@entidades.sum(:incentivos_sum), :unit => "R$")
    end
    
    @topo = "#{@entidades.count} #{tipo} #{valor('nome')} #{is('liberados')} #{estado} #{area} com #{soma} em apoios."
  end

  def show
    # por_estados = Entidade.includes(:estado).select('estado.nome, count(estado_id) DESC as count').where(id: params[:id]).group('estados.id').order('count(estado_id) DESC').references(:estados)
    # @estados = {}
    # Estado.all.each{|e| @estados[e] = por_estados.count[e.id] || 0}
    # @estados = @estados.sort_by{|k, v| v}.reverse

    #@resumo = "#{@entidade.cidade} - #{@entidade.estado.sigla}"
  end


  def impor_filtros!
    #todo: refinar com switch    
    if nome = params[:nome]      
      @entidades = @entidades.where("entidades.nome like ?", "%#{nome}%")
    end

    if imposed? :area_id
      @entidades = @entidades.where(area_id: params[:area_id])
    end

    if imposed? :estado_id
      @entidades = @entidades.where(estado_id: params[:estado_id])
    end   
 
  end

  def patrocinadores
    @title = "Patrocinadores"
    page = params[:page] || 1

    if ordem = params[:ordem]
      ordem = "#{ordem} DESC"
    end    

    @entidades = Entidade.patrocinadores.includes(:estado).order(ordem).paginate(page: page, per_page: 35)
    impor_filtros!

    unless params[:estado_id]
      #todo: benchmark group(:estado)
      por_estados = @entidades.select('estado.nome, count(estado_id) DESC as count').group('estados.id').order('count(estado_id) DESC').references(:estados)
      @estados = {}
      Estado.all.each{|e| @estados[e] = por_estados.count[e.id] || 0}
      @estados = @estados.sort_by{|k, v| v}.reverse
    else
      @estado = Estado.find params[:estado_id]
    end

    define_resumo!
    render layout: false if request.xhr?

  end

  def proponentes
    @title = "Proponentes"
    page = params[:page] || 1

    if ordem = params[:ordem]
      ordem = "#{ordem} DESC"
    end    

    @entidades = Entidade.proponentes.includes(:estado).order(ordem).paginate(page: page, per_page: 35)
    impor_filtros!

    unless params[:estado_id]
      #todo: benchmark group(:estado)
      por_estados = @entidades.select('estado.nome, count(estado_id) DESC as count').group('estados.id').order('count(estado_id) DESC').references(:estados)
      @estados = {}
      Estado.all.each{|e| @estados[e] = por_estados.count[e.id] || 0}
      @estados = @estados.sort_by{|k, v| v}.reverse
    else
      @estado = Estado.find params[:estado_id]
    end

    # todo: area proponente
    # unless params[:area_id]
    #   @areas = {}
    #   por_area = @entidades.includes(:projeto, :area).select('`areas`.`nome`').group('`areas`.`id`').count
    #   Area.all.each{|a| @areas[a] = por_area[a.id] || 0}
    #   @areas = @areas.sort_by{|k, v| v}.reverse
    # else
    #   @area = Area.find params[:area_id]
    # end

    define_resumo!
    render layout: false if request.xhr?
  end


  private
    # Use callbacks to share common setup or constraints between actions.
    def set_entidade      
      @entidade = Entidade.find(params[:id])
      @title = @entidade.nome
    end

    # Only allow a trusted parameter "white list" through.
    def entidade_params
      params.require(:entidade).permit(:nome, :cnpjcpf, :responsavel, :logradouro, :cidade, :cep, :uf, :email, :tel_res, :tel_cel, :tel_fax, :tel_com)
    end
end
