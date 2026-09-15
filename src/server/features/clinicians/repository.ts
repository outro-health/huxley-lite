import { asc, eq } from "drizzle-orm"

import { db, schema } from "../../db/client"

export const cliniciansRepository = {
  list: () =>
    db.select().from(schema.clinicians).orderBy(asc(schema.clinicians.name)),

  getById: (id: string) =>
    db.query.clinicians
      .findFirst({ where: eq(schema.clinicians.id, id) })
      .then((row) => row ?? null),

  getByEmail: (email: string) =>
    db.query.clinicians
      .findFirst({ where: eq(schema.clinicians.email, email.toLowerCase()) })
      .then((row) => row ?? null),
}
