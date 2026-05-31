class CursosController < ApplicationController
  layout "educacao"

  def index
    @title = "Cursos"
    @topo = "#{Curso.count} Cursos"
	@pagy, @cursos = pagy(Curso.all, items: 35)
  end

  private
  def curso_params
    params.require(:curso).permit(:nome, :urlized)
  end

end
