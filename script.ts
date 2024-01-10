import "reflect-metadata";

import { PrismaClient, User } from "@prisma/client";
import {
  AuthCheckerInterface,
  Authorized,
  ResolverData,
  buildSchemaSync,
} from "type-graphql";
import { resolvers, ModelsEnhanceMap, applyModelsEnhanceMap } from "@generated/type-graphql";
import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";

export class CustomAuthChecker implements AuthCheckerInterface<any> {
  check({ root, args, context, info }: ResolverData<any>, roles: string[]) {
    console.log(">>> roles = ", roles);
    // console.log(">>> args = ", args);
    console.log(">>> info = ", info.fieldName);
    return true;
  }
}

const prisma = new PrismaClient();

async function main() {
  // const user = await prisma.user.create({
  //   data: {
  //     name: "Paul",
  //     email: "paul@prisma.io",
  //   },
  // });
  
  // await prisma.post.create({
  //   data: {
  //     title: "Post Title",
  //     content: "SENSITIVE",
  //     published: true,
  //     authorId: user.id
  //   },
  // });

  const modelsEnhanceMap: ModelsEnhanceMap = {
    User: {
      class: [],
      fields: {
        email: [Authorized("owner")],
      },
    },
    Post: {
      class: [],
      fields: {
        content: [Authorized("admin")],
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

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
