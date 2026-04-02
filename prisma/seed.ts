import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { encrypt } from "../src/lib/crypto";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Foodies database...\n");

  // Clean non-upserted tables so re-seeds work idempotently
  await prisma.foodTruckMenuItem.deleteMany();
  await prisma.foodTruck.deleteMany();
  await prisma.referral.deleteMany();
  await prisma.favoriteChef.deleteMany();
  await prisma.chefAvailability.deleteMany();
  await prisma.incidentReport.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.tip.deleteMany();
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();

  const pw = await bcrypt.hash("Password123!", 12);

  // ── Admin ──
  const admin = await prisma.user.upsert({
    where: { email: "admin.foodiesservices@gmail.com" },
    update: { emailVerified: true },
    create: {
      email: "admin.foodiesservices@gmail.com",
      passwordHash: await bcrypt.hash("RiceBoogers123456!", 12),
      name: "Foodies Admin",
      role: "ADMIN",
      referralCode: "FOODIES-ADMIN",
      emailVerified: true,
    },
  });
  console.log("✅ Admin:", admin.email);

  // ── Clients ──
  const clients = [];
  const clientData = [
    { email: "jane@example.com", name: "Jane Mitchell", phone: "555-0100", referralCode: "JANE2025" },
    { email: "david@example.com", name: "David Chen", phone: "555-0101", referralCode: "DAVID2025" },
    { email: "sarah@example.com", name: "Sarah Williams", phone: "555-0102", referralCode: "SARAH2025" },
    { email: "mike@example.com", name: "Mike Johnson", phone: "555-0103", referralCode: "MIKE2025" },
  ];
  for (const c of clientData) {
    const user = await prisma.user.upsert({
      where: { email: c.email },
      update: { emailVerified: true },
      create: { ...c, passwordHash: pw, role: "CLIENT", termsAcceptedAt: new Date(), liabilityWaiverAt: new Date(), emailVerified: true },
    });
    clients.push(user);
    console.log("✅ Client:", user.name);
  }

  // ── Chefs ──
  const chefSeedData = [
    {
      email: "marco@example.com",
      name: "Marco Rossi",
      bio: "Italian-trained chef with 15 years of fine dining experience. Specializing in handmade pasta and regional Italian cuisine from Emilia-Romagna.",
      specialtyDish: "Handmade Truffle Ravioli",
      cuisineType: "Italian",
      hourlyRate: 85,
      tier: "MASTER_CHEF",
      completedJobs: 47,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-00482",
      activationStatus: "ACTIVE",
      trustScore: 92,
      boostActive: true,
      boostExpiresAt: new Date(Date.now() + 7 * 86400000),
      vehicle: { plate: "7ABC123", make: "Toyota", model: "Camry", color: "Silver" },
      specials: [
        { name: "Truffle Ravioli", description: "Handmade ravioli with black truffle cream sauce and aged Parmigiano", price: 45 },
        { name: "Osso Buco Milanese", description: "Braised veal shanks with saffron risotto and gremolata", price: 55 },
        { name: "Tiramisu", description: "Classic espresso-soaked ladyfingers with mascarpone cream", price: 20 },
        { name: "Burrata Caprese", description: "Fresh burrata with heirloom tomatoes and basil oil", price: 28 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=600", caption: "Fresh truffle ravioli" },
        { url: "https://images.unsplash.com/photo-1574894709920-11b28e7367e3?w=600", caption: "Osso buco plating" },
        { url: "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=600", caption: "Dessert spread" },
      ],
    },
    {
      email: "aiko@example.com",
      name: "Aiko Tanaka",
      bio: "Japanese-born chef blending traditional technique with modern flair. Former head chef at a Michelin-starred restaurant in Tokyo. Specializing in omakase and kaiseki.",
      specialtyDish: "Omakase Sushi Experience",
      cuisineType: "Japanese",
      hourlyRate: 150,
      tier: "MASTER_CHEF",
      completedJobs: 63,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-00519",
      activationStatus: "ACTIVE",
      trustScore: 97,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "8XYZ789", make: "Lexus", model: "RX", color: "Pearl White" },
      specials: [
        { name: "Omakase Sushi (12 pc)", description: "Chef's selection of premium nigiri with imported fish from Tsukiji", price: 120 },
        { name: "Wagyu Tataki", description: "Seared A5 wagyu with ponzu, microgreens, and truffle salt", price: 85 },
        { name: "Kaiseki Tasting (7 course)", description: "Traditional multi-course seasonal Japanese dinner", price: 200 },
        { name: "Matcha Lava Cake", description: "Warm matcha cake with white chocolate center and yuzu cream", price: 25 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600", caption: "Omakase sushi selection" },
        { url: "https://images.unsplash.com/photo-1553621042-f6e147245754?w=600", caption: "Wagyu preparation" },
        { url: "https://images.unsplash.com/photo-1580822184713-fc5400e7fe10?w=600", caption: "Kaiseki course" },
      ],
    },
    {
      email: "carlos@example.com",
      name: "Carlos Rivera",
      bio: "Bringing the bold flavors of Mexico to your table. Authentic recipes passed down through generations, elevated with modern techniques. From Oaxaca to your kitchen.",
      specialtyDish: "Mole Negro Oaxaqueño",
      cuisineType: "Mexican",
      hourlyRate: 65,
      tier: "CHEF",
      completedJobs: 18,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "state_farm",
      insurancePolicyNumber: "SF-9281374",
      activationStatus: "ACTIVE",
      trustScore: 78,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "4MEX567", make: "Ford", model: "F-150", color: "Red" },
      specials: [
        { name: "Mole Negro", description: "28-ingredient traditional Oaxacan mole with free-range chicken", price: 40 },
        { name: "Cochinita Pibil Tacos", description: "Slow-roasted pork with pickled red onions and habanero", price: 30 },
        { name: "Elote Street Corn", description: "Grilled corn with cotija, lime crema, and chili powder", price: 12 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=600", caption: "Mole negro plating" },
        { url: "https://images.unsplash.com/photo-1551504734-5ee1c4a1479b?w=600", caption: "Taco spread" },
      ],
    },
    {
      email: "priya@example.com",
      name: "Priya Sharma",
      bio: "Award-winning Indian chef specializing in regional cuisines from Kerala to Punjab. Known for complex spice layering and stunning presentation.",
      specialtyDish: "Hyderabadi Dum Biryani",
      cuisineType: "Indian",
      hourlyRate: 75,
      tier: "CHEF",
      completedJobs: 22,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "pending",
      insuranceProvider: null,
      insurancePolicyNumber: null,
      activationStatus: "PENDING_COMPLIANCE",
      trustScore: 65,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "3IND890", make: "Honda", model: "CR-V", color: "Blue" },
      specials: [
        { name: "Hyderabadi Dum Biryani", description: "Slow-cooked basmati with saffron, tender lamb, and aromatic spices", price: 38 },
        { name: "Butter Chicken", description: "Tandoori chicken in rich tomato-cream sauce with fresh naan", price: 32 },
        { name: "Masala Dosa", description: "Crispy fermented crepe with spiced potato filling and chutneys", price: 18 },
        { name: "Gulab Jamun", description: "Warm milk-solid dumplings in cardamom rose syrup", price: 14 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600", caption: "Biryani presentation" },
        { url: "https://images.unsplash.com/photo-1585937421612-70a008356fbe?w=600", caption: "Butter chicken" },
      ],
    },
    {
      email: "antoine@example.com",
      name: "Antoine Beaumont",
      bio: "Le Cordon Bleu graduate with 20 years in Parisian fine dining. Bringing the elegance and precision of French cuisine to intimate private events.",
      specialtyDish: "Beef Bourguignon",
      cuisineType: "French",
      hourlyRate: 130,
      tier: "MASTER_CHEF",
      completedJobs: 55,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-00601",
      activationStatus: "ACTIVE",
      trustScore: 95,
      boostActive: true,
      boostExpiresAt: new Date(Date.now() + 3 * 86400000),
      vehicle: { plate: "2FRN456", make: "BMW", model: "X3", color: "Midnight Blue" },
      specials: [
        { name: "Beef Bourguignon", description: "Burgundy-braised beef with pearl onions, mushrooms, and lardons", price: 52 },
        { name: "Duck Confit", description: "Slow-cooked duck leg with crispy skin, lentils du Puy, and jus", price: 48 },
        { name: "Crème Brûlée Trio", description: "Vanilla, lavender, and passion fruit crème brûlées", price: 22 },
        { name: "French Onion Soup", description: "Caramelized onion soup gratinéed with Gruyère", price: 18 },
        { name: "Tarte Tatin", description: "Caramelized upside-down apple tart with crème fraîche", price: 20 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600", caption: "Fine dining setup" },
        { url: "https://images.unsplash.com/photo-1600891964092-4316c288032e?w=600", caption: "Beef bourguignon" },
        { url: "https://images.unsplash.com/photo-1488477181946-6428a0291777?w=600", caption: "Crème brûlée" },
      ],
    },
    {
      email: "sofia@example.com",
      name: "Sofia Papadopoulos",
      bio: "Greek-American chef celebrating Mediterranean flavors. Farm-to-table advocate sourcing local ingredients for vibrant, healthy meals.",
      specialtyDish: "Grilled Lamb Chops with Tzatziki",
      cuisineType: "Mediterranean",
      hourlyRate: 70,
      tier: "SOUS_CHEF",
      completedJobs: 5,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "missing",
      insuranceProvider: null,
      insurancePolicyNumber: null,
      activationStatus: "PENDING_COMPLIANCE",
      trustScore: 42,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "6MED234", make: "Subaru", model: "Outback", color: "Green" },
      specials: [
        { name: "Grilled Lamb Chops", description: "Herb-marinated lamb with house-made tzatziki and roasted vegetables", price: 44 },
        { name: "Spanakopita", description: "Flaky phyllo filled with spinach, feta, and fresh herbs", price: 16 },
        { name: "Baklava", description: "Layers of phyllo with walnuts, pistachios, and honey syrup", price: 14 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600", caption: "Grilled lamb chops" },
      ],
    },
    {
      email: "kenji@example.com",
      name: "Kenji Yamamoto",
      bio: "Former ramen shop owner turned private chef. Specializing in Japanese comfort food, ramen, and izakaya-style small plates.",
      specialtyDish: "Tonkotsu Ramen",
      cuisineType: "Japanese",
      hourlyRate: 55,
      tier: "SOUS_CHEF",
      completedJobs: 3,
      isApproved: false,
      bgCheckStatus: "PENDING",
      verificationStatus: "BG_CHECK_RUNNING",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "missing",
      insuranceProvider: null,
      insurancePolicyNumber: null,
      activationStatus: "INCOMPLETE",
      trustScore: 15,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: null,
      specials: [
        { name: "Tonkotsu Ramen", description: "18-hour pork bone broth with chashu, ajitama, and handmade noodles", price: 28 },
        { name: "Karaage Plate", description: "Japanese fried chicken with kewpie mayo and shredded cabbage", price: 18 },
      ],
      gallery: [],
    },
    {
      email: "elena@example.com",
      name: "Elena Vasquez",
      bio: "Peruvian-born chef with a passion for ceviche and Nikkei cuisine. Blending South American and Japanese flavors in unexpected ways.",
      specialtyDish: "Classic Limeño Ceviche",
      cuisineType: "Peruvian",
      hourlyRate: 80,
      tier: "CHEF",
      completedJobs: 14,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "expired",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2024-00211",
      activationStatus: "RESTRICTED",
      trustScore: 35,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "9PER012", make: "Toyota", model: "RAV4", color: "White" },
      specials: [
        { name: "Classic Limeño Ceviche", description: "Fresh sea bass cured in tiger's milk with sweet potato and cancha", price: 34 },
        { name: "Lomo Saltado", description: "Stir-fried beef tenderloin with tomatoes, onions over fries and rice", price: 38 },
        { name: "Causa Limeña", description: "Layered potato terrine with avocado and shrimp", price: 22 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1535399831218-d5bd36d1a6b3?w=600", caption: "Ceviche" },
      ],
    },
    // ── 10 additional test chefs ──
    {
      email: "deshawn@example.com",
      name: "DeShawn Jackson",
      bio: "Southern soul food specialist born and raised in Memphis. Slow-smoked meats, from-scratch cornbread, and grandma's secret recipes passed down four generations.",
      specialtyDish: "Smoked Brisket Platter",
      cuisineType: "Southern / BBQ",
      hourlyRate: 60,
      tier: "CHEF",
      completedJobs: 31,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "state_farm",
      insurancePolicyNumber: "SF-7734921",
      activationStatus: "ACTIVE",
      trustScore: 84,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "BBQ4U01", make: "Chevy", model: "Silverado", color: "Black" },
      specials: [
        { name: "Smoked Brisket Platter", description: "16-hour oak-smoked brisket with house BBQ sauce, coleslaw, and baked beans", price: 42 },
        { name: "Shrimp & Grits", description: "Creamy stone-ground grits with sautéed Gulf shrimp and andouille sausage", price: 34 },
        { name: "Peach Cobbler", description: "Warm peach cobbler with brown sugar crust and vanilla bean ice cream", price: 16 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1529193591184-b1d58069ecdd?w=600", caption: "Smoked brisket" },
        { url: "https://images.unsplash.com/photo-1586190848861-99aa4a171e90?w=600", caption: "Soul food spread" },
      ],
    },
    {
      email: "mei@example.com",
      name: "Mei Lin Chen",
      bio: "Sichuan-born chef bringing the heat and numbing spice of authentic Chinese cuisine. Trained in both Cantonese dim sum and fiery Sichuan wok cooking.",
      specialtyDish: "Mapo Tofu & Dan Dan Noodles",
      cuisineType: "Chinese",
      hourlyRate: 70,
      tier: "CHEF",
      completedJobs: 26,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-00733",
      activationStatus: "ACTIVE",
      trustScore: 80,
      boostActive: true,
      boostExpiresAt: new Date(Date.now() + 5 * 86400000),
      vehicle: { plate: "WOK8888", make: "Honda", model: "Accord", color: "Red" },
      specials: [
        { name: "Mapo Tofu", description: "Silky tofu in fiery Sichuan chili-bean paste with ground pork and Sichuan peppercorn", price: 24 },
        { name: "Har Gow Dim Sum (12 pc)", description: "Crystal shrimp dumplings handmade with translucent wrappers", price: 30 },
        { name: "Dan Dan Noodles", description: "Spicy Sichuan noodles with chili oil, minced pork, and crushed peanuts", price: 20 },
        { name: "Peking Duck (whole)", description: "Crispy roasted duck with scallion pancakes, hoisin, and julienned cucumber", price: 85 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1563245372-f21724e3856d?w=600", caption: "Dim sum spread" },
        { url: "https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600", caption: "Wok cooking" },
      ],
    },
    {
      email: "nadia@example.com",
      name: "Nadia Al-Rashid",
      bio: "Lebanese-American chef celebrating the rich spices and traditions of Middle Eastern cuisine. From creamy hummus to perfectly grilled kebabs, every dish tells a story.",
      specialtyDish: "Mixed Grill Mezze Feast",
      cuisineType: "Middle Eastern",
      hourlyRate: 75,
      tier: "CHEF",
      completedJobs: 19,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "state_farm",
      insurancePolicyNumber: "SF-6629183",
      activationStatus: "ACTIVE",
      trustScore: 76,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "MZE3210", make: "Toyota", model: "Highlander", color: "Silver" },
      specials: [
        { name: "Mixed Grill Mezze Feast", description: "Lamb kofta, chicken shawarma, and beef kebab with hummus, baba ganoush, and fresh pita", price: 52 },
        { name: "Lamb Mansaf", description: "Jordanian national dish — lamb in fermented yogurt sauce over aromatic rice", price: 46 },
        { name: "Kunafa", description: "Warm cheese pastry with shredded phyllo and orange blossom syrup", price: 18 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1540914124281-342587941389?w=600", caption: "Mezze spread" },
        { url: "https://images.unsplash.com/photo-1599487488170-d11ec9c172f0?w=600", caption: "Grilled kebabs" },
      ],
    },
    {
      email: "oluwaseun@example.com",
      name: "Oluwaseun Adeyemi",
      bio: "Nigerian chef sharing the bold, aromatic flavors of West African cooking. Specializing in jollof rice (the Nigerian way!), suya, and traditional soups and stews.",
      specialtyDish: "Party Jollof Rice & Suya",
      cuisineType: "West African",
      hourlyRate: 55,
      tier: "SOUS_CHEF",
      completedJobs: 8,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-00891",
      activationStatus: "ACTIVE",
      trustScore: 60,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "JOL2025", make: "Nissan", model: "Rogue", color: "Blue" },
      specials: [
        { name: "Party Jollof Rice", description: "Smoky, tomato-based rice cooked low and slow with the perfect bottom crust", price: 28 },
        { name: "Suya Platter", description: "Spicy grilled beef skewers with yaji seasoning, sliced onions, and tomatoes", price: 32 },
        { name: "Egusi Soup with Pounded Yam", description: "Rich melon seed soup with assorted meats and fresh spinach", price: 36 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=600", caption: "Jollof rice" },
      ],
    },
    {
      email: "bjorn@example.com",
      name: "Björn Lindqvist",
      bio: "Scandinavian chef focused on New Nordic cuisine. Foraging, fermenting, and celebrating clean northern flavors with modern technique.",
      specialtyDish: "Gravlax Tasting Board",
      cuisineType: "Scandinavian",
      hourlyRate: 110,
      tier: "MASTER_CHEF",
      completedJobs: 40,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-00950",
      activationStatus: "ACTIVE",
      trustScore: 90,
      boostActive: true,
      boostExpiresAt: new Date(Date.now() + 4 * 86400000),
      vehicle: { plate: "NRD7777", make: "Volvo", model: "XC60", color: "Forest Green" },
      specials: [
        { name: "Gravlax Tasting Board", description: "House-cured salmon three ways with dill, beetroot, and aquavit", price: 48 },
        { name: "Swedish Meatballs", description: "Classic köttbullar with lingonberry, cream sauce, and pickled cucumber", price: 32 },
        { name: "Smoked Arctic Char", description: "Alder-smoked char with horseradish cream and rye croutons", price: 44 },
        { name: "Cardamom Buns", description: "Warm kardemummabullar with pearl sugar glaze", price: 14 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?w=600", caption: "Nordic plating" },
        { url: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600", caption: "Gravlax board" },
      ],
    },
    {
      email: "kwame@example.com",
      name: "Kwame Mensah",
      bio: "Ghanaian-American chef bridging African and Caribbean flavors. Known for vibrant spice blends, plantain dishes, and unforgettable jerk marinades.",
      specialtyDish: "Jerk Chicken with Fried Plantain",
      cuisineType: "Caribbean / African Fusion",
      hourlyRate: 65,
      tier: "CHEF",
      completedJobs: 15,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "state_farm",
      insurancePolicyNumber: "SF-5518274",
      activationStatus: "ACTIVE",
      trustScore: 72,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "JRK4200", make: "Jeep", model: "Wrangler", color: "Yellow" },
      specials: [
        { name: "Jerk Chicken", description: "Scotch bonnet and allspice marinated chicken with fried plantain and rice & peas", price: 36 },
        { name: "Waakye Platter", description: "Ghanaian rice and beans with shito pepper sauce, spaghetti, and kelewele", price: 28 },
        { name: "Rum Cake", description: "Dense Caribbean rum cake soaked in dark rum and topped with caramel glaze", price: 18 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1532550907401-a500c9a57435?w=600", caption: "Jerk chicken platter" },
      ],
    },
    {
      email: "hannah@example.com",
      name: "Hannah Park",
      bio: "Korean-American chef specializing in Korean comfort food and modern Korean BBQ. From kimchi jjigae to perfectly grilled galbi, bringing Seoul to your table.",
      specialtyDish: "Korean BBQ Tableside Experience",
      cuisineType: "Korean",
      hourlyRate: 90,
      tier: "CHEF",
      completedJobs: 24,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-01022",
      activationStatus: "ACTIVE",
      trustScore: 82,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "BBQ9090", make: "Hyundai", model: "Tucson", color: "White" },
      specials: [
        { name: "Korean BBQ Experience", description: "Tableside grilled galbi, bulgogi, and samgyeopsal with all the banchan", price: 65 },
        { name: "Kimchi Jjigae", description: "Deeply fermented kimchi stew with pork belly and silken tofu", price: 26 },
        { name: "Japchae", description: "Glass noodles stir-fried with vegetables, beef, and sesame oil", price: 22 },
        { name: "Hotteok", description: "Sweet Korean pancakes filled with brown sugar, cinnamon, and crushed peanuts", price: 14 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1590301157890-4810ed352733?w=600", caption: "Korean BBQ spread" },
        { url: "https://images.unsplash.com/photo-1583224994076-0a3cbb62aa38?w=600", caption: "Banchan selection" },
      ],
    },
    {
      email: "luca@example.com",
      name: "Luca DiNapoli",
      bio: "Neapolitan pizza master and rustic Italian home cooking specialist. Trained in Naples, bringing authentic wood-fired techniques to your backyard.",
      specialtyDish: "Neapolitan Pizza Party",
      cuisineType: "Italian",
      hourlyRate: 50,
      tier: "SOUS_CHEF",
      completedJobs: 9,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-01100",
      activationStatus: "ACTIVE",
      trustScore: 55,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "PIZ2025", make: "Fiat", model: "500X", color: "Red" },
      specials: [
        { name: "Neapolitan Pizza Party (10 pies)", description: "Authentic 90-second fired pizzas — Margherita, Diavola, Quattro Formaggi, and more", price: 120 },
        { name: "Arancini", description: "Crispy saffron risotto balls stuffed with mozzarella and ragù", price: 18 },
        { name: "Limoncello Panna Cotta", description: "Silky lemon custard with Amalfi coast limoncello", price: 14 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=600", caption: "Neapolitan pizza" },
      ],
    },
    {
      email: "fatima@example.com",
      name: "Fatima Oumar",
      bio: "Moroccan chef and spice expert. Tagines simmered to perfection, hand-rolled couscous, and pastilla that will transport you straight to Marrakech.",
      specialtyDish: "Lamb Tagine with Preserved Lemon",
      cuisineType: "Moroccan",
      hourlyRate: 80,
      tier: "CHEF",
      completedJobs: 20,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "state_farm",
      insurancePolicyNumber: "SF-4412098",
      activationStatus: "ACTIVE",
      trustScore: 77,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "TAG5050", make: "Mercedes", model: "GLA", color: "Sand" },
      specials: [
        { name: "Lamb Tagine", description: "Slow-braised lamb with preserved lemons, olives, and saffron over fluffy couscous", price: 46 },
        { name: "Chicken Pastilla", description: "Flaky phyllo pie with spiced chicken, almonds, and cinnamon sugar", price: 38 },
        { name: "Moroccan Mint Tea & Pastries", description: "Traditional gunpowder tea service with honey-soaked chebakia and gazelle horns", price: 20 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1541518763669-27fef04b14ea?w=600", caption: "Lamb tagine" },
        { url: "https://images.unsplash.com/photo-1511690743698-d9d18f7e20f1?w=600", caption: "Moroccan tea" },
      ],
    },
    {
      email: "travis@example.com",
      name: "Travis O'Brien",
      bio: "Farm-to-table American chef with a focus on sustainable, locally sourced ingredients. Seasonal menus that change weekly. Clean, bold flavors.",
      specialtyDish: "Pan-Seared Duck Breast",
      cuisineType: "Modern American",
      hourlyRate: 95,
      tier: "CHEF",
      completedJobs: 28,
      isApproved: true,
      bgCheckStatus: "CLEAR",
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      insuranceStatus: "verified",
      insuranceProvider: "thimble",
      insurancePolicyNumber: "THM-2025-01200",
      activationStatus: "ACTIVE",
      trustScore: 85,
      boostActive: false,
      boostExpiresAt: null,
      vehicle: { plate: "FRM2025", make: "Ford", model: "Bronco", color: "Army Green" },
      specials: [
        { name: "Pan-Seared Duck Breast", description: "Crispy skin duck with cherry gastrique, roasted root vegetables, and herb jus", price: 54 },
        { name: "Heirloom Tomato Burrata Salad", description: "Local heirloom tomatoes with burrata, aged balsamic, and microgreens", price: 24 },
        { name: "Braised Short Ribs", description: "48-hour braised short ribs with truffle polenta and red wine reduction", price: 48 },
        { name: "Seasonal Fruit Galette", description: "Rustic open-faced tart with whatever is fresh from the farm", price: 18 },
      ],
      gallery: [
        { url: "https://images.unsplash.com/photo-1544025162-d76694265947?w=600", caption: "Duck breast plating" },
        { url: "https://images.unsplash.com/photo-1466637574441-749b8f19452f?w=600", caption: "Farm fresh ingredients" },
      ],
    },
  ];

  const chefProfiles: { id: string; name: string }[] = [];

  for (const chef of chefSeedData) {
    const user = await prisma.user.upsert({
      where: { email: chef.email },
      update: { emailVerified: true },
      create: {
        email: chef.email,
        passwordHash: pw,
        name: chef.name,
        role: "CHEF",
        referralCode: chef.name.split(" ")[0].toUpperCase() + "2025",
        emailVerified: true,
      },
    });

    const profile = await prisma.chefProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        bio: chef.bio,
        cuisineType: chef.cuisineType,
        specialtyDish: chef.specialtyDish,
        hourlyRate: chef.hourlyRate,
        isApproved: chef.isApproved,
        isActive: true,
        tier: chef.tier,
        completedJobs: chef.completedJobs,

        // Certifications (sample data)
        servSafeCertNumber: `SS-${chef.name.split(" ")[0].toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}`,
        servSafeCertExpiry: new Date("2027-12-31"),
        generalLiabilityPolicy: `GL-${Math.floor(100000 + Math.random() * 900000)}`,
        generalLiabilityExpiry: new Date("2027-06-30"),
        productLiabilityPolicy: `PL-${Math.floor(100000 + Math.random() * 900000)}`,
        productLiabilityExpiry: new Date("2027-06-30"),

        // Background check (encrypted PII)
        bgCheckConsent: true,
        bgCheckStatus: chef.bgCheckStatus,
        bgCheckFullName: chef.name,
        bgCheckMiddleName: encrypt("James"),
        bgCheckDOB: encrypt("1985-01-15"),
        bgCheckSSNLast4: encrypt(String(Math.floor(1000 + Math.random() * 9000))),
        bgCheckSSN: encrypt(`${Math.floor(100 + Math.random() * 900)}${Math.floor(10 + Math.random() * 90)}${Math.floor(1000 + Math.random() * 9000)}`),
        bgCheckSubmittedAt: chef.bgCheckStatus !== "NOT_SUBMITTED" ? new Date("2025-01-15") : null,
        bgCheckClearedAt: chef.bgCheckStatus === "CLEAR" ? new Date("2025-01-20") : null,
        bgCheckAddress: encrypt("123 Sample St"),
        bgCheckCity: "Lansing",
        bgCheckState: "MI",
        bgCheckZipCode: "48912",
        bgCheckPreviousAddress: encrypt("456 Old Rd, Detroit, MI 48201"),
        verificationStatus: chef.verificationStatus,
        idVerificationStatus: chef.idVerificationStatus,
        governmentIdType: "DRIVERS_LICENSE",
        governmentIdUrl: "/uploads/sample-id.jpg",
        selfieUrl: "/uploads/sample-selfie.jpg",
        fcraConsentSignature: chef.name,
        fcraConsentTimestamp: new Date("2025-01-10"),

        // Vehicle
        vehicleLicensePlate: chef.vehicle?.plate ?? null,
        vehicleMake: chef.vehicle?.make ?? null,
        vehicleModel: chef.vehicle?.model ?? null,
        vehicleColor: chef.vehicle?.color ?? null,
        driversLicenseNumber: chef.vehicle ? encrypt(`DL-${Math.floor(1000000 + Math.random() * 9000000)}`) : null,
        willTravelToHomes: true,

        // Terms
        termsAcceptedAt: chef.isApproved ? new Date("2025-01-10") : null,
        antiPoachingAcceptedAt: chef.isApproved ? new Date("2025-01-10") : null,

        // Phase 10 fields
        insuranceStatus: chef.insuranceStatus,
        insuranceProvider: chef.insuranceProvider,
        insurancePolicyNumber: chef.insurancePolicyNumber,
        insuranceVerified: chef.insuranceStatus === "verified",
        insuranceVerifiedAt: chef.insuranceStatus === "verified" ? new Date("2025-02-01") : null,
        insuranceDocUrl: chef.insuranceStatus !== "missing" ? "/uploads/sample-insurance.pdf" : null,
        insuranceExpiry: chef.insuranceStatus === "expired" ? new Date("2025-01-01") : chef.insuranceStatus === "verified" ? new Date("2026-06-30") : null,
        trustScore: chef.trustScore,
        boostActive: chef.boostActive,
        boostExpiresAt: chef.boostExpiresAt,
        activationStatus: chef.activationStatus,

        // Specials — mark first one as this week's special
        specials: { create: chef.specials.map((s, i) => ({
          ...s,
          isWeeklySpecial: i === 0,
          weekStartDate: i === 0 ? (() => { const d = new Date(); d.setDate(d.getDate() - ((d.getDay() + 6) % 7)); d.setHours(0,0,0,0); return d; })() : null,
        })) },

        // Gallery
        galleryImages: chef.gallery.length > 0 ? {
          create: chef.gallery.map((g, i) => ({ imageUrl: g.url, caption: g.caption, sortOrder: i })),
        } : undefined,
      },
    });

    chefProfiles.push({ id: profile.id, name: chef.name });
    console.log(`✅ Chef: ${chef.name} (${chef.tier}, trust: ${chef.trustScore}, insurance: ${chef.insuranceStatus}, activation: ${chef.activationStatus})`);
  }

  // ── Bookings, Reviews, Messages, Tips ──
  const activeChefs = chefProfiles.filter((_, i) => chefSeedData[i].isApproved);

  // Completed bookings with reviews
  const completedBookings = [
    { clientIdx: 0, chefIdx: 0, date: "2025-05-10", time: "19:00", guests: 4, area: "Beverly Hills", subtotal: 340, rating: 5, comment: "Absolutely incredible! Marco's truffle ravioli was the best I've ever had. The whole evening felt like dining in Tuscany." },
    { clientIdx: 1, chefIdx: 0, date: "2025-05-15", time: "18:30", guests: 6, area: "Pasadena", subtotal: 510, rating: 5, comment: "Marco cooked a 5-course Italian feast for our anniversary. Every dish was perfection. Can't wait to book again!" },
    { clientIdx: 0, chefIdx: 1, date: "2025-04-22", time: "19:30", guests: 2, area: "Santa Monica", subtotal: 440, rating: 5, comment: "Aiko's omakase was a life-changing experience. Each piece of sushi was a work of art. Worth every penny." },
    { clientIdx: 2, chefIdx: 1, date: "2025-05-01", time: "18:00", guests: 8, area: "Bel Air", subtotal: 1200, rating: 5, comment: "The kaiseki dinner for our dinner party was extraordinary. Aiko is a true artist." },
    { clientIdx: 1, chefIdx: 2, date: "2025-04-28", time: "17:00", guests: 10, area: "East Lansing", subtotal: 400, rating: 4, comment: "Carlos brought the party! His mole was incredible and the tacos were a huge hit. One star off only because he ran a bit late." },
    { clientIdx: 3, chefIdx: 2, date: "2025-05-05", time: "19:00", guests: 4, area: "Downtown Lansing", subtotal: 260, rating: 5, comment: "Best Mexican food I've had outside of Mexico City. The mole negro was unbelievable." },
    { clientIdx: 0, chefIdx: 3, date: "2025-05-08", time: "18:00", guests: 6, area: "Okemos", subtotal: 450, rating: 4, comment: "Priya's biryani was absolutely authentic. The spice layering was complex and beautiful. Slightly too spicy for one guest." },
    { clientIdx: 2, chefIdx: 4, date: "2025-04-15", time: "19:30", guests: 2, area: "Beverly Hills", subtotal: 520, rating: 5, comment: "Antoine prepared the most romantic French dinner. The duck confit was sublime and the crème brûlée was perfect." },
    { clientIdx: 3, chefIdx: 4, date: "2025-05-12", time: "18:00", guests: 4, area: "Grosse Pointe", subtotal: 680, rating: 5, comment: "Michelin-star quality in our own home. Antoine is a master of his craft. The beef bourguignon was heavenly." },
    { clientIdx: 1, chefIdx: 4, date: "2025-05-18", time: "19:00", guests: 6, area: "Ann Arbor", subtotal: 780, rating: 4, comment: "Outstanding French cuisine for our corporate dinner. Antoine was professional and the food was incredible." },
  ];

  for (const b of completedBookings) {
    const platformFee = Math.round(b.subtotal * 0.30 * 100) / 100;
    const clientServiceFee = Math.round(b.subtotal * 0.08 * 100) / 100;
    const total = Math.round((b.subtotal + clientServiceFee) * 100) / 100;

    const booking = await prisma.booking.create({
      data: {
        clientId: clients[b.clientIdx].id,
        chefProfileId: activeChefs[b.chefIdx].id,
        date: new Date(b.date),
        time: b.time,
        guestCount: b.guests,
        address: `${100 + b.clientIdx * 100} Sample Street, ${b.area}, MI 48912`,
        generalArea: b.area,
        subtotal: b.subtotal,
        platformFee,
        clientServiceFee,
        total,
        status: "COMPLETED",
        jobStatus: "COMPLETED",
        paymentStatus: "RELEASED",
        payoutStatus: "PAID",
      },
    });

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        clientId: clients[b.clientIdx].id,
        chefProfileId: activeChefs[b.chefIdx].id,
        rating: b.rating,
        comment: b.comment,
      },
    });
  }
  console.log(`✅ ${completedBookings.length} completed bookings with reviews`);

  // Upcoming / active bookings
  const upcomingBookings = [
    { clientIdx: 0, chefIdx: 0, date: new Date(Date.now() + 3 * 86400000), time: "19:00", guests: 4, area: "Beverly Hills", subtotal: 340, status: "CONFIRMED", jobStatus: "SCHEDULED" },
    { clientIdx: 1, chefIdx: 1, date: new Date(Date.now() + 5 * 86400000), time: "18:30", guests: 8, area: "Bel Air", subtotal: 1200, status: "CONFIRMED", jobStatus: "SCHEDULED" },
    { clientIdx: 2, chefIdx: 4, date: new Date(Date.now() + 7 * 86400000), time: "19:30", guests: 2, area: "Downtown Lansing", subtotal: 520, status: "CONFIRMED", jobStatus: "SCHEDULED" },
    { clientIdx: 3, chefIdx: 2, date: new Date(Date.now() + 1 * 86400000), time: "17:00", guests: 12, area: "East Lansing", subtotal: 650, status: "PENDING", jobStatus: "SCHEDULED" },
    { clientIdx: 0, chefIdx: 4, date: new Date(Date.now() + 10 * 86400000), time: "18:00", guests: 6, area: "Ann Arbor", subtotal: 780, status: "PENDING", jobStatus: "SCHEDULED" },
  ];

  for (const b of upcomingBookings) {
    const platformFee = Math.round(b.subtotal * 0.30 * 100) / 100;
    const clientServiceFee = Math.round(b.subtotal * 0.08 * 100) / 100;
    const total = Math.round((b.subtotal + clientServiceFee) * 100) / 100;

    await prisma.booking.create({
      data: {
        clientId: clients[b.clientIdx].id,
        chefProfileId: activeChefs[b.chefIdx].id,
        date: b.date,
        time: b.time,
        guestCount: b.guests,
        address: `${200 + b.clientIdx * 100} Oak Avenue, ${b.area}, MI 48912`,
        generalArea: b.area,
        subtotal: b.subtotal,
        platformFee,
        clientServiceFee,
        total,
        status: b.status,
        jobStatus: b.jobStatus,
      },
    });
  }
  console.log(`✅ ${upcomingBookings.length} upcoming bookings`);

  // Cancelled booking
  const cancelledBooking = await prisma.booking.create({
    data: {
      clientId: clients[2].id,
      chefProfileId: activeChefs[0].id,
      date: new Date(Date.now() + 2 * 86400000),
      time: "18:00",
      guestCount: 4,
      address: "300 Elm St, Lansing, MI 48912",
      generalArea: "Lansing",
      subtotal: 340,
      platformFee: 102,
      clientServiceFee: 27.20,
      total: 367.20,
      status: "CANCELLED",
      cancelledAt: new Date(),
      cancelledBy: clients[2].id,
      cancellationFeePercent: 0,
      cancellationFee: 0,
      refundAmount: 367.20,
    },
  });
  console.log("✅ 1 cancelled booking");

  // ── Messages (sample conversation) ──
  const firstUpcoming = await prisma.booking.findFirst({
    where: { status: "CONFIRMED" },
    include: { chefProfile: { include: { user: true } } },
  });
  if (firstUpcoming) {
    const chefUserId = firstUpcoming.chefProfile.user.id;
    await prisma.message.createMany({
      data: [
        { bookingId: firstUpcoming.id, senderId: firstUpcoming.clientId, receiverId: chefUserId, content: "Hi! I'm so excited for our dinner. Any dietary questions?" },
        { bookingId: firstUpcoming.id, senderId: chefUserId, receiverId: firstUpcoming.clientId, content: "Hello! Can't wait either. Are there any allergies I should know about?" },
        { bookingId: firstUpcoming.id, senderId: firstUpcoming.clientId, receiverId: chefUserId, content: "One guest is allergic to shellfish, otherwise we're good!" },
        { bookingId: firstUpcoming.id, senderId: chefUserId, receiverId: firstUpcoming.clientId, content: "Noted! I'll adjust the menu. I'll bring everything fresh the day of. See you soon!" },
      ],
    });
    console.log("✅ Sample messages on confirmed booking");
  }

  // ── Tips ──
  const completedWithReview = await prisma.booking.findMany({
    where: { status: "COMPLETED" },
    take: 4,
  });
  for (const b of completedWithReview) {
    await prisma.tip.upsert({
      where: { bookingId: b.id },
      update: {},
      create: {
        bookingId: b.id,
        amount: Math.round((b.subtotal * (0.15 + Math.random() * 0.10)) * 100) / 100,
        message: ["Thank you so much!", "You're amazing!", "Best meal ever!", "Can't wait to book again!"][Math.floor(Math.random() * 4)],
      },
    });
  }
  console.log("✅ Tips on completed bookings");

  // ── Notifications ──
  await prisma.notification.createMany({
    data: [
      { userId: clients[0].id, type: "BOOKING_CONFIRMED", title: "Booking Confirmed!", body: "Your booking with Marco Rossi has been confirmed for next week.", isRead: true },
      { userId: clients[0].id, type: "TIP", title: "Tip Sent", body: "Your tip of $51.00 was sent to Marco Rossi.", isRead: true },
      { userId: clients[0].id, type: "BOOKING_CREATED", title: "New Booking", body: "Your booking with Antoine Beaumont is pending confirmation.", isRead: false },
      { userId: clients[1].id, type: "BOOKING_CONFIRMED", title: "Booking Confirmed!", body: "Your booking with Aiko Tanaka has been confirmed.", isRead: false },
      { userId: admin.id, type: "BG_CHECK_UPDATE", title: "Background Check Complete", body: "Background check cleared for Marco Rossi.", isRead: true },
      { userId: admin.id, type: "EXPIRY_WARNING", title: "Insurance Expiring", body: "Elena Vasquez's insurance policy has expired.", isRead: false },
    ],
  });
  console.log("✅ Sample notifications");

  // ── Audit Log entries ──
  await prisma.auditLog.createMany({
    data: [
      { adminUserId: admin.id, action: "APPROVE_CHEF", targetType: "CHEF", targetId: chefProfiles[0].id, details: JSON.stringify({ chef: "Marco Rossi", reason: "All checks passed" }) },
      { adminUserId: admin.id, action: "APPROVE_CHEF", targetType: "CHEF", targetId: chefProfiles[1].id, details: JSON.stringify({ chef: "Aiko Tanaka", reason: "All checks passed" }) },
      { adminUserId: admin.id, action: "OVERRIDE_TIER", targetType: "CHEF", targetId: chefProfiles[1].id, details: JSON.stringify({ chef: "Aiko Tanaka", from: "CHEF", to: "MASTER_CHEF" }) },
      { adminUserId: admin.id, action: "CLEAR_BG_CHECK", targetType: "CHEF", targetId: chefProfiles[2].id, details: JSON.stringify({ chef: "Carlos Rivera" }) },
    ],
  });
  console.log("✅ Audit log entries");

  // ── Incident Report ──
  await prisma.incidentReport.create({
    data: {
      reporterId: clients[3].id,
      reportedUserId: (await prisma.user.findFirst({ where: { email: "elena@example.com" } }))!.id,
      type: "NO_SHOW",
      severity: "HIGH",
      description: "Chef did not arrive for the scheduled booking and was unresponsive to messages for 2 hours.",
      status: "RESOLVED",
      adminNotes: "Chef confirmed personal emergency. Insurance policy also found expired. Account restricted pending compliance.",
      resolvedAt: new Date("2025-05-20"),
      resolvedBy: admin.id,
    },
  });
  console.log("✅ Sample incident report");

  // ── Chef Availability (next 14 days for Marco) ──
  const marcoProfile = chefProfiles[0];
  for (let i = 0; i < 14; i++) {
    const d = new Date(Date.now() + i * 86400000);
    // Block Mondays and Tuesdays
    if (d.getDay() === 1 || d.getDay() === 2) {
      await prisma.chefAvailability.create({
        data: { chefProfileId: marcoProfile.id, date: d, isBlocked: true, note: "Day off" },
      });
    }
  }
  console.log("✅ Chef availability (Marco: Mon/Tue blocked)");

  // ── Favorite Chefs ──
  await prisma.favoriteChef.createMany({
    data: [
      { userId: clients[0].id, chefProfileId: chefProfiles[0].id },
      { userId: clients[0].id, chefProfileId: chefProfiles[1].id },
      { userId: clients[0].id, chefProfileId: chefProfiles[4].id },
      { userId: clients[1].id, chefProfileId: chefProfiles[1].id },
      { userId: clients[1].id, chefProfileId: chefProfiles[4].id },
      { userId: clients[2].id, chefProfileId: chefProfiles[4].id },
    ],
    skipDuplicates: true,
  });
  console.log("✅ Client favorites");

  // ── Referrals ──
  await prisma.referral.create({
    data: {
      referrerId: clients[0].id,
      referredUserId: clients[3].id,
      type: "CLIENT_REFERRAL",
      status: "CREDITED",
      creditAmount: 25,
    },
  });
  await prisma.user.update({
    where: { id: clients[0].id },
    data: { referralCredits: 25 },
  });
  console.log("✅ Sample referral (Jane → Mike, $25 credit)");

  // ── Food Truck ──
  const truck = await prisma.foodTruck.create({
    data: {
      ownerId: (await prisma.user.findFirst({ where: { email: "carlos@example.com" } }))!.id,
      name: "Carlos's Taco Truck",
      description: "Authentic Oaxacan street food on wheels. Mole, tacos, elote, and more!",
      cuisineType: "Mexican Street Food",
      location: "Downtown Lansing Farmers Market",
      schedule: "Thu-Sun 11am-8pm",
      priceRange: "$$",
      isFeatured: true,
      isActive: true,
      latitude: 42.7325,
      longitude: -84.5555,
      phone: "555-0200",
      menuItems: {
        create: [
          { name: "Street Tacos (3)", description: "Choice of carne asada, al pastor, or carnitas", price: 12 },
          { name: "Mole Negro Plate", description: "Chicken in Oaxacan mole with rice and beans", price: 16 },
          { name: "Elote", description: "Grilled corn with cotija, lime, and chili", price: 6 },
          { name: "Horchata", description: "Housemade rice milk with cinnamon", price: 4 },
        ],
      },
    },
  });
  console.log("✅ Food truck: Carlos's Taco Truck");

  console.log("\n🎉 Seeding complete! Database is ready.\n");
  console.log("═══════════════════════════════════════════");
  console.log("  TEST ACCOUNTS (all password: Password123!)");
  console.log("═══════════════════════════════════════════");
  console.log("  Admin:  admin.foodiesservices@gmail.com / RiceBoogers123456!");
  console.log("  Client: jane@example.com");
  console.log("  Client: david@example.com");
  console.log("  Client: sarah@example.com");
  console.log("  Client: mike@example.com");
  console.log("  Chef:   marco@example.com  (Master Chef, ★92 trust, boosted)");
  console.log("  Chef:   aiko@example.com   (Master Chef, ★97 trust, top rated)");
  console.log("  Chef:   carlos@example.com (Chef, ★78 trust, has food truck)");
  console.log("  Chef:   priya@example.com  (Chef, ★65 trust, pending insurance)");
  console.log("  Chef:   antoine@example.com(Master Chef, ★95 trust, boosted)");
  console.log("  Chef:   sofia@example.com  (Sous Chef, ★42 trust, no insurance)");
  console.log("  Chef:   kenji@example.com  (Sous Chef, ★15 trust, incomplete)");
  console.log("  Chef:   elena@example.com  (Chef, ★35 trust, RESTRICTED)");
  console.log("═══════════════════════════════════════════");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
