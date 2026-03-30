import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase/server';

export async function GET() {
  const { data, error } = await supabaseServer
    .from('sources')
    .select('*')
    .order('sort_order', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const mapped = (data ?? []).map((item) => ({
    id: item.id,
    name: item.name,
    slug: item.slug,
    badge: item.badge,
    description: item.description,
    logo: item.logo,
    cardClass: item.card_class,
    sortOrder: item.sort_order,
    isPopular: item.is_popular,
  }));

  return NextResponse.json(mapped);
}