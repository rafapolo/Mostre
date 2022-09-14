class DoadoresController < ApplicationController
  include ApplicationHelper

  caches_page :show
  layout "eleicoes"

  def impor_filtros!
      #todo: refinar com switch
      if nome = params[:nome]
        @doadores = @doadores.where("doador like ?", "%#{nome}%")
      end
      #
      # if imposed? :area_id
      #   @entidades = @entidades.where(area_id: params[:area_id])
      # end
      #
      # if imposed? :estado_id
      #   @entidades = @entidades.where(estado_id: params[:estado_id])
      # end
  end

  def define_resumo! # nos índices (_list)
    soma = view_context.number_to_currency(@doadores.sum(:valor_total), :unit => "R$")
    @topo = "#{@doadores.count} doadores com #{soma} em doações."
  end

  def index
    page = params[:page] || 1
    @title = "Doadores"

    if ordem = params[:ordem]
      ordem = "#{ordem} DESC"
    end

    @doadores = Doador.all.paginate(page: page, per_page: 35)
    impor_filtros!

    define_resumo!
    render layout: false if request.xhr?
  end

  def show
    @doador = Doador.find(params[:id])
  end

  private
  def doador_params
    params.require(:doador).permit(:doador, :urlized)
  end

end
