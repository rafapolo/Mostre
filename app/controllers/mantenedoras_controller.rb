class MantenedorasController < ApplicationController
  layout "educacao"

	def index
    @title = "Mantenedoras"
    @topo = "#{Mantenedora.count} Mantenedoras"
	@pagy, @mantenedoras = pagy(Mantenedora.all, items: 35)
	end

  private
  # Only allow a trusted parameter "white list" through.
  def instituicao_params
    params.require(:instituicao).permit(:nome, :cod_mec, :mantenedora_id, :site, :sigla, :telefone, :org, :emails, :categoria, :endereco_id)
  end

end
