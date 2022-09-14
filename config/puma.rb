#!/usr/bin/env puma

workers 6
threads 1, 6

# # Default to production
rails_env = ENV['RAILS_ENV'] || "production"
environment rails_env

app_path = Rails.root
if ENV['RAILS_ENV'] == "production"
  app_path
  app_path = '/home/polo/apps/mostre'
  pidfile "#{app_path}/puma.pid"
  state_path "#{app_path}/puma.state"
  app_path += "/shared"
# bind "tcp://0.0.0.0:80" #?cert=/etc/letsencrypt/live/mostre.me/cert.pem&key=/etc/letsencrypt/live/mostre.me/privkey.pem"
# #activate_control_app
end

# # Logging
# stdout_redirect "#{app}/shared/log/puma.stdout.log", "#{shared_path}/log/puma.stderr.log", true
require 'erb'

on_worker_boot do
  require "active_record"
  ActiveRecord::Base.connection.disconnect! rescue ActiveRecord::ConnectionNotEstablished
  YAML.load(ERB.new(File.read("./config/database.yml")).result)[rails_env]
end
