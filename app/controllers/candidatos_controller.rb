class CandidatosController < ApplicationController
  include ApplicationHelper

  layout "eleicoes"

  def impor_filtros!
      #todo: refinar com switch
      if nome = params[:nome]
        @candidatos = @candidatos.where("nome like ?", "%#{nome}%")
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
    soma = view_context.number_to_currency(@candidatos.sum(:valor_total), :unit => "R$")
    @topo = "#{@candidatos.count} candidatos com #{soma} em doações."
  end

  def index
    @title = "Candidatos"

    if ordem = params[:ordem]
      ordem = "#{ordem} DESC"
    end

	@pagy, @candidatos = pagy(Candidato.all.order(ordem), items: 35)
    impor_filtros!

    define_resumo!
    render layout: false if request.xhr?
  end

  def show
    @candidato = Candidato.find(params[:id])
  end

  private
  def candidato_params
    params.require(:candidato).permit(:nome, :urlized)
  end

end
