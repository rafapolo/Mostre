class MantenedorasController < ApplicationController
  layout "educacao"

  before_action :set_mantenedora, only: [:show]

	def index
    @title = "Mantenedoras"
    @topo = "#{Mantenedora.count} Mantenedoras"
	@pagy, @mantenedoras = pagy(Mantenedora.all, items: 35)
	end

  def show
    @title = @mantenedora.nome
  end

  private
  def set_mantenedora
    @mantenedora = Mantenedora.find(params[:id])
  end

  # Only allow a trusted parameter "white list" through.
  def mantenedora_params
    params.require(:mantenedora).permit(:nome, :cnpj, :cod_mec, :natureza, :representante)
  end

end
