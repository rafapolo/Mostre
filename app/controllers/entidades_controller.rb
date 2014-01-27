class EntidadesController < ApplicationController
  before_action :set_entidade, only: [:show]

  # GET /entidades
  def index
    @entidades = Entidade.all
  end

  # GET /entidades/1
  def show_proponente
    @proponente = Entidade.where(urlized: params[:urlized]).take
  end

  def resumo
    estado = params[:estado_id] ? "em " + Estado.find(params[:estado_id]).nome : '' 
    area = params[:area_id] ? "para " + Area.find(params[:area_id]).nome : '' 
    soma = view_context.number_to_currency(@proponentes.sum(:projetos_sum), :unit => "R$")
    "#{@proponentes.count} proponentes #{valor('nome')} #{is('liberados')} #{estado} #{area} com #{soma} em apoios."
  end

  def impor_filtros!
    #todo: refinar com switch

    # if nome = params[:nome] 
    #   @projetos = @projetos.where("proponentes.nome like ?", "%#{nome}%")
    # end  

    # # somente liberados
    # if imposed? :liberados
    #   @projetos = @projetos.where('liberado_at IS NOT NULL')
    # end
    

    # if imposed? :area_id
    #   @projetos = @projetos.where(area_id: params[:area_id])
    # end

    # if imposed? :estado_id
    #   @projetos = @projetos.where(estado_id: params[:estado_id])
    # end       

  end

  def proponentes
    page = params[:page] || 1

    if ordem = params[:ordem]
      ordem = "#{ordem} DESC"
    end

    impor_filtros!

    @proponentes = Entidade.proponentes.includes(:estado).order(ordem).paginate(page: page, per_page: 35)

    unless params[:estado_id]
      #todo: benchmark group(:estado)
      por_estados = @proponentes.select('estado.nome, count(estado_id) DESC as count').group('estados.id').order('count(estado_id) DESC').references(:estados)
      @estados = {}
      Estado.all.each{|e| @estados[e] = por_estados.count[e.id] || 0}
      @estados = @estados.sort_by{|k, v| v}.reverse
    else
      @estado = Estado.find params[:estado_id]
    end

    # unless params[:area_id]
    #   @areas = {}
    #   por_area = @proponentes.includes(:projeto, :area).select('`areas`.`nome`').group('`areas`.`id`').count
    #   Area.all.each{|a| @areas[a] = por_area[a.id] || 0}
    #   @areas = @areas.sort_by{|k, v| v}.reverse
    # else
    #   @area = Area.find params[:area_id]
    # end

    @topo = resumo
    render layout: false if request.xhr?

  end


  private
    # Use callbacks to share common setup or constraints between actions.
    def set_entidade
      @entidade = Entidade.find(params[:id])
    end

    # Only allow a trusted parameter "white list" through.
    def entidade_params
      params.require(:entidade).permit(:nome, :cnpjcpf, :responsavel, :logradouro, :cidade, :cep, :uf, :email, :tel_res, :tel_cel, :tel_fax, :tel_com)
    end
end
