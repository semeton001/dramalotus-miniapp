#!/bin/bash
set -a
source /home/ubuntuadmin/dramalotus-web/.env
set +a

curl -s -X DELETE \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/pending_registrations?expires_at=lt.$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

curl -s -X DELETE \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/email_verifications?expires_at=lt.$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

OLD=$(date -u -d "10 minutes ago" +"%Y-%m-%dT%H:%M:%SZ")

curl -s -X DELETE \
  "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/otp_rate_limits?window_start=lt.$OLD" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"

echo "cleanup ok"
