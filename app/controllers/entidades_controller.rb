class EntidadesController < ApplicationController
  include ApplicationHelper

  before_action :set_entidade, only: [:show]
  layout "cultura"

  def define_resumo!(total = @entidades.count)
    estado = params[:estado_id] ? "em " + Estado.find(params[:estado_id]).nome : ''
    area = params[:area_id] ? "para " + Area.find(params[:area_id]).nome : ''
    tipo = request.path.index("proponente") ? 'proponentes' : 'patrocinadores'
    soma_col = tipo == 'proponentes' ? :projetos_sum : :incentivos_sum
    soma = view_context.number_to_currency(@entidades.sum(soma_col), :unit => "R$")
    @topo = "#{total} #{tipo} #{valor('nome')} #{is('liberados')} #{estado} #{area} com #{soma} em apoios."
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
    @financiadores_count = financiadores.uniq.count
  end

  def impor_filtros!
    if nome = params[:nome]
      @entidades = @entidades.where("entidades.nome like ?", "%#{nome}%")
    end
    @entidades = @entidades.where(area_id: params[:area_id]) if imposed? :area_id
    @entidades = @entidades.where(estado_id: params[:estado_id]) if imposed? :estado_id
  end

  def patrocinadores
    render_entidades_list(Entidade.patrocinadores, "Patrocinadores")
  end

  def proponentes
    render_entidades_list(Entidade.proponentes, "Proponentes")
  end

  private

    def render_entidades_list(scope, title)
      @title = title
      ordem = safe_ordem_param
      @entidades = scope.includes(:estado)
      @entidades = @entidades.order(Arel.sql("#{ordem} DESC")) if ordem
      impor_filtros!

      unless params[:estado_id]
        por_estados = @entidades.group(:estado_id).count
        @estados = Estado.all.map { |e| [e, por_estados[e.id] || 0] }.sort_by { |_, c| c }.reverse
      else
        @estado = Estado.find params[:estado_id]
      end

      total = @entidades.count
      define_resumo!(total)
      @pagy, @entidades = pagy(@entidades, count: total, items: 35)
      render layout: false if request.xhr?
    end

    def set_entidade
      @entidade = Entidade.find(params[:id])
      @title = @entidade.nome
    end

    def entidade_params
      params.require(:entidade).permit(:nome, :cnpjcpf, :responsavel, :logradouro, :cidade, :cep, :uf, :email, :tel_res, :tel_cel, :tel_fax, :tel_com)
    end
end
