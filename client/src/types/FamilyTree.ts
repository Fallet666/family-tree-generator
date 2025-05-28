export interface Person {
  id: string;
  fullName: string;
  birthDate: string;
  photoUrl?: string;
}

export type RelationType = "" | "spouse" | "parent" | "child";

export interface Relation {
  from: string;
  to: string;
  type: RelationType;
}

export interface FamilyTree {
  persons: Person[];
  relations: Relation[];
}
