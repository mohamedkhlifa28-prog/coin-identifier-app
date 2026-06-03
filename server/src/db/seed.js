'use strict';

const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcryptjs');

/**
 * Seeds the database with initial data.
 * @param {import('better-sqlite3').Database} db
 */
function seedDatabase(db) {
  console.log('Seeding database...');

  // ----------------------------------------------------------------
  // Badges
  // ----------------------------------------------------------------
  const badges = [
    { id: uuidv4(), name: 'First Step', description: 'Create your account', icon: '🎯', requirement: 'register' },
    { id: uuidv4(), name: 'First Scan', description: 'Scan your first coin', icon: '🔍', requirement: 'scan_1' },
    { id: uuidv4(), name: 'Collector', description: 'Add 10 coins to your collection', icon: '🪙', requirement: 'collect_10' },
    { id: uuidv4(), name: 'Streak Master', description: 'Log in 7 days in a row', icon: '🔥', requirement: 'streak_7' },
    { id: uuidv4(), name: 'Social Butterfly', description: 'Make your first post', icon: '🦋', requirement: 'post_1' },
    { id: uuidv4(), name: 'Market Maker', description: 'List your first coin for sale', icon: '💰', requirement: 'list_1' },
    { id: uuidv4(), name: 'Silver Tongue', description: 'Own 5 silver coins', icon: '🥈', requirement: 'silver_5' },
    { id: uuidv4(), name: 'Century Club', description: 'Own a coin over 100 years old', icon: '📜', requirement: 'old_coin' },
  ];

  const insertBadge = db.prepare(
    'INSERT OR IGNORE INTO badges (id, name, description, icon, requirement) VALUES (?, ?, ?, ?, ?)'
  );
  for (const b of badges) {
    insertBadge.run(b.id, b.name, b.description, b.icon, b.requirement);
  }

  // ----------------------------------------------------------------
  // Users
  // ----------------------------------------------------------------
  const salt = bcrypt.genSaltSync(10);

  const alice = {
    id: uuidv4(),
    email: 'alice@example.com',
    password_hash: bcrypt.hashSync('password123', salt),
    name: 'Alice Chen',
    xp: 4500,
    level: 'Expert',
    streak: 12,
    last_login_date: new Date().toISOString().slice(0, 10),
    subscription_tier: 'pro',
  };

  const bob = {
    id: uuidv4(),
    email: 'bob@example.com',
    password_hash: bcrypt.hashSync('password123', salt),
    name: 'Bob Miller',
    xp: 1200,
    level: 'Collector',
    streak: 3,
    last_login_date: new Date().toISOString().slice(0, 10),
    subscription_tier: 'free',
  };

  const carol = {
    id: uuidv4(),
    email: 'carol@example.com',
    password_hash: bcrypt.hashSync('password123', salt),
    name: 'Carol Davis',
    xp: 850,
    level: 'Collector',
    streak: 1,
    last_login_date: new Date().toISOString().slice(0, 10),
    subscription_tier: 'free',
  };

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, xp, level, streak, last_login_date, subscription_tier)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  insertUser.run(alice.id, alice.email, alice.password_hash, alice.name, alice.xp, alice.level, alice.streak, alice.last_login_date, alice.subscription_tier);
  insertUser.run(bob.id, bob.email, bob.password_hash, bob.name, bob.xp, bob.level, bob.streak, bob.last_login_date, bob.subscription_tier);
  insertUser.run(carol.id, carol.email, carol.password_hash, carol.name, carol.xp, carol.level, carol.streak, carol.last_login_date, carol.subscription_tier);

  // Award First Step badge to all seeded users
  const firstStepBadge = db.prepare("SELECT id FROM badges WHERE name = 'First Step'").get();
  if (firstStepBadge) {
    const insertUserBadge = db.prepare(
      'INSERT OR IGNORE INTO user_badges (id, user_id, badge_id) VALUES (?, ?, ?)'
    );
    insertUserBadge.run(uuidv4(), alice.id, firstStepBadge.id);
    insertUserBadge.run(uuidv4(), bob.id, firstStepBadge.id);
    insertUserBadge.run(uuidv4(), carol.id, firstStepBadge.id);
  }

  // ----------------------------------------------------------------
  // Coins master catalog (20 coins)
  // ----------------------------------------------------------------
  const coins = [
    {
      id: uuidv4(), name: '1909-S VDB Lincoln Cent', country: 'United States', year: 1909,
      denomination: '1 Cent', mint_mark: 'S', composition: 'Bronze (95% Cu, 5% Sn/Zn)',
      diameter: 19.05, weight: 3.11, mintage: 484000, rarity_tier: 'Very Rare',
      description: 'The famous 1909-S VDB Lincoln cent is one of the most sought-after U.S. coins.',
      series: 'Lincoln Cents',
    },
    {
      id: uuidv4(), name: '1921 Morgan Dollar', country: 'United States', year: 1921,
      denomination: '1 Dollar', mint_mark: null, composition: '90% Silver, 10% Copper',
      diameter: 38.1, weight: 26.73, mintage: 44690000, rarity_tier: 'Common',
      description: 'The final year of Morgan dollar production. Large mintage makes this common.',
      series: 'Morgan Dollars',
    },
    {
      id: uuidv4(), name: '1881-S Morgan Dollar', country: 'United States', year: 1881,
      denomination: '1 Dollar', mint_mark: 'S', composition: '90% Silver, 10% Copper',
      diameter: 38.1, weight: 26.73, mintage: 12760000, rarity_tier: 'Uncommon',
      description: 'The 1881-S is among the most popular Morgan dollars for collectors.',
      series: 'Morgan Dollars',
    },
    {
      id: uuidv4(), name: '1916-D Mercury Dime', country: 'United States', year: 1916,
      denomination: '10 Cents', mint_mark: 'D', composition: '90% Silver, 10% Copper',
      diameter: 17.9, weight: 2.5, mintage: 264000, rarity_tier: 'Very Rare',
      description: 'The 1916-D Mercury dime is the key date of the series with an extremely low mintage.',
      series: 'Mercury Dimes',
    },
    {
      id: uuidv4(), name: '1942/1 Mercury Dime', country: 'United States', year: 1942,
      denomination: '10 Cents', mint_mark: null, composition: '90% Silver, 10% Copper',
      diameter: 17.9, weight: 2.5, mintage: 205432329, rarity_tier: 'Rare',
      description: 'A famous overdate error where a 1 was punched over and then a 2 was punched.',
      series: 'Mercury Dimes',
    },
    {
      id: uuidv4(), name: '1913 Buffalo Nickel', country: 'United States', year: 1913,
      denomination: '5 Cents', mint_mark: null, composition: '75% Copper, 25% Nickel',
      diameter: 21.2, weight: 5.0, mintage: 30993520, rarity_tier: 'Common',
      description: 'The first year of the iconic Buffalo nickel, also known as the Indian Head nickel.',
      series: 'Buffalo Nickels',
    },
    {
      id: uuidv4(), name: '1918/7-D Buffalo Nickel', country: 'United States', year: 1918,
      denomination: '5 Cents', mint_mark: 'D', composition: '75% Copper, 25% Nickel',
      diameter: 21.2, weight: 5.0, mintage: 8362000, rarity_tier: 'Very Rare',
      description: 'Famous overdate variety with strong demand from error coin collectors.',
      series: 'Buffalo Nickels',
    },
    {
      id: uuidv4(), name: '1917-S Walking Liberty Half Dollar', country: 'United States', year: 1917,
      denomination: '50 Cents', mint_mark: 'S', composition: '90% Silver, 10% Copper',
      diameter: 30.6, weight: 12.5, mintage: 952000, rarity_tier: 'Rare',
      description: 'Low mintage makes this one of the key dates in the Walking Liberty series.',
      series: 'Walking Liberty Half Dollars',
    },
    {
      id: uuidv4(), name: '1921 Walking Liberty Half Dollar', country: 'United States', year: 1921,
      denomination: '50 Cents', mint_mark: null, composition: '90% Silver, 10% Copper',
      diameter: 30.6, weight: 12.5, mintage: 246000, rarity_tier: 'Very Rare',
      description: 'The 1921 Walking Liberty half is extremely rare in mint state.',
      series: 'Walking Liberty Half Dollars',
    },
    {
      id: uuidv4(), name: '1955 Doubled Die Lincoln Cent', country: 'United States', year: 1955,
      denomination: '1 Cent', mint_mark: null, composition: 'Bronze (95% Cu, 5% Sn/Zn)',
      diameter: 19.05, weight: 3.11, mintage: 40000, rarity_tier: 'Rare',
      description: 'One of the most famous U.S. error coins with highly visible doubled lettering.',
      series: 'Lincoln Cents',
    },
    {
      id: uuidv4(), name: '1967 Canadian Centennial Dollar', country: 'Canada', year: 1967,
      denomination: '1 Dollar', mint_mark: null, composition: '80% Silver, 20% Copper',
      diameter: 36.0, weight: 23.33, mintage: 6767496, rarity_tier: 'Common',
      description: 'Special centennial issue featuring a Canada goose design by Alex Colville.',
      series: 'Canadian Silver Dollars',
    },
    {
      id: uuidv4(), name: '2023 Canadian Maple Leaf 1oz', country: 'Canada', year: 2023,
      denomination: '5 Dollars', mint_mark: null, composition: '99.99% Silver',
      diameter: 38.0, weight: 31.1, mintage: 500000, rarity_tier: 'Common',
      description: 'The iconic Canadian Silver Maple Leaf bullion coin.',
      series: 'Canadian Maple Leaf',
    },
    {
      id: uuidv4(), name: '1937 British Florin', country: 'United Kingdom', year: 1937,
      denomination: '2 Shillings', mint_mark: null, composition: '50% Silver, 50% Copper',
      diameter: 28.5, weight: 11.31, mintage: 3302000, rarity_tier: 'Common',
      description: 'Coronation year florin featuring a young portrait of King George VI.',
      series: 'British Florins',
    },
    {
      id: uuidv4(), name: '1948 Mexican 5 Pesos', country: 'Mexico', year: 1948,
      denomination: '5 Pesos', mint_mark: null, composition: '90% Silver, 10% Copper',
      diameter: 40.0, weight: 30.0, mintage: 1800000, rarity_tier: 'Uncommon',
      description: 'Classic Mexican silver coin featuring Cuauhtemoc, the last Aztec emperor.',
      series: 'Mexican Silver Pesos',
    },
    {
      id: uuidv4(), name: 'Roman Sestertius - Emperor Hadrian', country: 'Roman Empire', year: 119,
      denomination: 'Sestertius', mint_mark: null, composition: 'Orichalcum (Brass)',
      diameter: 32.0, weight: 25.5, mintage: null, rarity_tier: 'Rare',
      description: 'Bronze sestertius of Emperor Hadrian from the early imperial period.',
      series: 'Roman Imperial Coins',
    },
    {
      id: uuidv4(), name: 'Chinese Cash Coin - Qing Dynasty', country: 'China', year: 1875,
      denomination: '1 Cash', mint_mark: null, composition: 'Brass',
      diameter: 24.0, weight: 3.8, mintage: null, rarity_tier: 'Common',
      description: 'Traditional Chinese cash coin from the Guangxu Emperor era of the Qing Dynasty.',
      series: 'Chinese Cash Coins',
    },
    {
      id: uuidv4(), name: '1893-S Morgan Dollar', country: 'United States', year: 1893,
      denomination: '1 Dollar', mint_mark: 'S', composition: '90% Silver, 10% Copper',
      diameter: 38.1, weight: 26.73, mintage: 100000, rarity_tier: 'Ultra Rare',
      description: 'The 1893-S Morgan Dollar is considered the king of Morgan dollars.',
      series: 'Morgan Dollars',
    },
    {
      id: uuidv4(), name: '1804 Draped Bust Dollar', country: 'United States', year: 1804,
      denomination: '1 Dollar', mint_mark: null, composition: '89.24% Silver, 10.76% Copper',
      diameter: 39.5, weight: 26.96, mintage: 15, rarity_tier: 'Ultra Rare',
      description: 'Known as the "King of American Coins," with only 15 known specimens.',
      series: 'Draped Bust Dollars',
    },
    {
      id: uuidv4(), name: '1907 Saint-Gaudens Double Eagle', country: 'United States', year: 1907,
      denomination: '20 Dollars', mint_mark: null, composition: '90% Gold, 10% Copper',
      diameter: 34.0, weight: 33.44, mintage: 11250, rarity_tier: 'Very Rare',
      description: 'Considered by many to be the most beautiful U.S. coin ever minted.',
      series: 'Saint-Gaudens Double Eagles',
    },
    {
      id: uuidv4(), name: '1932 Washington Quarter', country: 'United States', year: 1932,
      denomination: '25 Cents', mint_mark: null, composition: '90% Silver, 10% Copper',
      diameter: 24.3, weight: 6.25, mintage: 5404000, rarity_tier: 'Uncommon',
      description: 'The first year of the Washington quarter series, originally a commemorative issue.',
      series: 'Washington Quarters',
    },
  ];

  const insertCoin = db.prepare(`
    INSERT INTO coins (id, name, country, year, denomination, mint_mark, composition, diameter, weight, mintage, rarity_tier, description, series)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of coins) {
    insertCoin.run(
      c.id, c.name, c.country, c.year, c.denomination, c.mint_mark || null,
      c.composition, c.diameter, c.weight, c.mintage || null,
      c.rarity_tier, c.description, c.series
    );
  }

  // ----------------------------------------------------------------
  // User coins for Alice (8 coins)
  // ----------------------------------------------------------------
  const aliceCoins = [
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[0].id,
      name: coins[0].name, country: coins[0].country, year: coins[0].year,
      denomination: coins[0].denomination, grade: 'VF-20', condition: 'Very Fine',
      purchase_price: 650.00, purchase_date: '2023-03-15',
      estimated_value: 950.00, rarity_tier: coins[0].rarity_tier,
      notes: 'Purchased at Heritage Auctions. Nicely struck with original surfaces.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[2].id,
      name: coins[2].name, country: coins[2].country, year: coins[2].year,
      denomination: coins[2].denomination, grade: 'MS-64', condition: 'Mint State',
      purchase_price: 120.00, purchase_date: '2023-06-20',
      estimated_value: 175.00, rarity_tier: coins[2].rarity_tier,
      notes: 'Strong luster with minor bag marks.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[3].id,
      name: coins[3].name, country: coins[3].country, year: coins[3].year,
      denomination: coins[3].denomination, grade: 'F-12', condition: 'Fine',
      purchase_price: 1800.00, purchase_date: '2022-11-05',
      estimated_value: 2400.00, rarity_tier: coins[3].rarity_tier,
      notes: 'Key date Mercury dime. Authentic with PCGS certification.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[6].id,
      name: coins[6].name, country: coins[6].country, year: coins[6].year,
      denomination: coins[6].denomination, grade: 'VG-8', condition: 'Very Good',
      purchase_price: 3200.00, purchase_date: '2023-01-12',
      estimated_value: 4500.00, rarity_tier: coins[6].rarity_tier,
      notes: 'Clear overdate visible under magnification.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[9].id,
      name: coins[9].name, country: coins[9].country, year: coins[9].year,
      denomination: coins[9].denomination, grade: 'VF-30', condition: 'Very Fine',
      purchase_price: 1100.00, purchase_date: '2022-08-30',
      estimated_value: 1450.00, rarity_tier: coins[9].rarity_tier,
      notes: 'Famous doubled die. Doubling visible on LIBERTY and date.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[14].id,
      name: coins[14].name, country: coins[14].country, year: coins[14].year,
      denomination: coins[14].denomination, grade: 'VF-25', condition: 'Very Fine',
      purchase_price: 450.00, purchase_date: '2023-09-14',
      estimated_value: 600.00, rarity_tier: coins[14].rarity_tier,
      notes: 'Genuine Hadrian sestertius with good portrait detail.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[18].id,
      name: coins[18].name, country: coins[18].country, year: coins[18].year,
      denomination: coins[18].denomination, grade: 'MS-62', condition: 'Mint State',
      purchase_price: 2200.00, purchase_date: '2021-05-22',
      estimated_value: 2800.00, rarity_tier: coins[18].rarity_tier,
      notes: 'Gorgeous high relief strike. Minor contact marks.',
    },
    {
      id: uuidv4(), user_id: alice.id, coin_id: coins[16].id,
      name: coins[16].name, country: coins[16].country, year: coins[16].year,
      denomination: coins[16].denomination, grade: 'VG-10', condition: 'Very Good',
      purchase_price: 28000.00, purchase_date: '2020-10-07',
      estimated_value: 35000.00, rarity_tier: coins[16].rarity_tier,
      notes: 'King of Morgan dollars. NGC certified VG-10.',
    },
  ];

  const insertUserCoin = db.prepare(`
    INSERT INTO user_coins (id, user_id, coin_id, name, country, year, denomination, grade, condition,
      purchase_price, purchase_date, estimated_value, rarity_tier, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const uc of aliceCoins) {
    insertUserCoin.run(
      uc.id, uc.user_id, uc.coin_id, uc.name, uc.country, uc.year,
      uc.denomination, uc.grade, uc.condition, uc.purchase_price,
      uc.purchase_date, uc.estimated_value, uc.rarity_tier, uc.notes
    );
  }

  // ----------------------------------------------------------------
  // User coins for Bob (5 coins)
  // ----------------------------------------------------------------
  const bobCoins = [
    {
      id: uuidv4(), user_id: bob.id, coin_id: coins[1].id,
      name: coins[1].name, country: coins[1].country, year: coins[1].year,
      denomination: coins[1].denomination, grade: 'MS-63', condition: 'Mint State',
      purchase_price: 55.00, purchase_date: '2024-01-10',
      estimated_value: 75.00, rarity_tier: coins[1].rarity_tier,
      notes: 'Nice original luster. A solid example.',
    },
    {
      id: uuidv4(), user_id: bob.id, coin_id: coins[5].id,
      name: coins[5].name, country: coins[5].country, year: coins[5].year,
      denomination: coins[5].denomination, grade: 'VF-35', condition: 'Very Fine',
      purchase_price: 35.00, purchase_date: '2024-02-14',
      estimated_value: 50.00, rarity_tier: coins[5].rarity_tier,
      notes: 'Type 1 reverse. Pleasing eye appeal.',
    },
    {
      id: uuidv4(), user_id: bob.id, coin_id: coins[11].id,
      name: coins[11].name, country: coins[11].country, year: coins[11].year,
      denomination: coins[11].denomination, grade: 'MS-69', condition: 'Mint State',
      purchase_price: 35.00, purchase_date: '2024-03-01',
      estimated_value: 40.00, rarity_tier: coins[11].rarity_tier,
      notes: 'Modern bullion coin in near perfect condition.',
    },
    {
      id: uuidv4(), user_id: bob.id, coin_id: coins[12].id,
      name: coins[12].name, country: coins[12].country, year: coins[12].year,
      denomination: coins[12].denomination, grade: 'EF-40', condition: 'Extremely Fine',
      purchase_price: 18.00, purchase_date: '2024-01-25',
      estimated_value: 25.00, rarity_tier: coins[12].rarity_tier,
      notes: 'Coronation year florin. Nice for type collection.',
    },
    {
      id: uuidv4(), user_id: bob.id, coin_id: coins[19].id,
      name: coins[19].name, country: coins[19].country, year: coins[19].year,
      denomination: coins[19].denomination, grade: 'AU-55', condition: 'About Uncirculated',
      purchase_price: 28.00, purchase_date: '2024-02-28',
      estimated_value: 42.00, rarity_tier: coins[19].rarity_tier,
      notes: 'First year of issue. Lightly circulated.',
    },
  ];

  for (const uc of bobCoins) {
    insertUserCoin.run(
      uc.id, uc.user_id, uc.coin_id, uc.name, uc.country, uc.year,
      uc.denomination, uc.grade, uc.condition, uc.purchase_price,
      uc.purchase_date, uc.estimated_value, uc.rarity_tier, uc.notes
    );
  }

  // ----------------------------------------------------------------
  // Marketplace listings (10 listings)
  // ----------------------------------------------------------------
  const listings = [
    {
      id: uuidv4(), seller_id: alice.id, user_coin_id: aliceCoins[1].id,
      title: '1881-S Morgan Dollar MS-64 - Stunning Luster',
      description: 'Beautiful 1881-S Morgan dollar with exceptional luster and only minor bag marks. Perfect for the Morgan dollar collector.',
      price: 195.00, grade: 'MS-64', condition: 'Mint State',
      coin_data: JSON.stringify({ name: coins[2].name, year: coins[2].year, country: coins[2].country }),
    },
    {
      id: uuidv4(), seller_id: alice.id, user_coin_id: aliceCoins[6].id,
      title: '1907 Saint-Gaudens Double Eagle MS-62',
      description: 'Magnificent high-relief gold double eagle. One of the most beautiful U.S. coins ever minted.',
      price: 2950.00, grade: 'MS-62', condition: 'Mint State',
      coin_data: JSON.stringify({ name: coins[18].name, year: coins[18].year, country: coins[18].country }),
    },
    {
      id: uuidv4(), seller_id: bob.id, user_coin_id: bobCoins[0].id,
      title: '1921 Morgan Dollar MS-63 - Last Year Issue',
      description: 'Nice 1921 Morgan dollar, the last year of production. Strong luster with minor bag marks typical of the issue.',
      price: 80.00, grade: 'MS-63', condition: 'Mint State',
      coin_data: JSON.stringify({ name: coins[1].name, year: coins[1].year, country: coins[1].country }),
    },
    {
      id: uuidv4(), seller_id: bob.id, user_coin_id: bobCoins[1].id,
      title: '1913 Buffalo Nickel Type 1 VF-35',
      description: 'First year Buffalo nickel, Type 1 reverse. Clean and problem-free example.',
      price: 55.00, grade: 'VF-35', condition: 'Very Fine',
      coin_data: JSON.stringify({ name: coins[5].name, year: coins[5].year, country: coins[5].country }),
    },
    {
      id: uuidv4(), seller_id: alice.id, user_coin_id: aliceCoins[5].id,
      title: 'Roman Sestertius - Hadrian VF-25',
      description: 'Genuine Roman bronze sestertius of Emperor Hadrian. An authentic piece of ancient history.',
      price: 650.00, grade: 'VF-25', condition: 'Very Fine',
      coin_data: JSON.stringify({ name: coins[14].name, year: coins[14].year, country: coins[14].country }),
    },
    {
      id: uuidv4(), seller_id: bob.id, user_coin_id: bobCoins[2].id,
      title: '2023 Canadian Maple Leaf 1oz Silver MS-69',
      description: 'Near-perfect modern bullion coin. Great for investors and collectors alike.',
      price: 42.00, grade: 'MS-69', condition: 'Mint State',
      coin_data: JSON.stringify({ name: coins[11].name, year: coins[11].year, country: coins[11].country }),
    },
    {
      id: uuidv4(), seller_id: alice.id, user_coin_id: null,
      title: '1917-S Walking Liberty Half Dollar EF-40',
      description: 'Low mintage key date Walking Liberty half dollar. Nice all-around example with good detail.',
      price: 480.00, grade: 'EF-40', condition: 'Extremely Fine',
      coin_data: JSON.stringify({ name: coins[7].name, year: coins[7].year, country: coins[7].country }),
    },
    {
      id: uuidv4(), seller_id: bob.id, user_coin_id: bobCoins[3].id,
      title: '1937 British Florin EF-40 George VI',
      description: 'Coronation year British florin with a nice portrait of King George VI.',
      price: 28.00, grade: 'EF-40', condition: 'Extremely Fine',
      coin_data: JSON.stringify({ name: coins[12].name, year: coins[12].year, country: coins[12].country }),
    },
    {
      id: uuidv4(), seller_id: alice.id, user_coin_id: null,
      title: '1948 Mexican 5 Pesos Silver - Cuauhtemoc',
      description: 'Beautiful Mexican silver coin. The Cuauhtemoc design is one of the finest in world numismatics.',
      price: 45.00, grade: 'VF-30', condition: 'Very Fine',
      coin_data: JSON.stringify({ name: coins[13].name, year: coins[13].year, country: coins[13].country }),
    },
    {
      id: uuidv4(), seller_id: bob.id, user_coin_id: bobCoins[4].id,
      title: '1932 Washington Quarter AU-55 - First Year',
      description: 'First year of the Washington quarter series. Lightly circulated with original surfaces.',
      price: 45.00, grade: 'AU-55', condition: 'About Uncirculated',
      coin_data: JSON.stringify({ name: coins[19].name, year: coins[19].year, country: coins[19].country }),
    },
  ];

  const insertListing = db.prepare(`
    INSERT INTO listings (id, seller_id, user_coin_id, title, description, price, grade, condition, coin_data)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const l of listings) {
    insertListing.run(l.id, l.seller_id, l.user_coin_id || null, l.title, l.description, l.price, l.grade, l.condition, l.coin_data);
  }

  // ----------------------------------------------------------------
  // Community posts (15 posts)
  // ----------------------------------------------------------------
  const posts = [
    {
      id: uuidv4(), user_id: alice.id, type: 'showcase',
      content: 'Just acquired this stunning 1893-S Morgan Dollar! Graded VG-10 by NGC. The king of the Morgan series is now in my collection. Cost me a pretty penny but worth every cent! 🪙',
      coin_data: JSON.stringify({ name: coins[16].name, year: 1893, country: 'United States', grade: 'VG-10' }),
      estimated_value: 35000.00, likes: 47, comments_count: 12,
    },
    {
      id: uuidv4(), user_id: alice.id, type: 'showcase',
      content: 'My 1907 Saint-Gaudens Double Eagle MS-62 is by far the most beautiful coin I own. The high relief design is absolutely breathtaking in hand.',
      coin_data: JSON.stringify({ name: coins[18].name, year: 1907, country: 'United States', grade: 'MS-62' }),
      estimated_value: 2800.00, likes: 38, comments_count: 8,
    },
    {
      id: uuidv4(), user_id: bob.id, type: 'find',
      content: 'CRH find of the week! Found this 1964 Roosevelt dime in a roll of dimes from the bank. Still has a nice shine to it. Silver content alone makes it worth holding!',
      coin_data: JSON.stringify({ name: '1964 Roosevelt Dime', year: 1964, country: 'United States', grade: 'AU' }),
      estimated_value: 3.50, likes: 22, comments_count: 5,
    },
    {
      id: uuidv4(), user_id: carol.id, type: 'question',
      content: 'Hey community! Can anyone help me identify this coin? It looks like a Walking Liberty half dollar but the date is worn. Any tips on how to read worn dates?',
      coin_data: JSON.stringify({ name: 'Unknown Half Dollar', year: null, country: 'United States' }),
      estimated_value: null, likes: 15, comments_count: 9,
    },
    {
      id: uuidv4(), user_id: alice.id, type: 'educational',
      content: 'Quick tip for new collectors: Always check the mintmark on your Morgan dollars! The San Francisco (S) and Carson City (CC) coins are often worth significantly more than their Philadelphia counterparts. Happy hunting!',
      coin_data: JSON.stringify({}),
      estimated_value: null, likes: 61, comments_count: 14,
    },
    {
      id: uuidv4(), user_id: bob.id, type: 'showcase',
      content: 'Added a 1921 Morgan Dollar to my collection today. Last year of production makes it a must-have for any Morgan collector. MS-63 quality with gorgeous luster.',
      coin_data: JSON.stringify({ name: coins[1].name, year: 1921, country: 'United States', grade: 'MS-63' }),
      estimated_value: 75.00, likes: 19, comments_count: 3,
    },
    {
      id: uuidv4(), user_id: carol.id, type: 'showcase',
      content: 'My very first coin purchase! A 1967 Canadian Centennial Dollar. I love the Canada goose design. Starting my collection with Canadian coins since that\'s my heritage.',
      coin_data: JSON.stringify({ name: coins[10].name, year: 1967, country: 'Canada', grade: 'MS-62' }),
      estimated_value: 20.00, likes: 28, comments_count: 6,
    },
    {
      id: uuidv4(), user_id: alice.id, type: 'educational',
      content: 'Did you know the 1955 Doubled Die Lincoln cent was accidentally released into circulation? The Mint tried to destroy them but approximately 40,000 escaped. Today they\'re worth thousands in any grade!',
      coin_data: JSON.stringify({ name: coins[9].name, year: 1955, country: 'United States' }),
      estimated_value: null, likes: 54, comments_count: 11,
    },
    {
      id: uuidv4(), user_id: bob.id, type: 'find',
      content: 'Best CRH session ever! Went through 10 rolls of halves and found three 40% silver 1966-1969 Kennedy halves. Face value $1.50, silver value around $12. Not bad!',
      coin_data: JSON.stringify({ name: 'Kennedy Half Dollar 40% Silver', year: 1967, country: 'United States' }),
      estimated_value: 12.00, likes: 33, comments_count: 7,
    },
    {
      id: uuidv4(), user_id: carol.id, type: 'question',
      content: 'What\'s the best way to store silver coins to prevent toning? I have some Morgan dollars I want to keep in top condition. Currently using cardboard 2x2 holders but worried about sulfur.',
      coin_data: JSON.stringify({}),
      estimated_value: null, likes: 18, comments_count: 16,
    },
    {
      id: uuidv4(), user_id: alice.id, type: 'showcase',
      content: 'Rare find: A Roman Sestertius of Emperor Hadrian dating to 119 AD. Over 1900 years old and still showing beautiful detail on the portrait. Ancient coins never get old!',
      coin_data: JSON.stringify({ name: coins[14].name, year: 119, country: 'Roman Empire', grade: 'VF-25' }),
      estimated_value: 600.00, likes: 72, comments_count: 18,
    },
    {
      id: uuidv4(), user_id: bob.id, type: 'educational',
      content: 'Buffalo nickel tip: Always check the date area and the word "FIVE CENTS" on the reverse. The high relief design caused these areas to wear quickly. Partially dated coins have their own valuation charts!',
      coin_data: JSON.stringify({ name: 'Buffalo Nickel', country: 'United States' }),
      estimated_value: null, likes: 29, comments_count: 5,
    },
    {
      id: uuidv4(), user_id: carol.id, type: 'showcase',
      content: 'Picked up a 2023 Canadian Maple Leaf today as my first silver bullion purchase. 1 troy oz of .9999 fine silver. Love having a coin that\'s both beautiful AND an investment!',
      coin_data: JSON.stringify({ name: coins[11].name, year: 2023, country: 'Canada', grade: 'MS-69' }),
      estimated_value: 40.00, likes: 12, comments_count: 2,
    },
    {
      id: uuidv4(), user_id: alice.id, type: 'find',
      content: 'CRH surprise: Searching through pennies at the bank and found a 1909 VDB Lincoln cent in a customer-wrapped roll! No mintmark, but still a beautiful first-year piece. The initials VDB are clearly visible!',
      coin_data: JSON.stringify({ name: '1909 VDB Lincoln Cent', year: 1909, country: 'United States', grade: 'VF' }),
      estimated_value: 15.00, likes: 45, comments_count: 9,
    },
    {
      id: uuidv4(), user_id: bob.id, type: 'question',
      content: 'I just got a coin from my grandfather\'s estate and I think it might be a CC Morgan dollar but I\'m not 100% sure. The mintmark looks like "CC" but it\'s faint. How can I tell for certain?',
      coin_data: JSON.stringify({ name: 'Possible CC Morgan Dollar', country: 'United States' }),
      estimated_value: null, likes: 24, comments_count: 13,
    },
  ];

  const insertPost = db.prepare(`
    INSERT INTO posts (id, user_id, type, content, coin_data, estimated_value, likes, comments_count)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of posts) {
    insertPost.run(p.id, p.user_id, p.type, p.content, p.coin_data, p.estimated_value || null, p.likes, p.comments_count);
  }

  console.log('Database seeded successfully!');
  console.log(`  - ${badges.length} badges`);
  console.log('  - 3 users (alice, bob, carol)');
  console.log(`  - ${coins.length} coins in catalog`);
  console.log(`  - ${aliceCoins.length + bobCoins.length} user coins`);
  console.log(`  - ${listings.length} marketplace listings`);
  console.log(`  - ${posts.length} community posts`);
}

module.exports = { seedDatabase };
