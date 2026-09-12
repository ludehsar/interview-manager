export type CountryEntry = {
  code: string
  label: string
  aliases: string[]
}

export type CityEntry = {
  slug: string
  label: string
  country: string
  aliases: string[]
}

export const COUNTRIES: CountryEntry[] = [
  { code: 'BD', label: 'Bangladesh', aliases: ['bangladesh', 'bd'] },
  { code: 'IN', label: 'India', aliases: ['india'] },
  { code: 'PK', label: 'Pakistan', aliases: ['pakistan'] },
  { code: 'LK', label: 'Sri Lanka', aliases: ['sri lanka'] },
  { code: 'NP', label: 'Nepal', aliases: ['nepal'] },
  { code: 'SG', label: 'Singapore', aliases: ['singapore'] },
  { code: 'MY', label: 'Malaysia', aliases: ['malaysia'] },
  { code: 'ID', label: 'Indonesia', aliases: ['indonesia'] },
  { code: 'TH', label: 'Thailand', aliases: ['thailand'] },
  { code: 'VN', label: 'Vietnam', aliases: ['vietnam', 'viet nam'] },
  { code: 'PH', label: 'Philippines', aliases: ['philippines'] },
  { code: 'HK', label: 'Hong Kong', aliases: ['hong kong'] },
  { code: 'TW', label: 'Taiwan', aliases: ['taiwan'] },
  { code: 'JP', label: 'Japan', aliases: ['japan'] },
  { code: 'KR', label: 'South Korea', aliases: ['south korea', 'korea', 'republic of korea'] },
  { code: 'CN', label: 'China', aliases: ['china', 'mainland china'] },
  { code: 'AU', label: 'Australia', aliases: ['australia'] },
  { code: 'NZ', label: 'New Zealand', aliases: ['new zealand'] },
  { code: 'US', label: 'United States', aliases: ['united states', 'united states of america', 'usa', 'u s a', 'us', 'america'] },
  { code: 'CA', label: 'Canada', aliases: ['canada'] },
  { code: 'MX', label: 'Mexico', aliases: ['mexico'] },
  { code: 'BR', label: 'Brazil', aliases: ['brazil', 'brasil'] },
  { code: 'AR', label: 'Argentina', aliases: ['argentina'] },
  { code: 'CL', label: 'Chile', aliases: ['chile'] },
  { code: 'CO', label: 'Colombia', aliases: ['colombia'] },
  { code: 'GB', label: 'United Kingdom', aliases: ['united kingdom', 'uk', 'great britain', 'england', 'scotland', 'wales', 'northern ireland'] },
  { code: 'IE', label: 'Ireland', aliases: ['ireland'] },
  { code: 'DE', label: 'Germany', aliases: ['germany', 'deutschland'] },
  { code: 'FR', label: 'France', aliases: ['france'] },
  { code: 'ES', label: 'Spain', aliases: ['spain', 'espana'] },
  { code: 'PT', label: 'Portugal', aliases: ['portugal'] },
  { code: 'IT', label: 'Italy', aliases: ['italy', 'italia'] },
  { code: 'NL', label: 'Netherlands', aliases: ['netherlands', 'holland'] },
  { code: 'BE', label: 'Belgium', aliases: ['belgium'] },
  { code: 'LU', label: 'Luxembourg', aliases: ['luxembourg'] },
  { code: 'PL', label: 'Poland', aliases: ['poland', 'polska'] },
  { code: 'CZ', label: 'Czechia', aliases: ['czechia', 'czech republic'] },
  { code: 'SK', label: 'Slovakia', aliases: ['slovakia'] },
  { code: 'HU', label: 'Hungary', aliases: ['hungary'] },
  { code: 'RO', label: 'Romania', aliases: ['romania'] },
  { code: 'BG', label: 'Bulgaria', aliases: ['bulgaria'] },
  { code: 'GR', label: 'Greece', aliases: ['greece'] },
  { code: 'HR', label: 'Croatia', aliases: ['croatia'] },
  { code: 'RS', label: 'Serbia', aliases: ['serbia'] },
  { code: 'SE', label: 'Sweden', aliases: ['sweden'] },
  { code: 'NO', label: 'Norway', aliases: ['norway'] },
  { code: 'DK', label: 'Denmark', aliases: ['denmark'] },
  { code: 'FI', label: 'Finland', aliases: ['finland'] },
  { code: 'IS', label: 'Iceland', aliases: ['iceland'] },
  { code: 'EE', label: 'Estonia', aliases: ['estonia'] },
  { code: 'LV', label: 'Latvia', aliases: ['latvia'] },
  { code: 'LT', label: 'Lithuania', aliases: ['lithuania'] },
  { code: 'CH', label: 'Switzerland', aliases: ['switzerland'] },
  { code: 'AT', label: 'Austria', aliases: ['austria'] },
  { code: 'UA', label: 'Ukraine', aliases: ['ukraine'] },
  { code: 'TR', label: 'Turkey', aliases: ['turkey', 'turkiye'] },
  { code: 'IL', label: 'Israel', aliases: ['israel'] },
  { code: 'AE', label: 'United Arab Emirates', aliases: ['united arab emirates', 'uae'] },
  { code: 'SA', label: 'Saudi Arabia', aliases: ['saudi arabia', 'ksa'] },
  { code: 'QA', label: 'Qatar', aliases: ['qatar'] },
  { code: 'KW', label: 'Kuwait', aliases: ['kuwait'] },
  { code: 'BH', label: 'Bahrain', aliases: ['bahrain'] },
  { code: 'OM', label: 'Oman', aliases: ['oman'] },
  { code: 'JO', label: 'Jordan', aliases: ['jordan'] },
  { code: 'EG', label: 'Egypt', aliases: ['egypt'] },
  { code: 'MA', label: 'Morocco', aliases: ['morocco'] },
  { code: 'NG', label: 'Nigeria', aliases: ['nigeria'] },
  { code: 'KE', label: 'Kenya', aliases: ['kenya'] },
  { code: 'GH', label: 'Ghana', aliases: ['ghana'] },
  { code: 'ZA', label: 'South Africa', aliases: ['south africa'] },
  { code: 'MU', label: 'Mauritius', aliases: ['mauritius'] },
  { code: 'MV', label: 'Maldives', aliases: ['maldives'] },
  { code: 'BT', label: 'Bhutan', aliases: ['bhutan'] },
  { code: 'MM', label: 'Myanmar', aliases: ['myanmar', 'burma'] },
  { code: 'KH', label: 'Cambodia', aliases: ['cambodia'] },
  { code: 'MN', label: 'Mongolia', aliases: ['mongolia'] },
  { code: 'FJ', label: 'Fiji', aliases: ['fiji'] },
]

