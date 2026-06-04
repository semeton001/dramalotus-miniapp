import os
from supabase import create_client

url = os.environ["NEXT_PUBLIC_SUPABASE_URL"]
key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]

supabase = create_client(url, key)

supabase.table("pending_registrations") \
    .delete() \
    .lt("expires_at", "now()") \
    .execute()

supabase.table("email_verifications") \
    .delete() \
    .lt("expires_at", "now()") \
    .execute()

supabase.table("otp_rate_limits") \
    .delete() \
    .lt("window_start", "now()") \
    .execute()

print("cleanup ok")
