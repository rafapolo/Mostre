class CursosController < ApplicationController
  layout "educacao"

  def index
    page = params[:page] || 1
    @title = "Cursos"
    @topo = "#{Curso.count} Instituições"
    @cursos = Curso.all.paginate(page: page, per_page: 35)
  end

  private
  def curso_params
    params.require(:curso).permit(:nome, :urlized)
  end

end
