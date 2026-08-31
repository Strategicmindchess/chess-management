import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .email("Enter a valid email address.");

console.log(emailSchema.safeParse("teacher@gmail.com"));
console.log(emailSchema.safeParse("teacher@gmail.com "));
console.log(emailSchema.safeParse("teacher@gmail.com."));
console.log(emailSchema.safeParse(null));
console.log(emailSchema.safeParse(undefined));
