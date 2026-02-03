import { CalendarDays } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAcademicYear } from "@/contexts/AcademicYearContext";

interface AcademicYearSelectorProps {
  className?: string;
  showLabel?: boolean;
}

const AcademicYearSelector = ({ className = "", showLabel = true }: AcademicYearSelectorProps) => {
  const { selectedYear, setSelectedYear, academicYears } = useAcademicYear();

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {showLabel && (
        <span className="text-sm text-muted-foreground hidden sm:inline">Academic Year:</span>
      )}
      <Select value={selectedYear} onValueChange={setSelectedYear}>
        <SelectTrigger className="w-[130px] h-9 bg-card border-border">
          <CalendarDays className="h-4 w-4 mr-2 text-muted-foreground" />
          <SelectValue placeholder="Select year" />
        </SelectTrigger>
        <SelectContent className="bg-popover border-border z-50">
          {academicYears.map((year) => (
            <SelectItem key={year.value} value={year.value}>
              {year.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
};

export default AcademicYearSelector;
