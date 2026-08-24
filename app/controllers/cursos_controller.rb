class CursosController < ApplicationController
  layout "educacao"

  before_action :set_curso, only: [:show]

  def index
    @title = "Cursos"
    @topo = "#{Curso.count} Cursos"
	@pagy, @cursos = pagy(Curso.all, items: 35)
  end

  def show
    @title = @curso.nome
  end

  private
  def set_curso
    @curso = Curso.find(params[:id])
  end

  def curso_params
    params.require(:curso).permit(:nome, :urlized)
  end

end
