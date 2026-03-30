import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 12);
  const admin = await prisma.user.upsert({
    where: { email: "admin@chefconnect.com" },
    update: {},
    create: {
      email: "admin@chefconnect.com",
      passwordHash: adminHash,
      name: "Admin",
      role: "ADMIN",
    },
  });
  console.log("Admin user created:", admin.email);

  // Create a sample client
  const clientHash = await bcrypt.hash("client123", 12);
  const client = await prisma.user.upsert({
    where: { email: "client@example.com" },
    update: {},
    create: {
      email: "client@example.com",
      passwordHash: clientHash,
      name: "Jane Doe",
      phone: "555-0100",
      role: "CLIENT",
    },
  });
  console.log("Client user created:", client.email);

  // Create a second test client
  const client2Hash = await bcrypt.hash("test123", 12);
  const client2 = await prisma.user.upsert({
    where: { email: "testuser@example.com" },
    update: {},
    create: {
      email: "testuser@example.com",
      passwordHash: client2Hash,
      name: "Test User",
      phone: "555-0199",
      role: "CLIENT",
    },
  });
  console.log("Test user created:", client2.email);

  // Create sample chef users and profiles
  const chefData = [
    {
      email: "marco@example.com",
      name: "Marco Rossi",
      bio: "Italian-trained chef with 15 years of fine dining experience. Specializing in handmade pasta and regional Italian cuisine.",
      specialtyDish: "Handmade Truffle Ravioli",
      cuisineType: "Italian",
      hourlyRate: 85,
      bgCheckConsent: true,
      bgCheckStatus: "CLEARED",
      bgCheckFullName: "Marco Antonio Rossi",
      bgCheckDOB: "1986-05-14",
      bgCheckSSNLast4: "4821",
      bgCheckSubmittedAt: new Date("2026-02-10"),
      bgCheckClearedAt: new Date("2026-02-15"),
      vehicleLicensePlate: "7ABC123",
      vehicleMake: "Toyota",
      vehicleModel: "Camry",
      vehicleColor: "Silver",
      driversLicenseNumber: "D1234567",
      willTravelToHomes: true,
      tier: "CHEF",
      completedJobs: 12,
      verificationStatus: "APPROVED",
      idVerificationStatus: "VERIFIED",
      governmentIdType: "DRIVERS_LICENSE",
      governmentIdUrl: "/uploads/sample-id.jpg",
      selfieUrl: "/uploads/sample-selfie.jpg",
      fcraConsentSignature: "Marco Antonio Rossi",
      fcraConsentTimestamp: new Date("2026-02-10"),
      bgCheckAddress: "456 Olive Street, Los Angeles, CA 90001",
      termsAcceptedAt: new Date("2026-02-10"),
      antiPoachingAcceptedAt: new Date("2026-02-10"),
      specials: [
        { name: "Truffle Ravioli", description: "Handmade ravioli with black truffle cream sauce", price: 45 },
        { name: "Osso Buco Milanese", description: "Braised veal shanks with saffron risotto", price: 55 },
        { name: "Tiramisu", description: "Classic Italian dessert with espresso-soaked ladyfingers", price: 20 },
      ],
    },
    {
      email: "aiko@example.com",
      name: "Aiko Tanaka",
      bio: "Japanese-born chef blending traditional technique with modern flair. Former head chef at a Michelin-starred restaurant in Tokyo.",
      specialtyDish: "Omakase Sushi Experience",
      cuisineType: "Japanese",
      hourlyRate: 120,
      bgCheckConsent: true,
      bgCheckStatus: "PENDING",
      bgCheckFullName: "Aiko Tanaka",
      bgCheckDOB: "1990-11-03",
      bgCheckSSNLast4: "7732",
      bgCheckSubmittedAt: new Date("2026-03-25"),
      bgCheckClearedAt: null,
      vehicleLicensePlate: "8XYZ789",
      vehicleMake: "Honda",
      vehicleModel: "Accord",
      vehicleColor: "Black",
      driversLicenseNumber: "H9876543",
      willTravelToHomes: true,
      tier: "MASTER_CHEF",
      completedJobs: 28,
      verificationStatus: "BG_CHECK_RUNNING",
      idVerificationStatus: "VERIFIED",
      governmentIdType: "PASSPORT",
      governmentIdUrl: "/uploads/sample-id.jpg",
      selfieUrl: "/uploads/sample-selfie.jpg",
      fcraConsentSignature: "Aiko Tanaka",
      fcraConsentTimestamp: new Date("2026-03-25"),
      bgCheckAddress: "789 Sakura Lane, Torrance, CA 90501",
      termsAcceptedAt: new Date("2026-03-25"),
      antiPoachingAcceptedAt: new Date("2026-03-25"),
      specials: [
        { name: "Omakase Sushi (12 pc)", description: "Chef's selection of premium nigiri with imported fish", price: 95 },
        { name: "Wagyu Tataki", description: "Seared A5 wagyu with ponzu and microgreens", price: 75 },
        { name: "Matcha Lava Cake", description: "Warm matcha cake with white chocolate center", price: 25 },
      ],
    },
    {
      email: "carlos@example.com",
      name: "Carlos Rivera",
      bio: "Bringing the bold flavors of Mexico to your table. Authentic recipes passed down through generations, elevated with modern techniques.",
      specialtyDish: "Mole Negro Oaxaqueño",
      cuisineType: "Mexican",
      hourlyRate: 65,
      bgCheckConsent: true,
      bgCheckStatus: "NOT_SUBMITTED",
      bgCheckFullName: null,
      bgCheckDOB: null,
      bgCheckSSNLast4: null,
      bgCheckSubmittedAt: null,
      bgCheckClearedAt: null,
      vehicleLicensePlate: null,
      vehicleMake: null,
      vehicleModel: null,
      vehicleColor: null,
      driversLicenseNumber: null,
      willTravelToHomes: false,
      tier: "SOUS_CHEF",
      completedJobs: 2,
      verificationStatus: "NOT_STARTED",
      idVerificationStatus: "NOT_SUBMITTED",
      governmentIdType: null,
      governmentIdUrl: null,
      selfieUrl: null,
      fcraConsentSignature: null,
      fcraConsentTimestamp: null,
      bgCheckAddress: null,
      termsAcceptedAt: null,
      antiPoachingAcceptedAt: null,
      specials: [
        { name: "Mole Negro", description: "28-ingredient traditional Oaxacan mole with chicken", price: 40 },
        { name: "Cochinita Pibil Tacos", description: "Slow-roasted pork with pickled onions and habanero", price: 30 },
      ],
    },
  ];

  for (const chef of chefData) {
    const hash = await bcrypt.hash("chef123", 12);
    const user = await prisma.user.upsert({
      where: { email: chef.email },
      update: {},
      create: {
        email: chef.email,
        passwordHash: hash,
        name: chef.name,
        role: "CHEF",
      },
    });

    await prisma.chefProfile.upsert({
      where: { userId: user.id },
      update: {},
      create: {
        userId: user.id,
        servSafeCertNumber: `SS-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        servSafeCertExpiry: new Date("2027-12-31"),
        generalLiabilityPolicy: `GL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        generalLiabilityExpiry: new Date("2027-06-30"),
        productLiabilityPolicy: `PL-${Math.random().toString(36).slice(2, 8).toUpperCase()}`,
        productLiabilityExpiry: new Date("2027-06-30"),
        bio: chef.bio,
        cuisineType: chef.cuisineType,
        specialtyDish: chef.specialtyDish,
        hourlyRate: chef.hourlyRate,
        isApproved: chef.bgCheckStatus === "CLEARED",
        tier: chef.tier,
        completedJobs: chef.completedJobs,
        bgCheckConsent: chef.bgCheckConsent,
        bgCheckStatus: chef.bgCheckStatus,
        bgCheckFullName: chef.bgCheckFullName,
        bgCheckDOB: chef.bgCheckDOB,
        bgCheckSSNLast4: chef.bgCheckSSNLast4,
        bgCheckSubmittedAt: chef.bgCheckSubmittedAt,
        bgCheckClearedAt: chef.bgCheckClearedAt,
        vehicleLicensePlate: chef.vehicleLicensePlate,
        vehicleMake: chef.vehicleMake,
        vehicleModel: chef.vehicleModel,
        vehicleColor: chef.vehicleColor,
        driversLicenseNumber: chef.driversLicenseNumber,
        willTravelToHomes: chef.willTravelToHomes,
        verificationStatus: chef.verificationStatus,
        idVerificationStatus: chef.idVerificationStatus,
        governmentIdType: chef.governmentIdType,
        governmentIdUrl: chef.governmentIdUrl,
        selfieUrl: chef.selfieUrl,
        fcraConsentSignature: chef.fcraConsentSignature,
        fcraConsentTimestamp: chef.fcraConsentTimestamp,
        bgCheckAddress: chef.bgCheckAddress,
        termsAcceptedAt: chef.termsAcceptedAt,
        antiPoachingAcceptedAt: chef.antiPoachingAcceptedAt,
        specials: {
          create: chef.specials,
        },
      },
    });

    console.log("Chef created:", chef.name);
  }

  // Create a sample completed booking + review so there's data to see
  const chefProfile = await prisma.chefProfile.findFirst({
    where: { user: { email: "marco@example.com" } },
  });

  if (chefProfile) {
    const booking = await prisma.booking.create({
      data: {
        clientId: client.id,
        chefProfileId: chefProfile.id,
        date: new Date("2026-03-20"),
        time: "19:00",
        guestCount: 4,
        address: "123 Main Street, Beverly Hills, CA 90210",
        generalArea: "Beverly Hills",
        subtotal: 130,
        platformFee: 39,
        total: 169,
        status: "COMPLETED",
        jobStatus: "COMPLETED",
        items: {
          create: [
            { name: "Truffle Ravioli", price: 45, quantity: 1 },
          ],
        },
      },
    });

    await prisma.review.create({
      data: {
        bookingId: booking.id,
        clientId: client.id,
        chefProfileId: chefProfile.id,
        rating: 5,
        comment: "Absolutely incredible experience! Marco's truffle ravioli was the best I've ever had. Worth every penny.",
      },
    });
    console.log("Sample booking + review created (Jane → Marco)");

    // Create a pending booking from test user
    await prisma.booking.create({
      data: {
        clientId: client2.id,
        chefProfileId: chefProfile.id,
        date: new Date("2026-04-05"),
        time: "18:30",
        guestCount: 6,
        address: "456 Oak Avenue, Pasadena, CA 91101",
        generalArea: "Pasadena",
        subtotal: 170,
        platformFee: 51,
        total: 221,
        status: "CONFIRMED",
        jobStatus: "SCHEDULED",
        items: {
          create: [
            { name: "Osso Buco Milanese", price: 55, quantity: 1 },
          ],
        },
      },
    });
    console.log("Pending booking created (Test User → Marco)");
  }

  console.log("Seeding complete!");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
