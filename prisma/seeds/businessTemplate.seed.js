import prisma from "../../src/lib/prisma.js";

const templates = [
  {
    code: "GYM",
    name: "Gimnasio",
    description: "ERP para gimnasios"
  },
  {
    code: "PHARMACY",
    name: "Farmacia",
    description: "ERP para farmacias"
  },
  {
    code: "STORE",
    name: "Tienda",
    description: "ERP para tiendas"
  }
];

async function main() {
  for (const template of templates) {
    await prisma.businessTemplate.upsert({
      where: {
        code: template.code
      },
      update: {
        name: template.name,
        description: template.description
      },
      create: template
    });
  }

  console.log("✅ Business Templates creados");
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
