class CandidatosController < ApplicationController
  caches_page :show
  layout "eleicoes"

  def index
    page = params[:page] || 1
    @title = "Candidatos"
    @topo = "#{Candidato.count} Candidatos"
    @candidatos = Candidato.all.paginate(page: page, per_page: 35)
  end

  def show
    @candidato = Candidato.find(params[:id])
  end

  private
  def candidato_params
    params.require(:candidato).permit(:nome, :urlized)
  end

end
