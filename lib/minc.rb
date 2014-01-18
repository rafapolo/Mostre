require "net/http"
require 'colored'

class Minc

  def get_projeto(id)
    projeto = Projeto.find_by_numero(id)
    unless projeto
      puts "==> pegando projeto #{id}...".yellow
      @page = get_page("/salicnet/conDadosBasicosProjeto/conDadosBasicosProjeto.php", "nrprojeto=#{id}")

      if @page.index("registros a exibir")!=nil
        puts "Nada".red
        return 
      end

      # identificação
      num = get_field("Nº Projeto")
      nome = get_field("Nome do Projeto")
      cnpjcpf = get_from_link("CNPJ / CPF")
      #nome_proponente = get_from_link("Proponente")
      # info
      uf = get_field("UF do Projeto")
      area = get_field("Área Cultural")
      segmento = get_field("Segmento")
      processo = get_field("Processo")
      mecanismo = get_field("Mecanismo")
      enquadramento = empty(get_field("Enquadramento"))
      # situação
      situacao_at = to_date(empty(get_field("Dt.Situação")))
      situacao = get_field("Situação")
      providencia = get_field("Providência Tomada")
      sintese = get_sintese
      # valores
      solicitado = to_float(get_field('Solicitado R\$'))
      aprovado = to_float(get_from_link('Aprovado R\$'))
      apoiado = to_float(get_from_link('Apoiado R\$'))
      liberado_at = get_liberado_at

      # pega proponente
      proponente = get_entidade(clean(cnpjcpf))

      projeto = Projeto.create(:proponente_id=>proponente.id, :nome=>nome, :numero=>num, :uf=>uf, :area=>area, :mecanismo=>mecanismo, :enquadramento=>enquadramento,
                               :segmento=>segmento, :processo=>processo, :situacao_at=>situacao_at, :situacao=>situacao, :providencia=>providencia, :sintese=>sintese,
                               :solicitado=>solicitado, :aprovado=>aprovado, :apoiado=>apoiado, :liberado_at=>liberado_at)
      
      
      if projeto.errors.count>0            
        puts projeto.attributes
        puts 'Opz!'.red
        puts projeto.errors.messages
        #binding.pry
      end

      puts "Projeto: #{projeto.nome}".green
      if (apoiado && apoiado>0)
        get_incentivadores(id)
      end
    else
      puts "#{projeto.nome}".yellow
    end
    projeto
  end

  def get_entidade(cnpjcpf)
    entidade = Entidade.find_by_cnpjcpf(cnpjcpf)    

    puts "==> pegando entidade #{cnpjcpf}...".yellow
    @page = get_page("/salicnet/conDadosCadastraisProponente/conDadosCadastraisProponente.php", "nmgp_parms=nmgp_lig_edit_lapis?#?S?@?cgccpf?#?#{cnpjcpf}?@?")

    nome = get_field("Nome")
    responsavel = empty(get_field("Responsável"))
    logradouro = get_field("Logradouro")
    uf = get_field("UF do Proponente")
    cidade = get_field("Cidade")
    cep = get_field("CEP")
    email = get_from_link("Email")

    tel_res = empty(get_field("Residencial"))
    tel_com = empty(get_field("Comercial"))
    tel_cel = empty(get_field("Celular"))
    tel_fax = empty(get_field("Fax"))   

    if (entidade)   
      entidade.update(cidade: cidade, nome: nome, uf: uf)      
    else
      entidade = Entidade.create(:cnpjcpf=>cnpjcpf, :nome=>nome, :responsavel=>responsavel, :logradouro=>logradouro, :uf=>uf, :cidade=>cidade, :cep=>cep, :email=>email, :tel_res=>tel_res, :tel_com=>tel_com, :tel_fax=>tel_fax, :tel_cel=>tel_cel)
    end    
    puts entidade.nome.green
    
    entidade
  end

  def get_recibos(incentivo)      
    num_projeto = incentivo.projeto.numero
    cpfnj = incentivo.entidade.cnpjcpf
    puts "==> pegando recibos de #{cpfnj} em ##{num_projeto}".yellow
    @page = get_page("/salicnet/conListagemDoIncentivo/conListagemDoIncentivo.php?g_cgccpf=#{cpfnj}&g_nrprojeto=#{num_projeto}")      
    linhas = @page.scan(/color="#333333" face="Tahoma, Arial, sans-serif">(\d{2}\/\d{2}\/\d{4}||[\d\.]+,\d{2})<\/font>/mi)

    linhas.size.times do |i|
      next if i % 2 == 1 # pula impares
      data = Date.strptime(linhas[i][0], '%d/%m/%Y')
      valor = linhas[i+1][0]
      if Recibo.create(incentivo_id: incentivo.id, valor: valor, data: data)
        puts "#{data} => #{valor}".blue
      end
    end
    incentivo.update(recibos_count: incentivo.recibos.count)
  end

  def get_incentivadores(num_projeto)
    projeto = Projeto.find_by_numero(num_projeto)
    puts "==> pegando incentivadores ##{num_projeto} | '#{projeto.nome}'".yellow
    @page = get_page('/salicnet/conProjetoESeusIncentivadores/conProjetoESeusIncentivadores.php', "nmgp_parms=nmgp_lig_edit_lapis?#?S?@?g_nrprojeto?#?#{num_projeto}?@?")
    incentivadores = @page.scan(/007ba3">(.*?)<\/font>.*?serif">(.*?)<\/FONT>.*?false;">(.*?)<\/a>/m)
    incentivadores.each do |info|
      entidade = get_entidade(clean(info[0]))        
      i = Incentivo.create(:entidade_id=>entidade.id, :projeto_id=>projeto.id, :valor=>to_float(info[2]))
      info = "#{info[1]} => #{info[2]}"
      puts i.id ? info.red : info.blue
    end
    projeto.update(apoiadores: projeto.incentivos.count)
  end

  private

    # pega página com POST
  def get_page(path, post_data='')
    
    url = 'sistemas.cultura.gov.br'
    http = Net::HTTP.new url # proxy: , nil, '189.112.88.65', 3128
    http.read_timeout = 30

    begin
      resp = http.get path
      headers = {
        'Cookie' => resp.response['set-cookie'],
        'Referer' => url+path,
        'Content-Type' => 'application/x-www-form-urlencoded',
        'User-Agent' => 'Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'
        }
      resp = http.post(path, post_data, headers)
    rescue Exception
      puts 'Error. Trying again...'.red
      sleep 5
      binding.pry
      resp = http.post(path, post_data, headers)
    end

    if resp.code.to_i==200
      page = resp.body.force_encoding("ISO-8859-1")
    else
      puts "getting page: #{resp.code}".red
    end
    page
  end

  # 4 => 000004
  def to_count_str(num)
    "0"*(6-(num.to_s.size))+num.to_s
  end

  # "20.000,00" => 20,000.00
  def to_float(string)
    string.gsub(".", "").gsub(",", ".").to_f if string
  end

  # converto texto em data
  def to_date(string)
    return !string || string.to_s.empty? ? nil : Date.strptime(string, '%d/%m/%Y')
  end

  # limpar cnpj e cpf
  def clean(cpfcnpj)
    cpfcnpj.gsub(/[-.\/]/, "")
  end

  # se texto é vazio deve ir pro banco como nulo 
  def empty(string)
    string == nil || string == "&nbsp;" ? nil : string
  end

  def get_regex(pattern, encoding='ISO-8859-1')
    Regexp.new(pattern.encode(encoding), Regexp::MULTILINE)
  end

  # expressões regulares no HTML - sacada de mestre.
  def get_field(field)
    data = @page.scan get_regex(">#{field}<br /></FONT>.*?serif\">(.*?)</FONT>")
    data[0] && data[0][0] ? data[0][0].to_s[0..65536] : nil
  end

  def get_from_link(field)
    data = @page.scan get_regex(">#{field}<br /></FONT>.*?#007ba3\">(.*?)<\/font>")
    data[0] && data[0][0] ? data[0][0].to_s : nil
  end

  def get_value(field)
    @page.scan get_regex(">#{field} R$<br /></FONT>.*?serif\">(.*?)<\/FONT>")[0][0]
  end

  def get_liberado_at
    data = @page.scan get_regex("movimentar conta bancária em (.*?)</FONT>")
    data[0] && data[0][0] ? to_date(data[0][0].to_s) : nil
  end

  def get_sintese
    data = @page.scan get_regex("Síntese do Projeto</FONT>.*?serif\">(.*?)</FONT>")
    data[0] && data[0][0] ? data[0][0].to_s : nil
  end
end  