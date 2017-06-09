#!/usr/bin/env puma

workers 6
threads 1, 6

app_path = '/home/polo/apps/mostre'
shared_path = "#{app_path}/shared"
directory "#{app_path}/current"

environment 'production'

pidfile "#{shared_path}/puma.pid"
state_path "#{shared_path}/puma.state"
bind "tcp://0.0.0.0:80" #?cert=/etc/letsencrypt/live/mostre.me/cert.pem&key=/etc/letsencrypt/live/mostre.me/privkey.pem"
#activate_control_app

daemonize

# Default to production
rails_env = ENV['RAILS_ENV'] || "production"
environment rails_env

# Logging
stdout_redirect "#{shared_path}/log/puma.stdout.log", "#{shared_path}/log/puma.stderr.log", true

on_worker_boot do
  require "active_record"
  ActiveRecord::Base.connection.disconnect! rescue ActiveRecord::ConnectionNotEstablished
  ActiveRecord::Base.establish_connection(YAML.load_file("#{shared_path}/config/database.yml")[rails_env])
end
