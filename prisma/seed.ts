import { PrismaClient, Role } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("→ Seeding Victory Pest Solutions tenant...");

  const company = await prisma.company.upsert({
    where: { domain: "localhost" },
    update: {},
    create: {
      name: "Victory Pest Solutions",
      domain: "localhost",
      primaryColor: "#1565C0",
      secondaryColor: "#29ABE2",
      active: true,
      truckInventoryEnabled: false,
    },
  });
  console.log(`  ✓ Company: ${company.name}`);

  await prisma.supervisorPermissions.upsert({
    where: { companyId: company.id },
    update: {},
    create: { companyId: company.id },
  });

  const locationData = [
    { name: "Norte", city: "Newark", state: "NJ" },
    { name: "Central", city: "Trenton", state: "NJ" },
    { name: "Sur", city: "Camden", state: "NJ" },
  ];
  const locations: Record<string, { id: string }> = {};
  for (const l of locationData) {
    const existing = await prisma.location.findFirst({
      where: { companyId: company.id, name: l.name },
    });
    const loc = existing
      ? await prisma.location.update({
          where: { id: existing.id },
          data: { city: l.city, state: l.state, active: true },
        })
      : await prisma.location.create({
          data: { companyId: company.id, ...l, active: true },
        });
    locations[l.name] = { id: loc.id };
  }
  console.log(`  ✓ ${locationData.length} locations`);

  const licenseNames = [
    "General Pest Control",
    "Termite/WDO",
    "Fumigation",
    "Rodent Control",
    "Wildlife",
  ];
  const licenses: Record<string, { id: string }> = {};
  for (const name of licenseNames) {
    const existing = await prisma.licenseType.findFirst({
      where: { companyId: company.id, name },
    });
    const lic =
      existing ??
      (await prisma.licenseType.create({
        data: { companyId: company.id, name, active: true },
      }));
    licenses[name] = { id: lic.id };
  }
  console.log(`  ✓ ${licenseNames.length} license types`);

  const categoryNames = [
    "Rodenticide",
    "Insecticide",
    "Fumigant",
    "Trap/Device",
    "PPE",
    "Equipment",
  ];
  const categories: Record<string, { id: string }> = {};
  for (const name of categoryNames) {
    const existing = await prisma.productCategory.findFirst({
      where: { companyId: company.id, name },
    });
    const cat =
      existing ??
      (await prisma.productCategory.create({
        data: { companyId: company.id, name, active: true },
      }));
    categories[name] = { id: cat.id };
  }
  console.log(`  ✓ ${categoryNames.length} categories`);

  const unitNames = [
    { name: "Each", abbreviation: "ea" },
    { name: "Kilogram", abbreviation: "kg" },
    { name: "Milliliter", abbreviation: "ml" },
  ];
  const units: Record<string, { id: string }> = {};
  for (const u of unitNames) {
    const existing = await prisma.unitOfMeasure.findFirst({
      where: { companyId: company.id, name: u.name },
    });
    const unit =
      existing ??
      (await prisma.unitOfMeasure.create({
        data: { companyId: company.id, ...u, active: true },
      }));
    units[u.name] = { id: unit.id };
  }
  console.log(`  ✓ ${unitNames.length} units of measure`);

  const pwAdmin = await bcrypt.hash("Admin123!", 10);
  const pwManager = await bcrypt.hash("Manager123!", 10);
  const pwSuper = await bcrypt.hash("Super123!", 10);
  const pwTech = await bcrypt.hash("Tech123!", 10);

  const usersSpec = [
    {
      key: "super",
      email: "super@admin.com",
      username: null as string | null,
      name: "Super Admin",
      role: Role.super_admin,
      locationId: null as string | null,
      passwordHash: pwAdmin,
      licenseNames: [] as string[],
    },
    {
      key: "manager",
      email: "manager@victory.com",
      username: null,
      name: "Victory Manager",
      role: Role.manager,
      locationId: null,
      passwordHash: pwManager,
      licenseNames: [],
    },
    {
      key: "sup1",
      email: "sup1@victory.com",
      username: null,
      name: "Newark Supervisor",
      role: Role.supervisor,
      locationId: locations.Norte.id,
      passwordHash: pwSuper,
      licenseNames: [],
    },
    {
      key: "tech1",
      email: null,
      username: "tech1",
      name: "Technician One",
      role: Role.technician,
      locationId: locations.Norte.id,
      passwordHash: pwTech,
      licenseNames: ["General Pest Control", "Rodent Control"],
    },
    {
      key: "tech2",
      email: null,
      username: "tech2",
      name: "Technician Two",
      role: Role.technician,
      locationId: locations.Norte.id,
      passwordHash: pwTech,
      licenseNames: ["General Pest Control"],
    },
  ];

  const users: Record<string, { id: string }> = {};
  for (const u of usersSpec) {
    let existing = null;
    if (u.email) {
      existing = await prisma.user.findFirst({
        where: { companyId: company.id, email: u.email },
      });
    } else if (u.username) {
      existing = await prisma.user.findFirst({
        where: { companyId: company.id, username: u.username },
      });
    }

    const data = {
      companyId: company.id,
      locationId: u.locationId,
      name: u.name,
      email: u.email,
      username: u.username,
      passwordHash: u.passwordHash,
      role: u.role,
      hasCompanyEmail: u.email !== null,
      active: true,
    };

    const user = existing
      ? await prisma.user.update({ where: { id: existing.id }, data })
      : await prisma.user.create({ data });
    users[u.key] = { id: user.id };

    await prisma.userLicense.deleteMany({ where: { userId: user.id } });
    for (const ln of u.licenseNames) {
      await prisma.userLicense.create({
        data: { userId: user.id, licenseTypeId: licenses[ln].id },
      });
    }
  }
  console.log(`  ✓ ${usersSpec.length} users`);

  const productsSpec = [
    {
      name: "Contrac Blox 18kg",
      sku: "ROD-001",
      category: "Rodenticide",
      unit: "Kilogram",
      requiresLicense: true,
      licenseNames: ["Rodent Control"],
      unitCost: 145.0,
    },
    {
      name: "Temprid SC 240ml",
      sku: "INS-001",
      category: "Insecticide",
      unit: "Milliliter",
      requiresLicense: true,
      licenseNames: ["General Pest Control"],
      unitCost: 89.5,
    },
    {
      name: "Demand CS 473ml",
      sku: "INS-002",
      category: "Insecticide",
      unit: "Milliliter",
      requiresLicense: true,
      licenseNames: ["General Pest Control"],
      unitCost: 76.0,
    },
    {
      name: "Victor Snap Trap",
      sku: "TRP-001",
      category: "Trap/Device",
      unit: "Each",
      requiresLicense: false,
      licenseNames: [],
      unitCost: 2.5,
    },
    {
      name: "Respirator 3M N95",
      sku: "EPP-001",
      category: "PPE",
      unit: "Each",
      requiresLicense: false,
      licenseNames: [],
      unitCost: 1.25,
    },
  ];

  for (const p of productsSpec) {
    const existing = await prisma.product.findFirst({
      where: { companyId: company.id, sku: p.sku },
    });
    const product = existing
      ? await prisma.product.update({
          where: { id: existing.id },
          data: {
            name: p.name,
            categoryId: categories[p.category].id,
            unitId: units[p.unit].id,
            requiresLicense: p.requiresLicense,
            unitCost: p.unitCost,
            active: true,
          },
        })
      : await prisma.product.create({
          data: {
            companyId: company.id,
            name: p.name,
            sku: p.sku,
            categoryId: categories[p.category].id,
            unitId: units[p.unit].id,
            requiresLicense: p.requiresLicense,
            unitCost: p.unitCost,
            active: true,
          },
        });

    await prisma.productLicense.deleteMany({ where: { productId: product.id } });
    for (const ln of p.licenseNames) {
      await prisma.productLicense.create({
        data: { productId: product.id, licenseTypeId: licenses[ln].id },
      });
    }

    for (const locName of Object.keys(locations)) {
      const locId = locations[locName].id;
      await prisma.locationProduct.upsert({
        where: {
          locationId_productId: { locationId: locId, productId: product.id },
        },
        update: { minStock: 10, maxStock: 100, active: true },
        create: {
          locationId: locId,
          productId: product.id,
          minStock: 10,
          maxStock: 100,
          active: true,
        },
      });
      await prisma.stock.upsert({
        where: {
          locationId_productId: { locationId: locId, productId: product.id },
        },
        update: { quantity: 50 },
        create: {
          locationId: locId,
          productId: product.id,
          quantity: 50,
        },
      });
    }
  }
  console.log(`  ✓ ${productsSpec.length} products + stock per location`);

  console.log("\n✅ Seed complete.");
  console.log("\nLogin credentials:");
  console.log("  super@admin.com / Admin123!     (super_admin)");
  console.log("  manager@victory.com / Manager123! (manager)");
  console.log("  sup1@victory.com / Super123!    (supervisor — Newark)");
  console.log("  tech1 / Tech123!                (technician — Newark, 2 licenses)");
  console.log("  tech2 / Tech123!                (technician — Newark, 1 license)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
