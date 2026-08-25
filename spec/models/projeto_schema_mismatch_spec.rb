require 'rails_helper'

# Documents the schema mismatch between the Projeto model (written for the
# old MySQL-dump import) and the shape of rows the live SALIC API sync
# (db/mostre.py) actually produces. See plan/diff-schema.md for the full
# field-by-field breakdown.
RSpec.describe Projeto, type: :model do
  let(:sync_projeto) { projetos(:projeto_sync_api) }

  it "tolerates a nil entidade_id (the live API leaves ~3-4% of projetos unresolved)" do
    expect(sync_projeto.entidade_id).to be_nil
    expect(sync_projeto.entidade).to be_nil
  end

  it "tolerates nil area_id/segmento_id (the live API sends strings, not local FK ids)" do
    expect(sync_projeto.area_id).to be_nil
    expect(sync_projeto.segmento_id).to be_nil
    expect(sync_projeto.area).to be_nil
    expect(sync_projeto.segmento).to be_nil
  end

  it "leaves processo nil for API-synced rows (dead column: the live API has no equivalent field)" do
    expect(sync_projeto.processo).to be_nil
  end

  it "leaves situacao_at nil for API-synced rows (dead column, per diff-schema.md)" do
    expect(sync_projeto.situacao_at).to be_nil
  end

  it "leaves liberado_at nil for API-synced rows (dead column, per diff-schema.md)" do
    expect(sync_projeto.liberado_at).to be_nil
  end

  it "leaves apoiadores nil for API-synced rows, without breaking the #especial-adjacent badge logic" do
    expect(sync_projeto.apoiadores).to be_nil
    # the projetos list badge does `projeto.apoiado > 0 && projeto.apoiadores==0`
    expect(sync_projeto.apoiadores == 0).to be false
  end

  it "stores numero as a string, matching both the legacy dump ids and the live PRONAC ids" do
    expect(sync_projeto.numero).to be_a(String)
    expect(sync_projeto.numero).to eq("266608")
  end

  it "is invalid per the model's own presence validations, despite matching real production data" do
    # entidade_id/area/segmento/processo are all `validates_presence_of` on
    # this model, but the live API sync inserts rows via raw SQL (bypassing
    # ActiveRecord validations) that violate exactly this contract - so the
    # model's validation rules no longer describe what's actually in the
    # projetos table for API-synced rows.
    expect(sync_projeto).not_to be_valid
    expect(sync_projeto.errors[:entidade_id]).not_to be_empty
    expect(sync_projeto.errors[:area]).not_to be_empty
    expect(sync_projeto.errors[:segmento]).not_to be_empty
    expect(sync_projeto.errors[:processo]).not_to be_empty
  end

  it "still exposes to_param (id + urlized slug) for an API-synced projeto" do
    expect(sync_projeto.to_param).to eq("#{sync_projeto.id}-#{sync_projeto.urlized}")
  end

  it "entidades_apoiadoras is empty rather than raising when there is no entidade at all" do
    expect(sync_projeto.entidades_apoiadoras).to eq([])
  end
end