const BD_DISTRICTS: [string, string][] = [
  ['dhaka', 'Dhaka'],
  ['chattogram', 'Chattogram'],
  ['khulna', 'Khulna'],
  ['rajshahi', 'Rajshahi'],
  ['sylhet', 'Sylhet'],
  ['barishal', 'Barishal'],
  ['rangpur', 'Rangpur'],
  ['mymensingh', 'Mymensingh'],
  ['gazipur', 'Gazipur'],
  ['narayanganj', 'Narayanganj'],
  ['cumilla', 'Cumilla'],
  ['bogura', 'Bogura'],
  ['jashore', 'Jashore'],
  ['cox-s-bazar', "Cox's Bazar"],
  ['savar', 'Savar'],
  ['tangail', 'Tangail'],
  ['narsingdi', 'Narsingdi'],
  ['manikganj', 'Manikganj'],
  ['munshiganj', 'Munshiganj'],
  ['faridpur', 'Faridpur'],
  ['gopalganj', 'Gopalganj'],
  ['madaripur', 'Madaripur'],
  ['shariatpur', 'Shariatpur'],
  ['rajbari', 'Rajbari'],
  ['kishoreganj', 'Kishoreganj'],
  ['netrokona', 'Netrokona'],
  ['jamalpur', 'Jamalpur'],
  ['sherpur', 'Sherpur'],
  ['noakhali', 'Noakhali'],
  ['feni', 'Feni'],
  ['chandpur', 'Chandpur'],
  ['lakshmipur', 'Lakshmipur'],
  ['brahmanbaria', 'Brahmanbaria'],
  ['khagrachhari', 'Khagrachhari'],
  ['rangamati', 'Rangamati'],
  ['bandarban', 'Bandarban'],
  ['habiganj', 'Habiganj'],
  ['moulvibazar', 'Moulvibazar'],
  ['sunamganj', 'Sunamganj'],
  ['kushtia', 'Kushtia'],
  ['jhenaidah', 'Jhenaidah'],
  ['magura', 'Magura'],
  ['meherpur', 'Meherpur'],
  ['chuadanga', 'Chuadanga'],
  ['narail', 'Narail'],
  ['satkhira', 'Satkhira'],
  ['bagerhat', 'Bagerhat'],
  ['pabna', 'Pabna'],
  ['sirajganj', 'Sirajganj'],
  ['natore', 'Natore'],
  ['naogaon', 'Naogaon'],
  ['joypurhat', 'Joypurhat'],
  ['chapainawabganj', 'Chapainawabganj'],
  ['dinajpur', 'Dinajpur'],
  ['thakurgaon', 'Thakurgaon'],
  ['panchagarh', 'Panchagarh'],
  ['nilphamari', 'Nilphamari'],
  ['lalmonirhat', 'Lalmonirhat'],
  ['kurigram', 'Kurigram'],
  ['gaibandha', 'Gaibandha'],
  ['bhola', 'Bhola'],
  ['patuakhali', 'Patuakhali'],
  ['barguna', 'Barguna'],
  ['pirojpur', 'Pirojpur'],
  ['jhalakathi', 'Jhalakathi'],
]

