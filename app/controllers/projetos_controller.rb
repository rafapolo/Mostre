class ProjetosController < ApplicationController
  before_action :set_projeto, only: [:show]
  layout "cultura"

  def resumo(count = @projetos.count)
    estado = params[:estado_id] ? "em " + Estado.find(params[:estado_id]).nome : ''
    area = params[:area_id] ? "para " + Area.find(params[:area_id]).nome : ''
    soma = view_context.number_to_currency(@projetos.sum(:apoiado), :unit => "R$")
    "#{count} projetos #{valor('nome')} #{is('liberados')} #{estado} #{area} com #{soma} em apoios."
  end

  def impor_filtros!
    if nome = params[:nome]
      @projetos = @projetos.where("projetos.nome like ?", "%#{nome}%")
    end
    if sintese = params[:sintese]
      @projetos = @projetos.where("projetos.sintese like ?", "%#{sintese}%")
    end
    if providencia = params[:providencia]
      @projetos = @projetos.where("projetos.providencia like ?", "%#{providencia}%")
    end
    @projetos = @projetos.where('liberado_at IS NOT NULL') if imposed? :liberados
    @projetos = @projetos.where('mecanismo = "FNC"') if imposed? :fnc
    @projetos = @projetos.where('mecanismo = "Recurso do Tesouro"') if imposed? :recurso_tesouro
    @projetos = @projetos.where('(apoiado > aprovado) and (aprovado > 0)') if imposed? :apoiado_maior_aprovado
    @projetos = @projetos.where('apoiado > 0') if imposed? :apoiado_maior_zero
    @projetos = @projetos.where('apoiadores > 20') if imposed? :apoiadores_maior_20
    @projetos = @projetos.where(area_id: params[:area_id]) if imposed? :area_id
    @projetos = @projetos.where(estado_id: params[:estado_id]) if imposed? :estado_id
  end

  def index
    @title = "Projetos"
    ordem = safe_ordem_param

    @projetos = Projeto.includes(:entidade)
    @projetos = @projetos.order(Arel.sql("#{ordem} DESC")) if ordem
    impor_filtros!

    unless params[:estado_id]
      por_estados = @projetos.group(:estado_id).count
      @estados = Estado.all.map { |e| [e, por_estados[e.id] || 0] }.sort_by { |_, c| c }.reverse
    else
      @estado = Estado.find params[:estado_id]
    end

    unless params[:area_id]
      por_area = @projetos.group(:area_id).count
      @areas = Area.all.map { |a| [a, por_area[a.id] || 0] }.sort_by { |_, c| c }.reverse
    else
      @area = Area.find params[:area_id]
    end

    total = @projetos.count
    @topo = resumo(total)
    @pagy, @projetos = pagy(@projetos, count: total, items: 35)
    render layout: false if request.xhr?
  end

  def show
    apoiadores = "com #{@projeto.apoiadores} apoiadores" if @projeto.apoiadores
    @resumo = "Projeto em #{@projeto.estado&.nome} #{apoiadores} por #{@projeto.mecanismo} em #{@projeto.area&.nome} - #{@projeto.segmento&.nome}"
  end

  private
    def set_projeto
      @projeto = Projeto.find(params[:id])
      @title = @projeto.nome
    end

    def projeto_params
      params.require(:projeto).permit(:nome, :proponente_id, :numero, :uf, :area, :mecanismo, :enquadramento, :segmento, :processo, :date, :situacao, :providencia, :sintese, :solicitado, :aprovado, :apoiado, :date)
    end
end
