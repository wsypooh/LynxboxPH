// Philippine provinces and cities/municipalities, sourced from the PSGC (Philippine
// Standard Geographic Code) via the 'ph-locations' npm package's bundled dataset (MIT,
// https://github.com/hyubs/ph-locations) — copied in directly rather than kept as a
// runtime dependency, consistent with this repo's preference for self-contained data
// over small utility packages (see TenantContract.id / crypto.randomUUID() in CLAUDE.md).
// A handful of municipality names carry minor punctuation quirks from the source data
// (e.g. missing hyphens) — cosmetic only, not a correctness issue for selection/matching.

export interface PhCity {
  name: string;
  province: string;
}

export const PH_PROVINCES: string[] = [
  "Abra",
  "Agusan Del Norte",
  "Agusan Del Sur",
  "Aklan",
  "Albay",
  "Antique",
  "Apayao",
  "Aurora",
  "Basilan",
  "Bataan",
  "Batanes",
  "Batangas",
  "Benguet",
  "Biliran",
  "Bohol",
  "Bukidnon",
  "Bulacan",
  "Cagayan",
  "Camarines Norte",
  "Camarines Sur",
  "Camiguin",
  "Capiz",
  "Catanduanes",
  "Cavite",
  "Cebu",
  "Cotabato",
  "Davao De Oro",
  "Davao Del Norte",
  "Davao Del Sur",
  "Davao Occidental",
  "Davao Oriental",
  "Dinagat Islands",
  "Eastern Samar",
  "Guimaras",
  "Ifugao",
  "Ilocos Norte",
  "Ilocos Sur",
  "Iloilo",
  "Isabela",
  "Kalinga",
  "La Union",
  "Laguna",
  "Lanao Del Norte",
  "Lanao Del Sur",
  "Leyte",
  "Maguindanao",
  "Marinduque",
  "Masbate",
  "Metro Manila",
  "Misamis Occidental",
  "Misamis Oriental",
  "Mountain Province",
  "Negros Occidental",
  "Negros Oriental",
  "Northern Samar",
  "Nueva Ecija",
  "Nueva Vizcaya",
  "Occidental Mindoro",
  "Oriental Mindoro",
  "Palawan",
  "Pampanga",
  "Pangasinan",
  "Quezon",
  "Quirino",
  "Rizal",
  "Romblon",
  "Samar",
  "Sarangani",
  "Siquijor",
  "Sorsogon",
  "South Cotabato",
  "Southern Leyte",
  "Sultan Kudarat",
  "Sulu",
  "Surigao Del Norte",
  "Surigao Del Sur",
  "Tarlac",
  "Tawi Tawi",
  "Zambales",
  "Zamboanga Del Norte",
  "Zamboanga Del Sur",
  "Zamboanga Sibugay"
];

