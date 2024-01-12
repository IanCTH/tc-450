import "reflect-metadata";

import { PrismaClient, User, Post, Prisma } from "@prisma/client";
import {
  buildSchemaSync,
} from "type-graphql";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import {
  resolvers,
} from "../prisma/generated/type-graphql";

import { randomUUID } from "crypto";
import { AbilityBuilder, MongoAbility, PureAbility, createMongoAbility } from "@casl/ability";
import { PrismaQuery, Subjects, createPrismaAbility } from "@casl/prisma";

function defineAbilityFor(user: any) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  if (user.isAdmin) {
    can('manage', 'all'); // read-write access to everything
  } else {
    can('read', 'all') // read-only access to everything
  }

  cannot('delete', 'Post', { published: true });
  return build();
}

function addWhere(ability, { model, operation, args, query }) {
  return args
}

function prismaClient(ability: MongoAbility) {
  return new PrismaClient().$extends({
    query: {
      $allModels: {
         async findUnique ({ model, operation, args, query }) {
          args = addWhere(ability, { model, operation, args, query })
          return query(args)
        },
        async findUniqueOrThrow ({ model, operation, args, query }) {
          console.log([model, operation, args, query])
          return query(args)
        },
        async findFirst ({ model, operation, args, query }) {
          console.log([model, operation, args, query])
          return query(args)
        },
        async findFirstOrThrow ({ model, operation, args, query }) {
          console.log([model, operation, args, query])
          return query(args)
        },
        async findMany({ model, operation, args, query }) {
          console.log([model, operation, args, query])
          return query(args)
        },
      },
    },
  })
}

const ability = defineAbilityFor({isAdmin: false});
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

    const postCount = 100 + Math.floor(Math.random() * 5)
    // console.log(`Creating ${postCount} posts for user ${i}`)
    for (let j: number = 1; j <= postCount; j++) {
      await prisma.post.create({
        data: {
          title: `Post ${j} by User ${i}`,
          content: Math.random() < 0.5 ? 'SENSITIVE DATA' : 'REGULAR DATA',
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