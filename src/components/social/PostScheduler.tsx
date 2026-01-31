import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format, setHours, setMinutes, addDays, startOfDay, addMinutes, isToday } from "date-fns";
import { Calendar as CalendarIcon, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface PostSchedulerProps {
  onSchedule: (scheduledAt: Date) => void;
  isLoading: boolean;
  disabled?: boolean;
}

const allTimeSlots = [
  { value: "06:00", label: "6:00 AM", hour: 6, minute: 0 },
  { value: "06:15", label: "6:15 AM", hour: 6, minute: 15 },
  { value: "06:30", label: "6:30 AM", hour: 6, minute: 30 },
  { value: "06:45", label: "6:45 AM", hour: 6, minute: 45 },
  { value: "07:00", label: "7:00 AM", hour: 7, minute: 0 },
  { value: "07:15", label: "7:15 AM", hour: 7, minute: 15 },
  { value: "07:30", label: "7:30 AM", hour: 7, minute: 30 },
  { value: "07:45", label: "7:45 AM", hour: 7, minute: 45 },
  { value: "08:00", label: "8:00 AM", hour: 8, minute: 0 },
  { value: "08:15", label: "8:15 AM", hour: 8, minute: 15 },
  { value: "08:30", label: "8:30 AM", hour: 8, minute: 30 },
  { value: "08:45", label: "8:45 AM", hour: 8, minute: 45 },
  { value: "09:00", label: "9:00 AM", hour: 9, minute: 0 },
  { value: "09:15", label: "9:15 AM", hour: 9, minute: 15 },
  { value: "09:30", label: "9:30 AM", hour: 9, minute: 30 },
  { value: "09:45", label: "9:45 AM", hour: 9, minute: 45 },
  { value: "10:00", label: "10:00 AM", hour: 10, minute: 0 },
  { value: "10:15", label: "10:15 AM", hour: 10, minute: 15 },
  { value: "10:30", label: "10:30 AM", hour: 10, minute: 30 },
  { value: "10:45", label: "10:45 AM", hour: 10, minute: 45 },
  { value: "11:00", label: "11:00 AM", hour: 11, minute: 0 },
  { value: "11:15", label: "11:15 AM", hour: 11, minute: 15 },
  { value: "11:30", label: "11:30 AM", hour: 11, minute: 30 },
  { value: "11:45", label: "11:45 AM", hour: 11, minute: 45 },
  { value: "12:00", label: "12:00 PM", hour: 12, minute: 0 },
  { value: "12:15", label: "12:15 PM", hour: 12, minute: 15 },
  { value: "12:30", label: "12:30 PM", hour: 12, minute: 30 },
  { value: "12:45", label: "12:45 PM", hour: 12, minute: 45 },
  { value: "13:00", label: "1:00 PM", hour: 13, minute: 0 },
  { value: "13:15", label: "1:15 PM", hour: 13, minute: 15 },
  { value: "13:30", label: "1:30 PM", hour: 13, minute: 30 },
  { value: "13:45", label: "1:45 PM", hour: 13, minute: 45 },
  { value: "14:00", label: "2:00 PM", hour: 14, minute: 0 },
  { value: "14:15", label: "2:15 PM", hour: 14, minute: 15 },
  { value: "14:30", label: "2:30 PM", hour: 14, minute: 30 },
  { value: "14:45", label: "2:45 PM", hour: 14, minute: 45 },
  { value: "15:00", label: "3:00 PM", hour: 15, minute: 0 },
  { value: "15:15", label: "3:15 PM", hour: 15, minute: 15 },
  { value: "15:30", label: "3:30 PM", hour: 15, minute: 30 },
  { value: "15:45", label: "3:45 PM", hour: 15, minute: 45 },
  { value: "16:00", label: "4:00 PM", hour: 16, minute: 0 },
  { value: "16:15", label: "4:15 PM", hour: 16, minute: 15 },
  { value: "16:30", label: "4:30 PM", hour: 16, minute: 30 },
  { value: "16:45", label: "4:45 PM", hour: 16, minute: 45 },
  { value: "17:00", label: "5:00 PM", hour: 17, minute: 0 },
  { value: "17:15", label: "5:15 PM", hour: 17, minute: 15 },
  { value: "17:30", label: "5:30 PM", hour: 17, minute: 30 },
  { value: "17:45", label: "5:45 PM", hour: 17, minute: 45 },
  { value: "18:00", label: "6:00 PM", hour: 18, minute: 0 },
  { value: "18:15", label: "6:15 PM", hour: 18, minute: 15 },
  { value: "18:30", label: "6:30 PM", hour: 18, minute: 30 },
  { value: "18:45", label: "6:45 PM", hour: 18, minute: 45 },
  { value: "19:00", label: "7:00 PM", hour: 19, minute: 0 },
  { value: "19:15", label: "7:15 PM", hour: 19, minute: 15 },
  { value: "19:30", label: "7:30 PM", hour: 19, minute: 30 },
  { value: "19:45", label: "7:45 PM", hour: 19, minute: 45 },
  { value: "20:00", label: "8:00 PM", hour: 20, minute: 0 },
  { value: "20:15", label: "8:15 PM", hour: 20, minute: 15 },
  { value: "20:30", label: "8:30 PM", hour: 20, minute: 30 },
  { value: "20:45", label: "8:45 PM", hour: 20, minute: 45 },
  { value: "21:00", label: "9:00 PM", hour: 21, minute: 0 },
  { value: "21:15", label: "9:15 PM", hour: 21, minute: 15 },
  { value: "21:30", label: "9:30 PM", hour: 21, minute: 30 },
  { value: "21:45", label: "9:45 PM", hour: 21, minute: 45 },
  { value: "22:00", label: "10:00 PM", hour: 22, minute: 0 },
  { value: "22:15", label: "10:15 PM", hour: 22, minute: 15 },
  { value: "22:30", label: "10:30 PM", hour: 22, minute: 30 },
  { value: "22:45", label: "10:45 PM", hour: 22, minute: 45 },
];

// Minimum buffer time (in minutes) before a scheduled post
const MIN_BUFFER_MINUTES = 10;

export default function PostScheduler({ onSchedule, isLoading, disabled }: PostSchedulerProps) {
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string>("08:00");
  const [isOpen, setIsOpen] = useState(false);

  // Get current timezone abbreviation
  const timezoneAbbr = useMemo(() => {
    return new Date().toLocaleTimeString('en-US', { timeZoneName: 'short' }).split(' ').pop() || '';
  }, []);

  // Filter available time slots based on selected date
  const availableTimeSlots = useMemo(() => {
    if (!date || !isToday(date)) {
      return allTimeSlots;
    }
    
    const now = new Date();
    const minTime = addMinutes(now, MIN_BUFFER_MINUTES);
    const minHour = minTime.getHours();
    const minMinute = minTime.getMinutes();
    
    return allTimeSlots.filter(slot => {
      // If the hour is greater than the minimum hour, it's available
      if (slot.hour > minHour) return true;
      // If same hour, check if the slot minute is after the minimum minute
      if (slot.hour === minHour && slot.minute >= minMinute) return true;
      return false;
    });
  }, [date]);

  // Auto-select first available time when date changes to today
  const handleDateChange = (newDate: Date | undefined) => {
    setDate(newDate);
    setIsOpen(false);
    
    if (newDate && isToday(newDate)) {
      const now = new Date();
      const minTime = addMinutes(now, MIN_BUFFER_MINUTES);
      const minHour = minTime.getHours();
      
      // Find next available slot
      const nextSlot = allTimeSlots.find(slot => slot.hour > minHour);
      if (nextSlot) {
        setTime(nextSlot.value);
      }
    }
  };

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
  const minScheduleTime = addMinutes(new Date(), MIN_BUFFER_MINUTES);
  const isTooSoon = scheduledDateTime && scheduledDateTime < minScheduleTime;
  const noAvailableSlots = date && isToday(date) && availableTimeSlots.length === 0;

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-muted/30">
      <div className="flex items-center justify-between text-sm font-medium">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4" />
          Schedule Post
        </div>
        <span className="text-xs text-muted-foreground">
          Times shown in {timezoneAbbr}
        </span>
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
                onSelect={handleDateChange}
                disabled={(date) => date < startOfDay(new Date())}
                initialFocus
              />
            </PopoverContent>
          </Popover>
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Time</Label>
          <Select 
            value={availableTimeSlots.some(s => s.value === time) ? time : availableTimeSlots[0]?.value || time} 
            onValueChange={setTime}
            disabled={noAvailableSlots}
          >
            <SelectTrigger>
              <SelectValue placeholder={noAvailableSlots ? "No times available" : "Select time"} />
            </SelectTrigger>
            <SelectContent>
              {availableTimeSlots.length > 0 ? (
                availableTimeSlots.map((slot) => (
                  <SelectItem key={slot.value} value={slot.value}>
                    {slot.label}
                  </SelectItem>
                ))
              ) : (
                <SelectItem value="none" disabled>
                  No times available today
                </SelectItem>
              )}
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
            const now = new Date();
            // Only show Today 8 PM if it's before 7:50 PM
            if (now.getHours() < 20 || (now.getHours() === 19 && now.getMinutes() < 50)) {
              setDate(new Date());
              setTime("20:00");
            } else {
              // Otherwise schedule for tomorrow 8 PM
              setDate(addDays(new Date(), 1));
              setTime("20:00");
            }
          }}
        >
          {new Date().getHours() < 20 ? "Today 8 PM" : "Tomorrow 8 PM"}
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
        disabled={!date || isTooSoon || noAvailableSlots || isLoading || disabled}
        className="w-full"
      >
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Scheduling...
          </>
        ) : scheduledDateTime && !isTooSoon && !noAvailableSlots ? (
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

      {isTooSoon && (
        <p className="text-xs text-destructive">
          Please schedule at least {MIN_BUFFER_MINUTES} minutes in advance.
        </p>
      )}
      
      {noAvailableSlots && (
        <p className="text-xs text-destructive">
          No more time slots available today. Please select tomorrow or a later date.
        </p>
      )}
    </div>
  );
}