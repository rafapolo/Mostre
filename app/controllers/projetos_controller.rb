class ProjetosController < ApplicationController
  before_action :set_projeto, only: [:show]
  caches_page :show

  def resumo
    estado = params[:estado_id] ? "em " + Estado.find(params[:estado_id]).nome : ''
    area = params[:area_id] ? "para " + Area.find(params[:area_id]).nome : ''
    soma = view_context.number_to_currency(@projetos.sum(:apoiado), :unit => "R$")
    "#{@projetos.count} projetos #{valor('nome')} #{is('liberados')} #{estado} #{area} com #{soma} em apoios."
  end

  def impor_filtros!
    #todo: refinar com switch

    if nome = params[:nome]
      @projetos = @projetos.where("projetos.nome like ?", "%#{nome}%")
    end

    if sintese = params[:sintese]
      @projetos = @projetos.where("projetos.sintese like ?", "%#{sintese}%")
    end

    if providencia = params[:providencia]
      @projetos = @projetos.where("projetos.providencia like ?", "%#{providencia}%")
    end

    # somente liberados
    if imposed? :liberados
      @projetos = @projetos.where('liberado_at IS NOT NULL')
    end

    if imposed? :fnc
      @projetos = @projetos.where('mecanismo = "FNC"')
    end

    if imposed? :recurso_tesouro
      @projetos = @projetos.where('mecanismo = "Recurso do Tesouro"')
    end

    #apoiado_maior_aprovado
    if imposed? :apoiado_maior_aprovado
      @projetos = @projetos.where('(apoiado > aprovado) and (aprovado > 0)')
    end

    if imposed? :apoiado_maior_zero
      @projetos = @projetos.where('apoiado > 0')
    end

    if imposed? :apoiadores_maior_20
      @projetos = @projetos.where('apoiadores > 20')
    end

    if imposed? :area_id
      @projetos = @projetos.where(area_id: params[:area_id])
    end

    if imposed? :estado_id
      @projetos = @projetos.where(estado_id: params[:estado_id])
    end

  end

  def index
    @title = "Projetos"
    page = params[:page] || 1

    if ordem = params[:ordem]
      ordem = "#{ordem} DESC"
    end

    @projetos = Projeto.includes(:entidade).order(ordem).paginate(page: page, per_page: 35)
    impor_filtros!

    unless params[:estado_id]
      #todo: benchmark group(:estado)
      por_estados = @projetos.includes(:estado).select('estado.nome, count(estado_id) DESC as count').group('estados.id').order('count(estado_id) DESC').references(:estados)
      @estados = {}
      Estado.all.each{|e| @estados[e] = por_estados.count[e.id] || 0}
      @estados = @estados.sort_by{|k, v| v}.reverse
    else
      @estado = Estado.find params[:estado_id]
    end

    unless params[:area_id]
      @areas = {}
      por_area = @projetos.joins(:segmento, :area).select('`areas`.`nome`').group('`areas`.`id`').count
      Area.all.each{|a| @areas[a] = por_area[a.id] || 0}
      @areas = @areas.sort_by{|k, v| v}.reverse
    else
      @area = Area.find params[:area_id]
    end

    @topo = resumo
    render layout: false if request.xhr?
  end

  def show
    apoiadores = "com #{@projeto.apoiadores} apoiadores" if @projeto.apoiadores
    @resumo = "Projeto em #{@projeto.estado.nome} #{apoiadores} por #{@projeto.mecanismo} em #{@projeto.area.nome} - #{@projeto.segmento.nome}"
    impressionist @projeto
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_projeto
      @projeto = Projeto.find(params[:id])
      @title = @projeto.nome
    end

    # Only allow a trusted parameter "white list" through.
    def projeto_params
      params.require(:projeto).permit(:nome, :proponente_id, :numero, :uf, :area, :mecanismo, :enquadramento, :segmento, :processo, :date, :situacao, :providencia, :sintese, :solicitado, :aprovado, :apoiado, :date)
    end
end
