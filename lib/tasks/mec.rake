#encoding: utf-8

require "base64"

namespace :pega do
  desc "Pega dados do MEC"
  task :mec => :environment do

    MEC_URL = 'http://emec.mec.gov.br'

    puts ("="*50).yellow
    puts "\t\t = Crawleia MEC =".yellow
    puts ("="*50).yellow

    browser = Mechanize.new
    browser.read_timeout = 3
    browser.history.max_size = 0
    browser.user_agent_alias = 'Mac Safari'
    #browser.set_proxy('46.183.102.163 ', '8081')

    def filtra(array, num, padrao=true)
      num -= 2 unless padrao
      (array[num]!= nil && text = array[num].text) ? text.gsub(/\s+/, ' ').gsub(" ", '').strip : nil
    end

    def limpa(match)
      (match[0] && text = match[0][0]) ? text.strip : nil
    end

    # listagem geral em pages
    (1..9).each do |i|
      puts "=> ##{i}...".yellow
      page = browser.post("http://emec.mec.gov.br/emec/nova-index/listar-consulta-avancada/list/300/page/#{i}", {
        "data[CONSULTA_AVANCADA][hid_template]" => "listar-consulta-avancada-ies",
        "data[CONSULTA_AVANCADA][hid_order]" => "ies.co_ies ASC",
        "data[CONSULTA_AVANCADA][rad_buscar_por]" => "IES",
        "data[CONSULTA_AVANCADA][sel_co_situacao_funcionamento_ies]" => "10035",
        "data[CONSULTA_AVANCADA][sel_co_situacao_funcionamento_curso]" => "9"
      })

      page.search('#tbyDados>tr').each do |r|
        cod_mec = r.search("td[1]").text
        # Instituição
        nome = r.search("td[2]").text
        org = r.search("td[3]").text
        categoria = r.search("td[4]").text

        cod_b64 = Base64.encode64(cod_mec).strip
        index_href = "#{MEC_URL}/emec/consulta-ies/index/d96957f455f6405d14c6542552b0f6eb/#{cod_b64}"
        browser.get(index_href) do |pi|
          dados = pi.search('td.subline2')
          # Mantenedora
          mantenedora = filtra(dados, 1)
          if dm = mantenedora.match(/\((\d+)\) (.*)/)
            pi.encoding = 'iso-8859-1'
            mantenedora_cod_mec = dm[1]
            mantenedora = dm[2]
            padrao = pi.body.index("Representante Legal") ? true : false
            cnpj = filtra(dados, 3, padrao)
            natureza = filtra(dados, 5, padrao)
            representante = filtra(dados, 7, padrao)
            sigla = filtra(dados, 9, padrao).split("- ").last
            # endereço
            endereco = filtra(dados, 11, padrao)
            num = filtra(dados, 13, padrao)
            complemento = filtra(dados, 15, padrao)
            cep = filtra(dados, 17, padrao)
            bairro = filtra(dados, 19, padrao)
            municipio = filtra(dados, 23, padrao)
            uf = filtra(dados, 25, padrao)
            tel = filtra(dados, 27, padrao).gsub(" ", "")
            org = filtra(dados, 31, padrao)
            site = filtra(dados, 33, padrao)
            emails = filtra(dados, 35, padrao)
            mant_obj = Mantenedora.where(:cod_mec=>mantenedora_cod_mec, :cnpj=>cnpj, :natureza=>natureza, :representante=>representante).first_or_create
            ap mant_obj

            # Instituição
            inst_obj = Instituicao.where(cod_mec: cod_mec, mantenedora_id: mant_obj.id, nome: nome, site: site, sigla: sigla, telefone: tel, org: org, emails: emails, categoria: categoria).first_or_create
            ap inst_obj
            end_obj  = Endereco.where(endereco: endereco, complemento: complemento, cep: cep, bairro: bairro, numero: num).first_or_create
            estado_obj = Estado.where(sigla: uf).first_or_create
            mun_obj = Cidade.where(nome: municipio, estado_id: estado_obj.id).first_or_create
            end_obj.update(city_id: mun_obj.id)
            inst_obj.update(endereco: end_obj)
            # get liberada_at | data de criação
            atos_href = "#{MEC_URL}/emec/consulta-ies/listar-ato-regulatorio/d96957f455f6405d14c6542552b0f6eb/#{cod_b64}"
            browser.get(atos_href) do |pa|
              dados = pa.search('td.subline2')
              publicado = filtra(dados, 11)
              if publicado && !publicado.empty?
                liberada_at = Date.strptime(publicado, "%d/%m/%Y")
                inst_obj.update(liberada_at: liberada_at)
              end
            end

            cursos_href = "#{MEC_URL}/emec/consulta-ies/listar-curso-agrupado/d96957f455f6405d14c6542552b0f6eb/#{cod_b64}/list/1000"
            browser.get(cursos_href) do |pc|
              pc.encoding = 'iso-8859-1'
              # Curso
              cursos_hrefs = []
              cursos_links = pc.search('td.tooltip>a')
              cursos_count = cursos_links.count
              puts "=> #{cursos_count} Cursos em #{nome} em #{municipio} - #{uf}".blue
              # só re-crawleia com 0 instituições
              if cursos_count == 0
                puts "=> #{inst_obj.institucionalizations.count} insts".blue
                cursos_links.each do |a_curso|
                  href_curso = MEC_URL + a_curso['href']
                  href_curso.gsub!('consulta-cadastro/detalhamento', 'consulta-curso/listar-curso-desagrupado')
                  href_curso << "/list/1000"
                  cursos_hrefs << href_curso
                end
                cursos_hrefs.uniq.each do |d|
                  browser.get(d) do |info_curso|
                    info_curso.encoding = 'iso-8859-1'
                    info_curso.search("tr.curso").each do |c|
                      last = ''
                      dados = c.search("td.tooltip")
                      cod_mec = filtra(dados, 0)
                      modalidade = filtra(dados, 1)
                      grau = filtra(dados, 2)
                      nome = filtra(dados, 3)
                      curso = Curso.where(nome: nome).first_or_create
                      ap curso
                      instz_obj = Institucionalization.where(cod_mec: cod_mec, curso_id: curso.id, modalidade: modalidade, grau: grau, instituicao_id: inst_obj.id).first_or_create
                      # Curso a distância não têm endereço; Claro!
                      unless modalidade.index('Distância')
                        uf = filtra(dados, 4)
                        municipio = filtra(dados, 5).strip
                        title = dados.first.attribute('title').to_s
                        campus = limpa(title.scan(/\)(.+)BAIRRO/)).split(')').last.strip
                        bairro = limpa(title.scan(/BAIRRO:(.+). END/))
                        endereco = limpa(title.scan(/ENDEREÃ§O:(.+)./)).gsub(' , ', ', ')
                        num = limpa(endereco.scan(/(\d+[.]?\d+)/))
                        end_obj = Endereco.where(endereco: endereco, complemento: campus, bairro: bairro, numero: num.to_i).first_or_create
                        estado_obj = Estado.where(sigla: uf).first_or_create
                        mun_obj = Cidade.where(nome: municipio, estado_id: estado_obj.id).first_or_create
                        end_obj.update(city_id: mun_obj.id)
                        instz_obj.update(endereco: end_obj)
                      end
                      # get liberada_at | data de criação do curso
                      cod_b64 = Base64.encode64(cod_mec).strip
                      mais_href = "#{MEC_URL}/emec/consulta-curso/detalhe-curso-tabela/c1999930082674af6577f0c513f05a96/#{cod_b64}"
                      browser.get(mais_href) do |detalhe_curso|
                        dados = detalhe_curso.search("td.subline2")
                        data = filtra(dados, 5)
                        if data && !data.empty?
                          liberado_at = Date.strptime(data, "%d/%m/%Y")
                          instz_obj.update(liberado_at: liberado_at)
                        end
                      end
                    end
                  end
                end
              end
            end
          else
            # Instituicao sem Mantenedora
            unless inst_obj = Instituicao.where(cod_mec: cod_mec).take
              PATTERN = /.* \((\w+)\)/ # sigla
              abreviation = nome.scan(PATTERN).empty? ? nil : nome.match(PATTERN)[1]
              puts "Criando Instituição sem Mantenedora | #{nome}".red
              inst_obj = Instituicao.create!(cod_mec: cod_mec, nome: nome, abreviation: abreviation, org: org, categoria: categoria)
            end
          end
        end
      end
    end
  end
end
