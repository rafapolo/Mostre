# Be sure to restart your server when you modify this file.

# Your secret key for verifying cookie session data integrity.
# If you change this key, all old sessions will become invalid!
# Make sure the secret is at least 30 characters and all random, 
# no regular words or you'll be exposed to dictionary attacks.
ActionController::Base.session = {
  :key         => '_mostre_session',
  :secret      => 'f46c4a7809dbb257bdf2116db55d2e7e1f3cb5cc81d4760ae7310a7ebbc7ba8e4d41fee10020bad3608fd5e7ac8e634964d760d88f4e9fdacbf667bb3a6fdaf1'
}

# Use the database for sessions instead of the cookie-based default,
# which shouldn't be used to store highly confidential information
# (create the session table with "rake db:sessions:create")
# ActionController::Base.session_store = :active_record_store
