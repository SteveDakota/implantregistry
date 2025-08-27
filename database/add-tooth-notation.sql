-- Add tooth notation preference to dentists table
ALTER TABLE dentists ADD COLUMN tooth_notation_preference VARCHAR(10) DEFAULT 'universal' CHECK (tooth_notation_preference IN ('universal', 'iso'));