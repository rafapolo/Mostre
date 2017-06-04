class Comite < ActiveRecord::Base
  has_many :doacoes
  has_many :doadores, :through => :doacoes

  PARTIDOS = %w[DEM NOVO PAN PCdoB PCB PCO PDT PEN PFL PGT PHS PL PMB PMDB PMN PP PPB PPL PPS PR PRB PRONA PROS PRP PRTB PSB PSC PSD PSDB PSDC PSL PSOL PST PSTU PT PTdoB PTB PTC PTN PV REDE SD]
end
