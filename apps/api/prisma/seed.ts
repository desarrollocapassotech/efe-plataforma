// Seed idempotente: crea/actualiza los usuarios ADMIN (Flor y Elías).
//   pnpm --filter @efe/api prisma db seed
// Lee SEED_ADMIN_FIREBASE_UID y SEED_ADMIN_EMAIL (separados por coma, emparejados por
// posición). Corre con Node 22 directo (type stripping): sin tsx ni ts-node.
import prismaClient from '@prisma/client';
import { categoriasDefaultPara } from '../src/modules/categorias/plantilla.ts';

const { PrismaClient } = prismaClient;

const lista = (valor: string | undefined): string[] =>
  (valor ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

async function main(): Promise<void> {
  const uids = lista(process.env.SEED_ADMIN_FIREBASE_UID);
  const emails = lista(process.env.SEED_ADMIN_EMAIL);

  if (uids.length === 0 && emails.length === 0) {
    console.warn(
      'Seed: SEED_ADMIN_FIREBASE_UID y SEED_ADMIN_EMAIL no están definidas. No se crea nada.',
    );
    return;
  }
  if (uids.length !== emails.length) {
    throw new Error(
      `Seed: SEED_ADMIN_FIREBASE_UID tiene ${uids.length} valores y SEED_ADMIN_EMAIL ${emails.length}. Tienen que coincidir.`,
    );
  }

  const prisma = new PrismaClient();
  try {
    for (const [i, firebaseUid] of uids.entries()) {
      const email = emails[i]!;
      const resultado = await prisma.$transaction(async (tx) => {
        const existente = await tx.usuario.findUnique({ where: { firebaseUid } });
        if (existente) {
          await tx.usuario.update({ where: { id: existente.id }, data: { email, rol: 'ADMIN' } });
          return 'actualizado';
        }
        const usuario = await tx.usuario.create({ data: { firebaseUid, email, rol: 'ADMIN' } });
        // Igual que un registro normal: el usuario arranca con las categorías default.
        await tx.categoria.createMany({ data: categoriasDefaultPara(usuario.id) });
        return 'creado';
      });
      // eslint-disable-next-line no-console -- script de consola
      console.log(`Seed: admin ${email} ${resultado}.`);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
