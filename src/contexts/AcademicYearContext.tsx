import { createContext, useContext, useState, ReactNode, useMemo } from "react";

export interface AcademicYear {
  value: string;
  label: string;
  startDate: Date;
  endDate: Date;
}

// Generate academic years (academic year runs July to June)
const generateAcademicYears = (): AcademicYear[] => {
  return [
    {
      value: "2024-25",
      label: "2024-25",
      startDate: new Date(2024, 6, 1), // July 1, 2024
      endDate: new Date(2025, 5, 30), // June 30, 2025
    },
    {
      value: "2023-24",
      label: "2023-24",
      startDate: new Date(2023, 6, 1),
      endDate: new Date(2024, 5, 30),
    },
    {
      value: "2022-23",
      label: "2022-23",
      startDate: new Date(2022, 6, 1),
      endDate: new Date(2023, 5, 30),
    },
    {
      value: "2021-22",
      label: "2021-22",
      startDate: new Date(2021, 6, 1),
      endDate: new Date(2022, 5, 30),
    },
  ];
};

// Determine current academic year based on current date
const getCurrentAcademicYear = (): string => {
  const now = new Date();
  const currentMonth = now.getMonth(); // 0-11
  const currentYear = now.getFullYear();
  
  // If we're in July or later, we're in the next academic year
  // e.g., July 2024 = 2024-25, January 2024 = 2023-24
  if (currentMonth >= 6) { // July = 6
    return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
  } else {
    return `${currentYear - 1}-${currentYear.toString().slice(-2)}`;
  }
};

interface AcademicYearContextType {
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  academicYears: AcademicYear[];
  currentYear: AcademicYear | undefined;
  getDateRangeForYear: (yearValue: string) => { start: Date; end: Date } | undefined;
}

const AcademicYearContext = createContext<AcademicYearContextType | undefined>(undefined);

export const AcademicYearProvider = ({ children }: { children: ReactNode }) => {
  const academicYears = useMemo(() => generateAcademicYears(), []);
  const defaultYear = getCurrentAcademicYear();
  
  // Ensure selected year exists in our list, fallback to first available
  const initialYear = academicYears.find(y => y.value === defaultYear)?.value || academicYears[0]?.value || "2024-25";
  
  const [selectedYear, setSelectedYear] = useState<string>(initialYear);

  const currentYear = useMemo(
    () => academicYears.find((y) => y.value === selectedYear),
    [selectedYear, academicYears]
  );

  const getDateRangeForYear = (yearValue: string) => {
    const year = academicYears.find((y) => y.value === yearValue);
    if (!year) return undefined;
    return { start: year.startDate, end: year.endDate };
  };

  return (
    <AcademicYearContext.Provider
      value={{
        selectedYear,
        setSelectedYear,
        academicYears,
        currentYear,
        getDateRangeForYear,
      }}
    >
      {children}
    </AcademicYearContext.Provider>
  );
};

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (context === undefined) {
    throw new Error("useAcademicYear must be used within an AcademicYearProvider");
  }
  return context;
};
