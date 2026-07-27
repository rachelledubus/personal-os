// Static reference content, same treatment as the Comfort Ladder /
// Relationship Energy Scale — fixed manual content, not user data.

export const CITY_PROFILES = [
  {
    city: 'Cooper City',
    identity: 'Established, family-focused, school reputation, community feel, limited future land — a premium suburban choice',
    bestFit: 'Families prioritizing schools, buyers wanting a smaller-community feel, move-up buyers, relocating families with kids',
    housing: 'Established single-family, limited new construction, strong demand due to reputation',
    buyerConsiderations: 'Roof age, insurance, updates/renovations, flood risk, HOA restrictions',
    honestLine: 'Not always the cheapest option, but many buyers choose it because what they value most — schools, community feel — is hard to recreate.',
    mainStrength: 'Stability and community feel',
    tradeOff: 'Higher prices, limited inventory',
    neighborhoods: ['Rock Creek (families/relocators)', 'Embassy Lakes (planned community)', 'Monterra (gated, newer construction)', 'Timberlake', 'Forest Lake'],
  },
  {
    city: 'Pembroke Pines',
    identity: "One of Broward's largest suburban communities — wide housing variety, multiple price points, diverse neighborhoods",
    bestFit: 'First-time buyers, relocators wanting options, families across budgets, healthcare professionals',
    housing: 'Older single-family, newer communities, townhomes, condos, gated neighborhoods — not one single market',
    buyerConsiderations: 'HOA fees, insurance, home age, school boundaries — varies significantly by exact neighborhood',
    honestLine: "I wouldn't choose a home here based on the city name alone. The neighborhood and exact address matter.",
    mainStrength: 'Variety and flexibility',
    tradeOff: 'Requires neighborhood-level research',
    neighborhoods: ['Chapel Trail', 'Silver Lakes', 'Pembroke Falls', 'TownGate (first-time buyers)', 'Grand Palms', 'Century Village (downsizers/retirees — needs condo/reserves/assessment education)'],
  },
  {
    city: 'Plantation',
    identity: 'Mature neighborhoods, employment access, central location, tree-lined streets, established housing',
    bestFit: 'Professionals commuting locally, buyers seeking location, first-timers comfortable learning older-home considerations',
    housing: '1970s\u201380s construction, established landscaping, older infrastructure',
    buyerConsiderations: 'Roof age, electrical, plumbing, insurance requirements, storm protection',
    honestLine: "Can be a great value opportunity, but buyers need to understand the home's condition beyond cosmetic updates.",
    mainStrength: 'Location and established neighborhoods',
    tradeOff: 'Older homes require education',
    neighborhoods: ['Jacaranda', 'Jacaranda Lakes', 'Plantation Isles (value/first-time, older-home education)', 'Hawks Landing (move-up)', 'Central Park area'],
  },
];

export const BUYER_INTELLIGENCE_TOPICS = [
  { topic: 'Insurance', cover: 'Homeowners insurance, flood requirements, roof age, wind mitigation, impact protection, construction type — evaluated as part of affordability, not an afterthought' },
  { topic: 'Older Homes', cover: 'Standard inspection, four-point inspection, wind mitigation inspection, sewer scope when appropriate' },
  { topic: 'School Zones', cover: 'Always verify by address — never rely on listing descriptions, old marketing, or neighborhood assumptions' },
  { topic: 'HOA', cover: "Monthly fees, what's included, restrictions, financial health, future assessments" },
];

export const LOCAL_EXPERTISE_CATEGORIES = [
  { code: '01', name: 'Community Intelligence', understanding: 'City identity, lifestyle differences, buyer fit, housing characteristics, trade-offs' },
  { code: '02', name: 'Housing Intelligence', understanding: 'Home styles, build eras, construction considerations, HOA structures, maintenance concerns' },
  { code: '03', name: 'Ownership Cost Intelligence', understanding: 'Insurance, taxes, HOA costs, maintenance, long-term affordability' },
  { code: '04', name: 'Buyer Education Intelligence', understanding: 'First-time buyer concerns, inspection issues, school verification, relocation challenges' },
  { code: '05', name: 'Market Intelligence', understanding: 'Inventory trends, pricing changes, development, buyer demand' },
  { code: '06', name: 'Employment & Lifestyle Intelligence', understanding: 'Where people work, why people relocate, commute considerations, community anchors' },
];

export const DECISION_FRAMEWORK = "The brand doesn't answer \u201cwhat's the best city?\u201d \u2014 it answers \u201cwhat city best fits this buyer's priorities?\u201d A buyer prioritizing schools and stability may prefer Cooper City. A buyer prioritizing options and flexibility may prefer Pembroke Pines. A buyer prioritizing location and convenience may prefer Plantation.";
