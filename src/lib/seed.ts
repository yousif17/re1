import { db } from "@/lib/db";

export function seedDatabase(): void {
  db.seed();
}