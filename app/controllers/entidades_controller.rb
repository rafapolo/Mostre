class EntidadesController < ApplicationController
  include ApplicationHelper

  before_action :set_entidade, only: [:show]
  caches_page :show
  layout "cultura"

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
    nodes = []
    links = []
    financiadores = []
    nodes << {id: "e#{@entidade.id}", label: @entidade.nome, type: 'proponente'}
    @entidade.projetos.each do |p|
      if p.incentivos.count > 0
        nodes << {id: "p#{p.id}", label: p.nome, shape: "ellipse", type: 'projeto'}
        p.incentivos.each do |i|
          financiador = i.entidade
          financiadores << i.entidade.id
          nodes << {id: "e#{financiador.id}", label: financiador.nome, type: 'financiador'}
          links << {source: "e#{financiador.id}", target: "p#{p.id}", label: "#{reais i.valor}"}
        end
        links << {source: "p#{p.id}", target: "e#{@entidade.id}", label: "#{reais p.apoiado}"}
      end
    end
    @graph = {nodes: nodes.uniq, links: links}.to_json.html_safe

    @js = "window.graph = \"#{@graph})\";" # todo: refine
    @financiadores_count = financiadores.uniq.count
    #impressionist @entidade
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
