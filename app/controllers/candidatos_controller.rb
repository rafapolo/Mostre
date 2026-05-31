class CandidatosController < ApplicationController
  include ApplicationHelper
  layout "eleicoes"

  def impor_filtros!
    if nome = params[:nome]
      @candidatos = @candidatos.where("nome like ?", "%#{nome}%")
    end
  end

  def define_resumo!(total = @candidatos.count)
    soma = view_context.number_to_currency(@candidatos.sum(:valor_total), :unit => "R$")
    @topo = "#{total} candidatos com #{soma} em doações."
  end

  def index
    @title = "Candidatos"
    ordem = safe_ordem_param

    @candidatos = Candidato.all
    @candidatos = @candidatos.order(Arel.sql("#{ordem} DESC")) if ordem
    impor_filtros!
    total = @candidatos.count
    define_resumo!(total)
    @pagy, @candidatos = pagy(@candidatos, count: total, items: 35)
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
