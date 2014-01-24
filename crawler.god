God.watch do |w|
  w.name = "crawler"
  w.dir = "/home/git/apps/current"
  w.log = "log/god.log"
  w.start = "bundle exec rake minc:update:entidades RAILS_ENV=production"
  w.keepalive(:memory_max => 200.megabytes)
  w.interval = 10.seconds
end