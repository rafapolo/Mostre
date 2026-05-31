class String
  def urlize
    parameterize
  end

  def clean_extra_spaces
    gsub(/\s+/, " ").strip
  end

  def normalize
    ActiveSupport::Inflector.transliterate(self).gsub(/[^a-zA-Z\s]/, "").strip
  end
end
