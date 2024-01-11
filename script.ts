import "reflect-metadata";

import { PrismaClient, User, Post, Prisma } from "@prisma/client";
import {
  AuthCheckerInterface,
  ResolverData,
  buildSchemaSync,
  Authorized,
} from "type-graphql";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import {
  resolvers,
  ResolversEnhanceMap,
  applyResolversEnhanceMap,
  ModelsEnhanceMap,
  applyModelsEnhanceMap,
} from "./prisma/generated/type-graphql";

import { PureAbility, AbilityBuilder, subject } from "@casl/ability";
import {
  accessibleBy,
  createPrismaAbility,
  PrismaQuery,
  Subjects,
} from "@casl/prisma";

function makeid(length: number) {
  let result = "";
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

export class CustomAuthChecker implements AuthCheckerInterface<any> {
  check({ root, args, context, info }: ResolverData<any>, roles: string[]) {
    console.log(">>> roles = ", roles, ">>> info = ", info.fieldName);

    if (roles.includes("classified")) return false;

    return true;
  }
}

const prisma = new PrismaClient();

// const resolversEnhanceMap: ResolversEnhanceMap = {
//   User: {
//     findFirstUser: [Authorized("ADMIN")],
//   },
// };

// applyResolversEnhanceMap(resolversEnhanceMap);

async function main() {
  // const user = await prisma.user.create({
  //   data: {
  //     name: "Paul",
  //     email: "paul@prisma.io",
  //   },
  // });

  // let i = 5000;

  // while (i >= 0) {
  //   console.log(">>> creating post ", i);
  //   await prisma.post.create({
  //     data: {
  //       title: "Post Title",
  //       content: makeid(1000),
  //       published: true,
  //       authorId: 1,
  //     },
  //   });

  //   i -= 1;
  // }

  const modelsEnhanceMap: ModelsEnhanceMap = {
    User: {
      class: [],
      fields: {
        email: [Authorized("user")],
      },
    },
    Post: {
      class: [],
      fields: {
        content: [Authorized("classified")],
      },
    },
  };

  // apply the config (it will apply decorators on the model class and its properties)
  applyModelsEnhanceMap(modelsEnhanceMap);

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

async function casl() {
  type AppAbility = PureAbility<
    [
      string,
      Subjects<{
        User: User;
        Post: Post;
      }>
    ],
    PrismaQuery
  >;
  const { can, cannot, build } = new AbilityBuilder<AppAbility>(
    createPrismaAbility
  );

  can("read", "User");
  cannot("read", "Post")
  const ability = build();
  ability.can("read", "User");
  ability.cannot("read", "Post");

  const start = new Date();
  console.log(">> start = ", start.toISOString());

  const accessibleUsers = await prisma.post.findMany({
    where: accessibleBy(ability).Post,
  });

  const end = new Date();
  console.log(">> end = ", end.toISOString());
  console.log(">> total = ", (end.getTime() - start.getTime()) / 1000);
  console.log(
    ">>> accessiblePosts = ",
    accessibleUsers.length,
    accessibleUsers.length ? accessibleUsers[0] : null
  );
}

// main()
casl()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
