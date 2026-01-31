import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, setHours, setMinutes, addDays, startOfDay } from "date-fns";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostSchedulerProps {
  onSchedule: (scheduledAt: Date) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const timeSlots = [
  { value: "06:00", label: "6:00 AM" },
  { value: "07:00", label: "7:00 AM" },
  { value: "08:00", label: "8:00 AM" },
  { value: "09:00", label: "9:00 AM" },
  { value: "10:00", label: "10:00 AM" },
  { value: "11:00", label: "11:00 AM" },
  { value: "12:00", label: "12:00 PM" },
  { value: "13:00", label: "1:00 PM" },
  { value: "14:00", label: "2:00 PM" },
  { value: "15:00", label: "3:00 PM" },
  { value: "16:00", label: "4:00 PM" },
  { value: "17:00", label: "5:00 PM" },
  { value: "18:00", label: "6:00 PM" },
  { value: "19:00", label: "7:00 PM" },
  { value: "20:00", label: "8:00 PM" },
  { value: "21:00", label: "9:00 PM" },
  { value: "22:00", label: "10:00 PM" },
];

export default function PostScheduler({ onSchedule, isLoading, disabled }: PostSchedulerProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("08:00");
  const [isOpen, setIsOpen] = useState(false);

  const handleSchedule = () => {
    if (!date) return;
    
    const [hours, minutes] = time.split(':').map(Number);
    const scheduledAt = setMinutes(setHours(date, hours), minutes);
    onSchedule(scheduledAt);
  };

  const getScheduledDateTime = () => {
    if (!date) return null;
    const [hours, minutes] = time.split(':').map(Number);
    return setMinutes(setHours(date, hours), minutes);
  };

  const scheduledDateTime = getScheduledDateTime();
  const isPastTime = scheduledDateTime && scheduledDateTime < new Date();

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center gap-2 text-sm font-medium">
        <Clock className="h-4 w-4" />
        Schedule Post
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Date Picker */}
        <div className="space-y-2">
          <Label>Date</Label>
          <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : "Pick a date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={(newDate) => {
                  setDate(newDate);
                  setIsOpen(false);
                }}
                disabled={(date) => date < startOfDay(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Time</Label>
          <Select value={time} onValueChange={setTime}>
            <SelectTrigger>
              <SelectValue placeholder="Select time" />
            </SelectTrigger>
            <SelectContent>
              {timeSlots.map((slot) => (
                <SelectItem key={slot.value} value={slot.value}>
                  {slot.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Quick Schedule Options */}
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDate(new Date());
            setTime("20:00");
          }}
        >
          Today 8 PM
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDate(addDays(new Date(), 1));
            setTime("08:00");
          }}
        >
          Tomorrow 8 AM
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setDate(addDays(new Date(), 1));
            setTime("20:00");
          }}
        >
          Tomorrow 8 PM
        </Button>
      </div>

      {/* Schedule Button */}
      <Button
        onClick={handleSchedule}
        disabled={!date || isPastTime || isLoading || disabled}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scheduling...
          </>
        ) : scheduledDateTime ? (
          <>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Schedule for {format(scheduledDateTime, "MMM d 'at' h:mm a")}
          </>
        ) : (
          <>
            <CalendarIcon className="mr-2 h-4 w-4" />
            Select date and time
          </>
        )}
      </Button>

      {isPastTime && (
        <p className="text-xs text-destructive">Selected time is in the past. Please choose a future time.</p>
      )}
    </div>
  );
}
