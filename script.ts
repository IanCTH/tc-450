import "reflect-metadata";

import { PrismaClient, User } from "@prisma/client";
import {
  AuthCheckerInterface,
  ResolverData,
  buildSchemaSync,
} from "type-graphql";
import { resolvers } from "@generated/type-graphql";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

export class CustomAuthChecker implements AuthCheckerInterface<any> {
  constructor(
    // Dependency injection
    private readonly userRepository: any
  ) {}

  check({ root, args, context, info }: ResolverData<any>, roles: string[]) {
    console.log(">>> context = ", context);
    console.log(">>> info = ", info);
    return true;
  }
}

const prisma = new PrismaClient();

async function main() {
  //   await prisma.user.create({
  //     data: {
  //       name: "Alice",
  //       email: "alice@prisma.io",
  //     },
  //   });
  //   const users = await prisma.user.findMany();
  //   console.log(users);

  const schema = await buildSchemaSync({
    resolvers,
    authChecker: CustomAuthChecker,
  });

  const server = new ApolloServer({ schema });

  // Passing an ApolloServer instance to the `startStandaloneServer` function:
  //  1. creates an Express app
  //  2. installs your ApolloServer instance as middleware
  //  3. prepares your app to handle incoming requests
  const { url } = await startStandaloneServer(server, {
    context: async () => ({ prisma }),
    listen: { port: 4000 },
  });

  console.log(`🚀  Server ready at: ${url}`);
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
