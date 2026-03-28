export const DIET_RESTRICTED_CATEGORIES = {
  vegetarian: ['meat', 'seafood'],
  vegan: ['meat', 'seafood', 'dairy'],
  pescatarian: ['meat'],
};

export const ALLERGEN_KEYWORDS = {
  peanut: ['peanut', 'groundnut'],
  'tree nut': ['almond', 'walnut', 'cashew', 'pecan', 'pistachio', 'hazelnut', 'macadamia'],
  dairy: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'ice cream'],
  lactose: ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'dairy', 'ice cream'],
  gluten: ['wheat', 'bread', 'pasta', 'flour', 'barley', 'rye', 'cereal'],
  shellfish: ['shrimp', 'crab', 'lobster', 'prawn', 'mussel', 'clam', 'oyster', 'scallop'],
  egg: ['egg'],
  soy: ['soy', 'tofu', 'edamame', 'tempeh', 'miso'],
  fish: ['salmon', 'tuna', 'cod', 'tilapia', 'bass', 'trout', 'sardine', 'anchovy', 'fish'],
  sesame: ['sesame', 'tahini'],
};

export const EXPIRY_WARNING_DAYS = 3;
export const EXPIRY_WARNING_MS = 86400 * EXPIRY_WARNING_DAYS * 1000;
