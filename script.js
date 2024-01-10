"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("reflect-metadata");
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
async function main() {
    //   await prisma.user.create({
    //     data: {
    //       name: "Alice",
    //       email: "alice@prisma.io",
    //     },
    //   });
    const users = await prisma.user.findMany();
    console.log(users);
    //   const schema = await buildSchema({
    //     resolvers: [FindManyUserResolver],
    //   });
}
main()
    .then(async () => {
    await prisma.$disconnect();
})
    .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
});
