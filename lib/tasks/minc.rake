#encoding: UTF-8
namespace :minc do
  require Rails.root.join('lib', 'crawler', 'minc')

  task :dot => :environment do
    def escape str
      str.gsub('"', '')
    end

    include ApplicationHelper
    include ActionView::Helpers::NumberHelper

    puts "Gerando..."
    incentivos = Incentivo.find_by_sql('select i.*, p.id, p.nome, e.id, e.nome, e.projetos_count, e.projetos_sum from projetos p, entidades e, incentivos i where p.apoiado>0 and p.id=i.projeto_id and e.id=i.entidade_id ')

    File.open('graph2013.dot', 'w') do |g|
      g.puts "digraph G {"
      g.puts 'nodesep = "2.0";'
      g.puts 'ratio = "expand";'
      g.puts 'splines = "true";'
      g.puts 'node[ color  =  "#000000" , style  =  "filled" , penwidth  =  "2" , fillcolor  =  "lightgray"];'
      g.puts 'overlap = "false";'

      incentivos.each do |i|
        financiador = i.entidade
        g.puts "\"e#{financiador.id}\" [label = \"#{escape financiador.nome}\", size = \"#{financiador.incentivos_sum}\", estado = \"#{financiador.estado.sigla}\"];"
        proponente = i.projeto.entidade
        g.puts "\"e#{proponente.id}\" [label = \"#{escape proponente.nome}\" fillcolor = \"#ffeecc\" size = \"#{proponente.projetos_sum}\", estado = \"#{proponente.estado.sigla}\"];"
        g.puts "\"e#{financiador.id}\" -> \"e#{proponente.id}\" [weight = \"#{i.valor.to_i}\", label = \"#{reais (i.valor)}\", labeldistance = \"10\", style = \"bold\", fontcolor = \"#215E21\"];"
      end
      g.puts '}'
      puts "Ok!"
    end

  end

  task :proprietarios => :environment do
    def escape str
      str.gsub('"', '')
    end

    include ApplicationHelper
    include ActionView::Helpers::NumberHelper

    puts "Gerando..."
    ids = '98, 110, 124, 147, 149, 173, 208, 214, 266, 289, 310, 314, 334, 341, 346, 348, 354, 359, 373, 432, 434, 442, 446, 456, 491, 661, 684, 744, 747, 751, 752, 780, 789, 794, 807, 816, 943, 1053, 1068, 1072, 1075, 1113, 1187, 1237, 1372, 1396, 1412, 1545, 1564, 1628, 1674, 1691, 1705, 1708, 1731, 1822, 1875, 1965, 1995, 2024, 2049, 2155, 2175, 2193, 2244, 2255, 2259, 2260, 2264, 2288, 2293, 2386, 2508, 2512, 2565, 2607, 2648, 2689, 2693, 2733, 2775, 2797, 2928, 2942, 2960, 2990, 2996, 3005, 3019, 3024, 3113, 3135, 3140, 3154, 3189, 3243, 3257, 3325, 3507, 3650, 3652, 3692, 3707, 3726, 3850, 3852, 3940, 4330, 4561, 4574, 4596, 4600, 4617, 4621, 4679, 4724, 4931, 5001, 5037, 5043, 5108, 5116, 5129, 5137, 5395, 5406, 5431, 5613, 5624, 5626, 5693, 5740, 5796, 5807, 5850, 5871, 5983, 6006, 6033, 6112, 6143, 6151, 6165, 6211, 6275, 6349, 6517, 6534, 6702, 6749, 6758, 6802, 6813, 6832, 6853, 6892, 6915, 6958, 6970, 6992, 6994, 7071, 7115, 7224, 7232, 7319, 7403, 7412, 7415, 7420, 7495, 7534, 7579, 7679, 7701, 7765, 7796, 7802, 7809, 7974, 8028, 8076, 8099, 8110, 8158, 8191, 8200, 8234, 8411, 8419, 8445, 8608, 8737, 8745, 8854, 9020, 9129, 9173, 9205, 9223, 9229, 9236, 9288, 9335, 9395, 9523, 9576, 9674, 9832, 9886, 9887, 9890, 9900, 10090, 10151, 10186, 10214, 10301, 10304, 10338, 10361, 10568, 10630, 10749, 10766, 10867, 10935, 10967, 11118, 11180, 11185, 11192, 11217, 11337, 11396, 11429, 11508, 11515, 11562, 11673, 11687, 11704, 11722, 11735, 11913, 11926, 12023, 12449, 12457, 12468, 12539, 12555, 12875, 12899, 12917, 12920, 13113, 13120, 13350, 13576, 13651, 13806, 14013, 14019, 14044, 14054, 14140, 14211, 14383, 14407, 14624, 14689, 14709, 14780, 14799, 14934, 14962, 15064, 15213, 15500, 15600, 15898, 15901, 15937, 16327, 16387, 16460, 16631, 16643, 16712, 16714, 16887, 16889, 16999, 17080, 17105, 17217, 17304, 17382, 17640, 17820, 17916, 17988, 18532, 18644, 18818, 19033, 19152, 19192, 19535, 19594, 19707, 19870, 19915, 20684, 21084, 21221, 21307, 21930, 22495, 22533, 22642, 22645, 22651, 22793, 23106, 23186, 23283, 23522, 23574, 23688, 23707, 23710, 23759, 23762, 23778, 24255, 24451, 24594, 24638, 24756, 24759, 24820, 24840, 24873, 24877, 24892, 25418, 25420, 25440, 25459, 25610, 25726, 25744, 25787, 25883, 25887, 26343, 26477, 26614, 26984, 27265, 27614, 27722, 27724, 27746, 27753, 27788, 28054, 28073, 28415, 28541, 29378, 29606, 30094, 30096, 30163, 30223, 30370, 30448, 30764, 30937, 30942, 30956, 31132, 31153, 31160, 31429, 31566, 32018, 32158, 32211, 32383, 32551, 32560, 32671, 32939, 33453, 34391, 34460, 34493, 34585, 35120, 35499, 35618, 35695, 35920, 36339, 36633, 36830, 37049, 37052, 37199, 37209, 37220, 37225, 37228, 37242, 37391, 38083, 38088, 38353, 38619, 38948, 39304, 39609, 39894, 39898, 39911, 40164, 40226, 40267, 40442, 40499, 41459, 41464, 41677, 41679, 41687, 43037, 44516, 44524, 44820, 44850, 45334, 45520, 45629, 45847, 46179, 46998, 47150, 48184, 48297, 48315, 48500, 48521, 49103, 49551, 49716, 49757, 49838, 49914, 52500, 53072, 54719, 54982, 55017, 55020, 55578, 55982, 56063, 56259, 56299, 56301, 56679, 56691, 56777, 56786, 59342, 59766, 60057, 60281, 60357, 60543, 60608, 61290, 61340, 61433, 61434, 61526, 61587, 61588, 61589, 61777, 61823, 62050, 62135, 62509, 62550, 62559, 62759, 63171, 63188, 63310, 63334, 63396, 64162, 64472, 64699, 64718, 64750, 64935, 65047, 65060, 65067, 65072, 65098, 65255, 65257, 65585, 65633, 65792, 66814, 67873, 69143, 69147, 69151, 69154, 70650, 70813, 70831, 70852, 70855, 72577, 72719, 72965, 73019, 73706, 74885, 74932, 75577, 75962, 76222, 76337, 76510, 76879, 77304, 77515, 77518, 77702, 78175, 78193, 78202, 78633, 78691, 79192, 79270, 79445, 79543, 79602, 79950, 79953, 79957, 79962, 80163, 80164, 80644, 80695, 80954, 81221, 81247, 81250, 81303, 81478, 81670, 81689, 81757, 82273, 82439, 82799, 83003, 83311, 83533, 83990, 84365, 84382, 84388, 84405, 84968, 85225, 85389, 86671, 86831, 87016, 87020, 87235, 87993, 88992, 89478, 89766, 91182, 91387, 92051, 92131, 92134, 92137, 92139, 93393, 93737, 94106, 100109, 100137, 100454, 100685, 100691, 100929'

    props = Incentivo.find_by_sql("select * from entidades e, incentivos i where e.id in (#{ids}) and i.entidade_id = e.id")

    File.open('proprietarios.dot', 'w') do |g|
      g.puts "digraph G {"
      g.puts 'nodesep = "2.0";'
      g.puts 'ratio = "expand";'
      g.puts 'splines = "true";'
      g.puts 'node[ color  =  "#000000" , style  =  "filled" , penwidth  =  "2" , fillcolor  =  "lightgray"];'
      g.puts 'overlap = "false";'

      props.each do |i|
        financiador = i.entidade
        g.puts "\"e#{financiador.id}\" [label = \"#{escape financiador.nome}\", size = \"#{financiador.incentivos_sum}\", estado = \"#{financiador.estado.sigla}\"];"
        proponente = i.projeto.entidade
        g.puts "\"e#{proponente.id}\" [label = \"#{escape proponente.nome}\" fillcolor = \"#ffeecc\" size = \"#{proponente.projetos_sum}\", estado = \"#{proponente.estado.sigla}\"];"
        g.puts "\"e#{financiador.id}\" -> \"e#{proponente.id}\" [weight = \"#{i.valor.to_i}\", label = \"#{reais (i.valor)}\", labeldistance = \"10\", style = \"bold\", fontcolor = \"#215E21\"];"
      end
      g.puts '}'
    end
  end

  desc "Crawleia Minc"
  namespace :update do

    desc "Update Entidades"
    task :entidades => :environment do
      minc = Minc.new

      Entidade.where("updated_at < '2014-01-24 12:06:21'").each do |e|
        minc.get_entidade(e.cnpjcpf)
      end
    end

    desc "Pega novos Projetos"
    task :projetos => :environment do
      minc = Minc.new

      puts
      puts "="*70
      puts "\t\t\t- Crawleando MinC -".yellow
      puts "\t\t\t"+Time.new.strftime("%Y-%m-%d %H:%M:%S").yellow
      puts "="*70
      range = 500

      last_numero = Projeto.order(:numero).last.numero.to_i
      last_numero.upto(last_numero+range) do |num|
        minc.get_projeto(num)
      end
    end
  end
end
