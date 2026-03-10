/*
  Warnings:

  - Added the required column `size` to the `Resource` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Resource" ADD COLUMN     "size" INTEGER NOT NULL;
