require 'rails_helper'

# db/mostre.py's `_get_or_create_entidade` dedups entidades by `cnpjcpf`
# (raw SQL `SELECT id FROM entidades WHERE cnpjcpf = ?`), not through any
# Rails-level uniqueness validation or index declared in db/schema.rb - the
# lookup index it relies on (`idx_entidades_cnpjcpf`) was added directly via
# raw SQL and never went through a Rails migration, so schema.rb doesn't
# know about it either. These specs pin down the Rails-side half of that
# contract. See plan/diff-schema.md.
RSpec.describe Entidade, type: :model do
  it "can be resolved by cnpjcpf, the same key the live API sync dedups on" do
    found = Entidade.find_by(cnpjcpf: entidades(:proponente).cnpjcpf)
    expect(found).to eq(entidades(:proponente))
  end

  it "returns nil for an unknown cnpjcpf (so the sync knows to create a new row)" do
    expect(Entidade.find_by(cnpjcpf: "00000000000000")).to be_nil
  end

  it "the entidades table has no uniqueness constraint on cnpjcpf in schema.rb" do
    # documents the drift: the live sync's dedup key isn't enforced at the
    # Rails schema level, only informally by the sync script's own lookup.
    indexes = ActiveRecord::Base.connection.indexes(:entidades)
    cnpjcpf_index = indexes.find { |i| i.columns.include?("cnpjcpf") }
    expect(cnpjcpf_index).to be_nil
  end

  it "tolerates a nil estado_id (entidades the live sync couldn't resolve a UF for)" do
    sem_estado = entidades(:proponente_sem_estado)
    expect(sem_estado.estado_id).to be_nil
    expect(sem_estado.estado).to be_nil
  end

  it "a proponente with no estado still belongs to the Entidade.proponentes scope" do
    expect(Entidade.proponentes).to include(entidades(:proponente_sem_estado))
  end

  it "a patrocinador with no estado still belongs to the Entidade.patrocinadores scope" do
    expect(Entidade.patrocinadores).to include(entidades(:patrocinador_sem_estado))
  end
end
