-- =====================================================
-- سكربت إعداد قاعدة بيانات تطبيق حلاقة - Halaga Barbershop App
-- تطبيق حجز مواعيد الحلاقة مع شبكة اجتماعية
-- =====================================================

-- تمكين الامتدادات المطلوبة
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- =====================================================
-- إنشاء الأنواع المخصصة (Custom Types)
-- =====================================================

-- نوع دور المستخدم
CREATE TYPE user_role AS ENUM ('customer', 'barber', 'admin');

-- نوع حالة المستخدم
CREATE TYPE user_status AS ENUM ('active', 'pending', 'blocked');

-- نوع حالة الحجز
CREATE TYPE booking_status AS ENUM ('pending', 'accepted', 'rejected', 'completed', 'cancelled');

-- نوع حالة الدفع
CREATE TYPE payment_status AS ENUM ('pending', 'paid', 'refunded');

-- نوع الرسائل
CREATE TYPE message_type AS ENUM ('text', 'image', 'voice', 'system');

-- نوع طلبات الصداقة
CREATE TYPE friend_request_status AS ENUM ('pending', 'accepted', 'rejected');

-- =====================================================
-- إنشاء الجداول الأساسية
-- =====================================================

-- جدول المستخدمين
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255),
    avatar_url TEXT,
    phone VARCHAR(20),
    role user_role NOT NULL DEFAULT 'customer',
    status user_status NOT NULL DEFAULT 'pending',
    level INTEGER DEFAULT 1 CHECK (level >= 1 AND level <= 200),
    points INTEGER DEFAULT 0 CHECK (points >= 0),
    is_verified BOOLEAN DEFAULT FALSE,
    location JSONB, -- {lat: number, lng: number, address: string}
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول المنشورات
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    images TEXT[], -- مصفوفة روابط الصور
    caption TEXT,
    frame_style VARCHAR(50) DEFAULT 'ذهبي',
    likes_count INTEGER DEFAULT 0 CHECK (likes_count >= 0),
    comments_count INTEGER DEFAULT 0 CHECK (comments_count >= 0),
    tags TEXT[],
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول الحجوزات
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    datetime TIMESTAMPTZ NOT NULL,
    duration_minutes INTEGER DEFAULT 30 CHECK (duration_minutes > 0),
    service_type VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    status booking_status DEFAULT 'pending',
    notes TEXT,
    customer_message TEXT,
    barber_notes TEXT,
    reminder_sent BOOLEAN DEFAULT FALSE,
    payment_status payment_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- التأكد من أن العميل والحلاق مختلفان
    CONSTRAINT different_customer_barber CHECK (customer_id != barber_id),
    -- التأكد من أن الموعد في المستقبل
    CONSTRAINT future_booking CHECK (datetime > NOW())
);

-- جدول المتابعات
CREATE TABLE follows (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    follower_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    followed_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- التأكد من عدم متابعة النفس
    CONSTRAINT no_self_follow CHECK (follower_id != followed_id),
    -- منع التكرار
    UNIQUE(follower_id, followed_id)
);

-- جدول التقييمات
CREATE TABLE ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    barber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES bookings(id) ON DELETE SET NULL,
    stars INTEGER NOT NULL CHECK (stars >= 1 AND stars <= 5),
    comment TEXT,
    images TEXT[],
    helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- التأكد من أن العميل والحلاق مختلفان
    CONSTRAINT different_customer_barber_rating CHECK (customer_id != barber_id),
    -- تقييم واحد لكل حجز
    UNIQUE(customer_id, barber_id, booking_id)
);

-- جدول الرسائل
CREATE TABLE messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type message_type DEFAULT 'text',
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- التأكد من أن المرسل والمستقبل مختلفان
    CONSTRAINT different_sender_receiver CHECK (sender_id != receiver_id)
);

-- جدول ��لإشعارات
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول خدمات الحلاقين
CREATE TABLE barber_services (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10,2) NOT NULL CHECK (price >= 0),
    duration_minutes INTEGER NOT NULL CHECK (duration_minutes > 0),
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول أوقات عمل الحلاقين
CREATE TABLE barber_availability (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    barber_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6), -- 0=الأحد, 6=السبت
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- التأكد من أن وقت البداية أقل من وقت النهاية
    CONSTRAINT valid_time_range CHECK (start_time < end_time),
    -- يوم واحد لكل حلاق
    UNIQUE(barber_id, day_of_week)
);