const BD_EXTRA_ALIASES: Record<string, string[]> = {
  dhaka: [
    'gulshan',
    'banani',
    'dhanmondi',
    'motijheel',
    'mohakhali',
    'uttara',
    'mirpur',
    'badda',
    'banasree',
    'bashundhara ra',
    'basundhara ra',
    'tejgaon',
    'farmgate',
    'nikunja',
    'mohammadpur',
    'old dhaka',
    'panthapath',
    'kawran bazar',
    'karwan bazar',
    'baridhara',
    'shyamoli',
  ],
  chattogram: ['chittagong', 'agrabad', 'chattogram epz', 'pahartali'],
  gazipur: ['tongi', 'kaliakair', 'sreepur'],
  savar: ['ashulia', 'hemayetpur'],
  cumilla: ['comilla', 'debidwar'],
  jashore: ['jessore'],
  bogura: ['bogra'],
  barishal: ['barisal'],
  chapainawabganj: ['nawabganj'],
  khagrachhari: ['khagrachari'],
  moulvibazar: ['maulvibazar', 'srimangal'],
  brahmanbaria: ['b baria'],
}

const GLOBAL_CITIES: [string, string, string, string[]][] = [
  ['bengaluru', 'Bengaluru', 'IN', ['bangalore', 'bengaluru']],
  ['mumbai', 'Mumbai', 'IN', ['mumbai', 'bombay']],
  ['delhi', 'Delhi', 'IN', ['delhi', 'new delhi', 'noida', 'gurugram', 'gurgaon', 'ncr']],
  ['hyderabad', 'Hyderabad', 'IN', ['hyderabad']],
  ['pune', 'Pune', 'IN', ['pune']],
  ['chennai', 'Chennai', 'IN', ['chennai', 'madras']],
  ['kolkata', 'Kolkata', 'IN', ['kolkata', 'calcutta']],
  ['ahmedabad', 'Ahmedabad', 'IN', ['ahmedabad']],
  ['kochi', 'Kochi', 'IN', ['kochi', 'cochin']],
  ['jaipur', 'Jaipur', 'IN', ['jaipur']],
  ['indore', 'Indore', 'IN', ['indore']],
  ['karachi', 'Karachi', 'PK', ['karachi']],
  ['lahore', 'Lahore', 'PK', ['lahore']],
  ['islamabad', 'Islamabad', 'PK', ['islamabad', 'rawalpindi']],
  ['colombo', 'Colombo', 'LK', ['colombo']],
  ['kathmandu', 'Kathmandu', 'NP', ['kathmandu']],
  ['singapore', 'Singapore', 'SG', ['singapore']],
  ['kuala-lumpur', 'Kuala Lumpur', 'MY', ['kuala lumpur', 'petaling jaya', 'cyberjaya']],
  ['jakarta', 'Jakarta', 'ID', ['jakarta']],
  ['bangkok', 'Bangkok', 'TH', ['bangkok']],
  ['hanoi', 'Hanoi', 'VN', ['hanoi', 'ha noi']],
  ['ho-chi-minh-city', 'Ho Chi Minh City', 'VN', ['ho chi minh', 'ho chi minh city', 'saigon']],
  ['manila', 'Manila', 'PH', ['manila', 'makati', 'taguig', 'quezon city']],
  ['cebu', 'Cebu', 'PH', ['cebu']],
  ['hong-kong', 'Hong Kong', 'HK', ['hong kong']],
  ['taipei', 'Taipei', 'TW', ['taipei']],
  ['tokyo', 'Tokyo', 'JP', ['tokyo']],
  ['osaka', 'Osaka', 'JP', ['osaka']],
  ['seoul', 'Seoul', 'KR', ['seoul']],
  ['shanghai', 'Shanghai', 'CN', ['shanghai']],
  ['beijing', 'Beijing', 'CN', ['beijing', 'peking']],
  ['shenzhen', 'Shenzhen', 'CN', ['shenzhen']],
  ['sydney', 'Sydney', 'AU', ['sydney']],
  ['melbourne', 'Melbourne', 'AU', ['melbourne']],
  ['brisbane', 'Brisbane', 'AU', ['brisbane']],
  ['perth', 'Perth', 'AU', ['perth']],
  ['auckland', 'Auckland', 'NZ', ['auckland']],
  ['wellington', 'Wellington', 'NZ', ['wellington']],
  ['san-francisco', 'San Francisco', 'US', ['san francisco', 'sf bay area', 'bay area', 'south san francisco']],
  ['san-jose', 'San Jose', 'US', ['san jose', 'santa clara', 'sunnyvale', 'mountain view', 'palo alto', 'cupertino', 'menlo park', 'redwood city', 'san mateo', 'foster city']],
  ['new-york', 'New York', 'US', ['new york', 'new york city', 'nyc', 'brooklyn', 'manhattan']],
  ['seattle', 'Seattle', 'US', ['seattle', 'bellevue', 'redmond', 'kirkland']],
  ['austin', 'Austin', 'US', ['austin']],
  ['boston', 'Boston', 'US', ['boston', 'cambridge ma', 'somerville']],
  ['chicago', 'Chicago', 'US', ['chicago']],
  ['los-angeles', 'Los Angeles', 'US', ['los angeles', 'santa monica', 'culver city', 'pasadena']],
  ['san-diego', 'San Diego', 'US', ['san diego']],
  ['denver', 'Denver', 'US', ['denver', 'boulder']],
  ['atlanta', 'Atlanta', 'US', ['atlanta']],
  ['dallas', 'Dallas', 'US', ['dallas', 'plano', 'irving', 'fort worth']],
  ['houston', 'Houston', 'US', ['houston']],
  ['miami', 'Miami', 'US', ['miami']],
  ['washington-dc', 'Washington DC', 'US', ['washington dc', 'washington d c', 'arlington va', 'mclean', 'reston']],
  ['philadelphia', 'Philadelphia', 'US', ['philadelphia']],
  ['phoenix', 'Phoenix', 'US', ['phoenix', 'tempe', 'scottsdale']],
  ['portland', 'Portland', 'US', ['portland']],
  ['minneapolis', 'Minneapolis', 'US', ['minneapolis', 'saint paul']],
  ['salt-lake-city', 'Salt Lake City', 'US', ['salt lake city', 'lehi', 'provo']],
  ['raleigh', 'Raleigh', 'US', ['raleigh', 'durham', 'chapel hill']],
  ['nashville', 'Nashville', 'US', ['nashville']],
  ['pittsburgh', 'Pittsburgh', 'US', ['pittsburgh']],
  ['detroit', 'Detroit', 'US', ['detroit', 'ann arbor']],
  ['toronto', 'Toronto', 'CA', ['toronto', 'mississauga', 'waterloo']],
  ['vancouver', 'Vancouver', 'CA', ['vancouver']],
  ['montreal', 'Montreal', 'CA', ['montreal']],
  ['ottawa', 'Ottawa', 'CA', ['ottawa']],
  ['calgary', 'Calgary', 'CA', ['calgary']],
  ['mexico-city', 'Mexico City', 'MX', ['mexico city', 'cdmx', 'guadalajara']],
  ['sao-paulo', 'Sao Paulo', 'BR', ['sao paulo']],
  ['rio-de-janeiro', 'Rio de Janeiro', 'BR', ['rio de janeiro']],
  ['buenos-aires', 'Buenos Aires', 'AR', ['buenos aires']],
  ['bogota', 'Bogota', 'CO', ['bogota']],
  ['santiago', 'Santiago', 'CL', ['santiago']],
  ['london', 'London', 'GB', ['london']],
  ['manchester', 'Manchester', 'GB', ['manchester']],
  ['edinburgh', 'Edinburgh', 'GB', ['edinburgh', 'glasgow']],
  ['cambridge-uk', 'Cambridge', 'GB', ['cambridge uk']],
  ['dublin', 'Dublin', 'IE', ['dublin']],
  ['berlin', 'Berlin', 'DE', ['berlin']],
  ['munich', 'Munich', 'DE', ['munich', 'munchen']],
  ['hamburg', 'Hamburg', 'DE', ['hamburg']],
  ['frankfurt', 'Frankfurt', 'DE', ['frankfurt']],
  ['cologne', 'Cologne', 'DE', ['cologne', 'koln', 'dusseldorf']],
  ['paris', 'Paris', 'FR', ['paris']],
  ['lyon', 'Lyon', 'FR', ['lyon']],
  ['madrid', 'Madrid', 'ES', ['madrid']],
  ['barcelona', 'Barcelona', 'ES', ['barcelona']],
  ['valencia', 'Valencia', 'ES', ['valencia']],
  ['lisbon', 'Lisbon', 'PT', ['lisbon', 'lisboa']],
  ['porto', 'Porto', 'PT', ['porto']],
  ['milan', 'Milan', 'IT', ['milan', 'milano']],
  ['rome', 'Rome', 'IT', ['rome', 'roma']],
  ['amsterdam', 'Amsterdam', 'NL', ['amsterdam', 'utrecht', 'rotterdam', 'eindhoven']],
  ['brussels', 'Brussels', 'BE', ['brussels']],
  ['warsaw', 'Warsaw', 'PL', ['warsaw', 'warszawa']],
  ['krakow', 'Krakow', 'PL', ['krakow', 'cracow', 'wroclaw', 'gdansk', 'poznan']],
  ['prague', 'Prague', 'CZ', ['prague', 'praha', 'brno']],
  ['budapest', 'Budapest', 'HU', ['budapest']],
  ['bucharest', 'Bucharest', 'RO', ['bucharest', 'cluj', 'cluj napoca', 'timisoara', 'iasi']],
  ['sofia', 'Sofia', 'BG', ['sofia']],
  ['athens', 'Athens', 'GR', ['athens']],
  ['zagreb', 'Zagreb', 'HR', ['zagreb']],
  ['belgrade', 'Belgrade', 'RS', ['belgrade', 'novi sad']],
  ['stockholm', 'Stockholm', 'SE', ['stockholm', 'gothenburg', 'malmo']],
  ['oslo', 'Oslo', 'NO', ['oslo']],
  ['copenhagen', 'Copenhagen', 'DK', ['copenhagen', 'kobenhavn']],
  ['helsinki', 'Helsinki', 'FI', ['helsinki']],
  ['tallinn', 'Tallinn', 'EE', ['tallinn']],
  ['riga', 'Riga', 'LV', ['riga']],
  ['vilnius', 'Vilnius', 'LT', ['vilnius']],
  ['zurich', 'Zurich', 'CH', ['zurich', 'geneva', 'lausanne', 'basel']],
  ['vienna', 'Vienna', 'AT', ['vienna', 'wien']],
  ['kyiv', 'Kyiv', 'UA', ['kyiv', 'kiev', 'lviv']],
  ['istanbul', 'Istanbul', 'TR', ['istanbul', 'ankara', 'izmir']],
  ['tel-aviv', 'Tel Aviv', 'IL', ['tel aviv', 'herzliya', 'jerusalem']],
  ['dubai', 'Dubai', 'AE', ['dubai']],
  ['abu-dhabi', 'Abu Dhabi', 'AE', ['abu dhabi']],
  ['riyadh', 'Riyadh', 'SA', ['riyadh', 'jeddah']],
  ['doha', 'Doha', 'QA', ['doha']],
  ['kuwait-city', 'Kuwait City', 'KW', ['kuwait city']],
  ['muscat', 'Muscat', 'OM', ['muscat']],
  ['amman', 'Amman', 'JO', ['amman']],
  ['cairo', 'Cairo', 'EG', ['cairo']],
  ['casablanca', 'Casablanca', 'MA', ['casablanca', 'rabat']],
  ['lagos', 'Lagos', 'NG', ['lagos', 'abuja']],
  ['nairobi', 'Nairobi', 'KE', ['nairobi']],
  ['accra', 'Accra', 'GH', ['accra']],
  ['cape-town', 'Cape Town', 'ZA', ['cape town']],
  ['johannesburg', 'Johannesburg', 'ZA', ['johannesburg', 'pretoria']],
]

