namespace :mostre do
  desc "Carrega CSVs.gz no SQLite do Rails"
  task load: :environment do
    system "python3", "db/import_csv.py"
  end
end
