namespace :doc do
  namespace :diagram do
    desc "generate models diagram"
    task :models do
      sh "railroad -i -l -a -m -M | dot -Tsvg | sed 's/font-size:14.00/font-size:11.00/g' > doc/models.svg"
    end

    desc "generate controllers diagram"
    task :controllers do
      sh "railroad -i -l -C | neato -Tsvg | sed 's/font-size:14.00/font-size:11.00/g' > doc/controllers.svg"
    end
  end

  desc "generate object graphs of models and controllers"
  task :diagrams => %w(diagram:models diagram:controllers)
end
