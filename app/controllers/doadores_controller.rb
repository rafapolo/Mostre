class DoadoresController < ApplicationController
  caches_page :show
  layout "eleicoes"

  def index
    page = params[:page] || 1
    @title = "Doadores"
    @topo = "#{Doador.count} Doadores"
    @doadores = Doador.all.paginate(page: page, per_page: 35)
  end

  def show
    @doador = Doador.find(params[:id])
  end

  private
  def doador_params
    params.require(:doador).permit(:doador, :urlized)
  end

end
