-- Rename serializedBody column to serializedAnswer in Problem table
ALTER TABLE "Problem" RENAME COLUMN "serializedBody" TO "serializedAnswer";