export const CITIES: CityEntry[] = [
  ...BD_DISTRICTS.map(([slug, label]) => ({
    slug,
    label,
    country: 'BD',
    aliases: [label.toLowerCase(), ...(BD_EXTRA_ALIASES[slug] ?? [])],
  })),
  ...GLOBAL_CITIES.map(([slug, label, country, aliases]) => ({ slug, label, country, aliases })),
]

function normalizeAlias(alias: string): string {
  return alias
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

const CITY_BY_SLUG = new Map(CITIES.map((city) => [city.slug, city]))
const COUNTRY_BY_CODE = new Map(COUNTRIES.map((country) => [country.code, country]))

const CITY_BY_ALIAS = new Map<string, CityEntry>()
for (const city of CITIES) {
  for (const alias of city.aliases) {
    const key = normalizeAlias(alias)
    if (key && !CITY_BY_ALIAS.has(key)) CITY_BY_ALIAS.set(key, city)
  }
}

const COUNTRY_BY_ALIAS = new Map<string, CountryEntry>()
for (const country of COUNTRIES) {
  for (const alias of country.aliases) {
    const key = normalizeAlias(alias)
    if (key && !COUNTRY_BY_ALIAS.has(key)) COUNTRY_BY_ALIAS.set(key, country)
  }
}

export const MAX_ALIAS_WORDS = Math.max(
  ...[...CITY_BY_ALIAS.keys(), ...COUNTRY_BY_ALIAS.keys()].map((alias) => alias.split(' ').length),
)

export function cityByAlias(alias: string): CityEntry | undefined {
  return CITY_BY_ALIAS.get(alias)
}

export function countryByAlias(alias: string): CountryEntry | undefined {
  return COUNTRY_BY_ALIAS.get(alias)
}

export function cityBySlug(slug: string): CityEntry | undefined {
  return CITY_BY_SLUG.get(slug)
}

export function countryByCode(code: string): CountryEntry | undefined {
  return COUNTRY_BY_CODE.get(code.toUpperCase())
}

export function cityLabel(slug: string): string {
  const city = CITY_BY_SLUG.get(slug)
  if (!city) return slug
  const country = COUNTRY_BY_CODE.get(city.country)
  return country ? `${city.label}, ${country.label}` : city.label
}

export function countryLabel(code: string): string {
  return COUNTRY_BY_CODE.get(code.toUpperCase())?.label ?? code.toUpperCase()
}
