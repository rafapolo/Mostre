class IncentivosController < ApplicationController
  before_action :set_incentivo, only: [:show, :edit, :update, :destroy]

  # GET /incentivos
  def index
    @incentivos = Incentivo.all
  end

  # GET /incentivos/1
  def show
  end

  # GET /incentivos/new
  def new
    @incentivo = Incentivo.new
  end

  # GET /incentivos/1/edit
  def edit
  end

  # POST /incentivos
  def create
    @incentivo = Incentivo.new(incentivo_params)

    if @incentivo.save
      redirect_to @incentivo, notice: 'Incentivo was successfully created.'
    else
      render action: 'new'
    end
  end

  # PATCH/PUT /incentivos/1
  def update
    if @incentivo.update(incentivo_params)
      redirect_to @incentivo, notice: 'Incentivo was successfully updated.'
    else
      render action: 'edit'
    end
  end

  # DELETE /incentivos/1
  def destroy
    @incentivo.destroy
    redirect_to incentivos_url, notice: 'Incentivo was successfully destroyed.'
  end

  private
    # Use callbacks to share common setup or constraints between actions.
    def set_incentivo
      @incentivo = Incentivo.find(params[:id])
    end

    # Only allow a trusted parameter "white list" through.
    def incentivo_params
      params.require(:incentivo).permit(:integer, :integer, :decimal)
    end
end
