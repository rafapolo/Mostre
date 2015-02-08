class CursosController < ApplicationController

	def index
	end

  private
  def curso_params
    params.require(:curso).permit(:nome, :urlized)
  end

end
