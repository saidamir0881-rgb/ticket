-- Keep historical pickup references; remove this point from new checkout choices.
update public.cash_points set is_active=false where id='50000000-0000-4000-8000-000000000026';
