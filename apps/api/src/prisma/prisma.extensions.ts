// apps/api/src/prisma/prisma.extensions.ts
import { Prisma, PrismaClient, EstadoOrden } from '../generated/prisma/client';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

export const modelExtension = Prisma.defineExtension({
  name: 'modelExtension',
  model: {
    usuario: {
      async findForAuth(id: number) {
        if (!id) return null;
        const ctx = Prisma.getExtensionContext(this);

        const u = await ctx.findUnique({
          where: { id },
          select: {
            id: true,
            email: true,
            nombre: true,
            roles: { select: { role: { select: { slug: true } } } },
          },
        });

        if (!u) return null;

        return {
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          roles: u.roles.map((r: { role: { slug: string } }) => r.role.slug),
        };
      },

      async findByEmailAuth(email: string) {
        const ctx = Prisma.getExtensionContext(this);

        const u = await ctx.findUnique({
          where: { email },
          select: {
            id: true,
            email: true,
            nombre: true,
            passwordHash: true,
            roles: { select: { role: { select: { slug: true } } } },
          },
        });

        if (!u) return null;

        return {
          id: u.id,
          email: u.email,
          nombre: u.nombre,
          passwordHash: u.passwordHash,
          roles: u.roles.map((r: { role: { slug: string } }) => r.role.slug),
        };
      },
    },

    producto: {
      async findActive() {
        return Prisma.getExtensionContext(this).findMany({
          where: { publicado: true },
          orderBy: { creadoEn: 'desc' },
        });
      },
    },

    orden: {
      async markAsPaid(id: number) {
        return Prisma.getExtensionContext(this).update({
          where: { id },
          data: { estado: EstadoOrden.PAGADO, actualizadoEn: new Date() },
        });
      },
    },
  },
});

export const clientExtension = Prisma.defineExtension({
  name: 'clientExtension',
  client: {
    grantUserRoles: async function (
      this: PrismaClient,
      userId: number,
      roleSlugs: string[],
    ) {
      if (!roleSlugs.length) return;

      const roles = await this.role.findMany({
        where: { slug: { in: roleSlugs } },
        select: { id: true, slug: true },
      });
      if (!roles.length) return;

      await this.$transaction(
        roles.map((r) =>
          this.usuarioRol.upsert({
            where: { usuarioId_roleId: { usuarioId: userId, roleId: r.id } },
            update: {},
            create: { usuarioId: userId, roleId: r.id },
          }),
        ),
      );
    },

    revokeUserRoles: async function (
      this: PrismaClient,
      userId: number,
      roleSlugs: string[],
    ) {
      if (!roleSlugs.length) return;

      const roles = await this.role.findMany({
        where: { slug: { in: roleSlugs } },
        select: { id: true },
      });
      if (!roles.length) return;

      await this.usuarioRol.deleteMany({
        where: {
          usuarioId: userId,
          roleId: { in: roles.map((r) => r.id) },
        },
      });
    },
  },
});

export const createExtendedClient = () => {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is missing');

  const connectionString = databaseUrl.includes('?')
    ? databaseUrl.split('?')[0]
    : databaseUrl;

  const adapter = new PrismaMariaDb(connectionString);
  const client = new PrismaClient({ adapter });

  return client.$extends(modelExtension).$extends(clientExtension);
};

export type ExtendedPrismaClient = ReturnType<typeof createExtendedClient>;