-- جدول مفاتيح التفعيل
CREATE TABLE activation_keys (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    is_used BOOLEAN DEFAULT FALSE,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    used_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- جدول طلبات الصداقة
CREATE TABLE friend_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status friend_request_status DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    -- التأكد من أن المرسل والمستقبل مختلفان
    CONSTRAINT different_sender_receiver_friend CHECK (sender_id != receiver_id),
    -- طلب صداقة واحد بين المستخدمين
    UNIQUE(sender_id, receiver_id)
);

-- جدول الإعجابات
CREATE TABLE post_likes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- إعجاب واحد لكل مستخدم لكل منشور
    UNIQUE(user_id, post_id)
);

-- جدول التعليقات
CREATE TABLE post_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- =====================================================
-- إنشاء الفهارس لتحسين الأداء
-- =====================================================

-- فهارس الجداول الأساسية
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_level ON users(level);
CREATE INDEX idx_users_created_at ON users(created_at);

-- فهارس المنشورات
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_posts_created_at ON posts(created_at DESC);
CREATE INDEX idx_posts_likes_count ON posts(likes_count DESC);

-- فهارس الحجوزات
CREATE INDEX idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX idx_bookings_barber_id ON bookings(barber_id);
CREATE INDEX idx_bookings_datetime ON bookings(datetime);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_created_at ON bookings(created_at DESC);

-- فهارس المتابعات
CREATE INDEX idx_follows_follower_id ON follows(follower_id);
CREATE INDEX idx_follows_followed_id ON follows(followed_id);

-- فهارس التقييمات
CREATE INDEX idx_ratings_barber_id ON ratings(barber_id);
CREATE INDEX idx_ratings_customer_id ON ratings(customer_id);
CREATE INDEX idx_ratings_stars ON ratings(stars);
CREATE INDEX idx_ratings_created_at ON ratings(created_at DESC);

-- فهارس الرسائل
CREATE INDEX idx_messages_sender_id ON messages(sender_id);
CREATE INDEX idx_messages_receiver_id ON messages(receiver_id);
CREATE INDEX idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX idx_messages_is_read ON messages(is_read);

-- فهارس الإشعارات
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

-- فهارس خدمات الحلاقين
CREATE INDEX idx_barber_services_barber_id ON barber_services(barber_id);
CREATE INDEX idx_barber_services_is_active ON barber_services(is_active);

-- فهارس أوقات العمل
CREATE INDEX idx_barber_availability_barber_id ON barber_availability(barber_id);
CREATE INDEX idx_barber_availability_day_of_week ON barber_availability(day_of_week);

-- فهارس طلبات الصداقة
CREATE INDEX idx_friend_requests_sender_id ON friend_requests(sender_id);
CREATE INDEX idx_friend_requests_receiver_id ON friend_requests(receiver_id);
CREATE INDEX idx_friend_requests_status ON friend_requests(status);

-- =====================================================
-- إنشاء المشاهدات (Views)
-- =====================================================

-- مشاهدة إحصائيات الحلاقين
CREATE OR REPLACE VIEW barber_stats AS
SELECT
    u.id as barber_id,
    u.name,
    u.avatar_url,
    u.level,
    u.points,
    COALESCE(booking_stats.total_bookings, 0) as total_bookings,
    COALESCE(booking_stats.completed_bookings, 0) as completed_bookings,
    COALESCE(booking_stats.total_revenue, 0) as total_revenue,
    COALESCE(rating_stats.average_rating, 0) as average_rating,
    COALESCE(rating_stats.total_reviews, 0) as total_reviews,
    COALESCE(follow_stats.followers_count, 0) as followers_count,
    COALESCE(post_stats.posts_count, 0) as posts_count
