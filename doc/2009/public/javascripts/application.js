function urlify(s) {
    s = s.toLowerCase();             // convert to lowercase
    s = s.replace(/[áàãâä]/g, 'a')   // remove 'a' acentuado
    s = s.replace(/[éèêë]/g, 'e')    // remove 'e' acentuado
    s = s.replace(/[íìîï]/g, 'i')    // remove 'i' acentuado
    s = s.replace(/[óòõôö]/g, 'o')   // remove 'o' acentuado
    s = s.replace(/[úùûü]/g, 'u')    // remove 'u' acentuado
    s = s.replace(/[ç]/g, 'c')       // remove 'c' cedilha
    s = s.replace(/[ñ]/g, 'n')       // remove 'n' acentuado
    s = s.replace(/[^-\w\s]/g, '');  // remove unneeded chars
    s = s.replace(/^\s+|\s+$/g, ''); // trim leading/trailing spaces
    s = s.replace(/[-\s]+/g, '-');   // convert spaces to hyphens
    return "http://mostre.me/"+(s);
}