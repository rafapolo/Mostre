require 'rails_helper'

RSpec.describe Incentivo, type: :model do
  it 'is valid with projeto, entidade and valor' do
    expect(incentivos(:incentivo_um)).to be_valid
  end

  it 'has many recibos' do
    expect(incentivos(:incentivo_dois).recibos.count).to eq(2)
  end

  # ~8% dos incentivos importados apontam para um projeto_id que não
  # existe mais na tabela projetos. O modelo não deve levantar exceção
  # ao acessar a associação — as views são responsáveis por checar
  # presença antes de usar `.projeto`.
  it 'tolerates a dangling projeto_id (real-world edge case)' do
    orfao = incentivos(:incentivo_orfao)
    expect(orfao.projeto_id).to eq(999999)
    expect(orfao.projeto).to be_nil
  end
end
