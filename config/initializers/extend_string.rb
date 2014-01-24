class String

    def clean_extra_spaces
        self.encode.strip.gsub(/\s+/, ' ')
    end
 
    def urlize
        copy = self.dup.downcase.clean_extra_spaces
        accents = { ['á','à','â','ä','ã','Ã','Ä','Â','À'] => 'a',
                    ['é','è','ê','ë','Ë','É','È','Ê','&'] => 'e',
                    ['í','ì','î','ï','I','Î','Ì'] => 'i',
                    ['ó','ò','ô','ö','õ','Õ','Ö','Ô','Ò'] => 'o',
                    ['œ'] => 'oe',
                    ['ß'] => 'ss',
                    [' ', '.', '–', '_'] => '-',
                    ['ç'] => 'c',
                    ['ú','ù','û','ü','U','Û','Ù'] => 'u',
                    ['!',',',':','?',';','(',')','/', '\'', '"'] => ''
        }
        accents.each do |ac,rep|
          ac.each do |s|
            copy.gsub!(s, rep)
          end
        end
        copy.gsub(/[-]+/, '-')
    end

   # PeDrO DA CosTa => Pedro da Costa
    def normalize
        self.clean_extra_spaces.split.map{|w| w.size>2 ? w.capitalize : w.downcase}.join(' ')
    end

end