-- The enqueue function is trigger-only and must not be callable through the API.
revoke all on function public.enqueue_google_sheets_response() from public;
revoke all on function public.enqueue_google_sheets_response() from anon;
revoke all on function public.enqueue_google_sheets_response() from authenticated;
