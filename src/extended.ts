import "reflect-metadata";

import { PrismaClient, User, Post, Prisma } from "@prisma/client";
import { buildSchemaSync } from "type-graphql";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { resolvers } from "../prisma/generated/type-graphql";

import { randomUUID } from "crypto";
import {
  AbilityBuilder,
  MongoAbility,
  PureAbility,
  createMongoAbility,
} from "@casl/ability";
import {
  PrismaQuery,
  Subjects,
  accessibleBy,
  createPrismaAbility,
} from "@casl/prisma";

function defineAbilityFor(user: any) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user.isAdmin) {
    can("manage", "all"); // read-write access to everything
  } else {
    can("read", "User");
    cannot("read", "Post"); // read-only access to everything
  }

  cannot("delete", "Post", { published: true });
  return build();
}

// WORKS!
function isAuthorized(model: any, args: any, ability: any) {
  const result = {
    where: {
      AND: [
        //@ts-ignore
        accessibleBy(ability)[model],
        args,
      ],
    },
  };
  console.log(">> isAuthorized = ", JSON.stringify(result, null, 2));
  return result;
}

// DOES NOT WORK: The posts are still being retreieved...
function isAuthorizedUnique(model: any, args: any, ability: any) {
  //@ts-ignore
  args.where["AND"] = [accessibleBy(ability)[model]];
  console.log(">> isAuthorizedUnique = ", JSON.stringify(args, null, 2));
  return args;
}

function prismaClient(ability: MongoAbility) {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
        async findUnique({ model, operation, args, query }) {
          console.log(operation, args);
          return query(isAuthorizedUnique(model, args, ability));
        },
        async findUniqueOrThrow({ model, operation, args, query }) {
          console.log(operation, args);
          return query(isAuthorizedUnique(model, args, ability));
        },
        async findFirst({ model, operation, args, query }) {
          console.log(operation, args);
          return query(isAuthorized(model, args, ability));
        },
        async findFirstOrThrow({ model, operation, args, query }) {
          console.log(operation, args);
          return query(isAuthorized(model, args, ability));
        },
        async findMany({ model, operation, args, query }) {
          console.log(operation, args);
          return query(isAuthorized(model, args, ability));
        },
      },
    },
  });
}

const ability = defineAbilityFor({ isAdmin: false });
const prisma = prismaClient(ability);

async function insertData() {
  const userCount = 10000 + Math.floor(Math.random() * 10);
  // console.log(`Creating ${userCount} users`)
  for (let i: number = 1; i <= userCount; i++) {
    const user = await prisma.user.create({
      data: {
        name: `User ${i}`,
        email: `${randomUUID()}@prisma.io`,
      },
    });

    const postCount = 100 + Math.floor(Math.random() * 5);
    // console.log(`Creating ${postCount} posts for user ${i}`)
    for (let j: number = 1; j <= postCount; j++) {
      await prisma.post.create({
        data: {
          title: `Post ${j} by User ${i}`,
          content: Math.random() < 0.5 ? "SENSITIVE DATA" : "REGULAR DATA",
          published: Math.random() < 0.5,
          authorId: user.id,
        },
      });
    }
  }
}

async function main() {
  // insertData()

  const schema = await buildSchemaSync({
    resolvers,
  });

  const server = new ApolloServer({ schema });
  const { url } = await startStandaloneServer(server, {
    context: async () => ({ prisma }),
    listen: { port: 4000 },
  });
  console.log(`🚀  Server ready at: ${url}`);
}

main();
