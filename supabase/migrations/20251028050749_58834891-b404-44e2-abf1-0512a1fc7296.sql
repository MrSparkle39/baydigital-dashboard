-- Enable realtime for update_tickets table so admin gets live notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.update_tickets;