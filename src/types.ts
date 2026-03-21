export interface EVMData {
  plannedValue: number;
  earnedValue: number;
  actualCost: number;
  budgetAtCompletion: number;
  monthlyPlannedValues?: number[]; // Cumulative PV for each month
}

export interface EVMMetrics {
  spi: number;
  cpi: number;
  sv: number;
  cv: number;
}
