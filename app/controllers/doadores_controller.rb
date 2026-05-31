class DoadoresController < ApplicationController
  include ApplicationHelper
  layout "eleicoes"

  def impor_filtros!
    if nome = params[:nome]
      @doadores = @doadores.where("doador like ?", "%#{nome}%")
    end
  end

  def define_resumo!(total = @doadores.count)
    soma = view_context.number_to_currency(@doadores.sum(:valor_total), :unit => "R$")
    @topo = "#{total} doadores com #{soma} em doações."
  end

  def index
    @title = "Doadores"
    @doadores = Doador.all
    impor_filtros!
    total = @doadores.count
    define_resumo!(total)
    @pagy, @doadores = pagy(@doadores, count: total, items: 35)
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