FROM users u
LEFT JOIN (
    SELECT
        barber_id,
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
        SUM(price) FILTER (WHERE status = 'completed') as total_revenue
    FROM bookings
    GROUP BY barber_id
) booking_stats ON u.id = booking_stats.barber_id
LEFT JOIN (
    SELECT
        barber_id,
        AVG(stars) as average_rating,
        COUNT(*) as total_reviews
    FROM ratings
    GROUP BY barber_id
) rating_stats ON u.id = rating_stats.barber_id
LEFT JOIN (
    SELECT
        followed_id,
        COUNT(*) as followers_count
    FROM follows
    GROUP BY followed_id
) follow_stats ON u.id = follow_stats.followed_id
LEFT JOIN (
    SELECT
        user_id,
        COUNT(*) as posts_count
    FROM posts
    GROUP BY user_id
) post_stats ON u.id = post_stats.user_id
WHERE u.role = 'barber';

-- مشاهدة إحصائيات العملاء
CREATE OR REPLACE VIEW customer_stats AS
SELECT
    u.id as customer_id,
    u.name,
    COALESCE(booking_stats.total_bookings, 0) as total_bookings,
    COALESCE(booking_stats.total_spent, 0) as total_spent,
    booking_stats.last_booking_date,
    COALESCE(follow_stats.following_count, 0) as following_count
FROM users u
LEFT JOIN (
    SELECT
        customer_id,
        COUNT(*) as total_bookings,
        SUM(price) FILTER (WHERE status = 'completed') as total_spent,
        MAX(datetime) as last_booking_date
    FROM bookings
    GROUP BY customer_id
) booking_stats ON u.id = booking_stats.customer_id
LEFT JOIN (
    SELECT
        follower_id,
        COUNT(*) as following_count
    FROM follows
    GROUP BY follower_id
) follow_stats ON u.id = follow_stats.follower_id
WHERE u.role = 'customer';

-- =====================================================
-- إنشاء الدوال (Functions)
-- =====================================================

-- دالة زيادة عدد الإعجابات
CREATE OR REPLACE FUNCTION increment_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts
    SET likes_count = likes_count + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- دالة تقليل عدد الإعجابات