export const PH_CITIES: PhCity[] = [
  {
    "name": "Bangued",
    "province": "Abra"
  },
  {
    "name": "Boliney",
    "province": "Abra"
  },
  {
    "name": "Bucay",
    "province": "Abra"
  },
  {
    "name": "Bucloc",
    "province": "Abra"
  },
  {
    "name": "Daguioman",
    "province": "Abra"
  },
  {
    "name": "Danglas",
    "province": "Abra"
  },
  {
    "name": "Dolores",
    "province": "Abra"
  },
  {
    "name": "La Paz",
    "province": "Abra"
  },
  {
    "name": "Lacub",
    "province": "Abra"
  },
  {
    "name": "Lagangilang",
    "province": "Abra"
  },
  {
    "name": "Lagayan",
    "province": "Abra"
  },
  {
    "name": "Langiden",
    "province": "Abra"
  },
  {
    "name": "Licuan Baay",
    "province": "Abra"
  },
  {
    "name": "Luba",
    "province": "Abra"
  },
  {
    "name": "Malibcong",
    "province": "Abra"
  },
  {
    "name": "Manabo",
    "province": "Abra"
  },
  {
    "name": "Peñarrubia",
    "province": "Abra"
  },
  {
    "name": "Pidigan",
    "province": "Abra"
  },
  {
    "name": "Pilar",
    "province": "Abra"
  },
  {
    "name": "Sallapadan",
    "province": "Abra"
  },
  {
    "name": "San Isidro",
    "province": "Abra"
  },
  {
    "name": "San Juan",
    "province": "Abra"
  },
  {
    "name": "San Quintin",
    "province": "Abra"
  },
  {
    "name": "Tayum",
    "province": "Abra"
  },
  {
    "name": "Tineg",
    "province": "Abra"
  },
  {
    "name": "Tubo",
    "province": "Abra"
  },
  {
    "name": "Villaviciosa",
    "province": "Abra"
  },
  {
    "name": "Buenavista",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Butuan City",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Cabadbaran City",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Carmen",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Jabonga",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Kitcharao",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Las Nieves",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Magallanes",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Nasipit",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Remedios T Romualdez",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Santiago",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Tubay",
    "province": "Agusan Del Norte"
  },
  {
    "name": "Bayugan City",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Bunawan",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Esperanza",
    "province": "Agusan Del Sur"
  },
  {
    "name": "La Paz",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Loreto",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Prosperidad",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Rosario",
    "province": "Agusan Del Sur"
  },
  {
    "name": "San Francisco",
    "province": "Agusan Del Sur"
  },
  {
    "name": "San Luis",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Santa Josefa",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Sibagat",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Talacogon",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Trento",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Veruela",
    "province": "Agusan Del Sur"
  },
  {
    "name": "Altavas",
    "province": "Aklan"
  },
  {
    "name": "Balete",
    "province": "Aklan"
  },
  {
    "name": "Banga",
    "province": "Aklan"
  },
  {
    "name": "Batan",
    "province": "Aklan"
  },
  {
    "name": "Buruanga",
    "province": "Aklan"
  },
  {
    "name": "Ibajay",
    "province": "Aklan"
  },
  {
    "name": "Kalibo",
    "province": "Aklan"
  },
  {
    "name": "Lezo",
    "province": "Aklan"
  },
  {
    "name": "Libacao",
    "province": "Aklan"
  },
  {
    "name": "Madalag",
    "province": "Aklan"
  },
  {
    "name": "Makato",
    "province": "Aklan"
  },
  {
    "name": "Malay",
    "province": "Aklan"
  },
  {
    "name": "Malinao",
    "province": "Aklan"
  },
  {
    "name": "Nabas",
    "province": "Aklan"
  },
  {
    "name": "New Washington",
    "province": "Aklan"
  },
  {
    "name": "Numancia",
    "province": "Aklan"
  },
  {
    "name": "Tangalan",
    "province": "Aklan"
  },
  {
    "name": "Bacacay",
    "province": "Albay"
  },
  {
    "name": "Camalig",
    "province": "Albay"
  },
  {
    "name": "Daraga",
    "province": "Albay"
  },
  {
    "name": "Guinobatan",
    "province": "Albay"
  },
  {
    "name": "Jovellar",
    "province": "Albay"
  },
  {
    "name": "Legazpi City",
    "province": "Albay"
  },
  {
    "name": "Libon",
    "province": "Albay"
  },
  {
    "name": "Ligao City",
    "province": "Albay"
  },
  {
    "name": "Malilipot",
    "province": "Albay"
  },
  {
    "name": "Malinao",
    "province": "Albay"
  },
  {
    "name": "Manito",
    "province": "Albay"
  },
  {
    "name": "Oas",
    "province": "Albay"
  },
  {
    "name": "Pio Duran",
    "province": "Albay"
  },
  {
    "name": "Polangui",
    "province": "Albay"
  },
  {
    "name": "Rapu Rapu",
    "province": "Albay"
  },
  {
    "name": "Santo Domingo",
    "province": "Albay"
  },
  {
    "name": "Tabaco City",
    "province": "Albay"
  },
  {
    "name": "Tiwi",
    "province": "Albay"
  },
  {
    "name": "Anini Y",
    "province": "Antique"
  },
  {
    "name": "Barbaza",
    "province": "Antique"
  },
  {
    "name": "Belison",
    "province": "Antique"
  },
  {
    "name": "Bugasong",
    "province": "Antique"
  },
  {
    "name": "Caluya",
    "province": "Antique"
  },
  {
    "name": "Culasi",
    "province": "Antique"
  },
  {
    "name": "Hamtic",
    "province": "Antique"
  },
  {
    "name": "Laua An",
    "province": "Antique"
  },
  {
    "name": "Libertad",
    "province": "Antique"
  },
  {
    "name": "Pandan",
    "province": "Antique"
  },
  {
    "name": "Patnongon",
    "province": "Antique"
  },
  {
    "name": "San Jose",
    "province": "Antique"
  },
  {
    "name": "San Remigio",
    "province": "Antique"
  },
  {
    "name": "Sebaste",
    "province": "Antique"
  },
  {
    "name": "Sibalom",
    "province": "Antique"
  },
  {
    "name": "Tibiao",
    "province": "Antique"
  },
  {
    "name": "Tobias Fornier",
    "province": "Antique"
  },
  {
    "name": "Valderrama",
    "province": "Antique"
  },
  {
    "name": "Calanasan",
    "province": "Apayao"
  },
  {
    "name": "Conner",
    "province": "Apayao"
  },
  {
    "name": "Flora",
    "province": "Apayao"
  },
  {
    "name": "Kabugao",
    "province": "Apayao"
  },
  {
    "name": "Luna",
    "province": "Apayao"
  },
  {
    "name": "Pudtol",
    "province": "Apayao"
  },
  {
    "name": "Santa Marcela",
    "province": "Apayao"
  },
  {
    "name": "Baler",
    "province": "Aurora"
  },
  {
    "name": "Casiguran",
    "province": "Aurora"
  },
  {
    "name": "Dilasag",
    "province": "Aurora"
  },
  {
    "name": "Dinalungan",
    "province": "Aurora"
  },
  {
    "name": "Dingalan",
    "province": "Aurora"
  },
  {
    "name": "Dipaculao",
    "province": "Aurora"
  },
  {
    "name": "Maria Aurora",
    "province": "Aurora"
  },
  {
    "name": "San Luis",
    "province": "Aurora"
  },
  {
    "name": "Akbar",
    "province": "Basilan"
  },
  {
    "name": "Al Barka",
    "province": "Basilan"
  },
  {
    "name": "Hadji Mohammad Ajul",
    "province": "Basilan"
  },
  {
    "name": "Hadji Muhtamad",
    "province": "Basilan"
  },
  {
    "name": "Lamitan City",
    "province": "Basilan"
  },
  {
    "name": "Lantawan",
    "province": "Basilan"
  },
  {
    "name": "Maluso",
    "province": "Basilan"
  },
  {
    "name": "Sumisip",
    "province": "Basilan"
  },
  {
    "name": "Tabuan Lasa",
    "province": "Basilan"
  },
  {
    "name": "Tipo Tipo",
    "province": "Basilan"
  },
  {
    "name": "Tuburan",
    "province": "Basilan"
  },
  {
    "name": "Ungkaya Pukan",
    "province": "Basilan"
  },
  {
    "name": "Abucay",
    "province": "Bataan"
  },
  {
    "name": "Bagac",
    "province": "Bataan"
  },
  {
    "name": "Balanga City",
    "province": "Bataan"
  },
  {
    "name": "Dinalupihan",
    "province": "Bataan"
  },
  {
    "name": "Hermosa",
    "province": "Bataan"
  },
  {
    "name": "Limay",
    "province": "Bataan"
  },
  {
    "name": "Mariveles",
    "province": "Bataan"
  },
  {
    "name": "Morong",
    "province": "Bataan"
  },
  {
    "name": "Orani",
    "province": "Bataan"
  },
  {
    "name": "Orion",
    "province": "Bataan"
  },
  {
    "name": "Pilar",
    "province": "Bataan"
  },
  {
    "name": "Samal",
    "province": "Bataan"
  },
  {
    "name": "Basco",
    "province": "Batanes"
  },
  {
    "name": "Itbayat",
    "province": "Batanes"
  },
  {
    "name": "Ivana",
    "province": "Batanes"
  },
  {
    "name": "Mahatao",
    "province": "Batanes"
  },
  {
    "name": "Sabtang",
    "province": "Batanes"
  },
  {
    "name": "Uyugan",
    "province": "Batanes"
  },
  {
    "name": "Agoncillo",
    "province": "Batangas"
  },
  {
    "name": "Alitagtag",
    "province": "Batangas"
  },
  {
    "name": "Balayan",
    "province": "Batangas"
  },
  {
    "name": "Balete",
    "province": "Batangas"
  },
  {
    "name": "Batangas City",
    "province": "Batangas"
  },
  {
    "name": "Bauan",
    "province": "Batangas"
  },
  {
    "name": "Calaca",
    "province": "Batangas"
  },
  {
    "name": "Calatagan",
    "province": "Batangas"
  },
  {
    "name": "Cuenca",
    "province": "Batangas"
  },
  {
    "name": "Ibaan",
    "province": "Batangas"
  },
  {
    "name": "Laurel",
    "province": "Batangas"
  },
  {
    "name": "Lemery",
    "province": "Batangas"
  },
  {
    "name": "Lian",
    "province": "Batangas"
  },
  {
    "name": "Lipa City",
    "province": "Batangas"
  },
  {
    "name": "Lobo",
    "province": "Batangas"
  },
  {
    "name": "Mabini",
    "province": "Batangas"
  },
  {
    "name": "Malvar",
    "province": "Batangas"
  },
  {
    "name": "Mataasnakahoy",
    "province": "Batangas"
  },
  {
    "name": "Nasugbu",
    "province": "Batangas"
  },
  {
    "name": "Padre Garcia",
    "province": "Batangas"
  },
  {
    "name": "Rosario",
    "province": "Batangas"
  },
  {
    "name": "San Jose",
    "province": "Batangas"
  },
  {
    "name": "San Juan",
    "province": "Batangas"
  },
  {
    "name": "San Luis",
    "province": "Batangas"
  },
  {
    "name": "San Nicolas",
    "province": "Batangas"
  },
  {
    "name": "San Pascual",
    "province": "Batangas"
  },
  {
    "name": "Santa Teresita",
    "province": "Batangas"
  },
  {
    "name": "Sto Tomas City",
    "province": "Batangas"
  },
  {
    "name": "Taal",
    "province": "Batangas"
  },
  {
    "name": "Talisay",
    "province": "Batangas"
  },
  {
    "name": "Tanauan City",
    "province": "Batangas"
  },
  {
    "name": "Taysan",
    "province": "Batangas"
  },
  {
    "name": "Tingloy",
    "province": "Batangas"
  },
  {
    "name": "Tuy",
    "province": "Batangas"
  },
  {
    "name": "Atok",
    "province": "Benguet"
  },
  {
    "name": "Baguio City",
    "province": "Benguet"
  },
  {
    "name": "Bakun",
    "province": "Benguet"
  },
  {
    "name": "Bokod",
    "province": "Benguet"
  },
  {
    "name": "Buguias",
    "province": "Benguet"
  },
  {
    "name": "Itogon",
    "province": "Benguet"
  },
  {
    "name": "Kabayan",
    "province": "Benguet"
  },
  {
    "name": "Kapangan",
    "province": "Benguet"
  },
  {
    "name": "Kibungan",
    "province": "Benguet"
  },
  {
    "name": "La Trinidad",
    "province": "Benguet"
  },
  {
    "name": "Mankayan",
    "province": "Benguet"
  },
  {
    "name": "Sablan",
    "province": "Benguet"
  },
  {
    "name": "Tuba",
    "province": "Benguet"
  },
  {
    "name": "Tublay",
    "province": "Benguet"
  },
  {
    "name": "Almeria",
    "province": "Biliran"
  },
  {
    "name": "Biliran",
    "province": "Biliran"
  },
  {
    "name": "Cabucgayan",
    "province": "Biliran"
  },
  {
    "name": "Caibiran",
    "province": "Biliran"
  },
  {
    "name": "Culaba",
    "province": "Biliran"
  },
  {
    "name": "Kawayan",
    "province": "Biliran"
  },
  {
    "name": "Maripipi",
    "province": "Biliran"
  },
  {
    "name": "Naval",
    "province": "Biliran"
  },
  {
    "name": "Alburquerque",
    "province": "Bohol"
  },
  {
    "name": "Alicia",
    "province": "Bohol"
  },
  {
    "name": "Anda",
    "province": "Bohol"
  },
  {
    "name": "Antequera",
    "province": "Bohol"
  },
  {
    "name": "Baclayon",
    "province": "Bohol"
  },
  {
    "name": "Balilihan",
    "province": "Bohol"
  },
  {
    "name": "Batuan",
    "province": "Bohol"
  },
  {
    "name": "Bien Unido",
    "province": "Bohol"
  },
  {
    "name": "Bilar",
    "province": "Bohol"
  },
  {
    "name": "Buenavista",
    "province": "Bohol"
  },
  {
    "name": "Calape",
    "province": "Bohol"
  },
  {
    "name": "Candijay",
    "province": "Bohol"
  },
  {
    "name": "Carmen",
    "province": "Bohol"
  },
  {
    "name": "Catigbian",
    "province": "Bohol"
  },
  {
    "name": "Clarin",
    "province": "Bohol"
  },
  {
    "name": "Corella",
    "province": "Bohol"
  },
  {
    "name": "Cortes",
    "province": "Bohol"
  },
  {
    "name": "Dagohoy",
    "province": "Bohol"
  },
  {
    "name": "Danao",
    "province": "Bohol"
  },
  {
    "name": "Dauis",
    "province": "Bohol"
  },
  {
    "name": "Dimiao",
    "province": "Bohol"
  },
  {
    "name": "Duero",
    "province": "Bohol"
  },
  {
    "name": "Garcia Hernandez",
    "province": "Bohol"
  },
  {
    "name": "Getafe",
    "province": "Bohol"
  },
  {
    "name": "Guindulman",
    "province": "Bohol"
  },
  {
    "name": "Inabanga",
    "province": "Bohol"
  },
  {
    "name": "Jagna",
    "province": "Bohol"
  },
  {
    "name": "Lila",
    "province": "Bohol"
  },
  {
    "name": "Loay",
    "province": "Bohol"
  },
  {
    "name": "Loboc",
    "province": "Bohol"
  },
  {
    "name": "Loon",
    "province": "Bohol"
  },
  {
    "name": "Mabini",
    "province": "Bohol"
  },
  {
    "name": "Maribojoc",
    "province": "Bohol"
  },
  {
    "name": "Panglao",
    "province": "Bohol"
  },
  {
    "name": "Pilar",
    "province": "Bohol"
  },
  {
    "name": "Pres Carlos P Garcia",
    "province": "Bohol"
  },
  {
    "name": "Sagbayan",
    "province": "Bohol"
  },
  {
    "name": "San Isidro",
    "province": "Bohol"
  },
  {
    "name": "San Miguel",
    "province": "Bohol"
  },
  {
    "name": "Sevilla",
    "province": "Bohol"
  },
  {
    "name": "Sierra Bullones",
    "province": "Bohol"
  },
  {
    "name": "Sikatuna",
    "province": "Bohol"
  },
  {
    "name": "Tagbilaran City",
    "province": "Bohol"
  },
  {
    "name": "Talibon",
    "province": "Bohol"
  },
  {
    "name": "Trinidad",
    "province": "Bohol"
  },
  {
    "name": "Tubigon",
    "province": "Bohol"
  },
  {
    "name": "Ubay",
    "province": "Bohol"
  },
  {
    "name": "Valencia",
    "province": "Bohol"
  },
  {
    "name": "Baungon",
    "province": "Bukidnon"
  },
  {
    "name": "Cabanglasan",
    "province": "Bukidnon"
  },
  {
    "name": "Damulog",
    "province": "Bukidnon"
  },
  {
    "name": "Dangcagan",
    "province": "Bukidnon"
  },
  {
    "name": "Don Carlos",
    "province": "Bukidnon"
  },
  {
    "name": "Impasug Ong",
    "province": "Bukidnon"
  },
  {
    "name": "Kadingilan",
    "province": "Bukidnon"
  },
  {
    "name": "Kalilangan",
    "province": "Bukidnon"
  },
  {
    "name": "Kibawe",
    "province": "Bukidnon"
  },
  {
    "name": "Kitaotao",
    "province": "Bukidnon"
  },
  {
    "name": "Lantapan",
    "province": "Bukidnon"
  },
  {
    "name": "Libona",
    "province": "Bukidnon"
  },
  {
    "name": "Malaybalay City",
    "province": "Bukidnon"
  },
  {
    "name": "Malitbog",
    "province": "Bukidnon"
  },
  {
    "name": "Manolo Fortich",
    "province": "Bukidnon"
  },
  {
    "name": "Maramag",
    "province": "Bukidnon"
  },
  {
    "name": "Pangantucan",
    "province": "Bukidnon"
  },
  {
    "name": "Quezon",
    "province": "Bukidnon"
  },
  {
    "name": "San Fernando",
    "province": "Bukidnon"
  },
  {
    "name": "Sumilao",
    "province": "Bukidnon"
  },
  {
    "name": "Talakag",
    "province": "Bukidnon"
  },
  {
    "name": "Valencia City",
    "province": "Bukidnon"
  },
  {
    "name": "Angat",
    "province": "Bulacan"
  },
  {
    "name": "Balagtas",
    "province": "Bulacan"
  },
  {
    "name": "Baliuag",
    "province": "Bulacan"
  },
  {
    "name": "Bocaue",
    "province": "Bulacan"
  },
  {
    "name": "Bulacan",
    "province": "Bulacan"
  },
  {
    "name": "Bustos",
    "province": "Bulacan"
  },
  {
    "name": "Calumpit",
    "province": "Bulacan"
  },
  {
    "name": "Doña Remedios Trinidad",
    "province": "Bulacan"
  },
  {
    "name": "Guiguinto",
    "province": "Bulacan"
  },
  {
    "name": "Hagonoy",
    "province": "Bulacan"
  },
  {
    "name": "Malolos City",
    "province": "Bulacan"
  },
  {
    "name": "Marilao",
    "province": "Bulacan"
  },
  {
    "name": "Meycauayan City",
    "province": "Bulacan"
  },
  {
    "name": "Norzagaray",
    "province": "Bulacan"
  },
  {
    "name": "Obando",
    "province": "Bulacan"
  },
  {
    "name": "Pandi",
    "province": "Bulacan"
  },
  {
    "name": "Paombong",
    "province": "Bulacan"
  },
  {
    "name": "Plaridel",
    "province": "Bulacan"
  },
  {
    "name": "Pulilan",
    "province": "Bulacan"
  },
  {
    "name": "San Ildefonso",
    "province": "Bulacan"
  },
  {
    "name": "San Jose Del Monte City",
    "province": "Bulacan"
  },
  {
    "name": "San Miguel",
    "province": "Bulacan"
  },
  {
    "name": "San Rafael",
    "province": "Bulacan"
  },
  {
    "name": "Santa Maria",
    "province": "Bulacan"
  },
  {
    "name": "Abulug",
    "province": "Cagayan"
  },
  {
    "name": "Alcala",
    "province": "Cagayan"
  },
  {
    "name": "Allacapan",
    "province": "Cagayan"
  },
  {
    "name": "Amulung",
    "province": "Cagayan"
  },
  {
    "name": "Aparri",
    "province": "Cagayan"
  },
  {
    "name": "Baggao",
    "province": "Cagayan"
  },
  {
    "name": "Ballesteros",
    "province": "Cagayan"
  },
  {
    "name": "Buguey",
    "province": "Cagayan"
  },
  {
    "name": "Calayan",
    "province": "Cagayan"
  },
  {
    "name": "Camalaniugan",
    "province": "Cagayan"
  },
  {
    "name": "Claveria",
    "province": "Cagayan"
  },
  {
    "name": "Enrile",
    "province": "Cagayan"
  },
  {
    "name": "Gattaran",
    "province": "Cagayan"
  },
  {
    "name": "Gonzaga",
    "province": "Cagayan"
  },
  {
    "name": "Iguig",
    "province": "Cagayan"
  },
  {
    "name": "Lal Lo",
    "province": "Cagayan"
  },
  {
    "name": "Lasam",
    "province": "Cagayan"
  },
  {
    "name": "Pamplona",
    "province": "Cagayan"
  },
  {
    "name": "Peñablanca",
    "province": "Cagayan"
  },
  {
    "name": "Piat",
    "province": "Cagayan"
  },
  {
    "name": "Rizal",
    "province": "Cagayan"
  },
  {
    "name": "Sanchez Mira",
    "province": "Cagayan"
  },
  {
    "name": "Santa Ana",
    "province": "Cagayan"
  },
  {
    "name": "Santa Praxedes",
    "province": "Cagayan"
  },
  {
    "name": "Santa Teresita",
    "province": "Cagayan"
  },
  {
    "name": "Santo Niño",
    "province": "Cagayan"
  },
  {
    "name": "Solana",
    "province": "Cagayan"
  },
  {
    "name": "Tuao",
    "province": "Cagayan"
  },
  {
    "name": "Tuguegarao City",
    "province": "Cagayan"
  },
  {
    "name": "Basud",
    "province": "Camarines Norte"
  },
  {
    "name": "Capalonga",
    "province": "Camarines Norte"
  },
  {
    "name": "Daet",
    "province": "Camarines Norte"
  },
  {
    "name": "Jose Panganiban",
    "province": "Camarines Norte"
  },
  {
    "name": "Labo",
    "province": "Camarines Norte"
  },
  {
    "name": "Mercedes",
    "province": "Camarines Norte"
  },
  {
    "name": "Paracale",
    "province": "Camarines Norte"
  },
  {
    "name": "San Lorenzo Ruiz",
    "province": "Camarines Norte"
  },
  {
    "name": "San Vicente",
    "province": "Camarines Norte"
  },
  {
    "name": "Santa Elena",
    "province": "Camarines Norte"
  },
  {
    "name": "Talisay",
    "province": "Camarines Norte"
  },
  {
    "name": "Vinzons",
    "province": "Camarines Norte"
  },
  {
    "name": "Baao",
    "province": "Camarines Sur"
  },
  {
    "name": "Balatan",
    "province": "Camarines Sur"
  },
  {
    "name": "Bato",
    "province": "Camarines Sur"
  },
  {
    "name": "Bombon",
    "province": "Camarines Sur"
  },
  {
    "name": "Buhi",
    "province": "Camarines Sur"
  },
  {
    "name": "Bula",
    "province": "Camarines Sur"
  },
  {
    "name": "Cabusao",
    "province": "Camarines Sur"
  },
  {
    "name": "Calabanga",
    "province": "Camarines Sur"
  },
  {
    "name": "Camaligan",
    "province": "Camarines Sur"
  },
  {
    "name": "Canaman",
    "province": "Camarines Sur"
  },
  {
    "name": "Caramoan",
    "province": "Camarines Sur"
  },
  {
    "name": "Del Gallego",
    "province": "Camarines Sur"
  },
  {
    "name": "Gainza",
    "province": "Camarines Sur"
  },
  {
    "name": "Garchitorena",
    "province": "Camarines Sur"
  },
  {
    "name": "Goa",
    "province": "Camarines Sur"
  },
  {
    "name": "Iriga City",
    "province": "Camarines Sur"
  },
  {
    "name": "Lagonoy",
    "province": "Camarines Sur"
  },
  {
    "name": "Libmanan",
    "province": "Camarines Sur"
  },
  {
    "name": "Lupi",
    "province": "Camarines Sur"
  },
  {
    "name": "Magarao",
    "province": "Camarines Sur"
  },
  {
    "name": "Milaor",
    "province": "Camarines Sur"
  },
  {
    "name": "Minalabac",
    "province": "Camarines Sur"
  },
  {
    "name": "Nabua",
    "province": "Camarines Sur"
  },
  {
    "name": "Naga City",
    "province": "Camarines Sur"
  },
  {
    "name": "Ocampo",
    "province": "Camarines Sur"
  },
  {
    "name": "Pamplona",
    "province": "Camarines Sur"
  },
  {
    "name": "Pasacao",
    "province": "Camarines Sur"
  },
  {
    "name": "Pili",
    "province": "Camarines Sur"
  },
  {
    "name": "Presentacion",
    "province": "Camarines Sur"
  },
  {
    "name": "Ragay",
    "province": "Camarines Sur"
  },
  {
    "name": "Sagñay",
    "province": "Camarines Sur"
  },
  {
    "name": "San Fernando",
    "province": "Camarines Sur"
  },
  {
    "name": "San Jose",
    "province": "Camarines Sur"
  },
  {
    "name": "Sipocot",
    "province": "Camarines Sur"
  },
  {
    "name": "Siruma",
    "province": "Camarines Sur"
  },
  {
    "name": "Tigaon",
    "province": "Camarines Sur"
  },
  {
    "name": "Tinambac",
    "province": "Camarines Sur"
  },
  {
    "name": "Catarman",
    "province": "Camiguin"
  },
  {
    "name": "Guinsiliban",
    "province": "Camiguin"
  },
  {
    "name": "Mahinog",
    "province": "Camiguin"
  },
  {
    "name": "Mambajao",
    "province": "Camiguin"
  },
  {
    "name": "Sagay",
    "province": "Camiguin"
  },
  {
    "name": "Cuartero",
    "province": "Capiz"
  },
  {
    "name": "Dao",
    "province": "Capiz"
  },
  {
    "name": "Dumalag",
    "province": "Capiz"
  },
  {
    "name": "Dumarao",
    "province": "Capiz"
  },
  {
    "name": "Ivisan",
    "province": "Capiz"
  },
  {
    "name": "Jamindan",
    "province": "Capiz"
  },
  {
    "name": "Ma Ayon",
    "province": "Capiz"
  },
  {
    "name": "Mambusao",
    "province": "Capiz"
  },
  {
    "name": "Panay",
    "province": "Capiz"
  },
  {
    "name": "Panitan",
    "province": "Capiz"
  },
  {
    "name": "Pilar",
    "province": "Capiz"
  },
  {
    "name": "Pontevedra",
    "province": "Capiz"
  },
  {
    "name": "President Roxas",
    "province": "Capiz"
  },
  {
    "name": "Roxas City",
    "province": "Capiz"
  },
  {
    "name": "Sapi An",
    "province": "Capiz"
  },
  {
    "name": "Sigma",
    "province": "Capiz"
  },
  {
    "name": "Tapaz",
    "province": "Capiz"
  },
  {
    "name": "Bagamanoc",
    "province": "Catanduanes"
  },
  {
    "name": "Baras",
    "province": "Catanduanes"
  },
  {
    "name": "Bato",
    "province": "Catanduanes"
  },
  {
    "name": "Caramoran",
    "province": "Catanduanes"
  },
  {
    "name": "Gigmoto",
    "province": "Catanduanes"
  },
  {
    "name": "Pandan",
    "province": "Catanduanes"
  },
  {
    "name": "Panganiban",
    "province": "Catanduanes"
  },
  {
    "name": "San Andres",
    "province": "Catanduanes"
  },
  {
    "name": "San Miguel",
    "province": "Catanduanes"
  },
  {
    "name": "Viga",
    "province": "Catanduanes"
  },
  {
    "name": "Virac",
    "province": "Catanduanes"
  },
  {
    "name": "Alfonso",
    "province": "Cavite"
  },
  {
    "name": "Amadeo",
    "province": "Cavite"
  },
  {
    "name": "Bacoor City",
    "province": "Cavite"
  },
  {
    "name": "Carmona",
    "province": "Cavite"
  },
  {
    "name": "Cavite City",
    "province": "Cavite"
  },
  {
    "name": "Dasmariñas City",
    "province": "Cavite"
  },
  {
    "name": "Gen Mariano Alvarez",
    "province": "Cavite"
  },
  {
    "name": "General Emilio Aguinaldo",
    "province": "Cavite"
  },
  {
    "name": "General Trias City",
    "province": "Cavite"
  },
  {
    "name": "Imus City",
    "province": "Cavite"
  },
  {
    "name": "Indang",
    "province": "Cavite"
  },
  {
    "name": "Kawit",
    "province": "Cavite"
  },
  {
    "name": "Magallanes",
    "province": "Cavite"
  },
  {
    "name": "Maragondon",
    "province": "Cavite"
  },
  {
    "name": "Mendez Mendez Nuñez",
    "province": "Cavite"
  },
  {
    "name": "Naic",
    "province": "Cavite"
  },
  {
    "name": "Noveleta",
    "province": "Cavite"
  },
  {
    "name": "Rosario",
    "province": "Cavite"
  },
  {
    "name": "Silang",
    "province": "Cavite"
  },
  {
    "name": "Tagaytay City",
    "province": "Cavite"
  },
  {
    "name": "Tanza",
    "province": "Cavite"
  },
  {
    "name": "Ternate",
    "province": "Cavite"
  },
  {
    "name": "Trece Martires City",
    "province": "Cavite"
  },
  {
    "name": "Alcantara",
    "province": "Cebu"
  },
  {
    "name": "Alcoy",
    "province": "Cebu"
  },
  {
    "name": "Alegria",
    "province": "Cebu"
  },
  {
    "name": "Aloguinsan",
    "province": "Cebu"
  },
  {
    "name": "Argao",
    "province": "Cebu"
  },
  {
    "name": "Asturias",
    "province": "Cebu"
  },
  {
    "name": "Badian",
    "province": "Cebu"
  },
  {
    "name": "Balamban",
    "province": "Cebu"
  },
  {
    "name": "Bantayan",
    "province": "Cebu"
  },
  {
    "name": "Barili",
    "province": "Cebu"
  },
  {
    "name": "Bogo City",
    "province": "Cebu"
  },
  {
    "name": "Boljoon",
    "province": "Cebu"
  },
  {
    "name": "Borbon",
    "province": "Cebu"
  },
  {
    "name": "Carcar City",
    "province": "Cebu"
  },
  {
    "name": "Carmen",
    "province": "Cebu"
  },
  {
    "name": "Catmon",
    "province": "Cebu"
  },
  {
    "name": "Cebu City",
    "province": "Cebu"
  },
  {
    "name": "Compostela",
    "province": "Cebu"
  },
  {
    "name": "Consolacion",
    "province": "Cebu"
  },
  {
    "name": "Cordova",
    "province": "Cebu"
  },
  {
    "name": "Daanbantayan",
    "province": "Cebu"
  },
  {
    "name": "Dalaguete",
    "province": "Cebu"
  },
  {
    "name": "Danao City",
    "province": "Cebu"
  },
  {
    "name": "Dumanjug",
    "province": "Cebu"
  },
  {
    "name": "Ginatilan",
    "province": "Cebu"
  },
  {
    "name": "Lapu Lapu City",
    "province": "Cebu"
  },
  {
    "name": "Liloan",
    "province": "Cebu"
  },
  {
    "name": "Madridejos",
    "province": "Cebu"
  },
  {
    "name": "Malabuyoc",
    "province": "Cebu"
  },
  {
    "name": "Mandaue City",
    "province": "Cebu"
  },
  {
    "name": "Medellin",
    "province": "Cebu"
  },
  {
    "name": "Minglanilla",
    "province": "Cebu"
  },
  {
    "name": "Moalboal",
    "province": "Cebu"
  },
  {
    "name": "Naga City",
    "province": "Cebu"
  },
  {
    "name": "Oslob",
    "province": "Cebu"
  },
  {
    "name": "Pilar",
    "province": "Cebu"
  },
  {
    "name": "Pinamungajan",
    "province": "Cebu"
  },
  {
    "name": "Poro",
    "province": "Cebu"
  },
  {
    "name": "Ronda",
    "province": "Cebu"
  },
  {
    "name": "Samboan",
    "province": "Cebu"
  },
  {
    "name": "San Fernando",
    "province": "Cebu"
  },
  {
    "name": "San Francisco",
    "province": "Cebu"
  },
  {
    "name": "San Remigio",
    "province": "Cebu"
  },
  {
    "name": "Santa Fe",
    "province": "Cebu"
  },
  {
    "name": "Santander",
    "province": "Cebu"
  },
  {
    "name": "Sibonga",
    "province": "Cebu"
  },
  {
    "name": "Sogod",
    "province": "Cebu"
  },
  {
    "name": "Tabogon",
    "province": "Cebu"
  },
  {
    "name": "Tabuelan",
    "province": "Cebu"
  },
  {
    "name": "Talisay City",
    "province": "Cebu"
  },
  {
    "name": "Toledo City",
    "province": "Cebu"
  },
  {
    "name": "Tuburan",
    "province": "Cebu"
  },
  {
    "name": "Tudela",
    "province": "Cebu"
  },
  {
    "name": "Alamada",
    "province": "Cotabato"
  },
  {
    "name": "Aleosan",
    "province": "Cotabato"
  },
  {
    "name": "Antipas",
    "province": "Cotabato"
  },
  {
    "name": "Arakan",
    "province": "Cotabato"
  },
  {
    "name": "Banisilan",
    "province": "Cotabato"
  },
  {
    "name": "Carmen",
    "province": "Cotabato"
  },
  {
    "name": "Kabacan",
    "province": "Cotabato"
  },
  {
    "name": "Kidapawan City",
    "province": "Cotabato"
  },
  {
    "name": "Libungan",
    "province": "Cotabato"
  },
  {
    "name": "M Lang",
    "province": "Cotabato"
  },
  {
    "name": "Magpet",
    "province": "Cotabato"
  },
  {
    "name": "Makilala",
    "province": "Cotabato"
  },
  {
    "name": "Matalam",
    "province": "Cotabato"
  },
  {
    "name": "Midsayap",
    "province": "Cotabato"
  },
  {
    "name": "Pigkawayan",
    "province": "Cotabato"
  },
  {
    "name": "Pikit",
    "province": "Cotabato"
  },
  {
    "name": "President Roxas",
    "province": "Cotabato"
  },
  {
    "name": "Tulunan",
    "province": "Cotabato"
  },
  {
    "name": "Compostela",
    "province": "Davao De Oro"
  },
  {
    "name": "Laak",
    "province": "Davao De Oro"
  },
  {
    "name": "Mabini Doña Alicia",
    "province": "Davao De Oro"
  },
  {
    "name": "Maco",
    "province": "Davao De Oro"
  },
  {
    "name": "Maragusan",
    "province": "Davao De Oro"
  },
  {
    "name": "Mawab",
    "province": "Davao De Oro"
  },
  {
    "name": "Monkayo",
    "province": "Davao De Oro"
  },
  {
    "name": "Montevista",
    "province": "Davao De Oro"
  },
  {
    "name": "Nabunturan",
    "province": "Davao De Oro"
  },
  {
    "name": "New Bataan",
    "province": "Davao De Oro"
  },
  {
    "name": "Pantukan",
    "province": "Davao De Oro"
  },
  {
    "name": "Asuncion",
    "province": "Davao Del Norte"
  },
  {
    "name": "Braulio E Dujali",
    "province": "Davao Del Norte"
  },
  {
    "name": "Carmen",
    "province": "Davao Del Norte"
  },
  {
    "name": "Island Garden City Of Samal",
    "province": "Davao Del Norte"
  },
  {
    "name": "Kapalong",
    "province": "Davao Del Norte"
  },
  {
    "name": "New Corella",
    "province": "Davao Del Norte"
  },
  {
    "name": "Panabo City",
    "province": "Davao Del Norte"
  },
  {
    "name": "San Isidro",
    "province": "Davao Del Norte"
  },
  {
    "name": "Santo Tomas",
    "province": "Davao Del Norte"
  },
  {
    "name": "Tagum City",
    "province": "Davao Del Norte"
  },
  {
    "name": "Talaingod",
    "province": "Davao Del Norte"
  },
  {
    "name": "Bansalan",
    "province": "Davao Del Sur"
  },
  {
    "name": "Davao City",
    "province": "Davao Del Sur"
  },
  {
    "name": "Digos City",
    "province": "Davao Del Sur"
  },
  {
    "name": "Hagonoy",
    "province": "Davao Del Sur"
  },
  {
    "name": "Kiblawan",
    "province": "Davao Del Sur"
  },
  {
    "name": "Magsaysay",
    "province": "Davao Del Sur"
  },
  {
    "name": "Malalag",
    "province": "Davao Del Sur"
  },
  {
    "name": "Matanao",
    "province": "Davao Del Sur"
  },
  {
    "name": "Padada",
    "province": "Davao Del Sur"
  },
  {
    "name": "Santa Cruz",
    "province": "Davao Del Sur"
  },
  {
    "name": "Sulop",
    "province": "Davao Del Sur"
  },
  {
    "name": "Don Marcelino",
    "province": "Davao Occidental"
  },
  {
    "name": "Jose Abad Santos",
    "province": "Davao Occidental"
  },
  {
    "name": "Malita",
    "province": "Davao Occidental"
  },
  {
    "name": "Santa Maria",
    "province": "Davao Occidental"
  },
  {
    "name": "Sarangani",
    "province": "Davao Occidental"
  },
  {
    "name": "Baganga",
    "province": "Davao Oriental"
  },
  {
    "name": "Banaybanay",
    "province": "Davao Oriental"
  },
  {
    "name": "Boston",
    "province": "Davao Oriental"
  },
  {
    "name": "Caraga",
    "province": "Davao Oriental"
  },
  {
    "name": "Cateel",
    "province": "Davao Oriental"
  },
  {
    "name": "Governor Generoso",
    "province": "Davao Oriental"
  },
  {
    "name": "Lupon",
    "province": "Davao Oriental"
  },
  {
    "name": "Manay",
    "province": "Davao Oriental"
  },
  {
    "name": "Mati City",
    "province": "Davao Oriental"
  },
  {
    "name": "San Isidro",
    "province": "Davao Oriental"
  },
  {
    "name": "Tarragona",
    "province": "Davao Oriental"
  },
  {
    "name": "Basilisa",
    "province": "Dinagat Islands"
  },
  {
    "name": "Cagdianao",
    "province": "Dinagat Islands"
  },
  {
    "name": "Dinagat",
    "province": "Dinagat Islands"
  },
  {
    "name": "Libjo",
    "province": "Dinagat Islands"
  },
  {
    "name": "Loreto",
    "province": "Dinagat Islands"
  },
  {
    "name": "San Jose",
    "province": "Dinagat Islands"
  },
  {
    "name": "Tubajon",
    "province": "Dinagat Islands"
  },
  {
    "name": "Arteche",
    "province": "Eastern Samar"
  },
  {
    "name": "Balangiga",
    "province": "Eastern Samar"
  },
  {
    "name": "Balangkayan",
    "province": "Eastern Samar"
  },
  {
    "name": "Borongan City",
    "province": "Eastern Samar"
  },
  {
    "name": "Can Avid",
    "province": "Eastern Samar"
  },
  {
    "name": "Dolores",
    "province": "Eastern Samar"
  },
  {
    "name": "General Macarthur",
    "province": "Eastern Samar"
  },
  {
    "name": "Giporlos",
    "province": "Eastern Samar"
  },
  {
    "name": "Guiuan",
    "province": "Eastern Samar"
  },
  {
    "name": "Hernani",
    "province": "Eastern Samar"
  },
  {
    "name": "Jipapad",
    "province": "Eastern Samar"
  },
  {
    "name": "Lawaan",
    "province": "Eastern Samar"
  },
  {
    "name": "Llorente",
    "province": "Eastern Samar"
  },
  {
    "name": "Maslog",
    "province": "Eastern Samar"
  },
  {
    "name": "Maydolong",
    "province": "Eastern Samar"
  },
  {
    "name": "Mercedes",
    "province": "Eastern Samar"
  },
  {
    "name": "Oras",
    "province": "Eastern Samar"
  },
  {
    "name": "Quinapondan",
    "province": "Eastern Samar"
  },
  {
    "name": "Salcedo",
    "province": "Eastern Samar"
  },
  {
    "name": "San Julian",
    "province": "Eastern Samar"
  },
  {
    "name": "San Policarpo",
    "province": "Eastern Samar"
  },
  {
    "name": "Sulat",
    "province": "Eastern Samar"
  },
  {
    "name": "Taft",
    "province": "Eastern Samar"
  },
  {
    "name": "Buenavista",
    "province": "Guimaras"
  },
  {
    "name": "Jordan",
    "province": "Guimaras"
  },
  {
    "name": "Nueva Valencia",
    "province": "Guimaras"
  },
  {
    "name": "San Lorenzo",
    "province": "Guimaras"
  },
  {
    "name": "Sibunag",
    "province": "Guimaras"
  },
  {
    "name": "Aguinaldo",
    "province": "Ifugao"
  },
  {
    "name": "Alfonso Lista",
    "province": "Ifugao"
  },
  {
    "name": "Asipulo",
    "province": "Ifugao"
  },
  {
    "name": "Banaue",
    "province": "Ifugao"
  },
  {
    "name": "Hingyon",
    "province": "Ifugao"
  },
  {
    "name": "Hungduan",
    "province": "Ifugao"
  },
  {
    "name": "Kiangan",
    "province": "Ifugao"
  },
  {
    "name": "Lagawe",
    "province": "Ifugao"
  },
  {
    "name": "Lamut",
    "province": "Ifugao"
  },
  {
    "name": "Mayoyao",
    "province": "Ifugao"
  },
  {
    "name": "Tinoc",
    "province": "Ifugao"
  },
  {
    "name": "Adams",
    "province": "Ilocos Norte"
  },
  {
    "name": "Bacarra",
    "province": "Ilocos Norte"
  },
  {
    "name": "Badoc",
    "province": "Ilocos Norte"
  },
  {
    "name": "Bangui",
    "province": "Ilocos Norte"
  },
  {
    "name": "Banna",
    "province": "Ilocos Norte"
  },
  {
    "name": "Batac City",
    "province": "Ilocos Norte"
  },
  {
    "name": "Burgos",
    "province": "Ilocos Norte"
  },
  {
    "name": "Carasi",
    "province": "Ilocos Norte"
  },
  {
    "name": "Currimao",
    "province": "Ilocos Norte"
  },
  {
    "name": "Dingras",
    "province": "Ilocos Norte"
  },
  {
    "name": "Dumalneg",
    "province": "Ilocos Norte"
  },
  {
    "name": "Laoag City",
    "province": "Ilocos Norte"
  },
  {
    "name": "Marcos",
    "province": "Ilocos Norte"
  },
  {
    "name": "Nueva Era",
    "province": "Ilocos Norte"
  },
  {
    "name": "Pagudpud",
    "province": "Ilocos Norte"
  },
  {
    "name": "Paoay",
    "province": "Ilocos Norte"
  },
  {
    "name": "Pasuquin",
    "province": "Ilocos Norte"
  },
  {
    "name": "Piddig",
    "province": "Ilocos Norte"
  },
  {
    "name": "Pinili",
    "province": "Ilocos Norte"
  },
  {
    "name": "San Nicolas",
    "province": "Ilocos Norte"
  },
  {
    "name": "Sarrat",
    "province": "Ilocos Norte"
  },
  {
    "name": "Solsona",
    "province": "Ilocos Norte"
  },
  {
    "name": "Vintar",
    "province": "Ilocos Norte"
  },
  {
    "name": "Alilem",
    "province": "Ilocos Sur"
  },
  {
    "name": "Banayoyo",
    "province": "Ilocos Sur"
  },
  {
    "name": "Bantay",
    "province": "Ilocos Sur"
  },
  {
    "name": "Burgos",
    "province": "Ilocos Sur"
  },
  {
    "name": "Cabugao",
    "province": "Ilocos Sur"
  },
  {
    "name": "Candon City",
    "province": "Ilocos Sur"
  },
  {
    "name": "Caoayan",
    "province": "Ilocos Sur"
  },
  {
    "name": "Cervantes",
    "province": "Ilocos Sur"
  },
  {
    "name": "Galimuyod",
    "province": "Ilocos Sur"
  },
  {
    "name": "Gregorio Del Pilar",
    "province": "Ilocos Sur"
  },
  {
    "name": "Lidlidda",
    "province": "Ilocos Sur"
  },
  {
    "name": "Magsingal",
    "province": "Ilocos Sur"
  },
  {
    "name": "Nagbukel",
    "province": "Ilocos Sur"
  },
  {
    "name": "Narvacan",
    "province": "Ilocos Sur"
  },
  {
    "name": "Quirino",
    "province": "Ilocos Sur"
  },
  {
    "name": "Salcedo",
    "province": "Ilocos Sur"
  },
  {
    "name": "San Emilio",
    "province": "Ilocos Sur"
  },
  {
    "name": "San Esteban",
    "province": "Ilocos Sur"
  },
  {
    "name": "San Ildefonso",
    "province": "Ilocos Sur"
  },
  {
    "name": "San Juan",
    "province": "Ilocos Sur"
  },
  {
    "name": "San Vicente",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santa",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santa Catalina",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santa Cruz",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santa Lucia",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santa Maria",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santiago",
    "province": "Ilocos Sur"
  },
  {
    "name": "Santo Domingo",
    "province": "Ilocos Sur"
  },
  {
    "name": "Sigay",
    "province": "Ilocos Sur"
  },
  {
    "name": "Sinait",
    "province": "Ilocos Sur"
  },
  {
    "name": "Sugpon",
    "province": "Ilocos Sur"
  },
  {
    "name": "Suyo",
    "province": "Ilocos Sur"
  },
  {
    "name": "Tagudin",
    "province": "Ilocos Sur"
  },
  {
    "name": "Vigan City",
    "province": "Ilocos Sur"
  },
  {
    "name": "Ajuy",
    "province": "Iloilo"
  },
  {
    "name": "Alimodian",
    "province": "Iloilo"
  },
  {
    "name": "Anilao",
    "province": "Iloilo"
  },
  {
    "name": "Badiangan",
    "province": "Iloilo"
  },
  {
    "name": "Balasan",
    "province": "Iloilo"
  },
  {
    "name": "Banate",
    "province": "Iloilo"
  },
  {
    "name": "Barotac Nuevo",
    "province": "Iloilo"
  },
  {
    "name": "Barotac Viejo",
    "province": "Iloilo"
  },
  {
    "name": "Batad",
    "province": "Iloilo"
  },
  {
    "name": "Bingawan",
    "province": "Iloilo"
  },
  {
    "name": "Cabatuan",
    "province": "Iloilo"
  },
  {
    "name": "Calinog",
    "province": "Iloilo"
  },
  {
    "name": "Carles",
    "province": "Iloilo"
  },
  {
    "name": "Concepcion",
    "province": "Iloilo"
  },
  {
    "name": "Dingle",
    "province": "Iloilo"
  },
  {
    "name": "Dueñas",
    "province": "Iloilo"
  },
  {
    "name": "Dumangas",
    "province": "Iloilo"
  },
  {
    "name": "Estancia",
    "province": "Iloilo"
  },
  {
    "name": "Guimbal",
    "province": "Iloilo"
  },
  {
    "name": "Igbaras",
    "province": "Iloilo"
  },
  {
    "name": "Iloilo City",
    "province": "Iloilo"
  },
  {
    "name": "Janiuay",
    "province": "Iloilo"
  },
  {
    "name": "Lambunao",
    "province": "Iloilo"
  },
  {
    "name": "Leganes",
    "province": "Iloilo"
  },
  {
    "name": "Lemery",
    "province": "Iloilo"
  },
  {
    "name": "Leon",
    "province": "Iloilo"
  },
  {
    "name": "Maasin",
    "province": "Iloilo"
  },
  {
    "name": "Miagao",
    "province": "Iloilo"
  },
  {
    "name": "Mina",
    "province": "Iloilo"
  },
  {
    "name": "New Lucena",
    "province": "Iloilo"
  },
  {
    "name": "Oton",
    "province": "Iloilo"
  },
  {
    "name": "Passi City",
    "province": "Iloilo"
  },
  {
    "name": "Pavia",
    "province": "Iloilo"
  },
  {
    "name": "Pototan",
    "province": "Iloilo"
  },
  {
    "name": "San Dionisio",
    "province": "Iloilo"
  },
  {
    "name": "San Enrique",
    "province": "Iloilo"
  },
  {
    "name": "San Joaquin",
    "province": "Iloilo"
  },
  {
    "name": "San Miguel",
    "province": "Iloilo"
  },
  {
    "name": "San Rafael",
    "province": "Iloilo"
  },
  {
    "name": "Santa Barbara",
    "province": "Iloilo"
  },
  {
    "name": "Sara",
    "province": "Iloilo"
  },
  {
    "name": "Tigbauan",
    "province": "Iloilo"
  },
  {
    "name": "Tubungan",
    "province": "Iloilo"
  },
  {
    "name": "Zarraga",
    "province": "Iloilo"
  },
  {
    "name": "Alicia",
    "province": "Isabela"
  },
  {
    "name": "Angadanan",
    "province": "Isabela"
  },
  {
    "name": "Aurora",
    "province": "Isabela"
  },
  {
    "name": "Benito Soliven",
    "province": "Isabela"
  },
  {
    "name": "Burgos",
    "province": "Isabela"
  },
  {
    "name": "Cabagan",
    "province": "Isabela"
  },
  {
    "name": "Cabatuan",
    "province": "Isabela"
  },
  {
    "name": "Cauayan City",
    "province": "Isabela"
  },
  {
    "name": "Cordon",
    "province": "Isabela"
  },
  {
    "name": "Delfin Albano",
    "province": "Isabela"
  },
  {
    "name": "Dinapigue",
    "province": "Isabela"
  },
  {
    "name": "Divilacan",
    "province": "Isabela"
  },
  {
    "name": "Echague",
    "province": "Isabela"
  },
  {
    "name": "Gamu",
    "province": "Isabela"
  },
  {
    "name": "Ilagan City",
    "province": "Isabela"
  },
  {
    "name": "Jones",
    "province": "Isabela"
  },
  {
    "name": "Luna",
    "province": "Isabela"
  },
  {
    "name": "Maconacon",
    "province": "Isabela"
  },
  {
    "name": "Mallig",
    "province": "Isabela"
  },
  {
    "name": "Naguilian",
    "province": "Isabela"
  },
  {
    "name": "Palanan",
    "province": "Isabela"
  },
  {
    "name": "Quezon",
    "province": "Isabela"
  },
  {
    "name": "Quirino",
    "province": "Isabela"
  },
  {
    "name": "Ramon",
    "province": "Isabela"
  },
  {
    "name": "Reina Mercedes",
    "province": "Isabela"
  },
  {
    "name": "Roxas",
    "province": "Isabela"
  },
  {
    "name": "San Agustin",
    "province": "Isabela"
  },
  {
    "name": "San Guillermo",
    "province": "Isabela"
  },
  {
    "name": "San Isidro",
    "province": "Isabela"
  },
  {
    "name": "San Manuel",
    "province": "Isabela"
  },
  {
    "name": "San Mariano",
    "province": "Isabela"
  },
  {
    "name": "San Mateo",
    "province": "Isabela"
  },
  {
    "name": "San Pablo",
    "province": "Isabela"
  },
  {
    "name": "Santa Maria",
    "province": "Isabela"
  },
  {
    "name": "Santiago City",
    "province": "Isabela"
  },
  {
    "name": "Santo Tomas",
    "province": "Isabela"
  },
  {
    "name": "Tumauini",
    "province": "Isabela"
  },
  {
    "name": "Balbalan",
    "province": "Kalinga"
  },
  {
    "name": "Lubuagan",
    "province": "Kalinga"
  },
  {
    "name": "Pasil",
    "province": "Kalinga"
  },
  {
    "name": "Pinukpuk",
    "province": "Kalinga"
  },
  {
    "name": "Rizal",
    "province": "Kalinga"
  },
  {
    "name": "Tabuk City",
    "province": "Kalinga"
  },
  {
    "name": "Tanudan",
    "province": "Kalinga"
  },
  {
    "name": "Tinglayan",
    "province": "Kalinga"
  },
  {
    "name": "Agoo",
    "province": "La Union"
  },
  {
    "name": "Aringay",
    "province": "La Union"
  },
  {
    "name": "Bacnotan",
    "province": "La Union"
  },
  {
    "name": "Bagulin",
    "province": "La Union"
  },
  {
    "name": "Balaoan",
    "province": "La Union"
  },
  {
    "name": "Bangar",
    "province": "La Union"
  },
  {
    "name": "Bauang",
    "province": "La Union"
  },
  {
    "name": "Burgos",
    "province": "La Union"
  },
  {
    "name": "Caba",
    "province": "La Union"
  },
  {
    "name": "Luna",
    "province": "La Union"
  },
  {
    "name": "Naguilian",
    "province": "La Union"
  },
  {
    "name": "Pugo",
    "province": "La Union"
  },
  {
    "name": "Rosario",
    "province": "La Union"
  },
  {
    "name": "San Fernando City",
    "province": "La Union"
  },
  {
    "name": "San Gabriel",
    "province": "La Union"
  },
  {
    "name": "San Juan",
    "province": "La Union"
  },
  {
    "name": "Santo Tomas",
    "province": "La Union"
  },
  {
    "name": "Santol",
    "province": "La Union"
  },
  {
    "name": "Sudipen",
    "province": "La Union"
  },
  {
    "name": "Tubao",
    "province": "La Union"
  },
  {
    "name": "Alaminos",
    "province": "Laguna"
  },
  {
    "name": "Bay",
    "province": "Laguna"
  },
  {
    "name": "Biñan City",
    "province": "Laguna"
  },
  {
    "name": "Cabuyao City",
    "province": "Laguna"
  },
  {
    "name": "Calamba City",
    "province": "Laguna"
  },
  {
    "name": "Calauan",
    "province": "Laguna"
  },
  {
    "name": "Cavinti",
    "province": "Laguna"
  },
  {
    "name": "Famy",
    "province": "Laguna"
  },
  {
    "name": "Kalayaan",
    "province": "Laguna"
  },
  {
    "name": "Liliw",
    "province": "Laguna"
  },
  {
    "name": "Los Baños",
    "province": "Laguna"
  },
  {
    "name": "Luisiana",
    "province": "Laguna"
  },
  {
    "name": "Lumban",
    "province": "Laguna"
  },
  {
    "name": "Mabitac",
    "province": "Laguna"
  },
  {
    "name": "Magdalena",
    "province": "Laguna"
  },
  {
    "name": "Majayjay",
    "province": "Laguna"
  },
  {
    "name": "Nagcarlan",
    "province": "Laguna"
  },
  {
    "name": "Paete",
    "province": "Laguna"
  },
  {
    "name": "Pagsanjan",
    "province": "Laguna"
  },
  {
    "name": "Pakil",
    "province": "Laguna"
  },
  {
    "name": "Pangil",
    "province": "Laguna"
  },
  {
    "name": "Pila",
    "province": "Laguna"
  },
  {
    "name": "Rizal",
    "province": "Laguna"
  },
  {
    "name": "San Pablo City",
    "province": "Laguna"
  },
  {
    "name": "San Pedro City",
    "province": "Laguna"
  },
  {
    "name": "Santa Cruz",
    "province": "Laguna"
  },
  {
    "name": "Santa Maria",
    "province": "Laguna"
  },
  {
    "name": "Santa Rosa City",
    "province": "Laguna"
  },
  {
    "name": "Siniloan",
    "province": "Laguna"
  },
  {
    "name": "Victoria",
    "province": "Laguna"
  },
  {
    "name": "Bacolod",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Baloi",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Baroy",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Iligan City",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Kapatagan",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Kauswagan",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Kolambugan",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Lala",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Linamon",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Magsaysay",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Maigo",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Matungao",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Munai",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Nunungan",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Pantao Ragat",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Pantar",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Poona Piagapo",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Salvador",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Sapad",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Sultan Naga Dimaporo",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Tagoloan",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Tangcal",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Tubod",
    "province": "Lanao Del Norte"
  },
  {
    "name": "Amai Manabilang",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Bacolod Kalawi",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Balabagan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Balindong",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Bayang",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Binidayan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Buadiposo Buntong",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Bubong",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Butig",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Calanogas",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Ditsaan Ramain",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Ganassi",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Kapai",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Kapatagan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Lumba Bayabao",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Lumbaca Unayan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Lumbatan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Lumbayanague",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Madalum",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Madamba",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Maguing",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Malabang",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Marantao",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Marawi City",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Marogong",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Masiu",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Mulondo",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Pagayawan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Piagapo",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Picong",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Poona Bayabao",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Pualas",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Saguiaran",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Sultan Dumalondong",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Tagoloan Ii",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Tamparan",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Taraka",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Tubaran",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Tugaya",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Wao",
    "province": "Lanao Del Sur"
  },
  {
    "name": "Abuyog",
    "province": "Leyte"
  },
  {
    "name": "Alangalang",
    "province": "Leyte"
  },
  {
    "name": "Albuera",
    "province": "Leyte"
  },
  {
    "name": "Babatngon",
    "province": "Leyte"
  },
  {
    "name": "Barugo",
    "province": "Leyte"
  },
  {
    "name": "Bato",
    "province": "Leyte"
  },
  {
    "name": "Baybay City",
    "province": "Leyte"
  },
  {
    "name": "Burauen",
    "province": "Leyte"
  },
  {
    "name": "Calubian",
    "province": "Leyte"
  },
  {
    "name": "Capoocan",
    "province": "Leyte"
  },
  {
    "name": "Carigara",
    "province": "Leyte"
  },
  {
    "name": "Dagami",
    "province": "Leyte"
  },
  {
    "name": "Dulag",
    "province": "Leyte"
  },
  {
    "name": "Hilongos",
    "province": "Leyte"
  },
  {
    "name": "Hindang",
    "province": "Leyte"
  },
  {
    "name": "Inopacan",
    "province": "Leyte"
  },
  {
    "name": "Isabel",
    "province": "Leyte"
  },
  {
    "name": "Jaro",
    "province": "Leyte"
  },
  {
    "name": "Javier",
    "province": "Leyte"
  },
  {
    "name": "Julita",
    "province": "Leyte"
  },
  {
    "name": "Kananga",
    "province": "Leyte"
  },
  {
    "name": "La Paz",
    "province": "Leyte"
  },
  {
    "name": "Leyte",
    "province": "Leyte"
  },
  {
    "name": "Macarthur",
    "province": "Leyte"
  },
  {
    "name": "Mahaplag",
    "province": "Leyte"
  },
  {
    "name": "Matag Ob",
    "province": "Leyte"
  },
  {
    "name": "Matalom",
    "province": "Leyte"
  },
  {
    "name": "Mayorga",
    "province": "Leyte"
  },
  {
    "name": "Merida",
    "province": "Leyte"
  },
  {
    "name": "Ormoc City",
    "province": "Leyte"
  },
  {
    "name": "Palo",
    "province": "Leyte"
  },
  {
    "name": "Palompon",
    "province": "Leyte"
  },
  {
    "name": "Pastrana",
    "province": "Leyte"
  },
  {
    "name": "San Isidro",
    "province": "Leyte"
  },
  {
    "name": "San Miguel",
    "province": "Leyte"
  },
  {
    "name": "Santa Fe",
    "province": "Leyte"
  },
  {
    "name": "Tabango",
    "province": "Leyte"
  },
  {
    "name": "Tabontabon",
    "province": "Leyte"
  },
  {
    "name": "Tacloban City",
    "province": "Leyte"
  },
  {
    "name": "Tanauan",
    "province": "Leyte"
  },
  {
    "name": "Tolosa",
    "province": "Leyte"
  },
  {
    "name": "Tunga",
    "province": "Leyte"
  },
  {
    "name": "Villaba",
    "province": "Leyte"
  },
  {
    "name": "Ampatuan",
    "province": "Maguindanao"
  },
  {
    "name": "Barira",
    "province": "Maguindanao"
  },
  {
    "name": "Buldon",
    "province": "Maguindanao"
  },
  {
    "name": "Buluan",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Abdullah Sangki",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Anggal Midtimbang",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Blah T Sinsuat",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Hoffer Ampatuan",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Odin Sinsuat",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Paglas",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Piang",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Salibo",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Saudi Ampatuan",
    "province": "Maguindanao"
  },
  {
    "name": "Datu Unsay",
    "province": "Maguindanao"
  },
  {
    "name": "Gen S K Pendatun",
    "province": "Maguindanao"
  },
  {
    "name": "Guindulungan",
    "province": "Maguindanao"
  },
  {
    "name": "Kabuntalan",
    "province": "Maguindanao"
  },
  {
    "name": "Mamasapano",
    "province": "Maguindanao"
  },
  {
    "name": "Mangudadatu",
    "province": "Maguindanao"
  },
  {
    "name": "Matanog",
    "province": "Maguindanao"
  },
  {
    "name": "Northern Kabuntalan",
    "province": "Maguindanao"
  },
  {
    "name": "Pagagawan",
    "province": "Maguindanao"
  },
  {
    "name": "Pagalungan",
    "province": "Maguindanao"
  },
  {
    "name": "Paglat",
    "province": "Maguindanao"
  },
  {
    "name": "Pandag",
    "province": "Maguindanao"
  },
  {
    "name": "Parang",
    "province": "Maguindanao"
  },
  {
    "name": "Rajah Buayan",
    "province": "Maguindanao"
  },
  {
    "name": "Shariff Aguak",
    "province": "Maguindanao"
  },
  {
    "name": "Shariff Saydona Mustapha",
    "province": "Maguindanao"
  },
  {
    "name": "South Upi",
    "province": "Maguindanao"
  },
  {
    "name": "Sultan Kudarat",
    "province": "Maguindanao"
  },
  {
    "name": "Sultan Mastura",
    "province": "Maguindanao"
  },
  {
    "name": "Sultan Sa Barongis",
    "province": "Maguindanao"
  },
  {
    "name": "Talayan",
    "province": "Maguindanao"
  },
  {
    "name": "Talitay",
    "province": "Maguindanao"
  },
  {
    "name": "Upi",
    "province": "Maguindanao"
  },
  {
    "name": "Boac",
    "province": "Marinduque"
  },
  {
    "name": "Buenavista",
    "province": "Marinduque"
  },
  {
    "name": "Gasan",
    "province": "Marinduque"
  },
  {
    "name": "Mogpog",
    "province": "Marinduque"
  },
  {
    "name": "Santa Cruz",
    "province": "Marinduque"
  },
  {
    "name": "Torrijos",
    "province": "Marinduque"
  },
  {
    "name": "Aroroy",
    "province": "Masbate"
  },
  {
    "name": "Baleno",
    "province": "Masbate"
  },
  {
    "name": "Balud",
    "province": "Masbate"
  },
  {
    "name": "Batuan",
    "province": "Masbate"
  },
  {
    "name": "Cataingan",
    "province": "Masbate"
  },
  {
    "name": "Cawayan",
    "province": "Masbate"
  },
  {
    "name": "Claveria",
    "province": "Masbate"
  },
  {
    "name": "Dimasalang",
    "province": "Masbate"
  },
  {
    "name": "Esperanza",
    "province": "Masbate"
  },
  {
    "name": "Mandaon",
    "province": "Masbate"
  },
  {
    "name": "Masbate City",
    "province": "Masbate"
  },
  {
    "name": "Milagros",
    "province": "Masbate"
  },
  {
    "name": "Mobo",
    "province": "Masbate"
  },
  {
    "name": "Monreal",
    "province": "Masbate"
  },
  {
    "name": "Palanas",
    "province": "Masbate"
  },
  {
    "name": "Pio V Corpuz",
    "province": "Masbate"
  },
  {
    "name": "Placer",
    "province": "Masbate"
  },
  {
    "name": "San Fernando",
    "province": "Masbate"
  },
  {
    "name": "San Jacinto",
    "province": "Masbate"
  },
  {
    "name": "San Pascual",
    "province": "Masbate"
  },
  {
    "name": "Uson",
    "province": "Masbate"
  },
  {
    "name": "Caloocan City",
    "province": "Metro Manila"
  },
  {
    "name": "Las Piñas City",
    "province": "Metro Manila"
  },
  {
    "name": "Makati City",
    "province": "Metro Manila"
  },
  {
    "name": "Malabon City",
    "province": "Metro Manila"
  },
  {
    "name": "Mandaluyong City",
    "province": "Metro Manila"
  },
  {
    "name": "Manila City",
    "province": "Metro Manila"
  },
  {
    "name": "Marikina City",
    "province": "Metro Manila"
  },
  {
    "name": "Muntinlupa City",
    "province": "Metro Manila"
  },
  {
    "name": "Navotas City",
    "province": "Metro Manila"
  },
  {
    "name": "Parañaque City",
    "province": "Metro Manila"
  },
  {
    "name": "Pasay City",
    "province": "Metro Manila"
  },
  {
    "name": "Pasig City",
    "province": "Metro Manila"
  },
  {
    "name": "Pateros",
    "province": "Metro Manila"
  },
  {
    "name": "Quezon City",
    "province": "Metro Manila"
  },
  {
    "name": "San Juan City",
    "province": "Metro Manila"
  },
  {
    "name": "Taguig City",
    "province": "Metro Manila"
  },
  {
    "name": "Valenzuela City",
    "province": "Metro Manila"
  },
  {
    "name": "Aloran",
    "province": "Misamis Occidental"
  },
  {
    "name": "Baliangao",
    "province": "Misamis Occidental"
  },
  {
    "name": "Bonifacio",
    "province": "Misamis Occidental"
  },
  {
    "name": "Calamba",
    "province": "Misamis Occidental"
  },
  {
    "name": "Clarin",
    "province": "Misamis Occidental"
  },
  {
    "name": "Concepcion",
    "province": "Misamis Occidental"
  },
  {
    "name": "Don Victoriano Chiongbian",
    "province": "Misamis Occidental"
  },
  {
    "name": "Jimenez",
    "province": "Misamis Occidental"
  },
  {
    "name": "Lopez Jaena",
    "province": "Misamis Occidental"
  },
  {
    "name": "Oroquieta City",
    "province": "Misamis Occidental"
  },
  {
    "name": "Ozamiz City",
    "province": "Misamis Occidental"
  },
  {
    "name": "Panaon",
    "province": "Misamis Occidental"
  },
  {
    "name": "Plaridel",
    "province": "Misamis Occidental"
  },
  {
    "name": "Sapang Dalaga",
    "province": "Misamis Occidental"
  },
  {
    "name": "Sinacaban",
    "province": "Misamis Occidental"
  },
  {
    "name": "Tangub City",
    "province": "Misamis Occidental"
  },
  {
    "name": "Tudela",
    "province": "Misamis Occidental"
  },
  {
    "name": "Alubijid",
    "province": "Misamis Oriental"
  },
  {
    "name": "Balingasag",
    "province": "Misamis Oriental"
  },
  {
    "name": "Balingoan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Binuangan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Cagayan De Oro City",
    "province": "Misamis Oriental"
  },
  {
    "name": "Claveria",
    "province": "Misamis Oriental"
  },
  {
    "name": "El Salvador City",
    "province": "Misamis Oriental"
  },
  {
    "name": "Gingoog City",
    "province": "Misamis Oriental"
  },
  {
    "name": "Gitagum",
    "province": "Misamis Oriental"
  },
  {
    "name": "Initao",
    "province": "Misamis Oriental"
  },
  {
    "name": "Jasaan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Kinoguitan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Lagonglong",
    "province": "Misamis Oriental"
  },
  {
    "name": "Laguindingan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Libertad",
    "province": "Misamis Oriental"
  },
  {
    "name": "Lugait",
    "province": "Misamis Oriental"
  },
  {
    "name": "Magsaysay",
    "province": "Misamis Oriental"
  },
  {
    "name": "Manticao",
    "province": "Misamis Oriental"
  },
  {
    "name": "Medina",
    "province": "Misamis Oriental"
  },
  {
    "name": "Naawan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Opol",
    "province": "Misamis Oriental"
  },
  {
    "name": "Salay",
    "province": "Misamis Oriental"
  },
  {
    "name": "Sugbongcogon",
    "province": "Misamis Oriental"
  },
  {
    "name": "Tagoloan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Talisayan",
    "province": "Misamis Oriental"
  },
  {
    "name": "Villanueva",
    "province": "Misamis Oriental"
  },
  {
    "name": "Barlig",
    "province": "Mountain Province"
  },
  {
    "name": "Bauko",
    "province": "Mountain Province"
  },
  {
    "name": "Besao",
    "province": "Mountain Province"
  },
  {
    "name": "Bontoc",
    "province": "Mountain Province"
  },
  {
    "name": "Natonin",
    "province": "Mountain Province"
  },
  {
    "name": "Paracelis",
    "province": "Mountain Province"
  },
  {
    "name": "Sabangan",
    "province": "Mountain Province"
  },
  {
    "name": "Sadanga",
    "province": "Mountain Province"
  },
  {
    "name": "Sagada",
    "province": "Mountain Province"
  },
  {
    "name": "Tadian",
    "province": "Mountain Province"
  },
  {
    "name": "Bacolod City",
    "province": "Negros Occidental"
  },
  {
    "name": "Bago City",
    "province": "Negros Occidental"
  },
  {
    "name": "Binalbagan",
    "province": "Negros Occidental"
  },
  {
    "name": "Cadiz City",
    "province": "Negros Occidental"
  },
  {
    "name": "Calatrava",
    "province": "Negros Occidental"
  },
  {
    "name": "Candoni",
    "province": "Negros Occidental"
  },
  {
    "name": "Cauayan",
    "province": "Negros Occidental"
  },
  {
    "name": "Enrique B Magalona",
    "province": "Negros Occidental"
  },
  {
    "name": "Escalante City",
    "province": "Negros Occidental"
  },
  {
    "name": "Himamaylan City",
    "province": "Negros Occidental"
  },
  {
    "name": "Hinigaran",
    "province": "Negros Occidental"
  },
  {
    "name": "Hinoba An",
    "province": "Negros Occidental"
  },
  {
    "name": "Ilog",
    "province": "Negros Occidental"
  },
  {
    "name": "Isabela",
    "province": "Negros Occidental"
  },
  {
    "name": "Kabankalan City",
    "province": "Negros Occidental"
  },
  {
    "name": "La Carlota City",
    "province": "Negros Occidental"
  },
  {
    "name": "La Castellana",
    "province": "Negros Occidental"
  },
  {
    "name": "Manapla",
    "province": "Negros Occidental"
  },
  {
    "name": "Moises Padilla",
    "province": "Negros Occidental"
  },
  {
    "name": "Murcia",
    "province": "Negros Occidental"
  },
  {
    "name": "Pontevedra",
    "province": "Negros Occidental"
  },
  {
    "name": "Pulupandan",
    "province": "Negros Occidental"
  },
  {
    "name": "Sagay City",
    "province": "Negros Occidental"
  },
  {
    "name": "Salvador Benedicto",
    "province": "Negros Occidental"
  },
  {
    "name": "San Carlos City",
    "province": "Negros Occidental"
  },
  {
    "name": "San Enrique",
    "province": "Negros Occidental"
  },
  {
    "name": "Silay City",
    "province": "Negros Occidental"
  },
  {
    "name": "Sipalay City",
    "province": "Negros Occidental"
  },
  {
    "name": "Talisay City",
    "province": "Negros Occidental"
  },
  {
    "name": "Toboso",
    "province": "Negros Occidental"
  },
  {
    "name": "Valladolid",
    "province": "Negros Occidental"
  },
  {
    "name": "Victorias City",
    "province": "Negros Occidental"
  },
  {
    "name": "Amlan",
    "province": "Negros Oriental"
  },
  {
    "name": "Ayungon",
    "province": "Negros Oriental"
  },
  {
    "name": "Bacong",
    "province": "Negros Oriental"
  },
  {
    "name": "Bais City",
    "province": "Negros Oriental"
  },
  {
    "name": "Basay",
    "province": "Negros Oriental"
  },
  {
    "name": "Bayawan City",
    "province": "Negros Oriental"
  },
  {
    "name": "Bindoy",
    "province": "Negros Oriental"
  },
  {
    "name": "Canlaon City",
    "province": "Negros Oriental"
  },
  {
    "name": "Dauin",
    "province": "Negros Oriental"
  },
  {
    "name": "Dumaguete City",
    "province": "Negros Oriental"
  },
  {
    "name": "Guihulngan City",
    "province": "Negros Oriental"
  },
  {
    "name": "Jimalalud",
    "province": "Negros Oriental"
  },
  {
    "name": "La Libertad",
    "province": "Negros Oriental"
  },
  {
    "name": "Mabinay",
    "province": "Negros Oriental"
  },
  {
    "name": "Manjuyod",
    "province": "Negros Oriental"
  },
  {
    "name": "Pamplona",
    "province": "Negros Oriental"
  },
  {
    "name": "San Jose",
    "province": "Negros Oriental"
  },
  {
    "name": "Santa Catalina",
    "province": "Negros Oriental"
  },
  {
    "name": "Siaton",
    "province": "Negros Oriental"
  },
  {
    "name": "Sibulan",
    "province": "Negros Oriental"
  },
  {
    "name": "Tanjay City",
    "province": "Negros Oriental"
  },
  {
    "name": "Tayasan",
    "province": "Negros Oriental"
  },
  {
    "name": "Valencia",
    "province": "Negros Oriental"
  },
  {
    "name": "Vallehermoso",
    "province": "Negros Oriental"
  },
  {
    "name": "Zamboanguita",
    "province": "Negros Oriental"
  },
  {
    "name": "Allen",
    "province": "Northern Samar"
  },
  {
    "name": "Biri",
    "province": "Northern Samar"
  },
  {
    "name": "Bobon",
    "province": "Northern Samar"
  },
  {
    "name": "Capul",
    "province": "Northern Samar"
  },
  {
    "name": "Catarman",
    "province": "Northern Samar"
  },
  {
    "name": "Catubig",
    "province": "Northern Samar"
  },
  {
    "name": "Gamay",
    "province": "Northern Samar"
  },
  {
    "name": "Laoang",
    "province": "Northern Samar"
  },
  {
    "name": "Lapinig",
    "province": "Northern Samar"
  },
  {
    "name": "Las Navas",
    "province": "Northern Samar"
  },
  {
    "name": "Lavezares",
    "province": "Northern Samar"
  },
  {
    "name": "Lope De Vega",
    "province": "Northern Samar"
  },
  {
    "name": "Mapanas",
    "province": "Northern Samar"
  },
  {
    "name": "Mondragon",
    "province": "Northern Samar"
  },
  {
    "name": "Palapag",
    "province": "Northern Samar"
  },
  {
    "name": "Pambujan",
    "province": "Northern Samar"
  },
  {
    "name": "Rosario",
    "province": "Northern Samar"
  },
  {
    "name": "San Antonio",
    "province": "Northern Samar"
  },
  {
    "name": "San Isidro",
    "province": "Northern Samar"
  },
  {
    "name": "San Jose",
    "province": "Northern Samar"
  },
  {
    "name": "San Roque",
    "province": "Northern Samar"
  },
  {
    "name": "San Vicente",
    "province": "Northern Samar"
  },
  {
    "name": "Silvino Lobos",
    "province": "Northern Samar"
  },
  {
    "name": "Victoria",
    "province": "Northern Samar"
  },
  {
    "name": "Aliaga",
    "province": "Nueva Ecija"
  },
  {
    "name": "Bongabon",
    "province": "Nueva Ecija"
  },
  {
    "name": "Cabanatuan City",
    "province": "Nueva Ecija"
  },
  {
    "name": "Cabiao",
    "province": "Nueva Ecija"
  },
  {
    "name": "Carranglan",
    "province": "Nueva Ecija"
  },
  {
    "name": "Cuyapo",
    "province": "Nueva Ecija"
  },
  {
    "name": "Gabaldon Bitulok Sabani",
    "province": "Nueva Ecija"
  },
  {
    "name": "Gapan City",
    "province": "Nueva Ecija"
  },
  {
    "name": "General Mamerto Natividad",
    "province": "Nueva Ecija"
  },
  {
    "name": "General Tinio",
    "province": "Nueva Ecija"
  },
  {
    "name": "Guimba",
    "province": "Nueva Ecija"
  },
  {
    "name": "Jaen",
    "province": "Nueva Ecija"
  },
  {
    "name": "Laur",
    "province": "Nueva Ecija"
  },
  {
    "name": "Licab",
    "province": "Nueva Ecija"
  },
  {
    "name": "Llanera",
    "province": "Nueva Ecija"
  },
  {
    "name": "Lupao",
    "province": "Nueva Ecija"
  },
  {
    "name": "Nampicuan",
    "province": "Nueva Ecija"
  },
  {
    "name": "Palayan City",
    "province": "Nueva Ecija"
  },
  {
    "name": "Pantabangan",
    "province": "Nueva Ecija"
  },
  {
    "name": "Peñaranda",
    "province": "Nueva Ecija"
  },
  {
    "name": "Quezon",
    "province": "Nueva Ecija"
  },
  {
    "name": "Rizal",
    "province": "Nueva Ecija"
  },
  {
    "name": "San Antonio",
    "province": "Nueva Ecija"
  },
  {
    "name": "San Isidro",
    "province": "Nueva Ecija"
  },
  {
    "name": "San Jose City",
    "province": "Nueva Ecija"
  },
  {
    "name": "San Leonardo",
    "province": "Nueva Ecija"
  },
  {
    "name": "Santa Rosa",
    "province": "Nueva Ecija"
  },
  {
    "name": "Santo Domingo",
    "province": "Nueva Ecija"
  },
  {
    "name": "Science City Of Muñoz",
    "province": "Nueva Ecija"
  },
  {
    "name": "Talavera",
    "province": "Nueva Ecija"
  },
  {
    "name": "Talugtug",
    "province": "Nueva Ecija"
  },
  {
    "name": "Zaragoza",
    "province": "Nueva Ecija"
  },
  {
    "name": "Alfonso Castaneda",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Ambaguio",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Aritao",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Bagabag",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Bambang",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Bayombong",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Diadi",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Dupax Del Norte",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Dupax Del Sur",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Kasibu",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Kayapa",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Quezon",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Santa Fe",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Solano",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Villaverde",
    "province": "Nueva Vizcaya"
  },
  {
    "name": "Abra De Ilog",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Calintaan",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Looc",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Lubang",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Magsaysay",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Mamburao",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Paluan",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Rizal",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Sablayan",
    "province": "Occidental Mindoro"
  },
  {
    "name": "San Jose",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Santa Cruz",
    "province": "Occidental Mindoro"
  },
  {
    "name": "Baco",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Bansud",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Bongabong",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Bulalacao",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Calapan City",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Gloria",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Mansalay",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Naujan",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Pinamalayan",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Pola",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Puerto Galera",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Roxas",
    "province": "Oriental Mindoro"
  },
  {
    "name": "San Teodoro",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Socorro",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Victoria",
    "province": "Oriental Mindoro"
  },
  {
    "name": "Aborlan",
    "province": "Palawan"
  },
  {
    "name": "Agutaya",
    "province": "Palawan"
  },
  {
    "name": "Araceli",
    "province": "Palawan"
  },
  {
    "name": "Balabac",
    "province": "Palawan"
  },
  {
    "name": "Bataraza",
    "province": "Palawan"
  },
  {
    "name": "Brooke S Point",
    "province": "Palawan"
  },
  {
    "name": "Busuanga",
    "province": "Palawan"
  },
  {
    "name": "Cagayancillo",
    "province": "Palawan"
  },
  {
    "name": "Coron",
    "province": "Palawan"
  },
  {
    "name": "Culion",
    "province": "Palawan"
  },
  {
    "name": "Cuyo",
    "province": "Palawan"
  },
  {
    "name": "Dumaran",
    "province": "Palawan"
  },
  {
    "name": "El Nido",
    "province": "Palawan"
  },
  {
    "name": "Kalayaan",
    "province": "Palawan"
  },
  {
    "name": "Linapacan",
    "province": "Palawan"
  },
  {
    "name": "Magsaysay",
    "province": "Palawan"
  },
  {
    "name": "Narra",
    "province": "Palawan"
  },
  {
    "name": "Puerto Princesa City",
    "province": "Palawan"
  },
  {
    "name": "Quezon",
    "province": "Palawan"
  },
  {
    "name": "Rizal",
    "province": "Palawan"
  },
  {
    "name": "Roxas",
    "province": "Palawan"
  },
  {
    "name": "San Vicente",
    "province": "Palawan"
  },
  {
    "name": "Sofronio Española",
    "province": "Palawan"
  },
  {
    "name": "Taytay",
    "province": "Palawan"
  },
  {
    "name": "Angeles City",
    "province": "Pampanga"
  },
  {
    "name": "Apalit",
    "province": "Pampanga"
  },
  {
    "name": "Arayat",
    "province": "Pampanga"
  },
  {
    "name": "Bacolor",
    "province": "Pampanga"
  },
  {
    "name": "Candaba",
    "province": "Pampanga"
  },
  {
    "name": "Floridablanca",
    "province": "Pampanga"
  },
  {
    "name": "Guagua",
    "province": "Pampanga"
  },
  {
    "name": "Lubao",
    "province": "Pampanga"
  },
  {
    "name": "Mabalacat City",
    "province": "Pampanga"
  },
  {
    "name": "Macabebe",
    "province": "Pampanga"
  },
  {
    "name": "Magalang",
    "province": "Pampanga"
  },
  {
    "name": "Masantol",
    "province": "Pampanga"
  },
  {
    "name": "Mexico",
    "province": "Pampanga"
  },
  {
    "name": "Minalin",
    "province": "Pampanga"
  },
  {
    "name": "Porac",
    "province": "Pampanga"
  },
  {
    "name": "San Fernando City",
    "province": "Pampanga"
  },
  {
    "name": "San Luis",
    "province": "Pampanga"
  },
  {
    "name": "San Simon",
    "province": "Pampanga"
  },
  {
    "name": "Santa Ana",
    "province": "Pampanga"
  },
  {
    "name": "Santa Rita",
    "province": "Pampanga"
  },
  {
    "name": "Santo Tomas",
    "province": "Pampanga"
  },
  {
    "name": "Sasmuan",
    "province": "Pampanga"
  },
  {
    "name": "Agno",
    "province": "Pangasinan"
  },
  {
    "name": "Aguilar",
    "province": "Pangasinan"
  },
  {
    "name": "Alaminos City",
    "province": "Pangasinan"
  },
  {
    "name": "Alcala",
    "province": "Pangasinan"
  },
  {
    "name": "Anda",
    "province": "Pangasinan"
  },
  {
    "name": "Asingan",
    "province": "Pangasinan"
  },
  {
    "name": "Balungao",
    "province": "Pangasinan"
  },
  {
    "name": "Bani",
    "province": "Pangasinan"
  },
  {
    "name": "Basista",
    "province": "Pangasinan"
  },
  {
    "name": "Bautista",
    "province": "Pangasinan"
  },
  {
    "name": "Bayambang",
    "province": "Pangasinan"
  },
  {
    "name": "Binalonan",
    "province": "Pangasinan"
  },
  {
    "name": "Binmaley",
    "province": "Pangasinan"
  },
  {
    "name": "Bolinao",
    "province": "Pangasinan"
  },
  {
    "name": "Bugallon",
    "province": "Pangasinan"
  },
  {
    "name": "Burgos",
    "province": "Pangasinan"
  },
  {
    "name": "Calasiao",
    "province": "Pangasinan"
  },
  {
    "name": "Dagupan City",
    "province": "Pangasinan"
  },
  {
    "name": "Dasol",
    "province": "Pangasinan"
  },
  {
    "name": "Infanta",
    "province": "Pangasinan"
  },
  {
    "name": "Labrador",
    "province": "Pangasinan"
  },
  {
    "name": "Laoac",
    "province": "Pangasinan"
  },
  {
    "name": "Lingayen",
    "province": "Pangasinan"
  },
  {
    "name": "Mabini",
    "province": "Pangasinan"
  },
  {
    "name": "Malasiqui",
    "province": "Pangasinan"
  },
  {
    "name": "Manaoag",
    "province": "Pangasinan"
  },
  {
    "name": "Mangaldan",
    "province": "Pangasinan"
  },
  {
    "name": "Mangatarem",
    "province": "Pangasinan"
  },
  {
    "name": "Mapandan",
    "province": "Pangasinan"
  },
  {
    "name": "Natividad",
    "province": "Pangasinan"
  },
  {
    "name": "Pozorrubio",
    "province": "Pangasinan"
  },
  {
    "name": "Rosales",
    "province": "Pangasinan"
  },
  {
    "name": "San Carlos City",
    "province": "Pangasinan"
  },
  {
    "name": "San Fabian",
    "province": "Pangasinan"
  },
  {
    "name": "San Jacinto",
    "province": "Pangasinan"
  },
  {
    "name": "San Manuel",
    "province": "Pangasinan"
  },
  {
    "name": "San Nicolas",
    "province": "Pangasinan"
  },
  {
    "name": "San Quintin",
    "province": "Pangasinan"
  },
  {
    "name": "Santa Barbara",
    "province": "Pangasinan"
  },
  {
    "name": "Santa Maria",
    "province": "Pangasinan"
  },
  {
    "name": "Santo Tomas",
    "province": "Pangasinan"
  },
  {
    "name": "Sison",
    "province": "Pangasinan"
  },
  {
    "name": "Sual",
    "province": "Pangasinan"
  },
  {
    "name": "Tayug",
    "province": "Pangasinan"
  },
  {
    "name": "Umingan",
    "province": "Pangasinan"
  },
  {
    "name": "Urbiztondo",
    "province": "Pangasinan"
  },
  {
    "name": "Urdaneta City",
    "province": "Pangasinan"
  },
  {
    "name": "Villasis",
    "province": "Pangasinan"
  },
  {
    "name": "Agdangan",
    "province": "Quezon"
  },
  {
    "name": "Alabat",
    "province": "Quezon"
  },
  {
    "name": "Atimonan",
    "province": "Quezon"
  },
  {
    "name": "Buenavista",
    "province": "Quezon"
  },
  {
    "name": "Burdeos",
    "province": "Quezon"
  },
  {
    "name": "Calauag",
    "province": "Quezon"
  },
  {
    "name": "Candelaria",
    "province": "Quezon"
  },
  {
    "name": "Catanauan",
    "province": "Quezon"
  },
  {
    "name": "Dolores",
    "province": "Quezon"
  },
  {
    "name": "General Luna",
    "province": "Quezon"
  },
  {
    "name": "General Nakar",
    "province": "Quezon"
  },
  {
    "name": "Guinayangan",
    "province": "Quezon"
  },
  {
    "name": "Gumaca",
    "province": "Quezon"
  },
  {
    "name": "Infanta",
    "province": "Quezon"
  },
  {
    "name": "Jomalig",
    "province": "Quezon"
  },
  {
    "name": "Lopez",
    "province": "Quezon"
  },
  {
    "name": "Lucban",
    "province": "Quezon"
  },
  {
    "name": "Lucena City",
    "province": "Quezon"
  },
  {
    "name": "Macalelon",
    "province": "Quezon"
  },
  {
    "name": "Mauban",
    "province": "Quezon"
  },
  {
    "name": "Mulanay",
    "province": "Quezon"
  },
  {
    "name": "Padre Burgos",
    "province": "Quezon"
  },
  {
    "name": "Pagbilao",
    "province": "Quezon"
  },
  {
    "name": "Panukulan",
    "province": "Quezon"
  },
  {
    "name": "Patnanungan",
    "province": "Quezon"
  },
  {
    "name": "Perez",
    "province": "Quezon"
  },
  {
    "name": "Pitogo",
    "province": "Quezon"
  },
  {
    "name": "Plaridel",
    "province": "Quezon"
  },
  {
    "name": "Polillo",
    "province": "Quezon"
  },
  {
    "name": "Quezon",
    "province": "Quezon"
  },
  {
    "name": "Real",
    "province": "Quezon"
  },
  {
    "name": "Sampaloc",
    "province": "Quezon"
  },
  {
    "name": "San Andres",
    "province": "Quezon"
  },
  {
    "name": "San Antonio",
    "province": "Quezon"
  },
  {
    "name": "San Francisco",
    "province": "Quezon"
  },
  {
    "name": "San Narciso",
    "province": "Quezon"
  },
  {
    "name": "Sariaya",
    "province": "Quezon"
  },
  {
    "name": "Tagkawayan",
    "province": "Quezon"
  },
  {
    "name": "Tayabas City",
    "province": "Quezon"
  },
  {
    "name": "Tiaong",
    "province": "Quezon"
  },
  {
    "name": "Unisan",
    "province": "Quezon"
  },
  {
    "name": "Aglipay",
    "province": "Quirino"
  },
  {
    "name": "Cabarroguis",
    "province": "Quirino"
  },
  {
    "name": "Diffun",
    "province": "Quirino"
  },
  {
    "name": "Maddela",
    "province": "Quirino"
  },
  {
    "name": "Nagtipunan",
    "province": "Quirino"
  },
  {
    "name": "Saguday",
    "province": "Quirino"
  },
  {
    "name": "Angono",
    "province": "Rizal"
  },
  {
    "name": "Antipolo City",
    "province": "Rizal"
  },
  {
    "name": "Baras",
    "province": "Rizal"
  },
  {
    "name": "Binangonan",
    "province": "Rizal"
  },
  {
    "name": "Cainta",
    "province": "Rizal"
  },
  {
    "name": "Cardona",
    "province": "Rizal"
  },
  {
    "name": "Jala Jala",
    "province": "Rizal"
  },
  {
    "name": "Morong",
    "province": "Rizal"
  },
  {
    "name": "Pililla",
    "province": "Rizal"
  },
  {
    "name": "Rodriguez",
    "province": "Rizal"
  },
  {
    "name": "San Mateo",
    "province": "Rizal"
  },
  {
    "name": "Tanay",
    "province": "Rizal"
  },
  {
    "name": "Taytay",
    "province": "Rizal"
  },
  {
    "name": "Teresa",
    "province": "Rizal"
  },
  {
    "name": "Alcantara",
    "province": "Romblon"
  },
  {
    "name": "Banton",
    "province": "Romblon"
  },
  {
    "name": "Cajidiocan",
    "province": "Romblon"
  },
  {
    "name": "Calatrava",
    "province": "Romblon"
  },
  {
    "name": "Concepcion",
    "province": "Romblon"
  },
  {
    "name": "Corcuera",
    "province": "Romblon"
  },
  {
    "name": "Ferrol",
    "province": "Romblon"
  },
  {
    "name": "Looc",
    "province": "Romblon"
  },
  {
    "name": "Magdiwang",
    "province": "Romblon"
  },
  {
    "name": "Odiongan",
    "province": "Romblon"
  },
  {
    "name": "Romblon",
    "province": "Romblon"
  },
  {
    "name": "San Agustin",
    "province": "Romblon"
  },
  {
    "name": "San Andres",
    "province": "Romblon"
  },
  {
    "name": "San Fernando",
    "province": "Romblon"
  },
  {
    "name": "San Jose",
    "province": "Romblon"
  },
  {
    "name": "Santa Fe",
    "province": "Romblon"
  },
  {
    "name": "Santa Maria",
    "province": "Romblon"
  },
  {
    "name": "Almagro",
    "province": "Samar"
  },
  {
    "name": "Basey",
    "province": "Samar"
  },
  {
    "name": "Calbayog City",
    "province": "Samar"
  },
  {
    "name": "Calbiga",
    "province": "Samar"
  },
  {
    "name": "Catbalogan City",
    "province": "Samar"
  },
  {
    "name": "Daram",
    "province": "Samar"
  },
  {
    "name": "Gandara",
    "province": "Samar"
  },
  {
    "name": "Hinabangan",
    "province": "Samar"
  },
  {
    "name": "Jiabong",
    "province": "Samar"
  },
  {
    "name": "Marabut",
    "province": "Samar"
  },
  {
    "name": "Matuguinao",
    "province": "Samar"
  },
  {
    "name": "Motiong",
    "province": "Samar"
  },
  {
    "name": "Pagsanghan",
    "province": "Samar"
  },
  {
    "name": "Paranas",
    "province": "Samar"
  },
  {
    "name": "Pinabacdao",
    "province": "Samar"
  },
  {
    "name": "San Jorge",
    "province": "Samar"
  },
  {
    "name": "San Jose De Buan",
    "province": "Samar"
  },
  {
    "name": "San Sebastian",
    "province": "Samar"
  },
  {
    "name": "Santa Margarita",
    "province": "Samar"
  },
  {
    "name": "Santa Rita",
    "province": "Samar"
  },
  {
    "name": "Santo Niño",
    "province": "Samar"
  },
  {
    "name": "Tagapul An",
    "province": "Samar"
  },
  {
    "name": "Talalora",
    "province": "Samar"
  },
  {
    "name": "Tarangnan",
    "province": "Samar"
  },
  {
    "name": "Villareal",
    "province": "Samar"
  },
  {
    "name": "Zumarraga",
    "province": "Samar"
  },
  {
    "name": "Alabel",
    "province": "Sarangani"
  },
  {
    "name": "Glan",
    "province": "Sarangani"
  },
  {
    "name": "Kiamba",
    "province": "Sarangani"
  },
  {
    "name": "Maasim",
    "province": "Sarangani"
  },
  {
    "name": "Maitum",
    "province": "Sarangani"
  },
  {
    "name": "Malapatan",
    "province": "Sarangani"
  },
  {
    "name": "Malungon",
    "province": "Sarangani"
  },
  {
    "name": "Enrique Villanueva",
    "province": "Siquijor"
  },
  {
    "name": "Larena",
    "province": "Siquijor"
  },
  {
    "name": "Lazi",
    "province": "Siquijor"
  },
  {
    "name": "Maria",
    "province": "Siquijor"
  },
  {
    "name": "San Juan",
    "province": "Siquijor"
  },
  {
    "name": "Siquijor",
    "province": "Siquijor"
  },
  {
    "name": "Barcelona",
    "province": "Sorsogon"
  },
  {
    "name": "Bulan",
    "province": "Sorsogon"
  },
  {
    "name": "Bulusan",
    "province": "Sorsogon"
  },
  {
    "name": "Casiguran",
    "province": "Sorsogon"
  },
  {
    "name": "Castilla",
    "province": "Sorsogon"
  },
  {
    "name": "Donsol",
    "province": "Sorsogon"
  },
  {
    "name": "Gubat",
    "province": "Sorsogon"
  },
  {
    "name": "Irosin",
    "province": "Sorsogon"
  },
  {
    "name": "Juban",
    "province": "Sorsogon"
  },
  {
    "name": "Magallanes",
    "province": "Sorsogon"
  },
  {
    "name": "Matnog",
    "province": "Sorsogon"
  },
  {
    "name": "Pilar",
    "province": "Sorsogon"
  },
  {
    "name": "Prieto Diaz",
    "province": "Sorsogon"
  },
  {
    "name": "Santa Magdalena",
    "province": "Sorsogon"
  },
  {
    "name": "Sorsogon City",
    "province": "Sorsogon"
  },
  {
    "name": "Banga",
    "province": "South Cotabato"
  },
  {
    "name": "General Santos City",
    "province": "South Cotabato"
  },
  {
    "name": "Koronadal City",
    "province": "South Cotabato"
  },
  {
    "name": "Lake Sebu",
    "province": "South Cotabato"
  },
  {
    "name": "Norala",
    "province": "South Cotabato"
  },
  {
    "name": "Polomolok",
    "province": "South Cotabato"
  },
  {
    "name": "Santo Niño",
    "province": "South Cotabato"
  },
  {
    "name": "Surallah",
    "province": "South Cotabato"
  },
  {
    "name": "T Boli",
    "province": "South Cotabato"
  },
  {
    "name": "Tampakan",
    "province": "South Cotabato"
  },
  {
    "name": "Tantangan",
    "province": "South Cotabato"
  },
  {
    "name": "Tupi",
    "province": "South Cotabato"
  },
  {
    "name": "Anahawan",
    "province": "Southern Leyte"
  },
  {
    "name": "Bontoc",
    "province": "Southern Leyte"
  },
  {
    "name": "Hinunangan",
    "province": "Southern Leyte"
  },
  {
    "name": "Hinundayan",
    "province": "Southern Leyte"
  },
  {
    "name": "Libagon",
    "province": "Southern Leyte"
  },
  {
    "name": "Liloan",
    "province": "Southern Leyte"
  },
  {
    "name": "Limasawa",
    "province": "Southern Leyte"
  },
  {
    "name": "Maasin City",
    "province": "Southern Leyte"
  },
  {
    "name": "Macrohon",
    "province": "Southern Leyte"
  },
  {
    "name": "Malitbog",
    "province": "Southern Leyte"
  },
  {
    "name": "Padre Burgos",
    "province": "Southern Leyte"
  },
  {
    "name": "Pintuyan",
    "province": "Southern Leyte"
  },
  {
    "name": "Saint Bernard",
    "province": "Southern Leyte"
  },
  {
    "name": "San Francisco",
    "province": "Southern Leyte"
  },
  {
    "name": "San Juan",
    "province": "Southern Leyte"
  },
  {
    "name": "San Ricardo",
    "province": "Southern Leyte"
  },
  {
    "name": "Silago",
    "province": "Southern Leyte"
  },
  {
    "name": "Sogod",
    "province": "Southern Leyte"
  },
  {
    "name": "Tomas Oppus",
    "province": "Southern Leyte"
  },
  {
    "name": "Bagumbayan",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Columbio",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Esperanza",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Isulan",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Kalamansig",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Lambayong",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Lebak",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Lutayan",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Palimbang",
    "province": "Sultan Kudarat"
  },
  {
    "name": "President Quirino",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Sen Ninoy Aquino",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Tacurong City",
    "province": "Sultan Kudarat"
  },
  {
    "name": "Hadji Panglima Tahil",
    "province": "Sulu"
  },
  {
    "name": "Indanan",
    "province": "Sulu"
  },
  {
    "name": "Jolo",
    "province": "Sulu"
  },
  {
    "name": "Kalingalan Caluang",
    "province": "Sulu"
  },
  {
    "name": "Lugus",
    "province": "Sulu"
  },
  {
    "name": "Luuk",
    "province": "Sulu"
  },
  {
    "name": "Maimbung",
    "province": "Sulu"
  },
  {
    "name": "Old Panamao",
    "province": "Sulu"
  },
  {
    "name": "Omar",
    "province": "Sulu"
  },
  {
    "name": "Pandami",
    "province": "Sulu"
  },
  {
    "name": "Panglima Estino",
    "province": "Sulu"
  },
  {
    "name": "Pangutaran",
    "province": "Sulu"
  },
  {
    "name": "Parang",
    "province": "Sulu"
  },
  {
    "name": "Pata",
    "province": "Sulu"
  },
  {
    "name": "Patikul",
    "province": "Sulu"
  },
  {
    "name": "Siasi",
    "province": "Sulu"
  },
  {
    "name": "Talipao",
    "province": "Sulu"
  },
  {
    "name": "Tapul",
    "province": "Sulu"
  },
  {
    "name": "Tongkil",
    "province": "Sulu"
  },
  {
    "name": "Alegria",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Bacuag",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Burgos",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Claver",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Dapa",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Del Carmen",
    "province": "Surigao Del Norte"
  },
  {
    "name": "General Luna",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Gigaquit",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Mainit",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Malimono",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Pilar",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Placer",
    "province": "Surigao Del Norte"
  },
  {
    "name": "San Benito",
    "province": "Surigao Del Norte"
  },
  {
    "name": "San Francisco Anao Aon",
    "province": "Surigao Del Norte"
  },
  {
    "name": "San Isidro",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Santa Monica",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Sison",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Socorro",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Surigao City",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Tagana An",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Tubod",
    "province": "Surigao Del Norte"
  },
  {
    "name": "Barobo",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Bayabas",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Bislig City",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Cagwait",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Cantilan",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Carmen",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Carrascal",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Cortes",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Hinatuan",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Lanuza",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Lianga",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Lingig",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Madrid",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Marihatag",
    "province": "Surigao Del Sur"
  },
  {
    "name": "San Agustin",
    "province": "Surigao Del Sur"
  },
  {
    "name": "San Miguel",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Tagbina",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Tago",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Tandag City",
    "province": "Surigao Del Sur"
  },
  {
    "name": "Anao",
    "province": "Tarlac"
  },
  {
    "name": "Bamban",
    "province": "Tarlac"
  },
  {
    "name": "Camiling",
    "province": "Tarlac"
  },
  {
    "name": "Capas",
    "province": "Tarlac"
  },
  {
    "name": "Concepcion",
    "province": "Tarlac"
  },
  {
    "name": "Gerona",
    "province": "Tarlac"
  },
  {
    "name": "La Paz",
    "province": "Tarlac"
  },
  {
    "name": "Mayantoc",
    "province": "Tarlac"
  },
  {
    "name": "Moncada",
    "province": "Tarlac"
  },
  {
    "name": "Paniqui",
    "province": "Tarlac"
  },
  {
    "name": "Pura",
    "province": "Tarlac"
  },
  {
    "name": "Ramos",
    "province": "Tarlac"
  },
  {
    "name": "San Clemente",
    "province": "Tarlac"
  },
  {
    "name": "San Jose",
    "province": "Tarlac"
  },
  {
    "name": "San Manuel",
    "province": "Tarlac"
  },
  {
    "name": "Santa Ignacia",
    "province": "Tarlac"
  },
  {
    "name": "Tarlac City",
    "province": "Tarlac"
  },
  {
    "name": "Victoria",
    "province": "Tarlac"
  },
  {
    "name": "Bongao",
    "province": "Tawi Tawi"
  },
  {
    "name": "Languyan",
    "province": "Tawi Tawi"
  },
  {
    "name": "Mapun Cagayan De Tawi Tawi",
    "province": "Tawi Tawi"
  },
  {
    "name": "Panglima Sugala",
    "province": "Tawi Tawi"
  },
  {
    "name": "Sapa Sapa",
    "province": "Tawi Tawi"
  },
  {
    "name": "Sibutu",
    "province": "Tawi Tawi"
  },
  {
    "name": "Simunul",
    "province": "Tawi Tawi"
  },
  {
    "name": "Sitangkai",
    "province": "Tawi Tawi"
  },
  {
    "name": "South Ubian",
    "province": "Tawi Tawi"
  },
  {
    "name": "Tandubas",
    "province": "Tawi Tawi"
  },
  {
    "name": "Turtle Islands",
    "province": "Tawi Tawi"
  },
  {
    "name": "Botolan",
    "province": "Zambales"
  },
  {
    "name": "Cabangan",
    "province": "Zambales"
  },
  {
    "name": "Candelaria",
    "province": "Zambales"
  },
  {
    "name": "Castillejos",
    "province": "Zambales"
  },
  {
    "name": "Iba",
    "province": "Zambales"
  },
  {
    "name": "Masinloc",
    "province": "Zambales"
  },
  {
    "name": "Olongapo City",
    "province": "Zambales"
  },
  {
    "name": "Palauig",
    "province": "Zambales"
  },
  {
    "name": "San Antonio",
    "province": "Zambales"
  },
  {
    "name": "San Felipe",
    "province": "Zambales"
  },
  {
    "name": "San Marcelino",
    "province": "Zambales"
  },
  {
    "name": "San Narciso",
    "province": "Zambales"
  },
  {
    "name": "Santa Cruz",
    "province": "Zambales"
  },
  {
    "name": "Subic",
    "province": "Zambales"
  },
  {
    "name": "Bacungan Leon T Postigo",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Baliguian",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Dapitan City",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Dipolog City",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Godod",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Gutalac",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Jose Dalman",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Kalawit",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Katipunan",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "La Libertad",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Labason",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Liloy",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Manukan",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Mutia",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Piñan New Piñan",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Polanco",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Pres Manuel A Roxas",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Rizal",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Salug",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Sergio Osmeña Sr",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Siayan",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Sibuco",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Sibutad",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Sindangan",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Siocon",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Sirawai",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Tampilisan",
    "province": "Zamboanga Del Norte"
  },
  {
    "name": "Aurora",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Bayog",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Dimataling",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Dinas",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Dumalinao",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Dumingag",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Guipos",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Josefina",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Kumalarang",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Labangan",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Lakewood",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Lapuyan",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Mahayag",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Margosatubig",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Midsalip",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Molave",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Pagadian City",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Pitogo",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Ramon Magsaysay",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "San Miguel",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "San Pablo",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Sominot",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Tabina",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Tambulig",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Tigbao",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Tukuran",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Vincenzo A Sagun",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Zamboanga City",
    "province": "Zamboanga Del Sur"
  },
  {
    "name": "Alicia",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Buug",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Diplahan",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Imelda",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Ipil",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Kabasalan",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Mabuhay",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Malangas",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Naga",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Olutanga",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Payao",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Roseller Lim",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Siay",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Talusan",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Titay",
    "province": "Zamboanga Sibugay"
  },
  {
    "name": "Tungawan",
    "province": "Zamboanga Sibugay"
  }
];

export function getCitiesForProvince(province: string): string[] {
  return PH_CITIES.filter(c => c.province === province).map(c => c.name);
}
