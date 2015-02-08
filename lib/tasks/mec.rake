#encoding: utf-8

require "base64"

namespace :pega do
  desc "Pega dados do MEC"
  task :mec => :environment do
    @debug = true
    puts ("="*25).yellow
    puts "     = Crawleia MEC =".yellow
    puts ("="*25).yellow

    def get(array, num, padrao=true)
      num-=2 unless padrao
      if array[num]!= nil && text = array[num].text
        text.gsub(/\s+/, ' ').gsub(" ", '').strip
      else
        nil
      end
    end

    def inner_get(match)
      if match[0] && text = match[0][0]
        text.strip
      else
        nil
      end
    end

    def log(*str)
      puts str unless @debug
    end

    def line
      log "="*20
    end

    MEC_URL = 'http://emec.mec.gov.br'

    browser = Mechanize.new
    browser.user_agent_alias = 'Mac Safari'
    log "Listando...".blue
    line
    1.upto(2650) do |p|
      puts "=> Página #{p}...".yellow
        page = browser.post("http://emec.mec.gov.br/emec/nova-index/listar-consulta-avancada/list/300/page/#{p}", {
          "data[CONSULTA_AVANCADA][hid_template]" => "listar-consulta-avancada-ies",
          "data[CONSULTA_AVANCADA][hid_order]" => "ies.co_ies ASC",
          "data[CONSULTA_AVANCADA][rad_buscar_por]" => "IES",
          "data[CONSULTA_AVANCADA][sel_co_situacao_funcionamento_ies]" => "10035",
          "data[CONSULTA_AVANCADA][sel_co_situacao_funcionamento_curso]" => "9"
        })

        page.search('#tbyDados>tr').each do |r|
          cod_mec = r.search("td[1]").text
          log cod_mec
          # Instituição
          nome = r.search("td[2]").text
          log nome
          org = r.search("td[3]").text
          log org
          categoria = r.search("td[4]").text
          log categoria
          line

          # dados mantenedora
          cod_b64 = Base64.encode64(cod_mec).strip
          index_href = "#{MEC_URL}/emec/consulta-ies/index/d96957f455f6405d14c6542552b0f6eb/#{cod_b64}"
          browser.get(index_href) do |pi|
            log ""
            datas = pi.search('td.subline2')
            # mantenedora
            mantenedora = get(datas, 1)
            dm = mantenedora.match /\((\d+)\) (.*)/
            if dm
              pi.encoding = 'iso-8859-1'
              mantenedora_cod_mec = dm[1]
              mantenedora = dm[2]

              padrao = pi.body.index("Representante Legal") ? true : false

              cnpj = get(datas, 3, padrao)
              natureza = get(datas, 5, padrao)
              representante = get(datas, 7, padrao)
              sigla = get(datas, 9, padrao).split("- ").last

              # endereço mantenedora
              endereco = get(datas, 11, padrao)
              num = get(datas, 13, padrao)
              complemento = get(datas, 15, padrao)
              cep = get(datas, 17, padrao)
              bairro = get(datas, 19, padrao)
              municipio = get(datas, 23, padrao)
              uf = get(datas, 25, padrao)
              tel = get(datas, 27, padrao).gsub(" ", "")
              org = get(datas, 31, padrao)
              site = get(datas, 33, padrao)
              emails = get(datas, 35, padrao)

              # salva mantenedora
              log mantenedora_cod_mec, mantenedora, cnpj, natureza, representante
              mant_obj = Mantenedora.where(:cod_mec=>mantenedora_cod_mec, :cnpj=>cnpj, :natureza=>natureza, :representante=>representante).first_or_create
              ap mant_obj if mant_obj.created_at > Time.now - 1.second
              line
              # salva instituição
              log nome, sigla, endereco, num, complemento, cep, bairro, municipio, uf, tel, org, site, emails
              inst_obj = Instituicao.where(cod_mec: cod_mec, mantenedora_id: mant_obj.id, nome: nome, site: site, sigla: sigla, telefone: tel, org: org, emails: emails, categoria: categoria).first_or_create
              ap inst_obj if inst_obj.created_at > Time.now - 1.second
              end_obj  = Endereco.where(endereco: endereco, complemento: complemento, cep: cep, bairro: bairro, numero: num).first_or_create
              estado_obj = Estado.where(sigla: uf).first_or_create
              mun_obj = Cidade.where(nome: municipio, estado_id: estado_obj.id).first_or_create
              end_obj.update(city_id: mun_obj.id)
              inst_obj.update(endereco: end_obj)
              # atos - data de criação
              atos_href = "#{MEC_URL}/emec/consulta-ies/listar-ato-regulatorio/d96957f455f6405d14c6542552b0f6eb/#{cod_b64}"
              browser.get(atos_href) do |pa|
                infos = pa.search('td.subline2')
                publicado = get(infos, 11)
                log publicado
                if publicado && !publicado.empty?
                  liberada_at = Date.strptime(publicado, "%d/%m/%Y")
                  inst_obj.update(liberada_at: liberada_at)
                end
              end
              line

              #cursos
              log "CURSOS"
              line
              cursos_href = "#{MEC_URL}/emec/consulta-ies/listar-curso-agrupado/d96957f455f6405d14c6542552b0f6eb/#{cod_b64}/list/1000"

              browser.get(cursos_href) do |pc|
                pc.encoding = 'iso-8859-1'
                # para cada curso
                cursos_links = []
                pc.search('td.tooltip>a').each do |a_curso|
                  href_curso = MEC_URL + a_curso['href']
                  href_curso.gsub!('consulta-cadastro/detalhamento', 'consulta-curso/listar-curso-desagrupado')
                  href_curso << "/list/1000"
                  cursos_links << href_curso
                end
                cursos_links.uniq.each do |d|
                  browser.get(d) do |info_curso|
                    info_curso.encoding = 'iso-8859-1'
                    info_curso.search("tr.curso").each do |c|
                      last = ''
                      infos = c.search("td.tooltip")
                      cod_mec = get(infos, 0)
                      modalidade = get(infos, 1)
                      grau = get(infos, 2)
                      nome = get(infos, 3)

                      log cod_mec, modalidade, grau, nome
                      curso = Curso.where(nome: nome).first_or_create
                      ap curso if curso.created_at > Time.now - 1.second
                      instz_obj = Institucionalization.where(cod_mec: cod_mec, curso_id: curso.id, modalidade: modalidade, grau: grau, instituicao_id: inst_obj.id).first_or_create
                      # cursos a distância não têm endereço
                      unless modalidade.index('Distância')
                        uf = get(infos, 4)
                        municipio = get(infos, 5).strip
                        title = infos.first.attribute('title').to_s
                        campus = inner_get(title.scan(/\)(.+)BAIRRO/)).split(')').last.strip
                        bairro = inner_get(title.scan(/BAIRRO:(.+). END/))
                        endereco = inner_get(title.scan(/ENDEREÃ§O:(.+)./)).gsub(' , ', ', ')
                        num = inner_get(endereco.scan(/(\d+[.]?\d+)/))
                        end_obj = Endereco.where(endereco: endereco, complemento: campus, bairro: bairro, numero: num.to_i).first_or_create
                        estado_obj = Estado.where(sigla: uf).first_or_create
                        mun_obj = Cidade.where(nome: municipio, estado_id: estado_obj.id).first_or_create
                        end_obj.update(city_id: mun_obj.id)
                        instz_obj.update(endereco: end_obj)
                        line
                        log uf, municipio, campus, bairro, endereco
                      end
                      line

                      # pegar data de criação do curso
                      cod_b64 = Base64.encode64(cod_mec).strip
                      mais_href = "#{MEC_URL}/emec/consulta-curso/detalhe-curso-tabela/c1999930082674af6577f0c513f05a96/#{cod_b64}"
                      browser.get(mais_href) do |detalhe_curso|
                        dados = detalhe_curso.search("td.subline2")
                        data = get(dados, 5)
                        log data
                        if data && !data.empty?
                          liberado_at = Date.strptime(data, "%d/%m/%Y")
                          instz_obj.update(liberado_at: liberado_at)
                        end
                      end
                    line
                  end
                end
              end
            end
            else
              # sem mantenedora e outros dados
              unless inst_obj = Instituicao.where(cod_mec: cod_mec).take
                PATTERN = /.* \((\w+)\)/ # abreviation
                abreviation = nome.scan(PATTERN).empty? ? nil : nome.match(PATTERN)[1]
                puts "Salvando... #{cod_mec} | #{abreviation} | #{nome} | #{org} | #{categoria}"
                inst_obj = Instituicao.create!(cod_mec: cod_mec, nome: nome, abreviation: abreviation, org: org, categoria: categoria)
              end
            end
          end
      end
    end
  end
end
