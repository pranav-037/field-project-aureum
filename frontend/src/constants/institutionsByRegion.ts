export type InstitutionType =
  | 'Auction House'
  | 'Gallery & Dealer'
  | 'Authentication Lab / Registry'
  | 'Museum & Cultural Foundation';

export interface InstitutionOption {
  name: string;
  type: InstitutionType;
}

export const REGIONS_AND_INSTITUTIONS: Record<string, InstitutionOption[]> = {
  "India": [
    { name: "Saffronart", type: "Auction House" },
    { name: "AstaGuru Auction House", type: "Auction House" },
    { name: "Pundole's Auction House", type: "Auction House" },
    { name: "DAG (Delhi Art Gallery)", type: "Gallery & Dealer" },
    { name: "Nature Morte", type: "Gallery & Dealer" },
    { name: "Chemould Prescott Road", type: "Gallery & Dealer" },
    { name: "Vadehra Art Gallery", type: "Gallery & Dealer" },
    { name: "Experimenter Gallery", type: "Gallery & Dealer" },
    { name: "Gallery Espace", type: "Gallery & Dealer" },
    { name: "Jhaveri Contemporary", type: "Gallery & Dealer" },
    { name: "Galerie Mirchandani + Steinruecke", type: "Gallery & Dealer" },
    { name: "Emami Art", type: "Gallery & Dealer" },
    { name: "Gallery Sumukha", type: "Gallery & Dealer" },
    { name: "Apparao Galleries", type: "Gallery & Dealer" },
    { name: "Tarq", type: "Gallery & Dealer" },
    { name: "CSMVS Art Conservation Centre", type: "Authentication Lab / Registry" },
    { name: "INTACH Art Conservation Centre (ICI)", type: "Authentication Lab / Registry" },
    { name: "National Museum Conservation Laboratory", type: "Authentication Lab / Registry" },
    { name: "Indian Museum Conservation Unit", type: "Authentication Lab / Registry" },
    { name: "National Gallery of Modern Art (NGMA)", type: "Museum & Cultural Foundation" },
    { name: "Kiran Nadar Museum of Art (KNMA)", type: "Museum & Cultural Foundation" },
    { name: "Museum of Art & Photography (MAP)", type: "Museum & Cultural Foundation" },
    { name: "Salar Jung Museum Board", type: "Museum & Cultural Foundation" },
    { name: "Victoria Memorial Hall Curatorial Board", type: "Museum & Cultural Foundation" },
    { name: "Piramal Museum of Art", type: "Museum & Cultural Foundation" }
  ],
  "United States": [
    { name: "Sotheby's United States", type: "Auction House" },
    { name: "Christie's United States", type: "Auction House" },
    { name: "Phillips New York", type: "Auction House" },
    { name: "Heritage Auctions", type: "Auction House" },
    { name: "Bonhams US", type: "Auction House" },
    { name: "Gagosian", type: "Gallery & Dealer" },
    { name: "David Zwirner", type: "Gallery & Dealer" },
    { name: "Pace Gallery", type: "Gallery & Dealer" },
    { name: "Hauser & Wirth US", type: "Gallery & Dealer" },
    { name: "Gladstone Gallery", type: "Gallery & Dealer" },
    { name: "Matthew Marks Gallery", type: "Gallery & Dealer" },
    { name: "IFAR (International Foundation for Art Research)", type: "Authentication Lab / Registry" },
    { name: "Metropolitan Art Authentication Guild", type: "Authentication Lab / Registry" },
    { name: "Getty Conservation Institute (GCI)", type: "Authentication Lab / Registry" },
    { name: "Winterthur Scientific Research Analysis Lab", type: "Authentication Lab / Registry" },
    { name: "The Metropolitan Museum of Art (The Met)", type: "Museum & Cultural Foundation" },
    { name: "Museum of Modern Art (MoMA)", type: "Museum & Cultural Foundation" },
    { name: "Solomon R. Guggenheim Museum", type: "Museum & Cultural Foundation" },
    { name: "National Gallery of Art (Washington D.C.)", type: "Museum & Cultural Foundation" },
    { name: "Los Angeles County Museum of Art (LACMA)", type: "Museum & Cultural Foundation" },
    { name: "Art Institute of Chicago", type: "Museum & Cultural Foundation" }
  ],
  "United Kingdom": [
    { name: "Christie's King Street", type: "Auction House" },
    { name: "Sotheby's New Bond Street", type: "Auction House" },
    { name: "Bonhams 1793 London", type: "Auction House" },
    { name: "Phillips London", type: "Auction House" },
    { name: "White Cube", type: "Gallery & Dealer" },
    { name: "Lisson Gallery", type: "Gallery & Dealer" },
    { name: "Victoria Miro", type: "Gallery & Dealer" },
    { name: "Sadie Coles HQ", type: "Gallery & Dealer" },
    { name: "Art Loss Register (ALR)", type: "Authentication Lab / Registry" },
    { name: "Hamilton Kerr Institute (University of Cambridge)", type: "Authentication Lab / Registry" },
    { name: "Tate (Modern & Britain)", type: "Museum & Cultural Foundation" },
    { name: "The National Gallery, London", type: "Museum & Cultural Foundation" },
    { name: "Victoria and Albert Museum (V&A)", type: "Museum & Cultural Foundation" },
    { name: "The British Museum Department of Conservation", type: "Museum & Cultural Foundation" }
  ],
  "Switzerland": [
    { name: "Sotheby's Geneva & Zurich", type: "Auction House" },
    { name: "Christie's Zurich", type: "Auction House" },
    { name: "Galerie Kornfeld (Bern)", type: "Auction House" },
    { name: "Hauser & Wirth Zurich & St. Moritz", type: "Gallery & Dealer" },
    { name: "Galerie Gmurzynska", type: "Gallery & Dealer" },
    { name: "Swiss Institute for Art Research (SIK-ISEA)", type: "Authentication Lab / Registry" },
    { name: "Geneva FreePort Art Verification Office", type: "Authentication Lab / Registry" },
    { name: "Kunsthaus Zürich", type: "Museum & Cultural Foundation" },
    { name: "Fondation Beyeler (Basel)", type: "Museum & Cultural Foundation" },
    { name: "Kunstmuseum Basel", type: "Museum & Cultural Foundation" }
  ],
  "France": [
    { name: "Sotheby's Paris", type: "Auction House" },
    { name: "Christie's Paris", type: "Auction House" },
    { name: "Artcurial Paris", type: "Auction House" },
    { name: "Hôtel Drouot Chamber of Auctioneers", type: "Auction House" },
    { name: "Galerie Perrotin", type: "Gallery & Dealer" },
    { name: "Thaddaeus Ropac Paris", type: "Gallery & Dealer" },
    { name: "Almine Rech", type: "Gallery & Dealer" },
    { name: "C2RMF (Centre de Recherche et de Restauration des Musées de France)", type: "Authentication Lab / Registry" },
    { name: "Musée du Louvre Curatorial Dept.", type: "Museum & Cultural Foundation" },
    { name: "Centre Pompidou National Museum", type: "Museum & Cultural Foundation" },
    { name: "Musée d'Orsay", type: "Museum & Cultural Foundation" }
  ],
  "Germany": [
    { name: "Ketterer Kunst", type: "Auction House" },
    { name: "Lempertz", type: "Auction House" },
    { name: "Grisebach", type: "Auction House" },
    { name: "Galerie Max Hetzler", type: "Gallery & Dealer" },
    { name: "Sprüth Magers", type: "Gallery & Dealer" },
    { name: "Doerner Institut (Bavarian State Painting Collections)", type: "Authentication Lab / Registry" },
    { name: "Rathgen Heritage Science Laboratory (Berlin)", type: "Authentication Lab / Registry" },
    { name: "Staatliche Museen zu Berlin", type: "Museum & Cultural Foundation" },
    { name: "Städel Museum (Frankfurt)", type: "Museum & Cultural Foundation" }
  ],
  "Italy": [
    { name: "Pandolfini Casa d'Aste", type: "Auction House" },
    { name: "Finarte Auctions", type: "Auction House" },
    { name: "Galleria Continua", type: "Gallery & Dealer" },
    { name: "Massimo De Carlo", type: "Gallery & Dealer" },
    { name: "Istituto Centrale per il Restauro (ICR Rome)", type: "Authentication Lab / Registry" },
    { name: "Opificio delle Pietre Dure (Florence)", type: "Authentication Lab / Registry" },
    { name: "Gallerie degli Uffizi (Florence)", type: "Museum & Cultural Foundation" },
    { name: "Pinacoteca di Brera (Milan)", type: "Museum & Cultural Foundation" }
  ],
  "Japan": [
    { name: "Mainichi Auction Tokyo", type: "Auction House" },
    { name: "Shinwa Auction", type: "Auction House" },
    { name: "SBI Art Auction", type: "Auction House" },
    { name: "Mizuma Art Gallery", type: "Gallery & Dealer" },
    { name: "SCAI The Bathhouse", type: "Gallery & Dealer" },
    { name: "Ota Fine Arts", type: "Gallery & Dealer" },
    { name: "Tokyo National Research Institute for Cultural Properties (Tobunken)", type: "Authentication Lab / Registry" },
    { name: "National Museum of Modern Art Tokyo (MOMAT)", type: "Museum & Cultural Foundation" },
    { name: "Mori Art Museum", type: "Museum & Cultural Foundation" }
  ],
  "South Korea": [
    { name: "Seoul Auction", type: "Auction House" },
    { name: "K Auction", type: "Auction House" },
    { name: "Kukje Gallery", type: "Gallery & Dealer" },
    { name: "Gallery Hyundai", type: "Gallery & Dealer" },
    { name: "PKM Gallery", type: "Gallery & Dealer" },
    { name: "MMCA Art Conservation Center", type: "Authentication Lab / Registry" },
    { name: "Leeum, Samsung Museum of Art", type: "Museum & Cultural Foundation" },
    { name: "National Museum of Modern and Contemporary Art (MMCA)", type: "Museum & Cultural Foundation" }
  ],
  "Singapore": [
    { name: "Sotheby's Singapore", type: "Auction House" },
    { name: "Christie's Singapore", type: "Auction House" },
    { name: "Yavuz Gallery", type: "Gallery & Dealer" },
    { name: "Gajah Gallery", type: "Gallery & Dealer" },
    { name: "STPI Creative Workshop & Gallery", type: "Gallery & Dealer" },
    { name: "Heritage Conservation Centre (HCC Singapore)", type: "Authentication Lab / Registry" },
    { name: "Le Freeport Singapore Vaults", type: "Authentication Lab / Registry" },
    { name: "National Gallery Singapore", type: "Museum & Cultural Foundation" },
    { name: "Singapore Art Museum (SAM)", type: "Museum & Cultural Foundation" }
  ],
  "United Arab Emirates": [
    { name: "Christie's Dubai (DIFC)", type: "Auction House" },
    { name: "Sotheby's UAE (DIFC & Abu Dhabi)", type: "Auction House" },
    { name: "The Third Line (Dubai)", type: "Gallery & Dealer" },
    { name: "Custot Gallery Dubai", type: "Gallery & Dealer" },
    { name: "Green Art Gallery", type: "Gallery & Dealer" },
    { name: "Louvre Abu Dhabi Scientific Research Lab", type: "Authentication Lab / Registry" },
    { name: "Louvre Abu Dhabi Curatorial Bureau", type: "Museum & Cultural Foundation" },
    { name: "Guggenheim Abu Dhabi Office", type: "Museum & Cultural Foundation" },
    { name: "Sharjah Art Foundation", type: "Museum & Cultural Foundation" }
  ],
  "Australia": [
    { name: "Menzies Art Brands", type: "Auction House" },
    { name: "Smith & Singer Fine Art", type: "Auction House" },
    { name: "Deutscher and Hackett", type: "Auction House" },
    { name: "Sullivan+Strumpf", type: "Gallery & Dealer" },
    { name: "Roslyn Oxley9 Gallery", type: "Gallery & Dealer" },
    { name: "Art Gallery of New South Wales Conservation", type: "Authentication Lab / Registry" },
    { name: "National Gallery of Victoria (NGV)", type: "Museum & Cultural Foundation" },
    { name: "Museum of Contemporary Art Australia (MCA)", type: "Museum & Cultural Foundation" }
  ]
};
