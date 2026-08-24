class InstituicaosController < ApplicationController
  layout "educacao"

  before_action :set_instituicao, only: [:show]

	def index
    @title = "Instituições"
    @topo = "#{Instituicao.count} Instituições"
	@pagy, @instituicaos = pagy(Instituicao.all, items: 35)
	end

  def show
    @title = @instituicao.nome
  end

  private
  def set_instituicao
    @instituicao = Instituicao.find(params[:id])
  end

  # Only allow a trusted parameter "white list" through.
  def instituicao_params
    params.require(:instituicao).permit(:nome, :cod_mec, :mantenedora_id, :site, :sigla, :telefone, :org, :emails, :categoria, :endereco_id)
  end

end
