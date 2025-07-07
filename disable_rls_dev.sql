-- سكريبت تعطيل Row Level Security للتطوير
-- يُستخدم فقط في بيئة التطوير لاختبار الوظائف

-- تعطيل RLS لجميع الجداول
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE posts DISABLE ROW LEVEL SECURITY;
ALTER TABLE bookings DISABLE ROW LEVEL SECURITY;
ALTER TABLE follows DISABLE ROW LEVEL SECURITY;
ALTER TABLE ratings DISABLE ROW LEVEL SECURITY;
ALTER TABLE barber_services DISABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability DISABLE ROW LEVEL SECURITY;
ALTER TABLE activation_keys DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes DISABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments DISABLE ROW LEVEL SECURITY;
ALTER TABLE notifications DISABLE ROW LEVEL SECURITY;
ALTER TABLE messages DISABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests DISABLE ROW LEVEL SECURITY;

-- إظهار حالة النجاح
DO $$
BEGIN
    RAISE NOTICE 'تم تعطيل Row Level Security لجميع الجداول بنجاح!';
    RAISE NOTICE 'يمكن الآن الوصول لجميع البيانات في بيئة التطوير.';
END
$$;
