class InstituicaosController < ApplicationController

	def index

	end

  private
  # Only allow a trusted parameter "white list" through.
  def instituicao_params
    params.require(:instituicao).permit(:nome, :cod_mec, :mantenedora_id, :site, :sigla, :telefone, :org, :emails, :categoria, :endereco_id)
  end

end