CREATE OR REPLACE FUNCTION decrement_post_likes(post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts
    SET likes_count = GREATEST(likes_count - 1, 0)
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- دالة زيادة عدد التعليقات
CREATE OR REPLACE FUNCTION increment_post_comments(post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts
    SET comments_count = comments_count + 1
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- دالة تقليل عدد التعليقات
CREATE OR REPLACE FUNCTION decrement_post_comments(post_id UUID)
RETURNS void AS $$
BEGIN
    UPDATE posts
    SET comments_count = GREATEST(comments_count - 1, 0)
    WHERE id = post_id;
END;
$$ LANGUAGE plpgsql;

-- دالة البحث عن الحلاقين
CREATE OR REPLACE FUNCTION search_barbers(
    search_query TEXT DEFAULT NULL,
    user_lat DOUBLE PRECISION DEFAULT NULL,
    user_lng DOUBLE PRECISION DEFAULT NULL,
    max_distance DOUBLE PRECISION DEFAULT 50000, -- 50 كم
    min_rating DOUBLE PRECISION DEFAULT 0,
    service_types TEXT[] DEFAULT NULL
) RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    avatar_url TEXT,
    level INTEGER,
    points INTEGER,
    average_rating DOUBLE PRECISION,
    distance DOUBLE PRECISION,
    is_available BOOLEAN,
    services JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bs.barber_id,
        bs.name,
        bs.avatar_url,
        bs.level,
        bs.points,
        bs.average_rating,
        CASE
            WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL
                AND (u.location->>'lat')::DOUBLE PRECISION IS NOT NULL
                AND (u.location->>'lng')::DOUBLE PRECISION IS NOT NULL
            THEN ST_Distance(
                ST_Point(user_lng, user_lat)::geography,
                ST_Point((u.location->>'lng')::DOUBLE PRECISION, (u.location->>'lat')::DOUBLE PRECISION)::geography
            )
            ELSE 0
        END as distance,
        COALESCE(avail.is_available, FALSE) as is_available,
        COALESCE(services.services_json, '[]'::jsonb) as services
    FROM barber_stats bs
    JOIN users u ON bs.barber_id = u.id
    LEFT JOIN (
        SELECT barber_id, BOOL_OR(is_available) as is_available
        FROM barber_availability
        WHERE day_of_week = EXTRACT(DOW FROM NOW())
        GROUP BY barber_id
    ) avail ON bs.barber_id = avail.barber_id
    LEFT JOIN (
        SELECT
            barber_id,
            jsonb_agg(jsonb_build_object(
                'id', id,
                'name', name,
                'price', price,
                'duration_minutes', duration_minutes
            )) as services_json
        FROM barber_services
        WHERE is_active = TRUE
        GROUP BY barber_id
    ) services ON bs.barber_id = services.barber_id
    WHERE u.status = 'active'
        AND u.is_verified = TRUE
        AND bs.average_rating >= min_rating
        AND (search_query IS NULL OR u.name ILIKE '%' || search_query || '%')
        AND (service_types IS NULL OR EXISTS(
            SELECT 1 FROM barber_services bserv
            WHERE bserv.barber_id = bs.barber_id
                AND bserv.is_active = TRUE
                AND bserv.name = ANY(service_types)
        ))
        AND (user_lat IS NULL OR user_lng IS NULL OR ST_Distance(
            ST_Point(user_lng, user_lat)::geography,
            ST_Point((u.location->>'lng')::DOUBLE PRECISION, (u.location->>'lat')::DOUBLE PRECISION)::geography
        ) <= max_distance)
    ORDER BY
        CASE WHEN user_lat IS NOT NULL AND user_lng IS NOT NULL THEN distance END ASC,
        bs.average_rating DESC,
        bs.followers_count DESC;
END;
$$ LANGUAGE plpgsql;

-- دالة الحصول على التوصيات
CREATE OR REPLACE FUNCTION get_recommendations(
    user_id UUID,
    limit_count INTEGER DEFAULT 10
) RETURNS TABLE (
    id UUID,
    name VARCHAR(255),
    avatar_url TEXT,
    reason TEXT,
    confidence DOUBLE PRECISION
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        bs.barber_id,
        bs.name,
        bs.avatar_url,
        CASE
            WHEN similar_users.barber_id IS NOT NULL THEN 'مستخدمون مشابهون يتابعون هذا الحلاق'
            WHEN high_rated.barber_id IS NOT NULL THEN 'حلاق بتقييم عالي'
            WHEN nearby.barber_id IS NOT NULL THEN 'حلاق قريب منك'
            ELSE 'اقتراح عام'
        END as reason,
        CASE
            WHEN similar_users.barber_id IS NOT NULL THEN 0.9
            WHEN high_rated.barber_id IS NOT NULL THEN 0.8
            WHEN nearby.barber_id IS NOT NULL THEN 0.7
            ELSE 0.5
        END as confidence
    FROM barber_stats bs
    JOIN users u ON bs.barber_id = u.id
    LEFT JOIN (
        -- حلاقين يتابعهم مستخدمون مشابهون
        SELECT DISTINCT f2.followed_id as barber_id
        FROM follows f1
        JOIN follows f2 ON f1.followed_id = f2.followed_id AND f1.follower_id != f2.follower_id
        WHERE f1.follower_id = user_id
            AND f2.followed_id NOT IN (SELECT followed_id FROM follows WHERE follower_id = user_id)
    ) similar_users ON bs.barber_id = similar_users.barber_id
    LEFT JOIN (
        -- حلاقين بتقييم عالي
        SELECT barber_id FROM barber_stats WHERE average_rating >= 4.5 AND total_reviews >= 5
    ) high_rated ON bs.barber_id = high_rated.barber_id
    LEFT JOIN (
        -- حلاقين قريبين
        SELECT barber_id FROM users WHERE role = 'barber' AND location IS NOT NULL
    ) nearby ON bs.barber_id = nearby.barber_id
    WHERE u.status = 'active'
        AND u.is_verified = TRUE
        AND bs.barber_id NOT IN (SELECT followed_id FROM follows WHERE follower_id = user_id)
        AND bs.barber_id != user_id
    ORDER BY confidence DESC, bs.average_rating DESC
    LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- دالة تحديث عداد الإعجابات
CREATE OR REPLACE FUNCTION update_post_likes_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET likes_count = likes_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- دالة تحديث عداد التعليقات
CREATE OR REPLACE FUNCTION update_post_comments_count() RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- دالة تحديث تاريخ التحديث
CREATE OR REPLACE FUNCTION update_updated_at_column() RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- إنشاء المشغلات (Triggers)
-- =====================================================

-- مشغل تحديث عداد الإعجابات
CREATE TRIGGER trigger_update_post_likes_count
    AFTER INSERT OR DELETE ON post_likes
    FOR EACH ROW EXECUTE FUNCTION update_post_likes_count();

-- مشغل تحديث عداد التعليقات
CREATE TRIGGER trigger_update_post_comments_count
    AFTER INSERT OR DELETE ON post_comments
    FOR EACH ROW EXECUTE FUNCTION update_post_comments_count();

-- مشغلات تحديث تاريخ التحديث
CREATE TRIGGER trigger_users_updated_at
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_posts_updated_at
    BEFORE UPDATE ON posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_bookings_updated_at
    BEFORE UPDATE ON bookings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_friend_requests_updated_at
    BEFORE UPDATE ON friend_requests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- إعداد Row Level Security (RLS)
-- =====================================================

-- تمكين RLS على جميع الجداول
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE barber_availability ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

-- سياسات الأمان للمستخدمين
CREATE POLICY "المستخدمون يمكنهم قراءة الملفات الشخصية العامة" ON users
    FOR SELECT USING (status = 'active');

CREATE POLICY "المستخدمون يمكنهم تحديث ملفاتهم الشخصية" ON users
    FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "المدراء يمكنهم إدارة جميع المستخدمين" ON users
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- سياسات المنشورات
CREATE POLICY "يمكن للجميع قراءة المنشورات" ON posts
    FOR SELECT USING (true);

CREATE POLICY "المستخدمون يمكنهم إنشاء منشوراتهم" ON posts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم تحديث منشوراتهم" ON posts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم حذف منشوراتهم" ON posts
    FOR DELETE USING (auth.uid() = user_id);

-- سياسات الحجوزات
CREATE POLICY "المستخدمون يمكنهم رؤية حجوزاتهم" ON bookings
    FOR SELECT USING (auth.uid() = customer_id OR auth.uid() = barber_id);

CREATE POLICY "العملاء يمكنهم إنشاء حجوزات" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "الحلاقون والعملاء يمكنهم تحديث حجوزاتهم" ON bookings
    FOR UPDATE USING (auth.uid() = customer_id OR auth.uid() = barber_id);

-- سياسات المتابعات
CREATE POLICY "يمكن للجميع رؤية المتابعات" ON follows
    FOR SELECT USING (true);

CREATE POLICY "المستخدمون يمكنهم إنشاء متابعات" ON follows
    FOR INSERT WITH CHECK (auth.uid() = follower_id);

CREATE POLICY "المستخدمون يمكنهم حذف متابعاتهم" ON follows
    FOR DELETE USING (auth.uid() = follower_id);

-- سياسات التقييمات
CREATE POLICY "يمكن للجميع قراءة التقييمات" ON ratings
    FOR SELECT USING (true);

CREATE POLICY "العملاء يمكنهم إنشاء تقييمات" ON ratings
    FOR INSERT WITH CHECK (auth.uid() = customer_id);

CREATE POLICY "العملاء يمكنهم تحديث تقييماتهم" ON ratings
    FOR UPDATE USING (auth.uid() = customer_id);

-- سياسات الرسائل
CREATE POLICY "المستخدمون يمكنهم رؤية رسائلهم" ON messages
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "المستخدمون يمكنهم إرسال رسائل" ON messages
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "المستخدمون يمكنهم تحديث رسائلهم المستقبلة" ON messages
    FOR UPDATE USING (auth.uid() = receiver_id);

-- سياسات الإشعارات
CREATE POLICY "المستخدمون يمكنهم رؤية إشعاراتهم" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم تحديث إشعاراتهم" ON notifications
    FOR UPDATE USING (auth.uid() = user_id);

-- سياسات خدمات الحلاقين
CREATE POLICY "يمكن للجميع رؤية خدمات الحلاقين" ON barber_services
    FOR SELECT USING (true);

CREATE POLICY "الحلاقون يمكنهم إدارة خدماتهم" ON barber_services
    FOR ALL USING (auth.uid() = barber_id);

-- سياسات أوقات العمل
CREATE POLICY "يمكن للجميع رؤية أوقات عمل الحلاقين" ON barber_availability
    FOR SELECT USING (true);

CREATE POLICY "الحلاقون يمكنهم إدارة أوقات عملهم" ON barber_availability
    FOR ALL USING (auth.uid() = barber_id);

-- سياسات مفاتيح التفعيل
CREATE POLICY "المدراء فقط يمكنهم إدارة مفاتيح التفعيل" ON activation_keys
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM users
            WHERE id = auth.uid() AND role = 'admin'
        )
    );

-- سياسات طلبات الصداقة
CREATE POLICY "المستخدمون يمكنهم رؤية طلبات الصداقة الخاصة بهم" ON friend_requests
    FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "المستخدمون يمكنهم إرسال طلبات صداقة" ON friend_requests
    FOR INSERT WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "المست��دمون يمكنهم الرد على طلبات الصداقة" ON friend_requests
    FOR UPDATE USING (auth.uid() = receiver_id);

-- سياسات الإعجابات
CREATE POLICY "يمكن للجميع رؤية الإعجابات" ON post_likes
    FOR SELECT USING (true);

CREATE POLICY "المستخدمون يمكنهم إضافة وحذف إعجاباتهم" ON post_likes
    FOR ALL USING (auth.uid() = user_id);

-- سياسات التعليقات
CREATE POLICY "يمكن للجميع رؤية التعليقات" ON post_comments
    FOR SELECT USING (true);

CREATE POLICY "المستخدمون يمكنهم إضافة تعليقات" ON post_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم حذف تعليقاتهم" ON post_comments
    FOR DELETE USING (auth.uid() = user_id);

-- =====================================================
-- إدراج البيانات الأولية
-- =====================================================

-- إنشاء مستخدم مدير افتراضي
INSERT INTO users (
    name,
    email,
    password_hash,
    role,
    status,
    level,
    points,
    is_verified
) VALUES (
    'مدير النظام',
    'admin@halaga.app',
    '$2b$10$placeholder_hash', -- يجب ت��يير هذا بهاش حقيقي
    'admin',
    'active',
    100,
    1000,
    true
) ON CONFLICT (email) DO NOTHING;

-- إنشاء بعض مفاتيح التفعيل للحلاقين
INSERT INTO activation_keys (code, created_by)
SELECT
    'BARBER_' || LPAD(generate_series::text, 4, '0'),
    (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
FROM generate_series(1, 50);

-- =====================================================
-- إنشاء أدوار قاعدة البيانات
-- =====================================================

-- دور للمستخدمين المتوثقين
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
        CREATE ROLE authenticated;
    END IF;
END
$$;

-- دور للمستخدمين الضيوف
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
        CREATE ROLE anon;
    END IF;
END
$$;

-- منح الصلاحيات
GRANT USAGE ON SCHEMA public TO authenticated, anon;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- صلاحيات محدودة للضيوف
GRANT SELECT ON users TO anon;
GRANT SELECT ON posts TO anon;
GRANT SELECT ON barber_services TO anon;
GRANT SELECT ON barber_availability TO anon;
GRANT SELECT ON barber_stats TO anon;

-- =====================================================
-- نهاية السكربت
-- =====================================================

-- رسالة تأكيد
DO $$
BEGIN
    RAISE NOTICE 'تم إنشاء قاعدة بيانات تطبيق حلاقة بنجاح!';
    RAISE NOTICE 'تم إنشاء % جداول', (SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE');
    RAISE NOTICE 'تم إنشاء % مشاهدات', (SELECT count(*) FROM information_schema.views WHERE table_schema = 'public');
    RAISE NOTICE 'تم إنشاء % دالة', (SELECT count(*) FROM information_schema.routines WHERE routine_schema = 'public');
END
$$;
